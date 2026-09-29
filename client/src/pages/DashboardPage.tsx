import React, { useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  Target,
  ArrowRight,
  BookOpen,
  HelpCircle,
  Zap
} from 'lucide-react';
import { QuickCompleteModal } from '../components/QuickCompleteModal';
import { TabType } from '../components/Sidebar';

interface DashboardPageProps {
  data: any;
  onRefresh: () => void;
  setActiveTab: (tab: TabType) => void;
  simulatedDate: string;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  data,
  onRefresh,
  setActiveTab,
  simulatedDate
}) => {
  const [completeModalItem, setCompleteModalItem] = useState<{
    id: string;
    title: string;
    description: string;
    isBlock: boolean;
    is30dOrMaintenance?: boolean;
  } | null>(null);

  if (!data) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-500">
        <Clock className="w-5 h-5 animate-spin mr-2" />
        Carregando painel geral...
      </div>
    );
  }

  const { concurso, estudoHoje, revisoes, cobertura, desempenho, ondeConcentrar, estudoSemana } = data;

  const handleQuickComplete = async (questaoData: any) => {
    if (!completeModalItem) return;
    const { api } = await import('../api/client');

    if (completeModalItem.isBlock) {
      await api.concluirBloco(completeModalItem.id, questaoData, simulatedDate);
    } else {
      await api.concluirRevisao(completeModalItem.id, {
        dataReal: simulatedDate,
        ...questaoData
      }, simulatedDate);
    }
    onRefresh();
  };

  const formatDataPt = (dateStr?: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}`;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Cabeçalho Institucional do Concurso & Contagem Regressiva */}
      <div className="p-6 rounded-xl bg-gradient-to-r from-slate-950 via-bacen-950 to-bacen-900 border border-bacen-800/40 text-white shadow-card flex flex-col md:flex-row md:items-center justify-between gap-5 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center space-x-2 text-sky-300 text-[11px] font-mono uppercase tracking-wider mb-1.5">
            <span className="font-semibold text-white bg-bacen-800/80 px-2 py-0.5 rounded border border-bacen-700/60">{concurso.orgao}</span>
            <span>•</span>
            <span>{concurso.banca}</span>
            <span>•</span>
            <span className="text-sky-300/80">Edital 1/2013</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white">{concurso.cargo}</h1>
          <p className="text-xs md:text-sm text-slate-300 mt-1 max-w-xl">{concurso.area}</p>
        </div>

        <div className="relative z-10 flex items-center space-x-4 bg-slate-900/60 border border-slate-700/50 px-5 py-3 rounded-xl shadow-inner">
          <div className="w-10 h-10 rounded-lg bg-bacen-800/80 border border-bacen-600/50 flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5 text-sky-300" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">
              {concurso.dataProvaEstimada ? 'Data Estimada' : 'Data Oficial'}
            </div>
            <div className="text-base font-bold font-mono tracking-tight text-white">
              {concurso.dataProva ? concurso.dataProva.split('-').reverse().join('/') : 'A definir'}
            </div>
            {concurso.diasParaProva !== null && (
              <div className="text-xs font-mono font-medium text-sky-300 mt-0.5">
                {concurso.diasParaProva > 0
                  ? `Faltam ${concurso.diasParaProva} dias`
                  : concurso.diasParaProva === 0
                  ? 'Dia da Prova Hoje!'
                  : `Realizada há ${Math.abs(concurso.diasParaProva)} dias`}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cards Principais: 4 Métricas Essenciais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Horas de Estudo na Semana */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 shadow-card hover:shadow-card-hover transition-all flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 rounded-bl-full pointer-events-none" />
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">
              <span className="flex items-center space-x-1.5">
                <Clock className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                <span className="font-semibold text-slate-700 dark:text-slate-200">Estudo na Semana</span>
              </span>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                {estudoSemana?.totalSessoes || 0}x sessões
              </span>
            </div>

            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-2 flex items-baseline space-x-1.5">
              <span>{estudoSemana?.horasFormatadas || '0 min'}</span>
              {estudoSemana?.horasDecimais > 0 && (
                <span className="text-xs font-mono font-normal text-slate-400">({estudoSemana.horasDecimais}h)</span>
              )}
            </div>

            {/* Barra de Meta Semanal (se houver) ou Resumo */}
            {estudoSemana?.metaSemanalMinutos > 0 ? (
              <div className="mt-3 space-y-1">
                <div className="flex justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  <span>Meta: {estudoSemana.metaSemanalHoras}h</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">{estudoSemana.percentualMeta}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-sky-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${estudoSemana.percentualMeta || 0}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                {estudoSemana?.totalQuestoes > 0
                  ? `${estudoSemana.totalQuestoes} questões realizadas na semana`
                  : 'Total de tempo dedicado na semana'}
              </div>
            )}
          </div>

          <button
            onClick={() => setActiveTab('arvore')}
            className="mt-4 flex items-center space-x-1 text-xs font-semibold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300"
          >
            <span>Registrar estudo</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Card 2: Cobertura do Edital */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 shadow-card hover:shadow-card-hover transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">
              <span className="flex items-center space-x-1.5">
                <BookOpen className="w-4 h-4 text-emerald-600" />
                <span className="font-semibold text-slate-700 dark:text-slate-200">Cobertura do Edital</span>
              </span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{cobertura.percentual}%</span>
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-2">
              {cobertura.topicosEstudados} <span className="text-xs font-sans font-normal text-slate-500">de {cobertura.totalTopicosEstudaveis} tópicos</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-3">
              <div
                className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${cobertura.percentual}%` }}
              />
            </div>
          </div>
          <button
            onClick={() => setActiveTab('arvore')}
            className="mt-4 flex items-center space-x-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700"
          >
            <span>Explorar edital</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Card 3: Revisões Pendentes */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 shadow-card hover:shadow-card-hover transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">
              <span className="flex items-center space-x-1.5">
                <AlertCircle className={`w-4 h-4 ${revisoes.atrasadas.length > 0 ? 'text-rose-500' : 'text-emerald-500'}`} />
                <span className="font-semibold text-slate-700 dark:text-slate-200">Fila de Revisões</span>
              </span>
              {revisoes.atrasadas.length > 0 ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
                  {revisoes.atrasadas.length} Atrasada{revisoes.atrasadas.length > 1 ? 's' : ''}
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
                  Em dia
                </span>
              )}
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-2">
              {revisoes.disponiveisHoje.length} <span className="text-xs font-sans font-normal text-slate-500">disponíveis hoje</span>
            </div>
            <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-2 flex items-center space-x-2">
              <span>{revisoes.totais.concluidas || 0} cumpridas</span>
              <span>•</span>
              <span>{revisoes.totais.em_manutencao || 0} em manutenção</span>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('revisoes')}
            className="mt-4 flex items-center space-x-1 text-xs font-semibold text-sky-600 dark:text-sky-400 hover:text-sky-700"
          >
            <span>Ver fila de revisões</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Card 4: Desempenho nas Questões */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 shadow-card hover:shadow-card-hover transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">
              <span className="flex items-center space-x-1.5">
                <TrendingUp className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                <span className="font-semibold text-slate-700 dark:text-slate-200">Taxa de Acertos</span>
              </span>
              <span className="text-[10px] font-mono text-slate-400 uppercase">Ponderada</span>
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-2">
              {desempenho.taxaGeral !== null ? (
                <span>{(desempenho.taxaGeral * 100).toFixed(1)}%</span>
              ) : (
                <span className="text-base font-medium text-slate-400">Sem dados</span>
              )}
            </div>
            <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-2">
              {desempenho.totalQuestoes > 0 ? (
                <span>{desempenho.totalAcertos} de {desempenho.totalQuestoes} questões resolvidas</span>
              ) : (
                <span>Nenhuma questão registrada ainda</span>
              )}
            </div>
          </div>
          <button
            onClick={() => setActiveTab('questoes')}
            className="mt-4 flex items-center space-x-1 text-xs font-semibold text-sky-600 dark:text-sky-400 hover:text-sky-700"
          >
            <span>Histórico de questões</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Gráfico / Distribuição Semanal de Horas Estudadas */}
      {estudoSemana?.dias && (
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-sky-600" />
              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                Distribuição de Estudo na Semana ({formatDataPt(estudoSemana.inicioSemana)} a {formatDataPt(estudoSemana.fimSemana)})
              </h3>
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center space-x-2">
              <span>Total: <strong className="text-slate-900 dark:text-slate-100">{estudoSemana.horasFormatadas}</strong></span>
              <span>•</span>
              <span>{estudoSemana.totalSessoes} sessão(ões)</span>
              {estudoSemana.totalQuestoes > 0 && (
                <>
                  <span>•</span>
                  <span>{estudoSemana.totalQuestoes} questões</span>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 pt-1">
            {estudoSemana.dias.map((d: any) => {
              const temEstudo = d.minutos > 0;
              return (
                <div
                  key={d.data}
                  className={`p-2.5 rounded-lg border text-center transition-all flex flex-col justify-between min-h-[75px] ${
                    d.isHoje
                      ? 'border-sky-500 bg-sky-50/60 dark:bg-sky-950/40 ring-1 ring-sky-500/30'
                      : temEstudo
                      ? 'border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/60'
                      : 'border-dashed border-slate-200 dark:border-slate-800 bg-transparent opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className={`font-bold ${d.isHoje ? 'text-sky-600 dark:text-sky-400' : 'text-slate-700 dark:text-slate-300'}`}>
                      {d.diaNome}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {formatDataPt(d.data)}
                    </span>
                  </div>

                  <div className="my-1">
                    {temEstudo ? (
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                        {d.horasFormatadas}
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400 block">-</span>
                    )}
                  </div>

                  <div>
                    {d.isHoje ? (
                      <span className="inline-block text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-sky-600 text-white">
                        Hoje
                      </span>
                    ) : d.sessoes > 0 ? (
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        {d.sessoes}x
                      </span>
                    ) : (
                      <span className="text-[10px] text-transparent">-</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}


      {/* Seção Central: Q1 (O que estudar hoje) & Q5 (Onde concentrar esforço) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Q1: O que preciso estudar hoje? */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <span>Q1: O que preciso estudar hoje?</span>
            </h2>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {estudoHoje.blocosConcluidos} de {estudoHoje.totalBlocos} concluídos
            </div>
          </div>

          {estudoHoje.blocos.length === 0 ? (
            <div className="p-8 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-3">
              <Clock className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Nenhum bloco agendado para hoje.
              </p>
              <button
                onClick={() => setActiveTab('agenda')}
                className="px-4 py-2 rounded-lg bg-sky-600 text-white text-xs font-semibold hover:bg-sky-700 transition-colors shadow-sm"
              >
                Gerar Agenda da Semana
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {estudoHoje.blocos.map((bloco: any) => {
                const isDone = bloco.status === 'concluido';
                return (
                  <div
                    key={bloco.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isDone
                        ? 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-60'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs hover:border-sky-300 dark:hover:border-sky-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            bloco.tipo === 'revisao'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : bloco.tipo === 'estudo_inicial'
                              ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
                              : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                          }`}>
                            {bloco.tipo === 'revisao' ? `Revisão (${bloco.revisao_ciclo || 'Ciclo'})` : bloco.tipo === 'estudo_inicial' ? 'Estudo Inicial' : 'Questões'}
                          </span>
                          <span className="text-xs text-slate-500 font-medium">
                            {bloco.duracao_minutos} min
                          </span>
                          {bloco.motivo_prioridade && (
                            <span className="text-[11px] text-slate-400 italic">
                              • {bloco.motivo_prioridade}
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {bloco.disciplina_nome}
                        </h4>
                        {bloco.assunto_titulo && (
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            {bloco.assunto_titulo}
                          </p>
                        )}
                      </div>

                      <div>
                        {isDone ? (
                          <span className="flex items-center space-x-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Concluído</span>
                          </span>
                        ) : (
                          <button
                            onClick={() =>
                              setCompleteModalItem({
                                id: bloco.id,
                                title: `Concluir Bloco de ${bloco.disciplina_nome}`,
                                description: bloco.assunto_titulo || bloco.disciplina_nome,
                                isBlock: true,
                                is30dOrMaintenance: bloco.revisao_ciclo === '30d' || bloco.revisao_ciclo === 'manutencao'
                              })
                            }
                            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold transition-all shadow-xs"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Concluir</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Q5: Onde devo concentrar meu esforço? */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
            <Target className="w-4 h-4 text-rose-500" />
            <span>Q5: Onde concentrar esforço?</span>
          </h2>

          <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Prioridades identificadas pelo algoritmo com base em peso oficial da prova, matérias com revisões atrasadas ou baixo índice de acertos:
            </p>

            <div className="space-y-3">
              {ondeConcentrar.map((item: any, idx: number) => (
                <div
                  key={item.id}
                  className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {idx + 1}. {item.nome}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                      {item.grupo === 'Conhecimentos Específicos' ? 'Específica (P2)' : 'Básica (P1)'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                    <span>Cobertura: {item.cobertura}%</span>
                    <span>
                      Rendimento: {item.taxaAcertos !== null ? `${(item.taxaAcertos * 100).toFixed(0)}%` : 'Sem dados'}
                    </span>
                  </div>

                  <div className="text-[11px] font-medium text-rose-600 dark:text-rose-400 flex items-center space-x-1.5">
                    <Target className="w-3.5 h-3.5 shrink-0" />
                    <span>{item.motivoRecomendacao}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {completeModalItem && (
        <QuickCompleteModal
          isOpen={true}
          onClose={() => setCompleteModalItem(null)}
          title={completeModalItem.title}
          itemDescription={completeModalItem.description}
          is30dOrMaintenance={completeModalItem.is30dOrMaintenance}
          onConfirm={handleQuickComplete}
        />
      )}
    </div>
  );
};
