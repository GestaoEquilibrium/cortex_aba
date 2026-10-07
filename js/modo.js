// ============================================================================
// CORTEX aba - js/modo.js
// Aplica o modo claro/escuro ANTES da pagina pintar (sem piscar).
// Carregar no <head>, antes do CSS ser aplicado ao body.
// Escolha salva no aparelho; sem escolha, segue o sistema operacional.
// Patch 35: tres opcoes (claro, escuro, automatico) em Meu perfil > Aparencia, guardadas
// tambem no perfil da pessoa (vale em qualquer aparelho). O botao da sidebar continua alternando.
// ============================================================================

(function () {
  var salvo = null;
  try { salvo = localStorage.getItem('cortex_modo'); } catch (e) {}

  var escuro;
  if (salvo === 'escuro') escuro = true;
  else if (salvo === 'claro') escuro = false;
  else escuro = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

  if (escuro) document.documentElement.setAttribute('data-modo', 'escuro');

  // no automatico, acompanha o sistema operacional ao vivo
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    var seguir = function () { if (modoEscolhido() === 'auto') pintarModo(mq.matches); };
    if (mq.addEventListener) mq.addEventListener('change', seguir); else if (mq.addListener) mq.addListener(seguir);
  }
})();

function modoEscolhido() {
  var s = null;
  try { s = localStorage.getItem('cortex_modo'); } catch (e) {}
  return s === 'claro' || s === 'escuro' ? s : 'auto';
}

function pintarModo(escuro) {
  var raiz = document.documentElement;
  if (escuro) raiz.setAttribute('data-modo', 'escuro'); else raiz.removeAttribute('data-modo');
  var botao = document.getElementById('botao-modo');
  if (botao) botao.textContent = escuro ? '☀' : '☾';
}

// modo = 'claro' | 'escuro' | 'auto'. doPerfil = true quando o valor veio do perfil (nao grava de volta)
function definirModo(modo, doPerfil) {
  if (modo !== 'claro' && modo !== 'escuro') modo = 'auto';
  try { if (modo === 'auto') localStorage.removeItem('cortex_modo'); else localStorage.setItem('cortex_modo', modo); } catch (e) {}
  pintarModo(modo === 'escuro' || (modo === 'auto' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches));
  if (window.CORES && window.CORES.lembrarModo) window.CORES.lembrarModo(modo);
  if (!doPerfil) gravarModoNoPerfil(modo);
}

// preferencia leve: se o SQL do patch 35 ainda nao rodou, fica so no aparelho (sem pop-up a cada troca)
function gravarModoNoPerfil(modo) {
  var u = window.CORES && window.CORES.euId ? window.CORES.euId() : null;
  if (!u || typeof sb === 'undefined') return;
  sb.from('profiles').update({ tema_modo: modo }).eq('id', u).then(function () {}, function () {});
}

function alternarModo() {
  definirModo(document.documentElement.getAttribute('data-modo') === 'escuro' ? 'claro' : 'escuro');
}
