import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar, TabType } from './components/Sidebar';
import { DashboardPage } from './pages/DashboardPage';
import { ArvoreEditalPage } from './pages/ArvoreEditalPage';
import { RevisoesPage } from './pages/RevisoesPage';
import { AgendaPage } from './pages/AgendaPage';
import { QuestoesPage } from './pages/QuestoesPage';
import { SimuladosPage } from './pages/SimuladosPage';
import { ConfiguracoesPage } from './pages/ConfiguracoesPage';
import { api } from './api/client';

export function App() {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('theme') === 'dark' ||
      (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  // Data atual local formatada como YYYY-MM-DD
  const getInitialLocalDate = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const [simulatedDate, setSimulatedDate] = useState<string>(getInitialLocalDate);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [dashboardData, setDashboardData] = useState<any | null>(null);
  const [concursoData, setConcursoData] = useState<any | null>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Sincronizar dark mode com a tag <html>
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const loadGlobalData = async () => {
    try {
      const [resDash, resConc] = await Promise.all([
        api.getDashboard(simulatedDate),
        api.getConcurso()
      ]);
      setDashboardData(resDash.data);
      setConcursoData(resConc.concurso);
    } catch (err) {
      console.error('Falha ao carregar dados globais:', err);
    } finally {
      setLoadingInitial(false);
    }
  };

  useEffect(() => {
    loadGlobalData();
  }, [simulatedDate]);

  const revisoesAtrasadasCount = dashboardData?.revisoes?.atrasadas?.length || 0;
  const revisoesPendentesCount = (dashboardData?.revisoes?.totais?.atrasadas || 0) + (dashboardData?.revisoes?.totais?.disponiveis || 0);
  const blocosHojePendentesCount = dashboardData?.estudoHoje?.blocos?.filter((b: any) => b.status !== 'concluido')?.length || 0;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <Navbar
        concurso={concursoData || { cargo: 'Técnico do Banco Central', area: 'Área 1 – Suporte Técnico-Administrativo' }}
        simulatedDate={simulatedDate}
        setSimulatedDate={setSimulatedDate}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        revisoesAtrasadasCount={revisoesAtrasadasCount}
      />

      <div className="flex-1 flex">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          revisoesPendentesCount={revisoesPendentesCount}
          blocosHojePendentesCount={blocosHojePendentesCount}
        />

        <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full overflow-x-hidden">
          {activeTab === 'dashboard' && (
            <DashboardPage
              data={dashboardData}
              onRefresh={loadGlobalData}
              setActiveTab={setActiveTab}
              simulatedDate={simulatedDate}
            />
          )}

          {activeTab === 'arvore' && (
            <ArvoreEditalPage
              simulatedDate={simulatedDate}
              onRefreshGlobal={loadGlobalData}
            />
          )}

          {activeTab === 'revisoes' && (
            <RevisoesPage
              simulatedDate={simulatedDate}
              onRefreshGlobal={loadGlobalData}
            />
          )}

          {activeTab === 'agenda' && (
            <AgendaPage
              simulatedDate={simulatedDate}
              onRefreshGlobal={loadGlobalData}
            />
          )}

          {activeTab === 'questoes' && (
            <QuestoesPage
              simulatedDate={simulatedDate}
              onRefreshGlobal={loadGlobalData}
            />
          )}

          {activeTab === 'simulados' && (
            <SimuladosPage
              simulatedDate={simulatedDate}
            />
          )}

          {activeTab === 'config' && (
            <ConfiguracoesPage
              onRefreshGlobal={loadGlobalData}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
