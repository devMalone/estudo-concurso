import React, { useState, useEffect } from 'react';
import {
  FileQuestion,
  Plus,
  Trash2,
  Edit2,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Check,
  Filter
} from 'lucide-react';
import { Modal } from '../components/Modal';
import { SessaoQuestao } from '../types';

interface QuestoesPageProps {
  simulatedDate: string;
  onRefreshGlobal: () => void;
}

export const QuestoesPage: React.FC<QuestoesPageProps> = ({
  simulatedDate,
  onRefreshGlobal
}) => {
  const [sessoes, setSessoes] = useState<SessaoQuestao[]>([]);
  const [estatisticas, setEstatisticas] = useState<any | null>(null);
  const [disciplinas, setDisciplinas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [filtroDisciplina, setFiltroDisciplina] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');

  // Modal de Criar / Editar Sessão
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formDisciplinaId, setFormDisciplinaId] = useState('disc-portugues');
  const [formData, setFormData] = useState(simulatedDate);
  const [formTotal, setFormTotal] = useState('');
  const [formAcertos, setFormAcertos] = useState('');
  const [formOrigem, setFormOrigem] = useState('');
  const [formObservacoes, setFormObservacoes] = useState('');
  const [formTipo, setFormTipo] = useState<'treino_avulso' | 'revisao' | 'estudo_inicial' | 'simulado'>('treino_avulso');
  const [erroForm, setErroForm] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const { api } = await import('../api/client');
      const [resSessoes, resStats, resArvore] = await Promise.all([
        api.getQuestoes({
          disciplinaId: filtroDisciplina || undefined,
          tipo: filtroTipo || undefined
        }),
        api.getEstatisticasQuestoes(),
        api.getArvore()
      ]);

      setSessoes(resSessoes.data);
      setEstatisticas(resStats.data);
      setDisciplinas(resArvore.data);
      if (resArvore.data.length > 0 && !formDisciplinaId) {
        setFormDisciplinaId(resArvore.data[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filtroDisciplina, filtroTipo, simulatedDate]);

  const numTotal = parseInt(formTotal, 10);
  const numAcertos = parseInt(formAcertos, 10);
  const totalValido = !isNaN(numTotal) && numTotal > 0;
  const acertosValido = !isNaN(numAcertos) && numAcertos >= 0;
  const errosCalculados = totalValido && acertosValido ? Math.max(0, numTotal - numAcertos) : 0;
  const taxaPercentual = totalValido && acertosValido && numAcertos <= numTotal
    ? Math.round((numAcertos / numTotal) * 100)
    : null;

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroForm(null);

    if (!totalValido) {
      setErroForm('O total de questões deve ser maior que zero.');
      return;
    }
    if (!acertosValido) {
      setErroForm('A quantidade de acertos deve ser maior ou igual a zero.');
      return;
    }
    if (numAcertos > numTotal) {
      setErroForm(`A quantidade de acertos (${numAcertos}) não pode ser superior ao total respondido (${numTotal}).`);
      return;
    }

    try {
      setSalvando(true);
      const { api } = await import('../api/client');

      if (editId) {
        await api.atualizarSessaoQuestoes(editId, {
          data: formData,
          totalQuestoes: numTotal,
          acertos: numAcertos,
          origem: formOrigem || undefined,
          observacoes: formObservacoes || undefined,
          tipo: formTipo
        });
      } else {
        await api.criarSessaoQuestoes({
          disciplinaId: formDisciplinaId,
          data: formData,
          totalQuestoes: numTotal,
          acertos: numAcertos,
          origem: formOrigem || undefined,
          observacoes: formObservacoes || undefined,
          tipo: formTipo
        }, simulatedDate);
      }

      setModalOpen(false);
      setEditId(null);
      setFormTotal('');
      setFormAcertos('');
      setFormOrigem('');
      setFormObservacoes('');
      await loadData();
      onRefreshGlobal();
    } catch (err: any) {
      setErroForm(err.message || 'Erro ao registrar sessão.');
    } finally {
      setSalvando(false);
    }
  };

  const handleExcluir = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta sessão de questões? As estatísticas serão recalculadas.')) return;
    const { api } = await import('../api/client');
    await api.excluirSessaoQuestoes(id);
    await loadData();
    onRefreshGlobal();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
            <FileQuestion className="w-5 h-5 text-sky-600" />
            <span>Banco de Treino & Histórico de Questões</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Registro detalhado de questões praticadas em materiais ou sites externos. Histórico segregado com recálculo automático de taxa ponderada.
          </p>
        </div>

        <button
          onClick={() => {
            setEditId(null);
            setFormData(simulatedDate);
            setFormTotal('');
            setFormAcertos('');
            setFormOrigem('');
            setFormObservacoes('');
            setErroForm(null);
            setModalOpen(true);
          }}
          className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-xs transition-all self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar Sessão de Questões</span>
        </button>
      </div>

      {/* Cards de Métricas Gerais Ponderadas */}
      {estatisticas && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="text-xs font-medium text-slate-500">Total Respondidas</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
              {estatisticas.total_questoes}
            </div>
          </div>
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="text-xs font-medium text-slate-500">Acertos</div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              {estatisticas.total_acertos}
            </div>
          </div>
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="text-xs font-medium text-slate-500">Erros</div>
            <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">
              {estatisticas.total_erros}
            </div>
          </div>
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="text-xs font-medium text-slate-500 flex items-center justify-between">
              <span>Taxa Geral Ponderada</span>
              <TrendingUp className="w-3.5 h-3.5 text-sky-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
              {estatisticas.taxa_geral !== null ? (
                `${(estatisticas.taxa_geral * 100).toFixed(1)}%`
              ) : (
                <span className="text-base font-normal text-slate-400">Sem dados</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filtros e Tabela de Histórico */}
      <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Filtrar Histórico:</span>
          </div>

          <div className="flex items-center space-x-3 w-full md:w-auto">
            <select
              value={filtroDisciplina}
              onChange={(e) => setFiltroDisciplina(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs"
            >
              <option value="">Todas as Disciplinas</option>
              {disciplinas.map((d) => (
                <option key={d.id} value={d.id}>{d.nome}</option>
              ))}
            </select>

            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs"
            >
              <option value="">Todos os Tipos</option>
              <option value="treino_avulso">Treino Avulso</option>
              <option value="revisao">Revisão</option>
              <option value="estudo_inicial">Estudo Inicial</option>
            </select>
          </div>
        </div>

        {/* Tabela */}
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-xs">Carregando sessões...</div>
        ) : sessoes.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            Nenhuma sessão de questões encontrada com os filtros selecionados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Data</th>
                  <th className="py-2.5 px-3">Disciplina / Assunto</th>
                  <th className="py-2.5 px-3">Tipo</th>
                  <th className="py-2.5 px-3 text-center">Respondidas</th>
                  <th className="py-2.5 px-3 text-center">Acertos</th>
                  <th className="py-2.5 px-3 text-center">Erros</th>
                  <th className="py-2.5 px-3 text-right">Taxa</th>
                  <th className="py-2.5 px-3">Origem</th>
                  <th className="py-2.5 px-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {sessoes.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-2.5 px-3 font-medium text-slate-700 dark:text-slate-300">
                      {s.data.split('-').reverse().join('/')}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {s.disciplina_nome}
                      </div>
                      {s.assunto_titulo && (
                        <div className="text-[11px] text-slate-500 truncate max-w-xs">
                          {s.assunto_titulo}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {s.tipo === 'revisao' ? 'Revisão' : s.tipo === 'estudo_inicial' ? 'Estudo' : 'Treino'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-slate-800 dark:text-slate-200">
                      {s.total_questoes}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-emerald-600 dark:text-emerald-400">
                      {s.acertos}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-rose-600 dark:text-rose-400">
                      {s.erros}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold">
                      <span className={s.taxa_acerto >= 0.8 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>
                        {(s.taxa_acerto * 100).toFixed(0)}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">
                      {s.origem || '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right space-x-1">
                      <button
                        onClick={() => handleExcluir(s.id)}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 transition-colors"
                        title="Excluir sessão"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Registro de Questões */}
      {modalOpen && (
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Registrar Sessão de Treino"
        >
          <form onSubmit={handleSalvar} className="space-y-4">
            {erroForm && (
              <div className="p-3 rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 text-xs border border-rose-200 dark:border-rose-900 flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{erroForm}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Disciplina *
              </label>
              <select
                value={formDisciplinaId}
                onChange={(e) => setFormDisciplinaId(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                required
              >
                {disciplinas.map((d) => (
                  <option key={d.id} value={d.id}>{d.nome}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Data da Resolução *
                </label>
                <input
                  type="date"
                  value={formData}
                  onChange={(e) => setFormData(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Tipo de Atividade
                </label>
                <select
                  value={formTipo}
                  onChange={(e) => setFormTipo(e.target.value as any)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                >
                  <option value="treino_avulso">Treino Avulso</option>
                  <option value="revisao">Revisão</option>
                  <option value="estudo_inicial">Estudo Inicial</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Total de Questões Respondidas *
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder="Ex: 30"
                  value={formTotal}
                  onChange={(e) => setFormTotal(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Acertos Obtidos *
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="Ex: 26"
                  value={formAcertos}
                  onChange={(e) => setFormAcertos(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                  required
                />
              </div>
            </div>

            {totalValido && acertosValido && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-sky-50 dark:bg-sky-950/60 border border-sky-100 dark:border-sky-900 text-xs">
                <div>
                  <span className="text-slate-500">Erros calculados: </span>
                  <span className="font-bold text-rose-600">{errosCalculados}</span>
                </div>
                <div>
                  <span className="text-slate-500">Taxa de Acerto: </span>
                  <span className={`font-bold text-sm ${taxaPercentual !== null && taxaPercentual >= 80 ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {taxaPercentual}%
                  </span>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Origem (Site, Livro ou Caderno)
              </label>
              <input
                type="text"
                placeholder="Ex: TEC Concursos, QConcursos, Prova Anterior..."
                value={formOrigem}
                onChange={(e) => setFormOrigem(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Observações
              </label>
              <textarea
                rows={2}
                placeholder="Ex: Muitas pegadinhas sobre prazos de recurso..."
                value={formObservacoes}
                onChange={(e) => setFormObservacoes(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-3 border-t border-slate-200 dark:border-slate-800">
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
                {salvando ? 'Salvando...' : 'Salvar Registro'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
