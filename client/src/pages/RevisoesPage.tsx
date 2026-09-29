import React, { useState, useEffect } from 'react';
import {
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Undo2,
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';
import { QuickCompleteModal } from '../components/QuickCompleteModal';
import { Modal } from '../components/Modal';
import { Revisao } from '../types';

interface RevisoesPageProps {
  simulatedDate: string;
  onRefreshGlobal: () => void;
}

export const RevisoesPage: React.FC<RevisoesPageProps> = ({
  simulatedDate,
  onRefreshGlobal
}) => {
  const [revisoes, setRevisoes] = useState<Revisao[]>([]);
  const [loading, setLoading] = useState(true);
  const [tabAtiva, setTabAtiva] = useState<'pendentes' | 'atrasadas' | 'disponiveis' | 'manutencao' | 'concluidas'>('atrasadas');

  const [modalConclusao, setModalConclusao] = useState<Revisao | null>(null);
  const [modalRecuperacaoAssuntoId, setModalRecuperacaoAssuntoId] = useState<string | null>(null);

  const loadRevisoes = async () => {
    try {
      setLoading(true);
      const { api } = await import('../api/client');
      const res = await api.getRevisoes(undefined, simulatedDate);
      setRevisoes(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRevisoes();
  }, [simulatedDate]);

  const handleConcluir = async (dados: any) => {
    if (!modalConclusao) return;
    const { api } = await import('../api/client');
    await api.concluirRevisao(modalConclusao.id, {
      dataReal: simulatedDate,
      ...dados
    }, simulatedDate);
    await loadRevisoes();
    onRefreshGlobal();
  };

  const handleDesfazer = async (revId: string) => {
    if (!confirm('Deseja realmente desfazer a conclusão desta revisão? O histórico será recalculado.')) return;
    const { api } = await import('../api/client');
    await api.desfazerRevisao(revId, simulatedDate);
    await loadRevisoes();
    onRefreshGlobal();
  };

  // Filtragem pelas abas
  const atrasadas = revisoes.filter((r) => r.status === 'atrasada');
  const disponiveisHoje = revisoes.filter((r) => r.status === 'disponivel');
  const emManutencao = revisoes.filter((r) => r.ciclo === 'manutencao' && r.status !== 'concluida' && r.status !== 'recuperada');
  const concluidas = revisoes.filter((r) => r.status === 'concluida');
  const todasPendentes = revisoes.filter((r) => r.status === 'atrasada' || r.status === 'disponivel' || r.status === 'agendada');

  // Detectar assuntos que têm 2 ou mais revisões atrasadas para sugerir Recuperação
  const atrasadasPorAssunto = new Map<string, Revisao[]>();
  for (const r of atrasadas) {
    const list = atrasadasPorAssunto.get(r.assunto_id) || [];
    list.push(r);
    atrasadasPorAssunto.set(r.assunto_id, list);
  }

  const assuntosComMultiplosAtrasos = Array.from(atrasadasPorAssunto.entries()).filter(
    ([, list]) => list.length >= 2
  );

  const listaAtual =
    tabAtiva === 'atrasadas'
      ? atrasadas
      : tabAtiva === 'disponiveis'
      ? disponiveisHoje
      : tabAtiva === 'manutencao'
      ? emManutencao
      : tabAtiva === 'concluidas'
      ? concluidas
      : todasPendentes;

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
            <RotateCcw className="w-5 h-5 text-sky-600" />
            <span>Revisões Espaçadas & Manutenção</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Marcos fixos de 7, 15 e 30 dias contados a partir do estudo inicial. Após os 30 dias, o assunto entra em manutenção com intervalo ajustável pelo rendimento real.
          </p>
        </div>
      </div>

      {/* Alerta de Múltiplos Atrasos & Revisão de Recuperação */}
      {assuntosComMultiplosAtrasos.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 space-y-2">
          <div className="flex items-center space-x-2 font-bold text-sm text-amber-900 dark:text-amber-200">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span>Oportunidade de Revisão de Recuperação</span>
          </div>
          <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
            Identificamos assuntos com 2 ou mais etapas atrasadas simultaneamente. Em vez de acumular tarefas idênticas no mesmo dia, você pode unificá-las em uma única <strong>Revisão de Recuperação</strong>, preservando a rastreabilidade no histórico sem fingir datas irreais.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {assuntosComMultiplosAtrasos.map(([assuntoId, list]) => (
              <button
                key={assuntoId}
                onClick={() => setModalRecuperacaoAssuntoId(assuntoId)}
                className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs flex items-center space-x-1.5 transition-colors"
              >
                <span>Unificar {list.length} etapas de: {list[0].assunto_titulo || 'Assunto'}</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Abas de Navegação */}
      <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
        {[
          { id: 'atrasadas', label: 'Atrasadas', count: atrasadas.length, color: 'text-rose-600 dark:text-rose-400' },
          { id: 'disponiveis', label: 'Disponíveis Hoje', count: disponiveisHoje.length, color: 'text-amber-600 dark:text-amber-400' },
          { id: 'manutencao', label: 'Em Manutenção', count: emManutencao.length, color: 'text-sky-600 dark:text-sky-400' },
          { id: 'pendentes', label: 'Todas as Agendadas', count: todasPendentes.length, color: 'text-slate-600 dark:text-slate-400' },
          { id: 'concluidas', label: 'Histórico Concluído', count: concluidas.length, color: 'text-emerald-600 dark:text-emerald-400' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setTabAtiva(tab.id as any)}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center space-x-2 transition-all whitespace-nowrap ${
              tabAtiva === tab.id
                ? 'bg-sky-50 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-900 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70'
            }`}
          >
            <span>{tab.label}</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 ${tab.color}`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Lista de Revisões */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs">Carregando revisões...</div>
      ) : listaAtual.length === 0 ? (
        <div className="p-12 text-center rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 text-xs">
          Nenhuma revisão nesta categoria.
        </div>
      ) : (
        <div className="space-y-3">
          {listaAtual.map((rev) => {
            const isDone = rev.status === 'concluida';
            const isAtrasada = rev.status === 'atrasada';
            const isManut = rev.ciclo === 'manutencao';

            return (
              <div
                key={rev.id}
                className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:border-slate-300 dark:hover:border-slate-700"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isAtrasada
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-900'
                        : isDone
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : isManut
                        ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    }`}>
                      {rev.ciclo === 'manutencao'
                        ? `Manutenção Ciclo #${rev.numero_ciclo_manutencao}`
                        : rev.ciclo === 'recuperacao'
                        ? 'Revisão de Recuperação'
                        : `Revisão D+${rev.intervalo_dias}`}
                    </span>

                    <span className="text-xs text-slate-500 font-medium">
                      {rev.disciplina_nome}
                    </span>

                    <span className="text-slate-400">•</span>

                    <span className="text-xs text-slate-500 font-medium">
                      Data prevista: <strong>{rev.data_prevista.split('-').reverse().join('/')}</strong>
                    </span>

                    {rev.data_real && (
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                        (Realizada em: {rev.data_real.split('-').reverse().join('/')})
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                    {rev.codigo_edital && <span className="text-slate-400 mr-1.5">{rev.codigo_edital}</span>}
                    {rev.assunto_titulo || 'Assunto'}
                  </h3>

                  {rev.heuristica_intervalo_motivo && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                      ℹ️ {rev.heuristica_intervalo_motivo}
                    </p>
                  )}
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  {isDone ? (
                    <button
                      onClick={() => handleDesfazer(rev.id)}
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium transition-colors"
                      title="Desfaz a conclusão desta revisão com consistência"
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                      <span>Desfazer</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setModalConclusao(rev)}
                      className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-xs transition-all"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Concluir Revisão</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Conclusão de Revisão */}
      {modalConclusao && (
        <QuickCompleteModal
          isOpen={true}
          onClose={() => setModalConclusao(null)}
          title={`Concluir Revisão: ${modalConclusao.ciclo === 'manutencao' ? `Manutenção #${modalConclusao.numero_ciclo_manutencao}` : `Ciclo ${modalConclusao.ciclo}`}`}
          itemDescription={`${modalConclusao.disciplina_nome} — ${modalConclusao.assunto_titulo}`}
          is30dOrMaintenance={modalConclusao.ciclo === '30d' || modalConclusao.ciclo === 'manutencao'}
          onConfirm={handleConcluir}
        />
      )}

      {/* Modal de Recuperação */}
      {modalRecuperacaoAssuntoId && (
        <Modal
          isOpen={true}
          onClose={() => setModalRecuperacaoAssuntoId(null)}
          title="Criar Revisão de Recuperação"
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Esta ação unifica as etapas atrasadas deste assunto em uma única revisão, desativando as pendências duplicadas na fila e registrando o histórico de substituição de forma fiel.
            </p>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-800">
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                Etapas que serão unificadas:
              </span>
              <ul className="list-disc list-inside mt-1 space-y-1 text-slate-600 dark:text-slate-400">
                {(atrasadasPorAssunto.get(modalRecuperacaoAssuntoId) || []).map((r) => (
                  <li key={r.id}>
                    Revisão {r.ciclo} (prevista para {r.data_prevista.split('-').reverse().join('/')})
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setModalRecuperacaoAssuntoId(null)}
                className="px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  const list = atrasadasPorAssunto.get(modalRecuperacaoAssuntoId) || [];
                  const ids = list.map((r) => r.id);
                  const { api } = await import('../api/client');
                  await api.criarRecuperacao({
                    assuntoId: modalRecuperacaoAssuntoId,
                    revisoesAtrasadasIds: ids,
                    dataAgendada: simulatedDate
                  }, simulatedDate);
                  setModalRecuperacaoAssuntoId(null);
                  await loadRevisoes();
                  onRefreshGlobal();
                }}
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold transition-colors"
              >
                Confirmar Unificação
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
