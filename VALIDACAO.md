# Validação da entrega

## Executado neste ambiente

- Verificação de sintaxe de app.js, data.js, cloud.js e sw.js com Node.
- Testes automáticos em tests.mjs: projeção dos eventos, ordenação, exclusão lógica, passagem de ano nas revisões, rejeição de valores inseguros, login simulado, transferência de registros locais para conta, envio sem duplicação, fila offline, recebimento de outro aparelho e falha de armazenamento.
- Os testes de persistência usam uma implementação simulada de IndexedDB; não substituem testes reais no navegador.

## Não executado

- Teste visual no Chromium/Android/iPhone: o ambiente não disponibilizou um navegador e a instalação do Chromium falhou.
- Teste com Supabase real, incluindo execução do SQL, envio de e-mail, autenticação, isolamento RLS entre duas contas e sincronização real entre aparelhos.
- Instalação da PWA, cache e abertura offline em navegador real.

A versão é uma implementação inicial, não uma homologação de produção. Use a lista do LEIA-ME antes de depender dela para seu histórico definitivo.
