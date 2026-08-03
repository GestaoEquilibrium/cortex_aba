# Restaurar o sistema a partir de uma cópia

Backup que nunca foi restaurado não é backup — é um arquivo que ninguém sabe se presta.

**Faça este ensaio uma vez, com calma, num projeto de teste.** Se algo estiver errado,
melhor descobrir agora do que no dia em que a clínica estiver parada.

---

## O que é preciso ter

| | Onde está |
|---|---|
| Estrutura do banco | `database/01` a `26`, no GitHub |
| Dados clínicos | arquivo `.json` de Configurações → Cópia de segurança |
| Frontend | repositório no GitHub |
| Fotos e documentos | Storage do Supabase — **baixados à parte** |
| Contas de acesso | **não vêm na cópia**; precisam ser recriadas |

Os dois primeiros juntos reconstroem o sistema. Nenhum sozinho.

---

## O ensaio, passo a passo

### 1. Projeto novo e vazio
Crie um projeto no Supabase chamado algo como `cortex_aba_ensaio`. Não use o de produção.

### 2. Estrutura
SQL Editor → rodar `database/01_fundacao.sql` até `26_backup.sql`, em ordem.

Confira:
```sql
select tablename, rowsecurity from pg_tables
where schemaname = 'public' and rowsecurity = false;
```
Precisa vir vazio.

### 3. Gerar o arquivo de carga
No computador:
```powershell
powershell -ExecutionPolicy Bypass -File ferramentas\restaurar-backup.ps1 `
           -Arquivo caminho\cortex-aba-backup-2026-08-03.json
```
Ele mostra uma tabela com o que encontrou e gera um `.sql` ao lado do `.json`.

### 4. Carregar
Cole o `.sql` gerado no SQL Editor e rode. No fim ele mostra as contagens — precisam
bater com os números que o script listou.

### 5. Conferir de verdade
Contagem igual não prova que os dados fazem sentido. Confira também:

```sql
-- as sessões continuam apontando para os pacientes certos?
select p.nome_completo, count(*) as sessoes, min(s.data), max(s.data)
from sessoes s join pacientes p on p.id = s.paciente_id
group by p.nome_completo order by 2 desc limit 5;

-- a grade tem paciente e aplicadora?
select p.nome_completo, pr.nome_completo, c.dia_semana, c.hora_inicio
from cronograma_terapeutico c
join pacientes p on p.id = c.paciente_id
join profissionais pr on pr.id = c.profissional_id limit 5;

-- as configurações voltaram com o tipo certo?
select chave, valor, jsonb_typeof(valor) from configuracoes limit 5;
```

### 6. Apontar o frontend
Copie a URL e a chave do projeto novo para o `config.js` e abra o sistema. Percorra
Pacientes, Agenda e uma ficha completa.

### 7. Recriar um acesso
As contas de autenticação não vêm na cópia. Em Equipe, crie o acesso de um profissional
e entre com ele. É a parte que mais se esquece.

### 8. Apagar o projeto de ensaio
Ele contém dados reais de pacientes. Não deixe rodando.

---

## Detalhes que importam

**Os gatilhos ficam desligados durante a carga.** O arquivo usa
`session_replication_role = replica`. Sem isso, a validação de conflito de horário
recusaria a própria grade que está sendo restaurada, e os gatilhos de alvo
recalculariam em cima de dados que já vêm decididos.

**A conversão de tipos é feita pelo PostgreSQL.** O arquivo entrega o bloco JSON e usa
`jsonb_populate_recordset`, que converte cada campo pela definição da tabela.

A primeira versão deste script tentava adivinhar o tipo de cada valor e quebrava em
campo `jsonb` que guarda texto simples — o `"08:00"` do horário de funcionamento
derrubava a restauração inteira. Só apareceu porque o ensaio foi feito de verdade.

**A trilha de auditoria e o registro de erros não vêm na cópia.** A auditoria cresce
demais e é registro local; os erros são descartáveis.

---

## Quando refazer o ensaio
- Depois de qualquer sprint que mexa em migrations
- Uma vez a cada seis meses, mesmo sem mudança
- Antes de qualquer operação grande no banco de produção
