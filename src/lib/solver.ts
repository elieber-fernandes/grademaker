import type { Schedule, Professor, ClassGroup } from '../types';

// Auxiliar para verificar segurança diretamente durante geração (otimização)
const isSafe = (
    professorId: string,
    day: number,
    period: number,
    currentSchedule: Schedule,
    professors: Professor[]
): boolean => {
    // Verifica se professor já está ocupado neste horário
    // iterar grade (lento) ou usar mapa auxiliar? Para pequena escala, iteração é aceitável mas melhorada com rastreamento local
    // Vamos assumir que o solucionador permitirá buscas otimizadas no futuro.
    // Por enquanto, vamos verificar o agendamento atual.

    for (const [key, lesson] of Object.entries(currentSchedule.grid)) {
        const [, dStr, pStr] = key.split('-');
        if (parseInt(dStr) === day && parseInt(pStr) === period && lesson.professorId === professorId) {
            return false; // Professor ocupado
        }
    }

    // Verificar disponibilidade
    const prof = professors.find(p => p.id === professorId);
    if (prof && !prof.availability[day]?.[period]) {
        return false;
    }

    return true;
};

export const generateSchedule = (
    professors: Professor[],
    classGroups: ClassGroup[]
): Schedule | null => {
    // Cópia profunda da estrutura inicial? Ou começar do zero?
    // Vamos assumir que queremos preencher aulas *necessárias*.

    // 1. Aplainar todas as aulas específicas que precisam acontecer.
    // Precisamos saber quais aulas cada turma precisa. 
    // atualmente classGroup.gradeConfig mapeia idDisciplina -> quantidade.

    const pendingLessons: { classId: string, subjectId: string }[] = [];

    classGroups.forEach(cls => {
        Object.entries(cls.gradeConfig).forEach(([subId, count]) => {
            for (let i = 0; i < count; i++) {
                pendingLessons.push({ classId: cls.id, subjectId: subId });
            }
        });
    });

    // Ordenar aulas pendentes? Talvez restrições mais difíceis primeiro (ex: professores restritos)

    const tempSchedule: Schedule = { grid: {} };

    const solve = (lessonIndex: number): boolean => {
        if (lessonIndex >= pendingLessons.length) {
            return true; // Tudo pronto!
        }

        const task = pendingLessons[lessonIndex];
        // Encontrar um professor para esta disciplina
        const possibleProfs = professors.filter(p => p.subjects.includes(task.subjectId));

        if (possibleProfs.length === 0) {
            // Impossível: nenhum professor para esta disciplina
            console.warn(`No professor found for subject ${task.subjectId}`);
            return false;
        }

        // Tentar slots válidos (Dias 0-4, Períodos 0-4)
        // Heurística: Tentar espalhá-los?
        // Aleatorizar ordem para obter resultados diferentes?

        for (const prof of possibleProfs) {
            for (let d = 0; d < 5; d++) {
                for (let p = 0; p < 5; p++) {
                    const slotKey = `${task.classId}-${d}-${p}`;

                    // Se o slot estiver vazio nesta turma
                    if (!tempSchedule.grid[slotKey]) {
                        if (isSafe(prof.id, d, p, tempSchedule, professors)) {
                            // FAZER MOVIMENTO
                            tempSchedule.grid[slotKey] = {
                                id: `gen-${d}-${p}-${task.classId}`,
                                classGroupId: task.classId,
                                professorId: prof.id,
                                subjectId: task.subjectId
                            };

                            // RECURSÃO
                            if (solve(lessonIndex + 1)) {
                                return true;
                            }

                            // BACKTRACK (RETROCEDER)
                            delete tempSchedule.grid[slotKey];
                        }
                    }
                }
            }
        }

        return false; // Não é possível alocar esta aula em lugar nenhum
    };

    const success = solve(0);
    return success ? tempSchedule : null;
};
