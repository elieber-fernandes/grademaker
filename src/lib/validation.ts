import type { Schedule, Professor, ClassGroup } from '../types';
import { NUM_PERIODS } from '../constants';

export type ConflictType = 'PROFESSOR_BUSY' | 'PROFESSOR_UNAVAILABLE' | 'SUBJECT_MISMATCH' | 'SHIFT_MISMATCH';

export interface Conflict {
    day: number;
    period: number;
    classGroupId: string;
    type: ConflictType;
    description: string;
}

export const findConflicts = (
    schedule: Schedule,
    professors: Professor[],
    classGroups: ClassGroup[]
): Conflict[] => {
    const conflicts: Conflict[] = [];
    const professorTimeMap = new Map<string, string>(); // Chave: "idProf-dia-período" -> "idTurma"

    // Iterar sobre todas as aulas agendadas
    Object.entries(schedule.grid).forEach(([slotId, lesson]) => {
        // formato slotId: "idTurma:::dia:::período"
        const parts = slotId.split(':::');
        if (parts.length < 3) return;

        const classId = parts[0];
        const day = parseInt(parts[1]);
        const period = parseInt(parts[2]);

        if (!lesson.professorId) return;

        const professor = professors.find(p => p.id === lesson.professorId);
        const currentClass = classGroups.find(c => c.id === classId);

        // Checagem 1: Professor já está dando aula neste horário
        const profKey = `${lesson.professorId}:::${day}:::${period}`;
        if (professorTimeMap.has(profKey)) {
            const existingClassId = professorTimeMap.get(profKey);
            const existingClass = classGroups.find(c => c.id === existingClassId);
            conflicts.push({
                day,
                period,
                classGroupId: classId,
                type: 'PROFESSOR_BUSY',
                description: `Professor já está alocado na turma "${existingClass?.name || existingClassId}" neste horário.`
            });
        } else {
            professorTimeMap.set(profKey, classId);
        }

        if (professor) {
            // Checagem 2: Disponibilidade do Professor
            if (professor.availability[day] && professor.availability[day][period] === false) {
                conflicts.push({
                    day,
                    period,
                    classGroupId: classId,
                    type: 'PROFESSOR_UNAVAILABLE',
                    description: `Professor ${professor.name} marcou indisponibilidade neste horário.`
                });
            }

            // Checagem 3: Especialidade do Professor
            if (!professor.subjects.includes(lesson.subjectId)) {
                conflicts.push({
                    day,
                    period,
                    classGroupId: classId,
                    type: 'SUBJECT_MISMATCH',
                    description: `Professor ${professor.name} não está habilitado para lecionar esta disciplina.`
                });
            }
        }

        // Checagem 4: Turno da Turma
        if (currentClass) {
            const startV = NUM_PERIODS['M'];
            const isMorningSlot = period < startV;
            if (currentClass.shift === 'M' && !isMorningSlot) {
                conflicts.push({
                    day,
                    period,
                    classGroupId: classId,
                    type: 'SHIFT_MISMATCH',
                    description: `Aula da manhã agendada em horário vespertino.`
                });
            } else if (currentClass.shift === 'V' && isMorningSlot) {
                conflicts.push({
                    day,
                    period,
                    classGroupId: classId,
                    type: 'SHIFT_MISMATCH',
                    description: `Aula da tarde agendada em horário matutino.`
                });
            }
        }
    });

    return conflicts;
};
