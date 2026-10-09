// ============================================================================
// CORTEX aba - js/modulos/inicio.js
// ============================================================================

window.MODULOS = window.MODULOS || {};

window.MODULOS.inicio = {
  // Patch 31 — Inicio "Agora na clinica": faixa navy com os numeros do dia, trilho das sessoes em
  // volta de agora, Minhas pendencias (mesma lista da Central de avisos) e Equipe hoje.
  async render(el, sessao) {
    const nome = sessao.profile.nome.split(' ')[0];
    const hora = new Date().getHours();
    const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
    const hoje = new Date().toLocaleDateString('pt-BR',
      { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
    const gestao = ['direcao', 'coordenador', 'suporte'].includes(sessao.profile.perfil);

    el.innerHTML =
      '<section class="ini-heroi"><div>' +
      '  <h1>' + saudacao + ', ' + escaparHtml(nome) + '</h1>' +
      '  <div class="sub" id="ini-heroi-sub">' + hoje.charAt(0).toUpperCase() + hoje.slice(1) + '</div></div>' +
      '  <div class="ini-nums" id="ini-nums"></div>' +
      '</section>' +
      '<div id="ini-agora"></div>' +
      '<div class="ini-grid">' +
      '  <div class="cartao" id="ini-pendencias"><h3>Minhas pendencias</h3><p class="sub">Carregando...</p></div>' +
      '  <div class="cartao" id="ini-equipe"><h3>' + (gestao ? 'Equipe hoje' : 'Minhas sessoes hoje') + '</h3><p class="sub">Carregando...</p></div>' +
      '</div>' +
      (perm('painel') === '' ? '' : '<div id="inicio-painel" style="margin-top:14px"></div>') +
      '<div id="inicio-vencimentos"></div>';

    this.carregarDia(sessao, gestao);
    this.carregarPendenciasCentral();
    if (perm('painel') !== '') MODULOS.painel.carregar('inicio-painel');
    this.carregarVencimentos();
  },

  // Sessoes de hoje (mesmo recorte da agenda: aplicador ve as dele; coordenadora, a equipe)
  async carregarDia(sessao, gestao) {
    const hoje = hojeLocal();
    let { data: sessoes } = await sb.from('sessoes')
      .select('id, hora_inicio, duracao_min, status, aplicador_id, paciente_id, pacientes(nome), profissional:profiles!sessoes_aplicador_id_fkey(nome), salas(nome)')
      .eq('data', hoje).order('hora_inicio');
    if (MODULOS.agenda && MODULOS.agenda.soMinhas) sessoes = await MODULOS.agenda.soMinhas(sessoes || []);
    const lista = (sessoes || []).filter(s => s.status !== 'cancelada');
    const n = st => lista.filter(s => s.status === st).length;

    const nums = document.getElementById('ini-nums');
    if (nums) nums.innerHTML = [[lista.length, 'Sessoes hoje'], [n('em_atendimento'), 'Em atendimento'], [n('checkin'), 'Chegaram'], [n('concluida'), 'Concluidas'], [n('falta'), 'Faltas']]
      .map(x => '<div><b>' + x[0] + '</b><small>' + x[1] + '</small></div>').join('');
    const sub = document.getElementById('ini-heroi-sub');
    if (sub && lista.length) {
      const apls = new Set(lista.map(s => s.aplicador_id).filter(Boolean));
      sub.innerHTML += ' &middot; ' + lista.length + ' sessao(oes)' + (gestao ? ' &middot; ' + apls.size + ' aplicador(es)' : '');
    }

    // trilho "Agora na clinica": a sessao em curso (ou a proxima) no centro, 2 antes e 3 depois
    const agoraEl = document.getElementById('ini-agora');
    if (agoraEl) {
      const d = new Date(); const hhmm = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
      let idx = lista.findIndex(s => s.status === 'em_atendimento');
      if (idx < 0) idx = lista.findIndex(s => String(s.hora_inicio).slice(0, 5) >= hhmm);
      if (idx < 0) idx = lista.length - 1;
      const ini = Math.max(0, Math.min(idx - 2, lista.length - 6));
      const trilho = lista.slice(ini, ini + 6);
      const COR = { agendada: 'var(--st-neutro)', checkin: '#2563EB', em_atendimento: '#D97706', concluida: 'var(--st-ok)', falta: 'var(--st-bad)' };
      agoraEl.innerHTML = lista.length
        ? '<h3 class="ini-sec">Agora na clinica <span class="sub">&middot; ' + hhmm + '</span>' +
          '<button class="btn-chip" style="margin-left:auto" onclick="abrirModulo(\'agenda\')">Abrir agenda</button></h3>' +
          '<div class="ini-trilho">' + trilho.map((s, i) => '<div class="ini-ag-card' + (ini + i === idx ? ' atual' : '') + '" onclick="abrirModulo(\'agenda\'); setTimeout(function(){ MODULOS.agenda.abrirSessao(\'' + s.id + '\'); }, 500)">' +
            '<span class="st" style="background:' + (COR[s.status] || COR.agendada) + '"></span><b>' + escaparHtml((s.pacientes ? s.pacientes.nome : '?').split(' ').slice(0, 2).join(' ')) + '</b>' +
            '<small>' + String(s.hora_inicio).slice(0, 5) + ' &middot; ' + escaparHtml(s.profissional ? s.profissional.nome.split(' ')[0] : '-') + (s.salas ? ' &middot; ' + escaparHtml(s.salas.nome) : '') + '</small></div>').join('') + '</div>'
        : '';
    }

    // Equipe hoje (gestao): concluidas / agendadas por aplicadora. Aplicador: lista das proprias sessoes
    const eq = document.getElementById('ini-equipe');
    if (!eq) return;
    if (gestao) {
      const por = {};
      lista.forEach(s => { const k = s.aplicador_id || 'sem'; const o = por[k] = por[k] || { nome: s.profissional ? s.profissional.nome : 'Sem aplicador', total: 0, feitas: 0, atend: 0 }; o.total++; if (['concluida', 'falta'].includes(s.status)) o.feitas++; if (s.status === 'em_atendimento') o.atend++; });
      const linhas = Object.values(por).sort((a, b) => a.nome.localeCompare(b.nome));
      eq.innerHTML = '<h3>Equipe hoje <span class="sub" style="font-weight:500">&middot; encerradas / agendadas</span></h3>' +
        (linhas.length ? linhas.map(a => '<div class="ini-lin"><span class="evo-av ' + (typeof corAvatar === 'function' ? corAvatar(a.nome) : 'av-1') + '">' + escaparHtml(a.nome.split(' ').slice(0, 2).map(x => x[0]).join('').toUpperCase()) + '</span>' +
          '<span class="ini-lin-n">' + escaparHtml(a.nome.split(' ').slice(0, 2).join(' ')) + (a.atend ? ' <span class="selo selo-warn">em atendimento</span>' : '') + '</span>' +
          '<span class="ini-barra"><i style="width:' + Math.round(a.feitas / a.total * 100) + '%"></i></span><small>' + a.feitas + '/' + a.total + '</small></div>').join('')
          : '<p class="sub">Nenhuma sessao hoje.</p>');
    } else {
      eq.innerHTML = '<h3>Minhas sessoes hoje</h3>' + (lista.length ? lista.map(s =>
        '<div class="ini-lin clicavel" onclick="abrirModulo(\'agenda\'); setTimeout(function(){ MODULOS.agenda.abrirSessao(\'' + s.id + '\'); }, 500)"><b class="ini-lin-h">' + String(s.hora_inicio).slice(0, 5) + '</b>' +
        '<span class="ini-lin-n">' + escaparHtml(s.pacientes ? s.pacientes.nome : '?') + (s.salas ? '<small class="sub"> &middot; ' + escaparHtml(s.salas.nome) + '</small>' : '') + '</span>' +
        (MODULOS.agenda ? MODULOS.agenda.selosSessao(s) : '') + '</div>').join('') : '<p class="sub">Nenhuma sessao hoje.</p>');
    }
  },

  // Minhas pendencias: as 5 primeiras linhas da Central de avisos, com o mesmo botao de acao
  async carregarPendenciasCentral() {
    const alvo = document.getElementById('ini-pendencias');
    if (!alvo || !MODULOS.avisos) return;
    if (!MODULOS.avisos.itens.length && !MODULOS.avisos._carregando) await MODULOS.avisos.carregar();
    else if (MODULOS.avisos._carregando) { await new Promise(r => setTimeout(r, 1500)); }
    const itens = MODULOS.avisos.itens.filter(i => i.grupo !== 'Notificacoes do sistema');
    const notifs = MODULOS.avisos.itens.length - itens.length;
    alvo.innerHTML = '<h3>Minhas pendencias ' + (itens.length ? '<span class="selo selo-neutro">' + itens.length + '</span>' : '') +
      // patch 43: + Nova ATA tambem no Inicio
      (MODULOS.eventos && MODULOS.eventos.podeLavrar && MODULOS.eventos.podeLavrar() ? '<button class="btn-chip" style="margin-left:auto" onclick="MODULOS.eventos.novaAta()">+ Nova ATA</button>' : '') +
      '<button class="btn-chip"' + (MODULOS.eventos && MODULOS.eventos.podeLavrar && MODULOS.eventos.podeLavrar() ? '' : ' style="margin-left:auto"') + ' onclick="MODULOS.avisos.abrir()">Ver tudo' + (notifs ? ' &middot; ' + notifs + ' notificacao(oes)' : '') + '</button></h3>' +
      (itens.length ? itens.slice(0, 5).map(i => '<div class="av-item ini-av"><span class="ic ic-' + i.cor + '">' + (ICONES[i.icone] || ICONES.inicio) + '</span>' +
        '<span class="tx"><b>' + escaparHtml(i.titulo) + '</b><small>' + escaparHtml(i.sub || '') + '</small></span>' +
        '<button type="button" class="btn-chip" onclick="MODULOS.avisos.acao(this)" data-acao="' + escaparHtml(i.acao).replace(/"/g, '&quot;') + '">' + escaparHtml(i.botao || 'Abrir') + '</button></div>').join('') +
        (itens.length > 5 ? '<p class="sub" style="margin-top:6px">+ ' + (itens.length - 5) + ' na central de avisos.</p>' : '')
        : '<div class="avisos-vazio" style="padding:18px 10px"><div style="font-size:26px">&#10004;</div><b>Tudo em dia</b></div>');
  },

  async carregarVencimentos() {
    const alvo = document.getElementById('inicio-vencimentos');
    if (!alvo || perm('plano') === '') { if (alvo) alvo.remove(); return; }
    try {
      const html = await MODULOS.plano.htmlVencimentos();
      if (html) alvo.outerHTML = html;
      else alvo.remove();
    } catch (e) { alvo.remove(); }
  },

  async carregarNotificacoes(sessao) {
    const alvo = document.getElementById('inicio-notifs');
    if (!alvo) return;
    const { data } = await sb.from('notificacoes')
      .select('*')
      .or('destinatario_perfil.eq.' + sessao.profile.perfil + ',destinatario_id.eq.' + sessao.user.id)
      .eq('lida', false)
      .order('criado_em', { ascending: false })
      .limit(10);

    if (!data || data.length === 0) {
      alvo.innerHTML = '<h3>Notificacoes</h3><p class="sub">Nenhuma notificacao pendente.</p>';
      return;
    }
    alvo.innerHTML = '<h3>Notificacoes</h3>' + data.map(n =>
      '<div class="linha-doc"><div><b>' + escaparHtml(n.titulo) + '</b>' +
      '<small>' + escaparHtml(n.corpo || '') + ' &middot; ' +
      new Date(n.criado_em).toLocaleDateString('pt-BR') + '</small></div>' +
      '<button class="btn btn-fantasma" onclick="MODULOS.inicio.marcarLida(\'' + n.id + '\')">Ok</button>' +
      '</div>').join('');
  },

  async marcarLida(id) {
    await sb.from('notificacoes').update({ lida: true }).eq('id', id);
    this.carregarNotificacoes(window.CORTEX_SESSAO);
  },

  async carregarKpis() {
    const alvo = document.getElementById('kpis-inicio');
    if (!alvo) return;

    const { count, error } = await sb
      .from('pacientes')
      .select('id', { count: 'exact', head: true });

    if (error) { alvo.innerHTML = ''; return; }

    const { count: triagem } = await sb
      .from('pacientes')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'triagem');

    alvo.innerHTML =
      this.kpi(count || 0, 'Pacientes cadastrados', 'azul') +
      this.kpi(triagem || 0, 'Em triagem', (triagem || 0) > 0 ? 'ambar' : 'verde');
  },

  kpi(valor, rotulo, cor) {
    return '<div class="kpi kpi-' + cor + '">' +
      '<div class="kpi-valor">' + valor + '</div>' +
      '<div class="kpi-rotulo">' + rotulo + '</div></div>';
  },

  htmlAcoes() {
    const perfil = window.CORTEX_SESSAO.profile.perfil;
    const a = [];
    if (perm('agenda') !== '') a.push(['agenda', '&#128197;', 'Agenda de hoje', 'azul']);
    if (perm('checkin') !== '') a.push(['checkin', '&#9989;', 'Lista de presenca', 'verde']);
    if (perm('pacientes') !== '') a.push(['pacientes', '&#129505;', 'Pacientes', 'rosa']);
    if (perm('avaliacoes') !== '' || perm('evolucao') === 'E') a.push(['avaliacoes', '&#9998;', 'Avaliacoes', 'roxo']);
    if (perm('eventos') !== '') a.push(['eventos', '&#128204;', 'Supervisao', 'teal']);
    if (perfil === 'direcao') a.push(['gerencial', '&#128202;', 'Relatorios', 'amarelo']);
    return '<div class="ini-acoes">' + a.map(x =>
      '<button class="ini-acao ia-' + x[3] + '" onclick="abrirModulo(\'' + x[0] + '\')">' +
      '<span>' + x[1] + '</span>' + x[2] + '</button>').join('') + '</div>';
  },

  async carregarPendencias() {
    const alvo = document.getElementById('ini-pend');
    if (!alvo) return;
    const eu = window.CORTEX_SESSAO.user.id;
    const perfil = window.CORTEX_SESSAO.profile.perfil;
    const hoje = hojeLocal();
    const cartoes = [];

    // Minhas sessoes sem evolucao
    try {
      const { data: ss } = await sb.from('sessoes').select('id, data, status')
        .eq('aplicador_id', eu).lte('data', hoje).gte('data', window.CORTEX_EVO_DESDE || '2000-01-01')
        .neq('status', 'cancelada').limit(60);
      const passadas = (ss || []).filter(s => s.status === 'concluida' || s.status === 'falta' || s.data < hoje);
      if (passadas.length) {
        const { data: evs } = await sb.from('evolucoes').select('sessao_id')
          .in('sessao_id', passadas.map(s => s.id));
        const com = new Set((evs || []).map(e => e.sessao_id));
        const n = passadas.filter(s => !com.has(s.id)).length;
        if (n) cartoes.push(['rosa', '&#9998;', n, 'sessao(oes) sem evolucao',
          "MODULOS.programas.popupEvolucoesPendentes()"]);
      }
    } catch (e) {}

    if (['direcao', 'coordenador'].includes(perfil)) {
      try {
        const venc = await MODULOS.eventos.avaliacoesVencendo();
        if (venc.length) cartoes.push(['amarelo', '&#9200;', venc.length,
          'avaliacao(oes) vencendo', "abrirModulo('avaliacoes')"]);
      } catch (e) {}
      try {
        const { count } = await sb.from('portal_mensagens')
          .select('id', { count: 'exact', head: true })
          .eq('origem', 'familia').eq('lida_clinica', false);
        if (count) cartoes.push(['teal', '&#128172;', count,
          'mensagem(ns) da familia', "abrirModulo('pacientes')"]);
      } catch (e) {}
    }
    try {
      const amanha = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
      const { data: evs } = await sb.from('eventos').select('id, profissional_id')
        .in('data', [hoje, amanha]);
      const meus = (evs || []).filter(e => !e.profissional_id || e.profissional_id === eu).length;
      if (meus) cartoes.push(['azul', '&#128204;', meus,
        'supervisao(oes)/reuniao(oes)', "MODULOS.eventos.popupAvisos()"]);
    } catch (e) {}

    alvo.innerHTML = cartoes.map(c =>
      '<div class="ini-card ic-' + c[0] + '" onclick="' + c[4] + '">' +
      '<span class="ic-icone">' + c[1] + '</span>' +
      '<b>' + c[2] + '</b><small>' + c[3] + '</small></div>').join('');
  }
};
