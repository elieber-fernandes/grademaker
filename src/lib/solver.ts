import type { Schedule, Professor, ClassGroup, SolverResult, Subject } from '../types';
import { NUM_PERIODS, NUM_DAYS } from '../constants';

const MAX_TIME_MS = 10000; // Aumentado para 10 segundos

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

    // ===== 1. Montar lista de aulas pendentes e Check de Capacidade de Turno =====
    const pendingLessons: { classId: string; subjectId: string; shift: 'M' | 'V' }[] = [];
    let totalLessonsNeededM = 0;
    let totalLessonsNeededV = 0;

    for (const cls of classGroups) {
        let classTotalLessons = 0;
        Object.entries(cls.gradeConfig).forEach(([subId, count]) => {
            classTotalLessons += count;
            for (let i = 0; i < count; i++) {
                pendingLessons.push({ classId: cls.id, subjectId: subId, shift: cls.shift });
            }
        });

        if (cls.shift === 'M') totalLessonsNeededM += classTotalLessons;
        else totalLessonsNeededV += classTotalLessons;

        const maxSlots = NUM_PERIODS[cls.shift] * NUM_DAYS;
        if (classTotalLessons > maxSlots) {
            return {
                schedule: null,
                error: `A turma ${cls.name} possui mais aulas (${classTotalLessons}) do que horários disponíveis (${maxSlots}).`,
                details: "Reduza a carga horária desta turma na Matriz Curricular."
            };
        }
    }

    if (pendingLessons.length === 0) {
        return { schedule: { grid: {} }, error: null };
    }

    // ===== 2. Sanity Check: Capacidade Global de Professores por Turno =====
    let totalSlotsAvailableM = 0;
    let totalSlotsAvailableV = 0;

    professors.forEach(p => {
        p.availability.forEach(day => {
            for (let i = 0; i < NUM_PERIODS['M']; i++) if (day[i]) totalSlotsAvailableM++;
            const startV = NUM_PERIODS['M'];
            for (let i = startV; i < startV + NUM_PERIODS['V']; i++) if (day[i]) totalSlotsAvailableV++;
        });
    });

    if (totalLessonsNeededM > totalSlotsAvailableM) {
        return {
            schedule: null,
            error: "Capacidade total insuficiente no turno Matutino.",
            details: `A carga horária total somada de todas as turmas da manhã é de ${totalLessonsNeededM} aulas, mas a soma de todos os horários livres de todos os professores no turno da manhã é de apenas ${totalSlotsAvailableM}.`
        };
    }
    if (totalLessonsNeededV > totalSlotsAvailableV) {
        return {
            schedule: null,
            error: "Capacidade total insuficiente no turno Vespertino.",
            details: `A carga horária total somada de todas as turmas da tarde é de ${totalLessonsNeededV} aulas, mas a soma de todos os horários livres de todos os professores no turno da tarde é de apenas ${totalSlotsAvailableV}.`
        };
    }

    // ===== 3. Sanity Check: Bottleneck de Horários Específicos =====
    // Verifica se em algum horário específico (ex: Segunda, 1º tempo) existem professores suficientes para todas as turmas
    for (const shift of ['M', 'V'] as const) {
        const classesInShift = classGroups.filter(c => c.shift === shift).length;
        const totalLessonsInShift = pendingLessons.filter(l => l.shift === shift).length;
        const totalSlotsInShift = classesInShift * NUM_PERIODS[shift] * NUM_DAYS;
        const maxEmptySlotsInShift = totalSlotsInShift - totalLessonsInShift;
        
        let emptySlotsOverConstraint = 0;
        const startP = shift === 'M' ? 0 : NUM_PERIODS['M'];
        const endP = startP + NUM_PERIODS[shift];

        for (let d = 0; d < NUM_DAYS; d++) {
            for (let p = startP; p < endP; p++) {
                const profsAvailable = professors.filter(prof => prof.availability[d][p]).length;
                if (profsAvailable < classesInShift) {
                    emptySlotsOverConstraint += (classesInShift - profsAvailable);
                }
            }
        }

        if (emptySlotsOverConstraint > maxEmptySlotsInShift) {
            return {
                schedule: null,
                error: `Gargalo crítico no turno ${shift === 'M' ? 'Matutino' : 'Vespertino'}.`,
                details: `Existem horários onde quase nenhum professor está disponível. Somando todas as faltas de professores em horários específicos, faltam ${emptySlotsOverConstraint} "vagas" de professor, mas as turmas só podem ter ${maxEmptySlotsInShift} horários vagos no total.`
            };
        }
    }

    // ===== 4. Sanity Check: Capacidade Disciplina vs Professores por TURNO =====
    const profsBySubject = new Map<string, Professor[]>();
    professors.forEach(prof => {
        prof.subjects.forEach(subId => {
            if (!profsBySubject.has(subId)) profsBySubject.set(subId, []);
            profsBySubject.get(subId)!.push(prof);
        });
    });

    const subjectsInPending = Array.from(new Set(pendingLessons.map(l => l.subjectId)));
    
    for (const subId of subjectsInPending) {
        const lessonsM = pendingLessons.filter(l => l.subjectId === subId && l.shift === 'M').length;
        const lessonsV = pendingLessons.filter(l => l.subjectId === subId && l.shift === 'V').length;
        const possibleProfs = profsBySubject.get(subId) || [];
        const subjectName = subjectMap.get(subId) || subId;
        
        if (possibleProfs.length === 0 && (lessonsM + lessonsV > 0)) {
            return {
                schedule: null,
                error: `Faltam professores para a disciplina ${subjectName}.`,
                details: "Cadastre pelo menos um professor habilitado para esta matéria."
            };
        }

        let subSlotsM = 0;
        let subSlotsV = 0;
        possibleProfs.forEach(p => {
            p.availability.forEach(day => {
                for (let i = 0; i < NUM_PERIODS['M']; i++) if (day[i]) subSlotsM++;
                const startV = NUM_PERIODS['M'];
                for (let i = startV; i < startV + NUM_PERIODS['V']; i++) if (day[i]) subSlotsV++;
            });
        });

        if (lessonsM > subSlotsM) {
            return {
                schedule: null,
                error: `Carga horária impossível para a disciplina ${subjectName} (Manhã).`,
                details: `São necessárias ${lessonsM} aulas na manhã, mas os professores habilitados para ${subjectName} só possuem ${subSlotsM} horários livres nesse turno.`
            };
        }
        if (lessonsV > subSlotsV) {
            return {
                schedule: null,
                error: `Carga horária impossível para a disciplina ${subjectName} (Tarde).`,
                details: `São necessárias ${lessonsV} aulas na tarde, mas os professores habilitados para ${subjectName} só possuem ${subSlotsV} horários livres nesse turno.`
            };
        }
    }

    // ===== 5. Ordenar por restrição (MRV) =====
    pendingLessons.sort((a, b) => {
        const profsA = profsBySubject.get(a.subjectId)?.length || 0;
        const profsB = profsBySubject.get(b.subjectId)?.length || 0;
        if (profsA !== profsB) return profsA - profsB;
        
        // Se empate, prioriza turmas com mais carga horária (mais difíceis de encaixar)
        const classA = classGroups.find(c => c.id === a.classId);
        const classB = classGroups.find(c => c.id === b.classId);
        const classWeightA = Object.values(classA?.gradeConfig || {}).reduce((sum, v) => sum + v, 0);
        const classWeightB = Object.values(classB?.gradeConfig || {}).reduce((sum, v) => sum + v, 0);
        if (classWeightA !== classWeightB) return classWeightB - classWeightA;

        const countA = pendingLessons.filter(l => l.subjectId === a.subjectId).length;
        const countB = pendingLessons.filter(l => l.subjectId === b.subjectId).length;
        return countB - countA;
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
