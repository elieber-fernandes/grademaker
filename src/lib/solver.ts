import type { Schedule, Professor, ClassGroup } from '../types';

// Helper to check safety directly during generation (optimization)
const isSafe = (
    professorId: string,
    day: number,
    period: number,
    currentSchedule: Schedule,
    professors: Professor[]
): boolean => {
    // Check if professor is already booked at this time
    // iterate grid (slow) or use auxiliary map? For small scale, iteration is okay-ish but improved by local tracking
    // We will assume the solver enables optimized lookups in future.
    // For now, let's scan the current schedule.

    for (const [key, lesson] of Object.entries(currentSchedule.grid)) {
        const [, dStr, pStr] = key.split('-');
        if (parseInt(dStr) === day && parseInt(pStr) === period && lesson.professorId === professorId) {
            return false; // Professor busy
        }
    }

    // Check availability
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
    // Deep copy initial structure? Or start fresh?
    // Let's assume we want to fill *required* lessons.

    // 1. Flatten all specific lessons that need to happen.
    // We need to know what lessons each class needs. 
    // currently classGroup.gradeConfig maps subjectId -> count.

    const pendingLessons: { classId: string, subjectId: string }[] = [];

    classGroups.forEach(cls => {
        Object.entries(cls.gradeConfig).forEach(([subId, count]) => {
            for (let i = 0; i < count; i++) {
                pendingLessons.push({ classId: cls.id, subjectId: subId });
            }
        });
    });

    // Sort pending lessons? Maybe hardest constraints first (e.g. strict professors)

    const tempSchedule: Schedule = { grid: {} };

    const solve = (lessonIndex: number): boolean => {
        if (lessonIndex >= pendingLessons.length) {
            return true; // All done!
        }

        const task = pendingLessons[lessonIndex];
        // Find a professor for this subject
        const possibleProfs = professors.filter(p => p.subjects.includes(task.subjectId));

        if (possibleProfs.length === 0) {
            // Impossible: no professor for this subject
            console.warn(`No professor found for subject ${task.subjectId}`);
            return false;
        }

        // Try valid slots (Days 0-4, Periods 0-4)
        // Heuristic: Try to spread them out?
        // Randomize order to get different results?

        for (const prof of possibleProfs) {
            for (let d = 0; d < 5; d++) {
                for (let p = 0; p < 5; p++) {
                    const slotKey = `${task.classId}-${d}-${p}`;

                    // If slot is empty in this class
                    if (!tempSchedule.grid[slotKey]) {
                        if (isSafe(prof.id, d, p, tempSchedule, professors)) {
                            // DO MOVE
                            tempSchedule.grid[slotKey] = {
                                id: `gen-${d}-${p}-${task.classId}`,
                                classGroupId: task.classId,
                                professorId: prof.id,
                                subjectId: task.subjectId
                            };

                            // RECURSE
                            if (solve(lessonIndex + 1)) {
                                return true;
                            }

                            // BACKTRACK
                            delete tempSchedule.grid[slotKey];
                        }
                    }
                }
            }
        }

        return false; // Cannot place this lesson anywhere
    };

    const success = solve(0);
    return success ? tempSchedule : null;
};
