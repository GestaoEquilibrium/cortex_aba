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
      '<div class="kpis" id="kpis-inicio"></div>' +
      '<div class="cartao faixa-ambar" id="inicio-notifs"><h3>Notificacoes</h3><p class="sub">Carregando...</p></div>' +
      '<div id="inicio-vencimentos"></div>' +
      '<div class="cartao">' +
      '  <div class="vazio">' +
      '    <div class="simbolo-vazio">&#10022;</div>' +
      '    <strong>Atalhos do dia chegam em breve</strong>' +
      '    Conforme os modulos forem ativados, sessoes do dia e pendencias aparecem aqui.' +
      '  </div>' +
      '</div>';

    this.carregarKpis();
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
  }
};
