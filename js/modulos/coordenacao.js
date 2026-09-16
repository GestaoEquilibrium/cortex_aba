// ============================================================================
// CORTEX aba - js/modulos/coordenacao.js
// Painel da coordenadora: a equipe dela (aplicadores e criancas), os avisos que
// aparecem na entrada (sempre a mao), pendencias de sessao e o que foi feito
// com as criancas (programas aplicados + evolucoes) por dia / semana / mes.
// Direcao e suporte escolhem a coordenadora que querem ver.
// ============================================================================

window.MODULOS = window.MODULOS || {};

window.MODULOS.coordenacao = {

  el: null,
  _coordId: null,     // coordenadora em foco (direcao/suporte); null = eu
  _periodo: 'hoje',

  async render(el, sessao) {
    this.el = el;
    const perfil = sessao.profile.perfil;
    const escolhe = ['direcao', 'suporte'].includes(perfil);
    let coords = [];
    if (escolhe) {
      const { data } = await sb.from('profiles').select('id, nome').eq('perfil', 'coordenador').eq('ativo', true).order('nome');
      coords = data || [];
      if (!this._coordId && coords.length) this._coordId = coords[0].id;
    } else {
      this._coordId = null;
    }

    el.innerHTML =
      '<div class="pagina-cabecalho">' +
      '  <div><h2>Coordenacao</h2><p class="sub">Sua equipe, os avisos da entrada e o que foi feito com cada crianca.</p></div>' +
      (escolhe
        ? '<select id="co-coord" onchange="MODULOS.coordenacao.mudarCoord(this.value)">' +
          coords.map(c => '<option value="' + c.id + '"' + (c.id === this._coordId ? ' selected' : '') + '>' + escaparHtml(c.nome) + '</option>').join('') +
          '</select>'
        : '') +
      '</div>' +
      '<div class="grade-2col" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(300px, 1fr)); gap:14px">' +
      '  <div class="cartao" id="co-equipe"><h3>Equipe</h3><p class="sub">Carregando...</p></div>' +
      '  <div class="cartao" id="co-avisos"><h3>Avisos de hoje</h3><p class="sub">Carregando...</p></div>' +
      '</div>' +
      '<div class="cartao" id="co-pend" style="margin-top:14px"><h3>Pendencias de sessao</h3><p class="sub">Verificando...</p></div>' +
      '<div class="cartao" style="margin-top:14px">' +
      '  <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap">' +
      '    <h3 style="margin:0">Programas aplicados e evolucoes</h3>' +
      '    <div class="toggle-visao" id="co-periodo">' +
      ['hoje', 'semana', 'mes'].map(p => '<button type="button" class="' + (p === this._periodo ? 'ativo' : '') + '" onclick="MODULOS.coordenacao.mudarPeriodo(\'' + p + '\')">' +
        ({ hoje: 'Hoje', semana: 'Semana', mes: 'Mes' })[p] + '</button>').join('') +
      '    </div></div>' +
      '  <div id="co-feito" style="margin-top:10px"><p class="sub">Carregando...</p></div>' +
      '</div>';

    const eq = await ESCOPO.carregar(true, this._coordId);
    this._eq = eq;
    this.desenharEquipe(eq);
    this.desenharAvisos(eq);
    this.desenharPendencias();
    this.desenharFeito(eq);
  },

  mudarCoord(id) { this._coordId = id; this.render(this.el, window.CORTEX_SESSAO); },
  mudarPeriodo(p) {
    this._periodo = p;
    document.querySelectorAll('#co-periodo button').forEach(b => b.classList.toggle('ativo', b.textContent.toLowerCase().startsWith(p.slice(0, 3))));
    this.desenharFeito(this._eq);
  },

  async desenharEquipe(eq) {
    const alvo = document.getElementById('co-equipe');
    const ids = [...eq.pacientes];
    const { data: pacs } = ids.length
      ? await sb.from('pacientes').select('id, nome, aplicador_id, status').in('id', ids).order('nome')
      : { data: [] };
    const { data: pas } = ids.length
      ? await sb.from('paciente_aplicadores').select('paciente_id, aplicador_id').in('paciente_id', ids)
      : { data: [] };
    const porApl = {};
    (pacs || []).forEach(p => { if (p.aplicador_id) (porApl[p.aplicador_id] = porApl[p.aplicador_id] || new Set()).add(p.id); });
    (pas || []).forEach(x => { (porApl[x.aplicador_id] = porApl[x.aplicador_id] || new Set()).add(x.paciente_id); });
    const semApl = (pacs || []).filter(p => !p.aplicador_id && !(pas || []).some(x => x.paciente_id === p.id));
    this._pacNomes = Object.fromEntries((pacs || []).map(p => [p.id, p.nome]));

    alvo.innerHTML = '<h3>Equipe <span class="selo selo-neutro">' + Object.keys(porApl).length + ' aplicador(es) &middot; ' + (pacs || []).length + ' crianca(s)</span></h3>' +
      (Object.keys(porApl).length
        ? Object.entries(porApl).sort((a, b) => b[1].size - a[1].size).map(([id, set]) =>
            '<div class="linha-doc"><div><b>' + escaparHtml(eq.nomes[id] || '?') + '</b>' +
            '<small>' + [...set].map(pid => escaparHtml((this._pacNomes[pid] || '').split(' ').slice(0, 2).join(' '))).join(' &middot; ') + '</small></div>' +
            '<span class="selo selo-roxo">' + set.size + '</span></div>').join('')
        : '<p class="sub">Nenhuma crianca vinculada a esta equipe ainda. O vinculo vem de "Designar profissional" (aplicador da equipe) ou da coordenadora da crianca.</p>') +
      (semApl.length ? '<p class="sub" style="margin-top:8px"><b>Sem aplicador designado:</b> ' + semApl.map(p => escaparHtml(p.nome.split(' ').slice(0, 2).join(' '))).join(', ') + '</p>' : '');
  },

  async desenharAvisos(eq) {
    const alvo = document.getElementById('co-avisos');
    const hoje = new Date().toISOString().slice(0, 10);
    const amanha = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const eu = this._coordId || window.CORTEX_SESSAO.user.id;
    const [rEv, venc, rDem] = await Promise.all([
      sb.from('eventos').select('id, tipo, titulo, data, hora, profissional_id').in('data', [hoje, amanha]).order('data').order('hora'),
      MODULOS.eventos.avaliacoesVencendo ? MODULOS.eventos.avaliacoesVencendo() : [],
      sb.from('demandas').select('id, tipo, titulo, prazo, profissional_id, feita_em').is('feita_em', null)
    ]);
    const evs = (rEv.data || []).filter(e => !e.profissional_id || e.profissional_id === eu || eq.aplicadores.has(e.profissional_id));
    const vencEq = (venc || []).filter(v => eq.pacientes.has(v.paciente_id));
    const dems = (rDem.data || []).filter(d => d.tipo === 'demanda' && (d.profissional_id === eu || eq.aplicadores.has(d.profissional_id)));
    const fmt = d => d.split('-').reverse().join('/');
    const TIPO = { supervisao: 'Supervisao', reuniao_equipe: 'Reuniao de equipe', reuniao_pais: 'Reuniao com pais' };

    alvo.innerHTML = '<h3>Avisos de hoje e amanha</h3>' +
      (evs.length ? evs.map(e => '<div class="linha-doc"><div><b>' + escaparHtml(e.titulo || TIPO[e.tipo] || e.tipo) + '</b><small>' +
        (e.data === hoje ? 'Hoje' : 'Amanha') + (e.hora ? ' as ' + String(e.hora).slice(0, 5) : '') +
        (e.profissional_id ? ' &middot; ' + escaparHtml((eq.nomes[e.profissional_id] || '').split(' ')[0]) : '') + '</small></div>' +
        '<span class="selo selo-info">' + (TIPO[e.tipo] || 'evento') + '</span></div>').join('') : '') +
      (vencEq.length ? '<p class="sub" style="margin-top:8px"><b>Avaliacoes vencendo/vencidas na equipe (' + vencEq.length + '):</b> ' +
        vencEq.slice(0, 8).map(v => escaparHtml((v.nome || '').split(' ').slice(0, 2).join(' ')) + ' (' + String(v.protocolo).toUpperCase() + ')').join(', ') +
        (vencEq.length > 8 ? ' e mais ' + (vencEq.length - 8) : '') + '</p>' : '') +
      (dems.length ? '<p class="sub" style="margin-top:8px"><b>Demandas abertas na equipe:</b> ' + dems.length + '</p>' : '') +
      (!evs.length && !vencEq.length && !dems.length ? '<p class="sub">Nada pendente para hoje.</p>' : '') +
      '<div class="barra-acoes" style="justify-content:flex-start; margin-top:10px">' +
      '<button class="btn btn-chip" onclick="MODULOS.coordenacao.reabrirAvisos()">&#128276; Reabrir avisos da entrada</button>' +
      '<button class="btn btn-chip" onclick="abrirModulo(\'avaliacoes\')">Vencimentos</button>' +
      '<button class="btn btn-chip" onclick="abrirModulo(\'eventos\')">Supervisao</button></div>';
  },

  reabrirAvisos() {
    agendarPop(() => MODULOS.programas?.popupEvolucoesPendentes?.(), 50);
    agendarPop(() => MODULOS.agenda?.popupIndicativos?.(), 100);
    agendarPop(() => MODULOS.eventos?.popupAvisos?.(), 150);
    agendarPop(() => MODULOS.programas?.popupEquipe?.(), 200);
  },

  async desenharPendencias() {
    const alvo = document.getElementById('co-pend');
    const r = await MODULOS.programas.pendenciasEquipe(this._coordId || null);
    alvo.innerHTML = '<h3>Pendencias de sessao ' + (r ? '<span class="selo selo-warn">' + r.total + '</span>' : '<span class="selo selo-ok">em dia</span>') + '</h3>' +
      (r ? r.html : '<p class="sub">Nenhuma sessao dos ultimos 30 dias com evolucao, ficha ou encerramento em falta.</p>');
  },

  async desenharFeito(eq) {
    const alvo = document.getElementById('co-feito');
    alvo.innerHTML = '<p class="sub">Carregando...</p>';
    const ids = [...eq.pacientes];
    if (!ids.length) { alvo.innerHTML = '<p class="sub">Sem criancas na equipe.</p>'; return; }
    const hoje = new Date();
    const fim = hoje.toISOString().slice(0, 10);
    let ini = new Date(hoje);
    if (this._periodo === 'semana') ini.setDate(hoje.getDate() - 6);
    if (this._periodo === 'mes') ini.setDate(hoje.getDate() - 29);
    ini = ini.toISOString().slice(0, 10);

    const { data: sess } = await sb.from('sessoes')
      .select('id, data, hora_inicio, status, paciente_id, aplicador_id')
      .in('paciente_id', ids).gte('data', ini).lte('data', fim)
      .not('status', 'in', '("cancelada")').order('data', { ascending: false }).order('hora_inicio');
    const sids = (sess || []).map(s => s.id);
    if (!sids.length) { alvo.innerHTML = '<p class="sub">Nenhuma sessao no periodo.</p>'; return; }
    const evs = [], regs = [];
    for (let i = 0; i < sids.length; i += 300) {
      const lote = sids.slice(i, i + 300);
      const [rE, rR] = await Promise.all([
        sb.from('evolucoes').select('sessao_id, texto, aplicador:profiles!evolucoes_aplicador_id_fkey(nome)').in('sessao_id', lote),
        sb.from('programa_sessao_registros').select('sessao_id, corretos, tentativas, tentativas_sessao, pct_corretos, paciente_programas(programas(nome))').in('sessao_id', lote)
      ]);
      evs.push(...(rE.data || [])); regs.push(...(rR.data || []));
    }
    const evPor = {}; evs.forEach(e => { (evPor[e.sessao_id] = evPor[e.sessao_id] || []).push(e); });
    const rgPor = {}; regs.forEach(r => { (rgPor[r.sessao_id] = rgPor[r.sessao_id] || []).push(r); });
    const nomePac = this._pacNomes || {};
    const ST = { concluida: ['selo-ok', 'concluida'], falta: ['selo-bad', 'falta'], agendada: ['selo-neutro', 'agendada'], checkin: ['selo-info', 'check-in'], em_atendimento: ['selo-warn', 'em atendimento'] };

    const porDia = {};
    (sess || []).forEach(s => { (porDia[s.data] = porDia[s.data] || []).push(s); });
    const totalProg = regs.length, totalEvo = Object.keys(evPor).length;
    const semEvo = (sess || []).filter(s => s.status === 'concluida' && !evPor[s.id]).length;

    alvo.innerHTML =
      '<div class="grade-visao" style="margin-bottom:10px">' +
      '<div class="caixa-info"><small>Sessoes</small><b>' + sess.length + '</b></div>' +
      '<div class="caixa-info"><small>Programas aplicados</small><b>' + totalProg + '</b></div>' +
      '<div class="caixa-info"><small>Com evolucao</small><b>' + totalEvo + '</b></div>' +
      '<div class="caixa-info"><small>Concluidas sem evolucao</small><b style="color:' + (semEvo ? 'var(--st-bad)' : 'inherit') + '">' + semEvo + '</b></div>' +
      '</div>' +
      Object.entries(porDia).map(([dia, lista]) =>
        '<h4 style="margin:12px 0 6px; font-size:12.5px">' + new Date(dia + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' }) +
        ' <span class="selo selo-neutro">' + lista.length + '</span></h4>' +
        lista.map(s => {
          const st = ST[s.status] || ['selo-neutro', s.status];
          const progs = rgPor[s.id] || [];
          const evl = evPor[s.id] || [];
          return '<div class="cartao" style="padding:10px 12px; margin:6px 0">' +
            '<div style="display:flex; justify-content:space-between; gap:8px; flex-wrap:wrap; align-items:center">' +
            '<div><a href="#" style="font-weight:800" onclick="MODULOS.pacientes.telaDetalhe(\'' + s.paciente_id + '\', \'evolucoes\'); return false;">' + escaparHtml(nomePac[s.paciente_id] || '') + '</a>' +
            '<small class="sub" style="margin-left:8px">' + String(s.hora_inicio || '').slice(0, 5) + ' &middot; ' + escaparHtml((eq.nomes[s.aplicador_id] || '-').split(' ').slice(0, 2).join(' ')) + '</small></div>' +
            '<span class="selo ' + st[0] + '">' + st[1] + '</span></div>' +
            (progs.length
              ? '<div class="pac-selos" style="margin-top:6px">' + progs.map(r => {
                  const n = r.tentativas_sessao || r.tentativas || 0;
                  return '<span class="selo ' + (r.pct_corretos >= 80 ? 'selo-ok' : r.pct_corretos >= 50 ? 'selo-warn' : 'selo-bad') + '" title="corretos/tentativas">' +
                    escaparHtml(r.paciente_programas?.programas?.nome || 'programa') + ' ' + r.corretos + '/' + n + ' (' + r.pct_corretos + '%)</span>';
                }).join('') + '</div>'
              : (s.status === 'concluida' ? '<p class="sub" style="margin-top:4px">Sem ficha de programas.</p>' : '')) +
            (evl.length
              ? evl.map(e => '<p style="margin-top:6px; font-size:12.5px; line-height:1.5"><b>Evolucao</b>' +
                  (e.aplicador ? ' <small class="sub">(' + escaparHtml(e.aplicador.nome.split(' ')[0]) + ')</small>' : '') + ': ' +
                  this.resumo(e.texto) + '</p>').join('')
              : (s.status === 'concluida' ? '<p class="sub" style="margin-top:4px; color:var(--st-bad)">Sem evolucao.</p>' : '')) +
            '</div>';
        }).join('')
      ).join('');
  },

  resumo(texto) {
    const t = String(texto || '');
    if (t.length <= 260) return escaparHtml(t);
    const id = 'ev' + Math.random().toString(36).slice(2, 8);
    return '<span id="' + id + '-c">' + escaparHtml(t.slice(0, 260)) + '&hellip; <a href="#" onclick="document.getElementById(\'' + id + '-c\').style.display=\'none\'; document.getElementById(\'' + id + '-t\').style.display=\'inline\'; return false;">ver tudo</a></span>' +
      '<span id="' + id + '-t" style="display:none">' + escaparHtml(t) + '</span>';
  }
};
