# Estudo — revisão de interface

Esta versão usa um único edital por vez e não tem tela de login ou cadastro.

## Configurar a nuvem uma vez

1. No SQL Editor do projeto Supabase atual, execute `personal-cloud.sql` inteiro.
2. Execute `create-personal-key.sql` uma vez. Copie a coluna `chave_pessoal` e guarde-a fora do GitHub.
3. Mantenha em `config.js` a URL e a chave pública do mesmo projeto Supabase.
4. Publique os arquivos da pasta no repositório.
5. Abra o site, entre em **Ajustes → Vincular aparelho** e cole a chave pessoal.
6. Repita somente o passo 5 no celular com a mesma chave.

A chave não deve ser incluída em `config.js`, no repositório ou em mensagens. Ela substitui o login: quem a tiver poderá acessar e alterar o seu espaço de estudo.

## Organização do edital

- Crie disciplinas e informe o peso de cada questão.
- Em **Adicionar conteúdo**, use `>` para criar uma árvore. Exemplo: `Gramática > Concordância > Concordância nominal`.
- O percentual da disciplina conta somente os itens finais da árvore. Um tópico com três subtópicos não é contado junto com eles.
- A tela de planejamento sugere tempo por disciplina a partir do peso, da cobertura restante e do aproveitamento em questões. Ela nunca altera seus blocos sozinha.

## Atualização da versão anterior

Os dados anteriores continuam no navegador. Em **Ajustes**, use “Dados da versão anterior” para recuperá-los; ao vincular o aparelho, marque “Levar também os registros que já estão neste aparelho”. A versão anterior de nuvem não é alterada por esse processo.

## Publicação

Envie todos os arquivos desta pasta para a raiz do repositório GitHub Pages. `index.html` precisa ficar na raiz. A nova versão do cache é `2.0.0`; após publicar, feche as abas antigas e abra o site conectado à internet uma vez.
