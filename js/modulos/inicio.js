// ============================================================================
// CORTEX aba - js/modulos/inicio.js
// ============================================================================

window.MODULOS = window.MODULOS || {};

window.MODULOS.inicio = {
  async render(el, sessao) {
    const nome = sessao.profile.nome.split(' ')[0];
    const hora = new Date().getHours();
    const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
    const hoje = new Date().toLocaleDateString('pt-BR',
      { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

    el.innerHTML =
      '<section class="heroi">' +
      '  <div>' +
      '    <h1>' + saudacao + ', ' + escaparHtml(nome) + '!</h1>' +
      '    <div class="sub">' + hoje.charAt(0).toUpperCase() + hoje.slice(1) + '</div>' +
      '  </div>' +
      '</section>' +
      (perm('painel') === '' ? '<div class="kpis" id="kpis-inicio"></div>' : '<div id="inicio-painel"></div>') +
      '<div class="cartao faixa-ambar" id="inicio-notifs"><h3>Notificacoes</h3><p class="sub">Carregando...</p></div>' +
      '<div id="inicio-vencimentos"></div>' +
      '';

    // Acoes rapidas coloridas + pendencias vivas entram entre o heroi e o painel
    const painelDiv = document.getElementById('inicio-painel') || document.getElementById('kpis-inicio');
    if (painelDiv) {
      const barra = document.createElement('div');
      barra.innerHTML = this.htmlAcoes() + '<div class="ini-pend" id="ini-pend"></div>';
      painelDiv.parentNode.insertBefore(barra, painelDiv);
      this.carregarPendencias();
    }

    if (perm('painel') === '') this.carregarKpis();
    else MODULOS.painel.carregar('inicio-painel');
    this.carregarNotificacoes(sessao);
    this.carregarVencimentos();
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
    const hoje = new Date().toISOString().slice(0, 10);
    const cartoes = [];

    // Minhas sessoes sem evolucao
    try {
      const { data: ss } = await sb.from('sessoes').select('id, data, status')
        .eq('aplicador_id', eu).lte('data', hoje)
        .not('status', 'in', '("falta","cancelada")').limit(60);
      const passadas = (ss || []).filter(s => s.status === 'concluida' || s.data < hoje);
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
