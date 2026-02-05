import { create } from 'zustand';
import type { Professor, Subject, ClassGroup, Schedule, TimeSlot } from './types';

// We don't have uuid installed, let's use a simple random string generator for now to avoid extra dependencies if possible,
// or just install it. For now, a helper function.

const generateId = () => Math.random().toString(36).substr(2, 9);

interface AppState {
    professors: Professor[];
    subjects: Subject[];
    classGroups: ClassGroup[];
    schedule: Schedule;

    addProfessor: (name: string, subjectIds: string[]) => void;
    updateProfessorAvailability: (id: string, availability: boolean[][]) => void;
    addSubject: (name: string) => void;
    addClassGroup: (name: string) => void;
    updateClassSubjectConfig: (classId: string, subjectId: string, count: number) => void;

    // Schedule Actions
    setSchedule: (schedule: Schedule) => void;
    moveLesson: (lessonId: string, newTime: TimeSlot) => void;
    importBatch: (data: { subjects?: string[], classGroups?: string[], professors?: string[] }) => void;
    importLinkedData: (pairs: { professorName: string, subjectName: string }[], classes: string[]) => void;
}

export const useStore = create<AppState>((set) => ({
    professors: [],
    subjects: [],
    classGroups: [],
    schedule: { grid: {} },

    importBatch: (data) => set((state) => {
        const newSubjects = (data.subjects || []).map(name => ({ id: generateId(), name }));
        const newClasses = (data.classGroups || []).map(name => ({ id: generateId(), name, gradeConfig: {} }));
        const newProfessors = (data.professors || []).map(name => ({
            id: generateId(),
            name,
            subjects: [],
            availability: Array(5).fill(null).map(() => Array(5).fill(true))
        }));

        return {
            subjects: [...state.subjects, ...newSubjects],
            classGroups: [...state.classGroups, ...newClasses],
            professors: [...state.professors, ...newProfessors]
        };
    }),

    importLinkedData: (pairs: { professorName: string, subjectName: string }[], classes: string[]) => set((state) => {
        const currentSubjects = [...state.subjects];
        const currentProfessors = [...state.professors];
        const currentClasses = [...state.classGroups];

        // Process Classes
        classes.forEach(clsName => {
            if (!currentClasses.find(c => c.name === clsName)) {
                currentClasses.push({ id: generateId(), name: clsName, gradeConfig: {} });
            }
        });

        // Process Pairs
        pairs.forEach(({ professorName, subjectName }) => {
            // 1. Ensure Subject Exists
            let subjectId = currentSubjects.find(s => s.name.toLowerCase() === subjectName.toLowerCase())?.id;
            if (!subjectId) {
                subjectId = generateId();
                currentSubjects.push({ id: subjectId, name: subjectName });
            }

            // 2. Ensure Professor Exists
            let professor = currentProfessors.find(p => p.name.toLowerCase() === professorName.toLowerCase());
            if (!professor) {
                professor = {
                    id: generateId(),
                    name: professorName,
                    subjects: [],
                    availability: Array(5).fill(null).map(() => Array(5).fill(true))
                };
                currentProfessors.push(professor);
            }

            // 3. Link Subject to Professor
            if (!professor.subjects.includes(subjectId)) {
                // We need to update the professor object in the array. 
                // Since 'professor' is a reference to the object in currentProfessors array (which is a shallow copy of the state array but profound objects are references), 
                // we should be careful. 
                // Actually spread [...] does shallow copy of array. Objects inside are compatible references unless we map.
                // But since we pushed new objects, those are safe. Existing objects need care.
                // Let's rely on finding index to retain immutability pattern if we were strict, 
                // but Zustand set return replaces the whole state.

                // Let's map to be safe and clean.
                const profIndex = currentProfessors.findIndex(p => p.id === professor!.id);
                if (profIndex >= 0) {
                    currentProfessors[profIndex] = {
                        ...currentProfessors[profIndex],
                        subjects: [...currentProfessors[profIndex].subjects, subjectId]
                    };
                }
            }
        });

        return {
            subjects: currentSubjects,
            professors: currentProfessors,
            classGroups: currentClasses
        };
    }),

    addProfessor: (name, subjectIds) => set((state) => ({
        professors: [...state.professors, {
            id: generateId(),
            name,
            subjects: subjectIds,
            availability: Array(5).fill(null).map(() => Array(5).fill(true)) // Default all available
        }]
    })),

    updateProfessorAvailability: (id, availability) => set((state) => ({
        professors: state.professors.map(p => p.id === id ? { ...p, availability } : p)
    })),

    addSubject: (name) => set((state) => ({
        subjects: [...state.subjects, { id: generateId(), name }]
    })),

    addClassGroup: (name) => set((state) => ({
        classGroups: [...state.classGroups, { id: generateId(), name, gradeConfig: {} }]
    })),

    updateClassSubjectConfig: (classId, subjectId, count) => set((state) => ({
        classGroups: state.classGroups.map(c =>
            c.id === classId
                ? { ...c, gradeConfig: { ...c.gradeConfig, [subjectId]: count } }
                : c
        )
    })),

    setSchedule: (schedule) => set({ schedule }),

    moveLesson: () => set((state) => {
        // Logic to move lesson would go here, updating the schedule grid
        // For now simple placeholder
        return state;
    })
}));
