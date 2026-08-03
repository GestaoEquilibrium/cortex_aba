# CORTEX aba — Sprint 46 · restaurar a cópia

## Sem SQL e sem mudança de tela

## Por que
O sprint 45 fez a cópia. Este fecha o outro lado: **backup que nunca foi restaurado não
é backup**, é um arquivo que ninguém sabe se presta.

## ferramentas/restaurar-backup.ps1
Lê o `.json` baixado e gera um `.sql` com os dados na ordem certa de dependência —
paciente antes de sessão, sessão antes de tentativa. Fora de ordem, o banco recusa e a
restauração para no meio.

```powershell
powershell -ExecutionPolicy Bypass -File ferramentas\restaurar-backup.ps1 `
           -Arquivo caminho\cortex-aba-backup-2026-08-03.json
```

## docs/RESTAURACAO.md
O ensaio completo, em oito passos: projeto vazio, estrutura, carga, conferência, frontend
apontado, acesso recriado, e apagar o projeto de ensaio no fim — ele contém dados reais.

## O ensaio que eu fiz aqui
Simulei o desastre com a sua base importada: zerei o banco, recriei a estrutura pelos
arquivos de `database/` e restaurei pela cópia.

Voltaram 32 pacientes, 4 profissionais, 53 horários na grade, 315 sessões e as 14
configurações. Conferi além da contagem: as sessões apontando para os pacientes certos,
a grade com paciente e aplicadora, e os campos `jsonb` com o tipo correto.

## O erro que o ensaio pegou
A primeira versão do script montava cada valor à mão e tentava adivinhar o tipo. Ela
quebrava em campo `jsonb` que guarda texto simples — o `"08:00"` do horário de
funcionamento derrubava a restauração inteira, e nada era carregado.

Refiz usando `jsonb_populate_recordset`, que deixa o PostgreSQL converter pela definição
da tabela. Aí funcionou.

Se eu tivesse entregue sem ensaiar, você descobriria isso no pior dia possível.

## O que não vem na cópia
- **Contas de acesso** — precisam ser recriadas em Equipe
- **Fotos e documentos** — ficam no Storage, baixados à parte
- **Auditoria e erros** — de propósito

## Arquivos
```
ferramentas/restaurar-backup.ps1   novo
docs/RESTAURACAO.md                novo
```
