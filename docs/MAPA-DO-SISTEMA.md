# CORTEX aba — mapa do sistema

Referência única do que existe, por que foi feito assim e o que ainda não funciona.
Atualizado até o sprint 43.

---

## O que o sistema faz

Gestão de terapia ABA: da primeira ligação da família até a alta, passando por agenda,
coleta de dados em sessão, PEI, comportamento, relatórios, supervisão e prestação de
contas ao convênio.

**Stack:** HTML e JavaScript puro no navegador · Supabase (PostgreSQL) · GitHub Pages
**Repositório:** `GestaoEquilibrium/cortex_aba`
**Endereço:** https://gestaoequilibrium.github.io/cortex_aba/

---

## Módulos

| Tela | Para quem | O que resolve |
|---|---|---|
| **Painel** | todos | o dia de hoje, evoluções pendentes, compliance, supervisão |
| **Pacientes** | todos | ficha completa: cadastro, PEI, grade, anamnese, documentos, família |
| **Agenda** | recepção, coordenação | dia/semana/mês, presença, encaixe, cobertura, feriados |
| **Sessão de hoje** | aplicadores | coleta tentativa a tentativa, funciona sem internet |
| **Programas** | coordenação | biblioteca de programas de ensino |
| **Avaliações** | coordenação | protocolos, aplicação, comparativo entre ondas, sugestão de programas |
| **Supervisão** | supervisão | fidelidade de aplicação e concordância entre observadores |
| **Gráficos** | todos | curvas de independência por objetivo |
| **Comportamento** | coordenação | ABC, linha de base, plano de manejo, alerta de escalada |
| **Admissão** | recepção, coordenação | fila de espera priorizada e mapa de vagas |
| **Tarefas** | todos | pendências, boa parte gerada sozinha |
| **Indicadores** | direção | ocupação, absenteísmo, aderência, guias vencidas |
| **Relatórios** | coordenação | relatório mensal com gráficos, liberado à família |
| **Convênios** | direção, recepção | prestação de contas e risco de glosa |
| **Equipe** | direção | profissionais, acessos, ausências |
| **Auditoria** | coordenação | trilha imutável e erros do sistema |
| **Diagnóstico** | coordenação | o que está incompleto no cadastro e na configuração |
| **Configurações** | direção | clínica, operação, salas, termos, anamnese |
| **Portal da família** | responsáveis | orientações, sessões, relatórios, termos |

---

## As regras que decidem sozinhas

São as mais perigosas: ninguém aciona, e quando erram, erram em silêncio. Todas têm
teste em `database/98_testes.sql`.

| Regra | O que faz |
|---|---|
| Conflito de horário | recusa dois atendimentos do mesmo profissional ou paciente |
| Conflito de sala | recusa duas crianças na mesma sala e horário — só se a sala for informada |
| Geração de sessões | cria a partir da grade, pulando feriados e quem está ausente |
| Promoção de alvo | três sessões seguidas 100% independentes movem para manutenção |
| Sondagem de manutenção | objetivo dominado vira "em manutenção" e agenda 15/30/60 dias |
| Perda em sondagem | "perdeu" devolve o objetivo para ensino |
| Faltas seguidas | gera contato com a família — só quando as faltas são realmente consecutivas |
| Evolução atrasada | gera tarefa para o aplicador |
| Sondagem vencida | gera tarefa |
| Reavaliação de preferência | após 90 dias sem avaliar |
| Guia vencendo | avisa antes de virar glosa |
| Encerramento | desativa grade, cancela sessões futuras, encerra PEI e vínculos |

---

## Decisões e o porquê

**JavaScript puro, sem framework.** O sistema é mantido por uma pessoa. Framework
adiciona ferramenta de build, dependências que envelhecem e uma camada a mais para
depurar. Aqui, abrir o arquivo e ler resolve.

**A proteção está no banco, não na tela.** O repositório é público e a chave do site
também. Esconder botão não protege nada — o que impede leitura indevida são as políticas
de acesso do PostgreSQL. Por isso o diagnóstico verifica se alguma tabela ficou sem.

**A família acessa a anamnese sem login, por função.** Se o acesso público tivesse
permissão de leitura, qualquer um listaria todas as anamneses. Em vez disso existem duas
funções que exigem o token e devolvem só o necessário — inclusive apenas o primeiro nome
da criança, porque o link circula por WhatsApp.

**Paciente nunca é apagado.** Alta e desligamento mudam o status; o prontuário continua
inteiro. Prontuário de menor tem retenção longa.

