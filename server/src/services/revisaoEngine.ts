import crypto from 'crypto';
import { getDatabase } from '../db/database.js';
import { addDays, diffInDays, getTodayDateString } from '../utils/dateUtils.js';

export interface ConcluirRevisaoInput {
  revisaoId: string;
  dataReal: string;
  totalQuestoes?: number;
  acertos?: number;
  origem?: string;
  observacoes?: string;
}

export interface RevisaoRecord {
  id: string;
  assunto_id: string;
  ciclo: string;
  numero_ciclo_manutencao: number;
  data_prevista: string;
  data_real: string | null;
  status: string;
  intervalo_dias: number;
  sessao_questao_id: string | null;
  observacoes: string | null;
  revisoes_substituidas_ids: string | null;
  heuristica_intervalo_motivo: string | null;
}

export class RevisaoEngine {
  /**
   * Determina o status de uma revisão com base na data prevista e a data de hoje.
   */
  static calcularStatus(dataPrevista: string, dataConcluida: string | null, hoje: string = getTodayDateString()): string {
    if (dataConcluida) {
      return 'concluida';
    }
    const diff = diffInDays(dataPrevista, hoje);
    if (diff < 0) {
      return 'atrasada';
    }
    if (diff === 0) {
      return 'disponivel';
    }
    return 'agendada';
  }

  /**
   * Gera as 3 revisões iniciais fixas de 7, 15 e 30 dias contadas da data do estudo inicial.
   */
  static gerarRevisoesIniciais(assuntoId: string, dataEstudo: string, hoje: string = getTodayDateString()): RevisaoRecord[] {
    const db = getDatabase();
    const now = new Date().toISOString();

    const marcos = [
      { ciclo: '7d', dias: 7 },
      { ciclo: '15d', dias: 15 },
      { ciclo: '30d', dias: 30 }
    ];

    const result: RevisaoRecord[] = [];

    const insert = db.prepare(`
      INSERT INTO revisoes (
        id, assunto_id, ciclo, numero_ciclo_manutencao,
        data_prevista, data_real, status, intervalo_dias,
        sessao_questao_id, observacoes, revisoes_substituidas_ids,
        heuristica_intervalo_motivo, criado_em, atualizado_em
      ) VALUES (?, ?, ?, 0, ?, NULL, ?, ?, NULL, NULL, NULL, ?, ?, ?)
    `);

    for (const m of marcos) {
      const dataPrevista = addDays(dataEstudo, m.dias);
      const status = this.calcularStatus(dataPrevista, null, hoje);
      const id = `rev-${assuntoId}-${m.ciclo}-${crypto.randomBytes(4).toString('hex')}`;
      const motivo = `Revisão fixa de ${m.dias} dias a partir do estudo inicial (${dataEstudo}).`;

      insert.run(id, assuntoId, m.ciclo, dataPrevista, status, m.dias, motivo, now, now);

      result.push({
        id,
        assunto_id: assuntoId,
        ciclo: m.ciclo,
        numero_ciclo_manutencao: 0,
        data_prevista: dataPrevista,
        data_real: null,
        status,
        intervalo_dias: m.dias,
        sessao_questao_id: null,
        observacoes: null,
        revisoes_substituidas_ids: null,
        heuristica_intervalo_motivo: motivo
      });
    }

    return result;
  }

  /**
   * Atualiza status diário de revisões pendentes.
   */
  static atualizarStatusDiario(hoje: string = getTodayDateString()): void {
    const db = getDatabase();
    const revisoes = db.prepare(`
      SELECT id, data_prevista, data_real, status
      FROM revisoes
      WHERE status NOT IN ('concluida', 'recuperada')
    `).all() as { id: string; data_prevista: string; data_real: string | null; status: string }[];

    const update = db.prepare(`UPDATE revisoes SET status = ?, atualizado_em = ? WHERE id = ?`);
    const now = new Date().toISOString();

    for (const rev of revisoes) {
      const novoStatus = this.calcularStatus(rev.data_prevista, rev.data_real, hoje);
      if (novoStatus !== rev.status) {
        update.run(novoStatus, now, rev.id);
      }
    }
  }

