# Arquitetura do Sistema — Preparação BACEN Técnico

Este documento resume a arquitetura, estrutura de arquivos, portas de execução e fluxo de dados do aplicativo.

---

## 1. Visão Geral da Arquitetura

O sistema é construído como uma aplicação web moderna, desacoplada e modular:

- **Frontend (Client):** Single Page Application em React 18 + TypeScript + Vite + Tailwind CSS. Roda na porta `5173`.
- **Backend (Server):** API REST em Express + TypeScript + SQLite nativo (`node:sqlite`). Roda na porta `3001`.
- **Persistência Local:** Banco de dados SQLite persistente armazenado no arquivo `server/data/concurso.db`. Sem cadastro nem login.
- **Integração Supabase:** Suporte a configuração de credenciais Supabase e script DDL pronto para espelhar ou sincronizar os dados na nuvem.

```
┌──────────────────────────────────────────────┐
│         React 18 SPA (Porta 5173)            │
│  - Dashboard (5 Perguntas Centrais)          │
│  - Árvore Fiel do Edital BACEN               │
│  - Revisões 7/15/30d & Manutenção Pós-30d    │
│  - Agenda Semanal / Diária Anti-Sobrecarga   │
│  - Banco de Treino (Estatística Ponderada)   │
│  - Simulados Oficiais CESPE (+1 / -1)        │
│  - Backup JSON com SHA-256 & Supabase DDL    │
└───────────────────────┬──────────────────────┘
                        │ HTTP / JSON (proxy /api)
┌───────────────────────▼──────────────────────┐
│        Express REST API (Porta 3001)         │
│  - RevisaoEngine (heurística transparente)   │
│  - AssuntoService (progresso sem duplicatas) │
│  - AgendaEngine (distribuição inteligente)   │
│  - SimuladoEngine (critérios eliminatórios)  │
│  - BackupEngine (transação com rollback)     │
└───────────────────────┬──────────────────────┘
                        │
┌───────────────────────▼──────────────────────┐
│  SQLite (node:sqlite)  │  Supabase (Nuvem)   │
│  server/data/concurso  │  Script DDL Pronto  │
└──────────────────────────────────────────────┘
```

---

## 2. Mapa de Pastas e Responsabilidades

```
Plano de Estudo/
├── package.json                 # Scripts raiz (npm run dev, npm test, etc.)
├── tests/
│   └── businessRules.test.cjs   # Testes unitários automatizados das regras críticas
├── docs/                        # Documentação modular para desenvolvimento contínuo
│   ├── ARCHITECTURE.md          # Este arquivo (mapa de pastas e serviços)
│   ├── DATA_MODEL.md            # Esquema do banco, tabelas e chaves
│   ├── BUSINESS_RULES.md        # Regras de negócio (revisões, manutenção, CESPE)
│   ├── SUPABASE_SETUP.md        # Guia de configuração e script para Supabase
│   └── NEXT_STEPS.md            # Estado atual, limitações e próximos passos
│
├── server/                      # Camada de Backend API
│   ├── package.json
│   ├── tsconfig.json
│   ├── data/concurso.db         # Arquivo do banco SQLite persistente
│   └── src/
│       ├── config.ts            # Variáveis de ambiente e constantes
│       ├── server.ts            # Entrypoint HTTP com endpoints REST
│       ├── db/
│       │   ├── schema.sql       # DDL SQL de todas as tabelas e índices
│       │   └── database.ts      # Conexão e inicialização com node:sqlite
│       ├── utils/
│       │   └── dateUtils.ts     # Aritmética de calendário sem deslocamento UTC
│       ├── services/
│       │   ├── revisaoEngine.ts # Regras D+7, D+15, D+30, manutenção e recuperação
│       │   ├── assuntoService.ts# Árvore fiel, agregação de progresso sem duplicatas
│       │   ├── agendaEngine.ts  # Algoritmo de agenda com alerta de sobrecarga
│       │   ├── questaoService.ts# Validação e cálculo ponderado de acertos
│       │   ├── simuladoEngine.ts# Nota líquida CESPE e critérios de eliminação
│       │   ├── dashboardService.ts # Resposta consolidada das 5 perguntas
│       │   └── backupEngine.ts  # Export/Import atômico com hash SHA-256
│       └── seed/
│           └── bacenTecnicoSeed.ts # Conteúdo programático ipsis litteris do edital
│
└── client/                      # Camada de Frontend SPA
    ├── package.json
    ├── vite.config.ts           # Config do Vite com proxy para :3001
    ├── tailwind.config.js       # Config do Tailwind CSS com dark mode
    ├── index.html
    └── src/
        ├── main.tsx
        ├── App.tsx              # Shell principal com abas e controle de datas
        ├── index.css
        ├── types/index.ts       # Tipagens completas TypeScript
        ├── api/client.ts        # Cliente HTTP tipado
        ├── components/
        │   ├── Navbar.tsx       # Barra superior com cargo, data simulável e dark mode
        │   ├── Sidebar.tsx      # Navegação por abas com badges de pendência
        │   ├── Modal.tsx        # Modal genérico acessível
        │   └── QuickCompleteModal.tsx # Conclusão rápida com registro de questões
        └── pages/
            ├── DashboardPage.tsx    # As 5 perguntas com hierarquia visual
            ├── ArvoreEditalPage.tsx # Árvore expansível, busca com contexto e filtros
            ├── RevisoesPage.tsx     # Fila de revisões, manutenção e recuperação
            ├── AgendaPage.tsx       # Agenda semanal, diária e detecção de sobrecarga
            ├── QuestoesPage.tsx     # Histórico segregado com recálculo de taxa
            ├── SimuladosPage.tsx    # Simulador oficial CESPE com eliminação
            └── ConfiguracoesPage.tsx# Rotina, Supabase e backup completo
```

---

## 3. Comandos para Executar e Verificar o Projeto

| Comando | Descrição |
|---|---|
| `npm run dev` | Inicia simultaneamente o Backend (:3001) e o Frontend (:5173) |
| `npm run dev:server` | Inicia apenas o Backend com hot-reload (tsx watch) |
| `npm run dev:client` | Inicia apenas o Frontend com Vite HMR |
| `npm test` | Executa os testes automatizados com o test-runner nativo do Node 24 |
| `npm run seed` | Recarrega o conteúdo programático oficial do edital BACEN |
| `npm run build` | Compila TypeScript do servidor e gera o bundle estático do cliente |