**Assinatura de termo guarda o texto assinado.** Se o modelo mudar depois, a assinatura
antiga continua provando o que a família leu de fato.

**WhatsApp por link, não por integração.** Mensagem sobre criança não deve sair
automática. O sistema monta o texto e abre a conversa; quem envia é a pessoa, do próprio
número.

**Guia conferida pela data do atendimento.** Não pela data de hoje. Guia renovada em
agosto não torna válida uma sessão de julho — e é justamente essa sessão que o convênio
glosa.

**Sondagem depois do domínio.** "Dominado" não é ponto final: vira fase de manutenção
com verificação agendada. Sem isso, a perda apareceria meses depois sem ninguém saber
quando.

**O que o sistema não decide.** Ele nunca escreve conclusão clínica, nunca sugere
diagnóstico e nunca preenche o que depende de leitura profissional — nesses pontos deixa
marcador entre colchetes no rascunho. A sugestão de programas diz na tela que se baseia
na área do domínio, não no item específico.

---

## Erros encontrados testando

Registro do que já quebrou em silêncio. Nenhum derrubava o sistema; todos faziam ele
decidir errado.

| Erro | Como aparecia |
|---|---|
| Alvo promovido no meio da sessão | bastavam 3 tentativas perfeitas; erro na quarta não desfazia |
| Faltas não consecutivas | faltou-veio-faltou gerava cobrança indevida à família |
| Modo observador travado | o `drop constraint` usava nome de 64 caracteres; o banco corta em 63 |
| Diagnóstico contando menos | `limit` na listagem limitava a contagem junto |
| Pré-carregamento offline | um arquivo faltando derrubava a lista inteira, em silêncio |
| Menu recolhido | CSS montado de uma base antiga apagou correções |

Os quatro primeiros foram achados por `98_testes.sql`. Os dois últimos, testando no
navegador de verdade — servidor derrubado, estilo medido.

**A lição que se repete:** ler o código não prova nada. Quem decide é o banco e o
navegador.

---

## O que não funciona ou está pela metade

- **Datas de nascimento** dos 32 pacientes importados estão provisórias (1900-01-01).
  Enquanto isso, a idade aparece errada em toda tela.
- **E-mails das profissionais** são provisórios. Sem e-mail real não dá para criar acesso.
- **Testes de convênio, geração e diagnóstico** não rodam pelo SQL Editor: dependem de
  sessão de usuário. Só dá para conferir pelas telas.
- **A anamnese não migra para o prontuário** — as respostas ficam na própria anamnese.
- **Sugestão de programas** é por área do domínio, não pelo item específico.
- **Estoque de materiais** foi tirado do escopo.
- **IA no relatório** e **trilha de formação** foram tirados do escopo.
- **Nada disso foi usado por uma pessoa real ainda.** É a lacuna maior.

---

## Antes de usar com criança de verdade

1. Rodar `ferramentas/verificar-repo.ps1`
2. Rodar `database/98_testes.sql` num banco de teste — 15 regras precisam passar
3. Abrir **Diagnóstico** e resolver o que estiver marcado como grave
4. Percorrer `docs/ROTEIRO-DE-VALIDACAO.md`, especialmente os itens **9** (promoção de
   alvo), **14.2** (faltas não consecutivas) e **17.12** (vazamento no portal)
5. Seguir `docs/IMPLANTACAO.md` para a ordem de cadastro
6. Piloto com três crianças, **mantendo o papel em paralelo na primeira semana**

O passo 6 é o que ninguém tem vontade de fazer e é o que mais importa. Se o sistema
errar, nada clínico se perde — e a comparação entre os dois mostra onde ele erra.

---

## Onde as coisas estão

```
database/           01 a 25 · o banco inteiro, recriável do zero
  98_testes.sql     regras automáticas (só banco de teste)
  99_seed_demo.sql  massa fictícia (só banco de teste)
docs/               roteiro de validação, implantação e este mapa
ferramentas/        verificação do repositório e limpeza de backups
shared/             módulos comuns a todas as telas
styles/             base.css e components.css
supabase/functions/ criar-acesso
sw.js               funcionamento sem internet
```

---

## Regras de manutenção

- Alteração de banco vira arquivo em `database/`, sempre. Nunca só no SQL Editor.
- Regra automática nova entra com teste em `98_testes.sql`.
- Mudou versão de arquivo compartilhado? Atualizar a lista no `sw.js` **e** subir o
  `VERSAO` dele. Senão o cache serve o antigo e a mudança não aparece.
- Rodar `verificar-repo.ps1` antes de publicar.
- Conferir na tela, não no código.
