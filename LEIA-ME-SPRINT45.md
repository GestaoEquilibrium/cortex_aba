# CORTEX aba — Sprint 45 · cópia de segurança

## Antes de aplicar
Copiar `database/26_backup.sql` para a pasta `database/` e rodar no Supabase.

## Por que este sprint existe
Reparei no seu print do painel do Supabase: o projeto está no plano **FREE**.

**No plano gratuito o Supabase não faz backup automático.** Só o Pro faz, com sete dias
de retenção. Hoje os 32 prontuários existem em um único lugar — se o projeto for apagado
por engano, se a conta for suspensa, ou se alguém rodar um comando errado, não há de onde
voltar.

Isso é o maior risco do sistema neste momento, maior que qualquer funcionalidade que
falte.

## Configurações → Cópia de segurança
Botão que baixa um arquivo com todo o conteúdo clínico: pacientes, sessões, tentativas,
evoluções, PEI, comportamentos, avaliações, relatórios, termos assinados, anamneses.

A tela mostra quantos registros existem hoje, para você conferir se a cópia veio inteira,
e avisa em vermelho quando faz mais de uma semana desde a última.

Só a direção pode gerar — o arquivo contém a clínica toda.

## Três limites, ditos na tela
**Guarde fora do computador da clínica.** Cópia que mora na mesma máquina não protege de
incêndio, roubo nem de disco queimado.

**Isto leva os dados, não a estrutura.** Tabelas, funções, gatilhos e permissões vêm dos
arquivos em `database/`, que estão no GitHub. Os dois juntos reconstroem o sistema;
nenhum sozinho.

**Fotos e documentos não vêm.** Ficam no Storage e precisam ser baixados à parte, pelo
painel do Supabase.

## A forma completa
A tela também mostra o caminho do `pg_dump`, que leva estrutura e dados juntos:

```
supabase db dump -f backup_$(date +%F).sql --data-only
supabase db dump -f estrutura_$(date +%F).sql
```

Vale uma vez por mês, além da cópia pelo botão.

## Sugestão de rotina
- **Toda sexta:** botão de cópia, arquivo para o Google Drive
- **Todo mês:** `pg_dump` completo
- **Antes de qualquer migration:** cópia, sem exceção

O terceiro é o que mais salva. Alteração de banco é onde dá errado.

## Arquivos
```
configuracoes/index.html   aba de cópia de segurança
database/26_backup.sql     migration
```
