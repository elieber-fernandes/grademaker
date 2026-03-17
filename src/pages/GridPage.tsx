import { useState, useEffect } from 'react';
import { useStore } from '../store';
import { ScheduleSlot } from '../components/ScheduleSlot';
import { DndContext, type DragEndEvent } from '@dnd-kit/core';
import { ChevronDown, Printer, FileDown, Plus, School, LayoutGrid, Calendar, Filter } from 'lucide-react';
import { DAYS, DAYS_SHORT, PERIODS, PERIOD_END_TIMES, NUM_PERIODS } from '../constants';

// Extrai o segmento do nome da turma (ex: '6º Ano A' -> '6º Ano')
const getSegment = (name: string) => {
    const lastSpace = name.lastIndexOf(' ');
    if (lastSpace > 0 && name.length - lastSpace <= 3) {
        return name.substring(0, lastSpace).trim();
    }
    return name;
};

type ViewMode = 'class' | 'day';

export const GridView = () => {
    const { classGroups, schedule, subjects, professors, addClassGroup } = useStore();
    const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
    const [selectedDay, setSelectedDay] = useState<number>(0);
    const [viewMode, setViewMode] = useState<ViewMode>('class');
    const [newClassName, setNewClassName] = useState('');
    const [selectedSegment, setSelectedSegment] = useState<string>('Todos');
    const [selectedShift, setSelectedShift] = useState<'M' | 'V'>('M');

    // Obter turma selecionada
    const currentClass = classGroups.find(c => c.id === selectedClassId);

    // No modo "Turma", forçamos o turno visualizado a ser o turno da turma selecionada
    const activeShift = viewMode === 'class' ? (currentClass?.shift || 'M') : selectedShift;

    // Turmas filtradas pelo segmento E turno selecionado (para visão por dia)
    const filteredClassGroups = classGroups.filter(c => {
        const matchesSegment = selectedSegment === 'Todos' || getSegment(c.name) === selectedSegment;
        const matchesShift = c.shift === activeShift;
        return matchesSegment && matchesShift;
    });

    // Segmentos únicos
    const segments = ['Todos', ...Array.from(new Set(classGroups.map(c => getSegment(c.name))))];

    const handleCreateClass = () => {
        if (newClassName) {
            addClassGroup(newClassName);
            setNewClassName('');
        }
    };

    // Inicializar seleção
    useEffect(() => {
        if (!selectedClassId && classGroups.length > 0) {
            setSelectedClassId(classGroups[0].id);
        }
    }, [selectedClassId, classGroups]);

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

            const dayName = DAYS[parseInt(parts[1])];
            const periodIdx = parseInt(parts[2]);
            const shift = periodIdx < NUM_PERIODS['M'] ? 'M' : 'V';
            const relativeIdx = shift === 'M' ? periodIdx : periodIdx - NUM_PERIODS['M'];
            const periodName = PERIODS[shift][relativeIdx];
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

    const currentNumPeriods = NUM_PERIODS[activeShift];
    const startIndex = activeShift === 'M' ? 0 : NUM_PERIODS['M'];
    const periods = Array.from({ length: currentNumPeriods }, (_, i) => startIndex + i);

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

                <div className="flex items-center gap-3 flex-wrap">
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

                    <div className="h-8 w-px bg-slate-200 mx-1"></div>

                    {/* Filtro de Turno */}
                    <div className="flex bg-slate-100 rounded-xl p-1 border border-slate-200">
                        <button
                            onClick={() => setSelectedShift('M')}
                            className={`px-3 py-2 rounded-lg text-sm font-bold transition-all ${
                                selectedShift === 'M'
                                    ? 'bg-white text-orange-500 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            Manhã
                        </button>
                        <button
                            onClick={() => setSelectedShift('V')}
                            className={`px-3 py-2 rounded-lg text-sm font-bold transition-all ${
                                selectedShift === 'V'
                                    ? 'bg-white text-indigo-500 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            Tarde
                        </button>
                    </div>

                    <div className="hidden md:block h-8 w-px bg-slate-200"></div>

                    {/* Toggle de Visualização */}
                    <div className="flex bg-slate-100 rounded-xl p-1 border border-slate-200">
                        <button
                            onClick={() => setViewMode('class')}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold transition-all ${
                                viewMode === 'class'
                                    ? 'bg-white text-indigo-600 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                            }`}
                            title="Visão por Turma"
                        >
                            <LayoutGrid size={16} />
                            Turma
                        </button>
                        <button
                            onClick={() => setViewMode('day')}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold transition-all ${
                                viewMode === 'day'
                                    ? 'bg-white text-indigo-600 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                            }`}
                            title="Visão por Dia"
                        >
                            <Calendar size={16} />
                            Dia
                        </button>
                    </div>

                    <div className="h-8 w-px bg-slate-200 mx-1"></div>

                    {/* Seletor de Turma (visão por turma) ou Dia (visão por dia) */}
                    <div className="flex flex-wrap gap-2 md:gap-4 items-center bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm w-full md:w-auto">
                        {viewMode === 'class' ? (
                            <div className="relative group flex-1 min-w-[150px]">
                                <select
                                    aria-label="Selecionar Turma"
                                    className="appearance-none bg-transparent pl-4 pr-10 py-2.5 rounded-xl font-bold text-slate-700 outline-none cursor-pointer hover:bg-slate-50 transition-colors w-full md:w-48"
                                    value={selectedClassId || ''}
                                    onChange={(e) => setSelectedClassId(e.target.value)}
                                >
                                    {classGroups.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-indigo-500 transition-colors" size={16} />
                            </div>
                        ) : (
                            <>
                                <div className="relative group flex-1 min-w-[120px]">
                                    <select
                                        aria-label="Selecionar Dia"
                                        className="appearance-none bg-transparent pl-4 pr-10 py-2.5 rounded-xl font-bold text-slate-700 outline-none cursor-pointer hover:bg-slate-50 transition-colors w-full md:w-40"
                                        value={selectedDay}
                                        onChange={(e) => setSelectedDay(parseInt(e.target.value))}
                                    >
                                        {DAYS.map((day, i) => (
                                            <option key={i} value={i}>{day}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-indigo-500 transition-colors" size={16} />
                                </div>

                                <div className="hidden md:block h-8 w-px bg-slate-200"></div>

                                <div className="relative group flex items-center gap-1.5 flex-1 min-w-[130px]">
                                    <Filter size={14} className="text-slate-400 hidden sm:block" />
                                    <select
                                        aria-label="Filtrar Segmento"
                                        className="appearance-none bg-transparent pl-2 pr-8 py-2.5 rounded-xl font-bold text-slate-700 outline-none cursor-pointer hover:bg-slate-50 transition-colors w-full md:w-36 text-sm"
                                        value={selectedSegment}
                                        onChange={(e) => setSelectedSegment(e.target.value)}
                                    >
                                        {segments.map(seg => (
                                            <option key={seg} value={seg}>{seg}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                                </div>
                            </>
                        )}

                        <div className="hidden md:block h-8 w-px bg-slate-200"></div>

                        <div className="flex gap-2 pr-1.5 w-full md:w-auto mt-2 md:mt-0">
                            <input
                                value={newClassName}
                                onChange={e => setNewClassName(e.target.value)}
                                className="flex-1 md:w-32 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-200 p-2 rounded-lg text-sm text-center outline-none transition-all border"
                                placeholder="Nova Turma..."
                            />
                            <button
                                onClick={handleCreateClass}
                                className="bg-slate-800 text-white p-2 rounded-lg hover:bg-black transition-colors shrink-0"
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
                {viewMode === 'class' ? (
                    /* ===== VISÃO POR TURMA ===== */
                    <div className="glass-card p-4 md:p-8 min-h-[600px] print:shadow-none print:border-none overflow-x-auto">
                        <div className="hidden print:block text-center mb-8">
                            <h1 className="text-2xl font-bold text-black">{currentClass?.name} - Grade Horária</h1>
                        </div>

                        <div className="min-w-[800px] grid grid-cols-[80px_1fr_1fr_1fr_1fr_1fr] gap-6 print:gap-2">
                            {/* Linha de Cabeçalho */}
                            <div className="col-start-2 col-span-5 grid grid-cols-5 gap-6 mb-2 print:gap-2">
                                {DAYS.map(day => (
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
                                        <span className="font-bold text-slate-700 text-lg print:text-black">{PERIODS[activeShift][period - startIndex]}</span>
                                        <span className="text-xs text-slate-400 font-medium print:text-gray-600">até {PERIOD_END_TIMES[activeShift][period - startIndex]}</span>
                                    </div>

                                    {/* Dias para este período */}
                                    {DAYS.map((_, dayIndex) => {
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
                ) : (
                    /* ===== VISÃO POR DIA ===== */
                    <div className="glass-card p-6 min-h-[600px] print:shadow-none print:border-none overflow-x-auto">
                        <div className="hidden print:block text-center mb-8">
                            <h1 className="text-2xl font-bold text-black">{DAYS[selectedDay]} - Grade Horária</h1>
                        </div>

                        <table className="w-full border-collapse text-sm">
                            <thead>
                                <tr>
                                    <th className="py-3 px-2 text-left font-bold text-slate-500 uppercase tracking-wider text-xs border-b-2 border-slate-200 sticky left-0 bg-white/80 backdrop-blur-sm z-10 w-16">
                                        {DAYS_SHORT[selectedDay]}
                                    </th>
                                    {filteredClassGroups.map(cls => (
                                        <th key={cls.id} className="py-3 px-2 text-center font-bold text-slate-700 text-xs uppercase tracking-wider border-b-2 border-slate-200 min-w-[80px]">
                                            {cls.name}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {periods.map((period) => (
                                    <tr key={period} className="hover:bg-indigo-50/30 transition-colors">
                                        <td className="py-3 px-2 font-bold text-slate-600 border-b border-slate-100 sticky left-0 bg-white/80 backdrop-blur-sm z-10">
                                            <div className="flex flex-col">
                                                <span className="text-sm">{PERIODS[activeShift][period - startIndex]}</span>
                                            </div>
                                        </td>
                                        {filteredClassGroups.map(cls => {
                                            const slotId = `${cls.id}:::${selectedDay}:::${period}`;
                                            const lesson = schedule.grid[slotId];
                                            const subject = lesson ? subjects.find(s => s.id === lesson.subjectId) : undefined;
                                            const professor = lesson ? professors.find(p => p.id === lesson.professorId) : undefined;

                                            return (
                                                <td key={cls.id} className="py-2 px-1.5 border-b border-slate-100 text-center">
                                                    {lesson ? (
                                                        <div
                                                            className="bg-gradient-to-br from-white to-indigo-50 rounded-xl px-2 py-2 border border-indigo-100/60 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-default"
                                                            title={`${subject?.name || '?'} - ${professor?.name || '?'}`}
                                                        >
                                                            <span className="font-bold text-slate-800 text-xs block truncate">
                                                                {subject?.name || '?'}
                                                            </span>
                                                            <span className="text-[10px] text-slate-400 block truncate">
                                                                {professor?.name?.split(' ').slice(0, 2).join(' ') || '-'}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <div className="text-slate-300 text-xs py-2">—</div>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </DndContext>
        </div>
    );
};
