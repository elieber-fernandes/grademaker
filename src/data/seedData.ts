import { supabase } from '../lib/supabase';
import type { Professor, Subject, ClassGroup } from '../types';

// Helper de ID (mesmo do store)
const generateId = () => Math.random().toString(36).substr(2, 9);

// Dados iniciais: pares Professor -> Disciplina
const INITIAL_PAIRS: { professorName: string; subjectName: string }[] = [
    { professorName: 'ALEXANDRE MACHADO VIEIRA', subjectName: 'Matematica' },
    { professorName: 'ANA CAROLINA RAMOS AXT', subjectName: 'Ciencias' },
    { professorName: 'ANDRÉIA CRISTINA MAIA VILICZINSKI', subjectName: 'Matematica' },
    { professorName: 'ANSELMO GIACCHERO MUMIC', subjectName: 'Quimica' },
    { professorName: 'CAMILA SOARES DE MELO SILVA', subjectName: 'Redação' },
    { professorName: 'CARLOS SAMOEL LEONARDO', subjectName: 'Filosofia' },
    { professorName: 'CESAR AUGUSTO HOSANG', subjectName: 'Lingua Inglesa' },
    { professorName: 'CIBELE DALINA PIVA', subjectName: 'Historia' },
    { professorName: 'DANIEL DE SOUZA FRANCA', subjectName: 'Biologia' },
    { professorName: 'ELAINE INGRID GREIN', subjectName: 'Geografia' },
    { professorName: 'EVANDRO LUIS DA COSTA', subjectName: 'Fisica' },
    { professorName: 'FABIO SAMUEL VALERIO', subjectName: 'Matematica' },
    { professorName: 'FILLIPE DA MAIA CRUZ DA SILVA', subjectName: 'Geografia' },
    { professorName: 'FLAVIA INGRID BORGES DIAS', subjectName: 'Projeto de Vida' },
    { professorName: 'FRANCISCO CORREA', subjectName: 'Matematica' },
    { professorName: 'GIANCARLO SCHLUTER', subjectName: 'Matematica' },
    { professorName: 'GILMAR GONCALVES', subjectName: 'Educação Fisica' },
    { professorName: 'JAMILE NAIR DE AZEVEDO', subjectName: 'Historia' },
    { professorName: 'LUCIANA MACHADO GONCALVES', subjectName: 'Quimica' },
    { professorName: 'MIGUEL ANGEL ALMADA FIGARI', subjectName: 'Matematica' },
    { professorName: 'NEUSA DE LOURDES CAGNETI', subjectName: 'Literatura Portuguesa' },
    { professorName: 'RAFAELA DE SOUZA SCHMIDT', subjectName: 'Projeto de Vida' },
    { professorName: 'RODRIGO LUIZ DA SILVA', subjectName: 'Ensino Religioso' },
    { professorName: 'SILVIO ZALESKI', subjectName: 'Matematica' },
    { professorName: 'THIAGO DE SOUZA', subjectName: 'Artes' },
    { professorName: 'THIAGO', subjectName: 'Pensamento Computacional' },
];

// Turmas iniciais
const INITIAL_CLASS_GROUPS: string[] = [
    '6º Ano A', '6º Ano B', '6º Ano C', '6º Ano D', '6º Ano E',
    '7º Ano A', '7º Ano B', '7º Ano C', '7º Ano D',
    '8º Ano A', '8º Ano B', '8º Ano C', '8º Ano D',
    '9º Ano A', '9º Ano B', '9º Ano C', '9º Ano D',
    '1ª Série A', '1ª Série B', '1ª Série C', '1ª Série D',
    '2ª Série A', '2ª Série B', '2ª Série C', '2ª Série D',
    '3ª Série A', '3ª Série B', '3ª Série C', '3ª Série D',
];

/**
 * Gera os dados de seed localmente (sem depender do Supabase).
 */
