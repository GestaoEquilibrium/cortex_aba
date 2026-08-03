# CORTEX aba — Sprint 49 · conserta o verificar-repo.ps1

## Só um arquivo

`ferramentas/verificar-repo.ps1` estava com erro de sintaxe e não rodava. Duas causas,
ambas minhas:

**1. Aspas dentro de aspas.** A linha 87 tinha uma expressão regular com três aspas
simples dentro de uma string de aspas duplas. O PowerShell 5.1 se perde ali e o erro se
propaga pelo resto do arquivo — por isso a saída acusou chaves faltando em lugares que
estavam corretos.

**2. Arquivo sem BOM.** O PowerShell 5.1 lê `.ps1` como ANSI quando não há marca de
UTF-8. Os acentos viraram lixo — dá para ver `pÃ¡gina` e `proteÃ§Ã£o` na saída que você
mandou.

## O que mudou
- Todas as expressões regulares agora usam `[regex]'...'` com aspas simples, sem
  aninhamento
- **Zero acentos no código.** Os textos ficaram sem acento de propósito: um script de
  verificação não pode depender de encoding para funcionar
- O arquivo é gravado com BOM
- Comparações de texto usam `.Contains()` em vez de `-match`, onde não precisa de padrão

## Conferido antes de mandar
- Aspas balanceadas em todas as linhas
- 70 chaves abrindo, 70 fechando
- Nenhum caractere acentuado
- BOM presente nos primeiros bytes
- A lógica portada e rodada contra o repositório real: nenhuma falha, nenhum aviso

## Sobre os erros de `else` que apareceram
Aqueles não eram problema. Colando linha a linha no console, o PowerShell fecha o `if`
antes de ver o `else` da linha seguinte. Todas as verificações passaram — dá para
confirmar pelos `[OK]` na sua saída.

Para evitar, salve o bloco num `.ps1` e rode o arquivo, em vez de colar no console.

## Arquivos
```
ferramentas/verificar-repo.ps1   reescrito
```
