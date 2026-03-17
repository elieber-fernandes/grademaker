import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Lock, Mail, GraduationCap } from 'lucide-react';
import { motion } from 'framer-motion';

export const LoginPage = () => {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');

        try {
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (error) throw error;
                setMessage('Verifique seu email para confirmar o cadastro!');
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
            }
        } catch (err: any) {
            setError(err.message || 'Erro ao autenticar');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background decorations */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/20 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-violet-600/20 blur-[120px] rounded-full pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-3xl shadow-2xl relative z-10"
            >
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-violet-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-500/30">
                        <GraduationCap size={32} className="text-white" />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-white mb-2">GradeMaker</h1>
                    <p className="text-slate-400">Entre para gerenciar sua grade escolar</p>
                </div>

                <form onSubmit={handleAuth} className="space-y-5">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/50 text-red-200 text-sm p-3 rounded-lg text-center">
                            {error}
                        </div>
                    )}
                    {message && (
                        <div className="bg-emerald-500/10 border border-emerald-500/50 text-emerald-200 text-sm p-3 rounded-lg text-center">
                            {message}
                        </div>
                    )}

                    <div>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3.5 text-slate-400" size={20} />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Seu email"
                                required
                                className="w-full bg-slate-900/50 border border-slate-700 text-white placeholder:text-slate-500 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                            />
                        </div>
                    </div>

                    <div>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3.5 text-slate-400" size={20} />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Sua senha"
                                required
                                className="w-full bg-slate-900/50 border border-slate-700 text-white placeholder:text-slate-500 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-medium py-3 rounded-xl shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all flex justify-center items-center gap-2 group disabled:opacity-70"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : (isSignUp ? 'Criar Conta' : 'Entrar na Conta')}
                    </button>
                    
                    <div className="text-center mt-6">
                        <button
                            type="button"
                            onClick={() => setIsSignUp(!isSignUp)}
                            className="text-slate-400 hover:text-white text-sm transition-colors"
                        >
                            {isSignUp ? 'Já tem uma conta? Entre aqui' : 'Não tem conta? Crie uma'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};
