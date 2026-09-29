import crypto from 'crypto';
import { getDatabase } from '../db/database.js';
import { RevisaoEngine } from './revisaoEngine.js';
import { getTodayDateString } from '../utils/dateUtils.js';

export interface AssuntoNode {
  id: string;
  disciplina_id: string;
  parent_id: string | null;
  codigo_edital: string;
  titulo: string;
  nivel: number;
  ordem: number;
  trecho_original_edital: string | null;
  pagina_edital: number | null;
  is_sugestao_estudo: number;
  // Campos computados de estudo
  is_leaf: boolean;
  estudo_concluido: boolean;
  data_estudo: string | null;
  tempo_minutos: number;
  anotacoes: string | null;
  materiais: string | null;
  revisao_pendente: boolean;
  total_questoes: number;
  total_acertos: number;
  taxa_acerto: number | null;
  total_sessoes: number;
  em_estudo: boolean;
  children: AssuntoNode[];
}

export interface DisciplinaTree {
  id: string;
  grupo: string;
  nome: string;
  ordem: number;
  peso: number;
  quantidade_itens_estimada: number;
  total_topicos_folha: number;
  topicos_estudados: number;
  percentual_cobertura: number;
  total_questoes: number;
  total_acertos: number;
  taxa_acerto_disciplina: number | null;
  revisoes_atrasadas: number;
  assuntos: AssuntoNode[];
}

