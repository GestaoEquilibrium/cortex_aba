# CORTEX aba — Sprint 12 · comportamento-problema

## Antes de aplicar
Rodar o SQL do sprint 12 (comportamentos_alvo, registros_comportamento, planos_manejo).

## Clínico → Comportamento
Escolha o paciente. Para cada comportamento acompanhado:

- **Definição observável**: o que conta e o que não conta. Sem isso, cada aplicador
  registra uma coisa diferente e o gráfico não significa nada.
- **Linha de base**: até a data definida as barras aparecem em cinza; depois, em vermelho.
  É a leitura que permite dizer se a intervenção funcionou.
- **Gráfico de episódios por semana**
- **Alerta de escalada**: se as duas últimas semanas somam mais de 30% acima das duas
  anteriores, aparece o aviso sugerindo revisar o plano
- **Plano de manejo**: prevenir, responder e o comportamento a ensinar no lugar
- **Últimos episódios** com o ABC lado a lado

## Registro do episódio
Antes / durante / depois, intensidade de 1 a 5, duração e número de episódios.
Quem está na sala registra — não precisa ser da coordenação. Criar comportamento e
plano continua restrito a coordenação, supervisão e direção.

## Ligação com a sessão
A tela de sessão ganhou o botão "Registrar comportamento", que abre esta tela já no
paciente certo.

## Arquivos
```
comportamento/index.html   novo
sessao/sessao.html         botão de atalho no rodapé
```
