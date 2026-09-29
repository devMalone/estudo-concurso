import React from 'react';
import { Calendar, Moon, Sun, Clock, ShieldCheck, AlertCircle } from 'lucide-react';

interface NavbarProps {
  concurso: any;
  simulatedDate: string;
  setSimulatedDate: (d: string) => void;
  darkMode: boolean;
  setDarkMode: (v: boolean) => void;
  revisoesAtrasadasCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  concurso,
  simulatedDate,
  setSimulatedDate,
  darkMode,
  setDarkMode,
  revisoesAtrasadasCount
}) => {
  const formatPt = (dStr: string) => {
    if (!dStr) return '';
    const parts = dStr.split('-');
    if (parts.length !== 3) return dStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  return (
    <header className="h-16 border-b border-slate-200/90 dark:border-slate-800/90 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md sticky top-0 z-30 px-6 flex items-center justify-between transition-colors">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-bacen-950 border border-bacen-700/70 text-sky-400 flex items-center justify-center font-mono font-bold text-xs tracking-wider shadow-card">
            BCB
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-slate-100">
                BACEN 2013 • Técnico
              </span>
              <span className="text-[10px] font-mono font-semibold bg-bacen-50 text-bacen-800 dark:bg-bacen-950 dark:text-sky-300 px-2 py-0.5 rounded border border-bacen-200 dark:border-bacen-800">
                Área 1 – Suporte Téc-Adm
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Banca CESPE/Cebraspe • 120 Itens C/E + Redação Oficial
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        {/* Alerta de revisões atrasadas */}
        {revisoesAtrasadasCount > 0 && (
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 text-xs font-medium border border-rose-200 dark:border-rose-900">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{revisoesAtrasadasCount} atrasada{revisoesAtrasadasCount > 1 ? 's' : ''}</span>
          </div>
        )}

        {/* Data de hoje / simulável */}
        <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
          <Calendar className="w-3.5 h-3.5 text-slate-500" />
          <span className="font-medium">Data Atual:</span>
          <input
            type="date"
            value={simulatedDate}
            onChange={(e) => setSimulatedDate(e.target.value)}
            className="bg-transparent border-0 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
            title="Altere a data para simular a progressão das revisões no tempo"
          />
        </div>

        {/* Dark Mode Toggle */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={darkMode ? 'Ativar Modo Claro' : 'Ativar Modo Escuro'}
        >
          {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
};
