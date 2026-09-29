import seedRaw from '../data/seedData.json';
import { createClient } from '@supabase/supabase-js';

const seedData = seedRaw as {
  concurso: any;
  etapas: any[];
  disciplinas: any[];
  assuntos: any[];
};

// Chaves do LocalStorage
const LS_KEYS = {
  CONCURSO: 'concurso_dados',
  ESTUDOS: 'estudos_lista',
  SESSOES_ESTUDO: 'sessoes_estudo_lista',
  REVISOES: 'revisoes_lista',
  AGENDA: 'agenda_blocos_lista',
  QUESTOES: 'questoes_sessoes_lista',
  SIMULADOS: 'simulados_lista',
  CONFIG: 'concurso_config',
  SUPABASE_SYNC: 'concurso_supabase_config'
};

function getItem<T>(key: string, defaultValue: T): T {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setItem(key: string, value: any): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Erro ao salvar no localStorage:', e);
  }
}

// Utilitários de data
function getToday(customDate?: string): string {
  if (customDate) return customDate;
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

function getWeekRange(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const day = dt.getDay(); // 0 Dom, 1 Seg, ..., 6 Sab
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const monday = new Date(y, m - 1, d + diffToMonday);
  const sunday = new Date(y, m - 1, d + diffToMonday + 6);

  const format = (dObj: Date) => {
    const yr = dObj.getFullYear();
    const mn = String(dObj.getMonth() + 1).padStart(2, '0');
    const dy = String(dObj.getDate()).padStart(2, '0');
    return `${yr}-${mn}-${dy}`;
  };

  return {
    inicioSemana: format(monday),
    fimSemana: format(sunday)
  };
}

export const browserEngine = {
  // Concurso
  getConcurso() {
    const custom = getItem(LS_KEYS.CONCURSO, null);
    const concurso = custom || seedData.concurso;

    // Calcular dias para a prova
    let diasParaProva: number | null = null;
    if (concurso.data_prova) {
      const hoje = new Date(getToday());
      const prova = new Date(concurso.data_prova);
      const diffTime = prova.getTime() - hoje.getTime();
      diasParaProva = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    return {
      success: true,
      concurso: {
        id: concurso.id,
        nome: concurso.nome,
        orgao: concurso.orgao,
        banca: concurso.banca,
        cargo: concurso.cargo,
        area: concurso.area,
        dataProva: concurso.data_prova,
        dataProvaEstimada: Boolean(concurso.data_prova_estimada),
        diasParaProva
      },
      etapas: seedData.etapas
    };
  },

  updateDataProva(dataProva: string, estimada: boolean) {
    const conc = getItem(LS_KEYS.CONCURSO, { ...seedData.concurso });
    conc.data_prova = dataProva;
    conc.data_prova_estimada = estimada ? 1 : 0;
    setItem(LS_KEYS.CONCURSO, conc);
    return { success: true };
  },

  // Árvore do Edital
  getArvore() {
    const estudos = getItem<any[]>(LS_KEYS.ESTUDOS, []);
    const sessoesEstudo = getItem<any[]>(LS_KEYS.SESSOES_ESTUDO, []);
    const questoes = getItem<any[]>(LS_KEYS.QUESTOES, []);

    // Mapa de estudos por assunto_id
    const estudosMap = new Map<string, any>();
    for (const e of estudos) {
      estudosMap.set(e.assunto_id, e);
    }

    // Mapa de sessões por assunto_id
    const sessoesMap = new Map<string, any[]>();
    for (const s of sessoesEstudo) {
      if (!sessoesMap.has(s.assunto_id)) sessoesMap.set(s.assunto_id, []);
      sessoesMap.get(s.assunto_id)!.push(s);
    }

    // Montar nós de assuntos
    const nodes: any[] = seedData.assuntos.map((a) => {
      const est = estudosMap.get(a.id);
      const sessList = sessoesMap.get(a.id) || [];
      const totalTempoSessoes = sessList.reduce((acc, curr) => acc + (curr.tempo_minutos || 0), 0);
      const totalTempo = (est?.tempo_estudado_minutos || 0) + totalTempoSessoes;
      const concluido = Boolean(est?.concluido);
      const emEstudo = !concluido && (sessList.length > 0 || totalTempo > 0);

      return {
        id: a.id,
        disciplina_id: a.disciplina_id,
        parent_id: a.parent_id,
        codigo_edital: a.codigo_edital,
        titulo: a.titulo,
        nivel: a.nivel,
        ordem: a.ordem,
        peso_edital: a.peso_edital,
        concluido,
        em_estudo: emEstudo,
        data_conclusao: est?.data_conclusao || null,
        total_revisoes: est?.total_revisoes || 0,
        proxima_revisao: est?.proxima_revisao || null,
        tempo_estudado_minutos: totalTempo,
        total_sessoes: sessList.length,
        anotacoes: est?.anotacoes || null,
        questoes_total: 0,
        questoes_acertos: 0,
        children: []
      };
    });

    const nodeMap = new Map<string, any>();
    for (const n of nodes) nodeMap.set(n.id, n);

    const disciplinasTree = seedData.disciplinas.map((d) => {
      const rootAssuntos = nodes.filter((n) => n.disciplina_id === d.id && !n.parent_id);

      // Vincular filhos recursivamente
      const attachChildren = (parent: any) => {
        parent.children = nodes.filter((n) => n.parent_id === parent.id);
        for (const child of parent.children) attachChildren(child);
      };

      for (const root of rootAssuntos) attachChildren(root);

      const todosAssuntosDisc = nodes.filter((n) => n.disciplina_id === d.id);
      const concluidos = todosAssuntosDisc.filter((n) => n.concluido).length;
      const total = todosAssuntosDisc.length;
      const percentual = total > 0 ? Math.round((concluidos / total) * 100) : 0;

      return {
        id: d.id,
        nome: d.nome,
        codigo: d.codigo,
        grupo: d.grupo,
        peso: d.peso,
        ordem: d.ordem,
        total_itens_edital: d.total_itens_edital,
        total_assuntos: total,
        assuntos_concluidos: concluidos,
        percentualConcluido: percentual,
        assuntos: rootAssuntos
      };
    });

    return { success: true, data: disciplinasTree };
  },

  getAssuntoDetalhes(id: string) {
    const assunto = seedData.assuntos.find((a) => a.id === id);
    if (!assunto) throw new Error('Assunto não encontrado');

    const disciplina = seedData.disciplinas.find((d) => d.id === assunto.disciplina_id);
    const estudos = getItem<any[]>(LS_KEYS.ESTUDOS, []);
    const est = estudos.find((e) => e.assunto_id === id) || null;

    const sessoesEstudo = getItem<any[]>(LS_KEYS.SESSOES_ESTUDO, []).filter((s) => s.assunto_id === id);
    const questoes = getItem<any[]>(LS_KEYS.QUESTOES, []).filter((q) => q.assunto_id === id);
    const revisoes = getItem<any[]>(LS_KEYS.REVISOES, []).filter((r) => r.assunto_id === id);

    return {
      success: true,
      data: {
        assunto: {
          ...assunto,
          disciplina_nome: disciplina?.nome,
          concluido: Boolean(est?.concluido),
          data_conclusao: est?.data_conclusao,
          tempo_estudado_minutos: est?.tempo_estudado_minutos || 0,
          anotacoes: est?.anotacoes
        },
        estudo: est,
        sessoesEstudo,
        questoes,
        revisoes
      }
    };
  },

  // Registrar Sessão Parcial de Estudo
  registrarSessaoEstudo(id: string, data: any, hoje?: string) {
    const dataRef = data.data || hoje || getToday();
    const tempoMinutos = Math.max(0, Number(data.tempoMinutos) || 0);
    const questoesRealizadas = Math.max(0, Number(data.questoesRealizadas) || 0);
    const questoesAcertos = Math.max(0, Math.min(Number(data.questoesAcertos) || 0, questoesRealizadas));
    const concluirTopico = Boolean(data.concluirTopico);
    const anotacoes = data.anotacoes ? String(data.anotacoes).trim() : null;

    const sessaoId = 'sessao_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const novaSessao = {
      id: sessaoId,
      assunto_id: id,
      data_sessao: dataRef,
      tempo_minutos: tempoMinutos,
      questoes_realizadas: questoesRealizadas,
      questoes_acertos: questoesAcertos,
      anotacoes,
      criado_em: new Date().toISOString()
    };

    const sessoes = getItem<any[]>(LS_KEYS.SESSOES_ESTUDO, []);
    sessoes.unshift(novaSessao);
    setItem(LS_KEYS.SESSOES_ESTUDO, sessoes);

    // Se houve questões, registrar em questoes_sessoes
    if (questoesRealizadas > 0) {
      const sessQuestoes = getItem<any[]>(LS_KEYS.QUESTOES, []);
      sessQuestoes.unshift({
        id: 'q_' + Date.now(),
        assunto_id: id,
        disciplina_id: seedData.assuntos.find((a) => a.id === id)?.disciplina_id,
        data_sessao: dataRef,
        tipo_sessao: 'pos_estudo',
        total_questoes: questoesRealizadas,
        acertos: questoesAcertos,
        erros: questoesRealizadas - questoesAcertos,
        taxa_acerto: questoesRealizadas > 0 ? questoesAcertos / questoesRealizadas : 0,
        criado_em: new Date().toISOString()
      });
      setItem(LS_KEYS.QUESTOES, sessQuestoes);
    }

    // Atualizar estudo no assunto
    const estudos = getItem<any[]>(LS_KEYS.ESTUDOS, []);
    let estIndex = estudos.findIndex((e) => e.assunto_id === id);
    let est = estIndex >= 0 ? estudos[estIndex] : null;

    if (!est) {
      est = {
        id: 'estudo_' + id,
        assunto_id: id,
        concluido: concluirTopico ? 1 : 0,
        data_estudo: dataRef,
        data_conclusao: concluirTopico ? dataRef : null,
        tempo_estudado_minutos: tempoMinutos,
        total_revisoes: 0,
        anotacoes
      };
      estudos.push(est);
    } else {
      est.tempo_estudado_minutos = (est.tempo_estudado_minutos || 0) + tempoMinutos;
      if (concluirTopico) {
        est.concluido = 1;
        est.data_conclusao = dataRef;
      }
      if (anotacoes) {
        est.anotacoes = est.anotacoes ? `${est.anotacoes}\n[${dataRef}]: ${anotacoes}` : anotacoes;
      }
      estudos[estIndex] = est;
    }
    setItem(LS_KEYS.ESTUDOS, estudos);

    let revisoesGeradas = 0;
    if (concluirTopico) {
      revisoesGeradas = this.gerarRevisoesCiclo(id, dataRef);
    }

    return {
      success: true,
      sessaoEstudo: novaSessao,
      revisoesGeradas,
      estudo: est
    };
  },

  excluirSessaoEstudo(sessaoId: string) {
    let sessoes = getItem<any[]>(LS_KEYS.SESSOES_ESTUDO, []);
    const target = sessoes.find((s) => s.id === sessaoId);
    if (!target) throw new Error('Sessão de estudo não encontrada');

    sessoes = sessoes.filter((s) => s.id !== sessaoId);
    setItem(LS_KEYS.SESSOES_ESTUDO, sessoes);

    return { success: true };
  },

  gerarRevisoesCiclo(assuntoId: string, dataConclusao: string) {
    const ciclos = [
      { ciclo: '24h', dias: 1 },
      { ciclo: '7d', dias: 7 },
      { ciclo: '15d', dias: 15 },
      { ciclo: '30d', dias: 30 }
    ];

    const revisoes = getItem<any[]>(LS_KEYS.REVISOES, []);
    let count = 0;

    for (const c of ciclos) {
      const dataPrevista = addDays(dataConclusao, c.dias);
      const revId = `rev_${assuntoId}_${c.ciclo}_${Date.now()}`;
      revisoes.push({
        id: revId,
        assunto_id: assuntoId,
        ciclo: c.ciclo,
        data_prevista: dataPrevista,
        status: 'pendente',
        criado_em: new Date().toISOString()
      });
      count++;
    }

    setItem(LS_KEYS.REVISOES, revisoes);
    return count;
  },

  registrarEstudo(id: string, data: any, hoje?: string) {
    return this.registrarSessaoEstudo(id, {
      ...data,
      concluirTopico: Boolean(data.concluido)
    }, hoje);
  },

  // Dashboard
  getDashboard(hojeCustom?: string) {
    const dataRef = hojeCustom || getToday();
    const concursoResp = this.getConcurso();
    const estudos = getItem<any[]>(LS_KEYS.ESTUDOS, []);
    const sessoesEstudo = getItem<any[]>(LS_KEYS.SESSOES_ESTUDO, []);
    const revisoes = getItem<any[]>(LS_KEYS.REVISOES, []);
    const questoes = getItem<any[]>(LS_KEYS.QUESTOES, []);
    const blocosAgenda = getItem<any[]>(LS_KEYS.AGENDA, []);

    // 1. Estudo na Semana
    const { inicioSemana, fimSemana } = getWeekRange(dataRef);
    const sessoesSemana = sessoesEstudo.filter(
      (s) => s.data_sessao >= inicioSemana && s.data_sessao <= fimSemana
    );

    const totalMinutosSemana = sessoesSemana.reduce((sum, s) => sum + (s.tempo_minutos || 0), 0);
    const totalQuestoesSemana = sessoesSemana.reduce((sum, s) => sum + (s.questoes_realizadas || 0), 0);

    const diasNomes = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
    const diasSemana: any[] = [];
    for (let i = 0; i < 7; i++) {
      const dStr = addDays(inicioSemana, i);
      const sessoesDia = sessoesSemana.filter((s) => s.data_sessao === dStr);
      const minDia = sessoesDia.reduce((sum, s) => sum + (s.tempo_minutos || 0), 0);
      diasSemana.push({
        data: dStr,
        diaNome: diasNomes[i],
        minutos: minDia,
        horasFormatadas: minDia >= 60 ? `${Math.floor(minDia / 60)}h ${minDia % 60}m` : `${minDia}m`,
        sessoes: sessoesDia.length,
        isHoje: dStr === dataRef
      });
    }

    const config = getItem(LS_KEYS.CONFIG, { meta_horas_semana: 25 });
    const metaSemanalHoras = config.meta_horas_semana || 25;
    const metaSemanalMinutos = metaSemanalHoras * 60;
    const percentualMeta = Math.min(100, Math.round((totalMinutosSemana / metaSemanalMinutos) * 100));

    const horasDec = +(totalMinutosSemana / 60).toFixed(1);
    const horasFormatadas =
      totalMinutosSemana >= 60
        ? `${Math.floor(totalMinutosSemana / 60)}h ${totalMinutosSemana % 60}m`
        : `${totalMinutosSemana} min`;

    // 2. Cobertura do Edital
    const concluidos = estudos.filter((e) => e.concluido).length;
    const totalAssuntos = seedData.assuntos.length;
    const percentualCobertura = totalAssuntos > 0 ? Math.round((concluidos / totalAssuntos) * 100) : 0;

    // 3. Revisões
    const revisoesAssuntosMap = new Map(seedData.assuntos.map((a) => [a.id, a]));
    const discMap = new Map(seedData.disciplinas.map((d) => [d.id, d]));

    const revFormatadas = revisoes.map((r) => {
      const asst = revisoesAssuntosMap.get(r.assunto_id);
      const disc = asst ? discMap.get(asst.disciplina_id) : null;
      return {
        id: r.id,
        assunto_id: r.assunto_id,
        assunto_titulo: asst?.titulo || 'Assunto',
        disciplina_nome: disc?.nome || 'Disciplina',
        ciclo: r.ciclo,
        data_prevista: r.data_prevista,
        status: r.status,
        atrasada: r.status === 'pendente' && r.data_prevista < dataRef
      };
    });

    const atrasadas = revFormatadas.filter((r) => r.atrasada);
    const disponiveisHoje = revFormatadas.filter(
      (r) => r.status === 'pendente' && r.data_prevista <= dataRef
    );
    const concluidas = revFormatadas.filter((r) => r.status === 'concluido');

    // 4. Desempenho nas Questões
    const totalQuestoes = questoes.reduce((acc, q) => acc + (q.total_questoes || 0), 0);
    const totalAcertos = questoes.reduce((acc, q) => acc + (q.acertos || 0), 0);
    const taxaGeral = totalQuestoes > 0 ? totalAcertos / totalQuestoes : null;

    // 5. Blocos de hoje
    const blocosHoje = blocosAgenda.filter((b) => b.data_agendada === dataRef);
    const blocosConcluidos = blocosHoje.filter((b) => b.status === 'concluido').length;

    // 6. Onde Concentrar
    const ondeConcentrar = seedData.disciplinas.slice(0, 3).map((d) => {
      const discAssuntos = seedData.assuntos.filter((a) => a.disciplina_id === d.id);
      const discConcluidos = estudos.filter(
        (e) => e.concluido && discAssuntos.some((a) => a.id === e.assunto_id)
      ).length;
      const cob = discAssuntos.length > 0 ? Math.round((discConcluidos / discAssuntos.length) * 100) : 0;
      return {
        id: d.id,
        nome: d.nome,
        grupo: d.grupo,
        cobertura: cob,
        taxaAcertos: taxaGeral,
        motivoRecomendacao:
          cob < 30 ? 'Cobertura baixa no edital' : 'Disciplina de alto peso no bloco P2'
      };
    });

    return {
      success: true,
      data: {
        concurso: concursoResp.concurso,
        estudoHoje: {
          totalBlocos: blocosHoje.length,
          blocosConcluidos,
          blocos: blocosHoje
        },
        estudoSemana: {
          inicioSemana,
          fimSemana,
          totalMinutos: totalMinutosSemana,
          horasFormatadas,
          horasDecimais: horasDec,
          totalSessoes: sessoesSemana.length,
          totalQuestoes: totalQuestoesSemana,
          dias: diasSemana,
          metaSemanalHoras,
          metaSemanalMinutos,
          percentualMeta
        },
        cobertura: {
          topicosEstudados: concluidos,
          totalTopicosEstudaveis: totalAssuntos,
          percentual: percentualCobertura
        },
        revisoes: {
          disponiveisHoje,
          atrasadas,
          totais: {
            pendentes: disponiveisHoje.length,
            concluidas: concluidas.length,
            em_manutencao: 0
          }
        },
        desempenho: {
          totalQuestoes,
          totalAcertos,
          totalErros: totalQuestoes - totalAcertos,
          taxaGeral
        },
        ondeConcentrar
      }
    };
  },

  // Revisões
  getRevisoes(dataRef?: string) {
    const hoje = dataRef || getToday();
    const revisoes = getItem<any[]>(LS_KEYS.REVISOES, []);
    const assuntosMap = new Map(seedData.assuntos.map((a) => [a.id, a]));
    const discMap = new Map(seedData.disciplinas.map((d) => [d.id, d]));

    const formatted = revisoes.map((r) => {
      const asst = assuntosMap.get(r.assunto_id);
      const disc = asst ? discMap.get(asst.disciplina_id) : null;
      return {
        id: r.id,
        assunto_id: r.assunto_id,
        assunto_titulo: asst?.titulo || 'Assunto',
        disciplina_nome: disc?.nome || 'Disciplina',
        ciclo: r.ciclo,
        data_prevista: r.data_prevista,
        status: r.status,
        atrasada: r.status === 'pendente' && r.data_prevista < hoje,
        duracao_estimada_minutos: 20
      };
    });

    return {
      success: true,
      data: formatted
    };
  },

  concluirRevisao(id: string, payload: any, dataRef?: string) {
    const revisoes = getItem<any[]>(LS_KEYS.REVISOES, []);
    const idx = revisoes.findIndex((r) => r.id === id);
    if (idx >= 0) {
      revisoes[idx].status = 'concluido';
      revisoes[idx].data_realizada = payload.dataReal || dataRef || getToday();
      setItem(LS_KEYS.REVISOES, revisoes);
    }
    return { success: true };
  },

  unificarRevisoes(assuntoId: string, dataRef: string) {
    const revisoes = getItem<any[]>(LS_KEYS.REVISOES, []);
    for (const r of revisoes) {
      if (r.assunto_id === assuntoId && r.status === 'pendente') {
        r.status = 'concluido';
        r.data_realizada = dataRef;
      }
    }
    setItem(LS_KEYS.REVISOES, revisoes);
    return { success: true };
  },

  // Agenda
  getAgenda(dataRef?: string) {
    const hoje = dataRef || getToday();
    const blocos = getItem<any[]>(LS_KEYS.AGENDA, []);
    return {
      success: true,
      data: blocos,
      dataInicio: hoje,
      dataFim: hoje
    };
  },

  gerarAgenda(dataRef: string) {
    const blocosExistentes = getItem<any[]>(LS_KEYS.AGENDA, []);
    // Gerar 3 blocos recomendados para o dia
    const discDisponiveis = seedData.disciplinas.slice(0, 3);
    const novosBlocos = discDisponiveis.map((d, i) => {
      const assunto = seedData.assuntos.find((a) => a.disciplina_id === d.id);
      return {
        id: 'bloco_' + Date.now() + '_' + i,
        data_agendada: dataRef,
        tipo: i === 0 ? 'estudo_inicial' : 'questoes',
        disciplina_id: d.id,
        disciplina_nome: d.nome,
        assunto_id: assunto?.id,
        assunto_titulo: assunto?.titulo,
        duracao_minutos: 50,
        status: 'pendente',
        motivo_prioridade: 'Meta diária de ciclo'
      };
    });

    const combinados = [...novosBlocos, ...blocosExistentes.filter((b) => b.data_agendada !== dataRef)];
    setItem(LS_KEYS.AGENDA, combinados);
    return { success: true, totalBlocosGerados: novosBlocos.length, sobrecargas: [] };
  },

  concluirBloco(id: string, questaoData: any, dataRef?: string) {
    const blocos = getItem<any[]>(LS_KEYS.AGENDA, []);
    const idx = blocos.findIndex((b) => b.id === id);
    if (idx >= 0) {
      blocos[idx].status = 'concluido';
      setItem(LS_KEYS.AGENDA, blocos);
    }
    return { success: true };
  },

  // Questões
  getQuestoes(params?: any) {
    const questoes = getItem<any[]>(LS_KEYS.QUESTOES, []);
    return { success: true, data: questoes };
  },

  criarSessaoQuestoes(data: any, hoje?: string) {
    const questoes = getItem<any[]>(LS_KEYS.QUESTOES, []);
    const total = Number(data.totalQuestoes) || 0;
    const acertos = Number(data.acertos) || 0;
    const nova = {
      id: 'q_' + Date.now(),
      assunto_id: data.assuntoId,
      disciplina_id: data.disciplinaId,
      data_sessao: data.data || hoje || getToday(),
      tipo_sessao: data.tipo || 'treino',
      total_questoes: total,
      acertos,
      erros: total - acertos,
      taxa_acerto: total > 0 ? acertos / total : 0,
      origem_questoes: data.origem,
      observacoes: data.observacoes,
      criado_em: new Date().toISOString()
    };
    questoes.unshift(nova);
    setItem(LS_KEYS.QUESTOES, questoes);
    return { success: true, data: nova };
  },

  // Simulados
  getSimulados() {
    const simulados = getItem<any[]>(LS_KEYS.SIMULADOS, []);
    return { success: true, data: simulados };
  },

  salvarSimulado(data: any) {
    const simulados = getItem<any[]>(LS_KEYS.SIMULADOS, []);
    const novo = {
      id: 'sim_' + Date.now(),
      nome: data.nome,
      data_realizacao: data.dataRealizacao,
      tempo_gasto_minutos: data.tempoGastoMinutos,
      itens_certos: data.itensCertos,
      itens_errados: data.itensErrados,
      itens_em_branco: data.itensEmBranco,
      pontuacao_liquida: data.pontuacaoLiquida,
      resultado_oficial: data.resultadoOficial,
      redacao_nota: data.redacaoNota,
      desempenho_por_disciplina: data.desempenhoPorDisciplina,
      criado_em: new Date().toISOString()
    };
    simulados.unshift(novo);
    setItem(LS_KEYS.SIMULADOS, simulados);
    return { success: true, data: novo };
  },

  // Configurações
  getConfiguracoes() {
    const cfg = getItem(LS_KEYS.CONFIG, {
      horas_disponiveis_dia: 4,
      dias_estudo_semana: 6,
      meta_horas_semana: 25,
      intervalo_revisao_tipo: 'padrao_24_7_15_30'
    });
    return { success: true, data: cfg };
  },

  salvarConfiguracoes(data: any) {
    setItem(LS_KEYS.CONFIG, data);
    return { success: true };
  }
};
