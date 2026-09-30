import React, { useState, useEffect } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Lock,
  Unlock,
  AlertTriangle,
  RotateCcw,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Plus
} from 'lucide-react';
import { QuickCompleteModal } from '../components/QuickCompleteModal';
import { BlocoAgenda } from '../types';

interface AgendaPageProps {
  simulatedDate: string;
  onRefreshGlobal: () => void;
}

export const AgendaPage: React.FC<AgendaPageProps> = ({
  simulatedDate,
  onRefreshGlobal
}) => {
  const [dataSelecionada, setDataSelecionada] = useState(simulatedDate);
  const [blocos, setBlocos] = useState<BlocoAgenda[]>([]);
  const [loading, setLoading] = useState(true);
  const [gerandoAgenda, setGerandoAgenda] = useState(false);
  const [sobrecargas, setSobrecargas] = useState<any[]>([]);
  const [modalConcluirBloco, setModalConcluirBloco] = useState<BlocoAgenda | null>(null);

  // Calcular dias da semana corrente (7 dias em torno da data selecionada)
  const getDiasSemana = (centro: string) => {
    const parts = centro.split('-');
    const base = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 12, 0, 0);
    const dayOfWeek = base.getDay(); // 0=domingo
    // Começar no domingo ou na segunda: vamos começar na segunda (- (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(base);
    monday.setDate(base.getDate() + diffToMonday);

    const dias = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      dias.push(`${y}-${m}-${day}`);
    }
    return dias;
  };

  const diasSemana = getDiasSemana(dataSelecionada);
  const inicioSemana = diasSemana[0];
  const fimSemana = diasSemana[6];

  const loadAgenda = async () => {
    try {
      setLoading(true);
      const { api } = await import('../api/client');
      const res = await api.getAgenda(inicioSemana, fimSemana, simulatedDate);
      setBlocos(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setDataSelecionada(simulatedDate);
  }, [simulatedDate]);

  useEffect(() => {
    loadAgenda();
  }, [dataSelecionada, simulatedDate]);

  const handleGerarAgenda = async () => {
    try {
      setGerandoAgenda(true);
      const { api } = await import('../api/client');
      const dataInicio = inicioSemana < simulatedDate ? inicioSemana : simulatedDate;
      const res = await api.gerarAgenda({
        dataInicio,
        diasParaPlanejar: 7
      }, simulatedDate);

      setSobrecargas(res.sobrecargas || []);
      await loadAgenda();
      onRefreshGlobal();
    } catch (err) {
      console.error(err);
    } finally {
      setGerandoAgenda(false);
    }
  };

  const handleToggleFixado = async (blocoId: string) => {
    const { api } = await import('../api/client');
    await api.toggleFixadoBloco(blocoId);
    await loadAgenda();
  };

  const handleConcluirBloco = async (questaoData: any) => {
    if (!modalConcluirBloco) return;
    const { api } = await import('../api/client');
    await api.concluirBloco(modalConcluirBloco.id, questaoData, simulatedDate);
    await loadAgenda();
    onRefreshGlobal();
  };

  const getBlocoDate = (b: BlocoAgenda) => b.data || (b as any).data_agendada || '';
  const blocosDoDia = blocos.filter((b) => getBlocoDate(b) === dataSelecionada);
  const minutosTotaisHoje = blocosDoDia.reduce((acc, b) => acc + b.duracao_minutos, 0);
  const blocosConcluidosHoje = blocosDoDia.filter((b) => b.status === 'concluido').length;

  const nomesDias = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
            <CalendarDays className="w-5 h-5 text-sky-600" />
            <span>Agenda Semanal & Rotina Diária</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Distribuição equilibrada entre revisões atrasadas/do dia e avanço de novos conteúdos do edital com proteção contra sobrecarga.
          </p>
        </div>

        <button
          onClick={handleGerarAgenda}
          disabled={gerandoAgenda}
          className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition-all self-start md:self-auto"
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>{gerandoAgenda ? 'Calculando Distribuição...' : 'Distribuir Carga de Estudos'}</span>
        </button>
      </div>

      {/* Alerta de Sobrecarga caso a demanda supere o tempo disponível */}
      {sobrecargas.length > 0 && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 space-y-2">
          <div className="flex items-center space-x-2 font-bold text-sm text-rose-900 dark:text-rose-200">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <span>Alerta de Sobrecarga de Horários</span>
          </div>
          <p className="text-xs text-rose-800 dark:text-rose-300 leading-relaxed">
            A demanda de revisões atrasadas acumuladas supera os horários disponíveis configurados nos seguintes dias:
          </p>
          <div className="space-y-1 text-xs text-rose-900 dark:text-rose-200 font-medium">
            {sobrecargas.map((s, idx) => (
              <div key={idx}>
                • Dia {s.data.split('-').reverse().join('/')}: carga necessária de {s.minutosNecessarios} min excede o tempo configurado em <strong>+{s.excessoMinutos} min</strong>.
              </div>
            ))}
          </div>
          <p className="text-[11px] text-rose-700 dark:text-rose-400 italic">
            O aplicativo não gerou uma agenda silenciosamente inviável. Recomendamos utilizar a <strong>Revisão de Recuperação</strong> para unificar atrasos ou ajustar seus horários nas Configurações.
          </p>
        </div>
      )}

      {/* Navegação Semanal por Dias */}
      <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
          <span>Semana de {inicioSemana.split('-').reverse().join('/')} a {fimSemana.split('-').reverse().join('/')}</span>
          <button
            onClick={() => setDataSelecionada(simulatedDate)}
            className="text-sky-600 dark:text-sky-400 hover:underline"
          >
            Voltar para Hoje ({simulatedDate.split('-').reverse().join('/')})
          </button>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {diasSemana.map((dStr, idx) => {
            const isToday = dStr === simulatedDate;
            const isSelected = dStr === dataSelecionada;
            const blocosDesteDia = blocos.filter((b) => getBlocoDate(b) === dStr);
            const pendentesDesteDia = blocosDesteDia.filter((b) => b.status !== 'concluido').length;
            const dayNum = dStr.split('-')[2];

            return (
              <button
                key={dStr}
                onClick={() => setDataSelecionada(dStr)}
                className={`p-3 rounded-xl border text-center transition-all ${
                  isSelected
                    ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                    : isToday
                    ? 'bg-sky-50 dark:bg-sky-950/50 text-slate-800 dark:text-slate-200 border-sky-200 dark:border-sky-800'
                    : 'bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div className={`text-[10px] font-bold uppercase ${isSelected ? 'text-sky-100' : 'text-slate-400'}`}>
                  {nomesDias[idx]}
                </div>
                <div className="text-lg font-bold my-0.5">{dayNum}</div>
                <div className="text-[10px] font-medium">
                  {blocosDesteDia.length > 0 ? (
                    <span className={isSelected ? 'text-sky-100' : pendentesDesteDia > 0 ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-emerald-600 dark:text-emerald-400'}>
                      {blocosDesteDia.length} bloco{blocosDesteDia.length > 1 ? 's' : ''}
                    </span>
                  ) : (
                    <span className="opacity-40">Folga</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Detalhes do Dia Selecionado */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Atividades de {dataSelecionada.split('-').reverse().join('/')}
            </h2>
            {dataSelecionada === simulatedDate && (
              <span className="text-[10px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 px-2 py-0.5 rounded-full">
                Hoje
              </span>
            )}
          </div>

          <div className="text-xs text-slate-500 font-medium">
            {blocosConcluidosHoje} de {blocosDoDia.length} blocos concluídos • Total: {minutosTotaisHoje} min
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">Carregando blocos da agenda...</div>
        ) : blocosDoDia.length === 0 ? (
          <div className="p-12 text-center rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 text-xs space-y-3">
            <Clock className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
            <p>Nenhum bloco planejado para este dia.</p>
            <button
              onClick={handleGerarAgenda}
              disabled={gerandoAgenda}
              className="px-4 py-2 rounded-lg bg-sky-600 text-white text-xs font-semibold hover:bg-sky-700 transition-colors disabled:opacity-50"
            >
              {gerandoAgenda ? 'Gerando Agenda...' : 'Gerar Agenda Automaticamente'}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {blocosDoDia.map((bloco) => {
              const isDone = bloco.status === 'concluido';
              const isFixed = bloco.fixado === 1;

              return (
                <div
                  key={bloco.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isDone
                      ? 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-60'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          bloco.tipo === 'revisao'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : bloco.tipo === 'estudo_inicial'
                            ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
                            : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                        }`}>
                          {bloco.tipo === 'revisao' ? `Revisão (${bloco.revisao_ciclo || 'Ciclo'})` : bloco.tipo === 'estudo_inicial' ? 'Estudo Inicial' : 'Treino de Questões'}
                        </span>

                        <span className="text-xs text-slate-500 font-medium">
                          {bloco.duracao_minutos} minutos
                        </span>

                        {isFixed && (
                          <span className="flex items-center space-x-1 text-[10px] font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                            <Lock className="w-3 h-3 text-slate-500" />
                            <span>Fixado</span>
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {bloco.disciplina_nome}
                      </h3>

                      {bloco.assunto_titulo && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
                          {bloco.codigo_edital && <span className="font-mono mr-1 text-slate-400">{bloco.codigo_edital}</span>}
                          {bloco.assunto_titulo}
                        </p>
                      )}

                      {bloco.motivo_prioridade && (
                        <p className="text-[11px] text-slate-400 italic">
                          Prioridade: {bloco.motivo_prioridade}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      {/* Botão de Fixar / Desfixar Bloco */}
                      <button
                        onClick={() => handleToggleFixado(bloco.id)}
                        className={`p-2 rounded-lg border text-xs transition-colors ${
                          isFixed
                            ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                            : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                        }`}
                        title={isFixed ? 'Desbloquear bloco para reprogramação' : 'Fixar bloco para nunca ser movido em reprogramações automáticas'}
                      >
                        {isFixed ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                      </button>

                      {/* Botão de Concluir */}
                      {isDone ? (
                        <span className="flex items-center space-x-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Concluído</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => setModalConcluirBloco(bloco)}
                          className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-xs transition-all"
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

      {modalConcluirBloco && (
        <QuickCompleteModal
          isOpen={true}
          onClose={() => setModalConcluirBloco(null)}
          title={`Concluir Bloco: ${modalConcluirBloco.disciplina_nome}`}
          itemDescription={modalConcluirBloco.assunto_titulo || modalConcluirBloco.disciplina_nome || ''}
          is30dOrMaintenance={modalConcluirBloco.revisao_ciclo === '30d' || modalConcluirBloco.revisao_ciclo === 'manutencao'}
          onConfirm={handleConcluirBloco}
        />
      )}
    </div>
  );
};
