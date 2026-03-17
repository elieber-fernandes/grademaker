// Constantes centralizadas do sistema GradeMaker

export const NUM_DAYS = 5;

// M = Matutino, V = Vespertino
export const NUM_PERIODS = {
    'M': 6,
    'V': 5
};

export const DAYS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'] as const;
export const DAYS_SHORT = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'] as const;

export const PERIODS = {
    'M': ['07:20', '08:05', '09:05', '09:50', '10:50', '11:35'],
    'V': ['13:30', '14:15', '15:15', '16:00', '17:00']
};

export const PERIOD_END_TIMES = {
    'M': ['08:05', '08:50', '09:50', '10:35', '11:35', '12:20'],
    'V': ['14:15', '15:00', '16:00', '16:45', '17:45']
};
