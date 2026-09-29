# Configuração e Conexão com o Supabase

O aplicativo foi projetado para funcionar de forma **100% autônoma e local com SQLite** (salvo em `server/data/concurso.db`), mas já está totalmente integrado e conectado com o seu projeto **Supabase**.

---

## 1. Suas Credenciais Configuradas

As credenciais do seu projeto Supabase já estão salvas e vinculadas no aplicativo:

* **Project URL:** `https://vbnzvyxhfnsmbmgxahvn.supabase.co`
* **Anon Public Key:** `sb_publishable_Cc5mzW95IawMdriLtuLAvw_TAETHR4a`

Elas estão gravadas no arquivo `server/.env` e no banco local para pré-carregamento automático na interface.

---

## 2. Ajuste de Permissão de Gravação (RLS) no Supabase

No PostgreSQL do Supabase, o recurso *Row Level Security* (RLS) vem ativado por padrão nas tabelas criadas pela interface, bloqueando gravações feitas com a chave anônima pública (*anon key*).

Para permitir que sua aplicação sincronize e grave dados no Supabase sem barreiras de permissão, execute o comando abaixo no **SQL Editor** do Supabase:

```sql
-- Executar no SQL Editor do Supabase para desativar RLS para uso pessoal:
ALTER TABLE IF EXISTS concursos DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS etapas_concurso DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS disciplinas DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS assuntos DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS estudos DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sessoes_questoes DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS revisoes DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS rotina_config DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS agenda_blocos DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS simulados DISABLE ROW LEVEL SECURITY;

-- Garantir coluna area na tabela concursos caso tenha sido criada antes
ALTER TABLE IF EXISTS concursos ADD COLUMN IF NOT EXISTS area TEXT;
```

---

## 3. Sincronização Direta SQLite → Supabase

Criamos um comando pronto para você enviar todo o conteúdo programático do BACEN (9 disciplinas e 92 tópicos) e suas configurações direto para o seu Supabase:

```powershell
node server/dist/syncSupabase.js
```
*(ou execute pelo script de sincronização)*

---

## 4. Estrutura Completa DDL (Referência)

Caso precise recriar qualquer tabela do zero no Supabase:

```sql
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
```
