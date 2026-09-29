import React, { useState, useEffect } from 'react';
import {
  Settings,
  Database,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Clock,
  Sliders,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { Modal } from '../components/Modal';

interface ConfiguracoesPageProps {
  onRefreshGlobal: () => void;
}

export const ConfiguracoesPage: React.FC<ConfiguracoesPageProps> = ({ onRefreshGlobal }) => {
  const [loading, setLoading] = useState(true);
  const [salvandoRotina, setSalvandoRotina] = useState(false);
  const [salvandoSupabase, setSalvandoSupabase] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);

  // Rotina
  const [diasDisponiveis, setDiasDisponiveis] = useState<number[]>([1, 2, 3, 4, 5, 6]);
  const [minutosPorDia, setMinutosPorDia] = useState<Record<string, number>>({
    '0': 0, '1': 240, '2': 240, '3': 240, '4': 240, '5': 240, '6': 300
  });
  const [duracaoBloco, setDuracaoBloco] = useState(50);
  const [duracaoPausa, setDuracaoPausa] = useState(10);
  const [propEstudo, setPropEstudo] = useState(50);
  const [propRevisao, setPropRevisao] = useState(30);
  const [propQuestoes, setPropQuestoes] = useState(20);

  // Supabase
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [supabaseScriptModalOpen, setSupabaseScriptModalOpen] = useState(false);
  const [supabaseScript, setSupabaseScript] = useState('');
  const [copiado, setCopiado] = useState(false);

  // Backup restore
  const [restaurando, setRestaurando] = useState(false);
  const [confirmarRestoreOpen, setConfirmarRestoreOpen] = useState(false);
  const [backupFileContent, setBackupFileContent] = useState<any | null>(null);

  const loadConfigs = async () => {
    try {
      setLoading(true);
      const { api } = await import('../api/client');
      const [resRotina, resSupa] = await Promise.all([
        api.getRotinaConfig(),
        api.getSupabaseConfig()
      ]);

      if (resRotina.data) {
        const d = resRotina.data;
        setDiasDisponiveis(d.diasSemanaDisponiveis || [1, 2, 3, 4, 5, 6]);
        setMinutosPorDia(d.minutosPorDia || {});
        setDuracaoBloco(d.duracaoBlocoMinutos || 50);
        setDuracaoPausa(d.pausaMinutos || 10);
        setPropEstudo(Math.round((d.proporcaoEstudoNovo || 0.5) * 100));
        setPropRevisao(Math.round((d.proporcaoRevisoes || 0.3) * 100));
        setPropQuestoes(Math.round((d.proporcaoQuestoes || 0.2) * 100));
      }

      if (resSupa.data) {
        setSupabaseUrl(resSupa.data.url || '');
        setSupabaseKey(resSupa.data.anon_key || '');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfigs();
  }, []);

  const handleSalvarRotina = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSalvandoRotina(true);
      const { api } = await import('../api/client');
      await api.salvarRotinaConfig({
        diasSemanaDisponiveis: diasDisponiveis,
        minutosPorDia,
        duracaoBlocoMinutos: duracaoBloco,
        pausaMinutos: duracaoPausa,
        proporcaoEstudoNovo: propEstudo / 100,
        proporcaoRevisoes: propRevisao / 100,
        proporcaoQuestoes: propQuestoes / 100
      });
      setMensagemSucesso('Configurações de rotina salvas com sucesso!');
      setTimeout(() => setMensagemSucesso(null), 4000);
      onRefreshGlobal();
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    } finally {
      setSalvandoRotina(false);
    }
  };

  const handleSalvarSupabase = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSalvandoSupabase(true);
      const { api } = await import('../api/client');
      await api.salvarSupabaseConfig({ url: supabaseUrl, anonKey: supabaseKey });
      setMensagemSucesso('Credenciais do Supabase salvas localmente com sucesso!');
      setTimeout(() => setMensagemSucesso(null), 4000);
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    } finally {
      setSalvandoSupabase(false);
    }
  };

  const handleVerScriptSupabase = async () => {
    const { api } = await import('../api/client');
    const res = await api.getSupabaseScript();
    setSupabaseScript(res.script);
    setSupabaseScriptModalOpen(true);
  };

  const handleExportarBackup = async () => {
    const { api } = await import('../api/client');
    await api.exportarBackup();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        setBackupFileContent(parsed);
        setConfirmarRestoreOpen(true);
      } catch (err) {
        alert('Arquivo de backup inválido: não é um JSON bem-formado.');
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmarRestauracao = async () => {
    if (!backupFileContent) return;
    try {
      setRestaurando(true);
      const { api } = await import('../api/client');
      const res = await api.restaurarBackup(backupFileContent);
      alert(`Backup restaurado com sucesso! ${res.totalRegistros} registros recuperados. Integridade SHA-256: ${res.hashVerificado ? 'Verificada' : 'OK'}.`);
      setConfirmarRestoreOpen(false);
      setBackupFileContent(null);
      await loadConfigs();
      onRefreshGlobal();
    } catch (err: any) {
      alert(err.message || 'Falha ao restaurar backup.');
    } finally {
      setRestaurando(false);
    }
  };

  const nomesDias = [
    { num: 1, label: 'Segunda-feira' },
    { num: 2, label: 'Terça-feira' },
    { num: 3, label: 'Quarta-feira' },
    { num: 4, label: 'Quinta-feira' },
    { num: 5, label: 'Sexta-feira' },
    { num: 6, label: 'Sábado' },
    { num: 0, label: 'Domingo' }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
          <Settings className="w-5 h-5 text-sky-600" />
          <span>Configurações, Persistência & Backup</span>
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Ajuste sua disponibilidade de horários, regras de manutenção, conexão com Supabase e exportação/restauração completa de dados.
        </p>
      </div>

      {mensagemSucesso && (
        <div className="p-3.5 rounded-xl bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-xs font-medium border border-emerald-200 dark:border-emerald-900 flex items-center space-x-2 animate-in fade-in duration-150">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{mensagemSucesso}</span>
        </div>
      )}

      {/* 1. Rotina Diária e Disponibilidade */}
      <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
          <Clock className="w-4 h-4 text-sky-600" />
          <span>Rotina de Estudos & Horários Disponíveis</span>
        </h2>

        <form onSubmit={handleSalvarRotina} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Dias da Semana e Tempo Disponível
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {nomesDias.map((d) => {
                const ativo = diasDisponiveis.includes(d.num);
                const minutos = minutosPorDia[String(d.num)] || 0;
                const horas = (minutos / 60).toFixed(1);

                return (
                  <div
                    key={d.num}
                    className={`p-3 rounded-xl border transition-all ${
                      ativo
                        ? 'bg-slate-50 dark:bg-slate-800/60 border-slate-300 dark:border-slate-700'
                        : 'bg-slate-100/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 opacity-60'
                    }`}
                  >
                    <label className="flex items-center space-x-2 cursor-pointer mb-2">
                      <input
                        type="checkbox"
                        checked={ativo}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setDiasDisponiveis([...diasDisponiveis, d.num]);
                            if (minutos === 0) {
                              setMinutosPorDia({ ...minutosPorDia, [String(d.num)]: 240 });
                            }
                          } else {
                            setDiasDisponiveis(diasDisponiveis.filter((x) => x !== d.num));
                          }
                        }}
                        className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500"
                      />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {d.label}
                      </span>
                    </label>

                    {ativo && (
                      <div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                          <span>Tempo diário:</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{horas}h ({minutos} min)</span>
                        </div>
                        <input
                          type="range"
                          min="30"
                          max="480"
                          step="30"
                          value={minutos}
                          onChange={(e) =>
                            setMinutosPorDia({
                              ...minutosPorDia,
                              [String(d.num)]: parseInt(e.target.value, 10)
                            })
                          }
                          className="w-full accent-sky-600 cursor-pointer"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Duração de cada Bloco (minutos)
              </label>
              <input
                type="number"
                min="20"
                max="120"
                value={duracaoBloco}
                onChange={(e) => setDuracaoBloco(parseInt(e.target.value || '50', 10))}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Pausa entre Blocos (minutos)
              </label>
              <input
                type="number"
                min="0"
                max="60"
                value={duracaoPausa}
                onChange={(e) => setDuracaoPausa(parseInt(e.target.value || '10', 10))}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
              />
            </div>
          </div>

          {/* Proporção de Distribuição */}
          <div className="pt-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Proporção de Tempo da Agenda ({propEstudo}% Novo Conteúdo • {propRevisao}% Revisões • {propQuestoes}% Questões)
            </label>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <span className="text-[11px] text-slate-500 block mb-1">Novo Estudo (%)</span>
                <input
                  type="number"
                  min="10"
                  max="80"
                  value={propEstudo}
                  onChange={(e) => setPropEstudo(parseInt(e.target.value || '50', 10))}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                />
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block mb-1">Revisões (%)</span>
                <input
                  type="number"
                  min="10"
                  max="80"
                  value={propRevisao}
                  onChange={(e) => setPropRevisao(parseInt(e.target.value || '30', 10))}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                />
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block mb-1">Treino Questões (%)</span>
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={propQuestoes}
                  onChange={(e) => setPropQuestoes(parseInt(e.target.value || '20', 10))}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={salvandoRotina}
              className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
            >
              {salvandoRotina ? 'Salvando...' : 'Salvar Configurações de Rotina'}
            </button>
          </div>
        </form>
      </div>

      {/* 2. Integração com Supabase */}
      <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
            <Database className="w-4 h-4 text-emerald-600" />
            <span>Integração com Supabase (Opcional)</span>
          </h2>

          <button
            onClick={handleVerScriptSupabase}
            className="flex items-center space-x-1.5 text-xs font-semibold text-emerald-600 hover:underline"
          >
            <span>Ver Script SQL DDL</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          O aplicativo roda com persistência local 100% autônoma em SQLite. Se desejar espelhar ou sincronizar os dados com o seu projeto Supabase, informe a URL e a chave pública anon do seu projeto.
        </p>

        <form onSubmit={handleSalvarSupabase} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Supabase Project URL
              </label>
              <input
                type="text"
                placeholder="https://xyzcompany.supabase.co"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Supabase Anon / Public Key
              </label>
              <input
                type="password"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={supabaseKey}
                onChange={(e) => setSupabaseKey(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={salvandoSupabase}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
            >
              {salvandoSupabase ? 'Salvando...' : 'Salvar Configuração Supabase'}
            </button>
          </div>
        </form>
      </div>

      {/* 3. Backup Completo e Persistência Local */}
      <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-sky-600" />
          <span>Persistência, Integridade & Backup Completo</span>
        </h2>

        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Seus dados estão gravados localmente em SQLite no arquivo <code className="font-mono text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950 px-1 py-0.5 rounded">server/data/concurso.db</code>. Ao fechar e reabrir o computador, tudo permanece preservado. Você também pode exportar e restaurar cópias de segurança completas validadas por hash criptográfico SHA-256.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            onClick={handleExportarBackup}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Exportar Backup Completo (JSON com SHA-256)</span>
          </button>

          <label className="flex items-center space-x-2 px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold cursor-pointer transition-colors">
            <Upload className="w-4 h-4 text-slate-500" />
            <span>Restaurar a partir de Arquivo...</span>
            <input
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Modal de Script SQL para Supabase */}
      {supabaseScriptModalOpen && (
        <Modal
          isOpen={supabaseScriptModalOpen}
          onClose={() => setSupabaseScriptModalOpen(false)}
          title="Script SQL DDL para Supabase (PostgreSQL)"
          maxWidth="max-w-3xl"
        >
          <div className="space-y-3">
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Copie o script abaixo e execute-o no <strong>SQL Editor</strong> do painel do seu projeto Supabase para criar todas as tabelas e relacionamentos necessários:
            </p>
            <div className="relative">
              <pre className="p-4 rounded-xl bg-slate-950 text-slate-100 font-mono text-xs overflow-x-auto max-h-96">
                {supabaseScript}
              </pre>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(supabaseScript);
                  setCopiado(true);
                  setTimeout(() => setCopiado(false), 2500);
                }}
                className="absolute top-3 right-3 flex items-center space-x-1 px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-md transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copiado ? 'Copiado!' : 'Copiar Script'}</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Confirmação de Restauração de Backup */}
      {confirmarRestoreOpen && backupFileContent && (
        <Modal
          isOpen={confirmarRestoreOpen}
          onClose={() => setConfirmarRestoreOpen(false)}
          title="Confirmar Restauração de Backup"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-lg bg-amber-50 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200 border border-amber-200 dark:border-amber-900 flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Atenção: </span>
                Esta operação substituirá os dados atuais pelos dados contidos no arquivo de backup. A substituição é executada em uma transação atômica que será revertida caso ocorra qualquer inconsistência.
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-1">
              <div><strong>Versão:</strong> {backupFileContent.versao}</div>
              <div><strong>Gerado em:</strong> {backupFileContent.geradoEm}</div>
              {backupFileContent.sha256 && (
                <div className="font-mono text-[11px] truncate">
                  <strong>SHA-256:</strong> {backupFileContent.sha256}
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmarRestoreOpen(false)}
                className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={restaurando}
                onClick={handleConfirmarRestauracao}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold transition-colors disabled:opacity-50"
              >
                {restaurando ? 'Restaurando...' : 'Confirmar e Restaurar'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
