import { useState, Fragment } from 'react';
import { useStore } from '../store';
import { Plus, Trash2, Clock, User, Book, Users, X, Check, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { NUM_PERIODS, PERIODS } from '../constants';

export const ProfessorsPage = () => {
    const { professors, subjects, addProfessor, updateProfessorAvailability } = useStore();
    const [isAdding, setIsAdding] = useState(false);
    const [editingProfId, setEditingProfId] = useState<string | null>(null);
    const [tempAvailability, setTempAvailability] = useState<boolean[][]>([]);
    const [newByName, setNewByName] = useState('');
    const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);

    const handleAdd = () => {
        if (newByName && selectedSubjectIds.length > 0) {
            addProfessor(newByName, selectedSubjectIds);
            setNewByName('');
            setSelectedSubjectIds([]);
            setIsAdding(false);
        }
    };

    const toggleSubject = (id: string) => {
        if (selectedSubjectIds.includes(id)) {
            setSelectedSubjectIds(selectedSubjectIds.filter(s => s !== id));
        } else {
            setSelectedSubjectIds([...selectedSubjectIds, id]);
        }
    };

    const openAvailabilityEditor = (prof: { id: string, availability: boolean[][] }) => {
        // Deep copy da disponibilidade para edição
        setTempAvailability(prof.availability.map(day => [...day]));
        setEditingProfId(prof.id);
    };

    const toggleAvailabilitySlot = (dayIndex: number, periodIndex: number) => {
        const newAvailability = tempAvailability.map((day, dIdx) =>
            day.map((slot, pIdx) => {
                if (dIdx === dayIndex && pIdx === periodIndex) {
                    return !slot;
                }
                return slot;
            })
        );
        setTempAvailability(newAvailability);
    };

    const saveAvailability = () => {
        if (editingProfId) {
            updateProfessorAvailability(editingProfId, tempAvailability);
            setEditingProfId(null);
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center bg-white/50 backdrop-blur-sm p-6 rounded-3xl border border-white/60 shadow-sm">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Corpo Docente</h2>
                    <p className="text-slate-500 font-medium">Gestão de professores e suas disciplinas</p>
                </div>
                <button
                    onClick={() => setIsAdding(true)}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 hover:-translate-y-0.5 active:translate-y-0"
                >
                    <Plus size={20} strokeWidth={2.5} />
                    Novo Professor
                </button>
            </div>

            <AnimatePresence>
                {isAdding && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="glass-card p-8 mb-8 border-l-4 border-l-indigo-500">
                            <h3 className="font-bold text-xl mb-6 flex items-center gap-2 text-indigo-900">
                                <User className="text-indigo-500" />
                                Cadastrar Professor
                            </h3>

                            <div className="grid gap-6 max-w-2xl">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Nome Completo</label>
                                    <input
                                        value={newByName}
                                        onChange={(e) => setNewByName(e.target.value)}
                                        className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow font-medium"
                                        placeholder="Ex: Carlos Silva"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-3">Disciplinas Habilitadas</label>
                                    <div className="flex flex-wrap gap-2">
                                        {subjects.map(subject => (
                                            <button
                                                key={subject.id}
                                                onClick={() => toggleSubject(subject.id)}
                                                className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${selectedSubjectIds.includes(subject.id)
                                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200'
                                                    : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600'
                                                    }`}
                                            >
                                                {subject.name}
                                            </button>
                                        ))}
                                        {subjects.length === 0 && (
                                            <p className="text-sm text-amber-600 bg-amber-50 px-3 py-1 rounded-lg">
                                                Cadastre disciplinas na aba "Disciplinas" primeiro.
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
                                    <button
                                        onClick={() => setIsAdding(false)}
                                        className="px-6 py-2.5 text-slate-500 hover:text-slate-800 font-medium transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleAdd}
                                        disabled={!newByName || selectedSubjectIds.length === 0}
                                        className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:grayscale transition-all"
                                    >
                                        Salvar Cadastro
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {professors.map((prof, index) => (
                    <motion.div
                        key={prof.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="glass-card p-6 group relative overflow-hidden"
                    >
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-400 to-violet-400 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                        <div className="flex justify-between items-start mb-4">
                            <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xl shadow-inner">
                                {prof.name.charAt(0)}
                            </div>
                            <button
                                title="Excluir professor"
                                aria-label="Excluir professor"
                                className="text-slate-300 hover:text-red-500 transition-colors bg-white p-2 rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>

                        <h3 className="font-bold text-slate-800 text-xl mb-1">{prof.name}</h3>

                        <div className="flex flex-wrap gap-1.5 mb-6 min-h-[30px]">
                            {prof.subjects.map(sId => {
                                const sub = subjects.find(s => s.id === sId);
                                return sub ? (
                                    <span key={sId} className="text-[11px] font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md border border-slate-200 flex items-center gap-1">
                                        <Book size={10} className="text-indigo-400" />
                                        {sub.name}
                                    </span>
                                ) : null;
                            })}
                        </div>

                        <button
                            onClick={() => openAvailabilityEditor(prof)}
                            className="w-full py-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-indigo-600 flex items-center justify-center gap-2 transition-colors"
                        >
                            <Clock size={16} />
                            Editar Disponibilidade
                        </button>
                    </motion.div>
                ))}

                {professors.length === 0 && !isAdding && (
                    <div className="col-span-full py-20 text-center">
                        <div className="bg-white/50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-white">
                            <Users size={32} className="text-slate-300" />
                        </div>
                        <p className="text-slate-400 font-medium">Nenhum professor cadastrado ainda.</p>
                        <button onClick={() => setIsAdding(true)} className="text-indigo-500 hover:underline font-bold mt-2">Clique aqui para começar</button>
                    </div>
                )}
            </div>

            {/* Modal de Disponibilidade */}
            <AnimatePresence>
                {editingProfId && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
                        onClick={() => setEditingProfId(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <div>
                                    <h3 className="font-bold text-xl text-slate-800 flex items-center gap-2">
                                        <Calendar className="text-indigo-500" />
                                        Disponibilidade Semanal
                                    </h3>
                                    <p className="text-sm text-slate-500">
                                        Clique nos horários para marcar como disponível/indisponível
                                    </p>
                                </div>
                                <button
                                    onClick={() => setEditingProfId(null)}
                                    title="Fechar"
                                    aria-label="Fechar modal de disponibilidade"
                                    className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-4 md:p-8 overflow-y-auto">
                                <div className="min-w-[400px]">
                                    <div className="grid grid-cols-[auto_repeat(5,1fr)] gap-1 md:gap-2 mb-2">
                                    <div className="p-2"></div>
                                    {['Seg', 'Ter', 'Qua', 'Qui', 'Sex'].map(day => (
                                        <div key={day} className="text-center font-bold text-slate-600 text-sm p-2 uppercase tracking-wider">
                                            {day}
                                        </div>
                                    ))}

                                    {Array(NUM_PERIODS).fill(0).map((_, periodIndex) => (
                                        <Fragment key={periodIndex}>
                                            <div className="flex items-center justify-end pr-4 text-xs font-bold text-slate-400">
                                                {PERIODS[periodIndex]}
                                            </div>
                                            {tempAvailability.map((daySlots, dayIndex) => (
                                                <button
                                                    key={`${dayIndex}-${periodIndex}`}
                                                    onClick={() => toggleAvailabilitySlot(dayIndex, periodIndex)}
                                                    title={`Alternar ${['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'][dayIndex]} - ${periodIndex + 1}º Horário`}
                                                    aria-label={`Alternar disponibilidade para ${['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'][dayIndex]}, ${periodIndex + 1}º Horário`}
                                                    className={`
                                                        aspect-video rounded-lg transition-all border-2 flex items-center justify-center
                                                        ${daySlots[periodIndex]
                                                            ? 'bg-indigo-100 border-indigo-200 text-indigo-600 hover:bg-indigo-200'
                                                            : 'bg-slate-50 border-slate-100 text-slate-300 hover:bg-slate-100 hover:border-slate-200'
                                                        }
                                                    `}
                                                >
                                                    {daySlots[periodIndex] ? <Check size={20} strokeWidth={3} /> : <X size={16} />}
                                                </button>
                                            ))}
                                        </Fragment>
                                    ))}
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 md:mt-8 pt-6 border-t border-slate-100">
                                    <div className="flex gap-4 text-sm">
                                        <div className="flex items-center gap-2 text-indigo-600 font-bold">
                                            <div className="w-4 h-4 rounded bg-indigo-100 border border-indigo-200 flex items-center justify-center">
                                                <Check size={10} />
                                            </div>
                                            Disponível
                                        </div>
                                        <div className="flex items-center gap-2 text-slate-400 font-medium">
                                            <div className="w-4 h-4 rounded bg-slate-50 border border-slate-100 flex items-center justify-center">
                                                <X size={10} />
                                            </div>
                                            Indisponível
                                        </div>
                                    </div>

                                    <div className="flex gap-2 w-full sm:w-auto">
                                        <button
                                            onClick={() => setEditingProfId(null)}
                                            className="flex-1 sm:flex-none px-4 md:px-5 py-2.5 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            onClick={saveAvailability}
                                            className="flex-1 sm:flex-none px-4 md:px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 hover:-translate-y-0.5 transition-all text-sm md:text-base"
                                        >
                                            Salvar Alterações
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
