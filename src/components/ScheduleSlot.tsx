import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import type { Lesson, Subject, Professor } from '../types';
import { motion } from 'framer-motion';

interface ScheduleSlotProps {
    id: string; // "idTurma-dia-período"
    lesson?: Lesson;
    subject?: Subject;
    professor?: Professor;
    isOver?: boolean; // Propriedade da lógica de contexto do dnd-kit se quiséssemos elevá-la, mas useDroppable fornece isso
}

export const ScheduleSlot = ({ id, lesson, subject, professor }: ScheduleSlotProps) => {
    const { isOver, setNodeRef } = useDroppable({
        id: id,
    });

    return (
        <div
            ref={setNodeRef}
            className={cn(
                "relative h-28 w-full rounded-2xl transition-all duration-300 overflow-hidden",
                isOver ? "bg-indigo-50/80 ring-2 ring-indigo-400 scale-[1.02]" : "bg-white/40 border border-white/40 hover:bg-white/60",
                !lesson && "hover:shadow-inner"
            )}
        >
            {/* Decoração de fundo para slots vazios */}
            {!lesson && (
                <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <div className="text-slate-400 text-xs font-medium tracking-wider uppercase">Livre</div>
                </div>
            )}

            {lesson ? (
                <motion.div
                    layoutId={lesson.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="h-full w-full bg-gradient-to-br from-white to-indigo-50 rounded-2xl p-3 shadow-sm border border-indigo-100/50 flex flex-col justify-between cursor-grab active:cursor-grabbing group hover:shadow-indigo-200/50 hover:border-indigo-200 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden"
                >
                    {/* Faixa estética */}
                    <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 rounded-l-full" />

                    <div>
                        <p className="font-bold text-slate-800 text-sm leading-tight line-clamp-2" title={subject?.name}>
                            {subject?.name || 'Desconhecido'}
                        </p>
                        <div className="mt-1 flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div>
                            <p className="text-xs text-slate-500 font-medium truncate">{professor?.name || 'Sem Professor'}</p>
                        </div>
                    </div>

                    <div className="flex justify-end opacity-20 group-hover:opacity-100 transition-opacity">
                        <div className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                            Aula
                        </div>
                    </div>
                </motion.div>
            ) : null}
        </div>
    );
};
