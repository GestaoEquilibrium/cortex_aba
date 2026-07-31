-- ============================================================================
-- CORTEX aba — 99 · massa fictícia para validação
-- ----------------------------------------------------------------------------
-- NUNCA rodar em base com paciente real. Todos os nomes terminam em "Demo",
-- o que permite remover tudo depois com o bloco do final.
-- Rodar logado como direção (o SQL Editor tem privilégio de dono).
-- ============================================================================
begin;

-- equipe -----------------------------------------------------------------------
insert into public.equipes_aba (nome, turno, capacidade_pacientes)
select 'Equipe Demo', 'tarde', 20
where not exists (select 1 from public.equipes_aba where nome = 'Equipe Demo');

-- profissionais fictícios (sem conta de acesso) ---------------------------------
insert into public.profissionais (nome_completo, email, perfil, turno, jornada_horas, equipe_id)
select v.nome, v.email, v.perfil, 'tarde', v.jornada,
       (select id from public.equipes_aba where nome = 'Equipe Demo')
from (values
    ('Coordenação Demo','coord.demo@exemplo.local','coordenador_aba',6.0),
    ('Aplicadora Demo','aplicadora.demo@exemplo.local','aplicador',6.0),
    ('Aplicador Dois Demo','aplicador2.demo@exemplo.local','aplicador',6.0),
    ('Estagiária Demo','estagiaria.demo@exemplo.local','estagiario_aba',4.0)
) as v(nome,email,perfil,jornada)
where not exists (select 1 from public.profissionais p where p.email = v.email);

update public.equipes_aba
   set coordenador_id = (select id from public.profissionais where email = 'coord.demo@exemplo.local')
 where nome = 'Equipe Demo' and coordenador_id is null;

-- pacientes ---------------------------------------------------------------------
insert into public.pacientes (nome_completo, data_nascimento, sexo, responsavel_nome,
                              responsavel_telefone, convenio, sessoes_semana_prescritas,
                              cartao_seguranca, status, data_entrada, equipe_id)
select v.nome, v.nasc, v.sexo, v.resp, '(34) 90000-0000', v.conv, v.sess, v.seg, v.st, v.entrada,
       (select id from public.equipes_aba where nome = 'Equipe Demo')
from (values
   ('Théo Demo','2019-03-14'::date,'masculino','Responsável Um Demo','particular',4,
    'Alergia a amendoim. Avisar 2 min antes de trocar de atividade.','ativo',current_date - 120),
   ('Lia Demo','2021-08-02'::date,'feminino','Responsável Dois Demo','Unimed',5,
    null,'ativo',current_date - 90),
   ('Bento Demo','2017-11-20'::date,'masculino','Responsável Três Demo','particular',3,
    'Sensível a barulho alto.','ativo',current_date - 200),
   ('Noah Demo','2020-05-09'::date,'masculino','Responsável Quatro Demo',null,null,
    null,'fila_espera',null)
) as v(nome,nasc,sexo,resp,conv,sess,seg,st,entrada)
where not exists (select 1 from public.pacientes p where p.nome_completo = v.nome);

-- vínculos ----------------------------------------------------------------------
insert into public.vinculos_paciente_aplicador (paciente_id, profissional_id, tipo)
select p.id, a.id, 'titular'
from public.pacientes p
join (values ('Théo Demo','aplicadora.demo@exemplo.local'),
             ('Lia Demo','aplicadora.demo@exemplo.local'),
             ('Bento Demo','aplicador2.demo@exemplo.local')) as v(pac,email) on v.pac = p.nome_completo
join public.profissionais a on a.email = v.email
where not exists (select 1 from public.vinculos_paciente_aplicador x
                  where x.paciente_id = p.id and x.profissional_id = a.id);

-- grade: segunda a sexta ---------------------------------------------------------
insert into public.cronograma_terapeutico (paciente_id, profissional_id, dia_semana,
                                           hora_inicio, duracao_min, sala)
select p.id, a.id, d.dia, v.hora::time, 60, v.sala
from public.pacientes p
join (values ('Théo Demo','aplicadora.demo@exemplo.local','13:00','Sala 1'),
             ('Lia Demo','aplicadora.demo@exemplo.local','14:00','Sala 1'),
             ('Bento Demo','aplicador2.demo@exemplo.local','15:00','Sala 2')) as v(pac,email,hora,sala)
     on v.pac = p.nome_completo
