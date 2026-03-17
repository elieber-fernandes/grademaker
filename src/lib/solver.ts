import type { Schedule, Professor, ClassGroup } from '../types';
import { NUM_PERIODS, NUM_DAYS } from '../constants';

const MAX_TIME_MS = 10000; // Timeout de 10 segundos

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
): Schedule | null => {
    const startTime = Date.now();

    // ===== 1. Montar lista de aulas pendentes =====
    const pendingLessons: { classId: string; subjectId: string; shift: 'M' | 'V' }[] = [];

    classGroups.forEach(cls => {
        Object.entries(cls.gradeConfig).forEach(([subId, count]) => {
            for (let i = 0; i < count; i++) {
                pendingLessons.push({ classId: cls.id, subjectId: subId, shift: cls.shift });
            }
        });
    });

    if (pendingLessons.length === 0) {
        return { grid: {} };
    }

    // ===== 2. Pré-computar mapa de professores por disciplina =====
    const profsBySubject = new Map<string, Professor[]>();
    professors.forEach(prof => {
        prof.subjects.forEach(subId => {
            if (!profsBySubject.has(subId)) profsBySubject.set(subId, []);
            profsBySubject.get(subId)!.push(prof);
        });
    });

    // ===== 3. Sanity Check: Capacidade Disciplina vs Professores =====
    for (const subId of profsBySubject.keys()) {
        const totalLessonsNeeded = pendingLessons.filter(l => l.subjectId === subId).length;
        const possibleProfs = profsBySubject.get(subId) || [];
        
        // Total de slots livres (disponibilidade matrix) para todos os professores que dão essa matéria
        let totalSlotsAvailable = 0;
        possibleProfs.forEach(p => {
            p.availability.forEach(day => {
                day.forEach(slot => { if (slot) totalSlotsAvailable++; });
            });
        });

        if (totalLessonsNeeded > totalSlotsAvailable) {
            console.error(`IMPOSSÍVEL: ${totalLessonsNeeded} aulas necessárias para disciplina ${subId}, mas apenas ${totalSlotsAvailable} slots de professores disponíveis.`);
            return null; // Mata o processo cedo
        }
    }

    // ===== 4. Ordenar por restrição (MRV - Minimum Remaining Values) =====
    // Disciplinas com menos professores disponíveis primeiro
    pendingLessons.sort((a, b) => {
        const profsA = profsBySubject.get(a.subjectId)?.length || 0;
        const profsB = profsBySubject.get(b.subjectId)?.length || 0;
        return profsA - profsB;
    });

    // ===== 4. Estruturas de rastreamento O(1) =====
    // Rastreia quais slots estão ocupados por um professor (dia:::período -> profId)
    const profOccupied = new Map<string, string>(); // "profId:::day:::period" -> classId
    const grid: Schedule['grid'] = {};

    const isSlotFreeForProf = (profId: string, day: number, period: number): boolean => {
        return !profOccupied.has(`${profId}:::${day}:::${period}`);
    };

    const isProfAvailable = (prof: Professor, day: number, period: number): boolean => {
        return prof.availability[day]?.[period] !== false;
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
            // Professores tem 11 slots. 0-5 = M, 6-10 = V
            slotOrderV.push({ d, p: p + NUM_PERIODS['M'] });
        }
    }

    // ===== 6. Backtracking com timeout =====
    let attempts = 0;

    const solve = (lessonIndex: number): boolean => {
        // Timeout check a cada 5000 tentativas
        if (++attempts % 5000 === 0) {
            if (Date.now() - startTime > MAX_TIME_MS) {
                throw new Error('TIMEOUT');
            }
        }

        if (lessonIndex >= pendingLessons.length) {
            return true; // Tudo pronto!
        }

        const task = pendingLessons[lessonIndex];
        const possibleProfs = profsBySubject.get(task.subjectId);

        if (!possibleProfs || possibleProfs.length === 0) {
            console.warn(`Nenhum professor encontrado para a disciplina ${task.subjectId}`);
            return false;
        }

        // Embaralhar professores e slots para variar resultados
        const shuffledProfs = shuffle([...possibleProfs]);
        const baseSlots = task.shift === 'M' ? slotOrderM : slotOrderV;
        const shuffledSlots = shuffle([...baseSlots]);

        for (const prof of shuffledProfs) {
            for (const { d, p } of shuffledSlots) {
                const slotKey = `${task.classId}:::${d}:::${p}`;

                // Slot já ocupado nesta turma?
                if (grid[slotKey]) continue;

                // Professor disponível neste horário?
                if (!isProfAvailable(prof, d, p)) continue;

                // Professor já tem aula neste horário em outra turma?
                if (!isSlotFreeForProf(prof.id, d, p)) continue;

                // === FAZER MOVIMENTO ===
                grid[slotKey] = {
                    id: `gen-${d}-${p}-${task.classId}`,
                    classGroupId: task.classId,
                    professorId: prof.id,
                    subjectId: task.subjectId
                };
                profOccupied.set(`${prof.id}:::${d}:::${p}`, task.classId);

                // === RECURSÃO ===
                if (solve(lessonIndex + 1)) {
                    return true;
                }

                // === BACKTRACK ===
                delete grid[slotKey];
                profOccupied.delete(`${prof.id}:::${d}:::${p}`);
            }
        }

        return false;
    };

    // ===== 7. Tentar resolver (com múltiplas tentativas se necessário) =====
    const maxRetries = 3;
    for (let retry = 0; retry < maxRetries; retry++) {
        // Limpar estado
        Object.keys(grid).forEach(k => delete grid[k]);
        profOccupied.clear();
        attempts = 0;

        // Re-embaralhar apenas a ordem dentro de cada nível de restrição
        try {
            if (solve(0)) {
                console.log(`Grade gerada com sucesso na tentativa ${retry + 1}, ${attempts} iterações`);
                return { grid };
            }
        } catch (e) {
            if (e instanceof Error && e.message === 'TIMEOUT') {
                console.warn(`Tentativa ${retry + 1} abortada por timeout após ${attempts} iterações`);
                break; // Se deu timeout, não adianta tentar de novo, a árvore é muito grande ou impossível
            }
            throw e;
        }

        console.warn(`Tentativa ${retry + 1} falhou após ${attempts} iterações sem encontrar solução válida`);
    }

    return null;
};
