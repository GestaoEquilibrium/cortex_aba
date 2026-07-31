# CORTEX aba — Sprint 33 · gráficos no relatório, menu e limpeza

## Sem SQL

## Gráficos no relatório mensal
O relatório saía só com texto. Agora traz dois gráficos, que aparecem também na impressão
e no PDF:

- **Frequência no período**: sessões realizadas e faltas, por semana
- **Independência por objetivo**: a curva de cada objetivo trabalhado no mês

Relatório de acompanhamento sem gráfico obriga a família a acreditar na frase. Com
gráfico, ela vê.

Detalhe pensado para a impressão: as linhas usam **cor e traço diferentes**. Impresso em
preto e branco, ainda dá para distinguir os objetivos.

## Menu reorganizado
Estava com 16 itens numa lista só. Agora tem quatro blocos:

| Bloco | Itens |
|---|---|
| (topo) | Dashboard, Pacientes, Agenda, Sessão de hoje |
| Clínico | Programas, Avaliações, Supervisão, Gráficos, Comportamento |
| Gestão | Admissão, Tarefas, Indicadores, Relatórios, Equipe |
| Sistema | Auditoria, Configurações |

Grupo cujos itens todos estão fora do perfil da pessoa **não aparece** — rótulo solto no
menu é ruído.

Como fica na prática:
- direção: 16 itens
- coordenação: 15
- aplicadora: 9
- recepção: 6

## ferramentas/limpar-backups.ps1
Cada sprint criou uma pasta `_backups_sprintN_data` no repositório. Depois de 33 sprints
elas ocupam espaço e poluem o `git status`.

O script mostra o que vai apagar e quanto libera **antes** de confirmar, mantém as 3 mais
recentes e acrescenta `_backups_*/` ao `.gitignore`.

Rode quando quiser:
```powershell
powershell -ExecutionPolicy Bypass -File ferramentas\limpar-backups.ps1
```

O histórico real está no GitHub. Essas pastas são só rede de segurança local para o caso
de um patch dar errado antes do commit.

## Service worker
Subiu para `cortex-aba-v2` e a lista de pré-carregamento agora aponta o `sidebar.js?v=13`.

Foi a primeira vez que precisei fazer isso — é exatamente a manutenção que anotei no
sprint anterior. Se eu esquecer numa próxima, a equipe fica com o menu antigo em cache.

## Arquivos
```
relatorios/index.html          gráficos no relatório
shared/sidebar.js              menu em quatro blocos (v=13)
sw.js                          versão e lista atualizadas
ferramentas/limpar-backups.ps1 novo
demais páginas                 versão do menu
```
