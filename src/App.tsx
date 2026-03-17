import { useState, useEffect } from 'react';
import { type Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import { Layout } from './components/Layout';
import { ProfessorsPage } from './pages/ProfessorsPage';
import { GridView } from './pages/GridPage';
import { GeneratorPage } from './pages/GeneratorPage';
import { SetupPage } from './pages/SetupPage';
import { CurriculumPage } from './pages/CurriculumPage';
import { LoginPage } from './pages/LoginPage';
import { useStore } from './store';
import { Loader2 } from 'lucide-react';

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const { subjects, addSubject, fetchInitialData, isLoading } = useStore();
  const [newSubject, setNewSubject] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsInitializing(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
       fetchInitialData();
    }
  }, [fetchInitialData, session]);

  const handleAddSubject = () => {
    if (newSubject) {
      addSubject(newSubject);
      setNewSubject('');
    }
  };

  if (isInitializing) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-900 text-slate-300">
        <Loader2 className="animate-spin mb-4 text-indigo-500" size={48} />
        <p className="font-medium animate-pulse">Verificando sessão...</p>
      </div>
    );
  }

  if (!session) {
    return <LoginPage />;
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50 text-slate-500">
        <Loader2 className="animate-spin mb-4" size={48} />
        <p className="font-medium">Carregando dados da nuvem...</p>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <GridView />;
      case 'professors':
        return <ProfessorsPage />;
      case 'subjects':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800">Disciplinas</h2>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="font-semibold mb-4">Adicionar Nova Disciplina</h3>
              <div className="flex gap-4">
                <input
                  value={newSubject}
                  onChange={e => setNewSubject(e.target.value)}
                  className="flex-1 border p-2 rounded-lg"
                  placeholder="Nome da Disciplina (Ex: Matemática)"
                />
                <button onClick={handleAddSubject} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">Adicionar</button>
              </div>
              <div className="mt-8 flex flex-wrap gap-2">
                {subjects.map(s => (
                  <div key={s.id} className="bg-slate-100 px-4 py-2 rounded-lg text-slate-700 font-medium border border-slate-200">
                    {s.name}
                  </div>
                ))}
                {subjects.length === 0 && <p className="text-slate-400">Nenhuma disciplina cadastrada.</p>}
              </div>
            </div>
          </div>
        );
      case 'classes':
        return <div className="p-12 text-center text-slate-400">Gerenciamento de Turmas (Use o Dashboard para criar e visualizar)</div>;
      case 'generate':
        return <GeneratorPage />;
      case 'curriculum':
        return <CurriculumPage />;
      case 'setup':
        return <SetupPage />;
      default:
        return <div className="p-12 text-center text-slate-400">Em desenvolvimento...</div>;
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderContent()}
    </Layout>
  );
}

export default App;
