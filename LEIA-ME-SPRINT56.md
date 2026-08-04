# CORTEX aba — Sprint 56 · cadastrar programas em lote

## Sem SQL

## Por quê
O Diagnóstico aponta **32 pacientes ativos sem PEI**. Sem PEI, a tela de sessão abre sem
objetivo para registrar — é o que trava o piloto.

O conteúdo clínico é de vocês; eu não invento programa de ensino. Mas montar a biblioteca
abrindo o formulário trinta vezes é o tipo de trabalho que faz a pessoa desistir no meio.

## Programas → Cadastrar vários
Mesmo formato de texto dos protocolos de avaliação, que a equipe já conhece:

```
# receptiva
Seguir instrução de um passo | Executar instrução simples dada pelo adulto
Apontar figura nomeada
Identificar partes do corpo

# expressiva
Nomear objetos comuns | Nomear itens do dia a dia quando perguntado
Pedir item preferido
```

Linha com **#** define a área dos programas abaixo. Depois do nome, uma **barra** permite
escrever o objetivo.

Tentativas por sessão e critério de domínio valem para o lote inteiro, e cada programa
pode ser ajustado depois.

## Confere antes de gravar
**Prévia ao vivo** enquanto você digita: quantos programas, agrupados por área.

**Aponta o que está errado, com o número da linha.** Área inexistente, programa escrito
antes de qualquer área. Testei com um texto propositalmente quebrado e ele apontou as
três falhas com a linha certa.

**Avisa sobre nome repetido** antes de gravar, listando quais, e oferece cadastrar só os
que faltam — em vez de deixar o banco recusar o lote inteiro.

## Depois do lote
O aviso final lembra o que falta: abrir cada programa e completar a instrução, a resposta
esperada e como reforçar. **É isso que o aplicador lê na hora da sessão** — o nome sozinho
não ensina ninguém a aplicar.

## Arquivos
```
programas/biblioteca.html   cadastro em lote e cabeçalho novo
```
