# Estudo — versão 1.0

Aplicação web pessoal, sem etapa de compilação e sem dependências externas de interface. O arquivo original não foi alterado e nenhum histórico antigo foi migrado.

## Comece por aqui

1. Extraia o ZIP.
2. Crie seu projeto no Supabase.
3. Abra o SQL Editor do projeto, cole todo o conteúdo de `schema.sql` e execute.
4. Abra `config.js` no Bloco de Notas. Preencha `supabaseUrl` com a URL do projeto e `supabaseKey` com a chave **publicável** (ou `anon` legada).
5. Salve. Nunca coloque chave `service_role`, `sb_secret_...`, senha do banco ou token pessoal do GitHub neste arquivo.
6. Publique os arquivos pelo GitHub Pages, como explicado abaixo.
7. No site, abra Configurações, crie sua conta, confirme o e-mail e entre com a senha. Use a mesma conta nos dois aparelhos.
8. Cadastre seu concurso, disciplinas e assuntos. A aplicação começa vazia porque o novo edital ainda não foi informado.

Não basta abrir `index.html` com duplo clique: módulos JavaScript e recursos offline precisam de um endereço HTTP/HTTPS. Após publicar, acesse o endereço do site. Não precisa de npm, terminal ou build.

## GitHub pelo navegador, sem comandos

1. Crie ou abra o repositório desejado no GitHub.
2. Use **Add file → Upload files** e envie o conteúdo da pasta extraída. `index.html` deve ficar na raiz do repositório, junto dos outros arquivos, e não dentro de uma subpasta adicional.
3. Confirme em **Commit changes**.
4. Em **Settings → Pages**, escolha **Deploy from a branch**, a branch `main` e a pasta `/ (root)`. Salve.
5. Aguarde a publicação e abra a URL mostrada pelo GitHub. A disponibilidade de Pages em repositório privado depende do plano; um repositório público pode hospedar este código sem expor os registros privados do banco, desde que o SQL de proteção esteja aplicado.

Os arquivos obrigatórios para o site são `index.html`, `style.css`, `app.js`, `data.js`, `cloud.js`, `config.js`, `sw.js`, `manifest.webmanifest` e os ícones. SQL, guia e testes são documentação, não credenciais.

## Supabase: autenticação e segurança

- Habilite o provedor de e-mail/senha em Authentication.
- Em URL Configuration, coloque a URL publicada como Site URL e inclua-a entre as URLs de redirecionamento autorizadas. Preserve o caminho do repositório se usar GitHub Pages.
- Mantenha a confirmação de e-mail. Ao abrir o link de confirmação, volte à tela de conta e entre com a senha.
- O serviço padrão de e-mail pode ter restrições para destinatários. Se o cadastro não enviar confirmação, configure SMTP próprio ou crie/confirme seu usuário pelo painel administrativo do projeto.
- O SQL ativa RLS: apenas o usuário autenticado pode consultar/inserir seus próprios eventos. Não há permissão de atualização ou exclusão direta: mudanças são novos eventos.
- Esta entrega não inclui interface de recuperação de senha; por enquanto a administração de acesso é feita no painel Supabase.
- Chave pública não é segredo. A proteção dos registros depende das políticas no banco, não de esconder `config.js`.
- Em aparelhos compartilhados, os registros permanecem no armazenamento local mesmo após sair. Use perfil de navegador próprio. Sair oculta os dados na interface, mas não criptografa o armazenamento.

## Recursos implementados

- Interface responsiva com navegação lateral no computador e inferior no celular; tema claro/escuro.
- Concursos independentes, disciplinas com peso por questão, assuntos, anotações e links de materiais.
- Cadastro em lote de assuntos (um por linha), busca e filtro de progresso.
- Agenda semanal por dia, com prevenção de sobreposição de horários.
- Sessões com assunto, modalidade, minutos, questões e acertos; histórico e métricas por disciplina.
- Cronômetro persistente, pausa/continuação e recuperação após recarregar. O relógio do aparelho precisa estar correto.
- Revisões em intervalos configuráveis, criadas ao marcar assunto estudado; fila de vencidas e reagendamento.
- Simulados com nota por acertos × peso e histórico por disciplina.
- Banco local IndexedDB, fila de envio, login/senha e sincronização periódica enquanto o app está aberto.
- Exportação/restauração de backup; não foi exportado nenhum dado antigo.
- Cache offline após o primeiro acesso online. Recursos de instalação dependem do navegador.

## Regras e limites desta versão

- “Estudado” mede cobertura, não domínio. Aproveitamento depende das questões registradas.
- A agenda é recorrente por dia da semana. Não há motor de redistribuição automática por desempenho ou frequência de cobrança.
- Tópicos podem ser nomeados com hierarquia textual (ex.: `1.2 Concordância`), mas não há árvore visual de subtópicos nesta versão.
- Reabrir um assunto preserva as revisões existentes. Alterar intervalos não muda revisões já criadas.
- A fila de revisões mostra as vencidas e as do dia. Não há notificações push nem garantia de sincronização com o aplicativo fechado.
- Simulados não calculam penalidade por erro nem regras de eliminação. Precisam ser adaptados após recebermos o novo edital.
- O botão Iniciar não bloqueia o dia: sugere o primeiro bloco do dia ou um assunto ainda não estudado. Blocos semanais não têm status próprio de conclusão.
- Não há envio de PDFs/arquivos de estudo: os materiais são links e anotações.
- Em conflito no mesmo campo, vence o evento com data/hora mais recente do aparelho; empates usam o identificador. Campos diferentes são combinados. Mantenha os relógios corretos. Não há diálogo de resolução de conflitos.
- Eventos de sessões diferentes são preservados; tentativas repetidas de envio não duplicam eventos. Exclusões são marcadores persistentes.
- Para volumes pessoais a sincronização lê o histórico completo em páginas de 500 eventos. Volumes grandes podem exigir sincronização incremental e compactação futura.
- Não foi feita conexão a um projeto Supabase real nesta entrega. Execute a lista de validação abaixo antes de confiar seus estudos exclusivamente à nuvem.

## Validação após configurar a nuvem

1. Entre com a mesma conta em computador e celular; crie um concurso e confirme que ele aparece nos dois após Sincronizar.
2. Cadastre uma sessão offline no celular, outra online no computador. Reconecte o celular, sincronize ambos e confira que existem duas sessões.
3. Tente sincronizar novamente: não deve duplicar sessões.
4. Exclua um registro e confira a exclusão no outro aparelho.
5. Teste outra conta: ela não deve ver os registros da primeira. Uma chamada sem autenticação à tabela deve ser negada pelo banco.
6. Recarregue durante o cronômetro e confira a recuperação.
7. Abra uma vez online, aguarde o carregamento, feche/abra offline. A interface e o histórico local devem funcionar.
8. Exporte um backup e guarde fora do aparelho. Nuvem sincronizada não substitui backup independente.

## Instalação e atualizações

Após publicar por HTTPS, use a opção de instalação do navegador; no iPhone, use o menu de compartilhamento do Safari e “Adicionar à Tela de Início”, quando disponível. O comportamento varia por sistema.

Para atualizar, envie os arquivos novos ao GitHub e incremente o identificador `CACHE` em `sw.js`. Feche todas as abas do app e reabra online. Nunca apague o armazenamento do navegador com alterações ainda pendentes. Sem conexão, o site só disponibiliza o que já foi carregado e salvo no aparelho.

## Documentação oficial consultada

- https://supabase.com/docs/guides/auth/passwords
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site
- https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable
