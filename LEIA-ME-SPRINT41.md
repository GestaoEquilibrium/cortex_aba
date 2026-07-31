# CORTEX aba — Sprint 41 · correção da regressão no menu

## Sem SQL

## O que eu quebrei
No sprint 36, para mexer no menu, peguei o `components.css` **do sprint 9** como base.
Só que o sprint 10 tinha corrigido justamente o menu recolhido — e eu apaguei essas
correções sem perceber.

Voltaram quatro problemas antigos:

| O que voltou | Efeito |
|---|---|
| Marca sem contenção de largura | o "aba" escorregava por cima do sino |
| `.sidebar-bt` encolhendo | os botões do topo espremiam |
| Cartão do usuário não empilhado | avatar e sair lado a lado num espaço estreito |
| Origem da rotação do "aba" | texto cortado ao recolher |

Refiz as mudanças do menu **sobre a versão do sprint 10**, que é a correta. Conferi item
a item que as quatro correções estão presentes.

## O outro problema: Configurações sumindo
Com 18 itens, o último ficava 57px fora da área visível. Ele existia e dava para rolar —
mas ninguém adivinha isso quando não há barra.

**O grupo Sistema agora começa recolhido.** Auditoria, Diagnóstico e Configurações são de
uso ocasional, e com ele fechado o menu cabe inteiro em tela de notebook.

Se você abrir o grupo, essa escolha passa a valer e ele continua aberto. A memória guarda
tanto "fechei" quanto "abri de propósito" — assim o padrão não volta a se impor depois.

## Por que aconteceu
Eu venho montando cada sprint copiando arquivos de sprints anteriores, e escolhi a origem
errada. O script de verificação não pegava porque só conferia se o arquivo tinha as
novidades, não se manteve o que já existia.

O PowerShell deste sprint confere as duas coisas.

## Arquivos
```
styles/components.css   refeito sobre a base correta (v=7)
shared/sidebar.js       Sistema recolhido por padrão (v=17)
sw.js                   versão 7
demais páginas          versões novas
```
