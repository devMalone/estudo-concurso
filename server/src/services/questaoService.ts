import crypto from 'crypto';
import { getDatabase } from '../db/database.js';
import { getTodayDateString } from '../utils/dateUtils.js';

export interface CriarSessaoInput {
  disciplinaId: string;
  assuntoId?: string | null;
  revisaoId?: string | null;
  data?: string;
  totalQuestoes: number;
  acertos: number;
  origem?: string;
  observacoes?: string;
  tipo: 'estudo_inicial' | 'revisao' | 'treino_avulso' | 'simulado';
}

export interface AtualizarSessaoInput {
  data?: string;
  totalQuestoes?: number;
  acertos?: number;
  origem?: string;
  observacoes?: string;
  tipo?: 'estudo_inicial' | 'revisao' | 'treino_avulso' | 'simulado';
}

export class QuestaoService {
  /**
   * Validação estrita de dados de sessão de questões.
   */
  static validar(total: number, acertos: number) {
    if (!Number.isInteger(total) || total <= 0) {
      throw new Error('O total de questões deve ser um número inteiro maior que zero.');
    }
    if (!Number.isInteger(acertos) || acertos < 0) {
      throw new Error('O número de acertos deve ser um inteiro maior ou igual a zero.');
    }
    if (acertos > total) {
      throw new Error(`A quantidade de acertos (${acertos}) não pode exceder o total de questões (${total}).`);
    }
  }

  /**
   * Registra uma nova sessão histórica de questões.
   */
  static criarSessao(input: CriarSessaoInput, hoje: string = getTodayDateString()): any {
    this.validar(input.totalQuestoes, input.acertos);

    const db = getDatabase();
    const id = `sess-${crypto.randomBytes(6).toString('hex')}`;
    const now = new Date().toISOString();
    const data = input.data || hoje;
    const erros = input.totalQuestoes - input.acertos;
    const taxa = input.acertos / input.totalQuestoes;

    db.prepare(`
      INSERT INTO sessoes_questoes (
        id, disciplina_id, assunto_id, revisao_id, data,
        total_questoes, acertos, erros, taxa_acerto,
        origem, observacoes, tipo, criado_em
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      input.disciplinaId,
      input.assuntoId || null,
      input.revisaoId || null,
      data,
      input.totalQuestoes,
      input.acertos,
      erros,
      taxa,
      input.origem || null,
      input.observacoes || null,
      input.tipo,
      now
    );

    // Se vinculada a uma revisão, vincular na revisão
    if (input.revisaoId) {
      db.prepare(`UPDATE revisoes SET sessao_questao_id = ? WHERE id = ?`).run(id, input.revisaoId);
    }

    return db.prepare('SELECT * FROM sessoes_questoes WHERE id = ?').get(id);
  }

  /**
   * Atualiza uma sessão existente e recalcula taxa e erros.
   */
  static atualizarSessao(id: string, input: AtualizarSessaoInput): any {
    const db = getDatabase();
    const existing = db.prepare('SELECT * FROM sessoes_questoes WHERE id = ?').get(id) as any;
    if (!existing) {
      throw new Error(`Sessão de questões ${id} não encontrada.`);
    }

    const total = input.totalQuestoes !== undefined ? input.totalQuestoes : existing.total_questoes;
    const acertos = input.acertos !== undefined ? input.acertos : existing.acertos;
    this.validar(total, acertos);

    const erros = total - acertos;
    const taxa = acertos / total;

    db.prepare(`
      UPDATE sessoes_questoes
      SET data = ?, total_questoes = ?, acertos = ?, erros = ?, taxa_acerto = ?,
          origem = ?, observacoes = ?, tipo = ?
      WHERE id = ?
    `).run(
      input.data || existing.data,
      total,
      acertos,
      erros,
      taxa,
      input.origem !== undefined ? input.origem : existing.origem,
      input.observacoes !== undefined ? input.observacoes : existing.observacoes,
      input.tipo || existing.tipo,
      id
    );

    return db.prepare('SELECT * FROM sessoes_questoes WHERE id = ?').get(id);
  }

  /**
   * Exclui uma sessão e desvincula da revisão correspondente, se houver.
   */
  static excluirSessao(id: string): void {
    const db = getDatabase();
    db.prepare(`UPDATE revisoes SET sessao_questao_id = NULL WHERE sessao_questao_id = ?`).run(id);
    db.prepare(`DELETE FROM sessoes_questoes WHERE id = ?`).run(id);
  }

  /**
   * Lista o histórico de sessões com filtros.
   */
  static listarSessoes(filtros: { disciplinaId?: string; assuntoId?: string; tipo?: string; limite?: number }) {
    const db = getDatabase();
    let query = `
      SELECT s.*, d.nome as disciplina_nome, a.titulo as assunto_titulo
      FROM sessoes_questoes s
      JOIN disciplinas d ON d.id = s.disciplina_id
      LEFT JOIN assuntos a ON a.id = s.assunto_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filtros.disciplinaId) {
      query += ` AND s.disciplina_id = ?`;
      params.push(filtros.disciplinaId);
    }
    if (filtros.assuntoId) {
      query += ` AND s.assunto_id = ?`;
      params.push(filtros.assuntoId);
    }
    if (filtros.tipo) {
      query += ` AND s.tipo = ?`;
      params.push(filtros.tipo);
    }

    query += ` ORDER BY s.data DESC, s.criado_em DESC`;

    if (filtros.limite) {
      query += ` LIMIT ?`;
      params.push(filtros.limite);
    }

    return db.prepare(query).all(...params);
  }

