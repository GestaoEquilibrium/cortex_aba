// ============================================================================
// CORTEX aba - js/pwa.js : instalacao na tela inicial + notificacoes
// - Detecta Android/iPhone e se ja esta instalado (display-mode: standalone)
// - Android/Chrome: usa o prompt nativo (beforeinstallprompt); iPhone: passo a passo do Safari
// - Instalado: pede permissao de notificacao uma vez e guarda a assinatura em push_assinaturas
// Icones: os mesmos do sistema (ICONES em app.js); nada de emoji.
// ============================================================================
window.PWA = {
  _prompt: null,
  instalado() { return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true; },
  ios() { return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream; },
  android() { return /android/i.test(navigator.userAgent); },
  celular() { return this.ios() || this.android() || window.innerWidth < 720; },
  ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } },
  // modal proprio quando a pagina (login) nao tem o abrirModal do app
  modal(titulo, html) {
    if (window.abrirModal) { abrirModal(titulo, html, false, 'aviso'); return; }
    document.getElementById('pwa-fundo')?.remove();
    const f = document.createElement('div'); f.className = 'modal-fundo'; f.id = 'pwa-fundo';
    f.innerHTML = '<div class="modal pop-aviso"><div class="modal-topo"><h3>' + titulo + '</h3></div><div class="modal-corpo">' + html + '</div></div>';
    document.body.appendChild(f);
  },
  fechar() { if (window.fecharModal) fecharModal(); document.getElementById('pwa-fundo')?.remove(); },

  async iniciar() {
    if ('serviceWorker' in navigator) {
      try { this.reg = await navigator.serviceWorker.register('./sw.js'); } catch (e) { /* sem SW: segue normal */ }
    }
    window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); this._prompt = e; this.mostrarBotaoInstalar(); });
    window.addEventListener('appinstalled', () => { this.ls('cortex_instalado', '1'); this.fechar(); });
    if (this.celular() && !this.instalado() && this.ls('cortex_pular_instalar') !== '1') {
      setTimeout(() => this.telaInstalar(), 800);
    }
    if (this.instalado()) setTimeout(() => this.pedirNotificacoes(), 1500);
  },

  mostrarBotaoInstalar() {
    const b = document.getElementById('pwa-btn-instalar');
    if (b) b.style.display = '';
  },

  telaInstalar() {
    const ic = window.ICONES || {};
    const passoIos = (n, t) => '<div class="pwa-passo"><b>' + n + '</b><span>' + t + '</span></div>';
    const corpo = this.ios()
      ? '<p class="sub" style="margin-bottom:10px">Detectamos <b>iPhone / iPad</b>. Em tres toques o CORTEX vira um app na sua tela inicial - e so assim as notificacoes funcionam no iOS.</p>' +
        passoIos(1, 'Toque em <b>Compartilhar</b> (o quadrado com a seta) na barra do Safari') +
        passoIos(2, 'Role e escolha <b>Adicionar a Tela de Inicio</b>') +
        passoIos(3, 'Toque em <b>Adicionar</b> e abra o CORTEX pelo icone novo') +
        '<p class="sub" style="margin-top:8px">Se estiver no Chrome do iPhone, abra este endereco no <b>Safari</b> primeiro.</p>'
      : '<p class="sub" style="margin-bottom:10px">Detectamos <b>Android</b>. Instale o CORTEX na tela inicial para abrir como app e receber avisos.</p>' +
        '<button class="btn btn-primario" id="pwa-btn-instalar" style="width:100%; display:' + (this._prompt ? '' : 'none') + '" onclick="PWA.instalarAndroid()">Instalar app</button>' +
        '<div id="pwa-manual-android"' + (this._prompt ? ' style="display:none"' : '') + '>' +
        passoIos(1, 'Toque no menu <b>&#8942;</b> do Chrome, no canto superior direito') +
        passoIos(2, 'Escolha <b>Instalar app</b> (ou <b>Adicionar a tela inicial</b>)') +
        passoIos(3, 'Confirme e abra o CORTEX pelo icone novo') + '</div>';
    this.modal('Instale o CORTEX aba no celular',
      '<div class="pwa-logo">' + (ic.pacientes ? '' : '') + '<img src="icones/icone-192.png" alt="" width="56" height="56" style="border-radius:14px"></div>' + corpo +
      '<div class="barra-acoes"><button class="btn btn-fantasma" onclick="PWA.ls(\'cortex_pular_instalar\', \'1\'); PWA.fechar()">Continuar no navegador</button></div>');
  },

  async instalarAndroid() {
    if (!this._prompt) return;
    this._prompt.prompt();
    const r = await this._prompt.userChoice;
    this._prompt = null;
    if (r && r.outcome === 'accepted') { this.ls('cortex_instalado', '1'); this.fechar(); }
  },

  // ─────────────── Notificacoes ───────────────
  async pedirNotificacoes() {
    if (!('Notification' in window) || !('PushManager' in window) || !this.reg) return;
    if (Notification.permission === 'granted') { this.assinar(); return; }
    if (Notification.permission === 'denied' || this.ls('cortex_pular_push') === '1') return;
    if (!window.CORTEX_SESSAO) return;
    this.modal('Ativar avisos no celular?',
      '<p class="sub" style="margin-bottom:12px">Demandas da coordenacao, parabens, sessao sem evolucao, mudancas na agenda e novidades do portal chegam aqui mesmo com o app fechado.</p>' +
      '<div class="barra-acoes"><button class="btn btn-fantasma" onclick="PWA.ls(\'cortex_pular_push\', \'1\'); PWA.fechar()">Depois</button>' +
      '<button class="btn btn-primario" onclick="PWA.ativar()">Ativar notificacoes</button></div>');
  },
  async ativar() {
    this.fechar();
    const p = await Notification.requestPermission();
    if (p === 'granted') { await this.assinar(); if (window.popAviso) popAviso('Avisos ativados neste aparelho.'); }
  },
  b64(s) { const p = '='.repeat((4 - s.length % 4) % 4); const b = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(b, c => c.charCodeAt(0)); },
  async assinar() {
    try {
      const chave = window.CORTEX_CONFIG && CORTEX_CONFIG.VAPID_PUBLIC;
      if (!chave || !this.reg) return;
      let sub = await this.reg.pushManager.getSubscription();
      if (!sub) sub = await this.reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: this.b64(chave) });
      const j = sub.toJSON();
      await sb.from('push_assinaturas').upsert({
        usuario_id: window.CORTEX_SESSAO.user.id, endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth,
        aparelho: (this.ios() ? 'iPhone' : this.android() ? 'Android' : 'Desktop') + ' \u00b7 ' + (navigator.userAgent.match(/(Chrome|Safari|Firefox)\/[\d.]+/) || [''])[0],
        atualizado_em: new Date().toISOString()
      }, { onConflict: 'endpoint' });
    } catch (e) { console.warn('push:', e.message); }
  }
};
