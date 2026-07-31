# CORTEX aba — Sprint 28 · encerramento de prontuário e portabilidade de dados

## Antes de aplicar
Copiar `database/18_encerramento.sql` para a pasta `database/` e rodar no Supabase.

## Encerrar acompanhamento
Ficha do paciente → botão **⋯** ao lado de "Editar cadastro" → Encerrar acompanhamento.

Tipos: alta, desligamento, transferência, desistência ou óbito. O formulário mostra os
números do período — meses acompanhado, sessões realizadas, objetivos dominados — e pede
a **síntese**, que é o que fica para a próxima equipe que atender a criança e para a família.

Encerrar sem escrever a síntese pede confirmação.

### O que o encerramento faz sozinho
Assim que o status vira alta ou desligado, o banco:
- desativa a grade e fecha a vigência
- cancela as sessões futuras
- encerra os vínculos com aplicadores
- encerra o PEI vigente
- cancela as tarefas abertas
- marca anamneses pendentes como revisadas

Sem isso, criança que saiu continuaria gerando sessão e ocupando horário na agenda de
alguém.

**Nada é apagado.** Sessões realizadas, tentativas, evoluções, gráficos e relatórios
continuam intactos — prontuário de menor tem retenção longa. O registro guarda até
quando o prontuário deve ficar disponível.

Depois de encerrar, o sistema lembra de conferir a fila de espera: os horários que
vagaram podem atender quem está aguardando.

### Onde os encerrados ficam
A lista de pacientes ganhou o filtro **Encerrados**. Por padrão eles não aparecem —
prontuário guardado não polui a lista do dia.

## Exportar dados (LGPD)
Mesmo botão **⋯** → Exportar dados.

Gera um arquivo com tudo que o sistema guarda sobre a criança: cadastro, responsáveis,
grade, sessões, evoluções, objetivos com contagem de tentativas, comportamentos,
avaliações, relatórios finalizados, anamneses respondidas, documentos e termos assinados.

É o que permite atender a um pedido de portabilidade sem alguém montar planilha à mão.
Restrito à coordenação, supervisão e direção, e a exportação fica registrada na auditoria.

## database/98_testes.sql
Arquivo de testes das regras automáticas. Roda cenários controlados e responde PASSOU ou
FALHOU em cada regra: conflito de horário, sondagem ao dominar, promoção de alvo (durante
e depois da sessão), faltas consecutivas e encerramento.

Use num banco de teste. Ele cria e apaga a própria massa, com sufixo `ZZTESTE`.

Rodei aqui antes de entregar: **9 passaram, 0 falharam**.

## Arquivos
```
pacientes/pasta.html          encerramento e exportação
pacientes/lista.html          filtro de encerrados
database/18_encerramento.sql  migration
database/98_testes.sql        testes das regras
```
