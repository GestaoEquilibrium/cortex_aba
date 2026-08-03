# CORTEX aba — Sprint 50 · corrige os falsos alarmes do verificador

## Só um arquivo

As quatro falhas que apareceram na sua tela eram **falsas**. O verificador dizia:

> sw.js aponta erros.js v=16 mas as paginas usam v=1

As páginas usam v=16. O "v=1" era invenção do próprio verificador.

## A causa
Quando um arquivo tem **uma única versão** em uso, o PowerShell devolve a chave como
texto simples em vez de lista de um elemento. Aí `[0]` deixa de pegar o primeiro item e
passa a pegar o **primeiro caractere** — o "1" de "16".

É uma pegadinha clássica do PowerShell: coleção de um elemento é desembrulhada
automaticamente. Corrigido envolvendo em `@(...)`, que força lista.

De quebra, a ordenação agora é numérica. Ordenando como texto, "v=9" viria depois de
"v=17".

## O aviso que sobrou é real
> sem service worker: index.html, index.html

São o `index.html` da raiz (login) e o do portal da família. Nenhum dos dois carrega o
`pwa.js`, então não funcionam sem internet. É aviso, não falha: a tela de login sem
internet não teria como autenticar de qualquer forma.

Se quiser que o portal funcione offline, dá para acrescentar — mas aí precisa decidir o
que ele mostra sem conseguir consultar o banco.

## E o que eu vou mudar no processo
O verificador estava bloqueando **commit e push juntos**. Está errado: commit local não
faz mal a ninguém e é o que preserva o trabalho. Nos próximos scripts, o commit acontece
sempre; só o push fica condicionado.

Foi por isso que os sprints 48 e 49 ficaram sem commit — o script parou antes de
perguntar, e a mensagem final ainda dizia "DEPOIS DE PUBLICAR" como se tivesse publicado.

## Arquivos
```
ferramentas/verificar-repo.ps1   corrigido
```
