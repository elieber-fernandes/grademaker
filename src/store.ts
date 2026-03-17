import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Professor, Subject, ClassGroup, Schedule, TimeSlot } from './types';
import { supabase } from './lib/supabase';

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

    addProfessor: (name: string, subjectIds: string[]) => Promise<void>;
    updateProfessorAvailability: (id: string, availability: boolean[][]) => Promise<void>;
    addSubject: (name: string) => Promise<void>;
    addClassGroup: (name: string) => Promise<void>;
    updateClassSubjectConfig: (classId: string, subjectId: string, count: number) => Promise<void>;

    setSchedule: (schedule: Schedule) => Promise<void>;
    moveLesson: (lessonId: string, newTime: TimeSlot) => void;
    importBatch: (data: { subjects?: string[], classGroups?: string[], professors?: string[] }) => Promise<void>;
    importLinkedData: (pairs: { professorName: string, subjectName: string }[], classes: string[]) => Promise<void>;
    applyConfigToClasses: (sourceClassId: string, targetClassIds: string[]) => Promise<void>;
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
                set({ isLoading: true });
                try {
                    const [profRes, subRes, classRes, schedRes] = await Promise.all([
                        supabase.from('professors').select('*'),
                        supabase.from('subjects').select('*'),
                        supabase.from('class_groups').select('*'),
                        supabase.from('schedule').select('*').single()
                    ]);

                    if (profRes.error) throw profRes.error;
                    if (subRes.error) throw subRes.error;
                    if (classRes.error) throw classRes.error;

                    const hasCloudData = (profRes.data?.length || 0) > 0 || (subRes.data?.length || 0) > 0 || (classRes.data?.length || 0) > 0;

                    if (hasCloudData) {
                        const mappedClassGroups = (classRes.data || []).map(c => ({
                            id: c.id,
                            name: c.name,
                            gradeConfig: c.grade_config || {}
                        }));

                        set({
                            professors: profRes.data || [],
                            subjects: subRes.data || [],
                            classGroups: mappedClassGroups,
                            schedule: schedRes.data ? { grid: schedRes.data.grid } : { grid: {} },
                            isLoading: false
                        });
                        console.log('☁️ Dados carregados do Supabase.');
                    } else {
                        // Se nuvem está vazia, usar seed local (ou cache do persist)
                        const state = get();
                        if (state.professors.length > 0) {
                            console.log('☁️ Supabase vazio. Sincronizando dados locais para a nuvem...');
                            // Enviar cache local para o Supabase para popular o banco novo
                            try {
                                if (state.subjects.length) {
                                    await supabase.from('subjects').upsert(state.subjects);
                                }
                                if (state.classGroups.length) {
                                    await supabase.from('class_groups').upsert(state.classGroups.map(c => ({ id: c.id, name: c.name, grade_config: c.gradeConfig })));
                                }
                                if (state.professors.length) {
                                    await supabase.from('professors').upsert(state.professors.map(p => ({ id: p.id, name: p.name, subjects: p.subjects, availability: p.availability })));
                                }
                                if (Object.keys(state.schedule.grid).length > 0) {
                                    await supabase.from('schedule').upsert({ id: 'default', grid: state.schedule.grid });
                                }
                                console.log('✅ Sincronização local -> nuvem concluída.');
                            } catch (syncErr) {
                                console.error('Erro ao sincronizar para nuvem:', syncErr);
                            }
                            set({ isLoading: false });
                            return;
                        }

                        console.log('🌱 Supabase e Cache vazios, iniciando seed...');
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
                        } else {
                            set({ isLoading: false });
                        }
                    }
                } catch (error) {
                    console.error('Erro ao conectar com Supabase (mantendo cache local):', error);
                    set({ isLoading: false });
                }
            },

            importBatch: async (data) => {
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

                if (newSubjects.length) await supabase.from('subjects').insert(newSubjects);
                if (newClasses.length) await supabase.from('class_groups').insert(newClasses.map(c => ({ id: c.id, name: c.name, grade_config: c.gradeConfig })));
                if (newProfessors.length) await supabase.from('professors').insert(newProfessors.map(p => ({ id: p.id, name: p.name, subjects: p.subjects, availability: p.availability })));
            },

            importLinkedData: async (pairs, classes) => {
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

                // Supabase Sync
                if (newClasses.length) await supabase.from('class_groups').insert(newClasses.map(c => ({ id: c.id, name: c.name, grade_config: c.gradeConfig })));
                if (newSubjects.length) await supabase.from('subjects').insert(newSubjects);
                if (updatedProfessors.length) await supabase.from('professors').upsert(updatedProfessors.map(p => ({ id: p.id, name: p.name, subjects: p.subjects, availability: p.availability })));
            },

            addProfessor: async (name, subjectIds) => {
                const newProf = {
                    id: generateId(),
                    name,
                    subjects: subjectIds,
                    availability: Array(5).fill(null).map(() => Array(6).fill(true))
                };
                set(state => ({ professors: [...state.professors, newProf] }));
                await supabase.from('professors').insert(newProf);
            },

            updateProfessorAvailability: async (id, availability) => {
                set(state => ({
                    professors: state.professors.map(p => p.id === id ? { ...p, availability } : p)
                }));
                await supabase.from('professors').update({ availability }).eq('id', id);
            },

            addSubject: async (name) => {
                const newSub = { id: generateId(), name };
                set(state => ({ subjects: [...state.subjects, newSub] }));
                await supabase.from('subjects').insert(newSub);
            },

            addClassGroup: async (name) => {
                const newClass = { id: generateId(), name, gradeConfig: {} };
                set(state => ({ classGroups: [...state.classGroups, newClass] }));
                await supabase.from('class_groups').insert({ id: newClass.id, name: newClass.name, grade_config: newClass.gradeConfig });
            },

            updateClassSubjectConfig: async (classId, subjectId, count) => {
                const state = get();
                const classGroup = state.classGroups.find(c => c.id === classId);
                if (!classGroup) return;

                const newConfig = { ...classGroup.gradeConfig, [subjectId]: count };

                set({
                    classGroups: state.classGroups.map(c =>
                        c.id === classId ? { ...c, gradeConfig: newConfig } : c
                    )
                });
                await supabase.from('class_groups').update({ grade_config: newConfig }).eq('id', classId);
            },

            setSchedule: async (schedule) => {
                set({ schedule });
                await supabase.from('schedule').upsert({ id: 'default', grid: schedule.grid });
            },

            moveLesson: (_lessonId, _newTime) => set((state) => {
                return state;
            }),

            applyConfigToClasses: async (sourceClassId, targetClassIds) => {
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

                await Promise.all(targetClassIds.map(id =>
                    supabase.from('class_groups').update({ grade_config: newConfig }).eq('id', id)
                ));
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
