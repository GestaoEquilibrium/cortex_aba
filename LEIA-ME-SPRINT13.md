# CORTEX aba — Sprint 13 · relatório mensal

## Antes de aplicar
Rodar o SQL do sprint 13 (tabela `relatorios_mensais` + trava de edição do finalizado).

## Gestão → Relatórios
Escolha o paciente e o mês. O botão "Gerar rascunho" apura os registros do período e
monta o texto das sete seções: frequência, objetivos trabalhados, progressos,
dificuldades, comportamento, plano para o próximo período e conclusão.

Os números vêm dos registros, nunca de estimativa:
- sessões previstas, realizadas e faltas (com e sem aviso)
- objetivos do PEI, quantos em ensino e quantos dominados
- % de independência por objetivo e a variação dentro do mês
- episódios de comportamento por tipo
- intercorrências marcadas nas evoluções (dormiu mal, medicação alterada...)

## O que o texto NÃO faz
Não inventa leitura clínica. Onde depende do julgamento da equipe, o rascunho deixa
um marcador entre colchetes — "[Complemente com a leitura clínica da equipe.]" — em
vez de escrever uma frase genérica que pareça análise.

## Fluxo
rascunho → em revisão → finalizado. Finalizado trava a edição, inclusive no banco:
o trigger recusa alteração de texto sem antes voltar o status. Reabrir fica registrado
na auditoria.

## Liberar à família
Relatório finalizado pode ser liberado ao responsável — o campo já existe para o portal
da família, que entra no próximo sprint.

## Imprimir
O botão "Imprimir / PDF" usa a impressão do navegador com folha própria: some o menu,
os botões e os indicadores de tela, e fica o documento com cabeçalho da clínica.
Escolha "Salvar como PDF" na janela de impressão.

## Sobre gerar o texto com IA
Fica para depois e é decisão à parte: exige chave de API, custo por relatório e uma
definição de LGPD sobre enviar dado de paciente para fora. A estrutura já está pronta
para receber isso sem refazer a tela.
