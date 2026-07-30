# CORTEX aba — Sprint 16 · avaliações

## Antes de aplicar
Rodar o SQL do sprint 16 (protocolos, domínios, itens, avaliações e respostas).

## Clínico → Avaliações

### Aba Protocolos
Cadastro genérico: você define os domínios e os itens em texto. Linha começando com
`#` vira domínio; as linhas seguintes viram itens dele. A escala é configurável
(mínimo, máximo e rótulos).

Cada protocolo declara a **origem**: próprio da clínica, domínio público ou licenciado.
Escolhendo licenciado, aparece o campo de autorização de uso — e cadastrar sem
preencher dispara aviso. É o registro da pendência que levantei no mapa: instrumento
publicado só deve ser digitalizado com autorização do detentor.

### Aba Por paciente
Lista as avaliações por onda (AV1, AV2...) e traz o **gráfico comparativo entre ondas**,
com o percentual atingido em cada domínio — o mesmo gráfico que está no PDF que a
coordenadora aprovou.

## Aplicar
Item a item, com botões da escala e opção N-A para não aplicável. Cada toque grava na
hora. A barra no topo mostra o quanto falta, e cada domínio calcula sua pontuação
enquanto você preenche.

Concluir trava a avaliação; reabrir é possível e fica na auditoria. Itens em branco não
entram no cálculo — e o aviso de conclusão diz quantos ficaram.

## Sugestão de uso imediato
Comece por um protocolo próprio da clínica, com os itens que a equipe já observa na
prática. Assim o módulo entra em uso sem depender da questão de licenciamento.

## Arquivos
```
avaliacoes/lista.html     novo
avaliacoes/aplicar.html   novo
```
