# 🎯 Plano de Estudo - Bacen & Concursos Públicos

Sistema completo para planejamento, acompanhamento e registro de estudos para concursos públicos (com foco no Bacen - Banco Central do Brasil).

---

## 🚀 Funcionalidades

- **📊 Painel Geral (Dashboard)**:
  - Meta semanal com cálculo automático de horas estudadas na semana (Segunda a Domingo).
  - Distribuição diária de horas (gráfico interativo com destaque para o dia de hoje).
  - Contagem regressiva até a data da prova.
  - Taxa de acerto em questões e cobertura do edital.
- **📚 Conteúdo Programático & Árvore do Edital**:
  - Estrutura hierárquica por disciplinas, tópicos e subtópicos / aulas.
  - **Registro de Sessões de Estudo**: Registro detalhado com tempo estudado (minutos), questões resolvidas, acertos/erros, data e anotações.
  - Atribuição de status "Em Estudo" ou "Concluído" dinamicamente.
  - Histórico de sessões por tópico com opção de exclusão.
- **📅 Agenda & Blocos de Estudo**:
  - Planejamento de sessões com metas de estudo e questões.
- **🔄 Revisões Espaçadas**:
  - Fila de revisões por intervalo para consolidação de conteúdo.
- **📝 Simulados & Cadernos de Questões**:
  - Acompanhamento de pontuação líquida e desempenho por disciplina.
- **☁️ Sincronização Local-First com Supabase**:
  - Banco local SQLite ultrarrápido com sincronização e backup na nuvem (Supabase PostgreSQL).

---

## 🛠️ Tecnologias Utilizadas

- **Frontend**: React + TypeScript + Vite + TailwindCSS / Lucide Icons.
- **Backend**: Node.js + Express + TypeScript.
- **Banco de Dados**: SQLite (better-sqlite3) local-first.
- **Nuvem**: Supabase (PostgreSQL).

---

## 📦 Como Executar

### Pré-requisitos
- Node.js (versão 18+)
- npm

### 1. Iniciar o projeto
Para rodar tanto o servidor backend quanto o frontend simultaneamente:
```bash
./iniciar.cmd
# ou:
npm run dev
```

O frontend estará disponível em `http://localhost:5173` e a API em `http://localhost:3001`.

### 2. Rodar os testes
```bash
./testar.cmd
# ou:
npm test
```

### 3. Sincronizar com o Supabase
```bash
./sincronizar_supabase.cmd
# ou:
npm run sync:supabase
```

---

## ⚙️ Configuração do Supabase (.env)

Crie o arquivo `server/.env` com as seguintes credenciais:
```env
PORT=3001
CORS_ORIGIN=http://localhost:5173
DB_PATH=data/concurso.db
SUPABASE_URL=https://vbnzvyxhfnsmbmgxahvn.supabase.co
SUPABASE_ANON_KEY=sb_publishable_Cc5mzW95IawMdriLtuLAvw_TAETHR4a
```
