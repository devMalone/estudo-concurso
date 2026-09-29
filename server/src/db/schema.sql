-- Schema do Aplicativo de Preparação para Concurso BACEN Técnico
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS concursos (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  orgao TEXT NOT NULL,
  banca TEXT NOT NULL,
  edital_numero TEXT NOT NULL,
  cargo TEXT NOT NULL,
  area TEXT NOT NULL,
  escolaridade TEXT NOT NULL,
  remuneracao_inicial REAL NOT NULL,
  jornada_horas INTEGER NOT NULL,
  data_prova TEXT,
  data_prova_estimada INTEGER DEFAULT 0,
  ativo INTEGER DEFAULT 1,
  criado_em TEXT NOT NULL,
  atualizado_em TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS etapas_concurso (
  id TEXT PRIMARY KEY,
  concurso_id TEXT NOT NULL,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL, -- 'objetiva_c_e', 'discursiva', 'capacitacao'
  quantidade_itens INTEGER NOT NULL,
  pontuacao_maxima REAL NOT NULL,
  pontuacao_minima REAL NOT NULL,
  peso REAL DEFAULT 1.0,
  carater TEXT NOT NULL, -- 'eliminatorio_classificatorio'
  duracao_minutos INTEGER NOT NULL,
  regras_pontuacao TEXT NOT NULL, -- JSON
  FOREIGN KEY (concurso_id) REFERENCES concursos(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS disciplinas (
  id TEXT PRIMARY KEY,
  concurso_id TEXT NOT NULL,
  grupo TEXT NOT NULL, -- 'Conhecimentos Básicos' ou 'Conhecimentos Específicos'
  nome TEXT NOT NULL,
  ordem INTEGER NOT NULL,
  peso REAL DEFAULT 1.0,
  quantidade_itens_estimada INTEGER DEFAULT 0,
  criado_em TEXT NOT NULL,
  FOREIGN KEY (concurso_id) REFERENCES concursos(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS assuntos (
  id TEXT PRIMARY KEY,
  disciplina_id TEXT NOT NULL,
  parent_id TEXT,
  codigo_edital TEXT NOT NULL,
  titulo TEXT NOT NULL,
  nivel INTEGER NOT NULL, -- 1=Tópico, 2=Subtópico, 3=Detalhe
  ordem INTEGER NOT NULL,
  trecho_original_edital TEXT,
  pagina_edital INTEGER,
  is_sugestao_estudo INTEGER DEFAULT 0,
  criado_em TEXT NOT NULL,
  FOREIGN KEY (disciplina_id) REFERENCES disciplinas(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES assuntos(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS estudos (
  id TEXT PRIMARY KEY,
  assunto_id TEXT NOT NULL UNIQUE,
  concluido INTEGER DEFAULT 0,
  data_estudo TEXT,
  tempo_minutos INTEGER DEFAULT 0,
  anotacoes TEXT,
  materiais TEXT,
  criado_em TEXT NOT NULL,
  atualizado_em TEXT NOT NULL,
  FOREIGN KEY (assunto_id) REFERENCES assuntos(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sessoes_estudo (
  id TEXT PRIMARY KEY,
  assunto_id TEXT NOT NULL,
  disciplina_id TEXT NOT NULL,
  data TEXT NOT NULL,
  tempo_minutos INTEGER NOT NULL,
  questoes_realizadas INTEGER DEFAULT 0,
  questoes_acertos INTEGER DEFAULT 0,
  questoes_erros INTEGER DEFAULT 0,
  anotacoes TEXT,
  concluiu_topico INTEGER DEFAULT 0,
  criado_em TEXT NOT NULL,
  FOREIGN KEY (assunto_id) REFERENCES assuntos(id) ON DELETE CASCADE,
  FOREIGN KEY (disciplina_id) REFERENCES disciplinas(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sessoes_questoes (
  id TEXT PRIMARY KEY,
  disciplina_id TEXT NOT NULL,
  assunto_id TEXT,
  revisao_id TEXT,
  data TEXT NOT NULL,
  total_questoes INTEGER NOT NULL,
  acertos INTEGER NOT NULL,
  erros INTEGER NOT NULL,
  taxa_acerto REAL NOT NULL,
  origem TEXT,
  observacoes TEXT,
  tipo TEXT NOT NULL, -- 'estudo_inicial', 'revisao', 'treino_avulso', 'simulado'
  criado_em TEXT NOT NULL,
  FOREIGN KEY (disciplina_id) REFERENCES disciplinas(id) ON DELETE CASCADE,
  FOREIGN KEY (assunto_id) REFERENCES assuntos(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS revisoes (
  id TEXT PRIMARY KEY,
  assunto_id TEXT NOT NULL,
  ciclo TEXT NOT NULL, -- '7d', '15d', '30d', 'manutencao', 'recuperacao'
  numero_ciclo_manutencao INTEGER DEFAULT 0,
  data_prevista TEXT NOT NULL,
  data_real TEXT,
  status TEXT NOT NULL, -- 'agendada', 'disponivel', 'atrasada', 'concluida', 'recuperada'
  intervalo_dias INTEGER NOT NULL,
  sessao_questao_id TEXT,
  observacoes TEXT,
  revisoes_substituidas_ids TEXT, -- JSON array
  heuristica_intervalo_motivo TEXT,
  criado_em TEXT NOT NULL,
  atualizado_em TEXT NOT NULL,
  FOREIGN KEY (assunto_id) REFERENCES assuntos(id) ON DELETE CASCADE,
  FOREIGN KEY (sessao_questao_id) REFERENCES sessoes_questoes(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS rotina_config (
  id TEXT PRIMARY KEY DEFAULT 'config_padrao',
  concurso_id TEXT,
  dias_semana_disponiveis TEXT NOT NULL, -- JSON: [1,2,3,4,5,6] (0=dom, 1=seg...)
  minutos_por_dia TEXT NOT NULL, -- JSON: {"0":180,"1":240,...}
  duracao_bloco_minutos INTEGER DEFAULT 50,
  pausa_minutos INTEGER DEFAULT 10,
  dias_indisponiveis TEXT DEFAULT '[]', -- JSON array de YYYY-MM-DD
  proporcao_estudo_novo REAL DEFAULT 0.50,
  proporcao_revisoes REAL DEFAULT 0.30,
  proporcao_questoes REAL DEFAULT 0.20,
  min_questoes_amostra_manutencao INTEGER DEFAULT 5,
  faixa_baixo_acerto_dias INTEGER DEFAULT 7,
  faixa_medio_acerto_dias INTEGER DEFAULT 15,
  faixa_alto_acerto_dias INTEGER DEFAULT 30,
  faixa_excelente_acerto_dias INTEGER DEFAULT 45,
  FOREIGN KEY (concurso_id) REFERENCES concursos(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS agenda_blocos (
  id TEXT PRIMARY KEY,
  concurso_id TEXT NOT NULL,
  data TEXT NOT NULL,
  hora_inicio TEXT,
  hora_fim TEXT,
  duracao_minutos INTEGER NOT NULL,
  disciplina_id TEXT NOT NULL,
  assunto_id TEXT,
  revisao_id TEXT,
  tipo TEXT NOT NULL, -- 'estudo_inicial', 'revisao', 'questoes', 'simulado'
  status TEXT NOT NULL, -- 'pendente', 'em_andamento', 'concluido', 'reagendado', 'cancelado'
  fixado INTEGER DEFAULT 0,
  motivo_prioridade TEXT,
  concluido_em TEXT,
  criado_em TEXT NOT NULL,
  FOREIGN KEY (concurso_id) REFERENCES concursos(id) ON DELETE CASCADE,
  FOREIGN KEY (disciplina_id) REFERENCES disciplinas(id) ON DELETE CASCADE,
  FOREIGN KEY (assunto_id) REFERENCES assuntos(id) ON DELETE SET NULL,
  FOREIGN KEY (revisao_id) REFERENCES revisoes(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS simulados (
  id TEXT PRIMARY KEY,
  concurso_id TEXT NOT NULL,
  titulo TEXT NOT NULL,
  data TEXT NOT NULL,
  tempo_gasto_minutos INTEGER,
  itens_certos_p1 INTEGER NOT NULL,
  itens_errados_p1 INTEGER NOT NULL,
  itens_branco_p1 INTEGER NOT NULL,
  nota_p1_liquida REAL NOT NULL,
  itens_certos_p2 INTEGER NOT NULL,
  itens_errados_p2 INTEGER NOT NULL,
  itens_branco_p2 INTEGER NOT NULL,
  nota_p2_liquida REAL NOT NULL,
  nota_total_liquida REAL NOT NULL,
  aprovado_minimos INTEGER NOT NULL, -- 1 ou 0
  nota_discursiva REAL,
  discursiva_aprovada INTEGER,
  observacoes TEXT,
  criado_em TEXT NOT NULL,
  FOREIGN KEY (concurso_id) REFERENCES concursos(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS backup_logs (
  id TEXT PRIMARY KEY,
  tipo TEXT NOT NULL, -- 'export', 'import'
  sha256 TEXT NOT NULL,
  tamanho_bytes INTEGER NOT NULL,
  total_registros INTEGER NOT NULL,
  criado_em TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS supabase_config (
  id TEXT PRIMARY KEY DEFAULT 'supabase_default',
  url TEXT,
  anon_key TEXT,
  ultimo_sync TEXT,
  status_sync TEXT
);

-- Índices essenciais para consultas frequentes e rápidas
CREATE INDEX IF NOT EXISTS idx_assuntos_disciplina ON assuntos(disciplina_id);
CREATE INDEX IF NOT EXISTS idx_assuntos_parent ON assuntos(parent_id);
CREATE INDEX IF NOT EXISTS idx_estudos_assunto ON estudos(assunto_id);
CREATE INDEX IF NOT EXISTS idx_revisoes_assunto ON revisoes(assunto_id);
CREATE INDEX IF NOT EXISTS idx_revisoes_status ON revisoes(status);
CREATE INDEX IF NOT EXISTS idx_revisoes_data_prevista ON revisoes(data_prevista);
CREATE INDEX IF NOT EXISTS idx_sessoes_disciplina ON sessoes_questoes(disciplina_id);
CREATE INDEX IF NOT EXISTS idx_sessoes_assunto ON sessoes_questoes(assunto_id);
CREATE INDEX IF NOT EXISTS idx_sessoes_data ON sessoes_questoes(data);
CREATE INDEX IF NOT EXISTS idx_agenda_data ON agenda_blocos(data);
CREATE INDEX IF NOT EXISTS idx_agenda_status ON agenda_blocos(status);
CREATE INDEX IF NOT EXISTS idx_sessoes_estudo_assunto ON sessoes_estudo(assunto_id);
CREATE INDEX IF NOT EXISTS idx_sessoes_estudo_data ON sessoes_estudo(data);
CREATE INDEX IF NOT EXISTS idx_sessoes_estudo_disciplina ON sessoes_estudo(disciplina_id);
