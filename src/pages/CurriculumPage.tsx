import { useState } from 'react';
import { useStore } from '../store';
import { Minus, Plus, GraduationCap, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const CurriculumPage = () => {
    const { classGroups, subjects, updateClassSubjectConfig } = useStore();
    const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

    // Initialize selection
    if (!selectedClassId && classGroups.length > 0) {
        setSelectedClassId(classGroups[0].id);
    }

    const currentClass = classGroups.find(c => c.id === selectedClassId);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/50 backdrop-blur-sm p-6 rounded-3xl border border-white/60 shadow-sm">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Matriz Curricular</h2>
                    <p className="text-slate-500 font-medium">Defina a carga horária de cada turma</p>
                </div>

                <div className="bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-2">
                    <GraduationCap className="text-indigo-500 ml-3" size={20} />
                    <select
                        value={selectedClassId || ''}
                        onChange={(e) => setSelectedClassId(e.target.value)}
                        className="bg-transparent py-2.5 pr-8 pl-2 font-bold text-slate-700 outline-none cursor-pointer hover:bg-slate-50 rounded-xl transition-colors min-w-[200px]"
                    >
                        {classGroups.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>
            </div>

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
                                    className={`glass-card p-6 flex items-center justify-between border-2 transition-all group ${count > 0 ? 'border-indigo-500/20 bg-indigo-50/10' : 'border-transparent'
                                        }`}
                                >
                                    <div className="flex items-center gap-4">
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

                                    <div className="flex items-center gap-3 bg-white rounded-xl p-1 shadow-sm border border-slate-100">
                                        <button
                                            onClick={() => currentClass && updateClassSubjectConfig(currentClass.id, subject.id, Math.max(0, count - 1))}
                                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-indigo-600 transition-colors"
                                            disabled={count === 0}
                                        >
                                            <Minus size={16} />
                                        </button>

                                        <span className={`w-6 text-center font-bold ${count > 0 ? 'text-indigo-600' : 'text-slate-300'}`}>
                                            {count}
                                        </span>

                                        <button
                                            onClick={() => currentClass && updateClassSubjectConfig(currentClass.id, subject.id, count + 1)}
                                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-indigo-600 transition-colors"
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
