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
    const professorTimeMap = new Map<string, string>(); // Key: "profId-day-period" -> "classId"

    // Iterate over all scheduled lessons
    Object.entries(schedule.grid).forEach(([slotId, lesson]) => {
        // slotId format: "classId-day-period"
        const [classId, dayStr, periodStr] = slotId.split('-');
        const day = parseInt(dayStr);
        const period = parseInt(periodStr);

        if (!lesson.professorId) return;

        // Check 1: Professor already teaching at this time
        const profKey = `${lesson.professorId}-${day}-${period}`;
        if (professorTimeMap.has(profKey)) {
            const existingClassId = professorTimeMap.get(profKey);
            conflicts.push({
                day,
                period,
                classGroupId: classId,
                type: 'PROFESSOR_BUSY',
                description: `Professor já está alocado na turma ${existingClassId} neste horário.`
            });
            // Also flag the other class involved? Ideally yes, but let's stick to simple detection
        } else {
            professorTimeMap.set(profKey, classId);
        }

        // Check 2: Professor availability
        const professor = professors.find(p => p.id === lesson.professorId);
        if (professor) {
            // Professor availability matrix[day][period]
            // Check bounds first to be safe
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