export class AssuntoService {
  /**
   * Retorna todas as disciplinas com sua árvore completa de tópicos e métricas agregadas sem dupla contagem.
   */
  static getArvoreCompleta(concursoId: string = 'bacen-2013-tecnico-area-1'): DisciplinaTree[] {
    const db = getDatabase();

    // 1. Buscar disciplinas
    const disciplinas = db.prepare(`
      SELECT * FROM disciplinas WHERE concurso_id = ? ORDER BY ordem ASC
    `).all(concursoId) as any[];

    // 2. Buscar todos os assuntos
    const todosAssuntos = db.prepare(`
      SELECT a.*,
             e.concluido as estudo_concluido,
             e.data_estudo,
             e.tempo_minutos,
             e.anotacoes,
             e.materiais
      FROM assuntos a
      LEFT JOIN estudos e ON e.assunto_id = a.id
      JOIN disciplinas d ON d.id = a.disciplina_id
      WHERE d.concurso_id = ?
      ORDER BY a.nivel ASC, a.ordem ASC
    `).all(concursoId) as any[];

    // 3. Buscar estatísticas de questões por assunto (apenas 1 vez por sessão)
    const questoesAssunto = db.prepare(`
      SELECT assunto_id,
             SUM(total_questoes) as soma_questoes,
             SUM(acertos) as soma_acertos
      FROM sessoes_questoes
      WHERE assunto_id IS NOT NULL
      GROUP BY assunto_id
    `).all() as { assunto_id: string; soma_questoes: number; soma_acertos: number }[];

    const mapQuestoes = new Map<string, { total: number; acertos: number }>();
    for (const q of questoesAssunto) {
      mapQuestoes.set(q.assunto_id, { total: q.soma_questoes, acertos: q.soma_acertos });
    }

    // 4. Buscar revisões pendentes por assunto
    const revisoesPendentes = db.prepare(`
      SELECT assunto_id,
             COUNT(*) as total_pendentes,
             SUM(CASE WHEN status = 'atrasada' THEN 1 ELSE 0 END) as total_atrasadas
      FROM revisoes
      WHERE status IN ('disponivel', 'atrasada')
      GROUP BY assunto_id
    `).all() as { assunto_id: string; total_pendentes: number; total_atrasadas: number }[];

    const mapRevisoes = new Map<string, { pendentes: number; atrasadas: number }>();
    for (const r of revisoesPendentes) {
      mapRevisoes.set(r.assunto_id, { pendentes: r.total_pendentes, atrasadas: r.total_atrasadas });
    }

    // 5. Buscar sessões de estudo agregadas por assunto
    const sessoesEstudoAssunto = db.prepare(`
      SELECT assunto_id,
             COUNT(*) as total_sessoes,
             SUM(tempo_minutos) as soma_tempo
      FROM sessoes_estudo
      GROUP BY assunto_id
    `).all() as { assunto_id: string; total_sessoes: number; soma_tempo: number }[];

    const mapSessoesEstudo = new Map<string, { total_sessoes: number; soma_tempo: number }>();
    for (const s of sessoesEstudoAssunto) {
      mapSessoesEstudo.set(s.assunto_id, { total_sessoes: s.total_sessoes, soma_tempo: s.soma_tempo });
    }

    // Identificar nós que possuem filhos para saber quem é folha
    const parentIds = new Set<string>();
    for (const a of todosAssuntos) {
      if (a.parent_id) {
        parentIds.add(a.parent_id);
      }
    }

    // Construir mapa de nós
    const nodeMap = new Map<string, AssuntoNode>();
    for (const a of todosAssuntos) {
      const isLeaf = !parentIds.has(a.id);
      const q = mapQuestoes.get(a.id) || { total: 0, acertos: 0 };
      const rev = mapRevisoes.get(a.id) || { pendentes: 0, atrasadas: 0 };
      const se = mapSessoesEstudo.get(a.id) || { total_sessoes: 0, soma_tempo: 0 };
      const tempoTotal = (se.soma_tempo > 0) ? se.soma_tempo : (a.tempo_minutos || 0);
      const totalSess = (se.total_sessoes > 0) ? se.total_sessoes : (tempoTotal > 0 ? 1 : 0);
      const estudoConcluido = Boolean(a.estudo_concluido);
      const emEstudo = !estudoConcluido && (tempoTotal > 0 || totalSess > 0);

      nodeMap.set(a.id, {
        id: a.id,
        disciplina_id: a.disciplina_id,
        parent_id: a.parent_id,
        codigo_edital: a.codigo_edital,
        titulo: a.titulo,
        nivel: a.nivel,
        ordem: a.ordem,
        trecho_original_edital: a.trecho_original_edital,
        pagina_edital: a.pagina_edital,
        is_sugestao_estudo: a.is_sugestao_estudo,
        is_leaf: isLeaf,
        estudo_concluido: estudoConcluido,
        data_estudo: a.data_estudo || null,
        tempo_minutos: tempoTotal,
        anotacoes: a.anotacoes || null,
        materiais: a.materiais || null,
        revisao_pendente: rev.pendentes > 0,
        total_questoes: q.total,
        total_acertos: q.acertos,
        taxa_acerto: q.total > 0 ? q.acertos / q.total : null,
        total_sessoes: totalSess,
        em_estudo: emEstudo,
        children: []
      });
    }

    // Montar hierarquia
    const arvoreDisciplinas: DisciplinaTree[] = [];

    for (const disc of disciplinas) {
      const rootNodes: AssuntoNode[] = [];
      const assuntosDaDisc = todosAssuntos.filter(a => a.disciplina_id === disc.id);

      for (const a of assuntosDaDisc) {
        const node = nodeMap.get(a.id)!;
        if (a.parent_id && nodeMap.has(a.parent_id)) {
          nodeMap.get(a.parent_id)!.children.push(node);
        } else {
          rootNodes.push(node);
        }
      }

      // Calcular métricas agregadas sem dupla contagem (apenas folhas são unidades de estudo)
      const leaves = assuntosDaDisc
        .map(a => nodeMap.get(a.id)!)
        .filter(n => n.is_leaf);

      const totalFolhas = leaves.length;
      const folhasEstudadas = leaves.filter(l => l.estudo_concluido).length;
      const cobertura = totalFolhas > 0 ? (folhasEstudadas / totalFolhas) * 100 : 0;

      // Soma de questões da disciplina (inclui também questões avulsas da disciplina)
      const questoesDisc = db.prepare(`
        SELECT SUM(total_questoes) as total, SUM(acertos) as acertos
        FROM sessoes_questoes
        WHERE disciplina_id = ?
      `).get(disc.id) as { total: number | null; acertos: number | null };

      const totalQuestoesDisc = questoesDisc.total || 0;
      const totalAcertosDisc = questoesDisc.acertos || 0;
      const taxaDisc = totalQuestoesDisc > 0 ? totalAcertosDisc / totalQuestoesDisc : null;

      // Revisões atrasadas
      const revAtrasadasDisc = db.prepare(`
        SELECT COUNT(*) as atrasadas
        FROM revisoes r
        JOIN assuntos a ON a.id = r.assunto_id
        WHERE a.disciplina_id = ? AND r.status = 'atrasada'
      `).get(disc.id) as { atrasadas: number };

      arvoreDisciplinas.push({
        id: disc.id,
        grupo: disc.grupo,
        nome: disc.nome,
        ordem: disc.ordem,
        peso: disc.peso,
        quantidade_itens_estimada: disc.quantidade_itens_estimada,
        total_topicos_folha: totalFolhas,
        topicos_estudados: folhasEstudadas,
        percentual_cobertura: Math.round(cobertura * 10) / 10,
        total_questoes: totalQuestoesDisc,
        total_acertos: totalAcertosDisc,
        taxa_acerto_disciplina: taxaDisc,
        revisoes_atrasadas: revAtrasadasDisc.atrasadas || 0,
        assuntos: rootNodes
      });
    }

    return arvoreDisciplinas;
  }

