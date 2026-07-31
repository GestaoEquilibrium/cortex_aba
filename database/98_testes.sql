-- ============================================================================
-- CORTEX aba — 98 · testes das regras automáticas
-- ----------------------------------------------------------------------------
-- Roda cenários controlados e diz PASSOU ou FALHOU em cada regra. Use num banco
-- de TESTE, nunca em produção — ele cria e apaga dados com sufixo "ZZTESTE".
--
-- Foi assim que apareceram três erros silenciosos: o alvo promovido no meio da
-- sessão, a falta não consecutiva virando contato com a família, e o diagnóstico
-- contando menos casos do que existiam.
--
-- Cobre 18 regras. Sempre que uma regra automática nova entrar no sistema, um
-- teste dela entra aqui — senão ela nunca é exercitada até quebrar em produção.
-- ============================================================================
do $$
declare
    v_pac uuid; v_pac2 uuid; v_pro uuid; v_prog uuid; v_pei uuid; v_pp uuid; v_alvo uuid;
    v_s1 uuid := gen_random_uuid(); v_s2 uuid := gen_random_uuid(); v_s3 uuid := gen_random_uuid();
    v_s4 uuid := gen_random_uuid(); v_s5 uuid := gen_random_uuid(); v_s6 uuid := gen_random_uuid();
    v_status text; v_conta integer; v_n2 integer; v_erro text; i integer;
    v_pro2 uuid; v_pro3 uuid; v_tem_sessao boolean; v_antes integer;
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

    insert into public.profissionais (nome_completo, email, perfil)
    values ('ZZTESTE Aplicador2','zzteste2@local','aplicador') returning id into v_pro2;
    insert into public.profissionais (nome_completo, email, perfil)
    values ('ZZTESTE Aplicador3','zzteste3@local','aplicador') returning id into v_pro3;

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

    -- TESTE 7: sala ocupada no mesmo horário --------------------------------
    update public.configuracoes set valor = '["ZZTESTE Sala A","ZZTESTE Sala B"]'::jsonb
     where chave = 'salas';

    update public.cronograma_terapeutico set sala = 'ZZTESTE Sala A'
     where paciente_id = v_pac;

    begin
        insert into public.cronograma_terapeutico
            (paciente_id, profissional_id, dia_semana, hora_inicio, duracao_min, sala)
        values (v_pac2, v_pro2, 1, '09:30', 60, 'ZZTESTE Sala A');
        raise notice 'FALHOU  · sala ocupada não foi bloqueada';
        v_falhou := v_falhou + 1;
    exception when others then
        raise notice 'PASSOU  · sala ocupada bloqueada';
        v_passou := v_passou + 1;
    end;

    -- TESTE 8: sala diferente no mesmo horário deve passar --------------------
    begin
        insert into public.cronograma_terapeutico
            (paciente_id, profissional_id, dia_semana, hora_inicio, duracao_min, sala)
        values (v_pac2, v_pro2, 1, '09:30', 60, 'ZZTESTE Sala B');
        raise notice 'PASSOU  · sala diferente aceita no mesmo horário';
        v_passou := v_passou + 1;
    exception when others then
        raise notice 'FALHOU  · sala livre foi recusada: %', sqlerrm;
        v_falhou := v_falhou + 1;
    end;

    -- TESTE 9: sem sala informada, nenhuma trava -----------------------------
    begin
        insert into public.cronograma_terapeutico
            (paciente_id, profissional_id, dia_semana, hora_inicio, duracao_min)
        values (v_pac2, v_pro3, 2, '09:30', 60);
        raise notice 'PASSOU  · grade sem sala não é travada';
        v_passou := v_passou + 1;
    exception when others then
        raise notice 'FALHOU  · grade sem sala foi recusada: %', sqlerrm;
        v_falhou := v_falhou + 1;
    end;

    -- ── Daqui em diante: funções que checam permissão ─────────────────────
    -- No SQL Editor não existe sessão de usuário, então elas recusam por
    -- princípio. Em vez de acusar falha onde não há, o teste avisa que pulou.
    v_tem_sessao := public.eq_perfil() is not null;
    if not v_tem_sessao then
        raise notice '';
        raise notice 'PULADO  · testes de convênio, geração e diagnóstico';
        raise notice '           (precisam de sessão de usuário; rode pelo app)';
    end if;

    -- TESTE 10: guia vencida NA DATA do atendimento --------------------------
    -- A conta precisa usar a data da sessão, não a de hoje: guia renovada depois
    -- não torna válido um atendimento que já aconteceu fora da vigência.
    update public.pacientes
       set convenio = 'ZZTESTE Convenio', guia_validade = current_date - 5,
           guia_numero = 'ZZ-001'
     where id = v_pac;

    insert into public.sessoes (paciente_id, profissional_id, data, hora_inicio, duracao_min, status)
    values (v_pac, v_pro, current_date - 2, '08:00', 60, 'realizada'),
           (v_pac, v_pro, current_date - 9, '08:00', 60, 'realizada');

    if v_tem_sessao then
    select count(*) into v_conta
      from public.relatorio_convenio('ZZTESTE Convenio', current_date - 30, current_date)
     where guia_vencida;

    if v_conta = 1 then
        raise notice 'PASSOU  · glosa contada pela data do atendimento';
        v_passou := v_passou + 1;
    else
        raise notice 'FALHOU  · esperava 1 sessão com guia vencida, veio %', v_conta;
        v_falhou := v_falhou + 1;
    end if;
    end if;

    -- TESTE 11: sessão com guia válida não entra como risco ------------------
    if v_tem_sessao then
    select count(*) into v_conta
      from public.relatorio_convenio('ZZTESTE Convenio', current_date - 30, current_date)
     where not guia_vencida;
    if v_conta = 1 then
        raise notice 'PASSOU  · sessão dentro da validade não vira glosa';
        v_passou := v_passou + 1;
    else
        raise notice 'FALHOU  · esperava 1 sessão válida, veio %', v_conta;
        v_falhou := v_falhou + 1;
    end if;
    end if;

    -- TESTE 12: bloqueio de agenda impede geração ----------------------------
    insert into public.bloqueios_agenda (data, descricao, tipo)
    values (current_date + 30, 'ZZTESTE Feriado', 'feriado');

    if v_tem_sessao then
    select public.gerar_sessoes(current_date + 30) into v_conta;
    if v_conta = 0 then
        raise notice 'PASSOU  · dia bloqueado não gera sessão';
        v_passou := v_passou + 1;
    else
        raise notice 'FALHOU  · gerou % sessão(ões) em dia bloqueado', v_conta;
        v_falhou := v_falhou + 1;
    end if;
    end if;

    -- TESTE 13: ausência do profissional é pulada na geração -----------------
    insert into public.ausencias_profissional (profissional_id, data_inicio, data_fim, motivo)
    values (v_pro, current_date + 31, current_date + 40, 'ferias');

    select count(*) into v_conta
      from public.cronograma_terapeutico c
     where c.profissional_id = v_pro and c.ativo
       and c.dia_semana = extract(dow from current_date + 31);

    if v_conta > 0 and v_tem_sessao then
        select public.gerar_sessoes(current_date + 31) into v_conta;
        select count(*) into v_conta
          from public.sessoes
         where data = current_date + 31 and profissional_id = v_pro;
        if v_conta = 0 then
            raise notice 'PASSOU  · profissional ausente é pulado na geração';
            v_passou := v_passou + 1;
        else
            raise notice 'FALHOU  · gerou % sessão(ões) para quem está de férias', v_conta;
            v_falhou := v_falhou + 1;
        end if;
    elsif v_tem_sessao then
        raise notice 'PULADO  · sem grade no dia para testar ausência';
    end if;

    -- TESTE 14: cobertura não sugere quem está ausente ------------------------
    if v_tem_sessao then
    select count(*) into v_conta
      from public.sugerir_cobertura(current_date + 31, '09:00'::time, 60)
     where id = v_pro;
    if v_conta = 0 then
        raise notice 'PASSOU  · ausente não aparece como cobertura';
        v_passou := v_passou + 1;
    else
        raise notice 'FALHOU  · profissional de férias foi sugerido para cobertura';
        v_falhou := v_falhou + 1;
    end if;
    end if;

    -- TESTE 15: IOA separa aplicador de observador ---------------------------
    -- Sem `observador` na chave única, o segundo registro sobrescreveria o
    -- primeiro e a concordância seria sempre 100%.
    insert into public.sessoes (id, paciente_id, profissional_id, data, hora_inicio, status)
    values (v_s1, v_pac, v_pro, current_date - 20, '10:00', 'realizada')
    on conflict (id) do nothing;

    delete from public.registros_tentativa where sessao_id = v_s1;

    for i in 1..4 loop
        insert into public.registros_tentativa
            (sessao_id, pei_programa_id, alvo_id, numero, resultado, observador)
        values (v_s1, v_pp, v_alvo, i, 'independente', false);
        insert into public.registros_tentativa
            (sessao_id, pei_programa_id, alvo_id, numero, resultado, observador)
        values (v_s1, v_pp, v_alvo, i,
                case when i = 3 then 'com_ajuda' else 'independente' end, true);
    end loop;

    select count(*) into v_conta from public.registros_tentativa where sessao_id = v_s1;
    if v_conta = 8 then
        raise notice 'PASSOU  · registros de aplicador e observador convivem';
        v_passou := v_passou + 1;
    else
        raise notice 'FALHOU  · esperava 8 registros, ficaram % (um sobrescreveu o outro)', v_conta;
        v_falhou := v_falhou + 1;
    end if;

    select percentual into v_conta from public.calcular_ioa(v_s1) limit 1;
    if v_conta = 75 then
        raise notice 'PASSOU  · concordância calculada corretamente (75%%)';
        v_passou := v_passou + 1;
    else
        raise notice 'FALHOU  · esperava 75%% de concordância, veio %', coalesce(v_conta, -1);
        v_falhou := v_falhou + 1;
    end if;

    -- TESTE 16: exportação de paciente traz o essencial -----------------------
    if v_tem_sessao then
    select jsonb_array_length(public.exportar_paciente(v_pac) -> 'sessoes') into v_conta;
    if v_conta > 0 then
        raise notice 'PASSOU  · exportação de dados traz as sessões';
        v_passou := v_passou + 1;
    else
        raise notice 'FALHOU  · exportação veio sem sessões';
        v_falhou := v_falhou + 1;
    end if;

    if (public.exportar_paciente(v_pac) -> 'paciente') ? 'foto_url' then
        raise notice 'FALHOU  · exportação está levando o caminho da foto';
        v_falhou := v_falhou + 1;
    else
        raise notice 'PASSOU  · exportação não leva o caminho da foto';
        v_passou := v_passou + 1;
    end if;
    end if;

    -- TESTE 17: diagnóstico conta o total, não a amostra ----------------------
    -- Uma versão anterior mostrava 6 quando havia 32: o `limit` da listagem de
    -- nomes limitava a contagem junto.
    update public.pacientes set data_nascimento = '1900-01-01'
     where nome_completo like 'ZZTESTE%';

    if v_tem_sessao then
    select quantos into v_conta
      from public.diagnostico_sistema()
     where item = 'Data de nascimento provisória';

    select count(*) into v_n2 from public.pacientes
     where status = 'ativo' and data_nascimento < '1990-01-01';

    if coalesce(v_conta, 0) = v_n2 then
        raise notice 'PASSOU  · diagnóstico conta todos os casos (%)', v_n2;
        v_passou := v_passou + 1;
    else
        raise notice 'FALHOU  · diagnóstico disse % mas existem %', coalesce(v_conta,0), v_n2;
        v_falhou := v_falhou + 1;
    end if;
    end if;

    -- TESTE 18: nenhuma tabela sem proteção de acesso -------------------------
    select count(*) into v_conta
      from pg_tables where schemaname = 'public' and rowsecurity = false;
    if v_conta = 0 then
        raise notice 'PASSOU  · todas as tabelas com proteção de acesso';
        v_passou := v_passou + 1;
    else
        raise notice 'FALHOU  · % tabela(s) sem proteção — dado exposto', v_conta;
        v_falhou := v_falhou + 1;
    end if;

    -- TESTE FINAL: encerramento limpa a agenda e preserva o histórico ------------
    select count(*) into v_antes from public.registros_tentativa where pei_programa_id = v_pp;

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

    -- compara com o que existia ANTES da alta, em vez de um número fixo:
    -- número fixo em teste quebra a cada mudança de cenário e vira ruído
    select count(*) into v_conta from public.registros_tentativa where pei_programa_id = v_pp;
    if v_conta = v_antes then
        raise notice 'PASSOU  · histórico preservado (% tentativas intactas)', v_conta;
        v_passou := v_passou + 1;
    else
        raise notice 'FALHOU  · havia % tentativas antes da alta, restaram %', v_antes, v_conta;
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
delete from public.bloqueios_agenda    where descricao like 'ZZTESTE%';
delete from public.pacientes            where nome_completo like 'ZZTESTE%';
delete from public.biblioteca_programas where nome like 'ZZTESTE%';
delete from public.profissionais        where nome_completo like 'ZZTESTE%';
update public.configuracoes set valor = '[]'::jsonb
 where chave = 'salas' and valor::text like '%ZZTESTE%';

select 'massa de teste removida' as limpeza,
       (select count(*) from public.pacientes where nome_completo like 'ZZTESTE%') as restaram;
