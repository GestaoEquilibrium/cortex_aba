# CORTEX aba — Sprint 18 · SQL versionado, massa de teste e roteiro

## Sem código novo
Este pacote não muda nenhuma tela. Ele resolve as três pendências que eu apontei como
mais urgentes: histórico do banco, massa para testar e roteiro de validação.

## database/ — o banco recriável
Onze arquivos numerados com todo o SQL do sistema, na ordem de execução. Com eles,
o banco pode ser reconstruído do zero num projeto Supabase vazio.

Até agora, todo o SQL foi aplicado direto pelo editor e existia só no histórico da
conversa. Se o projeto caísse, não havia roteiro de reconstrução — exatamente o
problema que o CORTEX original tem hoje.

**Regra daqui em diante:** nenhuma alteração de banco entra sem virar arquivo aqui.

### Como conferir que está tudo lá
Num projeto Supabase novo e vazio, rodar de `01` a `11` e comparar:

```sql
select count(*) from information_schema.tables where table_schema = 'public';
```

Deve bater com o projeto atual (fora as tabelas de sistema).

## database/99_seed_demo.sql — massa fictícia
Cria equipe, quatro pacientes, grade de segunda a sexta, três semanas de sessões,
tentativas com independência crescente, evoluções (deixando as últimas em branco de
propósito, para o painel acusar), comportamento com linha de base e queda após a
intervenção, e duas faltas seguidas plantadas para disparar a tarefa automática.

Todos os nomes terminam em "Demo". O bloco de limpeza está comentado no fim do arquivo.

**Nunca rodar em base com paciente real.**

## docs/ROTEIRO-DE-VALIDACAO.md
150 itens de verificação, em 15 blocos, cobrindo o ciclo completo — do login ao
relatório liberado à família.

Inclui dois testes que nunca fizemos e que considero os mais importantes:

- **Teste de vazamento** (12.8): logado como responsável, rodar consultas no console
  do navegador e confirmar que voltam vazias. É a prova de que a proteção está no
  banco, não em esconder botão.
- **Teste de permissões** (13): um usuário de cada perfil, conferindo o que cada um
  enxerga de verdade. Montamos seis perfis e nunca validamos nenhum com gente logada.

## Sugestão de execução
Reserve uma hora e percorra o roteiro inteiro de uma vez, anotando o número do item
que falhar. O que sair de lá vira o próximo sprint — com problema real, não suposto.