  /**
   * Registra ou atualiza o estudo inicial de um assunto.
   * Cria automaticamente as revisões de 7, 15 e 30 dias se for a primeira conclusão.
   */
  static registrarEstudoInicial(
    assuntoId: string,
    input: {
      concluido: boolean;
      dataEstudo?: string;
      tempoMinutos?: number;
      anotacoes?: string;
      materiais?: string;
    },
    hoje: string = getTodayDateString()
  ): { estudo: any; revisoesGeradas: number } {
    const db = getDatabase();
    const now = new Date().toISOString();
    const dataEstudo = input.dataEstudo || hoje;

    const existing = db.prepare('SELECT * FROM estudos WHERE assunto_id = ?').get(assuntoId) as any;

    let revisoesGeradas = 0;

    if (existing) {
      db.prepare(`
        UPDATE estudos
        SET concluido = ?, data_estudo = ?, tempo_minutos = ?, anotacoes = ?, materiais = ?, atualizado_em = ?
        WHERE assunto_id = ?
      `).run(
        input.concluido ? 1 : 0,
        dataEstudo,
        input.tempoMinutos || existing.tempo_minutos || 0,
        input.anotacoes !== undefined ? input.anotacoes : existing.anotacoes,
        input.materiais !== undefined ? input.materiais : existing.materiais,
        now,
        assuntoId
      );

      // Se passou a estar concluído e não tinha revisões, gerar
      if (input.concluido && !existing.concluido) {
        const revCount = db.prepare('SELECT count(*) as c FROM revisoes WHERE assunto_id = ?').get(assuntoId) as { c: number };
        if (revCount.c === 0) {
          const revs = RevisaoEngine.gerarRevisoesIniciais(assuntoId, dataEstudo, hoje);
          revisoesGeradas = revs.length;
        }
      }
    } else {
      const id = `est-${crypto.randomBytes(6).toString('hex')}`;
      db.prepare(`
        INSERT INTO estudos (
          id, assunto_id, concluido, data_estudo, tempo_minutos,
          anotacoes, materiais, criado_em, atualizado_em
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        assuntoId,
        input.concluido ? 1 : 0,
        dataEstudo,
        input.tempoMinutos || 0,
        input.anotacoes || null,
        input.materiais || null,
        now,
        now
      );

      if (input.concluido) {
        const revs = RevisaoEngine.gerarRevisoesIniciais(assuntoId, dataEstudo, hoje);
        revisoesGeradas = revs.length;
      }
    }

    const estudoAtualizado = db.prepare('SELECT * FROM estudos WHERE assunto_id = ?').get(assuntoId);
    return { estudo: estudoAtualizado, revisoesGeradas };
  }

  /**
   * Registra uma sessão de estudo para o assunto, permitindo múltiplos estudos no mesmo tópico
   * (ex: aulas 1 a 20 de um cursinho) sem forçar conclusão prematura.
   */
  static registrarSessaoEstudo(
    assuntoId: string,
    input: {
      data?: string;
      tempoMinutos: number;
      questoesRealizadas?: number;
      questoesAcertos?: number;
      anotacoes?: string;
      concluirTopico?: boolean;
    },
    hoje: string = getTodayDateString()
  ): { sessaoEstudo: any; revisoesGeradas: number; estudo: any } {
    const db = getDatabase();
    const now = new Date().toISOString();
    const dataSessao = input.data || hoje;
    const tempoMinutos = Math.max(0, parseInt(String(input.tempoMinutos || 0), 10));
    const questoesRealizadas = Math.max(0, parseInt(String(input.questoesRealizadas || 0), 10));
    let questoesAcertos = Math.max(0, parseInt(String(input.questoesAcertos || 0), 10));
    if (questoesAcertos > questoesRealizadas) {
      questoesAcertos = questoesRealizadas;
    }
    const questoesErros = Math.max(0, questoesRealizadas - questoesAcertos);
    const concluirTopico = Boolean(input.concluirTopico);

    // 1. Obter assunto e sua disciplina
    const assunto = db.prepare('SELECT id, disciplina_id FROM assuntos WHERE id = ?').get(assuntoId) as any;
    if (!assunto) {
      throw new Error(`Assunto ${assuntoId} não encontrado.`);
    }

    const sessaoId = `ses-est-${crypto.randomBytes(6).toString('hex')}`;

    // 2. Inserir na tabela sessoes_estudo
    db.prepare(`
      INSERT INTO sessoes_estudo (
        id, assunto_id, disciplina_id, data, tempo_minutos,
        questoes_realizadas, questoes_acertos, questoes_erros,
        anotacoes, concluiu_topico, criado_em
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      sessaoId,
      assuntoId,
      assunto.disciplina_id,
      dataSessao,
      tempoMinutos,
      questoesRealizadas,
      questoesAcertos,
      questoesErros,
      input.anotacoes || null,
      concluirTopico ? 1 : 0,
      now
    );

    // 3. Se realizou questões, registrar em sessoes_questoes também para refletir nas estatísticas
    if (questoesRealizadas > 0) {
      const taxaAcerto = questoesRealizadas > 0 ? (questoesAcertos / questoesRealizadas) : 0;
      const questaoId = `ses-q-${crypto.randomBytes(6).toString('hex')}`;
      db.prepare(`
        INSERT INTO sessoes_questoes (
          id, disciplina_id, assunto_id, revisao_id, data,
          total_questoes, acertos, erros, taxa_acerto,
          origem, observacoes, tipo, criado_em
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        questaoId,
        assunto.disciplina_id,
        assuntoId,
        null,
        dataSessao,
        questoesRealizadas,
        questoesAcertos,
        questoesErros,
        taxaAcerto,
        'Estudo do Edital',
        input.anotacoes || null,
        'estudo_inicial',
        now
      );
    }

    // 4. Atualizar registro consolidado em estudos
    const existingEstudo = db.prepare('SELECT * FROM estudos WHERE assunto_id = ?').get(assuntoId) as any;
    const somaMinutos = db.prepare('SELECT SUM(tempo_minutos) as s FROM sessoes_estudo WHERE assunto_id = ?').get(assuntoId) as { s: number | null };
    const totalMinutosAcumulado = (somaMinutos.s || 0);

    const novoConcluido = (existingEstudo && existingEstudo.concluido === 1) || concluirTopico;
    let revisoesGeradas = 0;

    if (existingEstudo) {
      db.prepare(`
        UPDATE estudos
        SET concluido = ?, data_estudo = ?, tempo_minutos = ?, anotacoes = coalesce(?, anotacoes), atualizado_em = ?
        WHERE assunto_id = ?
      `).run(
        novoConcluido ? 1 : 0,
        dataSessao,
        totalMinutosAcumulado,
        input.anotacoes || null,
        now,
        assuntoId
      );

      // Se passou a estar concluído e não tinha revisões, gerar marcos
      if (concluirTopico && existingEstudo.concluido !== 1) {
        const revCount = db.prepare('SELECT count(*) as c FROM revisoes WHERE assunto_id = ?').get(assuntoId) as { c: number };
        if (revCount.c === 0) {
          const revs = RevisaoEngine.gerarRevisoesIniciais(assuntoId, dataSessao, hoje);
          revisoesGeradas = revs.length;
        }
      }
    } else {
      const id = `est-${crypto.randomBytes(6).toString('hex')}`;
      db.prepare(`
        INSERT INTO estudos (
          id, assunto_id, concluido, data_estudo, tempo_minutos,
          anotacoes, materiais, criado_em, atualizado_em
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        assuntoId,
        concluirTopico ? 1 : 0,
        dataSessao,
        totalMinutosAcumulado,
        input.anotacoes || null,
        null,
        now,
        now
      );

      if (concluirTopico) {
        const revs = RevisaoEngine.gerarRevisoesIniciais(assuntoId, dataSessao, hoje);
        revisoesGeradas = revs.length;
      }
    }

    const sessaoSalva = db.prepare('SELECT * FROM sessoes_estudo WHERE id = ?').get(sessaoId);
    const estudoAtualizado = db.prepare('SELECT * FROM estudos WHERE assunto_id = ?').get(assuntoId);

    return {
      sessaoEstudo: sessaoSalva,
      revisoesGeradas,
      estudo: estudoAtualizado
    };
  }

  /**
   * Exclui uma sessão de estudo e recalcula o tempo acumulado no assunto.
   */
  static excluirSessaoEstudo(sessaoId: string) {
    const db = getDatabase();
    const sessao = db.prepare('SELECT * FROM sessoes_estudo WHERE id = ?').get(sessaoId) as any;
    if (!sessao) {
      throw new Error(`Sessão de estudo ${sessaoId} não encontrada.`);
    }

    db.prepare('DELETE FROM sessoes_estudo WHERE id = ?').run(sessaoId);

    // Recalcular tempo acumulado em estudos
    const soma = db.prepare('SELECT SUM(tempo_minutos) as s, COUNT(*) as c FROM sessoes_estudo WHERE assunto_id = ?').get(sessao.assunto_id) as { s: number | null; c: number };
    const totalMinutos = soma.s || 0;
    const totalSessoes = soma.c || 0;

    if (totalSessoes === 0) {
      db.prepare('DELETE FROM estudos WHERE assunto_id = ?').run(sessao.assunto_id);
      db.prepare('DELETE FROM revisoes WHERE assunto_id = ?').run(sessao.assunto_id);
    } else {
      const stillConcluded = db.prepare('SELECT COUNT(*) as c FROM sessoes_estudo WHERE assunto_id = ? AND concluiu_topico = 1').get(sessao.assunto_id) as { c: number };
      const concluido = stillConcluded.c > 0 ? 1 : 0;
      db.prepare(`
        UPDATE estudos
        SET tempo_minutos = ?, concluido = ?, atualizado_em = ?
        WHERE assunto_id = ?
      `).run(totalMinutos, concluido, new Date().toISOString(), sessao.assunto_id);

      if (concluido === 0) {
        db.prepare('DELETE FROM revisoes WHERE assunto_id = ?').run(sessao.assunto_id);
      }
    }

    return { success: true };
  }

  static resetarEstudoAssunto(assuntoId: string) {
    const db = getDatabase();
    db.prepare('DELETE FROM sessoes_estudo WHERE assunto_id = ?').run(assuntoId);
    db.prepare('DELETE FROM estudos WHERE assunto_id = ?').run(assuntoId);
    db.prepare('DELETE FROM revisoes WHERE assunto_id = ?').run(assuntoId);
    return { success: true };
  }

  /**
   * Obtém detalhes de um assunto específico com seu breadcrumb (caminho),
   * estudo inicial, histórico de sessões de estudo, histórico de questões e revisões.
   */
  static getDetalhesAssunto(assuntoId: string) {
    const db = getDatabase();

    const assunto = db.prepare(`
      SELECT a.*, d.nome as disciplina_nome, d.grupo as disciplina_grupo
      FROM assuntos a
      JOIN disciplinas d ON d.id = a.disciplina_id
      WHERE a.id = ?
    `).get(assuntoId) as any;

    if (!assunto) {
      throw new Error(`Assunto ${assuntoId} não encontrado.`);
    }

    // Breadcrumb
    const breadcrumb: { id: string; titulo: string }[] = [{ id: assunto.id, titulo: assunto.titulo }];
    let curParentId = assunto.parent_id;
    while (curParentId) {
      const p = db.prepare('SELECT id, titulo, parent_id FROM assuntos WHERE id = ?').get(curParentId) as any;
      if (!p) break;
      breadcrumb.unshift({ id: p.id, titulo: p.titulo });
      curParentId = p.parent_id;
    }
    breadcrumb.unshift({ id: assunto.disciplina_id, titulo: assunto.disciplina_nome });
    breadcrumb.unshift({ id: 'grupo', titulo: assunto.disciplina_grupo });

    const estudo = db.prepare('SELECT * FROM estudos WHERE assunto_id = ?').get(assuntoId);

    const sessoesEstudo = db.prepare(`
      SELECT * FROM sessoes_estudo WHERE assunto_id = ? ORDER BY data DESC, criado_em DESC
    `).all(assuntoId);

    const sessoes = db.prepare(`
      SELECT * FROM sessoes_questoes WHERE assunto_id = ? ORDER BY data DESC, criado_em DESC
    `).all(assuntoId);

    const revisoes = db.prepare(`
      SELECT * FROM revisoes WHERE assunto_id = ? ORDER BY data_prevista ASC, criado_em ASC
    `).all(assuntoId);

    return {
      assunto,
      breadcrumb,
      estudo,
      sessoesEstudo,
      sessoes,
      revisoes
    };
  }
}

