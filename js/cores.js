// ============================================================================
// CORTEX aba - js/cores.js  (patch 35)
// Cor do sistema escolhida por cada pessoa (Meu perfil > Aparencia), ideia B escolhida por Wess
// em 07/10/2026: 12 cores prontas + cor livre, e "Sistema todo na cor" ligado por padrao (menu
// lateral, fundo, cabecalhos e modo escuro no tom da cor; a pessoa pode desligar e ficar so nos destaques).
// Carregar no <head> logo depois de js/modo.js: aplica a cor de quem esta logado neste aparelho
// ANTES da pagina pintar (sem piscar) e, depois do login, confere a do perfil (vale em qualquer aparelho).
//
// Cores de dado/status (verde em dia, ambar atencao, vermelho falta, roxo concluida, azul chegou...)
// NAO mudam. Ambar (padrao) = sistema exatamente como antes: sem data-cor no <html>, nenhuma regra nova vale.
// Cada paleta e gerada em OKLCH com luminancia fixa por papel, entao toda cor (inclusive a livre) passa
// no mesmo teste de leitura: texto branco no botao e texto na cor sobre o fundo, no claro e no escuro.
// So entra no CSS cor gerada aqui (id da lista ou #RRGGBB validado): nada do banco vai cru para o estilo.
// ============================================================================

