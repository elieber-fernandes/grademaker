import { useState } from 'react';
import { useStore } from '../store';
import { ScheduleSlot } from '../components/ScheduleSlot';
import { DndContext, type DragEndEvent } from '@dnd-kit/core';
import { ChevronDown, Printer, FileDown, Plus, School } from 'lucide-react';

export const GridView = () => {
    const { classGroups, schedule, subjects, professors, addClassGroup } = useStore();
    const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
    const [newClassName, setNewClassName] = useState('');

    const handleCreateClass = () => {
        if (newClassName) {
            addClassGroup(newClassName);
            setNewClassName('');
        }
    };

    // Inicializar seleção
    if (!selectedClassId && classGroups.length > 0) {
        setSelectedClassId(classGroups[0].id);
    }

    const currentClass = classGroups.find(c => c.id === selectedClassId);

    const handleDragEnd = (event: DragEndEvent) => {
        console.log('Drag ended', event);
    };

    const handlePrint = () => {
        window.print();
    };

    const handleDownloadCSV = () => {
        let csvContent = "Dia,Periodo,Turma,Disciplina,Professor\n";

        Object.entries(schedule.grid).forEach(([key, lesson]) => {
            const parts = key.split(':::');
            if (parts.length < 3) return;

            const dayName = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'][parseInt(parts[1])];
            const periodName = `${parseInt(parts[2]) + 1}º Horário`;
            const className = classGroups.find(c => c.id === lesson.classGroupId)?.name || 'N/A';
            const subjectName = subjects.find(s => s.id === lesson.subjectId)?.name || 'N/A';
            const profName = professors.find(p => p.id === lesson.professorId)?.name || 'N/A';

            csvContent += `${dayName},${periodName},${className},${subjectName},${profName}\n`;
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'grade_horaria.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const days = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];
    const periods = [0, 1, 2, 3, 4];

    if (classGroups.length === 0) {
        return (
            <div className="glass-card min-h-[60vh] flex flex-col items-center justify-center p-12 text-center">
                <div className="bg-indigo-50 p-6 rounded-full mb-6">
                    <School size={48} className="text-indigo-500" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-2">Bem-vindo ao GradeMaker</h3>
                <p className="text-slate-500 max-w-md mb-8">Comece criando sua primeira turma para gerenciar a grade horária.</p>

                <div className="flex gap-2 w-full max-w-sm">
                    <input
                        value={newClassName}
                        onChange={e => setNewClassName(e.target.value)}
                        className="flex-1 bg-white border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                        placeholder="Nome da Turma (Ex: 1º Ano A)"
                    />
                    <button onClick={handleCreateClass} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all">
                        Criar
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/50 backdrop-blur-sm p-6 rounded-3xl border border-white/60 shadow-sm print:hidden">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Grade Horária</h2>
                    <p className="text-slate-500 font-medium">Visualize e exporte a grade final</p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleDownloadCSV}
                        className="bg-white hover:bg-slate-50 text-slate-600 px-4 py-2.5 rounded-xl font-bold transition-all border border-slate-200 shadow-sm flex items-center gap-2"
                        title="Baixar Planilha (.csv)"
                    >
                        <FileDown size={18} />
                        <span className="hidden md:inline">CSV</span>
                    </button>

                    <button
                        onClick={handlePrint}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-indigo-200 flex items-center gap-2"
                        title="Imprimir / Salvar PDF"
                    >
                        <Printer size={18} />
                        <span className="hidden md:inline">Imprimir</span>
                    </button>

                    <div className="h-8 w-px bg-slate-200 mx-2"></div>

                    <div className="flex gap-4 items-center bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm">
                        <div className="relative group">
                            <select
                                aria-label="Selecionar Turma"
                                className="appearance-none bg-transparent pl-4 pr-10 py-2.5 rounded-xl font-bold text-slate-700 outline-none cursor-pointer hover:bg-slate-50 transition-colors w-48"
                                value={selectedClassId || ''}
                                onChange={(e) => setSelectedClassId(e.target.value)}
                            >
                                {classGroups.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-indigo-500 transition-colors" size={16} />
                        </div>

                        <div className="h-8 w-px bg-slate-200"></div>

                        <div className="flex gap-2 pr-1.5">
                            <input
                                value={newClassName}
                                onChange={e => setNewClassName(e.target.value)}
                                className="w-32 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-200 p-2 rounded-lg text-sm text-center outline-none transition-all"
                                placeholder="Nova Turma..."
                            />
                            <button
                                onClick={handleCreateClass}
                                className="bg-slate-800 text-white p-2 rounded-lg hover:bg-black transition-colors"
                                title="Criar Nova Turma"
                                aria-label="Criar Nova Turma"
                            >
                                <Plus size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <DndContext onDragEnd={handleDragEnd}>
                <div className="glass-card p-8 min-h-[600px] print:shadow-none print:border-none">
                    <div className="hidden print:block text-center mb-8">
                        <h1 className="text-2xl font-bold text-black">{currentClass?.name} - Grade Horária</h1>
                    </div>

                    <div className="grid grid-cols-[80px_1fr_1fr_1fr_1fr_1fr] gap-6 print:gap-2">

                        {/* Linha de Cabeçalho */}
                        <div className="col-start-2 col-span-5 grid grid-cols-5 gap-6 mb-2 print:gap-2">
                            {days.map(day => (
                                <div key={day} className="text-center">
                                    <span className="block font-bold text-slate-800 uppercase tracking-wider text-sm print:text-black">{day}</span>
                                    <div className="h-1 w-8 bg-indigo-500/20 rounded-full mx-auto mt-2 print:hidden"></div>
                                </div>
                            ))}
                        </div>

                        {/* Conteúdo da Grade */}
                        {periods.map((period) => (
                            <div key={period} className="contents group">
                                {/* Coluna de Horário */}
                                <div className="flex flex-col items-end justify-center py-2 pr-4 text-right">
                                    <span className="font-bold text-slate-700 text-lg print:text-black">{`${7 + period}:30`}</span>
                                    <span className="text-xs text-slate-400 font-medium print:text-gray-600">até {`${8 + period}:20`}</span>
                                </div>

                                {/* Dias para este período */}
                                {days.map((_, dayIndex) => {
                                    const slotId = `${currentClass?.id}:::${dayIndex}:::${period}`;
                                    const lesson = schedule.grid[slotId];
                                    const subject = lesson ? subjects.find(s => s.id === lesson.subjectId) : undefined;
                                    const professor = lesson ? professors.find(p => p.id === lesson.professorId) : undefined;

                                    return (
                                        <ScheduleSlot
                                            key={`${dayIndex}-${period}`}
                                            id={slotId}
                                            lesson={lesson}
                                            subject={subject}
                                            professor={professor}
                                        />
                                    );
                                })}
                            </div>
                        ))}

                    </div>
                </div>
            </DndContext>
        </div>
    );
};