join public.profissionais a on a.email = v.email
cross join (values (1),(2),(3),(4),(5)) as d(dia)
where not exists (select 1 from public.cronograma_terapeutico c
                  where c.paciente_id = p.id and c.dia_semana = d.dia
                    and c.hora_inicio = v.hora::time);

-- sessões dos últimos 21 dias, com faltas plantadas -----------------------------
insert into public.sessoes (paciente_id, profissional_id, cronograma_id, data,
                            hora_inicio, duracao_min, status, origem)
select c.paciente_id, c.profissional_id, c.id, d.dia, c.hora_inicio, c.duracao_min,
       case
         -- Bento falta duas vezes seguidas: dispara a tarefa automática
         when p.nome_completo = 'Bento Demo' and d.dia in (current_date - 3, current_date - 4)
              then 'falta_injustificada'
         when extract(day from d.dia)::int % 9 = 0 then 'falta_justificada'
         when d.dia > current_date then 'agendada'
         else 'realizada'
       end,
       'grade'
from public.cronograma_terapeutico c
join public.pacientes p on p.id = c.paciente_id
cross join generate_series(current_date - 21, current_date + 5, interval '1 day') as d(dia)
where c.ativo
  and extract(dow from d.dia) = c.dia_semana
  and p.nome_completo like '% Demo'
on conflict (paciente_id, data, hora_inicio) do nothing;

-- biblioteca de programas ---------------------------------------------------------
insert into public.biblioteca_programas (nome, area, objetivo, sd, resposta_esperada,
                                         consequencia, tentativas_padrao, criterio_percentual,
                                         criterio_sessoes, faixa_etaria)
select v.nome, v.area, v.obj, v.sd, v.resp, 'Elogio específico + item preferido', v.tent, 80, 3, '3 a 8 anos'
from (values
  ('Nomear alimentos Demo','expressiva','Nomear alimentos comuns quando perguntado',
   'Mostrar o item e perguntar "o que é isso?"','Nomear o item corretamente',10),
  ('Seguir instrução de um passo Demo','receptiva','Executar instruções simples',
   'Dar a instrução uma vez, em tom neutro','Executar em até 5 segundos',10),
  ('Pedir ajuda Demo','expressiva','Pedir ajuda em vez de desistir ou reclamar',
   'Apresentar tarefa levemente difícil','Pedir ajuda com palavra ou cartão',8),
  ('Esperar a vez Demo','social','Aguardar a vez em jogo de mesa',
   'Iniciar jogo de revezamento','Aguardar sem retirar a peça do outro',6)
) as v(nome,area,obj,sd,resp,tent)
where not exists (select 1 from public.biblioteca_programas b where b.nome = v.nome);

-- PEI do Théo e da Lia -------------------------------------------------------------
insert into public.pei (paciente_id, versao, status, coordenador_id)
select p.id, 1, 'vigente', (select id from public.profissionais where email = 'coord.demo@exemplo.local')
from public.pacientes p
where p.nome_completo in ('Théo Demo','Lia Demo')
  and not exists (select 1 from public.pei x where x.paciente_id = p.id);

insert into public.pei_programas (pei_id, paciente_id, programa_id, profissional_id,
                                  prioridade, tentativas_por_sessao, criterio_percentual, criterio_sessoes)
select pei.id, pei.paciente_id, b.id,
       (select profissional_id from public.vinculos_paciente_aplicador v
        where v.paciente_id = pei.paciente_id and v.tipo = 'titular' limit 1),
       2, b.tentativas_padrao, 80, 3
from public.pei pei
join public.biblioteca_programas b on b.nome like '% Demo'
where pei.status = 'vigente'
  and not exists (select 1 from public.pei_programas pp
                  where pp.pei_id = pei.id and pp.programa_id = b.id);

-- alvos do programa de nomear ------------------------------------------------------
insert into public.pei_alvos (pei_programa_id, nome, ordem)
select pp.id, v.nome, v.ord
from public.pei_programas pp
join public.biblioteca_programas b on b.id = pp.programa_id and b.nome = 'Nomear alimentos Demo'
cross join (values ('banana',0),('maçã',1),('pão',2),('leite',3)) as v(nome,ord)
where not exists (select 1 from public.pei_alvos a where a.pei_programa_id = pp.id and a.nome = v.nome);

