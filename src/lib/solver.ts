import type { Schedule, Professor, ClassGroup, SolverResult, Subject } from '../types';
import { NUM_PERIODS, NUM_DAYS } from '../constants';

const MAX_TIME_MS = 20000; // Aumentado para 20 segundos

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
    classGroups: ClassGroup[],
    subjects: Subject[]
): SolverResult => {
    const startTime = Date.now();
    const subjectMap = new Map(subjects.map(s => [s.id, s.name]));

    // ===== 1. Sanity Check: Capacidade Global e Disciplina vs Professores =====
    let totalLessonsM = 0;
    let totalLessonsV = 0;
    const subLessonsM = new Map<string, number>();
    const subLessonsV = new Map<string, number>();

    for (const cls of classGroups) {
        let classTotal = 0;
        Object.entries(cls.gradeConfig).forEach(([subId, count]) => {
            classTotal += count;
            if (cls.shift === 'M') {
                totalLessonsM += count;
                subLessonsM.set(subId, (subLessonsM.get(subId) || 0) + count);
            } else {
                totalLessonsV += count;
                subLessonsV.set(subId, (subLessonsV.get(subId) || 0) + count);
            }
        });

        const maxSlots = NUM_PERIODS[cls.shift] * NUM_DAYS;
        if (classTotal > maxSlots) {
            return {
                schedule: null,
                error: `A turma ${cls.name} possui mais aulas (${classTotal}) do que horários disponíveis (${maxSlots}).`,
                details: "Reduza a carga horária desta turma na Matriz Curricular."
            };
        }
    }

    let aSlotsM = 0;
    let aSlotsV = 0;
    const profsBySubject = new Map<string, Professor[]>();
    
    professors.forEach(p => {
        p.subjects.forEach(sid => {
            if (!profsBySubject.has(sid)) profsBySubject.set(sid, []);
            profsBySubject.get(sid)!.push(p);
        });
        p.availability.forEach(day => {
            for (let i = 0; i < NUM_PERIODS['M']; i++) if (day[i]) aSlotsM++;
            const startV = NUM_PERIODS['M'];
            for (let i = startV; i < startV + NUM_PERIODS['V']; i++) if (day[i]) aSlotsV++;
        });
    });

    if (totalLessonsM > aSlotsM) return { schedule: null, error: 'Capacidade insuficiente (Manhã)', details: `Necessário ${totalLessonsM}, Disponível ${aSlotsM}` };
    if (totalLessonsV > aSlotsV) return { schedule: null, error: 'Capacidade insuficiente (Tarde)', details: `Necessário ${totalLessonsV}, Disponível ${aSlotsV}` };

    for (const sid of Array.from(new Set([...subLessonsM.keys(), ...subLessonsV.keys()]))) {
        const neededM = subLessonsM.get(sid) || 0;
        const neededV = subLessonsV.get(sid) || 0;
        const subProfs = profsBySubject.get(sid) || [];
        const sName = subjectMap.get(sid) || sid;

        if (subProfs.length === 0 && (neededM + neededV > 0)) {
            return { schedule: null, error: `Faltam professores para ${sName}.` };
        }

        let sSlotsM = 0;
        let sSlotsV = 0;
        subProfs.forEach(p => {
            p.availability.forEach(day => {
                for (let i = 0; i < NUM_PERIODS['M']; i++) if (day[i]) sSlotsM++;
                const startV = NUM_PERIODS['M'];
                for (let i = startV; i < startV + NUM_PERIODS['V']; i++) if (day[i]) sSlotsV++;
            });
        });

        if (neededM > sSlotsM) return { schedule: null, error: `Carga impossível: ${sName} (Manhã)`, details: `Necessário ${neededM}, Disponível ${sSlotsM}` };
        if (neededV > sSlotsV) return { schedule: null, error: `Carga impossível: ${sName} (Tarde)`, details: `Necessário ${neededV}, Disponível ${sSlotsV}` };
    }

    // ESTRUTURAS DE DADOS REUTILIZÁVEIS
    const profOccupied = new Map<string, string>(); 
    const grid: Schedule['grid'] = {};
    let attempts = 0;

    const isSlotFree = (classId: string, profId: string, day: number, period: number): boolean => {
        const profKey = `${profId}:::${day}:::${period}`;
        const classKey = `${classId}:::${day}:::${period}`;
        return !profOccupied.has(profKey) && !grid[classKey];
    };

    const isProfAvailable = (prof: Professor, day: number, period: number): boolean => {
        return prof.availability[day]?.[period] === true;
    };

    const slotOrderM: { d: number; p: number }[] = [];
    for (let d = 0; d < NUM_DAYS; d++) for (let p = 0; p < NUM_PERIODS['M']; p++) slotOrderM.push({ d, p });

    const slotOrderV: { d: number; p: number }[] = [];
    const startV = NUM_PERIODS['M'];
    for (let d = 0; d < NUM_DAYS; d++) for (let p = 0; p < NUM_PERIODS['V']; p++) slotOrderV.push({ d, p: p + startV });

    // FUNÇÃO PRINCIPAL DE BACKTRACKING
    const solve = (pendingLessons: any[], lessonIndex: number): boolean => {
        if (++attempts % 1000 === 0) {
            if (Date.now() - startTime > MAX_TIME_MS) throw new Error('TIMEOUT');
        }

        if (lessonIndex >= pendingLessons.length) return true;

        const task = pendingLessons[lessonIndex];
        const possibleProfs = shuffle([...(profsBySubject.get(task.subjectId) || [])]);
        const possibleSlots = shuffle([...(task.shift === 'M' ? slotOrderM : slotOrderV)]);

        for (const prof of possibleProfs) {
            for (const { d, p } of possibleSlots) {
                const slots = task.duration === 1 ? [p] : [p, p + 1];
                const lastSlotInShift = task.shift === 'M' ? NUM_PERIODS['M'] - 1 : NUM_PERIODS['M'] + NUM_PERIODS['V'] - 1;
                if (task.duration === 2 && p >= lastSlotInShift) continue;

                const isPossible = slots.every(period => 
                    isSlotFree(task.classId, prof.id, d, period) && 
                    isProfAvailable(prof, d, period)
                );

                if (!isPossible) continue;

                slots.forEach(period => {
                    const key = `${task.classId}:::${d}:::${period}`;
                    grid[key] = {
                        id: `gen-${d}-${period}-${task.classId}`,
                        classGroupId: task.classId,
                        professorId: prof.id,
                        subjectId: task.subjectId
                    };
                    profOccupied.set(`${prof.id}:::${d}:::${period}`, task.classId);
                });

                if (solve(pendingLessons, lessonIndex + 1)) return true;

                slots.forEach(period => {
                    delete grid[`${task.classId}:::${d}:::${period}`];
                    profOccupied.delete(`${prof.id}:::${d}:::${period}`);
                });
            }
        }
        return false;
    };

    // LOOP DE EXECUÇÃO (Stage 1: Geminada, Stage 2: Normal)
    const stages = [
        { useBlocks: true, attempts: 2, label: 'Preferencial (Geminada)' },
        { useBlocks: false, attempts: 3, label: 'Reserva (Individual)' }
    ];

    for (const stage of stages) {
        for (let i = 0; i < stage.attempts; i++) {
            // Preparar aulas para este estágio
            const pendingLessons: any[] = [];
            for (const cls of classGroups) {
                Object.entries(cls.gradeConfig).forEach(([subId, count]) => {
                    let remaining = count;
                    if (stage.useBlocks) {
                        while (remaining >= 2) {
                            pendingLessons.push({ classId: cls.id, subjectId: subId, shift: cls.shift, duration: 2 });
                            remaining -= 2;
                        }
                    }
                    while (remaining > 0) {
                        pendingLessons.push({ classId: cls.id, subjectId: subId, shift: cls.shift, duration: 1 });
                        remaining -= 1;
                    }
                });
            }

            // Ordenação (MRV)
            pendingLessons.sort((a, b) => {
                const profsA = profsBySubject.get(a.subjectId)?.length || 0;
                const profsB = profsBySubject.get(b.subjectId)?.length || 0;
                if (profsA !== profsB) return profsA - profsB;
                if (a.duration !== b.duration) return b.duration - a.duration;
                return 0;
            });

            // Reset de estado
            Object.keys(grid).forEach(k => delete grid[k]);
            profOccupied.clear();
            attempts = 0;

            try {
                if (solve(pendingLessons, 0)) return { schedule: { grid }, error: null };
                if (Date.now() - startTime > MAX_TIME_MS) break;
            } catch (e) {
                if (e instanceof Error && e.message === 'TIMEOUT') break;
                throw e;
            }
        }
    }

    return {
        schedule: null,
        error: 'Não foi possível gerar a grade completa.',
        details: 'As restrições de horários dos professores estão muito apertadas. Tente dar mais disponibilidade ou reduzir a carga horária das matérias.'
    };
};
