import { create } from 'zustand';
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

    fetchInitialData: () => Promise<void>;

    addProfessor: (name: string, subjectIds: string[]) => Promise<void>;
    updateProfessorAvailability: (id: string, availability: boolean[][]) => Promise<void>;
    addSubject: (name: string) => Promise<void>;
    addClassGroup: (name: string) => Promise<void>;
    updateClassSubjectConfig: (classId: string, subjectId: string, count: number) => Promise<void>;

    setSchedule: (schedule: Schedule) => Promise<void>;
    moveLesson: (lessonId: string, newTime: TimeSlot) => void;
    // Importações em lote - simplificadas para salvar tudo de uma vez
    importBatch: (data: { subjects?: string[], classGroups?: string[], professors?: string[] }) => Promise<void>;
    importLinkedData: (pairs: { professorName: string, subjectName: string }[], classes: string[]) => Promise<void>;
    applyConfigToClasses: (sourceClassId: string, targetClassIds: string[]) => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
    professors: [],
    subjects: [],
    classGroups: [],
    schedule: { grid: {} },
    isLoading: false,

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

            set({
                professors: profRes.data || [],
                subjects: subRes.data || [],
                classGroups: classRes.data || [],
                schedule: schedRes.data ? { grid: schedRes.data.grid } : { grid: {} },
                isLoading: false
            });
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            set({ isLoading: false });
        }
    },

    importBatch: async (data) => {
        // Implementação simplificada: cria localmente e salva no banco
        const state = get();
        const newSubjects = (data.subjects || []).map(name => ({ id: generateId(), name }));
        const newClasses = (data.classGroups || []).map(name => ({ id: generateId(), name, gradeConfig: {} }));
        const newProfessors = (data.professors || []).map(name => ({
            id: generateId(),
            name,
            subjects: [],
            availability: Array(5).fill(null).map(() => Array(5).fill(true))
        }));

        // Salvar no Banco
        if (newSubjects.length) await supabase.from('subjects').insert(newSubjects);
        if (newClasses.length) await supabase.from('class_groups').insert(newClasses.map(c => ({
            id: c.id,
            name: c.name,
            grade_config: c.gradeConfig
        })));
        if (newProfessors.length) await supabase.from('professors').insert(newProfessors.map(p => ({
            id: p.id,
            name: p.name,
            subjects: p.subjects,
            availability: p.availability
        })));

        // Atualizar Local
        set({
            subjects: [...state.subjects, ...newSubjects],
            classGroups: [...state.classGroups, ...newClasses],
            professors: [...state.professors, ...newProfessors]
        });
    },

    importLinkedData: async (pairs, classes) => {
        set({ isLoading: true });
        const state = get();

        // 1. Preparar novos dados
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

        // Processar Professores
        // Para simplificar a sincronização complexa, vamos carregar tudo de novo no final ou fazer um diff inteligente
        // Aqui vamos construir a lista final de professores para upsert

        let updatedProfessors = [...state.professors];

        pairs.forEach(({ professorName, subjectName }) => {
            let profIndex = updatedProfessors.findIndex(p => p.name.toLowerCase() === professorName.toLowerCase());
            let professor = profIndex >= 0 ? updatedProfessors[profIndex] : null;

            if (!professor) {
                professor = {
                    id: generateId(),
                    name: professorName,
                    subjects: [],
                    availability: Array(5).fill(null).map(() => Array(5).fill(true))
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

            // Atualizar lista de disciplinas do professor (sem duplicatas)
            const currentSubSet = new Set(professor.subjects);
            subjectsToLink.forEach(id => currentSubSet.add(id));
            professor.subjects = Array.from(currentSubSet);

            // Atualizar no array temporário
            if (profIndex >= 0) updatedProfessors[profIndex] = professor;
        });

        // 2. Persistir no Supabase
        // Inserir Classes
        if (newClasses.length) {
            await supabase.from('class_groups').insert(newClasses.map(c => ({
                id: c.id,
                name: c.name,
                grade_config: {} // ensure snake_case mapping matches logic if needed, but we used jsonb default
            })));
        }

        // Inserir Subjects
        if (newSubjects.length) {
            await supabase.from('subjects').insert(newSubjects);
        }

        // Upsert Professores (Novos e Atualizados)
        // O Supabase upsert requer que passemos todos os campos obrigatórios
        const professorsPayload = updatedProfessors.map(p => ({
            id: p.id,
            name: p.name,
            subjects: p.subjects,
            availability: p.availability
        }));

        if (professorsPayload.length) {
            await supabase.from('professors').upsert(professorsPayload);
        }

        // 3. Atualizar Estado Local
        set({
            classGroups: [...state.classGroups, ...newClasses],
            subjects: allSubjects,
            professors: updatedProfessors,
            isLoading: false
        });
    },

    addProfessor: async (name, subjectIds) => {
        const newProf = {
            id: generateId(),
            name,
            subjects: subjectIds,
            availability: Array(5).fill(null).map(() => Array(5).fill(true))
        };

        // Otimista
        set(state => ({ professors: [...state.professors, newProf] }));

        // Persistir
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
        await supabase.from('class_groups').insert({
            id: newClass.id,
            name: newClass.name,
            grade_config: {}
        });
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
        // Placeholder
        return state;
    }),

    applyConfigToClasses: async (sourceClassId, targetClassIds) => {
        const state = get();
        const sourceClass = state.classGroups.find(c => c.id === sourceClassId);
        if (!sourceClass) return;

        const newConfig = { ...sourceClass.gradeConfig };

        // Atualizar Local
        set({
            classGroups: state.classGroups.map(c =>
                c.id === sourceClassId || !targetClassIds.includes(c.id)
                    ? c
                    : { ...c, gradeConfig: newConfig }
            )
        });

        // Persistir em lote (muitas atualizações individuais podem ser lentas, mas ok para agora)
        // Melhor seria uma query customizada, mas vamos iterar
        await Promise.all(targetClassIds.map(id =>
            supabase.from('class_groups').update({ grade_config: newConfig }).eq('id', id)
        ));
    }
}));