-- tentativas nas sessões realizadas: independência sobe ao longo do tempo ----------
insert into public.registros_tentativa (sessao_id, pei_programa_id, numero, resultado, nivel_dica, aplicador_id)
select s.id, pp.id, n.numero,
       case when random() < least(0.25 + (s.data - (current_date - 21)) * 0.03, 0.92)
            then 'independente'
            when random() < 0.7 then 'com_ajuda'
            else 'erro' end,
       case when random() < 0.5 then 'verbal' else 'gestual' end,
       s.profissional_id
from public.sessoes s
join public.pacientes p    on p.id = s.paciente_id and p.nome_completo in ('Théo Demo','Lia Demo')
join public.pei pei        on pei.paciente_id = s.paciente_id and pei.status = 'vigente'
join public.pei_programas pp on pp.pei_id = pei.id
cross join generate_series(1, 6) as n(numero)
where s.status = 'realizada'
  and s.data >= current_date - 21
on conflict do nothing;

-- evoluções diárias -----------------------------------------------------------------
insert into public.evolucoes_diarias (sessao_id, paciente_id, profissional_id, texto, contexto)
select s.id, s.paciente_id, s.profissional_id,
       'Sessão realizada conforme o plano. Boa disponibilidade para as atividades propostas.',
       case when extract(day from s.data)::int % 7 = 0 then array['dormiu mal'] else null end
from public.sessoes s
join public.pacientes p on p.id = s.paciente_id and p.nome_completo like '% Demo'
where s.status = 'realizada'
  and s.data >= current_date - 21
  and s.data <= current_date - 2      -- deixa as últimas sem evolução, para o painel acusar
on conflict (sessao_id) do nothing;

-- comportamento-problema do Bento -----------------------------------------------------
insert into public.comportamentos_alvo (paciente_id, nome, definicao, tipo, funcao_hipotetizada, linha_base_ate)
select p.id, 'Recusa com grito Demo',
       'Gritar em volume alto por mais de 3 segundos diante de pedido. Não conta choro sem grito.',
       'birra', 'fuga', current_date - 14
from public.pacientes p
where p.nome_completo = 'Bento Demo'
  and not exists (select 1 from public.comportamentos_alvo c where c.paciente_id = p.id);

insert into public.registros_comportamento (comportamento_id, paciente_id, data, hora,
                                            antecedente, descricao, consequencia, intensidade, episodios, registrado_por)
select c.id, c.paciente_id, d.dia, '15:20',
       'Pedido para guardar o brinquedo', 'Gritou e afastou o material',
       'Aguardou 10 segundos e o pedido foi repetido com apoio visual',
       3,
       -- linha de base alta, queda depois da intervenção
       case when d.dia <= current_date - 14 then 3 else 1 end,
       (select id from public.profissionais where email = 'aplicador2.demo@exemplo.local')
from public.comportamentos_alvo c
cross join generate_series(current_date - 28, current_date - 1, interval '3 days') as d(dia)
where c.nome = 'Recusa com grito Demo';

-- plano de manejo -----------------------------------------------------------------------
insert into public.planos_manejo (comportamento_id, estrategia_preventiva, resposta_equipe, comportamento_substituto)
select c.id,
       'Avisar 2 minutos antes da transição, com apoio visual.',
       'Manter o pedido com tom neutro, sem retirar a demanda. Reforçar assim que atender.',
       'Ensinar a pedir "mais um minuto" com cartão.'
from public.comportamentos_alvo c
where c.nome = 'Recusa com grito Demo'
  and not exists (select 1 from public.planos_manejo p where p.comportamento_id = c.id);

commit;

-- conferência ---------------------------------------------------------------------------
select (select count(*) from public.pacientes where nome_completo like '% Demo')          as pacientes,
       (select count(*) from public.sessoes s join public.pacientes p on p.id=s.paciente_id
        where p.nome_completo like '% Demo')                                              as sessoes,
       (select count(*) from public.registros_tentativa)                                  as tentativas,
       (select count(*) from public.evolucoes_diarias)                                    as evolucoes,
       (select count(*) from public.registros_comportamento)                              as episodios;

-- ============================================================================
-- LIMPEZA — remove tudo que este arquivo criou
-- ============================================================================
-- begin;
-- delete from public.pacientes     where nome_completo like '% Demo';
-- delete from public.biblioteca_programas where nome like '% Demo';
-- delete from public.profissionais where email like '%.demo@exemplo.local';
-- delete from public.equipes_aba   where nome = 'Equipe Demo';
-- commit;
