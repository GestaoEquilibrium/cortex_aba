# EQ ABA — Sprint 0 · esqueleto navegável

Estrutura copiada do CORTEX, com identidade própria (opção A) e dados fictícios.
Roda abrindo `index.html` direto no navegador — não precisa de servidor nem de Supabase.

## Como testar
1. Abrir `index.html`
2. Na parte de baixo do login, escolher **Coordenação**, **Aplicador** ou **Responsável**
3. Navegar pela sidebar. O perfil viaja na URL (`?perfil=...`) e troca o tema.

## Arquivos

```
index.html                 login + atalho para os três perfis
dashboard.html             painel da coordenação (tema 01)
pacientes/lista.html       lista de pacientes
sessao/sessao.html         coleta do aplicador (tema 02) — tela mais importante
portal/index.html          portal do responsável (tema 03)
config.js                  credenciais Supabase (placeholder, projeto novo)
shared/tema.js             aplica o tema conforme o perfil
shared/sidebar.js          menu do ABA, filtrado por perfil
shared/mock.js             dados fictícios — apagado no Sprint 1
styles/base.css            tokens + os três temas
styles/components.css      cards, KPIs, chips, botões, barras, tabela
```

## Decisão de cor aplicada (opção A)

| Perfil | Tema | Cor de ação |
|---|---|---|
| coordenação, direção, supervisão, recepção | 01 · verde e navy | `#0F766E` |
| aplicador, itinerante, estagiário | 02 · primárias | `#1D4ED8` |
| responsável | 03 · espectro | `#7C3AED` |

**Regra travada no CSS:** as cores funcionais (`--st-ok`, `--st-warn`, `--st-bad`) e as
cores de área (`--area-*`) são globais e idênticas nos três temas. As primárias do tema
da equipe valem para fundo, sidebar e ícones — não entram em botão de tentativa nem em
gráfico de programa. Está comentado em `styles/base.css` e em `shared/tema.js`.

## O que já dá para julgar nesta versão
- Menu do ABA e o que cada perfil enxerga
- Painel da coordenação: KPIs, agenda do dia, compliance de evolução, tarefas
- Tela de coleta: programa, alvo, tentativa, três resultados, nível de dica,
  trilha de tentativas, cartão de segurança e contexto do dia
- Portal do responsável

## O que ainda não existe
- Banco de dados (nada é salvo — recarregar zera)
- Login real, pasta do paciente, biblioteca de programas, avaliações,
  gráficos, relatórios, comportamento, agenda com grade recorrente
- Modal de confirmação compartilhado (copiar `shared/confirm_modal.js` do CORTEX
  antes da primeira ação destrutiva)

## Próximo sprint sugerido
Schema da Fase 1 no Supabase: `profissionais`, `equipes_aba`, `pacientes`,
`vinculos_paciente_aplicador`, `cronograma_terapeutico`, `sessoes` — com RLS por perfil.
SQL vai inline no chat, como sempre.