function buildSeedData(): { professors: Professor[]; subjects: Subject[]; classGroups: ClassGroup[] } {
    // 1. Extrair disciplinas únicas
    const uniqueSubjectNames = [...new Set(INITIAL_PAIRS.map(p => p.subjectName))];
    const subjects: Subject[] = uniqueSubjectNames.map(name => ({
        id: generateId(),
        name,
    }));

    // 2. Criar mapa de disciplina nome -> id
    const subjectMap = new Map(subjects.map(s => [s.name, s.id]));

    // 3. Criar professores vinculados às suas disciplinas
    const professorsMap = new Map<string, Professor>();

    INITIAL_PAIRS.forEach(({ professorName, subjectName }) => {
        const subjectId = subjectMap.get(subjectName);
        if (!subjectId) return;

        if (professorsMap.has(professorName)) {
            const prof = professorsMap.get(professorName)!;
            if (!prof.subjects.includes(subjectId)) {
                prof.subjects.push(subjectId);
            }
        } else {
            professorsMap.set(professorName, {
                id: generateId(),
                name: professorName,
                subjects: [subjectId],
                availability: Array(5).fill(null).map(() => Array(6).fill(true)),
            });
        }
    });

    // Configuração padrão para o Ensino Fundamental II
    const defaultFund2Config: Record<string, number> = {
        'Matematica': 5,
        'Ciencias': 3,
        'Lingua Inglesa': 5,
        'Historia': 3,
        'Geografia': 3,
        'Projeto de Vida': 1,
        'Educação Fisica': 2,
        'Literatura Portuguesa': 5,
        'Ensino Religioso': 1,
        'Artes': 1,
        'Pensamento Computacional': 1,
    };

    // Configuração padrão para o Ensino Médio
    const defaultMedioConfig: Record<string, number> = {
        'Matematica': 3,
        'Quimica': 3,
        'Redação': 2,
        'Filosofia': 1,
        'Lingua Inglesa': 3,
        'Historia': 3,
        'Biologia': 3,
        'Geografia': 3,
        'Fisica': 3,
        'Projeto de Vida': 1,
        'Educação Fisica': 1,
        'Literatura Portuguesa': 3,
        'Artes': 1,
    };

    // 4. Criar turmas
    const classGroups: ClassGroup[] = INITIAL_CLASS_GROUPS.map(name => {
        const isFund2 = name.includes('Ano');
        const isMedio = name.includes('Série');
        const gradeConfig: Record<string, number> = {};

        if (isFund2) {
            subjects.forEach(sub => {
                const count = defaultFund2Config[sub.name];
                if (count) {
                    gradeConfig[sub.id] = count;
                }
            });
        } else if (isMedio) {
            subjects.forEach(sub => {
                const count = defaultMedioConfig[sub.name];
                if (count) {
                    gradeConfig[sub.id] = count;
                }
            });
        }

        return {
            id: generateId(),
            name,
            gradeConfig,
        };
    });

    return { professors: Array.from(professorsMap.values()), subjects, classGroups };
}

/**
 * Verifica se o banco está vazio e insere os dados iniciais.
 * Se a conexão com o Supabase falhar, retorna os dados localmente como fallback.
 */
export async function seedInitialData(
    existingProfessors: Professor[],
    existingSubjects: Subject[],
    existingClassGroups: ClassGroup[] = []
): Promise<{ professors: Professor[]; subjects: Subject[]; classGroups: ClassGroup[] } | null> {
    // Só faz seed se TODAS as tabelas estiverem vazias
    if (existingProfessors.length > 0 || existingSubjects.length > 0 || existingClassGroups.length > 0) {
        return null;
    }

    console.log('🌱 Banco vazio detectado. Inserindo dados iniciais...');

    const seedData = buildSeedData();

    // Tentar persistir no Supabase
    try {
        const { error: subError } = await supabase.from('subjects').insert(seedData.subjects);
        if (subError) {
            console.warn('⚠️ Erro ao inserir disciplinas no Supabase:', subError);
        }

        const { error: profError } = await supabase.from('professors').insert(
            seedData.professors.map(p => ({
                id: p.id,
                name: p.name,
                subjects: p.subjects,
                availability: p.availability,
            }))
        );
        if (profError) {
            console.warn('⚠️ Erro ao inserir professores no Supabase:', profError);
        }

        const { error: classError } = await supabase.from('class_groups').insert(
            seedData.classGroups.map(c => ({
                id: c.id,
                name: c.name,
                grade_config: c.gradeConfig,
            }))
        );
        if (classError) {
            console.warn('⚠️ Erro ao inserir turmas no Supabase:', classError);
        }

        console.log(
            `✅ Seed concluído: ${seedData.subjects.length} disciplinas, ${seedData.professors.length} professores e ${seedData.classGroups.length} turmas.`
        );
    } catch (e) {
        console.warn('⚠️ Supabase indisponível, usando dados de seed localmente.', e);
    }

    // Retorna os dados de seed para o estado local independentemente do Supabase
    return seedData;
}