  /**
   * Conclui uma revisão, registra questões se houver, e se for >= 30d ou manutenção,
   * projeta o próximo ciclo com a heurística de desempenho configurável.
   */
  static concluirRevisao(input: ConcluirRevisaoInput, hoje: string = getTodayDateString()): {
    revisaoConcluida: RevisaoRecord;
    proximaRevisao?: RevisaoRecord;
  } {
    const db = getDatabase();
    const now = new Date().toISOString();

    const rev = db.prepare(`SELECT * FROM revisoes WHERE id = ?`).get(input.revisaoId) as RevisaoRecord | undefined;
    if (!rev) {
      throw new Error(`Revisão ${input.revisaoId} não encontrada.`);
    }

    if (rev.status === 'concluida') {
      throw new Error(`Esta revisão já foi concluída anteriormente.`);
    }

    let sessaoId: string | null = null;
    let taxaAcertos: number | null = null;

    // Se informou questões na revisão
    if (input.totalQuestoes !== undefined && input.totalQuestoes > 0) {
      if (input.acertos === undefined || input.acertos < 0) {
        throw new Error('A quantidade de acertos deve ser informada e maior ou igual a zero.');
      }
      if (input.acertos > input.totalQuestoes) {
        throw new Error('A quantidade de acertos não pode exceder o total de questões respondidas.');
      }

      // Buscar disciplina do assunto
      const assunto = db.prepare('SELECT disciplina_id FROM assuntos WHERE id = ?').get(rev.assunto_id) as { disciplina_id: string } | undefined;
      const disciplinaId = assunto ? assunto.disciplina_id : 'disc-geral';

      sessaoId = `sess-${crypto.randomBytes(6).toString('hex')}`;
      const erros = input.totalQuestoes - input.acertos;
      taxaAcertos = input.acertos / input.totalQuestoes;

      db.prepare(`
        INSERT INTO sessoes_questoes (
          id, disciplina_id, assunto_id, revisao_id, data,
          total_questoes, acertos, erros, taxa_acerto, origem, observacoes, tipo, criado_em
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'revisao', ?)
      `).run(
        sessaoId,
        disciplinaId,
        rev.assunto_id,
        rev.id,
        input.dataReal,
        input.totalQuestoes,
        input.acertos,
        erros,
        taxaAcertos,
        input.origem || 'Revisão',
        input.observacoes || null,
        now
      );
    }

    // Atualizar a revisão atual para concluída
    db.prepare(`
      UPDATE revisoes
      SET status = 'concluida', data_real = ?, sessao_questao_id = ?, observacoes = ?, atualizado_em = ?
      WHERE id = ?
    `).run(input.dataReal, sessaoId, input.observacoes || null, now, rev.id);

    const revisaoAtualizada: RevisaoRecord = {
      ...rev,
      status: 'concluida',
      data_real: input.dataReal,
      sessao_questao_id: sessaoId,
      observacoes: input.observacoes || null
    };

    let proximaRevisao: RevisaoRecord | undefined;

    // Regra da Manutenção: se for a revisão de 30 dias OU já estiver em manutenção/recuperação
    if (rev.ciclo === '30d' || rev.ciclo === 'manutencao' || rev.ciclo === 'recuperacao') {
      const config = db.prepare('SELECT * FROM rotina_config WHERE id = ?').get('config_padrao') as any || {
        min_questoes_amostra_manutencao: 5,
        faixa_baixo_acerto_dias: 7,
        faixa_medio_acerto_dias: 15,
        faixa_alto_acerto_dias: 30,
        faixa_excelente_acerto_dias: 45
      };

      let proximoIntervalo = config.faixa_alto_acerto_dias || 30;
      let motivoHeuristica = '';

      if (taxaAcertos !== null && input.totalQuestoes !== undefined && input.totalQuestoes >= config.min_questoes_amostra_manutencao) {
        const perc = Math.round(taxaAcertos * 100);
        if (perc < 70) {
          proximoIntervalo = config.faixa_baixo_acerto_dias || 7;
          motivoHeuristica = `Desempenho de ${perc}% (< 70%) em ${input.totalQuestoes} questões: intervalo reduzido para ${proximoIntervalo} dias para consolidação.`;
        } else if (perc < 85) {
          proximoIntervalo = config.faixa_medio_acerto_dias || 15;
          motivoHeuristica = `Desempenho de ${perc}% (70%-84%) em ${input.totalQuestoes} questões: intervalo intermediário de ${proximoIntervalo} dias.`;
        } else {
          // Checar se teve desempenho >= 85% em revisões anteriores também
          const ultimasSessoes = db.prepare(`
            SELECT taxa_acerto FROM sessoes_questoes
            WHERE assunto_id = ? AND total_questoes >= ?
            ORDER BY criado_em DESC LIMIT 3
          `).all(rev.assunto_id, config.min_questoes_amostra_manutencao) as { taxa_acerto: number }[];

          const consistente = ultimasSessoes.length >= 2 && ultimasSessoes.every(s => s.taxa_acerto >= 0.85);

          if (consistente) {
            proximoIntervalo = config.faixa_excelente_acerto_dias || 45;
            motivoHeuristica = `Alto desempenho consistente (${perc}%) em ciclos seguidos: intervalo ampliado para ${proximoIntervalo} dias.`;
          } else {
            proximoIntervalo = config.faixa_alto_acerto_dias || 30;
            motivoHeuristica = `Excelente desempenho (${perc}% >= 85%) em ${input.totalQuestoes} questões: intervalo padrão de ${proximoIntervalo} dias.`;
          }
        }
      } else {
        // Sem questões ou amostra menor que o mínimo
        proximoIntervalo = rev.intervalo_dias > 0 ? rev.intervalo_dias : 15;
        motivoHeuristica = input.totalQuestoes !== undefined
          ? `Amostra de questões (${input.totalQuestoes}) menor que o mínimo (${config.min_questoes_amostra_manutencao}): mantido o intervalo de ${proximoIntervalo} dias.`
          : `Revisão concluída sem registro de questões: mantido o intervalo de ${proximoIntervalo} dias sem suposição de domínio.`;
      }

      const proximaData = addDays(input.dataReal, proximoIntervalo);
      const proximoStatus = this.calcularStatus(proximaData, null, hoje);
      const proximoNumeroCiclo = (rev.numero_ciclo_manutencao || 0) + 1;
      const proximoId = `rev-manut-${rev.assunto_id}-${proximoNumeroCiclo}-${crypto.randomBytes(4).toString('hex')}`;

      db.prepare(`
        INSERT INTO revisoes (
          id, assunto_id, ciclo, numero_ciclo_manutencao,
          data_prevista, data_real, status, intervalo_dias,
          sessao_questao_id, observacoes, revisoes_substituidas_ids,
          heuristica_intervalo_motivo, criado_em, atualizado_em
        ) VALUES (?, ?, 'manutencao', ?, ?, NULL, ?, ?, NULL, NULL, NULL, ?, ?, ?)
      `).run(proximoId, rev.assunto_id, proximoNumeroCiclo, proximaData, proximoStatus, proximoIntervalo, motivoHeuristica, now, now);

      proximaRevisao = {
        id: proximoId,
        assunto_id: rev.assunto_id,
        ciclo: 'manutencao',
        numero_ciclo_manutencao: proximoNumeroCiclo,
        data_prevista: proximaData,
        data_real: null,
        status: proximoStatus,
        intervalo_dias: proximoIntervalo,
        sessao_questao_id: null,
        observacoes: null,
        revisoes_substituidas_ids: null,
        heuristica_intervalo_motivo: motivoHeuristica
      };
    }

    return {
      revisaoConcluida: revisaoAtualizada,
      proximaRevisao
    };
  }

