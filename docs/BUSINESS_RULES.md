# Regras de Negócio — Preparação BACEN Técnico

Este documento formaliza as regras de negócio implementadas no sistema.

---

## 1. Revisões Espaçadas de 7, 15 e 30 Dias

1. Ao concluir o **estudo inicial** de qualquer assunto folha (unidade estudável), o sistema agenda imediatamente 3 revisões:
   - **Ciclo 7d:** `data_prevista = data_estudo_inicial + 7 dias`
   - **Ciclo 15d:** `data_prevista = data_estudo_inicial + 15 dias`
   - **Ciclo 30d:** `data_prevista = data_estudo_inicial + 30 dias`
2. **Datas de Calendário:** Todos os cálculos são feitos em dias civis (calendário), sem conversão de fuso horário UTC que cause deslocamento involuntário de datas.
3. **Status de uma Revisão:**
   - `agendada`: data prevista no futuro (`hoje < data_prevista`).
   - `disponivel`: data prevista igual a hoje (`hoje === data_prevista`).
   - `atrasada`: data prevista no passado sem conclusão (`hoje > data_prevista`).
   - `concluida`: concluída pelo usuário com registro de data real.
   - `recuperada`: substituída formalmente por uma Revisão de Recuperação.
4. **Revisões atrasadas NUNCA são concluídas automaticamente.** O atraso permanece visível até a ação expressa do estudante.

---

## 2. Fase de Manutenção (Depois dos 30 Dias)

1. **Continuidade sem Zerar Progresso:** Ao concluir a revisão de 30 dias (ou qualquer revisão subsequente de manutenção), o assunto **não é arquivado nem o progresso é zerado**. Ele entra em ciclo recorrente de manutenção até a prova.
2. **Data-base:** A próxima data prevista de manutenção é sempre contada a partir da **data real de realização da revisão anterior** (`data_real_anterior + intervalo_dias`), e não de uma data fictícia no passado.
3. **Heurística de Desempenho (Configurável e Transparente):**
   - **< 70% de acertos:** próxima revisão em **7 dias** (reforço urgente de consolidação).
   - **70% a < 85% de acertos:** próxima revisão em **15 dias** (intervalo intermediário).
   - **>= 85% de acertos:** próxima revisão em **30 dias** (manutenção espaçada).
   - **Alto desempenho consistente (>= 85% em 2 ou mais ciclos seguidos):** intervalo ampliado gradualmente para **45 ou 60 dias**.
   - **Sem questões ou amostra < 5 questões:** o intervalo anterior é mantido (ex: 15 ou 30 dias), sem presumir domínio fictício.
4. **Justificativa Explicada:** Toda revisão de manutenção salva e exibe na interface o motivo exato pelo qual aquele intervalo foi atribuído.

---

## 3. Revisão de Recuperação para Múltiplos Atrasos

1. Quando 2 ou mais etapas do mesmo assunto estiverem atrasadas (ex: 7d e 15d venceram sem serem feitas):
   - O sistema oferece a opção de criar uma **Revisão de Recuperação**.
   - A revisão de recuperação unifica as pendências em um único compromisso.
   - As revisões anteriores são marcadas com status `recuperada` e recebem uma anotação de auditoria com o ID da revisão que as unificou.
   - Isso evita gerar múltiplas tarefas idênticas para a mesma matéria no mesmo dia e preserva o histórico de datas reais sem fingir que foram realizadas em dias diferentes.

---

## 4. Árvore Programática e Progresso sem Dupla Contagem

1. A hierarquia do edital é representada como:
   `Grupo (Básicos/Específicos) → Disciplina → Tópico (Nível 1) → Subtópico (Nível 2) → Detalhes (Nível 3)`
2. **Folhas vs Agrupadores:**
   - Tópicos sem filhos são **folhas estudáveis** (`is_leaf = true`).
   - Tópicos com filhos funcionam como **agrupadores organizacionais** (`is_leaf = false`).
   - **Métrica de Cobertura:** `(Folhas Concluídas / Total de Folhas Estudáveis) * 100`. Pais nunca entram no numerador nem no denominador, eliminando 100% o risco de contagem dupla.

---

## 5. Registro de Questões e Estatísticas

1. **Validação Estrita:**
   - `total_questoes` deve ser número inteiro positivo (> 0).
   - `acertos` deve ser número inteiro não negativo (>= 0).
   - `acertos <= total_questoes`.
   - `erros = total_questoes - acertos`.
2. **Cálculo da Taxa Geral:**
   - `Taxa Geral = SUM(acertos) / SUM(total_questoes)`.
   - **NUNCA** calculada como média aritmética simples das porcentagens das matérias, garantindo que sessões com muitas questões tenham o devido peso estatístico.
   - Sem dados registrados exibe explicitamente `"Sem dados"`, nunca `0%`.
3. **Desacoplamento de Conceitos:**
   - **Cobertura:** quanto do edital foi estudado (% de tópicos).
   - **Revisão:** cumprimento dos prazos das revisões agendadas.
   - **Desempenho:** índice de acertos nas baterias de questões.

---

## 6. Pontuação Oficial da Prova BACEN Técnico (CESPE)

1. **Regra de Marcação CESPE:**
   - Cada acerto = `+1,00` ponto.
   - Cada erro = `-1,00` ponto (uma errada anula uma certa).
   - Em branco ou dupla marcação = `0,00` pontos.
2. **Critérios Eliminatórios Oficiais (Subitem 8.10.5 e 9.8.1):**
   - **P1 (Conhecimentos Básicos):** 60 itens. Nota líquida mínima: **12,00 pontos**.
   - **P2 (Conhecimentos Específicos):** 60 itens. Nota líquida mínima: **18,00 pontos**.
   - **Conjunto P1 + P2:** 120 itens. Nota líquida mínima: **36,00 pontos**.
   - **P3 (Discursiva):** Redação dissertativa de até 30 linhas sobre tema de específicos. Nota máxima: 50,00 pontos. Nota mínima: **25,00 pontos**.
3. **Módulo de Simulados:** O simulador aplica essas fórmulas exatas e indica se o candidato atingiu os mínimos ou se foi eliminado por bloco ou total.
