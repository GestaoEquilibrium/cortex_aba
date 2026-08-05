# CORTEX aba — Sprint 63 · alterar e-mail e senha pelo sistema

## Antes de aplicar
Publicar a versão nova da Edge Function `criar-acesso` (mandei o código no chat).
Sem ela, os dois botões novos respondem erro.

## O problema
Trocar o e-mail de alguém exigia abrir o painel do Supabase, mexer em dois lugares
separados — o cadastro e a conta de acesso — e lembrar de fazer os dois.

Mudar só o cadastro é pior que não mudar: a pessoa continua entrando com o endereço
antigo, o sistema mostra o novo, e ninguém entende por quê.

## Equipe → coluna Acesso
Três ações novas, para a direção:

**alterar e-mail** — muda no cadastro **e na conta de acesso**, na mesma operação.
Aparece mesmo para quem ainda não tem acesso criado, porque é justamente esse o caso das
quatro aplicadoras com endereço provisório.

**definir senha** — você escolhe a senha e repassa. Ela entra marcada como temporária: a
pessoa é obrigada a trocar no próximo acesso. Senha que outra pessoa conhece não é senha.

**sortear senha** — o que já existia, agora com nome mais claro. Gera uma senha legível,
sem caracteres ambíguos, para ditar por telefone.

## Detalhes de acabamento
**A caixa de digitação é do sistema, não do navegador.** `prompt()` destoa do resto e é
bloqueado em alguns aparelhos. A caixa nova valida enquanto você digita e explica o erro
em vez de só recusar.

**Quando o e-mail atual é provisório**, o campo abre vazio em vez de trazer o `.local`
para você apagar — e o aviso explica que aquele endereço não recebe mensagem.

**A validação recusa** e-mail malformado, e-mail igual ao atual, e-mail já usado por outro
cadastro, senha com menos de 8 caracteres e senha só de números.

## Do lado do servidor
As duas ações novas ficam na Edge Function, não no navegador — mexer em conta de usuário
exige a chave de serviço, que nunca pode chegar à tela.

Tudo entra na Auditoria: quem alterou, de qual e-mail para qual, e se havia acesso criado.

## Testado
A caixa recusou `nao-e-email` com a mensagem certa e aceitou um endereço válido.

## Arquivos
```
shared/acesso.js      ações novas e caixa de digitação (v=23)
equipe/index.html     botões na coluna de acesso
sw.js                 versão 19
```