  /**
   * Revisão de Recuperação: unifica múltiplas etapas atrasadas do mesmo assunto em uma só.
   */
  static criarRevisaoRecuperacao(
    assuntoId: string,
    revisoesAtrasadasIds: string[],
    dataAgendada: string = getTodayDateString(),
    hoje: string = getTodayDateString()
  ): RevisaoRecord {
    const db = getDatabase();
    const now = new Date().toISOString();

    if (!revisoesAtrasadasIds || revisoesAtrasadasIds.length < 2) {
      throw new Error('A revisão de recuperação requer a unificação de 2 ou mais revisões atrasadas.');
    }

    const placeholders = revisoesAtrasadasIds.map(() => '?').join(',');
    const revisoes = db.prepare(`
      SELECT * FROM revisoes
      WHERE id IN (${placeholders}) AND assunto_id = ? AND status = 'atrasada'
    `).all(...revisoesAtrasadasIds, assuntoId) as unknown as RevisaoRecord[];

    if (revisoes.length !== revisoesAtrasadasIds.length) {
      throw new Error('Algumas das revisões informadas não pertencem ao assunto ou não estão em atraso.');
    }

    const idRecuperacao = `rev-recup-${assuntoId}-${crypto.randomBytes(4).toString('hex')}`;
    const status = this.calcularStatus(dataAgendada, null, hoje);
    const ciclosSubstituidos = revisoes.map(r => r.ciclo).join(', ');
    const motivo = `Revisão de recuperação unificando as etapas atrasadas: ${ciclosSubstituidos}. Preserva o histórico real sem simular datas fictícias.`;

    // 1. Inserir a nova revisão de recuperação
    db.prepare(`
      INSERT INTO revisoes (
        id, assunto_id, ciclo, numero_ciclo_manutencao,
        data_prevista, data_real, status, intervalo_dias,
        sessao_questao_id, observacoes, revisoes_substituidas_ids,
        heuristica_intervalo_motivo, criado_em, atualizado_em
      ) VALUES (?, ?, 'recuperacao', 0, ?, NULL, ?, 7, NULL, NULL, ?, ?, ?, ?)
    `).run(idRecuperacao, assuntoId, dataAgendada, status, JSON.stringify(revisoesAtrasadasIds), motivo, now, now);

    // 2. Marcar as antigas como 'recuperada' para não ficarem duplicadas na fila
    const markRecuperada = db.prepare(`
      UPDATE revisoes
      SET status = 'recuperada', observacoes = ?, atualizado_em = ?
      WHERE id = ?
    `);

    for (const r of revisoes) {
      markRecuperada.run(`Substituída pela revisão de recuperação ${idRecuperacao} em ${now}`, now, r.id);
    }

    return {
      id: idRecuperacao,
      assunto_id: assuntoId,
      ciclo: 'recuperacao',
      numero_ciclo_manutencao: 0,
      data_prevista: dataAgendada,
      data_real: null,
      status,
      intervalo_dias: 7,
      sessao_questao_id: null,
      observacoes: null,
      revisoes_substituidas_ids: JSON.stringify(revisoesAtrasadasIds),
      heuristica_intervalo_motivo: motivo
    };
  }

