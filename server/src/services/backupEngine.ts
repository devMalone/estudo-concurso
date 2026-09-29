import crypto from 'crypto';
import { getDatabase } from '../db/database.js';

export interface BackupPayload {
  versao: string;
  geradoEm: string;
  sha256?: string;
  dados: {
    concursos: any[];
    etapas_concurso: any[];
    disciplinas: any[];
    assuntos: any[];
    estudos: any[];
    sessoes_estudo?: any[];
    sessoes_questoes: any[];
    revisoes: any[];
    rotina_config: any[];
    agenda_blocos: any[];
    simulados: any[];
  };
}

export class BackupEngine {
  /**
   * Exporta todo o banco de dados em formato JSON com hash SHA-256 para integridade.
   */
  static exportarBackup(): BackupPayload {
    const db = getDatabase();
    const tabelas = [
      'concursos',
      'etapas_concurso',
      'disciplinas',
      'assuntos',
      'estudos',
      'sessoes_estudo',
      'sessoes_questoes',
      'revisoes',
      'rotina_config',
      'agenda_blocos',
      'simulados'
    ];

    const dados: any = {};
    let totalLinhas = 0;

    for (const tab of tabelas) {
      const rows = db.prepare(`SELECT * FROM ${tab}`).all();
      dados[tab] = rows;
      totalLinhas += rows.length;
    }

    const payloadSemHash = {
      versao: '1.0.0',
      geradoEm: new Date().toISOString(),
      dados
    };

    const jsonStr = JSON.stringify(payloadSemHash);
    const hash = crypto.createHash('sha256').update(jsonStr).digest('hex');

    const payloadFinal: BackupPayload = {
      ...payloadSemHash,
      sha256: hash
    };

    // Registrar no histórico de backups
    const now = new Date().toISOString();
    const logId = `bkp-${crypto.randomBytes(6).toString('hex')}`;
    db.prepare(`
      INSERT INTO backup_logs (id, tipo, sha256, tamanho_bytes, total_registros, criado_em)
      VALUES (?, 'export', ?, ?, ?, ?)
    `).run(logId, hash, Buffer.byteLength(jsonStr, 'utf8'), totalLinhas, now);

    return payloadFinal;
  }

