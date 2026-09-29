import React, { useState, useEffect } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Search,
  BookOpen,
  CheckCircle2,
  Clock,
  RotateCcw,
  FileText,
  Filter,
  Check,
  ExternalLink,
  Layers,
  Plus,
  Trash2,
  Target,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { Modal } from '../components/Modal';
import { DisciplinaTree, AssuntoNode, SessaoEstudo } from '../types';

interface ArvoreEditalPageProps {
  simulatedDate: string;
  onRefreshGlobal: () => void;
}

export const ArvoreEditalPage: React.FC<ArvoreEditalPageProps> = ({
  simulatedDate,
  onRefreshGlobal
}) => {
  const [arvore, setArvore] = useState<DisciplinaTree[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'nao_iniciados' | 'em_estudo' | 'concluidos' | 'revisao_pendente'>('todos');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [assuntoSelecionado, setAssuntoSelecionado] = useState<any | null>(null);
  const [modalDetalhesOpen, setModalDetalhesOpen] = useState(false);
  const [salvandoEstudo, setSalvandoEstudo] = useState(false);
  const [sucessoFeedback, setSucessoFeedback] = useState<string | null>(null);

  // Form de estudo
  const [formConcluido, setFormConcluido] = useState(false);
  const [formDataEstudo, setFormDataEstudo] = useState(simulatedDate);
  const [formTempo, setFormTempo] = useState(50);
  const [formQuestoes, setFormQuestoes] = useState(0);
  const [formAcertos, setFormAcertos] = useState(0);
  const [formAnotacoes, setFormAnotacoes] = useState('');

  const loadArvore = async () => {
    try {
      setLoading(true);
      const { api } = await import('../api/client');
      const res = await api.getArvore();
      setArvore(res.data);

      // Expandir primeiras disciplinas por padrão
      const initialExpanded = new Set<string>();
      for (const d of res.data) {
        initialExpanded.add(`disc-${d.id}`);
        for (const a of d.assuntos) {
          if (a.children && a.children.length > 0) {
            initialExpanded.add(a.id);
          }
        }
      }
      setExpandedNodes(initialExpanded);
    } catch (err) {
      console.error('Erro ao carregar árvore:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadArvore();
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const abrirDetalhes = async (assuntoId: string) => {
    try {
      const { api } = await import('../api/client');
      const res = await api.getAssuntoDetalhes(assuntoId);
      setAssuntoSelecionado(res.data);
      const e = res.data.estudo;
      setFormConcluido(Boolean(e?.concluido));
      setFormDataEstudo(simulatedDate);
      setFormTempo(50);
      setFormQuestoes(0);
      setFormAcertos(0);
      setFormAnotacoes('');
      setSucessoFeedback(null);
      setModalDetalhesOpen(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSalvarEstudo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assuntoSelecionado) return;
    try {
      setSalvandoEstudo(true);
      setSucessoFeedback(null);
      const { api } = await import('../api/client');
      await api.registrarSessaoEstudo(assuntoSelecionado.assunto.id, {
        data: formDataEstudo,
        tempoMinutos: formTempo,
        questoesRealizadas: formQuestoes,
        questoesAcertos: formAcertos,
        anotacoes: formAnotacoes,
        concluirTopico: formConcluido
      }, simulatedDate);

      await loadArvore();
      const updated = await api.getAssuntoDetalhes(assuntoSelecionado.assunto.id);
      setAssuntoSelecionado(updated.data);

      setSucessoFeedback(
        formConcluido
          ? `Estudo de ${formTempo} min registrado e tópico CONCLUÍDO no edital! Revisões periódicas agendadas.`
          : `Sessão de ${formTempo} min registrada com sucesso! Tópico segue em andamento para as próximas aulas.`
      );
      setFormAnotacoes('');
      setFormQuestoes(0);
      setFormAcertos(0);
      onRefreshGlobal();
    } catch (err) {
      console.error(err);
    } finally {
      setSalvandoEstudo(false);
    }
  };

  const handleExcluirSessao = async (sessaoId: string) => {
    if (!window.confirm('Tem certeza que deseja remover esta sessão de estudo? O tempo total acumulado será recalculado.')) {
      return;
    }
    try {
      const { api } = await import('../api/client');
      await api.excluirSessaoEstudo(sessaoId);
      await loadArvore();
      if (assuntoSelecionado) {
        const updated = await api.getAssuntoDetalhes(assuntoSelecionado.assunto.id);
        setAssuntoSelecionado(updated.data);
      }
      onRefreshGlobal();
    } catch (err) {
      console.error(err);
    }
  };

  // Filtragem recursiva respeitando o contexto
  const filtrarAssunto = (node: AssuntoNode): boolean => {
    // Busca por texto no nó ou nos filhos
    const matchBusca =
      !busca ||
      node.titulo.toLowerCase().includes(busca.toLowerCase()) ||
      node.codigo_edital.toLowerCase().includes(busca.toLowerCase());

    // Filtro por status
    let matchFiltro = true;
    if (filtroStatus === 'nao_iniciados') {
      matchFiltro = node.is_leaf ? (!node.estudo_concluido && !node.em_estudo && node.tempo_minutos === 0) : true;
    } else if (filtroStatus === 'em_estudo') {
      matchFiltro = node.is_leaf ? (!node.estudo_concluido && (node.em_estudo || node.tempo_minutos > 0)) : true;
    } else if (filtroStatus === 'concluidos') {
      matchFiltro = node.is_leaf ? node.estudo_concluido : true;
    } else if (filtroStatus === 'revisao_pendente') {
      matchFiltro = node.revisao_pendente;
    }

    const filhosFiltrados = node.children.some(filtrarAssunto);
    return (matchBusca && matchFiltro) || filhosFiltrados;
  };

  const renderNode = (node: AssuntoNode, depth: number = 0) => {
    if (!filtrarAssunto(node)) return null;

    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes.has(node.id);

    return (
      <div key={node.id} className="select-none">
        <div
          className={`group flex items-center justify-between py-2 px-3 rounded-lg text-sm transition-all hover:bg-slate-100 dark:hover:bg-slate-800/60 ${
            node.is_leaf ? 'cursor-pointer' : 'cursor-pointer'
          }`}
          style={{ paddingLeft: `${Math.max(12, depth * 24)}px` }}
          onClick={() => {
            if (hasChildren) {
              toggleExpand(node.id);
            } else {
              abrirDetalhes(node.id);
            }
          }}
        >
          <div className="flex items-center space-x-2.5 flex-1 min-w-0 pr-3">
            {hasChildren ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(node.id);
                }}
                className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            ) : (
              <div className="w-6 flex items-center justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
              </div>
            )}

            <span className="font-mono text-xs font-semibold text-slate-400 shrink-0">
              {node.codigo_edital}
            </span>

            <span className={`truncate text-sm ${node.is_leaf ? (node.estudo_concluido ? 'text-slate-500 dark:text-slate-400 line-through decoration-slate-300 dark:decoration-slate-700' : 'text-slate-800 dark:text-slate-200 font-medium') : 'font-semibold text-slate-900 dark:text-slate-100'}`}>
              {node.titulo}
            </span>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {node.revisao_pendente && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                Revisão Pendente
              </span>
            )}

            {node.is_leaf && (
              <div className="flex items-center space-x-1.5">
                {node.estudo_concluido ? (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center space-x-1">
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span>Concluído {node.tempo_minutos > 0 ? `• ${node.tempo_minutos}min` : ''}</span>
                  </span>
                ) : (node.em_estudo || node.tempo_minutos > 0) ? (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200 dark:border-sky-800 flex items-center space-x-1">
                    <Clock className="w-3 h-3 text-sky-600" />
                    <span>Em Estudo • {node.tempo_minutos}min {node.total_sessoes ? `(${node.total_sessoes}x)` : ''}</span>
                  </span>
                ) : null}

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    abrirDetalhes(node.id);
                  }}
                  className={`p-1.5 px-2.5 rounded-md text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                    node.estudo_concluido
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      : (node.em_estudo || node.tempo_minutos > 0)
                      ? 'bg-sky-600 hover:bg-sky-700 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-sky-600 hover:text-white text-slate-700 dark:bg-slate-800 dark:text-slate-300 shadow-xs'
                  }`}
                  title="Registrar sessão de estudo ou ver detalhes"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>{node.estudo_concluido ? 'Ver Estudo' : 'Registrar Estudo'}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="space-y-0.5">
            {node.children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const totalMinutosAcumulados = assuntoSelecionado?.estudo?.tempo_minutos || 0;
  const totalSessoesAssunto = assuntoSelecionado?.sessoesEstudo?.length || 0;
  const isConcluidoAssunto = Boolean(assuntoSelecionado?.estudo?.concluido);

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Conteúdo Programático do Edital
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Árvore hierárquica fiel ao Edital BACEN 2013 Técnico. Registre suas aulas e tempo estudado sem precisar concluir o tópico antes da hora.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              const allIds = new Set<string>();
              for (const d of arvore) {
                allIds.add(`disc-${d.id}`);
                const addRecursively = (n: AssuntoNode) => {
                  if (n.children && n.children.length > 0) {
                    allIds.add(n.id);
                    n.children.forEach(addRecursively);
                  }
                };
                d.assuntos.forEach(addRecursively);
              }
              setExpandedNodes(allIds);
            }}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Expandir Tudo
          </button>
          <button
            onClick={() => setExpandedNodes(new Set())}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Recolher Tudo
          </button>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Pesquisar tópico ou código do edital..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center space-x-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {[
            { id: 'todos', label: 'Todos os Tópicos' },
            { id: 'nao_iniciados', label: 'Não Iniciados' },
            { id: 'em_estudo', label: 'Em Andamento' },
            { id: 'concluidos', label: 'Concluídos' },
            { id: 'revisao_pendente', label: 'Revisão Pendente' }
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFiltroStatus(f.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                filtroStatus === f.id
                  ? 'bg-sky-600 text-white font-semibold shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Árvore de Disciplinas e Tópicos */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs">Carregando árvore de matérias...</div>
      ) : (
        <div className="space-y-4">
          {arvore.map((disc) => {
            const discExpanded = expandedNodes.has(`disc-${disc.id}`);
            return (
              <div
                key={disc.id}
                className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden"
              >
                {/* Cabeçalho da Disciplina */}
                <div
                  onClick={() => toggleExpand(`disc-${disc.id}`)}
                  className="p-4 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between cursor-pointer select-none"
                >
                  <div className="flex items-center space-x-3">
                    <button type="button" className="p-1 rounded text-slate-400">
                      {discExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                          {disc.nome}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          {disc.grupo}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {disc.topicos_estudados} de {disc.total_topicos_folha} tópicos concluídos • Peso oficial {disc.peso}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-right hidden sm:block">
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {disc.percentual_cobertura}%
                      </div>
                      <div className="w-24 bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden mt-1">
                        <div
                          className="bg-sky-600 h-full rounded-full transition-all"
                          style={{ width: `${disc.percentual_cobertura}%` }}
                        />
                      </div>
                    </div>

                    {disc.revisoes_atrasadas > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                        {disc.revisoes_atrasadas} revisão atrasada
                      </span>
                    )}
                  </div>
                </div>

                {/* Conteúdo da Disciplina */}
                {discExpanded && (
                  <div className="p-3 space-y-0.5">
                    {disc.assuntos.map((node) => renderNode(node, 0))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Detalhes e Registro de Estudo */}
      {modalDetalhesOpen && assuntoSelecionado && (
        <Modal
          isOpen={modalDetalhesOpen}
          onClose={() => setModalDetalhesOpen(false)}
          title={`Assunto: ${assuntoSelecionado.assunto.codigo_edital} - ${assuntoSelecionado.assunto.titulo}`}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-5">
            {/* Breadcrumb de Contexto */}
            <div className="flex items-center space-x-1.5 text-xs text-slate-500 dark:text-slate-400 overflow-x-auto py-1">
              {assuntoSelecionado.breadcrumb.map((b: any, idx: number) => (
                <React.Fragment key={b.id}>
                  {idx > 0 && <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />}
                  <span className={idx === assuntoSelecionado.breadcrumb.length - 1 ? 'font-semibold text-slate-800 dark:text-slate-200' : ''}>
                    {b.titulo}
                  </span>
                </React.Fragment>
              ))}
            </div>

            {/* Trecho Oficial do Edital */}
            {assuntoSelecionado.assunto.trecho_original_edital && (
              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                <div className="flex items-center justify-between text-slate-500 font-semibold text-[11px]">
                  <span>Trecho Original do Edital (Página {assuntoSelecionado.assunto.pagina_edital || 'Edital'})</span>
                  <span className="text-[10px] uppercase font-bold text-sky-600">Oficial</span>
                </div>
                <p className="text-slate-700 dark:text-slate-300 font-mono text-xs leading-relaxed">
                  "{assuntoSelecionado.assunto.trecho_original_edital}"
                </p>
              </div>
            )}

            {/* Banner de Status Atual do Tópico */}
            <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs ${
              isConcluidoAssunto
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-900 dark:text-emerald-200'
                : totalMinutosAcumulados > 0
                ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-900 text-sky-900 dark:text-sky-200'
                : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
            }`}>
              <div className="flex items-center space-x-2.5">
                {isConcluidoAssunto ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : totalMinutosAcumulados > 0 ? (
                  <Clock className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0" />
                ) : (
                  <BookOpen className="w-5 h-5 text-slate-400 shrink-0" />
                )}
                <div>
                  <div className="font-bold text-sm">
                    {isConcluidoAssunto
                      ? 'Tópico 100% Concluído no Edital'
                      : totalMinutosAcumulados > 0
                      ? 'Estudo em Andamento'
                      : 'Tópico Não Iniciado'}
                  </div>
                  <div className="text-[11px] opacity-80 mt-0.5">
                    {totalMinutosAcumulados > 0 ? (
                      <span>
                        Total acumulado: <strong>{totalMinutosAcumulados} minutos</strong> ({Math.round((totalMinutosAcumulados / 60) * 10) / 10}h) em <strong>{totalSessoesAssunto} sessão(ões)</strong>
                      </span>
                    ) : (
                      'Nenhuma aula ou sessão registrada para este tópico ainda.'
                    )}
                  </div>
                </div>
              </div>

              {isConcluidoAssunto && (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-600 text-white shrink-0">
                  Concluído
                </span>
              )}
            </div>

            {/* Feedback de Sucesso */}
            {sucessoFeedback && (
              <div className="p-3 rounded-lg bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800 text-xs flex items-center space-x-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{sucessoFeedback}</span>
              </div>
            )}

            {/* Formulário: Registrar Sessão de Estudo */}
            <form onSubmit={handleSalvarEstudo} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700/60 pb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center space-x-1.5">
                  <Plus className="w-4 h-4 text-sky-600" />
                  <span>Registrar Sessão de Estudo</span>
                </h4>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Soma no painel semanal e no tópico
                </span>
              </div>

              {/* Data e Tempo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center space-x-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Data do Estudo</span>
                  </label>
                  <input
                    type="date"
                    value={formDataEstudo}
                    onChange={(e) => setFormDataEstudo(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Tempo Estudado (minutos)</span>
                    </span>
                    <span className="text-[11px] font-bold text-sky-600">
                      {formTempo} min ({Math.round((formTempo / 60) * 10) / 10}h)
                    </span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formTempo}
                    onChange={(e) => setFormTempo(parseInt(e.target.value || '0', 10))}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    required
                  />
                  {/* Atalhos rápidos de tempo */}
                  <div className="flex items-center space-x-1 mt-1.5 flex-wrap gap-1">
                    {[
                      { l: '+25m', v: 25 },
                      { l: '+30m', v: 30 },
                      { l: '50m (Bacen)', v: 50 },
                      { l: '+60m', v: 60 },
                      { l: '+90m', v: 90 }
                    ].map((chip) => (
                      <button
                        key={chip.l}
                        type="button"
                        onClick={() => setFormTempo(chip.v)}
                        className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-sky-100 hover:text-sky-700 transition-colors"
                      >
                        {chip.l}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Questões Realizadas e Acertos */}
              <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
                    <Target className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Resolução de Questões Deste Tópico (Opcional)</span>
                  </span>
                  {formQuestoes > 0 && (
                    <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                      Rendimento: {formQuestoes > 0 ? `${((formAcertos / formQuestoes) * 100).toFixed(0)}%` : '0%'}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Total de Questões Feitas
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formQuestoes}
                      onChange={(e) => {
                        const val = parseInt(e.target.value || '0', 10);
                        setFormQuestoes(val);
                        if (formAcertos > val) setFormAcertos(val);
                      }}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Acertos
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={formQuestoes}
                      disabled={formQuestoes === 0}
                      value={formAcertos}
                      onChange={(e) => {
                        const val = parseInt(e.target.value || '0', 10);
                        setFormAcertos(Math.min(formQuestoes, Math.max(0, val)));
                      }}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs disabled:opacity-40"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              {/* Anotações */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Observações / Anotações da Aula ou Estudo
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Assisti aulas 1 a 3 (tipologia textual e inferência); anotei pontos de atenção..."
                  value={formAnotacoes}
                  onChange={(e) => setFormAnotacoes(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              {/* Opção de Concluir o Tópico */}
              <div className="p-3 rounded-lg bg-sky-50/70 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900 space-y-1">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formConcluido}
                    onChange={(e) => setFormConcluido(e.target.checked)}
                    className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500"
                  />
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Marcar este tópico como 100% concluído no edital
                  </span>
                </label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-6 leading-relaxed">
                  Deixe desmarcado se você ainda for estudar outras aulas deste tópico (ex: faltam mais aulas do cursinho). O tempo e questões serão somados normalmente ao seu painel e histórico! Marque apenas quando finalizar o assunto para agendar as revisões periódicas (D+7, D+15 e D+30).
                </p>
              </div>

              {/* Botão de Envio */}
              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={salvandoEstudo}
                  className="px-5 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-sm disabled:opacity-50 transition-all flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>{salvandoEstudo ? 'Registrando...' : 'Registrar Estudo'}</span>
                </button>
              </div>
            </form>

            {/* Histórico de Sessões de Estudo */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center space-x-1.5">
                  <Clock className="w-4 h-4 text-slate-500" />
                  <span>Histórico de Sessões Deste Tópico</span>
                </h4>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {assuntoSelecionado.sessoesEstudo?.length || 0} registro(s)
                </span>
              </div>

              {(!assuntoSelecionado.sessoesEstudo || assuntoSelecionado.sessoesEstudo.length === 0) ? (
                <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
                  Nenhuma sessão de estudo detalhada registrada ainda. Registre seu primeiro bloco acima!
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {assuntoSelecionado.sessoesEstudo.map((sessao: SessaoEstudo) => {
                    const dataFormatada = sessao.data.split('-').reverse().join('/');
                    return (
                      <div
                        key={sessao.id}
                        className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1.5 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {dataFormatada}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300">
                              {sessao.tempo_minutos} min
                            </span>
                            {sessao.questoes_realizadas > 0 && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                                {sessao.questoes_realizadas} questões ({sessao.questoes_acertos} acertos)
                              </span>
                            )}
                            {sessao.concluiu_topico === 1 && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                Concluiu tópico
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleExcluirSessao(sessao.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                            title="Excluir este registro de estudo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {sessao.anotacoes && (
                          <p className="text-slate-600 dark:text-slate-400 text-xs italic pl-2 border-l-2 border-slate-200 dark:border-slate-700">
                            "{sessao.anotacoes}"
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Ciclos de Revisão Gerados */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                Ciclos de Revisão Deste Assunto
              </h4>
              {assuntoSelecionado.revisoes.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Nenhuma revisão agendada ainda. Quando você marcar o tópico como concluído, os ciclos automáticos de 7, 15 e 30 dias serão gerados.
                </p>
              ) : (
                <div className="space-y-2">
                  {assuntoSelecionado.revisoes.map((rev: any) => (
                    <div
                      key={rev.id}
                      className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {rev.ciclo === 'manutencao' ? `Manutenção #${rev.numero_ciclo_manutencao}` : `Revisão ${rev.ciclo}`}
                        </span>
                        <span className="text-slate-500">• Prevista: {rev.data_prevista.split('-').reverse().join('/')}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        rev.status === 'concluida'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : rev.status === 'atrasada'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          : rev.status === 'disponivel'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                      }`}>
                        {rev.status.toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
