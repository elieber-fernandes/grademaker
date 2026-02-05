import { type ReactNode, useState } from 'react';
import { Calendar, Users, BookOpen, GraduationCap, Menu, Sparkles, LogOut, Upload, Library } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface LayoutProps {
    children: ReactNode;
    activeTab: string;
    setActiveTab: (tab: string) => void;
}

export const Layout = ({ children, activeTab, setActiveTab }: LayoutProps) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: Calendar },
        { id: 'professors', label: 'Professores', icon: Users },
        { id: 'subjects', label: 'Disciplinas', icon: BookOpen },
        { id: 'classes', label: 'Turmas', icon: GraduationCap },
        { id: 'curriculum', label: 'Currículo', icon: Library },
        { id: 'generate', label: 'Gerar Grade', icon: Sparkles }, // Mudado para Sparkles para sensação de "Mágica"
        { id: 'setup', label: 'Importar', icon: Upload },
    ];

    return (
        <div className="flex h-screen overflow-hidden text-slate-800">
            {/* Barra Lateral */}
            <motion.aside
                initial={false}
                animate={{ width: isSidebarOpen ? 260 : 80 }}
                className="glass-sidebar h-full flex flex-col z-20 shadow-2xl relative text-slate-300"
            >
                <div className="p-6 flex items-center justify-between">
                    <AnimatePresence mode="wait">
                        {isSidebarOpen && (
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, width: 0 }}
                                className="flex items-center gap-2 overflow-hidden whitespace-nowrap"
                            >
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-indigo-500/30">
                                    T+
                                </div>
                                <span className="font-bold text-xl tracking-tight text-white">
                                    Timetable<span className="text-indigo-400">+</span>
                                </span>
                            </motion.div>
                        )}
                    </AnimatePresence>
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white"
                        aria-label="Toggle sidebar"
                        title="Toggle sidebar"
                    >
                        <Menu size={20} />
                    </button>
                </div>

                <nav className="flex-1 px-4 space-y-2 py-4">
                    {navItems.map((item) => {
                        const isActive = activeTab === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id)}
                                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-300 relative group overflow-hidden ${isActive
                                    ? 'text-white shadow-lg shadow-indigo-900/20'
                                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                                    }`}
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="activeTabBg"
                                        className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-xl z-0"
                                        initial={false}
                                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                    />
                                )}
                                <span className="relative z-10 flex items-center gap-3">
                                    <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-white' : 'group-hover:text-indigo-300 transition-colors'} />
                                    {isSidebarOpen && (
                                        <motion.span
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: 0.1 }}
                                            className="font-medium"
                                        >
                                            {item.label}
                                        </motion.span>
                                    )}
                                </span>
                            </button>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-white/5">
                    <button className={`w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors group ${!isSidebarOpen && 'justify-center'}`}>
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-sky-400 to-emerald-400 p-[2px]">
                            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User" className="w-full h-full rounded-full bg-slate-900" />
                        </div>
                        {isSidebarOpen && (
                            <div className="text-left flex-1 min-w-0">
                                <p className="text-sm font-semibold text-white truncate">Diretor Escolar</p>
                                <p className="text-xs text-slate-500 truncate">Sair do sistema</p>
                            </div>
                        )}
                        {isSidebarOpen && <LogOut size={16} className="text-slate-500 group-hover:text-red-400 transition-colors" />}
                    </button>
                </div>
            </motion.aside>

            {/* Conteúdo Principal */}
            <main className="flex-1 overflow-auto bg-transparent p-6 md:p-8 relative">
                <div className="max-w-7xl mx-auto space-y-8">
                    {/* Área de Cabeçalho definida nas páginas geralmente, mas podemos colocar um wrapper de animação comum */}
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        {children}
                    </motion.div>
                </div>
            </main>
        </div>
    );
};
