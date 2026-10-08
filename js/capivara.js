// ============================================================================
// CORTEX aba - js/capivara.js (patch 41)
// Capivara mascote no canto da tela (opcao C, 2D cartoon, Wess 08/10/2026).
// Anda pelo rodape ao lado do sino, para, olha para a pessoa, espia por baixo,
// deita e dorme quando ninguem mexe, grita e corre ate o sino quando chega aviso
// novo e recebe carinho (passar o mouse ou segurar o dedo em cima).
// Some nas fichas, avaliacoes, documentos e na impressao. Liga/desliga e som em
// Meu perfil > Aparencia (vale para a pessoa, neste aparelho).
// Desenho: quadros renderizados no Blender (icones/capivara/*.webp).
// ============================================================================

window.CAPIVARA = (function () {
  // quadros por animacao (12 por segundo), na mesma ordem das folhas webp
  const ANIM = {
    parada: { n: 24, laco: true }, andar: { n: 12, laco: true }, olhar: { n: 12, laco: false },
    carinho: { n: 16, laco: true }, grito: { n: 14, laco: false }, deitar: { n: 8, laco: false },
    dormir: { n: 24, laco: true }
  };
  let META = { w: 300, h: 317 };            // tamanho do quadro (px da folha); trocado pelo capivara.json
  const BASE = 'icones/capivara/';
  const FPS = 12;
  const FRASES = ['Oi! Bom trabalho hoje!', 'Ja bebeu agua?', 'Bora, que hoje rende!', 'Capivara de plantao.', 'Respira... e segue.'];

  let el, spr, balao, ligada = false, estado = 'parada', quadro = 0, acc = 0, ultimo = 0;
  let x = 0, alvoX = null, velocidade = 0, olhaDireita = false, filaFim = null;
  let tempoEstado = 0, duracaoEstado = 3, ocioso = 0, raf = null, escondida = false;
  let carinhoAte = 0, ultimoCoracao = 0, totalAvisos = null, z = 0;

  // ───────── preferencias (por pessoa, neste aparelho) ─────────
  function uid() { const s = window.CORTEX_SESSAO; return s && s.user ? s.user.id : 'anon'; }
  function prefs() {
    try { const t = JSON.parse(localStorage.getItem('cortex_capivara') || '{}'); return Object.assign({ on: true, som: false }, t[uid()] || {}); }
    catch (e) { return { on: true, som: false }; }
  }
  function salvarPrefs(p) {
    try { const t = JSON.parse(localStorage.getItem('cortex_capivara') || '{}'); t[uid()] = p; localStorage.setItem('cortex_capivara', JSON.stringify(t)); } catch (e) {}
  }
  const celular = () => window.matchMedia('(max-width: 720px)').matches;
  const semMovimento = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ───────── area por onde ela anda ─────────
  function limites() {
    const larg = el ? el.offsetWidth : 150;
    if (celular()) return { min: 8, max: window.innerWidth - larg - 8 };
    const side = document.querySelector('.sidebar');
    const esq = side ? side.getBoundingClientRect().right + 16 : 260;
    return { min: Math.max(esq, window.innerWidth * 0.42), max: window.innerWidth - larg - 84 };   // 84 = espaco do sino
  }

  function montar() {
    if (el) return;
    el = document.createElement('div'); el.id = 'capivara'; el.className = 'capivara';
    el.setAttribute('aria-hidden', 'true');
    // a area de toque e so o corpo (o resto do quadro e transparente e nao pode bloquear cliques no sistema)
    el.innerHTML = '<div class="capi-sombra"></div><div class="capi-spr"><div class="capi-toque"></div></div><div class="capi-balao"></div>';
    document.body.appendChild(el);
    spr = el.querySelector('.capi-spr'); balao = el.querySelector('.capi-balao');
    const toque = el.querySelector('.capi-toque');
    const L = limites(); x = L.max; posicionar();
    // carinho: mouse passando por cima / dedo segurando
    toque.addEventListener('pointermove', e => { if (e.pointerType === 'mouse') acariciar(); });
    let seg = null;
    toque.addEventListener('pointerdown', e => {
      if (e.pointerType !== 'mouse') { seg = setTimeout(() => { seg = 'ok'; acariciar(); }, 280); }
    });
    toque.addEventListener('pointerup', e => {
      if (e.pointerType === 'mouse') { if (estado !== 'carinho') falar(FRASES[Math.floor(Math.random() * FRASES.length)], 2600); return; }
      if (seg && seg !== 'ok') { clearTimeout(seg); falar(FRASES[Math.floor(Math.random() * FRASES.length)], 2600); }
      seg = null;
    });
    toque.addEventListener('pointermove', e => { if (e.pointerType !== 'mouse' && seg === 'ok') acariciar(); });
    // alguem mexeu no sistema: acorda e zera o tempo parado
    ['pointermove', 'keydown', 'pointerdown', 'wheel'].forEach(ev => window.addEventListener(ev, () => {
      ocioso = 0; if (estado === 'dormir' || estado === 'deitar') acordar();
    }, { passive: true }));
    window.addEventListener('resize', () => { const Lr = limites(); x = Math.min(Math.max(x, Lr.min), Lr.max); posicionar(); });
    // some nas fichas, avaliacoes e documentos (todas usam .folha-overlay)
    new MutationObserver(conferirTela).observe(document.body, { childList: true });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) ultimo = performance.now(); });
    conferirTela();
  }

  function conferirTela() {
    const tampa = !!document.querySelector('.folha-overlay');
    if (tampa !== escondida) { escondida = tampa; if (el) el.classList.toggle('fora', tampa); }
  }

  function trocar(novo, dur) {
    estado = novo; quadro = 0; acc = 0; tempoEstado = 0; duracaoEstado = dur || 3;
    spr.style.backgroundImage = 'url(' + BASE + novo + '.webp)';
    spr.style.backgroundSize = (ANIM[novo].n * 100) + '% 100%';
    desenharQuadro();
  }
  function desenharQuadro() {
    const n = ANIM[estado].n;
    spr.style.backgroundPosition = (n > 1 ? (quadro / (n - 1)) * 100 : 0) + '% 0';
  }
  function posicionar() {
    if (!el) return;
    el.style.transform = 'translate3d(' + Math.round(x) + 'px,' + Math.round(-z) + 'px,0)';
    spr.style.transform = olhaDireita ? 'scaleX(-1)' : '';
    el.classList.toggle('direita', olhaDireita);
  }

  // ───────── comportamento ─────────
  function andarAte(px, rapido, depois) {
    const L = limites(); alvoX = Math.min(Math.max(px, L.min), L.max);
    if (Math.abs(alvoX - x) < 6) { alvoX = null; if (depois) depois(); return; }
    olhaDireita = alvoX > x; velocidade = rapido ? 150 : 52; filaFim = depois || null;
    trocar('andar', 99); if (rapido) duracaoEstado = 99;
  }
  function proximo() {
    if (semMovimento()) { trocar('parada', 6); return; }
    const r = Math.random(), L = limites();
    if (ocioso > 40 && r < 0.7) { trocar('deitar', 99); return; }
    if (r < 0.42) andarAte(L.min + Math.random() * (L.max - L.min));
    else if (r < 0.58) trocar('olhar', 2.6);
    else if (r < 0.68 && !celular()) espiar();
    else trocar('parada', 2.5 + Math.random() * 3);
  }
  function espiar() {
    // desce ate so a cabeca ficar de fora, olha para a pessoa e volta
    el.classList.add('espiando'); trocar('olhar', 3.2);
    setTimeout(() => { if (el) el.classList.remove('espiando'); }, 3000);
  }
  function acordar() { if (estado === 'dormir' || estado === 'deitar') { el.classList.remove('dormindo'); trocar('parada', 2); } }
  function acariciar() {
    if (escondida) return;
    const agora = performance.now();
    carinhoAte = agora + 900; ocioso = 0;
    if (estado !== 'carinho') { alvoX = null; el.classList.remove('dormindo'); trocar('carinho', 99); }
    if (agora - ultimoCoracao > 320) { ultimoCoracao = agora; coracao(); }
  }
  function coracao() {
    const c = document.createElement('span'); c.className = 'capi-coracao'; c.textContent = '♥';
    c.style.left = (35 + Math.random() * 30) + '%'; c.style.setProperty('--dx', (Math.random() * 40 - 20) + 'px');
    el.appendChild(c); setTimeout(() => c.remove(), 1300);
  }
  function falar(txt, ms) {
    balao.textContent = txt; el.classList.add('falando');
    clearTimeout(balao._t); balao._t = setTimeout(() => el.classList.remove('falando'), ms || 2500);
  }
  function chiar() {
    if (!prefs().som) return;
    try {
      const ac = new (window.AudioContext || window.webkitAudioContext)(); const o = ac.createOscillator(), g = ac.createGain();
      o.type = 'triangle'; o.frequency.setValueAtTime(880, ac.currentTime); o.frequency.exponentialRampToValueAtTime(1500, ac.currentTime + 0.12);
      o.frequency.exponentialRampToValueAtTime(700, ac.currentTime + 0.3);
      g.gain.setValueAtTime(0.0001, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.12, ac.currentTime + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.34);
      o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime + 0.36); setTimeout(() => ac.close(), 600);
    } catch (e) {}
  }
  // aviso novo: grita, mostra o balao e corre ate o sino
  function avisar(n) {
    if (!ligada || escondida) return;
    el.classList.remove('dormindo'); chiar();
    falar(n > 1 ? 'Psiu! ' + n + ' avisos novos!' : 'Psiu! Aviso novo!', 3200);
    trocar('grito', 99);
    filaFim = () => andarAte(limites().max, true, () => { olhaDireita = true; posicionar(); trocar('olhar', 3); });
  }
  function vigiarAvisos() {
    const n = window.MODULOS && MODULOS.avisos ? MODULOS.avisos.total : null;
    if (typeof n === 'number') {
      if (totalAvisos !== null && n > totalAvisos) avisar(n - totalAvisos);
      totalAvisos = n;
    }
  }

  function passo(t) {
    raf = requestAnimationFrame(passo);
    if (document.hidden || !ligada) { ultimo = t; return; }
    const dt = Math.min(0.1, (t - (ultimo || t)) / 1000); ultimo = t;
    ocioso += dt; tempoEstado += dt; acc += dt;
    // quadro da animacao
    const a = ANIM[estado];
    const fps = estado === 'andar' && velocidade > 100 ? FPS * 1.8 : estado === 'dormir' ? FPS * 0.6 : FPS;
    while (acc >= 1 / fps) {
      acc -= 1 / fps; quadro++;
      if (quadro >= a.n) {
        if (a.laco) quadro = 0;
        else {
          quadro = a.n - 1;
          if (estado === 'deitar') { el.classList.add('dormindo'); trocar('dormir', 99); }
          else if (estado === 'grito') { const f = filaFim; filaFim = null; if (f) f(); else trocar('parada', 2); }
        }
      }
    }
    desenharQuadro();
    // deslocamento
    if (estado === 'andar' && alvoX !== null) {
      const d = alvoX - x, s = Math.sign(d) * velocidade * dt;
      if (Math.abs(s) >= Math.abs(d)) { x = alvoX; alvoX = null; const f = filaFim; filaFim = null; if (f) f(); else trocar('parada', 2 + Math.random() * 3); }
      else x += s;
      posicionar();
    }
    if (estado === 'carinho' && performance.now() > carinhoAte) trocar('parada', 2);
    if (['parada', 'olhar'].includes(estado) && tempoEstado > duracaoEstado) proximo();
  }

  function ligar() {
    if (ligada) return;
    const p = window.CORTEX_SESSAO && window.CORTEX_SESSAO.profile;
    if (!p || p.perfil === 'familia') return;
    montar(); ligada = true; el.classList.remove('desligada');
    el.style.setProperty('--capi-ar', META.w / META.h);
    // carrega as folhas antes de precisar (sem piscar na primeira vez)
    if (!ligar._pre) { ligar._pre = Object.keys(ANIM).map(a => { const i = new Image(); i.src = BASE + a + '.webp'; return i; }); }
    trocar('parada', 3);
    if (!raf) raf = requestAnimationFrame(passo);
    clearInterval(ligar._v); ligar._v = setInterval(vigiarAvisos, 2000);
  }
  function desligar() {
    ligada = false; if (el) el.classList.add('desligada');
    clearInterval(ligar._v);
  }

  return {
    iniciar() {
      fetch(BASE + 'capivara.json').then(r => r.ok ? r.json() : null).then(m => { if (m) { META = m; if (el) el.style.setProperty('--capi-ar', m.w / m.h); } }).catch(() => null);
      // entra depois que a tela carregou (nao atrasa o login)
      setTimeout(() => { if (prefs().on) ligar(); if (el) el.style.setProperty('--capi-ar', META.w / META.h); }, 1800);
    },
    prefs, definir(chave, valor) {
      const p = prefs(); p[chave] = valor; salvarPrefs(p);
      if (chave === 'on') { if (valor) ligar(); else desligar(); }
    },
    avisar, acariciar,
    // para testes e demonstracao
    _forcar(nome, dur) { if (ANIM[nome]) trocar(nome, dur || 99); },
    _andar(px, rapido) { andarAte(px, rapido); }
  };
})();
