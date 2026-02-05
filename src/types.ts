export type TimeSlot = {
    dayOfWeek: 0 | 1 | 2 | 3 | 4; // 0=Monday, 4=Friday
    period: number; // 0 to 4 (assuming 5 periods per day)
};

export type Professor = {
    id: string;
    name: string;
    subjects: string[]; // Subject IDs
    availability: boolean[][]; // [day][period] - true if available
};

export type Subject = {
    id: string;
    name: string;
};

export type ClassGroup = {
    id: string;
    name: string; // e.g., "1A", "3B"
    gradeConfig: Record<string, number>; // SubjectID -> Number of lessons per week
};

export type Lesson = {
    id: string;
    subjectId: string;
    professorId: string | null;
    classGroupId: string;
};

export type Schedule = {
    // Map key: "classGroupId-day-period" -> Lesson
    // This allows looking up what a specific class is doing at a specific time
    grid: Record<string, Lesson>;
};
