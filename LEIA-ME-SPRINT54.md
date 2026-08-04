# CORTEX aba — Sprint 54 · CPF do paciente e do responsável

## SQL
Já rodado. As colunas, a validação, o gatilho e o índice único estão aplicados, e a
prestação de contas ao convênio já devolve o CPF.

## Onde aparece

**Cadastro de paciente** — dois campos novos: CPF da criança e CPF do responsável. O
primeiro traz a nota "usado no convênio e na nota fiscal", que é o motivo de existir.

**Ficha → Editar cadastro** — os mesmos dois campos, preenchidos com máscara.

**Ficha → Resumo** — o CPF aparece junto com telefone e convênio. Sem preenchimento,
mostra "não informado" em cinza, sem alarme.

**Convênios** — coluna de CPF na tabela e no CSV. Paciente sem CPF aparece em âmbar, e
um aviso no rodapé lista quem está faltando: **a maioria dos convênios devolve a
prestação de contas sem esse dado.**

## Validação em dois lugares
O dígito verificador é conferido no banco e na tela. Repetir a regra é aceitável aqui:
**o banco é a garantia, a tela é a cortesia.** Se alguém inserir por fora do sistema, o
gatilho recusa do mesmo jeito.

Ambos rejeitam CPF de dígitos repetidos — `111.111.111-11` passa no cálculo mas não existe.

## Dois detalhes de acabamento
**A máscara não reclama enquanto você digita.** A primeira versão pintava a borda de
vermelho no terceiro dígito, o que é ruído: o número ainda está incompleto, claro que não
é válido. Agora ela só cobra quando o número está completo, ou quando você sai do campo.

**O banco guarda só os dígitos.** Máscara é assunto de tela. Assim a busca e a
comparação funcionam sem depender de quem digitou com ponto ou sem.

## Regra de unicidade
Duas crianças não podem ter o mesmo CPF. O do responsável **pode repetir** — irmãos
atendidos na mesma clínica são comuns, e travar isso criaria problema onde não há.

## Arquivos
```
shared/cpf.js            novo — máscara e validação
pacientes/lista.html     campos no cadastro
pacientes/pasta.html     campos na edição e CPF no resumo
convenios/index.html     coluna, exportação e aviso de quem falta
sw.js                    versão 14
```