  /**
   * Valida e restaura um backup no banco de dados com transação atômica.
   */
  static restaurarBackup(payload: BackupPayload): { restaurado: boolean; totalRegistros: number; hashVerificado: boolean } {
    if (!payload || !payload.dados || typeof payload.dados !== 'object') {
      throw new Error('Arquivo de backup inválido: estrutura de dados ausente.');
    }

    // Verificar integridade do hash se fornecido
    let hashVerificado = false;
    if (payload.sha256) {
      const payloadToCheck = {
        versao: payload.versao,
        geradoEm: payload.geradoEm,
        dados: payload.dados
      };
      const computed = crypto.createHash('sha256').update(JSON.stringify(payloadToCheck)).digest('hex');
      hashVerificado = (computed === payload.sha256);
      if (!hashVerificado) {
        throw new Error('Falha na verificação de integridade SHA-256 do backup. O arquivo pode estar corrompido.');
      }
    }

    const db = getDatabase();
    const tabelas = [
      'simulados',
      'agenda_blocos',
      'revisoes',
      'sessoes_estudo',
      'sessoes_questoes',
      'estudos',
      'assuntos',
      'disciplinas',
      'etapas_concurso',
      'rotina_config',
      'concursos'
    ];

    // Transação de restauração
    db.exec('BEGIN TRANSACTION;');

    try {
      // 1. Limpar tabelas existentes
      for (const tab of tabelas) {
        db.exec(`DELETE FROM ${tab};`);
      }

      // 2. Inserir dados na ordem correta respeitando FKs
      const ordemInsercao = [...tabelas].reverse();
      let totalRestaurados = 0;

      for (const tab of ordemInsercao) {
        const registros = payload.dados[tab as keyof typeof payload.dados] || [];
        if (registros.length === 0) continue;

        const cols = Object.keys(registros[0]);
        const placeholders = cols.map(() => '?').join(',');
        const sql = `INSERT INTO ${tab} (${cols.join(',')}) VALUES (${placeholders})`;
        const insertStmt = db.prepare(sql);

        for (const row of registros) {
          const values = cols.map(c => row[c]);
          insertStmt.run(...values);
          totalRestaurados++;
        }
      }

      db.exec('COMMIT;');

      // Registrar log de importação
      const logId = `bkp-imp-${crypto.randomBytes(6).toString('hex')}`;
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO backup_logs (id, tipo, sha256, tamanho_bytes, total_registros, criado_em)
        VALUES (?, 'import', ?, ?, ?, ?)
      `).run(logId, payload.sha256 || 'manual', JSON.stringify(payload).length, totalRestaurados, now);

      return {
        restaurado: true,
        totalRegistros: totalRestaurados,
        hashVerificado
      };
    } catch (err: any) {
      db.exec('ROLLBACK;');
      throw new Error(`Erro ao restaurar backup: ${err.message}. Dados anteriores foram preservados.`);
    }
  }

  /**
   * Retorna os scripts DDL prontos para criar as tabelas no Supabase caso o usuário deseje sincronizar.
   */
  static getSupabaseSchemaScript(): string {
    return `
-- SCRIPT DE CRIAÇÃO PARA SUPABASE (PostgreSQL)
-- Copie e cole no SQL Editor do seu projeto Supabase:

CREATE TABLE IF NOT EXISTS concursos (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  orgao TEXT NOT NULL,
  banca TEXT NOT NULL,
  edital_numero TEXT NOT NULL,
  cargo TEXT NOT NULL,
  area TEXT NOT NULL,
  escolaridade TEXT NOT NULL,
  remuneracao_inicial NUMERIC NOT NULL,
  jornada_horas INT NOT NULL,
  data_prova DATE,
  data_prova_estimada INT DEFAULT 0,
  ativo INT DEFAULT 1,
  criado_em TIMESTAMPTZ NOT NULL,
  atualizado_em TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS etapas_concurso (
  id TEXT PRIMARY KEY,
  concurso_id TEXT REFERENCES concursos(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL,
  quantidade_itens INT NOT NULL,
  pontuacao_maxima NUMERIC NOT NULL,
  pontuacao_minima NUMERIC NOT NULL,
  peso NUMERIC DEFAULT 1.0,
  carater TEXT NOT NULL,
  duracao_minutos INT NOT NULL,
  regras_pontuacao JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS disciplinas (
  id TEXT PRIMARY KEY,
  concurso_id TEXT REFERENCES concursos(id) ON DELETE CASCADE,
  grupo TEXT NOT NULL,
  nome TEXT NOT NULL,
  ordem INT NOT NULL,
  peso NUMERIC DEFAULT 1.0,
  quantidade_itens_estimada INT DEFAULT 0,
  criado_em TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS assuntos (
  id TEXT PRIMARY KEY,
  disciplina_id TEXT REFERENCES disciplinas(id) ON DELETE CASCADE,
  parent_id TEXT REFERENCES assuntos(id) ON DELETE CASCADE,
  codigo_edital TEXT NOT NULL,
  titulo TEXT NOT NULL,
  nivel INT NOT NULL,
  ordem INT NOT NULL,
  trecho_original_edital TEXT,
  pagina_edital INT,
  is_sugestao_estudo INT DEFAULT 0,
  criado_em TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS estudos (
  id TEXT PRIMARY KEY,
  assunto_id TEXT REFERENCES assuntos(id) ON DELETE CASCADE UNIQUE,
  concluido INT DEFAULT 0,
  data_estudo DATE,
  tempo_minutos INT DEFAULT 0,
  anotacoes TEXT,
  materiais TEXT,
  criado_em TIMESTAMPTZ NOT NULL,
  atualizado_em TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS sessoes_estudo (
  id TEXT PRIMARY KEY,
  assunto_id TEXT REFERENCES assuntos(id) ON DELETE CASCADE,
  disciplina_id TEXT REFERENCES disciplinas(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  tempo_minutos INT NOT NULL,
  questoes_realizadas INT DEFAULT 0,
  questoes_acertos INT DEFAULT 0,
  questoes_erros INT DEFAULT 0,
  anotacoes TEXT,
  concluiu_topico INT DEFAULT 0,
  criado_em TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS sessoes_questoes (
  id TEXT PRIMARY KEY,
  disciplina_id TEXT REFERENCES disciplinas(id) ON DELETE CASCADE,
  assunto_id TEXT REFERENCES assuntos(id) ON DELETE SET NULL,
  revisao_id TEXT,
  data DATE NOT NULL,
  total_questoes INT NOT NULL,
  acertos INT NOT NULL,
  erros INT NOT NULL,
  taxa_acerto NUMERIC NOT NULL,
  origem TEXT,
  observacoes TEXT,
  tipo TEXT NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS revisoes (
  id TEXT PRIMARY KEY,
  assunto_id TEXT REFERENCES assuntos(id) ON DELETE CASCADE,
  ciclo TEXT NOT NULL,
  numero_ciclo_manutencao INT DEFAULT 0,
  data_prevista DATE NOT NULL,
  data_real DATE,
  status TEXT NOT NULL,
  intervalo_dias INT NOT NULL,
  sessao_questao_id TEXT REFERENCES sessoes_questoes(id) ON DELETE SET NULL,
  observacoes TEXT,
  revisoes_substituidas_ids JSONB,
  heuristica_intervalo_motivo TEXT,
  criado_em TIMESTAMPTZ NOT NULL,
  atualizado_em TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS rotina_config (
  id TEXT PRIMARY KEY DEFAULT 'config_padrao',
  concurso_id TEXT REFERENCES concursos(id) ON DELETE CASCADE,
  dias_semana_disponiveis JSONB NOT NULL,
  minutos_por_dia JSONB NOT NULL,
  duracao_bloco_minutos INT DEFAULT 50,
  pausa_minutos INT DEFAULT 10,
  dias_indisponiveis JSONB DEFAULT '[]',
  proporcao_estudo_novo NUMERIC DEFAULT 0.50,
  proporcao_revisoes NUMERIC DEFAULT 0.30,
  proporcao_questoes NUMERIC DEFAULT 0.20,
  min_questoes_amostra_manutencao INT DEFAULT 5,
  faixa_baixo_acerto_dias INT DEFAULT 7,
  faixa_medio_acerto_dias INT DEFAULT 15,
  faixa_alto_acerto_dias INT DEFAULT 30,
  faixa_excelente_acerto_dias INT DEFAULT 45
);

CREATE TABLE IF NOT EXISTS agenda_blocos (
  id TEXT PRIMARY KEY,
  concurso_id TEXT REFERENCES concursos(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  hora_inicio TIME,
  hora_fim TIME,
  duracao_minutos INT NOT NULL,
  disciplina_id TEXT REFERENCES disciplinas(id) ON DELETE CASCADE,
  assunto_id TEXT REFERENCES assuntos(id) ON DELETE SET NULL,
  revisao_id TEXT REFERENCES revisoes(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL,
  status TEXT NOT NULL,
  fixado INT DEFAULT 0,
  motivo_prioridade TEXT,
  concluido_em TIMESTAMPTZ,
  criado_em TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS simulados (
  id TEXT PRIMARY KEY,
  concurso_id TEXT REFERENCES concursos(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  data DATE NOT NULL,
  tempo_gasto_minutos INT,
  itens_certos_p1 INT NOT NULL,
  itens_errados_p1 INT NOT NULL,
  itens_branco_p1 INT NOT NULL,
  nota_p1_liquida NUMERIC NOT NULL,
  itens_certos_p2 INT NOT NULL,
  itens_errados_p2 INT NOT NULL,
  itens_branco_p2 INT NOT NULL,
  nota_p2_liquida NUMERIC NOT NULL,
  nota_total_liquida NUMERIC NOT NULL,
  aprovado_minimos INT NOT NULL,
  nota_discursiva NUMERIC,
  discursiva_aprovada INT,
  observacoes TEXT,
  criado_em TIMESTAMPTZ NOT NULL
);

ALTER TABLE IF EXISTS concursos DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS etapas_concurso DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS disciplinas DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS assuntos DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS estudos DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sessoes_estudo DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sessoes_questoes DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS revisoes DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS rotina_config DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS agenda_blocos DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS simulados DISABLE ROW LEVEL SECURITY;
`;
  }
}
