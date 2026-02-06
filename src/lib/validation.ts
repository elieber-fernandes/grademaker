import type { Schedule, Professor } from '../types';

export type ConflictType = 'PROFESSOR_BUSY' | 'PROFESSOR_UNAVAILABLE' | 'CLASS_BUSY';

export interface Conflict {
    day: number;
    period: number;
    classGroupId: string;
    type: ConflictType;
    description: string;
}

export const findConflicts = (
    schedule: Schedule,
    professors: Professor[]
): Conflict[] => {
    const conflicts: Conflict[] = [];
    const professorTimeMap = new Map<string, string>(); // Chave: "idProf-dia-período" -> "idTurma"

    // Iterar sobre todas as aulas agendadas
    Object.entries(schedule.grid).forEach(([slotId, lesson]) => {
        // formato slotId: "idTurma:::dia:::período"
        const parts = slotId.split(':::');
        if (parts.length < 3) return;

        const classId = parts[0];
        const dayStr = parts[1];
        const periodStr = parts[2];

        const day = parseInt(dayStr);
        const period = parseInt(periodStr);

        if (!lesson.professorId) return;

        // Checagem 1: Professor já está dando aula neste horário
        const profKey = `${lesson.professorId}:::${day}:::${period}`;
        if (professorTimeMap.has(profKey)) {
            const existingClassId = professorTimeMap.get(profKey);
            conflicts.push({
                day,
                period,
                classGroupId: classId,
                type: 'PROFESSOR_BUSY',
                description: `Professor já está alocado na turma ${existingClassId} neste horário.`
            });
            // Também sinalizar a outra turma envolvida? Idealmente sim, mas vamos manter a detecção simples
        } else {
            professorTimeMap.set(profKey, classId);
        }

        // Checagem 2: Disponibilidade do Professor
        const professor = professors.find(p => p.id === lesson.professorId);
        if (professor) {
            // Matriz de disponibilidade do professor[dia][período]
            // Verificar limites antes por segurança
            if (professor.availability[day] && professor.availability[day][period] === false) {
                conflicts.push({
                    day,
                    period,
                    classGroupId: classId,
                    type: 'PROFESSOR_UNAVAILABLE',
                    description: `Professor ${professor.name} marcou indisponibilidade neste horário.`
                });
            }
        }
    });

    return conflicts;
};
