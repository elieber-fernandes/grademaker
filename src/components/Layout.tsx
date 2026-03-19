import { type ReactNode, useState } from 'react';
import { Calendar, Users, BookOpen, Menu, Sparkles, LogOut, Library } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';

interface LayoutProps {
    children: ReactNode;
    activeTab: string;
    setActiveTab: (tab: string) => void;
}

export const Layout = ({ children, activeTab, setActiveTab }: LayoutProps) => {
    const [isDesktopExpanded, setIsDesktopExpanded] = useState(true);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: Calendar },
        { id: 'professors', label: 'Professores', icon: Users },
        { id: 'subjects', label: 'Disciplinas', icon: BookOpen },
        { id: 'curriculum', label: 'Currículo', icon: Library },
        { id: 'generate', label: 'Gerar Grade', icon: Sparkles },
    ];

    const NavLinks = ({ isExpanded, isMobile = false }: { isExpanded: boolean, isMobile?: boolean }) => (
        <nav className="flex-1 px-4 space-y-2 py-4 overflow-y-auto">
            {navItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                    <button
                        key={item.id}
                        onClick={() => {
                            setActiveTab(item.id);
                            if (isMobile) setIsMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-300 relative group overflow-hidden ${isActive
                            ? 'text-white shadow-lg shadow-indigo-900/20'
                            : 'text-slate-400 hover:bg-white/5 hover:text-white'
                            }`}
                    >
                        {isActive && (
                            <motion.div
                                layoutId={isMobile ? "activeTabBgMobile" : "activeTabBgDesktop"}
                                className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-xl z-0"
                                initial={false}
                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            />
                        )}
                        <span className="relative z-10 flex items-center gap-3">
                            <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-white' : 'group-hover:text-indigo-300 transition-colors'} />
                            {isExpanded && (
                                <span className="font-medium whitespace-nowrap">
                                    {item.label}
                                </span>
                            )}
                        </span>
                    </button>
                );
            })}
        </nav>
    );

    const UserProfile = ({ isExpanded }: { isExpanded: boolean }) => (
        <div className="p-4 border-t border-white/5">
            <button
                onClick={() => supabase.auth.signOut()}
                className={`w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors group ${!isExpanded && 'justify-center'}`}
                title="Sair do sistema"
            >
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-sky-400 to-emerald-400 p-[2px] shrink-0">
                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User" className="w-full h-full rounded-full bg-slate-900" />
                </div>
                {isExpanded && (
                    <div className="text-left flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">Diretor Escolar</p>
                        <p className="text-xs text-slate-500 truncate">Sair do sistema</p>
                    </div>
                )}
                {isExpanded && <LogOut size={16} className="text-slate-500 group-hover:text-red-400 transition-colors shrink-0" />}
            </button>
        </div>
    );

    return (
        <div className="flex flex-col md:flex-row h-screen overflow-hidden text-slate-800 bg-slate-50">
            {/* --- Mobile Topbar --- */}
            <div className="md:hidden glass-sidebar flex items-center justify-between p-4 z-30 shadow-md">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-indigo-500/30">
                        GM
                    </div>
                    <span className="font-bold text-lg tracking-tight text-white">
                        GradeMaker
                    </span>
                </div>
                <button
                    onClick={() => setIsMobileMenuOpen(true)}
                    className="p-2 text-slate-300 hover:text-white transition-colors rounded-lg hover:bg-white/10"
                    aria-label="Abrir Menu"
                    title="Abrir Menu"
                >
                    <Menu size={24} />
                </button>
            </div>

            {/* --- Mobile Sidebar Overlay --- */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden"
                        />
                        <motion.aside
                            initial={{ x: "-100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "-100%" }}
                            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                            className="fixed inset-y-0 left-0 w-[260px] glass-sidebar flex flex-col z-50 text-slate-300 shadow-2xl md:hidden"
                        >
                            <div className="p-6 flex items-center justify-between">
                                <span className="font-bold text-xl tracking-tight text-white">Menu</span>
                                <button
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="p-2 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white"
                                    title="Fechar Menu"
                                    aria-label="Fechar Menu"
                                >
                                    <Menu size={20} />
                                </button>
                            </div>
                            <NavLinks isExpanded={true} isMobile={true} />
                            <UserProfile isExpanded={true} />
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {/* --- Desktop Sidebar --- */}
            <motion.aside
                initial={false}
                animate={{ width: isDesktopExpanded ? 260 : 80 }}
                className="hidden md:flex glass-sidebar h-full flex-col z-20 shadow-2xl relative text-slate-300 transition-all duration-300 shrink-0"
            >
                <div className="p-6 flex items-center justify-between overflow-hidden">
                    <div className={`flex items-center gap-2 ${!isDesktopExpanded && 'justify-center w-full'}`}>
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-indigo-500/30 shrink-0">
                            GM
                        </div>
                        {isDesktopExpanded && (
                            <span className="font-bold text-xl tracking-tight text-white whitespace-nowrap">
                                GradeMaker
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex justify-end px-4 mb-2">
                    <button
                        onClick={() => setIsDesktopExpanded(!isDesktopExpanded)}
                        className={`p-1.5 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white ${!isDesktopExpanded && 'mx-auto'}`}
                        title={isDesktopExpanded ? "Recolher menu" : "Expandir menu"}
                    >
                        <Menu size={20} />
                    </button>
                </div>

                <NavLinks isExpanded={isDesktopExpanded} />
                <UserProfile isExpanded={isDesktopExpanded} />
            </motion.aside>

            {/* --- Main Content --- */}
            <main className="flex-1 overflow-auto bg-transparent p-4 md:p-6 lg:p-8 relative">
                <div className="max-w-7xl mx-auto space-y-8">
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
