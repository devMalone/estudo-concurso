import React from 'react';
import {
  LayoutDashboard,
  GitFork,
  RotateCcw,
  CalendarDays,
  FileQuestion,
  Award,
  Settings,
  BookOpen
} from 'lucide-react';

export type TabType = 'dashboard' | 'arvore' | 'revisoes' | 'agenda' | 'questoes' | 'simulados' | 'config';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  revisoesPendentesCount: number;
  blocosHojePendentesCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  revisoesPendentesCount,
  blocosHojePendentesCount
}) => {
  const menuItems = [
    {
      id: 'dashboard' as TabType,
      label: 'Painel Geral',
      icon: LayoutDashboard,
      badge: null
    },
    {
      id: 'arvore' as TabType,
      label: 'Conteúdo Programático',
      icon: GitFork,
      badge: null
    },
    {
      id: 'revisoes' as TabType,
      label: 'Revisões & Manutenção',
      icon: RotateCcw,
      badge: revisoesPendentesCount > 0 ? revisoesPendentesCount : null,
      badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
    },
    {
      id: 'agenda' as TabType,
      label: 'Agenda & Rotina',
      icon: CalendarDays,
      badge: blocosHojePendentesCount > 0 ? blocosHojePendentesCount : null,
      badgeColor: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
    },
    {
      id: 'questoes' as TabType,
      label: 'Treino de Questões',
      icon: FileQuestion,
      badge: null
    },
    {
      id: 'simulados' as TabType,
      label: 'Simulados CESPE',
      icon: Award,
      badge: null
    },
    {
      id: 'config' as TabType,
      label: 'Configurações & Backup',
      icon: Settings,
      badge: null
    }
  ];

  return (
    <aside className="w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between p-4 min-h-[calc(100vh-4rem)] transition-colors">
      <div className="space-y-1">
        <div className="px-3 py-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Preparação & Controle
        </div>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-sky-50 text-sky-700 dark:bg-sky-950/70 dark:text-sky-300 shadow-sm border border-sky-100 dark:border-sky-900'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400 dark:text-slate-500'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge !== null && (
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${item.badgeColor}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Box informativo no rodapé */}
      <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
        <div className="flex items-center space-x-1.5 font-semibold text-slate-700 dark:text-slate-300">
          <BookOpen className="w-3.5 h-3.5 text-sky-600" />
          <span>Edital 1/2013 BACEN</span>
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
          Técnico – Área 1. Prova de 120 itens C/E (P1 Básicos 60, P2 Específicos 60) + Redação 50 pts.
        </p>
      </div>
    </aside>
  );
};