(function () {
  'use strict';

  // h = matiz (OKLCH, graus), c = croma. A ordem e a da roda de cores.
  var PALETAS = [
    { id: 'ambar',     nome: 'Ambar',     padrao: true, amostra: '#D97706' },
    { id: 'coral',     nome: 'Coral',     h: 35,  c: 0.17 },
    { id: 'framboesa', nome: 'Framboesa', h: 12,  c: 0.19 },
    { id: 'rosa',      nome: 'Rosa',      h: 355, c: 0.19 },
    { id: 'orquidea',  nome: 'Orquidea',  h: 325, c: 0.19 },
    { id: 'lilas',     nome: 'Lilas',     h: 300, c: 0.19 },
    { id: 'indigo',    nome: 'Indigo',    h: 277, c: 0.18 },
    { id: 'azul',      nome: 'Azul',      h: 258, c: 0.17 },
    { id: 'ceu',       nome: 'Ceu',       h: 237, c: 0.14 },
    { id: 'turquesa',  nome: 'Turquesa',  h: 195, c: 0.12 },
    { id: 'esmeralda', nome: 'Esmeralda', h: 160, c: 0.14 },
    { id: 'grafite',   nome: 'Grafite',   h: 255, c: 0.03 }
  ];

  // ── OKLCH -> sRGB (Bjorn Ottosson) ─────────────────────────────────────
  function oklabParaLinear(L, a, b) {
    var l_ = L + 0.3963377774 * a + 0.2158037573 * b;
    var m_ = L - 0.1055613458 * a - 0.0638541728 * b;
    var s_ = L - 0.0894841775 * a - 1.2914855480 * b;
    var l = l_ * l_ * l_, m = m_ * m_ * m_, s = s_ * s_ * s_;
    return [
      4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
      -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
    ];
  }
  function linearParaOklab(r, g, b) {
    var l = 0.4122214708 * r + 0.5363377070 * g + 0.0514459929 * b;
    var m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
    var s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
    l = Math.cbrt(l); m = Math.cbrt(m); s = Math.cbrt(s);
    return [
      0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
      1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
      0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s
    ];
  }
  var noGamut = function (rgb) { return rgb.every(function (v) { return v >= -0.0005 && v <= 1.0005; }); };
  var lin = function (v) { return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  var gam = function (v) { v = Math.min(1, Math.max(0, v)); return v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055; };

  // cor dentro do sRGB: mantem L e h, reduz o croma ate caber
  function oklchLinear(L, C, h) {
    var hr = h * Math.PI / 180, c = C;
    for (var i = 0; i < 40; i++) {
      var rgb = oklabParaLinear(L, c * Math.cos(hr), c * Math.sin(hr));
      if (noGamut(rgb)) return rgb;
      c *= 0.94;
    }
    return oklabParaLinear(L, 0, 0);
  }
  var lumin = function (rgb) { return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]; };
  function paraHex(rgb) {
    return '#' + rgb.map(function (v) { var x = Math.round(gam(v) * 255); return (x < 16 ? '0' : '') + x.toString(16); }).join('').toUpperCase();
  }
  // acha o L que da a luminancia pedida (contraste previsivel em qualquer matiz)
  function comLuminancia(Y, C, h) {
    var lo = 0, hi = 1, rgb = null;
    for (var i = 0; i < 32; i++) {
      var mid = (lo + hi) / 2;
      rgb = oklchLinear(mid, C, h);
      if (lumin(rgb) < Y) lo = mid; else hi = mid;
    }
    return paraHex(oklchLinear((lo + hi) / 2, C, h));
  }
  function hexParaOklch(hex) {
    var m = String(hex || '').replace('#', '').match(/^([0-9a-f]{6})$/i);
    if (!m) return null;
    var n = parseInt(m[1], 16);
    var lab = linearParaOklab(lin((n >> 16 & 255) / 255), lin((n >> 8 & 255) / 255), lin((n & 255) / 255));
    var C = Math.sqrt(lab[1] * lab[1] + lab[2] * lab[2]);
    var h = (Math.atan2(lab[2], lab[1]) * 180 / Math.PI + 360) % 360;
    return { L: lab[0], c: C, h: h };
  }
  function contraste(a, b) {
    var y = function (hex) { var n = parseInt(hex.slice(1), 16); return lumin([lin((n >> 16 & 255) / 255), lin((n >> 8 & 255) / 255), lin((n & 255) / 255)]); };
    var A = y(a) + 0.05, B = y(b) + 0.05;
    return A > B ? A / B : B / A;
  }

  // ── Papeis de cada cor (luminancia relativa fixa) ──────────────────────
  // claro: acao 0.17 = texto branco 4.8:1 no botao e 4.8:1 como texto no fundo branco
  // escuro: acao 0.24 = texto branco 3.6:1 e 4.8:1 sobre a superficie escura
  function gerar(h, c) {
    var cr = Math.max(0.02, Math.min(0.24, c));
    var p = function (Y, k) { return comLuminancia(Y, cr * (k == null ? 1 : k), h); };
    return {
      claro: {
        acao: p(0.17), forte: p(0.085), vivo: p(0.30, 1.15), luz: p(0.60, 0.85), tinta: p(0.012, 0.7),
        pilula: p(0.93, 0.18), pilulaTinta: p(0.03, 0.7), suave: 0.14
      },
      escuro: {
        acao: p(0.24), forte: p(0.12), vivo: p(0.34, 1.15), luz: p(0.60, 0.85), tinta: p(0.012, 0.7),
        pilula: p(0.93, 0.18), pilulaTinta: p(0.03, 0.7), suave: 0.24
      },
      // "sistema todo" (ideia B): fundo, linhas, sidebar e cabecalhos levam um pouco da cor
      tudo: {
        claro: { bg: p(0.845, 0.075), bgAlt: p(0.955, 0.04), linha: p(0.78, 0.08), linhaForte: p(0.64, 0.10),
                 lado: p(0.007, 0.32), lado2: p(0.028, 0.45), lado3: p(0.06, 0.5) },
        escuro: { bg: p(0.0055, 0.16), sup: p(0.0105, 0.18), supAlt: p(0.016, 0.2), linha: p(0.03, 0.26), linhaForte: p(0.05, 0.3),
                  lado: p(0.004, 0.3), lado2: p(0.018, 0.42), lado3: p(0.045, 0.5) },
        par: comLuminancia(0.30, cr * 1.1, (h + 300) % 360)   // segunda cor da aurora (vizinha na roda)
      }
    };
  }

  // escolha -> paleta. escolha = id de PALETAS ou cor livre '#RRGGBB'
  function resolver(escolha) {
    if (!escolha || escolha === 'ambar') return null;
    var pr = PALETAS.filter(function (x) { return x.id === escolha; })[0];
    if (pr && pr.padrao) return null;
    if (pr) return { id: pr.id, nome: pr.nome, h: pr.h, c: pr.c };
    var o = hexParaOklch(escolha);
    if (!o) return null;
    return { id: 'livre', nome: 'Cor livre', h: o.h, c: Math.max(0.03, o.c), hex: escolha.toUpperCase() };
  }

  function blocoCss(t) {
    var s = '';
    var tok = function (m) {
      return '--acao:' + m.acao + ';--acao-forte:' + m.forte + ';--acao-vivo:' + m.vivo + ';--acao-luz:' + m.luz +
        ';--acao-tinta:' + m.tinta + ';--pilula:' + m.pilula + ';--pilula-ink:' + m.pilulaTinta +
        ';--acao-soft:color-mix(in srgb,' + m.acao + ' ' + Math.round(m.suave * 100) + '%,transparent);';
    };
    s += 'html:root[data-cor]{' + tok(t.claro) + '}';
    s += 'html:root[data-cor][data-modo="escuro"]{' + tok(t.escuro) + '}';
    var b = t.tudo;
    s += 'html:root[data-cor][data-cor-tudo]{--bg:' + b.claro.bg + ';--surface-alt:' + b.claro.bgAlt + ';--line:' + b.claro.linha +
      ';--line-strong:' + b.claro.linhaForte + ';--side-bg:' + b.claro.lado + ';--side-bg-2:' + b.claro.lado2 + ';--acao-lado3:' + b.claro.lado3 +
      ';--acao-par:' + b.par + ';--dot-cor:color-mix(in srgb,' + t.claro.forte + ' 9%,transparent);}';
    s += 'html:root[data-cor][data-cor-tudo][data-modo="escuro"]{--bg:' + b.escuro.bg + ';--surface:' + b.escuro.sup + ';--surface-alt:' + b.escuro.supAlt +
      ';--line:' + b.escuro.linha + ';--line-strong:' + b.escuro.linhaForte + ';--side-bg:' + b.escuro.lado + ';--side-bg-2:' + b.escuro.lado2 +
      ';--acao-lado3:' + b.escuro.lado3 + ';--glass-bg:color-mix(in srgb,' + b.escuro.sup + ' 84%,transparent);--dot-cor:color-mix(in srgb,' + t.escuro.luz + ' 6%,transparent);}';
    return s;
  }

  // ── Guardado no aparelho, por pessoa (tablet compartilhado: cada uma abre com a sua cor) ──
  // localStorage 'cortex_cor' = { p: { <id da pessoa>: { cor, tudo, modo } }, ultimo: <id> }
  var CHAVE = 'cortex_cor';
  function lerTudo() {
    try { var j = JSON.parse(localStorage.getItem(CHAVE) || 'null'); return j && typeof j === 'object' && j.p ? j : { p: {} }; } catch (e) { return { p: {} }; }
  }
  function lerPessoa(uid) { var t = lerTudo(); return uid ? t.p[uid] || null : null; }
  function guardarPessoa(uid, dados) {
    if (!uid) return;
    try {
      var t = lerTudo(); t.p[uid] = Object.assign({}, t.p[uid] || {}, dados); t.ultimo = uid;
      localStorage.setItem(CHAVE, JSON.stringify(t));
    } catch (e) {}
  }
  // id de quem esta logado neste aparelho, lido da sessao do Supabase (antes do app carregar)
  function uidDaSessao() {
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (!/^sb-.+-auth-token$/.test(k)) continue;
        var j = JSON.parse(localStorage.getItem(k) || 'null');
        var u = j && (j.user || (j.currentSession && j.currentSession.user));
        if (u && u.id) return u.id;
      }
    } catch (e) {}
    return null;
  }

  // atual.tudo guarda a chave "Sistema todo na cor" da pessoa (ligada por padrao), mesmo no Ambar
  var atual = { cor: 'ambar', tudo: true };

  function aplicar(escolha, tudo) {
    if (typeof document === 'undefined') return;
    var raiz = document.documentElement;
    var pal = resolver(escolha);
    var st = document.getElementById('cores-usuario');
    atual = { cor: pal ? (pal.hex || pal.id) : 'ambar', tudo: tudo !== false };
    if (!pal) {
      raiz.removeAttribute('data-cor'); raiz.removeAttribute('data-cor-tudo');
      if (st) st.textContent = '';
      ajustarBarra(); return;
    }
    if (!st) { st = document.createElement('style'); st.id = 'cores-usuario'; (document.head || raiz).appendChild(st); }
    st.textContent = blocoCss(gerar(pal.h, pal.c));
    raiz.setAttribute('data-cor', pal.id);
    if (atual.tudo) raiz.setAttribute('data-cor-tudo', ''); else raiz.removeAttribute('data-cor-tudo');
    ajustarBarra();
  }
  // cor da barra do navegador/celular acompanha a sidebar
  function ajustarBarra() {
    var m = document.querySelector('meta[name="theme-color"]'); if (!m) return;
    var tinge = document.documentElement.hasAttribute('data-cor-tudo');
    var v = tinge ? getComputedStyle(document.documentElement).getPropertyValue('--side-bg').trim() : '';
    m.setAttribute('content', v || '#0A1428');
  }

  // quem esta usando de verdade (no "Entrar como pessoa" o id da sessao e o da outra pessoa)
  function euId() {
    if (typeof window === 'undefined') return null;
    if (window.CORTEX_VER_USUARIO && window.CORTEX_VER_USUARIO.meuId) return window.CORTEX_VER_USUARIO.meuId;
    return window.CORTEX_SESSAO && window.CORTEX_SESSAO.user ? window.CORTEX_SESSAO.user.id : null;
  }

  // antes de pintar: a cor (e o modo) de quem esta logado neste aparelho
  if (typeof document !== 'undefined') {
    var tudoG = lerTudo();
    var g = lerPessoa(uidDaSessao()) || (tudoG.ultimo ? tudoG.p[tudoG.ultimo] : null);
    if (g && g.cor) aplicar(g.cor, g.tudo);
    if (g && g.modo && typeof definirModo === 'function' && typeof modoEscolhido === 'function' && modoEscolhido() !== g.modo) definirModo(g.modo, true);
  }

  var API = {
    PALETAS: PALETAS, gerar: gerar, resolver: resolver, contraste: contraste, hexParaOklch: hexParaOklch,
    aplicar: aplicar, euId: euId,
    atual: function () { return { cor: atual.cor, tudo: atual.tudo }; },
    // modo.js avisa quando a pessoa troca o modo (para o aparelho lembrar o de cada uma)
    lembrarModo: function (modo) { guardarPessoa(euId(), { modo: modo }); },
    // grava no aparelho (proxima abertura sem piscar) e no perfil (vale em qualquer aparelho)
    async escolher(cor, tudo) {
      aplicar(cor, tudo);
      var u = euId();
      guardarPessoa(u, { cor: atual.cor, tudo: atual.tudo });
      if (!u || typeof sb === 'undefined') return { ok: true, local: true };
      var r = await sb.from('profiles').update({ tema_cor: atual.cor, tema_tudo: atual.tudo }).eq('id', u);
      return r.error ? { ok: false, erro: r.error.message } : { ok: true };
    },
    // depois do login: o perfil manda. Sem as colunas no banco (SQL do patch 35 nao rodou), vale o que
    // ficou guardado neste aparelho para essa pessoa. Perfil ainda vazio + escolha no aparelho = sobe a escolha.
    async sincronizar(uid) {
      if (typeof sb === 'undefined' || !uid) return;
      var local = lerPessoa(uid);
      var r = await sb.from('profiles').select('tema_cor, tema_tudo, tema_modo').eq('id', uid).maybeSingle();
      if (r.error || !r.data) {
        var l = local || { cor: 'ambar', tudo: true };
        if (l.cor !== atual.cor || l.tudo !== atual.tudo) aplicar(l.cor, l.tudo);
        guardarPessoa(uid, { cor: atual.cor, tudo: atual.tudo });
        return;
      }
      var d = r.data;
      if (!d.tema_cor && local && local.cor && local.cor !== 'ambar') {
        sb.from('profiles').update({ tema_cor: local.cor, tema_tudo: local.tudo !== false }).eq('id', uid).then(function () {}, function () {});
        d = { tema_cor: local.cor, tema_tudo: local.tudo, tema_modo: d.tema_modo };
      }
      var cor = d.tema_cor || 'ambar', tudo = d.tema_tudo !== false;
      if (cor !== atual.cor || tudo !== atual.tudo) aplicar(cor, tudo);
      guardarPessoa(uid, { cor: atual.cor, tudo: atual.tudo });
      if (d.tema_modo && typeof definirModo === 'function' && typeof modoEscolhido === 'function' && modoEscolhido() !== d.tema_modo) definirModo(d.tema_modo, true);
    }
  };
  if (typeof window !== 'undefined') window.CORES = API;
  if (typeof module !== 'undefined') module.exports = API;
})();