  /**
   * Desfaz a conclusão de uma revisão de forma consistente.
   */
  static desfazerConclusao(revisaoId: string, hoje: string = getTodayDateString()): RevisaoRecord {
    const db = getDatabase();
    const now = new Date().toISOString();

    const rev = db.prepare('SELECT * FROM revisoes WHERE id = ?').get(revisaoId) as RevisaoRecord | undefined;
    if (!rev) {
      throw new Error(`Revisão ${revisaoId} não encontrada.`);
    }

    if (rev.status !== 'concluida') {
      throw new Error(`A revisão ${revisaoId} não está concluída.`);
    }

    // Se gerou um ciclo de manutenção posterior pendente, remove o ciclo órfão
    if (rev.ciclo === '30d' || rev.ciclo === 'manutencao') {
      const cicloPosterior = (rev.numero_ciclo_manutencao || 0) + 1;
      db.prepare(`
        DELETE FROM revisoes
        WHERE assunto_id = ? AND ciclo = 'manutencao' AND numero_ciclo_manutencao = ? AND status != 'concluida'
      `).run(rev.assunto_id, cicloPosterior);
    }

    // Recalcular status
    const status = this.calcularStatus(rev.data_prevista, null, hoje);

    db.prepare(`
      UPDATE revisoes
      SET status = ?, data_real = NULL, atualizado_em = ?
      WHERE id = ?
    `).run(status, now, revisaoId);

    return {
      ...rev,
      status,
      data_real: null
    };
  }
}