  /**
   * Estatísticas agregadas globais calculadas estritamente como:
   * Taxa geral = SUM(acertos) / SUM(total_questoes).
   * Nunca média aritmética simples das porcentagens!
   */
  static getEstatisticasGlobais() {
    const db = getDatabase();

    const totais = db.prepare(`
      SELECT
        COUNT(*) as total_sessoes,
        SUM(total_questoes) as soma_questoes,
        SUM(acertos) as soma_acertos,
        SUM(erros) as soma_erros
      FROM sessoes_questoes
    `).get() as any;

    const somaQuestoes = totais.soma_questoes || 0;
    const somaAcertos = totais.soma_acertos || 0;
    const somaErros = totais.soma_erros || 0;

    const taxaGeral = somaQuestoes > 0 ? somaAcertos / somaQuestoes : null;

    // Estatísticas por disciplina
    const porDisciplina = db.prepare(`
      SELECT
        d.id as disciplina_id,
        d.nome as disciplina_nome,
        d.grupo as disciplina_grupo,
        d.peso as disciplina_peso,
        COUNT(s.id) as total_sessoes,
        SUM(s.total_questoes) as soma_questoes,
        SUM(s.acertos) as soma_acertos,
        SUM(s.erros) as soma_erros
      FROM disciplinas d
      LEFT JOIN sessoes_questoes s ON s.disciplina_id = d.id
      GROUP BY d.id
      ORDER BY d.ordem ASC
    `).all() as any[];

    const disciplinasStats = porDisciplina.map(d => {
      const q = d.soma_questoes || 0;
      const a = d.soma_acertos || 0;
      const e = d.soma_erros || 0;
      return {
        disciplina_id: d.disciplina_id,
        disciplina_nome: d.disciplina_nome,
        disciplina_grupo: d.disciplina_grupo,
        disciplina_peso: d.disciplina_peso,
        total_questoes: q,
        acertos: a,
        erros: e,
        taxa_acerto: q > 0 ? a / q : null
      };
    });

    return {
      total_sessoes: totais.total_sessoes || 0,
      total_questoes: somaQuestoes,
      total_acertos: somaAcertos,
      total_erros: somaErros,
      taxa_geral: taxaGeral,
      por_disciplina: disciplinasStats
    };
  }
}
