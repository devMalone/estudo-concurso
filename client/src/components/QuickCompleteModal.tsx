import React, { useState } from 'react';
import { Modal } from './Modal';
import { CheckCircle2, FileQuestion, Sparkles, AlertTriangle } from 'lucide-react';

interface QuickCompleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  itemDescription: string;
  is30dOrMaintenance?: boolean;
  onConfirm: (data: {
    totalQuestoes?: number;
    acertos?: number;
    origem?: string;
    observacoes?: string;
  }) => Promise<void>;
}

export const QuickCompleteModal: React.FC<QuickCompleteModalProps> = ({
  isOpen,
  onClose,
  title,
  itemDescription,
  is30dOrMaintenance = false,
  onConfirm
}) => {
  const [comQuestoes, setComQuestoes] = useState(false);
  const [total, setTotal] = useState<string>('');
  const [acertos, setAcertos] = useState<string>('');
  const [origem, setOrigem] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const numTotal = parseInt(total, 10);
  const numAcertos = parseInt(acertos, 10);

  const totalValido = !isNaN(numTotal) && numTotal > 0;
  const acertosValido = !isNaN(numAcertos) && numAcertos >= 0;
  const errosCalculados = totalValido && acertosValido ? Math.max(0, numTotal - numAcertos) : 0;
  const taxaPercentual = totalValido && acertosValido && numAcertos <= numTotal
    ? Math.round((numAcertos / numTotal) * 100)
    : null;

  // Previsão da heurística se for revisão de 30d ou manutenção
  let previaHeuristica = '';
  if (is30dOrMaintenance) {
    if (!comQuestoes || !totalValido || numTotal < 5) {
      previaHeuristica = 'Sem questões ou amostra < 5: o intervalo configurado será mantido para o próximo ciclo.';
    } else if (taxaPercentual !== null) {
      if (taxaPercentual < 70) {
        previaHeuristica = `Taxa de ${taxaPercentual}% (< 70%): o sistema agendará a próxima revisão em 7 dias para reforço.`;
      } else if (taxaPercentual < 85) {
        previaHeuristica = `Taxa de ${taxaPercentual}% (70%-84%): o sistema agendará a próxima revisão em 15 dias.`;
      } else {
        previaHeuristica = `Taxa de ${taxaPercentual}% (>= 85%): o sistema agendará a próxima revisão em 30 dias (ou 45 dias se consistente).`;
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    if (comQuestoes) {
      if (!totalValido) {
        setErro('Informe um total válido de questões respondidas (maior que zero).');
        return;
      }
      if (!acertosValido) {
        setErro('Informe a quantidade de acertos (maior ou igual a zero).');
        return;
      }
      if (numAcertos > numTotal) {
        setErro(`A quantidade de acertos (${numAcertos}) não pode ser maior que o total respondido (${numTotal}).`);
        return;
      }
    }

    try {
      setLoading(true);
      await onConfirm({
        totalQuestoes: comQuestoes ? numTotal : undefined,
        acertos: comQuestoes ? numAcertos : undefined,
        origem: comQuestoes ? origem : undefined,
        observacoes: observacoes || undefined
      });
      onClose();
    } catch (err: any) {
      setErro(err.message || 'Falha ao registrar conclusão.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300">
          <span className="font-semibold text-slate-900 dark:text-slate-100">Item: </span>
          {itemDescription}
        </div>

        {erro && (
          <div className="p-3 rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 text-xs border border-rose-200 dark:border-rose-900 flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{erro}</span>
          </div>
        )}

        <div className="space-y-3">
          <label className="flex items-center space-x-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={comQuestoes}
              onChange={(e) => setComQuestoes(e.target.checked)}
              className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 border-slate-300 dark:border-slate-700"
            />
            <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
              Registrar sessão de questões desta atividade
            </span>
          </label>

          {comQuestoes && (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-3 animate-in fade-in duration-150">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Total Respondidas *
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Ex: 20"
                    value={total}
                    onChange={(e) => setTotal(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    required={comQuestoes}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Acertos *
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Ex: 17"
                    value={acertos}
                    onChange={(e) => setAcertos(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    required={comQuestoes}
                  />
                </div>
              </div>

              {totalValido && acertosValido && (
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-sky-50 dark:bg-sky-950/60 border border-sky-100 dark:border-sky-900 text-xs">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Erros calculados: </span>
                    <span className="font-semibold text-rose-600 dark:text-rose-400">{errosCalculados}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Taxa de Acerto: </span>
                    <span className={`font-bold ${taxaPercentual !== null && taxaPercentual >= 80 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                      {taxaPercentual}%
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Origem das Questões (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: QConcursos, TEC Concursos, Prova Anterior..."
                  value={origem}
                  onChange={(e) => setOrigem(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Anotações e Materiais (Opcional)
            </label>
            <textarea
              rows={2}
              placeholder="Ex: Focar mais em prazos da Lei 8.112 ou contas patrimoniais do Balanço..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
            />
          </div>

          {previaHeuristica && (
            <div className="p-3 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-900 text-xs text-indigo-900 dark:text-indigo-200 flex items-start space-x-2">
              <Sparkles className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Regra de Manutenção: </span>
                <span>{previaHeuristica}</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold shadow-sm transition-all disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{loading ? 'Salvando...' : 'Confirmar Conclusão'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
