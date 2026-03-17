import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Professor, Subject, ClassGroup, Schedule, TimeSlot } from './types';

// Helper de ID
const generateId = () => Math.random().toString(36).substr(2, 9);

interface AppState {
    professors: Professor[];
    subjects: Subject[];
    classGroups: ClassGroup[];
    schedule: Schedule;
    isLoading: boolean;
    _hasHydrated: boolean;

    fetchInitialData: () => Promise<void>;

    addProfessor: (name: string, subjectIds: string[]) => void;
    updateProfessorAvailability: (id: string, availability: boolean[][]) => void;
    addSubject: (name: string) => void;
    addClassGroup: (name: string) => void;
    updateClassSubjectConfig: (classId: string, subjectId: string, count: number) => void;

    setSchedule: (schedule: Schedule) => void;
    moveLesson: (lessonId: string, newTime: TimeSlot) => void;
    importBatch: (data: { subjects?: string[], classGroups?: string[], professors?: string[] }) => void;
    importLinkedData: (pairs: { professorName: string, subjectName: string }[], classes: string[]) => void;
    applyConfigToClasses: (sourceClassId: string, targetClassIds: string[]) => void;
}

export const useStore = create<AppState>()(
    persist(
        (set, get) => ({
            professors: [],
            subjects: [],
            classGroups: [],
            schedule: { grid: {} },
            isLoading: false,
            _hasHydrated: false,

            fetchInitialData: async () => {
                const state = get();
                // Se já carregou dados do localStorage (persist), não reinicializar
                if (state.professors.length > 0 || state.subjects.length > 0 || state.classGroups.length > 0) {
                    console.log('📋 Dados carregados do localStorage.');
                    return;
                }

                // Só faz seed se não tiver nada salvo
                set({ isLoading: true });
                try {
                    const { seedInitialData } = await import('./data/seedData');
                    const seedResult = await seedInitialData([], [], []);
                    if (seedResult) {
                        set({
                            professors: seedResult.professors,
                            subjects: seedResult.subjects,
                            classGroups: seedResult.classGroups,
                            schedule: { grid: {} },
                            isLoading: false
                        });
                        console.log('📋 Dados iniciais (seed) carregados com sucesso.');
                    } else {
                        set({ isLoading: false });
                    }
                } catch (error) {
                    console.error('Erro ao carregar dados:', error);
                    set({ isLoading: false });
                }
            },

            importBatch: (data) => {
                const state = get();
                const newSubjects = (data.subjects || []).map(name => ({ id: generateId(), name }));
                const newClasses = (data.classGroups || []).map(name => ({ id: generateId(), name, gradeConfig: {} }));
                const newProfessors = (data.professors || []).map(name => ({
                    id: generateId(),
                    name,
                    subjects: [],
                    availability: Array(5).fill(null).map(() => Array(6).fill(true))
                }));

                set({
                    subjects: [...state.subjects, ...newSubjects],
                    classGroups: [...state.classGroups, ...newClasses],
                    professors: [...state.professors, ...newProfessors]
                });
            },

            importLinkedData: (pairs, classes) => {
                set({ isLoading: true });
                const state = get();

                const newClasses = classes
                    .filter(name => !state.classGroups.find(c => c.name === name))
                    .map(name => ({ id: generateId(), name, gradeConfig: {} }));

                const uniqueSubjects = new Set<string>();
                pairs.forEach(p => {
                    if (p.subjectName.toLowerCase() !== 'todas') uniqueSubjects.add(p.subjectName);
                });

                const newSubjects = Array.from(uniqueSubjects)
                    .filter(name => !state.subjects.find(s => s.name.toLowerCase() === name.toLowerCase()))
                    .map(name => ({ id: generateId(), name }));

                const allSubjects = [...state.subjects, ...newSubjects];

                let updatedProfessors = [...state.professors];

                pairs.forEach(({ professorName, subjectName }) => {
                    let profIndex = updatedProfessors.findIndex(p => p.name.toLowerCase() === professorName.toLowerCase());
                    let professor = profIndex >= 0 ? updatedProfessors[profIndex] : null;

                    if (!professor) {
                        professor = {
                            id: generateId(),
                            name: professorName,
                            subjects: [],
                            availability: Array(5).fill(null).map(() => Array(6).fill(true))
                        };
                        updatedProfessors.push(professor);
                    }

                    let subjectsToLink: string[] = [];
                    if (subjectName.toLowerCase() === 'todas') {
                        subjectsToLink = allSubjects.map(s => s.id);
                    } else {
                        const subId = allSubjects.find(s => s.name.toLowerCase() === subjectName.toLowerCase())?.id;
                        if (subId) subjectsToLink = [subId];
                    }

                    const currentSubSet = new Set(professor.subjects);
                    subjectsToLink.forEach(id => currentSubSet.add(id));
                    professor.subjects = Array.from(currentSubSet);

                    if (profIndex >= 0) updatedProfessors[profIndex] = professor;
                });

                set({
                    classGroups: [...state.classGroups, ...newClasses],
                    subjects: allSubjects,
                    professors: updatedProfessors,
                    isLoading: false
                });
            },

            addProfessor: (name, subjectIds) => {
                const newProf = {
                    id: generateId(),
                    name,
                    subjects: subjectIds,
                    availability: Array(5).fill(null).map(() => Array(6).fill(true))
                };
                set(state => ({ professors: [...state.professors, newProf] }));
            },

            updateProfessorAvailability: (id, availability) => {
                set(state => ({
                    professors: state.professors.map(p => p.id === id ? { ...p, availability } : p)
                }));
            },

            addSubject: (name) => {
                const newSub = { id: generateId(), name };
                set(state => ({ subjects: [...state.subjects, newSub] }));
            },

            addClassGroup: (name) => {
                const newClass = { id: generateId(), name, gradeConfig: {} };
                set(state => ({ classGroups: [...state.classGroups, newClass] }));
            },

            updateClassSubjectConfig: (classId, subjectId, count) => {
                const state = get();
                const classGroup = state.classGroups.find(c => c.id === classId);
                if (!classGroup) return;

                const newConfig = { ...classGroup.gradeConfig, [subjectId]: count };

                set({
                    classGroups: state.classGroups.map(c =>
                        c.id === classId ? { ...c, gradeConfig: newConfig } : c
                    )
                });
            },

            setSchedule: (schedule) => {
                set({ schedule });
            },

            moveLesson: (_lessonId, _newTime) => set((state) => {
                return state;
            }),

            applyConfigToClasses: (sourceClassId, targetClassIds) => {
                const state = get();
                const sourceClass = state.classGroups.find(c => c.id === sourceClassId);
                if (!sourceClass) return;

                const newConfig = { ...sourceClass.gradeConfig };

                set({
                    classGroups: state.classGroups.map(c =>
                        targetClassIds.includes(c.id)
                            ? { ...c, gradeConfig: newConfig }
                            : c
                    )
                });
            }
        }),
        {
            name: 'grademaker-storage',
            partialize: (state) => ({
                professors: state.professors,
                subjects: state.subjects,
                classGroups: state.classGroups,
                schedule: state.schedule
            }),
        }
    )
);
