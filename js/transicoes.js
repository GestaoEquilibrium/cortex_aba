// ============================================================================
// CORTEX aba - js/transicoes.js  (patch 32)
// Movimento do sistema, sem regra de negocio:
//  - entrada do sistema: menu e primeira tela chegam em cascata;
//  - troca de tela (abrirModulo) com View Transitions: a pilula do menu desliza e o conteudo sai e entra;
//  - cartao da crianca vira a capa do prontuario; abas com indicador que desliza e ficam fixas ao rolar;
//  - cartoes aparecem em cascata ao entrar na tela e ao rolar; numeros do dia contam ate o valor.
// Navegador sem View Transitions (ou "reduzir movimento" ligado) troca de tela como antes.
// Reversivel: sem este arquivo e styles/transicoes.css o sistema volta ao patch 31.
// ============================================================================
(function () {
  const raiz = document.documentElement;
  const temVT = typeof document.startViewTransition === 'function';
  const reduz = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const eio = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const SUAVE = 'cubic-bezier(.22,1,.36,1)';
  if (temVT) raiz.classList.add('com-vt');

  const REVELA = '.cartao-paciente, .agd-bloco, .ini-ag-card, .ini-grid > .cartao, .av-item.ini-av, .evo-item, .kpi, .kpi2';
  const CONTA = '.ini-nums b, .agd-tile b, .kpi-valor, .kpi2-valor';

  const T = window.TRANS = {
    _iniciado: false,
    _trocaEm: performance.now(),

    usaVT() { return temVT && !reduz() && !document.hidden; },

    // ── troca de tela ────────────────────────────────────────────────
    // Se outra troca chega antes da anterior terminar (dois cliques rapidos, ou "abre Pacientes e ja abre
    // o prontuario"), a mais nova vence: a anterior e pulada e o que ela ia desenhar nao desenha mais.
    _seq: 0, _vt: null,
    iniciarVT(cb, tipo) {
      const meu = ++this._seq;
      if (this._vt) { try { this._vt.skipTransition(); } catch (e) {} }
      raiz.dataset.vt = tipo || 'tela';
      const vt = document.startViewTransition(() => (meu === this._seq ? cb() : undefined));
      this._vt = vt;
      vt.finished.catch(() => {}).finally(() => { if (this._vt === vt) { this._vt = null; delete raiz.dataset.vt; this.limparNomes(); } });
      return vt;
    },
    trocarTela(fn, tipo) {
      // primeira tela depois de entrar: menu e conteudo chegam em cascata (sem troca de tela)
      if (!this._iniciado) { this._iniciado = true; fn(); this.marcarTroca(); this.entradaSistema(); return null; }
      if (!this.usaVT()) { this._seq++; fn(); this.marcarTroca(); return null; }
      return this.iniciarVT(() => { fn(); this.marcarTroca(); }, tipo);
    },
    marcarTroca() { this._trocaEm = performance.now(); this.moverPilula(); },
    recente(ms) { return performance.now() - this._trocaEm < (ms || 900); },

    // ── pilula do menu ───────────────────────────────────────────────
    prepararMenu() {
      const nav = document.getElementById('sidebar-nav'); if (!nav) return;
      let pil = nav.querySelector('.nav-pilula');
      if (!pil) { pil = document.createElement('div'); pil.className = 'nav-pilula'; pil.setAttribute('aria-hidden', 'true'); nav.prepend(pil); }
      nav.classList.add('com-pilula');
      nav.querySelectorAll('.nav-item[data-modulo]').forEach(a => { a.style.viewTransitionName = 'nav-' + a.dataset.modulo.replace(/[^a-z0-9_-]/gi, ''); });
      if (!nav._ro && 'ResizeObserver' in window) { nav._ro = new ResizeObserver(() => this.moverPilula()); nav._ro.observe(nav); }   // menu recolhido/expandido
      if (!nav._obs) {
        // qualquer codigo que troque o item ativo (abrirModulo, prontuario aberto de outra tela...) move a pilula
        let pend = false;
        nav._obs = new MutationObserver(() => { if (pend) return; pend = true; requestAnimationFrame(() => { pend = false; this.moverPilula(); }); });
        nav._obs.observe(nav, { attributes: true, attributeFilter: ['class'], subtree: true });
      }
      this.moverPilula();
    },
    moverPilula() {
      const nav = document.getElementById('sidebar-nav'); const pil = nav && nav.querySelector('.nav-pilula'); if (!pil) return;
      const it = nav.querySelector('.nav-item.ativa');
      if (!it) { pil.style.opacity = 0; return; }
      pil.style.top = it.offsetTop + 'px'; pil.style.height = it.offsetHeight + 'px'; pil.style.opacity = 1;
    },

    entradaSistema() {
      if (reduz()) return;
      this._trocaEm = performance.now();
      document.querySelectorAll('.sidebar .nav-grupo-titulo, .sidebar .nav-item, .sidebar .cartao-usuario').forEach((n, i) =>
        n.animate([{ opacity: 0, transform: 'translateX(-14px)' }, { opacity: 1, transform: 'none' }], { duration: 520, delay: 120 + i * 30, easing: SUAVE, fill: 'backwards' }));
      const pg = document.getElementById('pagina');
      if (pg) [...pg.children].forEach((n, i) => n.animate([{ opacity: 0, transform: 'translateY(14px)', filter: 'blur(4px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }],
        { duration: 560, delay: 160 + i * 60, easing: SUAVE, fill: 'backwards' }));
    },

    // ── cascata, revelar ao rolar e numeros ─────────────────────────
    _io: null,
    observarPagina() {
      const pg = document.getElementById('pagina'); if (!pg || pg._obsT) return;
      if ('IntersectionObserver' in window) {
        this._io = new IntersectionObserver(es => {
          let k = 0;
          es.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top || a.boundingClientRect.left - b.boundingClientRect.left)
            .forEach(e => {
              const el = e.target; this._io.unobserve(el);
              el.style.setProperty('--rv-i', Math.min(k++, 10)); el.classList.add('rv-ok');
              setTimeout(() => { el.classList.remove('rv', 'rv-ok'); el.style.removeProperty('--rv-i'); }, 1300);
            });
        }, { threshold: 0.06, rootMargin: '0px 0px -4% 0px' });
      }
      let k = 0, ultimo = 0;
      pg._obsT = new MutationObserver(lista => {
        if (reduz()) return;
        const agora = performance.now(); if (agora - ultimo > 600) k = 0; ultimo = agora;
        const recente = this.recente(900), recenteNum = this.recente(2200);
        lista.forEach(m => m.addedNodes.forEach(n => {
          if (n.nodeType !== 1) return;
          // tela redesenhada por dentro do modulo (sem troca de tela): mesma entrada suave de antes do patch 32
          if (m.target === pg && !raiz.dataset.vt && !this.recente(150) && temVT)
            n.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 350, easing: SUAVE, fill: 'backwards' });
          const alvos = n.matches && n.matches(REVELA) ? [n] : [];
          n.querySelectorAll && n.querySelectorAll(REVELA).forEach(x => alvos.push(x));
          alvos.forEach(el => {
            if (el.closest('.rv, .folha-overlay, .modal')) return;
            const r = el.getBoundingClientRect();
            const naTela = r.top < innerHeight && r.bottom > 0;
            if (naTela) {
              if (recente) el.animate([{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { duration: 480, delay: Math.min(k++, 12) * 35, easing: SUAVE, fill: 'backwards' });
            } else if (this._io && r.height > 0) { el.classList.add('rv'); this._io.observe(el); this.garantir(); }
          });
          if (recenteNum) {
            const nums = n.matches && n.matches(CONTA) ? [n] : [];
            n.querySelectorAll && n.querySelectorAll(CONTA).forEach(x => nums.push(x));
            nums.forEach(b => this.contar(b));
            n.querySelectorAll && n.querySelectorAll('.ini-barra i').forEach((b, i) => {
              const w = b.style.width; if (!w) return;
              b.animate([{ width: '0%' }, { width: w }], { duration: 1000, delay: 200 + i * 50, easing: SUAVE, fill: 'backwards' });
            });
          }
        }));
      });
      pg._obsT.observe(pg, { childList: true, subtree: true });
    },
    // garantia: nada fica invisivel se o observador nao disparar (aba escondida, navegador lento...)
    garantir() {
      clearTimeout(this._gar);
      this._gar = setTimeout(() => document.querySelectorAll('#pagina .rv:not(.rv-ok)').forEach(el => {
        const r = el.getBoundingClientRect(); if (r.top < innerHeight && r.bottom > 0) { el.classList.add('rv-ok'); setTimeout(() => el.classList.remove('rv', 'rv-ok'), 1300); }
      }), 2500);
    },
    contar(b) {
      const txt = (b.textContent || '').trim(); if (!/^\d{1,4}$/.test(txt) || b._contando) return;
      const alvo = +txt; if (alvo < 2) return;
      b._contando = true; const ini = performance.now(), d = 900;
      const passo = agora => { const t = clamp((agora - ini) / d, 0, 1); b.textContent = Math.round(alvo * (1 - Math.pow(1 - t, 3))); if (t < 1) requestAnimationFrame(passo); else b._contando = false; };
      b.textContent = '0'; requestAnimationFrame(passo);
    },

    // ── prontuario: cartao -> capa, abas ────────────────────────────
    nomearCartao(card) {
      card.style.viewTransitionName = 'pac-capa';
      const av = card.querySelector('.avatar-paciente'); if (av) av.style.viewTransitionName = 'pac-av';
      const nm = card.querySelector('.pac-quem strong');
      if (nm) { nm.innerHTML = '<span class="vt-nome">' + nm.innerHTML + '</span>'; nm.firstChild.style.viewTransitionName = 'pac-nome'; }
    },
    nomearCapa() {
      const capa = document.querySelector('#pagina .capa'); if (!capa) return;
      capa.style.viewTransitionName = 'pac-capa';
      const av = capa.querySelector('.capa-avatar'); if (av) av.style.viewTransitionName = 'pac-av';
      const sp = capa.querySelector('.capa-info h2 .vt-nome'); if (sp) sp.style.viewTransitionName = 'pac-nome';
    },
    limparNomes() { document.querySelectorAll('#pagina [style*="view-transition-name"]').forEach(x => { x.style.viewTransitionName = ''; }); },

    _ioCapa: null,
    prepararProntuario() {
      const capa = document.querySelector('#pagina .capa'), bar = document.getElementById('pac-abas');
      if (!capa || !bar) return;
      const h2 = capa.querySelector('.capa-info h2');
      if (h2 && !h2.querySelector('.vt-nome')) h2.innerHTML = '<span class="vt-nome">' + h2.innerHTML + '</span>';
      // identificacao que aparece na barra de abas quando ela fica presa no topo
      if (!bar.querySelector('.abas-quem')) {
        const quem = document.createElement('span'); quem.className = 'abas-quem'; quem.setAttribute('aria-hidden', 'true');
        const av = capa.querySelector('.capa-avatar'); const nome = h2 ? h2.textContent.trim() : '';
        quem.innerHTML = (av ? av.outerHTML.replace(/\sstyle="[^"]*"/g, '') : '') + '<b>' + nome.replace(/[<>&]/g, '') + '</b>';
        bar.prepend(quem);
      }
      if (!bar.querySelector('.aba-ind')) { const ind = document.createElement('span'); ind.className = 'aba-ind'; ind.setAttribute('aria-hidden', 'true'); bar.prepend(ind); bar.classList.add('com-ind'); }
      requestAnimationFrame(() => this.posInd(false));
      if (this._ioCapa) this._ioCapa.disconnect();
      if ('IntersectionObserver' in window) {
        this._ioCapa = new IntersectionObserver(es => es.forEach(e => {
          const preso = !e.isIntersecting && e.boundingClientRect.top < 0;
          bar.classList.toggle('preso', preso); setTimeout(() => this.posInd(true), 460);
        }), { threshold: 0, rootMargin: '-30px 0px 0px 0px' });
        this._ioCapa.observe(capa);
      }
    },
    posInd(animar) {
      const bar = document.getElementById('pac-abas'); if (!bar) return;
      const at = bar.querySelector('.aba.ativa'), ind = bar.querySelector('.aba-ind'); if (!at || !ind) return;
      if (!animar) ind.style.transition = 'none';
      ind.style.left = at.offsetLeft + 'px'; ind.style.width = at.offsetWidth + 'px';
      if (!animar) { void ind.offsetWidth; ind.style.transition = ''; }
    },

    envolverPacientes() {
      const P = window.MODULOS && MODULOS.pacientes; if (!P || P._envolvido) return; P._envolvido = true;
      const detalhe = P.telaDetalhe, lista = P.telaLista, aba = P.abrirAba;
      P.telaDetalhe = function (id) {
        const args = arguments, self = this;
        // recarregar o mesmo prontuario (depois de salvar algo) nao anima
        const mesmo = document.querySelector('#pagina .capa') && self.paciente && String(self.paciente.id) === String(id);
        if (!T._iniciado || !T.usaVT() || mesmo) { if (!mesmo) T._seq++; return detalhe.apply(self, args).then(r => { T.prepararProntuario(); return r; }); }
        const card = document.querySelector('#pagina .cartao-paciente[onclick*="\'' + String(id).replace(/[^\w-]/g, '') + '\'"]');
        if (card) { card.classList.add('abrindo'); T.nomearCartao(card); }
        let res;
        // espera o prontuario chegar do banco e so entao anima (a tela antiga fica parada nesse meio tempo)
        const vt = T.iniciarVT(() => detalhe.apply(self, args).then(r => {
          res = r; T.marcarTroca(); T.prepararProntuario(); if (card) T.nomearCapa();
        }), card ? 'prontuario' : 'tela');
        return vt.updateCallbackDone.then(() => res, () => res);
      };
      P.telaLista = function () {
        const args = arguments, self = this;
        // voltando do prontuario: mesma troca de tela do menu
        if (T._iniciado && T.usaVT() && document.querySelector('#pagina .capa') && !raiz.dataset.vt) {
          return new Promise(res => T.trocarTela(() => res(lista.apply(self, args)), 'tela'));
        }
        return lista.apply(self, args);
      };
      P.abrirAba = function (id) {
        const bar = document.getElementById('pac-abas');
        const bts = bar ? [...bar.querySelectorAll('.aba')] : [];
        const ant = bts.findIndex(b => b.classList.contains('ativa')), nov = bts.findIndex(b => b.dataset.aba === id);
        const r = aba.apply(this, arguments);
        T.posInd(ant >= 0);
        const at = bts[nov]; if (at && ant >= 0 && at.scrollIntoView) at.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: reduz() ? 'auto' : 'smooth' });
        const c = document.getElementById('pac-aba-conteudo');
        if (c && ant >= 0 && nov >= 0 && ant !== nov && !reduz()) {
          c.animate([{ opacity: 0, transform: 'translateX(' + (nov > ant ? 28 : -28) + 'px)', filter: 'blur(3px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], { duration: 420, easing: SUAVE });
          T._trocaEm = performance.now();
        }
        return r;
      };
    }
  };

  T.observarPagina();
  T.envolverPacientes();
  window.addEventListener('resize', () => { T.moverPilula(); T.posInd(false); });
})();
