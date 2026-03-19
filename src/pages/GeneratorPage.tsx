import { useState, useMemo } from 'react';
import { useStore } from '../store';
import { generateSchedule } from '../lib/solver';
import { Play, RotateCcw, CheckCircle, AlertTriangle, Sparkles, AlertOctagon, ListChecks } from 'lucide-react';
import { findConflicts } from '../lib/validation';
import { motion } from 'framer-motion';

export const GeneratorPage = () => {
    const { subjects, professors, classGroups, setSchedule, schedule } = useStore();
    const [isGenerating, setIsGenerating] = useState(false);
    const [resultMessage, setResultMessage] = useState<string | null>(null);
    const [errorDetails, setErrorDetails] = useState<string | null>(null);
    const [success, setSuccess] = useState<boolean | null>(null);
    const conflicts = findConflicts(schedule, professors, classGroups);

    const missingLessons = useMemo(() => {
        const missing: { className: string; subjectName: string; missingCount: number }[] = [];
        classGroups.forEach(cls => {
            Object.entries(cls.gradeConfig).forEach(([subId, required]: [string, any]) => {
                if (required <= 0) return;
                const scheduled = Object.values(schedule.grid).filter(
                    (l: any) => l.classGroupId === cls.id && l.subjectId === subId
                ).length;
                if (scheduled < required) {
                    missing.push({
                        className: cls.name,
                        subjectName: subjects.find(s => s.id === subId)?.name || subId,
                        missingCount: (required as number) - scheduled
                    });
                }
            });
        });
        return missing;
    }, [classGroups, schedule.grid, subjects]);

    const handleGenerate = async () => {
        setIsGenerating(true);
        setResultMessage('Analisando restrições e calculando grade ótima...');
        setSuccess(null);

        // Dar tempo para UI atualizar
        setTimeout(() => {
            const start = performance.now();
            const result = generateSchedule(professors, classGroups, subjects);
            const end = performance.now();

            if (result.schedule) {
                setSchedule(result.schedule);
                setSuccess(true);
                setResultMessage(`Grade gerada com sucesso em ${(end - start).toFixed(2)}ms!`);
                setErrorDetails(null);
            } else {
                setSuccess(false);
                setResultMessage(result.error || 'Não foi possível gerar uma grade válida.');
                setErrorDetails(result.details || null);
            }
            setIsGenerating(false);
        }, 800); // Atraso artificial para mostrar animação
    };

    const handleClear = () => {
        if (confirm('Tem certeza? Isso apagará toda a grade atual.')) {
            setSchedule({ grid: {} });
            setSuccess(true);
            setResultMessage('Grade limpa com sucesso.');
        }
    };

    return (
        <div className="space-y-8">
            <div className="bg-gradient-to-r from-indigo-900 to-violet-900 p-8 rounded-3xl text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-12 opacity-10">
                    <Sparkles size={120} />
                </div>
                <div className="relative z-10">
                    <h2 className="text-3xl font-bold mb-2 flex items-center gap-3">
                        <Sparkles className="text-yellow-300" />
                        Gerador Automático
                    </h2>
                    <p className="text-indigo-200 text-lg max-w-xl">
                        Nossa inteligência artificial analisa a disponibilidade dos professores e a carga horária das turmas para criar a grade perfeita em segundos.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Controles */}
                <div className="glass-card p-8 space-y-6 flex flex-col h-full">
                    <h3 className="font-bold text-xl text-slate-800 border-b border-slate-100 pb-4">Painel de Controle</h3>

                    <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                            <p className="text-2xl font-bold text-slate-800">{professors.length}</p>
                            <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Profs</p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                            <p className="text-2xl font-bold text-slate-800">{classGroups.length}</p>
                            <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Turmas</p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                            <p className="text-2xl font-bold text-slate-800">{subjects.length}</p>
                            <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Matérias</p>
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col justify-center gap-4">
                        <button
                            onClick={handleGenerate}
                            disabled={isGenerating}
                            className="group relative w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white py-4 rounded-2xl font-bold text-xl hover:shadow-xl hover:shadow-indigo-500/30 disabled:opacity-80 disabled:cursor-wait transition-all overflow-hidden"
                        >
                            {isGenerating && (
                                <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                            )}
                            <span className="relative z-10 flex items-center justify-center gap-3">
                                {isGenerating ? 'Processando Inteligência...' : (
                                    <>
                                        <Play fill="currentColor" strokeWidth={0} /> Iniciar Geração
                                    </>
                                )}
                            </span>
                        </button>

                        <button
                            onClick={handleClear}
                            disabled={isGenerating}
                            className="w-full py-3 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                        >
                            <RotateCcw size={18} />
                            Reiniciar Grade
                        </button>
                    </div>

                    {resultMessage && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className={`p-4 rounded-2xl flex items-start gap-3 border transition-colors ${
                                isGenerating 
                                    ? 'bg-indigo-50 text-indigo-800 border-indigo-100/50' 
                                    : success 
                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-100' 
                                        : 'bg-red-50 text-red-800 border-red-100'
                            }`}
                        >
                            {isGenerating ? (
                                <Sparkles className="shrink-0 mt-0.5 animate-spin" size={20} />
                            ) : success ? (
                                <CheckCircle className="shrink-0 mt-0.5" />
                            ) : (
                                <AlertOctagon className="shrink-0 mt-0.5" />
                            )}
                            <div>
                                <p className="font-bold text-lg">
                                    {isGenerating ? 'Processando...' : success ? 'Sucesso!' : 'Algo deu errado'}
                                </p>
                                <p className="text-sm opacity-90">{resultMessage}</p>
                                {!isGenerating && errorDetails && (
                                    <p className="mt-2 p-2 bg-red-100/50 rounded-lg text-xs font-medium border border-red-200/50">
                                        {errorDetails}
                                    </p>
                                )}
                            </div>
                        </motion.div>
                    )}
                </div>

                {/* Status / Conflitos */}
                <div className="glass-card p-0 overflow-hidden flex flex-col h-full">
                    <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                        <h3 className="font-bold text-xl text-slate-800 flex items-center gap-2">
                             Diagnóstico
                        </h3>
                        <div className="flex gap-2">
                            {conflicts.length > 0 && (
                                <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full font-bold text-xs shadow-sm flex items-center gap-1.5">
                                    <AlertTriangle size={12} fill="currentColor" />
                                    {conflicts.length} Conflitos
                                </span>
                            )}
                            {missingLessons.length > 0 && (
                                <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full font-bold text-xs shadow-sm flex items-center gap-1.5">
                                    <ListChecks size={12} />
                                    {missingLessons.length} Pendências
                                </span>
                            )}
                            {conflicts.length === 0 && missingLessons.length === 0 && (
                                <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full font-bold text-xs shadow-sm flex items-center gap-1.5">
                                    <CheckCircle size={12} fill="currentColor" />
                                    Grade 100% Válida
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 p-6 overflow-auto max-h-[600px] space-y-6">
                        {/* Seção de Conflitos Críticos */}
                        {conflicts.length > 0 && (
                            <div className="space-y-3">
                                <h4 className="text-xs font-black uppercase tracking-widest text-red-500 flex items-center gap-2 mb-4">
                                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                    Bloqueios Críticos
                                </h4>
                                {conflicts.map((c, i) => (
                                    <motion.div
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                        key={`conf-${i}`}
                                        className="flex gap-4 p-4 bg-red-50/30 border border-red-100 rounded-2xl shadow-sm text-sm"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                                            <AlertTriangle size={20} className="text-red-600" />
                                        </div>
                                        <div>
                                            <span className="font-bold text-slate-800 text-base block mb-0.5">
                                                {classGroups.find(g => g.id === c.classGroupId)?.name || 'Turma'}
                                            </span>
                                            <p className="text-slate-600 leading-relaxed">{c.description}</p>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}

                        {/* Seção de Aulas Faltantes */}
                        {missingLessons.length > 0 && (
                            <div className="space-y-3">
                                <h4 className="text-xs font-black uppercase tracking-widest text-amber-500 flex items-center gap-2 mb-4">
                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                    Aulas não agendadas
                                </h4>
                                {missingLessons.map((m, i) => (
                                    <motion.div
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                        key={`miss-${i}`}
                                        className="flex gap-4 p-3 bg-amber-50/30 border border-amber-100 rounded-xl text-sm"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                                            <ListChecks size={16} className="text-amber-600" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-center mb-0.5">
                                                <span className="font-bold text-slate-700">{m.className}</span>
                                                <span className="text-[10px] font-black bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">-{m.missingCount} Horas</span>
                                            </div>
                                            <p className="text-slate-500 text-xs">{m.subjectName}</p>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}

                        {conflicts.length === 0 && missingLessons.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-4 py-12">
                                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center">
                                    <CheckCircle size={40} className="text-slate-300" />
                                </div>
                                <div className="text-center">
                                    <p className="font-bold text-slate-400">Excelente!</p>
                                    <p className="text-sm">Nenhum conflito ou pendência.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
