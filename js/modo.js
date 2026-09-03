// ============================================================================
// CORTEX aba - js/modo.js
// Aplica o modo claro/escuro ANTES da pagina pintar (sem piscar).
// Carregar no <head>, antes do CSS ser aplicado ao body.
// Escolha salva no aparelho; sem escolha, segue o sistema operacional.
// ============================================================================

(function () {
  var salvo = null;
  try { salvo = localStorage.getItem('cortex_modo'); } catch (e) {}

  var escuro;
  if (salvo === 'escuro') escuro = true;
  else if (salvo === 'claro') escuro = false;
  else escuro = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

  if (escuro) document.documentElement.setAttribute('data-modo', 'escuro');
})();

function alternarModo() {
  var raiz = document.documentElement;
  var escuro = raiz.getAttribute('data-modo') === 'escuro';
  if (escuro) {
    raiz.removeAttribute('data-modo');
    try { localStorage.setItem('cortex_modo', 'claro'); } catch (e) {}
  } else {
    raiz.setAttribute('data-modo', 'escuro');
    try { localStorage.setItem('cortex_modo', 'escuro'); } catch (e) {}
  }
  var botao = document.getElementById('botao-modo');
  if (botao) botao.textContent = escuro ? '\u263E' : '\u2600';
}
