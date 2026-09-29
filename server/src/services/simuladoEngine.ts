import crypto from 'crypto';
import { getDatabase } from '../db/database.js';
import { getTodayDateString } from '../utils/dateUtils.js';

export interface RegistrarSimuladoInput {
  concursoId?: string;
  titulo: string;
  data?: string;
  tempoGastoMinutos?: number;
  itensCertosP1: number;
  itensErradosP1: number;
  itensBrancoP1?: number;
  itensCertosP2: number;
  itensErradosP2: number;
  itensBrancoP2?: number;
  notaDiscursiva?: number;
  observacoes?: string;
}

export class SimuladoEngine {
  /**
   * Calcula pontuações de acordo com a regra CESPE do Edital BACEN 2013 Técnico.
   */
  static calcularResultadoCespe(input: {
    itensCertosP1: number;
    itensErradosP1: number;
    itensCertosP2: number;
    itensErradosP2: number;
    notaDiscursiva?: number;
  }) {
    // Validar P1 (máx 60)
    const totalP1 = input.itensCertosP1 + input.itensErradosP1;
    if (totalP1 > 60) {
      throw new Error(`A soma de acertos e erros em P1 (${totalP1}) não pode superar o total de itens (60).`);
    }

    // Validar P2 (máx 60)
    const totalP2 = input.itensCertosP2 + input.itensErradosP2;
    if (totalP2 > 60) {
      throw new Error(`A soma de acertos e erros em P2 (${totalP2}) não pode superar o total de itens (60).`);
    }

    // Nota líquida CESPE: Acertos - Erros
    const notaP1Liquida = input.itensCertosP1 - input.itensErradosP1;
    const notaP2Liquida = input.itensCertosP2 - input.itensErradosP2;
    const notaTotalLiquida = notaP1Liquida + notaP2Liquida;

    // Critérios eliminatórios oficiais (Subitem 8.10.5)
    const aprovadoP1 = notaP1Liquida >= 12.0;
    const aprovadoP2 = notaP2Liquida >= 18.0;
    const aprovadoConjunto = notaTotalLiquida >= 36.0;

    let discursivaAprovada: boolean | null = null;
    if (input.notaDiscursiva !== undefined && input.notaDiscursiva !== null) {
      if (input.notaDiscursiva < 0 || input.notaDiscursiva > 50) {
        throw new Error('A nota da prova discursiva deve estar entre 0,00 e 50,00 pontos.');
      }
      discursivaAprovada = input.notaDiscursiva >= 25.0; // Subitem 9.8.1
    }

    const aprovadoMinimos = aprovadoP1 && aprovadoP2 && aprovadoConjunto && (discursivaAprovada === null || discursivaAprovada);

    const motivosReprovacao: string[] = [];
    if (!aprovadoP1) motivosReprovacao.push(`Nota em P1 (${notaP1Liquida}) abaixo do mínimo exigido (12,00).`);
    if (!aprovadoP2) motivosReprovacao.push(`Nota em P2 (${notaP2Liquida}) abaixo do mínimo exigido (18,00).`);
    if (!aprovadoConjunto) motivosReprovacao.push(`Nota no conjunto P1+P2 (${notaTotalLiquida}) abaixo do mínimo exigido (36,00).`);
    if (discursivaAprovada === false) motivosReprovacao.push(`Nota da discursiva (${input.notaDiscursiva}) abaixo do mínimo (25,00).`);

    return {
      notaP1Liquida,
      notaP2Liquida,
      notaTotalLiquida,
      aprovadoP1,
      aprovadoP2,
      aprovadoConjunto,
      discursivaAprovada,
      aprovadoMinimos,
      motivosReprovacao
    };
  }

  /**
   * Salva o registro de um simulado completo com os cálculos oficiais.
   */
  static registrarSimulado(input: RegistrarSimuladoInput, hoje: string = getTodayDateString()) {
    const db = getDatabase();
    const now = new Date().toISOString();
    const data = input.data || hoje;
    const concursoId = input.concursoId || 'bacen-2013-tecnico-area-1';

    const resultado = this.calcularResultadoCespe({
      itensCertosP1: input.itensCertosP1,
      itensErradosP1: input.itensErradosP1,
      itensCertosP2: input.itensCertosP2,
      itensErradosP2: input.itensErradosP2,
      notaDiscursiva: input.notaDiscursiva
    });

    const itensBrancoP1 = input.itensBrancoP1 ?? Math.max(0, 60 - (input.itensCertosP1 + input.itensErradosP1));
    const itensBrancoP2 = input.itensBrancoP2 ?? Math.max(0, 60 - (input.itensCertosP2 + input.itensErradosP2));

    const id = `sim-${crypto.randomBytes(6).toString('hex')}`;

    db.prepare(`
      INSERT INTO simulados (
        id, concurso_id, titulo, data, tempo_gasto_minutos,
        itens_certos_p1, itens_errados_p1, itens_branco_p1, nota_p1_liquida,
        itens_certos_p2, itens_errados_p2, itens_branco_p2, nota_p2_liquida,
        nota_total_liquida, aprovado_minimos, nota_discursiva, discursiva_aprovada,
        observacoes, criado_em
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      concursoId,
      input.titulo,
      data,
      input.tempoGastoMinutos || null,
      input.itensCertosP1,
      input.itensErradosP1,
      itensBrancoP1,
      resultado.notaP1Liquida,
      input.itensCertosP2,
      input.itensErradosP2,
      itensBrancoP2,
      resultado.notaP2Liquida,
      resultado.notaTotalLiquida,
      resultado.aprovadoMinimos ? 1 : 0,
      input.notaDiscursiva ?? null,
      resultado.discursivaAprovada !== null ? (resultado.discursivaAprovada ? 1 : 0) : null,
      input.observacoes || null,
      now
    );

    return {
      simulado: db.prepare('SELECT * FROM simulados WHERE id = ?').get(id),
      resultado
    };
  }

  /**
   * Lista todos os simulados realizados.
   */
  static listarSimulados(concursoId: string = 'bacen-2013-tecnico-area-1') {
    const db = getDatabase();
    return db.prepare('SELECT * FROM simulados WHERE concurso_id = ? ORDER BY data DESC, criado_em DESC').all(concursoId);
  }
}
