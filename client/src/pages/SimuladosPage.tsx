import React, { useState, useEffect } from 'react';
import {
  Award,
  Plus,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock
} from 'lucide-react';
import { Modal } from '../components/Modal';
import { Simulado } from '../types';

interface SimuladosPageProps {
  simulatedDate: string;
}

export const SimuladosPage: React.FC<SimuladosPageProps> = ({ simulatedDate }) => {
  const [simulados, setSimulados] = useState<Simulado[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  // Form de Simulado
  const [titulo, setTitulo] = useState('Simulado Oficial BACEN 1');
  const [dataSimulado, setDataSimulado] = useState(simulatedDate);
  const [tempoGasto, setTempoGasto] = useState(240); // 4h
  const [certosP1, setCertosP1] = useState('42');
  const [erradosP1, setErradosP1] = useState('10');
  const [certosP2, setCertosP2] = useState('45');
  const [erradosP2, setErradosP2] = useState('8');
  const [notaDiscursiva, setNotaDiscursiva] = useState('35');
  const [observacoes, setObservacoes] = useState('');
  const [erroForm, setErroForm] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const loadSimulados = async () => {
    try {
      setLoading(true);
      const { api } = await import('../api/client');
      const res = await api.getSimulados();
      setSimulados(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSimulados();
  }, []);

  // Cálculos dinâmicos em tempo real na tela
  const numCertosP1 = parseInt(certosP1, 10) || 0;
  const numErradosP1 = parseInt(erradosP1, 10) || 0;
  const numCertosP2 = parseInt(certosP2, 10) || 0;
  const numErradosP2 = parseInt(erradosP2, 10) || 0;
  const numDiscursiva = parseFloat(notaDiscursiva);

  const notaP1Liquida = numCertosP1 - numErradosP1;
  const notaP2Liquida = numCertosP2 - numErradosP2;
  const notaTotalLiquida = notaP1Liquida + notaP2Liquida;

  const passouP1 = notaP1Liquida >= 12;
  const passouP2 = notaP2Liquida >= 18;
  const passouConjunto = notaTotalLiquida >= 36;
  const passouDiscursiva = isNaN(numDiscursiva) || numDiscursiva >= 25;
  const aprovadoGeral = passouP1 && passouP2 && passouConjunto && passouDiscursiva;

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroForm(null);

    if (numCertosP1 + numErradosP1 > 60) {
      setErroForm('A soma de acertos e erros em P1 (Básicos) não pode exceder 60 itens.');
      return;
    }
    if (numCertosP2 + numErradosP2 > 60) {
      setErroForm('A soma de acertos e erros em P2 (Específicos) não pode exceder 60 itens.');
      return;
    }
    if (!isNaN(numDiscursiva) && (numDiscursiva < 0 || numDiscursiva > 50)) {
      setErroForm('A nota da prova discursiva deve estar entre 0,00 e 50,00 pontos.');
      return;
    }

    try {
      setSalvando(true);
      const { api } = await import('../api/client');
      await api.registrarSimulado({
        titulo,
        data: dataSimulado,
        tempoGastoMinutos: tempoGasto,
        itensCertosP1: numCertosP1,
        itensErradosP1: numErradosP1,
        itensCertosP2: numCertosP2,
        itensErradosP2: numErradosP2,
        notaDiscursiva: !isNaN(numDiscursiva) ? numDiscursiva : undefined,
        observacoes
      }, simulatedDate);

      setModalOpen(false);
      await loadSimulados();
    } catch (err: any) {
      setErroForm(err.message || 'Erro ao registrar simulado.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
            <Award className="w-5 h-5 text-sky-600" />
            <span>Simulados & Regras Oficiais de Pontuação</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Cálculo fiel ao Edital BACEN 2013 Técnico (CESPE C/E: 1 certo = +1, 1 errado = -1). Aplicação dos critérios eliminatórios oficiais por bloco e discursiva.
          </p>
        </div>

        <button
          onClick={() => {
            setErroForm(null);
            setModalOpen(true);
          }}
          className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-xs transition-all self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar Novo Simulado</span>
        </button>
      </div>

      {/* Box explicativo das regras do Edital BACEN */}
      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
        <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
          <HelpCircle className="w-4 h-4 text-sky-600" />
          <span>Regras Eliminatórias do Edital (Subitem 8.10.5 e 9.8.1)</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-1">
          <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">P1 - Conhecimentos Básicos</span>
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">60 itens • Mínimo 12,00 pts líq.</span>
          </div>
          <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">P2 - Conhecimentos Específicos</span>
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">60 itens • Mínimo 18,00 pts líq.</span>
          </div>
          <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Conjunto P1 + P2</span>
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">120 itens • Mínimo 36,00 pts líq.</span>
          </div>
          <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">P3 - Discursiva</span>
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">Redação 30 lin. • Mínimo 25,00 pts</span>
          </div>
        </div>
      </div>

      {/* Histórico de Simulados */}
      <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
          Simulados Realizados
        </h2>

        {loading ? (
          <div className="p-8 text-center text-slate-400 text-xs">Carregando simulados...</div>
        ) : simulados.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs space-y-2">
            <p>Nenhum simulado registrado até o momento.</p>
            <p className="text-slate-400 text-[11px]">Pratique simulados completos com contagem de tempo para aferir sua nota líquida oficial.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Data</th>
                  <th className="py-2.5 px-3">Título</th>
                  <th className="py-2.5 px-3 text-center">P1 Líquida (Min 12)</th>
                  <th className="py-2.5 px-3 text-center">P2 Líquida (Min 18)</th>
                  <th className="py-2.5 px-3 text-center">Total Obj. (Min 36)</th>
                  <th className="py-2.5 px-3 text-center">Discursiva (Min 25)</th>
                  <th className="py-2.5 px-3 text-center">Resultado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {simulados.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-3 font-medium text-slate-700 dark:text-slate-300">
                      {s.data.split('-').reverse().join('/')}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-900 dark:text-slate-100">
                      {s.titulo}
                    </td>
                    <td className="py-3 px-3 text-center font-bold">
                      <span className={s.nota_p1_liquida >= 12 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                        {s.nota_p1_liquida.toFixed(1)} pts
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-bold">
                      <span className={s.nota_p2_liquida >= 18 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                        {s.nota_p2_liquida.toFixed(1)} pts
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-sm">
                      <span className={s.nota_total_liquida >= 36 ? 'text-sky-600 dark:text-sky-400' : 'text-rose-600 dark:text-rose-400'}>
                        {s.nota_total_liquida.toFixed(1)} pts
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-medium text-slate-600 dark:text-slate-400">
                      {s.nota_discursiva !== null ? `${s.nota_discursiva.toFixed(1)} pts` : '—'}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {s.aprovado_minimos ? (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Atingiu Mínimos</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                          <XCircle className="w-3 h-3" />
                          <span>Eliminado</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Registro de Simulado */}
      {modalOpen && (
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Registrar Simulado com Pontuação Oficial CESPE"
          maxWidth="max-w-2xl"
        >
          <form onSubmit={handleSalvar} className="space-y-4">
            {erroForm && (
              <div className="p-3 rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 text-xs border border-rose-200 dark:border-rose-900 flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{erroForm}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Título do Simulado *
                </label>
                <input
                  type="text"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Data de Realização *
                </label>
                <input
                  type="date"
                  value={dataSimulado}
                  onChange={(e) => setDataSimulado(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                  required
                />
              </div>
            </div>

            {/* P1 - Conhecimentos Básicos */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-slate-100">
                <span>P1: Conhecimentos Básicos (60 itens)</span>
                <span className={`text-xs ${passouP1 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  Nota Líquida: {notaP1Liquida} pts {passouP1 ? '✓ (Min 12)' : '✗ Abaixo de 12'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-500 mb-0.5">Itens Certos (P1)</label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={certosP1}
                    onChange={(e) => setCertosP1(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-0.5">Itens Errados (P1, desconta 1 pt cada)</label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={erradosP1}
                    onChange={(e) => setErradosP1(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                    required
                  />
                </div>
              </div>
            </div>

            {/* P2 - Conhecimentos Específicos */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-slate-100">
                <span>P2: Conhecimentos Específicos (60 itens)</span>
                <span className={`text-xs ${passouP2 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  Nota Líquida: {notaP2Liquida} pts {passouP2 ? '✓ (Min 18)' : '✗ Abaixo de 18'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-500 mb-0.5">Itens Certos (P2)</label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={certosP2}
                    onChange={(e) => setCertosP2(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-0.5">Itens Errados (P2, desconta 1 pt cada)</label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={erradosP2}
                    onChange={(e) => setErradosP2(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                    required
                  />
                </div>
              </div>
            </div>

            {/* P3 - Discursiva */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-slate-100">
                <span>P3: Prova Discursiva - Redação (Máx 50,00 pts)</span>
                <span className={`text-xs ${passouDiscursiva ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {passouDiscursiva ? '✓ Aprovado (Min 25)' : '✗ Reprovado (< 25)'}
                </span>
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-0.5">Nota Final da Discursiva (0 a 50)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="50"
                  value={notaDiscursiva}
                  onChange={(e) => setNotaDiscursiva(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                />
              </div>
            </div>

            {/* Resumo Final Instantâneo */}
            <div className={`p-4 rounded-xl border flex items-center justify-between text-xs ${
              aprovadoGeral
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-900 dark:text-emerald-200'
                : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-200'
            }`}>
              <div>
                <div className="font-bold text-sm">
                  Nota Total Líquida: {notaTotalLiquida} pts
                </div>
                <div className="text-[11px] opacity-80">
                  {passouConjunto ? 'Mínimo de 36 no conjunto atingido' : 'Reprovado: conjunto abaixo de 36 pontos'}
                </div>
              </div>

              <span className="font-bold px-3 py-1 rounded-full text-xs bg-white/60 dark:bg-slate-900/60">
                {aprovadoGeral ? '✓ Aprovado nos Mínimos' : '✗ Não Atingiu Critérios'}
              </span>
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={salvando}
                className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
              >
                {salvando ? 'Salvando...' : 'Salvar Simulado'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
