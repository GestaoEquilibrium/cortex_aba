-- ============================================================================
-- CORTEX aba — 98 · testes das regras automáticas
-- ----------------------------------------------------------------------------
-- Roda cenários controlados e diz PASSOU ou FALHOU em cada regra. Use num banco
-- de TESTE, nunca em produção — ele cria e apaga dados com sufixo "ZZTESTE".
--
-- Foi assim que apareceram dois erros silenciosos: o alvo promovido no meio da
-- sessão e a falta não consecutiva virando contato com a família.
-- ============================================================================
do $$
declare
    v_pac uuid; v_pac2 uuid; v_pro uuid; v_prog uuid; v_pei uuid; v_pp uuid; v_alvo uuid;
    v_s1 uuid := gen_random_uuid(); v_s2 uuid := gen_random_uuid(); v_s3 uuid := gen_random_uuid();
    v_s4 uuid := gen_random_uuid(); v_s5 uuid := gen_random_uuid(); v_s6 uuid := gen_random_uuid();
    v_status text; v_conta integer; v_erro text; i integer;
    v_passou integer := 0; v_falhou integer := 0;

begin
    raise notice '';
    raise notice '=== TESTES DAS REGRAS AUTOMÁTICAS ===';

    -- preparação ------------------------------------------------------------
    insert into public.profissionais (nome_completo, email, perfil)
    values ('ZZTESTE Aplicador','zzteste@local','aplicador') returning id into v_pro;

    insert into public.pacientes (nome_completo, data_nascimento, status)
    values ('ZZTESTE Crianca','2019-01-01','ativo') returning id into v_pac;

    insert into public.pacientes (nome_completo, data_nascimento, status)
    values ('ZZTESTE Crianca2','2019-01-01','ativo') returning id into v_pac2;

    insert into public.biblioteca_programas (nome, area, manutencao_dias)
    values ('ZZTESTE Programa','expressiva', array[15,30,60]) returning id into v_prog;

    insert into public.pei (paciente_id, versao, status)
    values (v_pac, 1, 'vigente') returning id into v_pei;

    insert into public.pei_programas (pei_id, paciente_id, programa_id, status)
    values (v_pei, v_pac, v_prog, 'em_ensino') returning id into v_pp;

    insert into public.pei_alvos (pei_programa_id, nome, ordem)
    values (v_pp, 'ZZTESTE alvo', 0) returning id into v_alvo;

    -- TESTE 1: conflito de horário na grade ---------------------------------
    insert into public.cronograma_terapeutico (paciente_id, profissional_id, dia_semana, hora_inicio, duracao_min)
    values (v_pac, v_pro, 1, '09:00', 60);
    begin
        insert into public.cronograma_terapeutico (paciente_id, profissional_id, dia_semana, hora_inicio, duracao_min)
        values (v_pac2, v_pro, 1, '09:30', 60);
        raise notice 'FALHOU  · conflito de horário não foi bloqueado';
        v_falhou := v_falhou + 1;
    exception when others then
        raise notice 'PASSOU  · conflito de horário bloqueado';
        v_passou := v_passou + 1;
    end;

    -- TESTE 2: dominado vira manutenção e agenda sondagens -------------------
    update public.pei_programas set status = 'dominado' where id = v_pp;
    select status into v_status from public.pei_programas where id = v_pp;
    select count(*) into v_conta from public.sondagens_manutencao where pei_programa_id = v_pp;

    if v_status = 'em_manutencao' and v_conta = 3 then
        raise notice 'PASSOU  · dominado virou manutenção com 3 sondagens agendadas';
        v_passou := v_passou + 1;
    else
        raise notice 'FALHOU  · esperado em_manutencao com 3 sondagens, veio % com %', v_status, v_conta;
        v_falhou := v_falhou + 1;
    end if;

    update public.pei_programas set status = 'em_ensino' where id = v_pp;
    delete from public.sondagens_manutencao where pei_programa_id = v_pp;

    -- TESTE 3: alvo NÃO pode subir no meio da sessão -------------------------
    insert into public.sessoes (id, paciente_id, profissional_id, data, hora_inicio, status)
    values (v_s1, v_pac, v_pro, current_date - 5, '09:00', 'em_andamento');
    for i in 1..6 loop
        insert into public.registros_tentativa (sessao_id, pei_programa_id, alvo_id, numero, resultado)
        values (v_s1, v_pp, v_alvo, i, 'independente');
    end loop;

    select status into v_status from public.pei_alvos where id = v_alvo;
    if v_status = 'aquisicao' then
        raise notice 'PASSOU  · alvo não foi promovido durante a sessão';
        v_passou := v_passou + 1;
    else
        raise notice 'FALHOU  · alvo virou % antes de a sessão fechar', v_status;
        v_falhou := v_falhou + 1;
    end if;

    -- TESTE 4: três sessões perfeitas seguidas promovem o alvo ---------------
    update public.sessoes set status = 'realizada' where id = v_s1;

    insert into public.sessoes (id, paciente_id, profissional_id, data, hora_inicio, status)
    values (v_s2, v_pac, v_pro, current_date - 4, '09:00', 'em_andamento');
    for i in 1..6 loop
        insert into public.registros_tentativa (sessao_id, pei_programa_id, alvo_id, numero, resultado)
        values (v_s2, v_pp, v_alvo, i, 'independente');
    end loop;
    update public.sessoes set status = 'realizada' where id = v_s2;

    -- terceira COM ERRO: não pode promover
    insert into public.sessoes (id, paciente_id, profissional_id, data, hora_inicio, status)
    values (v_s3, v_pac, v_pro, current_date - 3, '09:00', 'em_andamento');
    for i in 1..6 loop
        insert into public.registros_tentativa (sessao_id, pei_programa_id, alvo_id, numero, resultado)
        values (v_s3, v_pp, v_alvo, i, case when i = 4 then 'erro' else 'independente' end);
    end loop;
    update public.sessoes set status = 'realizada' where id = v_s3;

    select status into v_status from public.pei_alvos where id = v_alvo;
    if v_status = 'aquisicao' then
        raise notice 'PASSOU  · sessão com erro não promoveu o alvo';
        v_passou := v_passou + 1;
    else
        raise notice 'FALHOU  · alvo virou % mesmo com erro na sessão', v_status;
        v_falhou := v_falhou + 1;
    end if;

    -- agora três perfeitas seguidas
    insert into public.sessoes (id, paciente_id, profissional_id, data, hora_inicio, status)
    values (v_s4, v_pac, v_pro, current_date - 2, '09:00', 'em_andamento');
    for i in 1..6 loop
        insert into public.registros_tentativa (sessao_id, pei_programa_id, alvo_id, numero, resultado)
        values (v_s4, v_pp, v_alvo, i, 'independente');
    end loop;
    update public.sessoes set status = 'realizada' where id = v_s4;

    insert into public.sessoes (id, paciente_id, profissional_id, data, hora_inicio, status)
    values (v_s5, v_pac, v_pro, current_date - 1, '09:00', 'em_andamento');
    for i in 1..6 loop
        insert into public.registros_tentativa (sessao_id, pei_programa_id, alvo_id, numero, resultado)
        values (v_s5, v_pp, v_alvo, i, 'independente');
    end loop;
    update public.sessoes set status = 'realizada' where id = v_s5;

    insert into public.sessoes (id, paciente_id, profissional_id, data, hora_inicio, status)
    values (v_s6, v_pac, v_pro, current_date, '09:00', 'em_andamento');
    for i in 1..6 loop
        insert into public.registros_tentativa (sessao_id, pei_programa_id, alvo_id, numero, resultado)
        values (v_s6, v_pp, v_alvo, i, 'independente');
    end loop;
    update public.sessoes set status = 'realizada' where id = v_s6;

    select status into v_status from public.pei_alvos where id = v_alvo;
    if v_status = 'manutencao' then
        raise notice 'PASSOU  · três sessões perfeitas seguidas promoveram o alvo';
        v_passou := v_passou + 1;
    else
        raise notice 'FALHOU  · alvo continuou % após três sessões perfeitas', v_status;
        v_falhou := v_falhou + 1;
    end if;

    -- TESTE 5: faltas NÃO consecutivas não podem contar ----------------------
    delete from public.sessoes where paciente_id = v_pac2;
    insert into public.sessoes (paciente_id, profissional_id, data, hora_inicio, status) values
      (v_pac2, v_pro, current_date - 12, '11:00', 'falta_injustificada'),
      (v_pac2, v_pro, current_date - 11, '11:00', 'realizada'),
      (v_pac2, v_pro, current_date - 10, '11:00', 'falta_injustificada');

    with numeradas as (
        select s.paciente_id, s.data, s.status,
               row_number() over (partition by s.paciente_id order by s.data, s.hora_inicio) as seq
        from public.sessoes s
        where s.paciente_id = v_pac2 and s.data >= current_date - 30
          and s.status in ('realizada','substituicao','falta_injustificada','falta_justificada')
    ),
    faltas as (select * from numeradas where status like 'falta%'),
    grupos as (
        select paciente_id, seq, seq - row_number() over (partition by paciente_id order by seq) as bloco
        from faltas
    )
    select coalesce(max(c), 0) into v_conta
    from (select count(*) as c from grupos group by paciente_id, bloco) x;

    if v_conta = 1 then
        raise notice 'PASSOU  · faltou-veio-faltou não conta como faltas seguidas';
        v_passou := v_passou + 1;
    else
        raise notice 'FALHOU  · contou % faltas seguidas onde havia presença no meio', v_conta;
        v_falhou := v_falhou + 1;
    end if;

    -- TESTE 6: encerramento limpa a agenda e preserva o histórico ------------
    insert into public.sessoes (paciente_id, profissional_id, data, hora_inicio, status)
    values (v_pac, v_pro, current_date + 7, '09:00', 'agendada');

    update public.pacientes set status = 'alta' where id = v_pac;

    select count(*) into v_conta from public.cronograma_terapeutico
     where paciente_id = v_pac and ativo;
    if v_conta = 0 then
        raise notice 'PASSOU  · encerramento desativou a grade';
        v_passou := v_passou + 1;
    else
        raise notice 'FALHOU  · % horário(s) continuaram ativos após a alta', v_conta;
        v_falhou := v_falhou + 1;
    end if;

    select count(*) into v_conta from public.sessoes
     where paciente_id = v_pac and data > current_date and status = 'agendada';
    if v_conta = 0 then
        raise notice 'PASSOU  · sessões futuras foram canceladas';
        v_passou := v_passou + 1;
    else
        raise notice 'FALHOU  · % sessão(ões) futura(s) continuaram agendadas', v_conta;
        v_falhou := v_falhou + 1;
    end if;

    select count(*) into v_conta from public.registros_tentativa where pei_programa_id = v_pp;
    if v_conta = 36 then
        raise notice 'PASSOU  · histórico preservado (% tentativas intactas)', v_conta;
        v_passou := v_passou + 1;
    else
        raise notice 'FALHOU  · esperado 36 tentativas, restaram %', v_conta;
        v_falhou := v_falhou + 1;
    end if;

    raise notice '';
    raise notice '=== RESULTADO: % passaram, % falharam ===', v_passou, v_falhou;
    if v_falhou > 0 then
        raise notice 'Há regra automática decidindo errado. Não use em produção assim.';
    end if;
    raise notice '';
end $$;

-- limpeza -----------------------------------------------------------------------
delete from public.pacientes            where nome_completo like 'ZZTESTE%';
delete from public.biblioteca_programas where nome like 'ZZTESTE%';
delete from public.profissionais        where nome_completo like 'ZZTESTE%';

select 'massa de teste removida' as limpeza,
       (select count(*) from public.pacientes where nome_completo like 'ZZTESTE%') as restaram;
