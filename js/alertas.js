// ============================================================================
// CORTEX aba - js/alertas.js  (patch 65)
// Som e notificacao do navegador quando chega mensagem do chat, notificacao do
// sistema (tabela notificacoes) ou demanda/parabens para a pessoa.
// - Som: feito na hora pelo navegador (WebAudio), sem arquivo. O navegador so
//   deixa tocar depois do primeiro clique/toque na pagina.
// - Com a tela do sistema na frente: cartao no canto de baixo (opcao A do Wess) + som.
// - Com outra aba ou outro programa na frente: notificacao do navegador + som.
// - App instalado no celular: quem avisa com o app fechado e o push (pwa.js);
//   aqui so som e o cartao, para nao chegar em dobro.
// Preferencias por aparelho em localStorage 'cortex_alertas'.
// ============================================================================

window.ALERTAS = {

  CHAVE: 'cortex_alertas',
  PADRAO: { som: true, somAvisos: true, tipo: 'duplo', notif: true },   // som de fabrica: toque duplo (escolha do Wess)
  _ctx: null,
  _vistos: null,             // ids de notificacoes/demandas ja conhecidos (nao avisa o que ja existia ao entrar)

  ICO: {
    som: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>',
    mudo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4z"/><line x1="22" y1="9" x2="16" y2="15"/><line x1="16" y1="9" x2="22" y2="15"/></svg>',
    msg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.5 8.5 0 0 1-12.4 7.5L3 21l2-5.6A8.5 8.5 0 1 1 21 11.5z"/></svg>',
    sino: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>'
  },

  // ─────────────── preferencias ───────────────
  cfg() { try { return Object.assign({}, this.PADRAO, JSON.parse(localStorage.getItem(this.CHAVE) || '{}')); } catch (e) { return Object.assign({}, this.PADRAO); } },
  salvar(parcial) { const c = Object.assign(this.cfg(), parcial); try { localStorage.setItem(this.CHAVE, JSON.stringify(c)); } catch (e) { /* sem memoria */ } return c; },
  temApi() { return 'Notification' in window; },
  permissao() { return this.temApi() ? Notification.permission : 'indisponivel'; },
  instalado() { return !!(window.PWA && PWA.instalado && PWA.instalado()); },
  focado() { return document.visibilityState === 'visible' && (typeof document.hasFocus !== 'function' || document.hasFocus()); },
  ativo() { return !!window.CORTEX_SESSAO && !window.CORTEX_VER_USUARIO && window.CORTEX_SESSAO.profile.perfil !== 'familia'; },

  // ─────────────── som ───────────────
  destravar() {
    try {
      if (!this._ctx) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return; this._ctx = new C(); }
      if (this._ctx.state === 'suspended') this._ctx.resume();
    } catch (e) { /* sem audio */ }
  },
  // [frequencia inicial, frequencia final, inicio (s), duracao (s), forma]
  SONS: {
    sino: { nome: 'Sino', mensagem: [[880, 880, 0, .55, 'sine'], [1320, 1320, .12, .7, 'sine']], aviso: [[660, 660, 0, .55, 'sine'], [990, 990, .14, .7, 'sine']] },
    gota: { nome: 'Gota', mensagem: [[1250, 620, 0, .22, 'sine']], aviso: [[900, 450, 0, .26, 'sine'], [900, 450, .2, .26, 'sine']] },
    duplo: { nome: 'Toque duplo', mensagem: [[1040, 1040, 0, .1, 'triangle'], [1040, 1040, .16, .12, 'triangle']], aviso: [[760, 760, 0, .12, 'triangle'], [760, 760, .18, .14, 'triangle']] }
  },
  tocar(tipo, qual) {
    const c = this.cfg();
    this.destravar();
    const ctx = this._ctx; if (!ctx || ctx.state !== 'running') return false;
    const som = this.SONS[qual || c.tipo] || this.SONS.sino;
    const notas = som[tipo === 'aviso' ? 'aviso' : 'mensagem'];
    const t0 = ctx.currentTime + .02;
    notas.forEach(([f1, f2, ini, dur, forma]) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = forma; o.frequency.setValueAtTime(f1, t0 + ini);
      if (f2 !== f1) o.frequency.exponentialRampToValueAtTime(f2, t0 + ini + dur * .8);
      g.gain.setValueAtTime(.0001, t0 + ini);
      g.gain.exponentialRampToValueAtTime(.22, t0 + ini + .015);
      g.gain.exponentialRampToValueAtTime(.0001, t0 + ini + dur);
      o.connect(g); g.connect(ctx.destination);
      o.start(t0 + ini); o.stop(t0 + ini + dur + .05);
    });
    return true;
  },

  // ─────────────── avisar (som + cartao ou notificacao) ───────────────
  // { tipo: 'mensagem'|'aviso', titulo, corpo, tag, abrir: function, url, iniciais }
  avisar(a) {
    if (!this.ativo()) return;
    const c = this.cfg();
    if (a.tipo === 'aviso' ? c.somAvisos : c.som) this.tocar(a.tipo);
    if (this.focado()) { this.cartao(a); return; }
    if (!c.notif || this.permissao() !== 'granted' || this.instalado()) { this.cartao(a); return; }
    this.notificar(a);
  },
  async notificar(a) {
    const op = { body: String(a.corpo || '').slice(0, 180), tag: a.tag || 'cortex', renotify: true, icon: 'icones/icone-192.png', badge: 'icones/icone-192.png', data: { url: a.url || './app.html' } };
    try {
      const n = new Notification(a.titulo || 'CORTEX aba', op);
      n.onclick = () => { try { window.focus(); } catch (e) {} n.close(); if (typeof a.abrir === 'function') a.abrir(); };
      return;
    } catch (e) { /* celular: so pelo service worker */ }
    try {
      const reg = (window.PWA && PWA.reg) || (navigator.serviceWorker && await navigator.serviceWorker.getRegistration());
      if (reg) await reg.showNotification(a.titulo || 'CORTEX aba', op);
    } catch (e) { this.cartao(a); }
  },

  // aviso dentro do sistema: cartao no canto de baixo, acima do sino (ate 3 empilhados)
  cartao(a) {
    let pilha = document.getElementById('alertas-pilha');
    if (!pilha) { pilha = document.createElement('div'); pilha.id = 'alertas-pilha'; pilha.className = 'alertas-pilha'; document.body.appendChild(pilha); }
    // mesma conversa/aviso: troca o cartao em vez de empilhar
    const igual = a.tag && pilha.querySelector('[data-tag="' + CSS.escape(a.tag) + '"]');
    if (igual) igual.remove();
    const el = document.createElement('div');
    el.className = 'alerta-cartao ' + (a.tipo === 'aviso' ? 'aviso' : 'mensagem');
    if (a.tag) el.dataset.tag = a.tag;
    el.setAttribute('role', 'status');
    el.innerHTML = '<span class="alerta-ic">' + (a.iniciais ? '<b>' + escaparHtml(a.iniciais) + '</b>' : (a.tipo === 'aviso' ? this.ICO.sino : this.ICO.msg)) + '</span>' +
      '<span class="alerta-txt"><b>' + escaparHtml(a.titulo || '') + '</b><small>' + escaparHtml(String(a.corpo || '').slice(0, 140)) + '</small></span>' +
      '<button type="button" class="alerta-x" title="Fechar">' + this.ICO.x + '</button>';
    const fechar = () => { el.classList.add('saindo'); setTimeout(() => el.remove(), 220); };
    el.addEventListener('click', ev => {
      if (ev.target.closest('.alerta-x')) { fechar(); return; }
      fechar(); if (typeof a.abrir === 'function') a.abrir();
    });
    pilha.appendChild(el);
    while (pilha.children.length > 3) pilha.firstChild.remove();
    let t = setTimeout(fechar, 7000);
    el.addEventListener('mouseenter', () => clearTimeout(t));
    el.addEventListener('mouseleave', () => { t = setTimeout(fechar, 3000); });
  },

  // ─────────────── permissao e configuracao ───────────────
  async ativar() {
    this.destravar();
    this.salvar({ som: true, somAvisos: true, notif: true, perguntado: true });
    document.getElementById('alertas-pedir')?.remove();
    if (this.temApi() && Notification.permission === 'default') {
      try { await Notification.requestPermission(); } catch (e) { /* navegador antigo */ }
    }
    this.tocar('mensagem');
    const ok = this.permissao() === 'granted';
    this.cartao({ tipo: 'aviso', titulo: ok ? 'Som e notificacoes ativados' : 'Som ativado', corpo: ok ? 'Neste aparelho voce sera avisado quando chegar mensagem ou aviso.' : (this.permissao() === 'denied' ? 'As notificacoes estao bloqueadas no navegador. Veja como liberar em Som e notificacoes, no sino.' : 'Este navegador nao mostra notificacoes; o som e o aviso na tela continuam.') });
    if (document.getElementById('alertas-config')) this.desenharConfig();
  },
  dispensar() { this.salvar({ perguntado: true }); document.getElementById('alertas-pedir')?.remove(); },
  // pergunta uma vez por aparelho, depois do login
  pedir() {
    const c = this.cfg();
    if (c.perguntado || document.getElementById('alertas-pedir')) return;
    if (this.temApi() && Notification.permission === 'granted') { this.salvar({ perguntado: true }); return; }
    const el = document.createElement('div');
    el.id = 'alertas-pedir'; el.className = 'alertas-pedir';
    el.innerHTML = '<span class="alerta-ic">' + this.ICO.sino + '</span>' +
      '<div class="alertas-pedir-t"><b>Quer ser avisado na hora?</b><small>Som e notificacao quando chegar mensagem no chat, demanda ou aviso do sistema.</small>' +
      '<div class="alertas-pedir-b"><button type="button" class="btn btn-primario" onclick="ALERTAS.ativar()">Ativar</button>' +
      '<button type="button" class="btn btn-fantasma" onclick="ALERTAS.dispensar()">Agora nao</button></div></div>';
    document.body.appendChild(el);
  },
  abrirConfig() {
    if (typeof abrirModal !== 'function') return;
    abrirModal('Som e notificacoes', '<div id="alertas-config"></div>');
    this.desenharConfig();
  },
  desenharConfig() {
    const el = document.getElementById('alertas-config'); if (!el) return;
    const c = this.cfg(), p = this.permissao();
    const chave = (k, rot, sub) => '<label class="alertas-linha"><span><b>' + rot + '</b><small>' + sub + '</small></span>' +
      '<input type="checkbox" class="alertas-chave"' + (c[k] ? ' checked' : '') + ' onchange="ALERTAS.salvar({ ' + k + ': this.checked }); ALERTAS.desenharConfig()"></label>';
    const status = p === 'granted' ? '<span class="selo selo-ok">Ativadas neste aparelho</span>'
      : p === 'denied' ? '<span class="selo selo-bad">Bloqueadas no navegador</span>'
      : p === 'indisponivel' ? '<span class="selo selo-neutro">Este navegador nao tem</span>'
      : '<button type="button" class="btn btn-primario" onclick="ALERTAS.ativar()">Ativar notificacoes</button>';
    el.innerHTML =
      chave('som', 'Som quando chegar mensagem', 'Mensagens do chat (inclusive comunicados)') +
      chave('somAvisos', 'Som dos avisos', 'Demandas, parabens e notificacoes do sistema') +
      '<div class="alertas-linha col"><b>Qual som</b><div class="alertas-sons">' +
      Object.keys(this.SONS).map(k => '<button type="button" class="alertas-som' + (c.tipo === k ? ' ativo' : '') + '" onclick="ALERTAS.salvar({ tipo: \'' + k + '\' }); ALERTAS.tocar(\'mensagem\', \'' + k + '\'); ALERTAS.desenharConfig()">' + this.ICO.som + ' ' + this.SONS[k].nome + '</button>').join('') +
      '</div><small class="sub">Toque num som para ouvir e escolher.</small></div>' +
      '<div class="alertas-linha col"><b>Notificacoes do navegador</b><small>Aparecem quando o sistema esta em outra aba ou minimizado.</small><div style="margin-top:6px">' + status + '</div>' +
      (p === 'denied' ? '<small class="sub" style="margin-top:6px">Para liberar: clique no cadeado ao lado do endereco do site &rsaquo; Notificacoes &rsaquo; Permitir. Depois recarregue a pagina.</small>' : '') +
      (p === 'granted' ? chave('notif', 'Mostrar notificacoes', 'Desligue para ficar so com o som') : '') + '</div>' +
      (this.instalado() ? '<p class="sub" style="margin-top:6px">App instalado: com o app fechado, os avisos chegam pelo celular (push).</p>' : '') +
      '<div class="barra-acoes"><button type="button" class="btn btn-fantasma" onclick="ALERTAS.testar()">Testar</button><button type="button" class="btn btn-primario" onclick="fecharModal()">Pronto</button></div>';
  },
  testar() {
    this.destravar();
    this.tocar('mensagem');
    const a = { tipo: 'mensagem', titulo: 'Teste do CORTEX', corpo: 'Assim chega o aviso de uma mensagem nova.', tag: 'teste' };
    if (this.permissao() === 'granted' && this.cfg().notif && !this.instalado()) this.notificar(a);
    this.cartao(a);
  },

  // ─────────────── notificacoes do sistema e demandas ───────────────
  async vigiar() {
    if (!this.ativo() || this._vigiando) return;
    this._vigiando = true;
    try {
      const sess = window.CORTEX_SESSAO, eu = sess.user.id, perfil = sess.profile.perfil;
      const [rN, rD] = await Promise.all([
        sb.from('notificacoes').select('id, titulo, corpo, criado_em').or('destinatario_perfil.eq.' + perfil + ',destinatario_id.eq.' + eu)
          .eq('lida', false).order('criado_em', { ascending: false }).limit(20),
        sb.from('demandas').select('id, tipo, titulo, detalhe, criador:profiles!demandas_criado_por_fkey(nome)').eq('profissional_id', eu).is('feita_em', null).order('criado_em', { ascending: false }).limit(20)
      ]);
      const novos = [];
      (rN.data || []).forEach(n => {
        if (/^(Chat: |Grupo |Comunicado de )/.test(n.titulo || '')) return;   // mensagens do chat: quem avisa e o proprio chat
        novos.push({ k: 'n' + n.id, a: { tipo: 'aviso', titulo: n.titulo || 'Aviso do sistema', corpo: n.corpo || '', tag: 'notif-' + n.id } });
      });
      (rD.data || []).forEach(d => {
        const de = d.criador && d.criador.nome ? ' - de ' + d.criador.nome.split(' ')[0] : '';
        novos.push({ k: 'd' + d.id, a: { tipo: 'aviso', titulo: d.tipo === 'parabens' ? 'Parabens!' : 'Nova demanda', corpo: d.titulo + (d.detalhe ? ' - ' + d.detalhe : '') + de, tag: 'dem-' + d.id } });
      });
      if (!this._vistos) { this._vistos = new Set(novos.map(x => x.k)); return; }   // o que ja existia ao entrar nao toca
      const chegaram = novos.filter(x => !this._vistos.has(x.k));
      chegaram.forEach(x => this._vistos.add(x.k));
      if (!chegaram.length) return;
      const abrir = () => { if (window.MODULOS && MODULOS.avisos) { MODULOS.avisos.carregar(); MODULOS.avisos.abrir(); } };
      if (chegaram.length === 1) this.avisar(Object.assign(chegaram[0].a, { abrir }));
      else this.avisar({ tipo: 'aviso', titulo: chegaram.length + ' avisos novos', corpo: chegaram.map(x => x.a.titulo).slice(0, 3).join(' - '), tag: 'avisos', abrir });
      if (window.MODULOS && MODULOS.avisos) MODULOS.avisos.carregar();
    } catch (e) { /* sem rede: tenta de novo na proxima */ }
    finally { this._vigiando = false; }
  },

  iniciar() {
    if (!this.ativo() || this._iniciado) return;
    this._iniciado = true;
    // o navegador so deixa tocar som depois de um clique ou toque
    const liberar = () => { this.destravar(); };
    ['pointerdown', 'keydown', 'touchstart'].forEach(t => document.addEventListener(t, liberar, { passive: true }));
    this.vigiar();
    // a cada minuto (inclusive com a aba em segundo plano) e na hora, quando o banco avisa
    clearInterval(this._timer);
    this._timer = setInterval(() => this.vigiar(), 60000);
    try {
      this._canal = sb.channel('alertas-' + window.CORTEX_SESSAO.user.id)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notificacoes' }, () => setTimeout(() => this.vigiar(), 400))
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'demandas' }, () => setTimeout(() => this.vigiar(), 400))
        .subscribe();
    } catch (e) { /* sem tempo real: o minuto resolve */ }
    setTimeout(() => this.pedir(), 2500);
  }
};
