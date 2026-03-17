export type TimeSlot = {
    dayOfWeek: 0 | 1 | 2 | 3 | 4; // 0=Segunda, 4=Sexta
    period: number; // 0 a 4 (assumindo 5 períodos por dia)
};

export type Professor = {
    id: string;
    name: string;
    subjects: string[]; // IDs das Disciplinas
    availability: boolean[][]; // [dia][período] - true se disponível
};

export type Subject = {
    id: string;
    name: string;
};

export type ClassGroup = {
    id: string;
    name: string; // ex: "1A", "3B"
    shift: 'M' | 'V'; // Matutino ou Vespertino
    gradeConfig: Record<string, number>; // ID da Disciplina -> Número de aulas por semana
};

export type Lesson = {
    id: string;
    subjectId: string;
    professorId: string | null;
    classGroupId: string;
};

export type Schedule = {
    // Chave do Mapa: "idTurma-dia-período" -> Aula
    // Isso permite consultar o que uma turma específica está fazendo em um horário específico
    grid: Record<string, Lesson>;
};export type SolverResult = {
    schedule: Schedule | null;
    error: string | null;
    details?: string;
};
