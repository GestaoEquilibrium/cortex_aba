# CORTEX aba — Sprint 25 · fidelidade de aplicação e IOA

## Antes de aplicar
Rodar o SQL do sprint 25. Ele altera `registros_tentativa` (coluna `observador` e a
chave única), cria `supervisoes`, a função `calcular_ioa` e o checklist padrão.

## Clínico → Supervisão
Tela nova. Supervisão vê todas; o aplicador vê só as próprias.

### Checklist de fidelidade
Dez itens sobre como a sessão foi conduzida: instrução clara, tempo de resposta, nível
de ajuda previsto, redução da ajuda, reforço imediato, registro durante a sessão.

Cada item recebe **sim** (1 ponto), **parcial** (0,5), **não** (0) ou **N-A**, que sai
da conta. O placar aparece enquanto você marca.

Abaixo de 70%, salvar pede confirmação lembrando de escrever o plano de ação — nota
baixa sem plano vira cobrança, não formação.

Os itens vêm da configuração `checklist_fidelidade` e podem ser trocados sem mexer no código.

### Ciência do aplicador
A supervisão só fecha o ciclo quando a pessoa lê. Cada registro tem botão de dar ciência,
com data. Isso protege os dois lados.

### Média por aplicador
Média das três últimas supervisões de cada um, ordenada do pior para o melhor, e a lista
de quem ainda nunca foi supervisionado.

## IOA — concordância entre observadores
Na tela de sessão, quem é supervisão ou coordenação tem o botão **"Registrar como
observador"**. Ativado, a pessoa registra as mesmas tentativas em paralelo, sem alterar
nada do que o aplicador lançou.

Ao criar a supervisão e escolher aquela sessão, o sistema compara tentativa a tentativa
e mostra a porcentagem de concordância. **Abaixo de 80%, o dado da sessão não é
confiável** — e a tela diz isso.

Sem registro paralelo, o campo simplesmente informa que não há o que comparar. Não
inventa número.

## Detalhe técnico que importa
A chave única de `registros_tentativa` passou a incluir a coluna `observador`. Sem isso,
o registro do observador sobrescreveria o do aplicador e os dois dados virariam um só —
exatamente o que o IOA existe para evitar.

## Arquivos
```
supervisao/index.html   novo
sessao/sessao.html      modo observador
shared/sidebar.js       item Supervisão (v=10)
demais páginas          versão do menu
```
