# CORTEX aba — Sprint 19b · a troca de senha vira portão

## O que estava incompleto
A troca de senha no primeiro acesso é uma **página inteira**, não um pop-up — pop-up
se fecha no X e a pessoa segue usando a senha que você ditou por telefone.

Só que o desvio acontecia apenas no momento do login. Quem já estivesse logado, ou
tivesse o painel salvo nos favoritos, entrava direto sem nunca trocar.

## O que muda
A verificação passou para o **guard**, que roda em toda página do sistema. Enquanto a
senha temporária estiver em uso, qualquer endereço devolve para a tela de troca —
painel, agenda, sessão, portal da família, todos.

Testado: com a marca de senha temporária na conta, abrir qualquer página redireciona.

## Também vale para a família
O guard do portal ganhou a mesma trava.

## Arquivos
```
shared/auth_guard.js          trava em toda página da equipe
shared/auth_guard_portal.js   trava no portal
trocar-senha.html             aviso de que não dá para pular
demais páginas                versão do guard
```

## Ordem
Aplicar depois do sprint 19. Ctrl+F5 na primeira abertura.
