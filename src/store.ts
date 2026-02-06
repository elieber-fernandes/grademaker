import { create } from 'zustand';
import type { Professor, Subject, ClassGroup, Schedule, TimeSlot } from './types';

// Não temos o uuid instalado, vamos usar um gerador de string aleatória simples por enquanto para evitar dependências extras,
// ou apenas instalá-lo. Por enquanto, uma função auxiliar.

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

    // Ações de Agendamento
    setSchedule: (schedule: Schedule) => void;
    moveLesson: (lessonId: string, newTime: TimeSlot) => void;
    importBatch: (data: { subjects?: string[], classGroups?: string[], professors?: string[] }) => void;
    importLinkedData: (pairs: { professorName: string, subjectName: string }[], classes: string[]) => void;
    applyConfigToClasses: (sourceClassId: string, targetClassIds: string[]) => void;
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

        // Processar Turmas
        classes.forEach(clsName => {
            if (!currentClasses.find(c => c.name === clsName)) {
                currentClasses.push({ id: generateId(), name: clsName, gradeConfig: {} });
            }
        });

        // Passo 1: Coletar TODAS as disciplinas únicas primeiro (excluindo 'Todas')
        const uniqueSubjects = new Set<string>();
        pairs.forEach(p => {
            if (p.subjectName.toLowerCase() !== 'todas') {
                uniqueSubjects.add(p.subjectName);
            }
        });

        // Criar disciplinas faltantes imediatamente
        uniqueSubjects.forEach(subName => {
            if (!currentSubjects.find(s => s.name.toLowerCase() === subName.toLowerCase())) {
                currentSubjects.push({ id: generateId(), name: subName });
            }
        });

        // Passo 2: Processar Professores e Vincular
        pairs.forEach(({ professorName, subjectName }) => {
            // Garantir que o Professor Exista
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

            // Determinar quais disciplinas vincular
            let subjectsToLink: string[] = [];

            if (subjectName.toLowerCase() === 'todas') {
                // Vincular TODAS as disciplinas atuais
                subjectsToLink = currentSubjects.map(s => s.id);
            } else {
                // Vincular disciplina específica
                const subId = currentSubjects.find(s => s.name.toLowerCase() === subjectName.toLowerCase())?.id;
                if (subId) subjectsToLink = [subId];
            }

            // Vinculá-los (evitar duplicatas)
            const profIndex = currentProfessors.findIndex(p => p.id === professor!.id);
            if (profIndex >= 0) {
                const existingSubjects = new Set(currentProfessors[profIndex].subjects);
                subjectsToLink.forEach(id => existingSubjects.add(id));

                currentProfessors[profIndex] = {
                    ...currentProfessors[profIndex],
                    subjects: Array.from(existingSubjects)
                };
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
            availability: Array(5).fill(null).map(() => Array(5).fill(true)) // Padrão: todos disponíveis
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
        // A lógica para mover aula viria aqui, atualizando a grade de horários
        // Por enquanto um placeholder simples
        return state;
    }),

    applyConfigToClasses: (sourceClassId, targetClassIds) => set((state) => {
        const sourceClass = state.classGroups.find(c => c.id === sourceClassId);
        if (!sourceClass) return state;

        return {
            classGroups: state.classGroups.map(c =>
                c.id === sourceClassId || !targetClassIds.includes(c.id)
                    ? c
                    : { ...c, gradeConfig: { ...sourceClass.gradeConfig } }
            )
        };
    })
}));
