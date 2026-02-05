import { useState } from 'react';
import { useStore } from '../store';
import { Upload, CheckCircle, Database } from 'lucide-react';
import { motion } from 'framer-motion';

export const SetupPage = () => {
    const { importLinkedData } = useStore();
    const [step, setStep] = useState<'input' | 'success'>('input');

    // Inputs
    const [excelText, setExcelText] = useState('');
    const [classesText, setClassesText] = useState('');

    const handleImport = () => {
        // Parse Excel Text (Professor \t Subject)
        const pairs: { professorName: string, subjectName: string }[] = [];
        const lines = excelText.split('\n');

        lines.forEach(line => {
            const parts = line.split('\t'); // Excel copy uses tabs
            if (parts.length >= 2) {
                const prof = parts[0].trim();
                const sub = parts[1].trim();
                if (prof && sub) {
                    pairs.push({ professorName: prof, subjectName: sub });
                }
            } else if (line.includes(',') || line.includes(';')) {
                // Fallback for CSV
                const sep = line.includes(';') ? ';' : ',';
                const partsCsv = line.split(sep);
                if (partsCsv.length >= 2) {
                    const prof = partsCsv[0].trim();
                    const sub = partsCsv[1].trim();
                    if (prof && sub) {
                        pairs.push({ professorName: prof, subjectName: sub });
                    }
                }
            }
        });

        // Parse Classes
        const classes = classesText.split('\n').map(s => s.trim()).filter(s => s.length > 0);

        if (pairs.length === 0 && classes.length === 0) {
            alert('Nenhum dado válido encontrado. Certifique-se de copiar duas colunas (Professor e Disciplina) do Excel.');
            return;
        }

        importLinkedData(pairs, classes);
        setStep('success');
    };

    const handleReset = () => {
        setExcelText('');
        setClassesText('');
        setStep('input');
    };

    if (step === 'success') {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-card p-12 max-w-2xl mx-auto text-center"
            >
                <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="text-emerald-600" size={48} />
                </div>
                <h2 className="text-3xl font-bold text-slate-800 mb-2">Importação Inteligente Concluída!</h2>
                <p className="text-slate-500 mb-8">
                    Seus professores foram criados e já vinculados às disciplinas.
                </p>
                <button
                    onClick={handleReset}
                    className="bg-slate-800 text-white px-8 py-3 rounded-xl font-bold hover:bg-black transition-colors"
                >
                    Fazer nova importação
                </button>
            </motion.div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-800 p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
                <div className="relative z-10">
                    <h2 className="text-3xl font-bold mb-2 flex items-center gap-3">
                        <Upload className="text-emerald-200" />
                        Importação Inteligente (Excel)
                    </h2>
                    <p className="text-emerald-100 text-lg">
                        Copie suas planilhas e cole aqui. O sistema entenderá os vínculos automaticamente.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Excel Paste Area */}
                <div className="md:col-span-2 glass-card p-6 flex flex-col h-full">
                    <div className="flex items-center justify-between mb-4 border-b border-emerald-100 pb-2">
                        <div className="flex items-center gap-2 text-emerald-700 font-bold text-lg">
                            <Database size={20} /> Professores e Disciplinas
                        </div>
                        <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-medium">Copie do Excel</span>
                    </div>

                    <div className="bg-emerald-50/50 p-4 rounded-xl mb-4 text-sm text-emerald-800 border border-emerald-100">
                        <p className="font-bold mb-1">Como usar:</p>
                        <ul className="list-disc list-inside space-y-1 opacity-80">
                            <li>Abra sua planilha (Excel ou Google Sheets).</li>
                            <li>Selecione duas colunas: <strong>Professor</strong> (Esq) e <strong>Disciplina</strong> (Dir).</li>
                            <li>Copie (Ctrl+C) e cole na área abaixo.</li>
                        </ul>
                    </div>

                    <textarea
                        className="flex-1 w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm focus:ring-2 focus:ring-emerald-500 outline-none resize-none min-h-[400px] font-mono whitespace-pre"
                        placeholder={`João Silva\tMatemática\nMaria Oliveira\tPortuguês\nPedro Santos\tHistória\nJoão Silva\tFísica`}
                        value={excelText}
                        onChange={e => setExcelText(e.target.value)}
                    />
                    <p className="text-xs text-slate-400 mt-2 text-right">Suporta delimitadores Tab (Excel), Vírgula e Ponto e vírgula.</p>
                </div>

                {/* Classes Column */}
                <div className="glass-card p-6 flex flex-col h-full">
                    <div className="flex items-center gap-2 mb-4 text-indigo-600 font-bold text-lg border-b border-indigo-100 pb-2">
                        <Database size={20} /> Turmas
                    </div>
                    <p className="text-xs text-slate-400 mb-2">Uma por linha. Copie a coluna de turmas da sua planilha.</p>
                    <textarea
                        className="flex-1 w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none min-h-[400px]"
                        placeholder={`1º Ano A\n1º Ano B\n2º Ano A...`}
                        value={classesText}
                        onChange={e => setClassesText(e.target.value)}
                    />
                </div>
            </div>

            <div className="flex justify-end">
                <button
                    onClick={handleImport}
                    className="bg-emerald-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-emerald-700 shadow-xl shadow-emerald-200 transition-all hover:-translate-y-1 flex items-center gap-2"
                >
                    <Upload /> Processar Importação
                </button>
            </div>
        </div>
    );
};
