# CORTEX aba — Sprint 38 · conflito de sala

## Antes de aplicar
Copiar `database/23_salas.sql` para a pasta `database/` e rodar no Supabase.

## O que estava faltando
A grade já tinha o campo `sala` desde o sprint 5, e a ficha até avisava quais salas
estavam em uso — mas era só aviso. **Nada impedia** marcar duas crianças no mesmo horário,
com aplicadoras diferentes, na mesma sala. O sistema aceitava, e o problema só aparecia
com as duas famílias na porta.

Foi o que vi na sua agenda de hoje: Caio e Maria Julia às 15:15.

## Agora
O banco **recusa**, com mensagem dizendo quem já está lá:

> Sala 1 já está ocupada neste dia às 15:15 — Caio Duarte Dos Santos com Ana Julia Motta Campos.

Vale para a grade fixa e para o encaixe avulso.

## Só age se você usar salas
A validação **só existe quando a sala está preenchida**. Configurações → Operação tem o
cadastro, uma sala por linha. Deixando vazio, nada muda: o campo continua livre e nenhuma
trava aparece.

Não quis impor controle de sala a uma clínica que talvez não precise.

## Nas telas
- **Ficha → Grade:** com salas cadastradas, o campo vira seleção e as ocupadas aparecem
  desabilitadas. Melhor não deixar escolher do que mostrar erro depois de preencher tudo.
- **Agenda:** a sala aparece na linha, ao lado da duração
- **Encaixe:** seleção de sala, com contagem de quantas estão livres naquele horário
- **Geração de sessões:** passa a levar a sala da grade junto

## Uma função que eu quase dupliquei
Ia criar `salas_livres`, e então percebi que `salas_ocupadas` já existia desde a migration
02. Removi a minha e usei a que existe, combinando com a lista de salas na tela.

Duas funções fazendo quase a mesma coisa é como o schema apodrece — e foi assim que o
CORTEX original acabou sem histórico do próprio banco.

## Testado
- Mesma sala e horário, aplicadoras diferentes → **recusado**, com o nome de quem ocupa
- Salas diferentes → aceito
- Sem sala informada → aceito, sem trava

## Arquivos
```
database/23_salas.sql      migration
configuracoes/index.html   cadastro de salas
pacientes/pasta.html       seleção de sala na grade
agenda/agenda.html         sala na linha e no encaixe
```
