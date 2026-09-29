# Estado Atual, Limitações e Próximos Passos

Este documento serve como guia de continuidade para que você ou qualquer IA em sessões futuras possa prosseguir com melhorias pontuais sem necessidade de reler todo o código-fonte.

---

## 1. O Que Está Implementado e Funcionando

| Módulo | Estado | Detalhes |
|---|---|---|
| **Conteúdo Fiel do Edital** | ✅ 100% Funcional | BACEN 2013 Técnico Área 1 (Suporte Téc-Adm): 9 disciplinas, 92 tópicos e subtópicos extraídos ipsis litteris do edital com número de páginas e trechos originais. |
| **Árvore Hierárquica** | ✅ 100% Funcional | Navegação N-níveis, busca em tempo real mantendo contexto, filtros (não estudado, estudado, revisão pendente), nós pais como agrupadores sem contagem dupla de progresso. |
| **Revisões 7d, 15d e 30d** | ✅ 100% Funcional | Marcos fixos calculados em dias de calendário a partir da data real do estudo inicial, status diário (agendada, disponível, atrasada, concluída). |
| **Fase de Manutenção (pós-30d)** | ✅ 100% Funcional | Assunto entra em manutenção recorrente sem zerar progresso; intervalo calculado por heurística de rendimento (<70% = 7d, 70-84% = 15d, >=85% = 30d/45d) com justificativa explicada e próxima data contada da realização real. |
| **Revisão de Recuperação** | ✅ 100% Funcional | Detecta múltiplos atrasos do mesmo assunto e permite unificá-los em um compromisso único, arquivando com rastreabilidade os ciclos substituídos sem duplicar tarefas no mesmo dia. |
| **Treino de Questões** | ✅ 100% Funcional | Validações rigorosas (inteiros positivos, acertos <= total, erros calculados). Taxa geral ponderada fiel: `SUM(acertos) / SUM(questoes)`, nunca média simples de porcentagens. "Sem dados" quando vazio. |
| **Agenda Semanal & Rotina** | ✅ 100% Funcional | Visão semanal com navegação dia a dia (abre hoje por padrão), priorização de revisões atrasadas e novos conteúdos por peso, blocos fixáveis contra reprogramação, e **alerta explícito de sobrecarga** quando a demanda ultrapassa as horas disponíveis. |
| **Painel / Dashboard** | ✅ 100% Funcional | Responde de imediato às 5 perguntas centrais com separação estrita de Cobertura, Revisões e Desempenho. |
| **Simulados CESPE** | ✅ 100% Funcional | Cálculo de nota líquida (Certo = +1, Errado = -1), validação de mínimos eliminatórios do edital (P1 >= 12, P2 >= 18, Total >= 36, Discursiva >= 25). |
| **Persistência & Backup** | ✅ 100% Funcional | SQLite persistente local (`server/data/concurso.db`). Exportação e importação completa em JSON com hash criptográfico SHA-256 e transação atômica rollback-safe. |
| **Integração Supabase** | ✅ 100% Funcional | Configuração de credenciais na interface e script DDL pronto para copiar e colar no SQL Editor do Supabase. |
| **Design & Dark Mode** | ✅ 100% Funcional | Interface moderna em Português do Brasil com alternância instantânea claro/escuro persistente no navegador. |
| **Testes Automatizados** | ✅ 100% Verde | 5 suítes de testes unitários cobrindo regras críticas de calendário, manutenção, validação de questões, taxa ponderada e pontuação CESPE. |

---

## 2. Limitações Reais Atuais

1. **Uso Individual Monousuário:** A aplicação foi otimizada para uso pessoal no próprio computador, sem tela de login obrigatória inicial.
2. **Sem Banco de Questões Embutido:** O sistema registra e acompanha as questões resolvidas pelo usuário em outras plataformas (como QConcursos, TEC Concursos ou apostilas), não integrando um catálogo de enunciados próprios.
3. **Algoritmo de Agenda Determinístico:** A agenda utiliza filas de prioridade com pesos oficiais do edital, atrasos e desempenho, sem uso de modelos estocásticos ou machine learning.

---

## 3. Guia Rápido para a Próxima IA Continuar

Se for solicitado adicionar novas funcionalidades, consulte estes arquivos específicos para economizar tokens:

- **Para alterar regras de revisão e manutenção:** edite apenas `server/src/services/revisaoEngine.ts`.
- **Para alterar o algoritmo de agendamento:** edite apenas `server/src/services/agendaEngine.ts`.
- **Para adicionar novas disciplinas ou retificações de edital:** consulte `server/src/seed/bacenTecnicoSeed.ts`.
- **Para criar novos endpoints:** adicione rotas em `server/src/server.ts` e declare os métodos em `client/src/api/client.ts`.
- **Para modificar a interface de uma tela:** cada página está isolada em `client/src/pages/<NomeDaTela>.tsx`.
- **Para rodar e verificar após qualquer alteração:** execute `npm test` no terminal.
