# CORTEX aba — Sprint 30 · a avaliação indica o que ensinar

## Antes de aplicar
Copiar `database/20_sugestao_programas.sql` para a pasta `database/` e rodar no Supabase.

## A ponte que faltava
Domínio de protocolo era texto livre; a biblioteca usa áreas fixas. Sem ligar os dois,
não havia como a avaliação apontar o que ensinar.

Agora, ao cadastrar o protocolo, marque a área do domínio entre colchetes:

```
# Linguagem receptiva [receptiva]
Aponta para objeto nomeado
Segue instrução de um passo

# Socialização [social]
Espera a vez em jogo de mesa
```

Áreas válidas: `receptiva`, `expressiva`, `cognicao`, `motora`, `social`, `autocuidado`.

Domínio sem área continua funcionando normalmente na avaliação — só não gera sugestão.
A tela de protocolos avisa quais estão sem.

## Ao concluir a avaliação
Aparece o bloco **"O que a avaliação indica"**: os domínios que ficaram abaixo de 60%
(configurável) e, para cada um, os programas da biblioteca daquela área que **ainda não
estão no PEI** da criança.

Um clique inclui no PEI, com os valores padrão do programa. Se a criança não tiver PEI,
ele é criado. O aplicador titular já entra como responsável.

Fica registrado na auditoria que o objetivo veio de uma sugestão da avaliação AVx.

## O limite disso, dito na tela
A sugestão é por **área do domínio**, não pelo item específico que a criança errou.
Ela evita procurar na biblioteca inteira — não substitui a decisão clínica de o que
ensinar primeiro. O rodapé do bloco diz isso.

Testei no banco: domínio a 33% gera sugestão, domínio a 100% não, e programa já no PEI
some da lista.

## Arquivos
```
avaliacoes/lista.html               área do domínio no construtor
avaliacoes/aplicar.html             bloco de sugestões
database/20_sugestao_programas.sql  migration
```
