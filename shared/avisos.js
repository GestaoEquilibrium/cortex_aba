// ============================================================================
// CORTEX aba — Central de avisos
// ----------------------------------------------------------------------------
// O sino da barra lateral era enfeite desde o sprint 4. Agora junta o que já existe
// espalhado pelo sistema e mostra num painel só, com link para resolver.
//
// Cada item traz: gravidade, texto e para onde ir. Nada aqui é calculado de novo —
// tudo vem das mesmas consultas que as telas já usam.
// ============================================================================

window.EqAvisos = (function () {
    'use strict';

    let cache = null, buscando = null;

    const p2 = n => String(n).padStart(2,'0');
    const hoje = () => { const d = new Date(); return d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate()); };
    const emDias = n => { const d = new Date(); d.setDate(d.getDate()+n);
                          return d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate()); };
    const brl = iso => iso ? iso.slice(0,10).split('-').reverse().join('/') : '';

    function raiz() {
        const pastas = ['pacientes','sessao','portal','agenda','programas','avaliacoes','graficos',
                        'comportamento','tarefas','relatorios','equipe','configuracoes','auditoria',
                        'indicadores','supervisao'];
        const partes = window.location.pathname.split('/').filter(Boolean);
        let subir = 0;
        partes.forEach(p => { if (pastas.includes(p)) subir++; });
        return '../'.repeat(subir);
    }

    async function buscar(forcar) {
        if (cache && !forcar) return cache;
        if (buscando && !forcar) return buscando;

        buscando = (async function () {
            const eu = window.EqSessao;
            const avisos = [];
            const coordena = eu && ['admin_direcao','coordenador_aba','supervisor_clinico','recepcao'].includes(eu.perfil);

            try {
                // ── minhas tarefas abertas ──────────────────────────────────
                const { data: tarefas } = await eqClient.from('tarefas')
                    .select('id, titulo, prazo, prioridade, responsavel_id')
                    .eq('status', 'aberta').limit(100);

                const minhas = (tarefas || []).filter(t =>
                    !eu || t.responsavel_id === eu.profissional.id);
                const atrasadas = minhas.filter(t => t.prazo && t.prazo < hoje());

                if (atrasadas.length) {
                    avisos.push({ nivel:'alto', icone:'tarefa',
                        titulo: atrasadas.length + (atrasadas.length === 1 ? ' tarefa atrasada' : ' tarefas atrasadas'),
                        detalhe: atrasadas[0].titulo + (atrasadas.length > 1 ? ' e outras' : ''),
                        href: 'tarefas/index.html' });
                } else if (minhas.length) {
                    avisos.push({ nivel:'info', icone:'tarefa',
                        titulo: minhas.length + (minhas.length === 1 ? ' tarefa aberta' : ' tarefas abertas'),
                        detalhe: minhas[0].titulo,
                        href: 'tarefas/index.html' });
                }

                // ── evoluções pendentes ─────────────────────────────────────
                const janela = window.EqConfig ? parseInt(EqConfig.get('janela_evolucao_dias', 7), 10) : 7;
                let qs = eqClient.from('sessoes').select('id, data, profissional_id')
                    .eq('status', 'realizada').gte('data', emDias(-janela)).lte('data', hoje());
                if (eu && ['aplicador','aplicador_itinerante','estagiario_aba'].includes(eu.perfil)) {
                    qs = qs.eq('profissional_id', eu.profissional.id);
                }
                const { data: realizadas } = await qs;
                if (realizadas && realizadas.length) {
                    const { data: evs } = await eqClient.from('evolucoes_diarias').select('sessao_id');
                    const feitas = new Set((evs || []).map(e => e.sessao_id));
                    const faltando = realizadas.filter(s => !feitas.has(s.id));
                    if (faltando.length) {
                        avisos.push({ nivel: faltando.length > 3 ? 'alto' : 'medio', icone:'evolucao',
                            titulo: faltando.length + (faltando.length === 1 ? ' evolução pendente' : ' evoluções pendentes'),
                            detalhe: 'sessões realizadas sem evolução escrita',
                            href: coordena ? 'dashboard.html' : 'sessao/sessao.html' });
                    }
                }

                // ── sondagens de manutenção vencidas ────────────────────────
                try {
                    const { data: sond } = await eqClient.from('sondagens_manutencao')
                        .select('id, data_prevista, paciente:pacientes(nome_completo)')
                        .is('data_realizada', null).lte('data_prevista', hoje()).limit(20);
                    if (sond && sond.length) {
                        avisos.push({ nivel:'medio', icone:'sondagem',
                            titulo: sond.length + (sond.length === 1 ? ' sondagem vencida' : ' sondagens vencidas'),
                            detalhe: 'objetivos dominados aguardando verificação',
                            href: 'tarefas/index.html' });
                    }
                } catch (e) {}

                if (coordena) {
                    // ── guias vencidas ou vencendo ──────────────────────────
                    const { data: guias } = await eqClient.from('pacientes')
                        .select('id, nome_completo, guia_validade')
                        .eq('status','ativo').not('guia_validade','is',null)
                        .lte('guia_validade', emDias(30));
                    const vencidas = (guias || []).filter(p => p.guia_validade < hoje());
                    const vencendo = (guias || []).filter(p => p.guia_validade >= hoje());

                    if (vencidas.length) {
                        avisos.push({ nivel:'alto', icone:'guia',
                            titulo: vencidas.length + (vencidas.length === 1 ? ' guia vencida' : ' guias vencidas'),
                            detalhe: vencidas.map(p => p.nome_completo.split(' ')[0]).slice(0,3).join(', '),
                            href: 'indicadores/index.html' });
                    }
                    if (vencendo.length) {
                        avisos.push({ nivel:'info', icone:'guia',
                            titulo: vencendo.length + ' guia(s) vencendo em 30 dias',
                            detalhe: vencendo.map(p => p.nome_completo.split(' ')[0] + ' · ' + brl(p.guia_validade)).slice(0,3).join(' · '),
                            href: 'indicadores/index.html' });
                    }

                    // ── anamneses respondidas aguardando revisão ────────────
                    try {
                        const { data: anam } = await eqClient.from('anamneses')
                            .select('id, paciente:pacientes(nome_completo)').eq('status','respondida').limit(20);
                        if (anam && anam.length) {
                            avisos.push({ nivel:'medio', icone:'anamnese',
                                titulo: anam.length + ' anamnese(s) para revisar',
                                detalhe: anam.map(a => a.paciente ? a.paciente.nome_completo.split(' ')[0] : '').filter(Boolean).slice(0,3).join(', '),
                                href: 'pacientes/lista.html' });
                        }
                    } catch (e) {}
                }

                // ── supervisão aguardando ciência ──────────────────────────
                try {
                    if (eu) {
                        const { data: sup } = await eqClient.from('supervisoes')
                            .select('id, data').eq('profissional_id', eu.profissional.id)
                            .is('ciente_em', null).limit(10);
                        if (sup && sup.length) {
                            avisos.push({ nivel:'medio', icone:'supervisao',
                                titulo: sup.length + ' supervisão(ões) aguardando sua ciência',
                                detalhe: 'leia a devolutiva e o plano de ação',
                                href: 'supervisao/index.html' });
                        }
                    }
                } catch (e) {}

            } catch (e) {
                console.warn('CORTEX aba: avisos indisponíveis', e);
            }

            const ordem = { alto:0, medio:1, info:2 };
            avisos.sort((a,b) => ordem[a.nivel] - ordem[b.nivel]);
            cache = avisos;
            return avisos;
        })();

        return buscando;
    }

    function limpar() { cache = null; buscando = null; }

    async function contar() {
        const avisos = await buscar();
        return avisos.filter(a => a.nivel !== 'info').length;
    }

    const CORES = { alto:'var(--st-bad)', medio:'var(--st-warn)', info:'var(--st-neutro)' };

    async function mostrar() {
        const avisos = await buscar(true);

        const fundo = document.createElement('div');
        fundo.style.cssText = 'position:fixed;inset:0;z-index:220;background:rgba(12,27,42,.5);' +
            'backdrop-filter:blur(4px);display:flex;align-items:flex-start;justify-content:center;' +
            'padding:70px 20px 20px';
        fundo.innerHTML = `
            <div style="background:var(--surface);border-radius:16px;padding:20px;max-width:440px;width:100%;
                        max-height:80vh;overflow:auto;box-shadow:var(--shadow-lg)">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
                    <h3 style="font-size:16px;font-weight:800">Avisos</h3>
                    <button id="eqFechaAvisos" style="border:none;background:transparent;cursor:pointer;
                            color:var(--ink-soft);font-size:20px;line-height:1;padding:0 4px">×</button>
                </div>
                <p style="font-size:11.5px;color:var(--ink-soft);margin-bottom:14px">
                    O que está esperando alguém agora.</p>
                ${avisos.length ? avisos.map(a => `
                    <a href="${raiz() + a.href}" style="display:flex;gap:11px;align-items:flex-start;
                            padding:12px 0;border-top:1px solid var(--line);text-decoration:none;color:inherit">
                        <span style="width:8px;height:8px;border-radius:50%;flex:0 0 auto;margin-top:5px;
                                     background:${CORES[a.nivel]}"></span>
                        <span style="flex:1;min-width:0">
                            <b style="font-size:13px;display:block">${a.titulo}</b>
                            <span style="font-size:11.5px;color:var(--ink-muted)">${a.detalhe}</span>
                        </span>
                        <span style="color:var(--ink-soft);font-size:16px">›</span>
                    </a>`).join('')
                : `<div style="padding:28px 10px;text-align:center;color:var(--ink-muted);font-size:13px">
                     Nada pendente por aqui.<br>
                     <span style="font-size:11.5px;color:var(--ink-soft)">Bom sinal.</span>
                   </div>`}
            </div>`;
        document.body.appendChild(fundo);

        fundo.querySelector('#eqFechaAvisos').addEventListener('click', () => fundo.remove());
        fundo.addEventListener('click', e => { if (e.target === fundo) fundo.remove(); });
    }

    return { buscar, contar, mostrar, limpar };
})();
