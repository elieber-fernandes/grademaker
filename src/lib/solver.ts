import type { Schedule, Professor, ClassGroup, SolverResult } from '../types';
import { NUM_PERIODS, NUM_DAYS } from '../constants';

const MAX_TIME_MS = 6000; // Timeout de 6 segundos (reduzido para resposta mais rápida)

// Embaralha array in-place (Fisher-Yates)
const shuffle = <T>(arr: T[]): T[] => {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
};

export const generateSchedule = (
    professors: Professor[],
    classGroups: ClassGroup[]
): SolverResult => {
    const startTime = Date.now();

    // ===== 1. Montar lista de aulas pendentes =====
    const pendingLessons: { classId: string; subjectId: string; shift: 'M' | 'V' }[] = [];

    classGroups.forEach(cls => {
        let classTotalLessons = 0;
        Object.entries(cls.gradeConfig).forEach(([subId, count]) => {
            classTotalLessons += count;
            for (let i = 0; i < count; i++) {
                pendingLessons.push({ classId: cls.id, subjectId: subId, shift: cls.shift });
            }
        });

        // Check if class has enough slots in its shift
        const maxSlots = NUM_PERIODS[cls.shift] * NUM_DAYS;
        if (classTotalLessons > maxSlots) {
            return {
                schedule: null,
                error: `A turma ${cls.name} precisa de ${classTotalLessons} aulas, mas só existem ${maxSlots} horários disponíveis na semana para o turno ${cls.shift === 'M' ? 'Matutino' : 'Vespertino'}.`
            };
        }
    });

    if (pendingLessons.length === 0) {
        return { schedule: { grid: {} }, error: null };
    }

    // ===== 2. Pré-computar mapa de professores por disciplina =====
    const profsBySubject = new Map<string, Professor[]>();
    professors.forEach(prof => {
        prof.subjects.forEach(subId => {
            if (!profsBySubject.has(subId)) profsBySubject.set(subId, []);
            profsBySubject.get(subId)!.push(prof);
        });
    });

    // ===== 3. Sanity Check: Capacidade Disciplina vs Professores por TURNO =====
    const subjectsInPending = Array.from(new Set(pendingLessons.map(l => l.subjectId)));
    
    for (const subId of subjectsInPending) {
        const lessonsM = pendingLessons.filter(l => l.subjectId === subId && l.shift === 'M').length;
        const lessonsV = pendingLessons.filter(l => l.subjectId === subId && l.shift === 'V').length;
        
        const possibleProfs = profsBySubject.get(subId) || [];
        
        if (possibleProfs.length === 0 && (lessonsM + lessonsV > 0)) {
            return {
                schedule: null,
                error: `Nenhum professor cadastrado para a disciplina ${subId}.`,
                details: "Cadastre um professor ou remova a disciplina da matriz curricular."
            };
        }

        let slotsAvailableM = 0;
        let slotsAvailableV = 0;

        possibleProfs.forEach(p => {
            p.availability.forEach(day => {
                // Slots 0-5 (M)
                for (let i = 0; i < NUM_PERIODS['M']; i++) if (day[i]) slotsAvailableM++;
                // Slots 6-10 (V)
                for (let i = NUM_PERIODS['M']; i < NUM_PERIODS['M'] + NUM_PERIODS['V']; i++) if (day[i]) slotsAvailableV++;
            });
        });

        if (lessonsM > slotsAvailableM) {
            return {
                schedule: null,
                error: `Capacidade insuficiente para a disciplina selecionada.`,
                details: `A disciplina ${subId} precisa de ${lessonsM} aulas no turno MATUTINO, mas os professores disponíveis só possuem ${slotsAvailableM} horários livres nesse turno.`
            };
        }
        if (lessonsV > slotsAvailableV) {
            return {
                schedule: null,
                error: `Capacidade insuficiente para a disciplina selecionada.`,
                details: `A disciplina ${subId} precisa de ${lessonsV} aulas no turno VESPERTINO, mas os professores disponíveis só possuem ${slotsAvailableV} horários livres nesse turno.`
            };
        }
    }

    // ===== 4. Ordenar por restrição (MRV - Minimum Remaining Values) =====
    pendingLessons.sort((a, b) => {
        const profsA = profsBySubject.get(a.subjectId)?.length || 0;
        const profsB = profsBySubject.get(b.subjectId)?.length || 0;
        return profsA - profsB;
    });

    // ===== 4. Estruturas de rastreamento O(1) =====
    const profOccupied = new Map<string, string>(); // "profId:::day:::period" -> classId
    const grid: Schedule['grid'] = {};

    const isSlotFreeForProf = (profId: string, day: number, period: number): boolean => {
        return !profOccupied.has(`${profId}:::${day}:::${period}`);
    };

    const isProfAvailable = (prof: Professor, day: number, period: number): boolean => {
        return prof.availability[day]?.[period] === true;
    };

    // ===== 5. Gerar lista de slots por turno =====
    const slotOrderM: { d: number; p: number }[] = [];
    for (let d = 0; d < NUM_DAYS; d++) {
        for (let p = 0; p < NUM_PERIODS['M']; p++) {
            slotOrderM.push({ d, p });
        }
    }

    const slotOrderV: { d: number; p: number }[] = [];
    for (let d = 0; d < NUM_DAYS; d++) {
        for (let p = 0; p < NUM_PERIODS['V']; p++) {
            slotOrderV.push({ d, p: p + NUM_PERIODS['M'] });
        }
    }

    // ===== 6. Backtracking com timeout =====
    let attempts = 0;

    const solve = (lessonIndex: number): boolean => {
        if (++attempts % 1000 === 0) {
            if (Date.now() - startTime > MAX_TIME_MS) {
                throw new Error('TIMEOUT');
            }
        }

        if (lessonIndex >= pendingLessons.length) {
            return true;
        }

        const task = pendingLessons[lessonIndex];
        const possibleProfs = profsBySubject.get(task.subjectId);

        if (!possibleProfs || possibleProfs.length === 0) return false;

        const shuffledProfs = shuffle([...possibleProfs]);
        const baseSlots = task.shift === 'M' ? slotOrderM : slotOrderV;
        const shuffledSlots = shuffle([...baseSlots]);

        for (const prof of shuffledProfs) {
            for (const { d, p } of shuffledSlots) {
                const slotKey = `${task.classId}:::${d}:::${p}`;

                if (grid[slotKey]) continue;
                if (!isProfAvailable(prof, d, p)) continue;
                if (!isSlotFreeForProf(prof.id, d, p)) continue;

                // FAZER MOVIMENTO
                grid[slotKey] = {
                    id: `gen-${d}-${p}-${task.classId}`,
                    classGroupId: task.classId,
                    professorId: prof.id,
                    subjectId: task.subjectId
                };
                profOccupied.set(`${prof.id}:::${d}:::${p}`, task.classId);

                if (solve(lessonIndex + 1)) return true;

                // BACKTRACK
                delete grid[slotKey];
                profOccupied.delete(`${prof.id}:::${d}:::${p}`);
            }
        }

        return false;
    };

    // ===== 7. Tentar resolver =====
    try {
        if (solve(0)) {
            return { schedule: { grid }, error: null };
        }
    } catch (e) {
        if (e instanceof Error && e.message === 'TIMEOUT') {
            return {
                schedule: null,
                error: 'Tempo excedido ao tentar encontrar uma solução.',
                details: 'As restrições são muito complexas ou impossíveis. Tente dar mais disponibilidade aos professores ou reduzir as aulas.'
            };
        }
        throw e;
    }

    return {
        schedule: null,
        error: 'Não foi possível encontrar uma combinação válida para todos os horários.',
        details: 'Revise se não há muitos professores com horários restritos ou se há muitas aulas para poucos professores.'
    };
};
