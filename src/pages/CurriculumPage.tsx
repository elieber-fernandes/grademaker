import { useState, useEffect, useMemo } from 'react';
import { useStore } from '../store';
import { Minus, Plus, GraduationCap, AlertCircle, Copy, ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Extrai o segmento do nome da turma (ex: '6º Ano A' -> '6º Ano')
const getSegment = (name: string) => {
    const lastSpace = name.lastIndexOf(' ');
    if (lastSpace > 0 && name.length - lastSpace <= 3) {
        return name.substring(0, lastSpace).trim();
    }
    return name;
};

export const CurriculumPage = () => {
    const { classGroups, subjects, updateClassSubjectConfig, applyConfigToClasses, updateClassShift } = useStore();
    const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
    const [showCopyMenu, setShowCopyMenu] = useState(false);
    const [copyMessage, setCopyMessage] = useState<string | null>(null);

    // Inicializar seleção
    useEffect(() => {
        if (!selectedClassId && classGroups.length > 0) {
            setSelectedClassId(classGroups[0].id);
        }
    }, [selectedClassId, classGroups]);

    const currentClass = classGroups.find(c => c.id === selectedClassId);

    // Gerar opções de cópia dinamicamente a partir dos segmentos reais
    const copyOptions = useMemo(() => {
        const segmentMap = new Map<string, string[]>();
        classGroups.forEach(c => {
            const seg = getSegment(c.name);
            if (!segmentMap.has(seg)) segmentMap.set(seg, []);
            segmentMap.get(seg)!.push(c.id);
        });

        const options: { label: string; targetIds: string[]; danger?: boolean }[] = [];
        segmentMap.forEach((ids, seg) => {
            options.push({ label: seg, targetIds: ids });
        });

        // Adicionar opção "TODAS as Turmas"
        options.push({
            label: 'TODAS as Turmas',
            targetIds: classGroups.map(c => c.id),
            danger: true
        });

        return options;
    }, [classGroups]);

    const handleCopy = async (targetIds: string[], label: string) => {
        if (!selectedClassId) return;
        // Excluir a turma de origem da lista de destino
        const targets = targetIds.filter(id => id !== selectedClassId);
        if (targets.length === 0) {
            alert('Nenhuma outra turma encontrada para este segmento.');
            return;
        }
        if (window.confirm(`Aplicar configuração para ${targets.length} turma(s) de ${label}?`)) {
            await applyConfigToClasses(selectedClassId, targets);
            setShowCopyMenu(false);
            setCopyMessage(`Configuração copiada para ${targets.length} turma(s) de ${label}!`);
            setTimeout(() => setCopyMessage(null), 3000);
        }
    };

    return (
        <div className="space-y-6">
            {/* Cabeçalho */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/50 backdrop-blur-sm p-6 rounded-3xl border border-white/60 shadow-sm">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Matriz Curricular</h2>
                    <p className="text-slate-500 font-medium">Defina a carga horária de cada turma</p>
                </div>

                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
                    {currentClass && (
                        <div className="bg-white p-1 rounded-2xl border border-slate-100 shadow-sm flex items-center text-sm font-bold">
                            <button
                                onClick={() => updateClassShift(currentClass.id, 'M')}
                                className={`px-4 py-2 rounded-xl transition-all ${currentClass.shift === 'M' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                Manhã
                            </button>
                            <button
                                onClick={() => updateClassShift(currentClass.id, 'V')}
                                className={`px-4 py-2 rounded-xl transition-all ${currentClass.shift === 'V' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                Tarde
                            </button>
                        </div>
                    )}

                    <div className="bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-2">
                        <GraduationCap className="text-indigo-500 ml-3" size={20} />
                        <select
                            value={selectedClassId || ''}
                            onChange={(e) => setSelectedClassId(e.target.value)}
                            className="bg-transparent py-2.5 pr-8 pl-2 font-bold text-slate-700 outline-none cursor-pointer hover:bg-slate-50 rounded-xl transition-colors min-w-[200px]"
                            aria-label="Selecionar turma"
                            title="Selecionar turma"
                        >
                            {classGroups.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Toast de sucesso */}
            <AnimatePresence>
                {copyMessage && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-4 py-3 rounded-2xl font-bold text-sm flex items-center gap-2 shadow-sm"
                    >
                        <Check size={18} />
                        {copyMessage}
                    </motion.div>
                )}
            </AnimatePresence>

            {selectedClassId && (
                <div className="relative">
                    <div className="flex justify-end mb-4">
                        <button
                            onClick={() => setShowCopyMenu(!showCopyMenu)}
                            className="flex items-center gap-2 bg-indigo-50 text-indigo-600 px-4 py-2.5 rounded-2xl font-bold hover:bg-indigo-100 transition-colors shadow-sm"
                            title="Copiar configuração para outras turmas"
                        >
                            <Copy size={18} />
                            <span className="hidden sm:inline">Copiar...</span>
                            <ChevronDown size={16} />
                        </button>

                        <AnimatePresence>
                            {showCopyMenu && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-100 p-2 z-50 origin-top-right"
                                >
                                    {copyOptions.map((opt, idx) => {
                                        const count = opt.targetIds.filter(id => id !== selectedClassId).length;
                                        return (
                                            <button
                                                key={idx}
                                                onClick={() => handleCopy(opt.targetIds, opt.label)}
                                                disabled={count === 0}
                                                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-between group ${
                                                    count === 0
                                                        ? 'text-slate-300 cursor-not-allowed'
                                                        : opt.danger
                                                            ? 'text-red-500 hover:bg-red-50'
                                                            : 'text-slate-600 hover:bg-indigo-50 hover:text-indigo-600'
                                                }`}
                                            >
                                                <span>{opt.label}</span>
                                                <span className={`text-xs ${count === 0 ? 'text-slate-300' : 'text-slate-400'}`}>
                                                    {count} turma{count !== 1 ? 's' : ''}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            )}

            {classGroups.length === 0 ? (
                <div className="glass-card p-12 text-center">
                    <AlertCircle className="mx-auto text-indigo-400 mb-4" size={48} />
                    <h3 className="text-xl font-bold text-slate-700">Nenhuma turma cadastrada</h3>
                    <p className="text-slate-500">Cadastre turmas na aba "Importar" ou "Turmas" para configurar o currículo.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <AnimatePresence mode="popLayout">
                        {subjects.map((subject) => {
                            const count = currentClass?.gradeConfig?.[subject.id] || 0;

                            return (
                                <motion.div
                                    key={subject.id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className={`glass-card p-4 md:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-2 transition-all group ${count > 0 ? 'border-indigo-500/20 bg-indigo-50/10' : 'border-transparent'
                                        }`}
                                >
                                    <div className="flex items-center gap-3 md:gap-4">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold shadow-sm transition-colors ${count > 0 ? 'bg-indigo-500 text-white' : 'bg-white text-slate-300'
                                            }`}>
                                            {subject.name.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <h4 className={`font-bold text-lg ${count > 0 ? 'text-slate-800' : 'text-slate-400'}`}>
                                                {subject.name}
                                            </h4>
                                            <p className="text-xs font-medium text-slate-400">
                                                {count === 0 ? 'Sem aulas' : `${count} aula${count > 1 ? 's' : ''}/semana`}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between w-full sm:w-auto gap-3 bg-white rounded-xl p-1 shadow-sm border border-slate-100">
                                        <button
                                            onClick={() => currentClass && updateClassSubjectConfig(currentClass.id, subject.id, Math.max(0, count - 1))}
                                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-indigo-600 transition-colors"
                                            disabled={count === 0}
                                            aria-label={`Diminuir aulas de ${subject.name}`}
                                            title={`Diminuir aulas de ${subject.name}`}
                                        >
                                            <Minus size={16} />
                                        </button>

                                        <span className={`w-6 text-center font-bold ${count > 0 ? 'text-indigo-600' : 'text-slate-300'}`}>
                                            {count}
                                        </span>

                                        <button
                                            onClick={() => currentClass && updateClassSubjectConfig(currentClass.id, subject.id, count + 1)}
                                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-indigo-600 transition-colors"
                                            aria-label={`Aumentar aulas de ${subject.name}`}
                                            title={`Aumentar aulas de ${subject.name}`}
                                        >
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>

                    {subjects.length === 0 && (
                        <div className="col-span-full py-12 text-center text-slate-400">
                            Nenhuma disciplina cadastrada. Cadastre em "Importar" primeiro.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
