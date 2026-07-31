# Implantação — CORTEX aba

Ordem de entrada em uso, com a base real da clínica. Cada etapa depende da anterior.

---

## Antes de começar

- [ ] Todas as migrations rodadas: `01` a `20` na pasta `database/`
- [ ] Confirmar que nenhuma tabela ficou sem proteção:

```sql
select tablename, rowsecurity from pg_tables
where schemaname = 'public' and rowsecurity = false;
```
O resultado precisa vir **vazio**. Qualquer tabela aqui é falha grave: o repositório é
público e a chave do frontend também.

- [ ] Edge Function `criar-acesso` publicada (Supabase → Edge Functions)

---

## Etapa 1 — Base importada

- [ ] Rodar `importar_base_real.sql`
- [ ] Rodar `importar_historico.sql` (opcional, mas dá dados aos indicadores)
- [ ] Conferir: 4 profissionais, 32 pacientes, 53 horários, 315 sessões

### Corrigir o que os relatórios não trouxeram

- [ ] **Data de nascimento dos 32 pacientes.** Enquanto estiver 1900-01-01, a idade
      aparece errada em toda tela. A consulta está no fim do arquivo de importação.
- [ ] **E-mail real das 4 profissionais.** Sem isso não dá para criar acesso, porque a
      conta é vinculada pelo e-mail.
- [ ] **Perfil de cada uma.** Todas entraram como `aplicador`. Ajuste quem é coordenação
      ou supervisão em Equipe.
- [ ] **Jornada contratada.** Sem ela, a ocupação não é calculada e a pessoa aparece
      como "sem jornada" nos Indicadores.

---

## Etapa 2 — Configuração da clínica

Configurações → Clínica e Operação:

- [ ] Nome e telefone da clínica (aparecem no cabeçalho dos relatórios)
- [ ] Horário de funcionamento — define a faixa do mapa de vagas
- [ ] Duração padrão da sessão. **Atenção:** a clínica trabalha com blocos de 45 min e a
      maioria das crianças faz 90. Ajuste conforme o mais comum
- [ ] Faltas seguidas que geram tarefa
- [ ] Prazo para lançar evolução e janela do painel
- [ ] Inatividade — deixe 0 por enquanto; ative quando houver tablet compartilhado

---

## Etapa 3 — Acessos

Comece pela direção e coordenação. Depois as aplicadoras.

- [ ] Equipe → cada profissional → **Criar acesso**
- [ ] Anotar a senha temporária de cada uma (aparece uma vez só)
- [ ] Repassar por WhatsApp ou pessoalmente
- [ ] Pedir que entrem e troquem a senha — o sistema obriga no primeiro acesso

### Conferir permissão, uma por perfil

Em janela anônima, com a conta de cada uma:

- [ ] **Aplicadora** entra na Sessão de hoje, vê só os pacientes dela, e o menu **não**
      mostra Equipe, Auditoria, Configurações, Indicadores nem Admissão
- [ ] **Coordenação** vê os pacientes da equipe, tem Auditoria, não tem Configurações
- [ ] **Direção** vê tudo

### Teste de vazamento
Logada como aplicadora, abrir o console do navegador (F12) e rodar:
```js
await eqClient.from('profissionais').select('*')
```
Deve vir só ela mesma, ou vazio. Se vier a equipe inteira, pare e me avise.

---

## Etapa 4 — Conteúdo clínico

- [ ] **Biblioteca de programas**: cadastrar os que a equipe já aplica. Comece com 10 ou
      15 — não precisa da biblioteca inteira para começar
- [ ] **Termos**: LGPD, uso de imagem e consentimento de intervenção, em Configurações → Termos
- [ ] **Modelo de anamnese**, em Configurações → Anamnese
- [ ] **Protocolo de avaliação** próprio da clínica, com a área marcada em cada domínio

---

## Etapa 5 — Piloto com 3 crianças

Escolha três casos que você conhece bem e que sejam diferentes entre si: uma com boa
frequência, uma que falta, uma com comportamento-problema.

Para cada uma:
- [ ] Conferir a grade importada
- [ ] Montar o PEI com 3 a 5 objetivos
- [ ] Registrar reforçadores
- [ ] Cadastrar o responsável e criar o acesso ao portal
- [ ] Enviar a anamnese pelo link
- [ ] Se houver comportamento-problema, cadastrar com definição observável e linha de base

### Rodar uma semana
- [ ] Coordenação gera as sessões do dia, toda manhã
- [ ] Aplicadora registra na tela, durante a sessão
- [ ] Aplicadora escreve a evolução no fim
- [ ] Coordenação confere o painel no fim do dia

**Mantenha o registro em papel em paralelo nesta semana.** Se o sistema errar, nada de
clínico se perde — e a comparação mostra exatamente onde ele está errando.

---

## Etapa 6 — Primeira supervisão

- [ ] Fazer uma supervisão de fidelidade com uma das aplicadoras
- [ ] Se possível, com registro em modo observador para calcular a concordância
- [ ] A aplicadora dá ciência

---

## Etapa 7 — Fechar o primeiro mês

- [ ] Gerar o relatório mensal de uma criança
- [ ] Conferir se os números batem com a agenda
- [ ] Revisar, finalizar e liberar à família
- [ ] Conferir no portal se apareceu

---

## Quando expandir

Só depois de uma semana rodando com as três, sem erro que impeça o trabalho. Aí entram
as outras 29 crianças, aos poucos.

---

## O que fazer quando algo der errado

Anote três coisas: **em qual tela**, **o que você esperava** e **o que aconteceu**. Se
houver mensagem de erro, tire print. Sem isso, a correção vira adivinhação.

Se for erro de dado — o sistema gravou errado, ou mostrou número que não bate — pare de
usar aquela função e me avise antes de continuar. Erro de tela dá para conviver; erro de
dado contamina o histórico.
