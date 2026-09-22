-- Execute UMA VEZ após personal-cloud.sql no SQL Editor.
-- Guarde a chave resultante fora do repositório. Cole a MESMA chave nos seus aparelhos.
-- Executar novamente cria OUTRO espaço vazio (não recupera o primeiro).
with secret as (
 select replace(gen_random_uuid()::text||gen_random_uuid()::text,'-','') as key
), created as (
 insert into estudo_private.workspaces(key_hash)
 select extensions.digest(convert_to(key,'UTF8'),'sha256') from secret returning id
)
select created.id as workspace_id, secret.key as chave_pessoal from created cross join secret;



workspace_id: 72bba32c-9f0a-4d53-9bc0-391f4ea55514
chave_pessoal: 385d14c76ca94ef3a837cf1e1c3f721b17786fbdb69e47fda77ca85444ffb33a