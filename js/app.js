// ============================================================================
// CORTEX aba - js/app.js
// Shell: sidebar por perfil, roteador de modulos, modo claro/escuro.
// Cada modulo se registra em window.MODULOS (ver js/modulos/*.js).
// ============================================================================

window.MODULOS = window.MODULOS || {};
window.CORTEX_SESSAO = null;

const SVG_ATTR = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';

const ICONES = {
  checkin:    '<svg ' + 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"' + '><circle cx="12" cy="12" r="9"/><path d="M8.5 12.5l2.5 2.5 5-5.5"/></svg>',
  permissoes: '<svg ' + 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"' + '><rect x="4" y="10" width="16" height="10" rx="2.5"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>',
  portal:     '<svg ' + 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"' + '><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/></svg>',
  anamnese:   '<svg ' + 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"' + '><path d="M6 3h9l4 4v14H6z"/><path d="M14.5 3v4.5H19"/><line x1="9" y1="12" x2="16" y2="12"/><line x1="9" y1="16" x2="14" y2="16"/></svg>',
  inicio:     '<svg ' + SVG_ATTR + '><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/></svg>',
  pacientes:  '<svg ' + SVG_ATTR + '><path d="M12 20s-7-4.5-9-9c-1.2-2.8.6-6 3.7-6C8.6 5 10.5 6.4 12 8c1.5-1.6 3.4-3 5.3-3 3.1 0 4.9 3.2 3.7 6-2 4.5-9 9-9 9z"/></svg>',
  agenda:     '<svg ' + SVG_ATTR + '><rect x="3.5" y="5" width="17" height="16" rx="2.5"/><line x1="3.5" y1="10" x2="20.5" y2="10"/><line x1="8" y1="3" x2="8" y2="7"/><line x1="16" y1="3" x2="16" y2="7"/></svg>',
  avaliacoes: '<svg ' + SVG_ATTR + '><path d="M4 20l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19l-4 1z"/></svg>',
  programas:  '<svg ' + SVG_ATTR + '><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5V5.5"/><line x1="9" y1="8" x2="15" y2="8"/></svg>',
  presenca:   '<svg ' + SVG_ATTR + '><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8.5 12.5l2.5 2.5 5-5.5"/></svg>',
  faltas:     '<svg ' + SVG_ATTR + '><path d="M12 4 2.8 19.5h18.4z"/><line x1="12" y1="10" x2="12" y2="14"/><circle cx="12" cy="16.8" r=".4"/></svg>',
  rh:         '<svg ' + SVG_ATTR + '><circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 19.5c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5"/><circle cx="17" cy="9.5" r="2.4"/><path d="M15.8 14.7c2.6.2 4.2 1.8 4.7 4.3"/></svg>',
  admin:      '<svg ' + SVG_ATTR + '><circle cx="8.5" cy="12" r="4"/><path d="M12.5 12H21M18 12v3M15.5 12v2"/></svg>'
};

const NAVEGACAO = [
  {
    grupo: 'MEU ACOMPANHAMENTO',
    itens: [
      { id: 'portal',       rotulo: 'Inicio',          perfis: ['familia'] },
      { id: 'anamnese',     rotulo: 'Anamnese Global', perfis: ['familia'] }
    ]
  },
  {
    grupo: 'ASSISTENCIAL',
    itens: [
      { id: 'inicio',     rotulo: 'Inicio',     perfis: ['direcao','coordenador','terapeuta','aplicador','callcenter','suporte'] },
      { id: 'pacientes',  rotulo: 'Pacientes',  perfis: ['direcao','coordenador','terapeuta','aplicador','callcenter'] },
      { id: 'agenda',     rotulo: 'Agenda',     perfis: ['direcao','coordenador','terapeuta','aplicador','callcenter'] },
      { id: 'checkin',    rotulo: 'Check-in',   perfis: ['direcao','coordenador','callcenter','suporte'] },
      { id: 'avaliacoes', rotulo: 'Avaliacoes', perfis: ['direcao','coordenador','terapeuta'] },
      { id: 'programas',  rotulo: 'Programas',  perfis: ['direcao','coordenador','terapeuta','aplicador'] }
    ]
  },
  {
    grupo: 'GESTAO',
    itens: [
      { id: 'presenca', rotulo: 'Lista de Presenca',  perfis: ['direcao','coordenador','callcenter'] },
      { id: 'faltas',   rotulo: 'Gestao de Faltas',   perfis: ['direcao','coordenador'] },
      { id: 'rh',       rotulo: 'RH',                 perfis: ['direcao','coordenador'] },
      { id: 'admin',      rotulo: 'Usuarios e Acessos', perfis: ['direcao','suporte'] },
      { id: 'permissoes', rotulo: 'Permissoes',         perfis: ['direcao','suporte'] }
    ]
  }
];

async function iniciarApp() {
  const sessao = await exigirSessao();
  if (!sessao) return;

  window.CORTEX_SESSAO = sessao;
  const { profile } = sessao;

  document.getElementById('usuario-nome').textContent = profile.nome;
  document.getElementById('usuario-perfil').textContent = ROTULOS_PERFIL[profile.perfil] || profile.perfil;
  document.getElementById('avatar').textContent = iniciais(profile.nome);

  montarSidebar(profile.perfil);

  try {
    if (localStorage.getItem('cortex_sidebar') === 'recolhida') {
      document.getElementById('shell').classList.add('recolhida');
    }
  } catch (e) {}

  const botaoModo = document.getElementById('botao-modo');
  if (botaoModo) {
    botaoModo.textContent =
      document.documentElement.getAttribute('data-modo') === 'escuro' ? '\u2600' : '\u263E';
  }

  abrirModulo(profile.perfil === 'familia' ? 'portal' : 'inicio');
}

function montarSidebar(perfil) {
  const nav = document.getElementById('sidebar-nav');
  nav.innerHTML = '';

  NAVEGACAO.forEach(grupo => {
    const itensVisiveis = grupo.itens.filter(i => i.perfis.includes(perfil));
    if (itensVisiveis.length === 0) return;

    const titulo = document.createElement('div');
    titulo.className = 'nav-grupo-titulo';
    titulo.textContent = grupo.grupo;
    nav.appendChild(titulo);

    itensVisiveis.forEach(item => {
      const a = document.createElement('a');
      a.className = 'nav-item';
      a.dataset.modulo = item.id;
      a.href = '#' + item.id;
      a.title = item.rotulo;

      const icone = document.createElement('span');
      icone.className = 'icone';
      icone.innerHTML = ICONES[item.id] || '';

      const texto = document.createElement('span');
      texto.textContent = item.rotulo;

      a.appendChild(icone);
      a.appendChild(texto);
      a.addEventListener('click', e => { e.preventDefault(); abrirModulo(item.id); });
      nav.appendChild(a);
    });
  });
}

function abrirModulo(id) {
  document.querySelectorAll('.nav-item').forEach(n =>
    n.classList.toggle('ativa', n.dataset.modulo === id));

  const pagina = document.getElementById('pagina');
  pagina.innerHTML = '';

  const modulo = window.MODULOS[id];
  if (modulo && typeof modulo.render === 'function') {
    modulo.render(pagina, window.CORTEX_SESSAO);
  } else {
    pagina.innerHTML =
      '<div class="cartao"><div class="vazio">' +
      '<div class="simbolo-vazio">&#9881;</div>' +
      '<strong>Modulo em construcao</strong>' +
      'Este modulo chega em um dos proximos sprints.' +
      '</div></div>';
  }
}

function alternarSidebar() {
  const shell = document.getElementById('shell');
  shell.classList.toggle('recolhida');
  try {
    localStorage.setItem('cortex_sidebar',
      shell.classList.contains('recolhida') ? 'recolhida' : 'aberta');
  } catch (e) {}
}

// Utilidades compartilhadas pelos modulos
function calcularIdade(dataNasc) {
  const n = new Date(dataNasc + 'T12:00:00');
  const hoje = new Date();
  let anos = hoje.getFullYear() - n.getFullYear();
  let meses = hoje.getMonth() - n.getMonth();
  if (hoje.getDate() < n.getDate()) meses--;
  if (meses < 0) { anos--; meses += 12; }
  return anos + 'a ' + meses + 'm';
}

function escaparHtml(t) {
  const d = document.createElement('div');
  d.textContent = t == null ? '' : String(t);
  return d.innerHTML;
}


// CPF: validacao com digitos verificadores (regra do projeto)
function validarCPF(cpf) {
  cpf = (cpf || '').replace(/\D/g, '');
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  let s = 0;
  for (let i = 0; i < 9; i++) s += parseInt(cpf[i]) * (10 - i);
  let d1 = (s * 10) % 11; if (d1 === 10) d1 = 0;
  if (d1 !== parseInt(cpf[9])) return false;
  s = 0;
  for (let i = 0; i < 10; i++) s += parseInt(cpf[i]) * (11 - i);
  let d2 = (s * 10) % 11; if (d2 === 10) d2 = 0;
  return d2 === parseInt(cpf[10]);
}

function formatarCPF(cpf) {
  cpf = (cpf || '').replace(/\D/g, '').slice(0, 11);
  if (cpf.length !== 11) return cpf;
  return cpf.slice(0,3) + '.' + cpf.slice(3,6) + '.' + cpf.slice(6,9) + '-' + cpf.slice(9);
}


// ── Modais (janela suspensa) ────────────────────────────────────────────
function abrirModal(titulo, html, larga) {
  fecharModal();
  const fundo = document.createElement('div');
  fundo.className = 'modal-fundo';
  fundo.id = 'modal-fundo';
  fundo.innerHTML =
    '<div class="modal' + (larga ? ' modal-larga' : '') + '" role="dialog" aria-modal="true">' +
    '  <div class="modal-topo">' +
    '    <h3>' + titulo + '</h3>' +
    '    <button type="button" class="modal-fechar" onclick="fecharModal()" title="Fechar">&times;</button>' +
    '  </div>' +
    '  <div class="modal-corpo">' + html + '</div>' +
    '</div>';
  fundo.addEventListener('click', e => { if (e.target === fundo) fecharModal(); });
  document.body.appendChild(fundo);
  document.body.style.overflow = 'hidden';
}

function fecharModal() {
  const m = document.getElementById('modal-fundo');
  if (m) m.remove();
  document.body.style.overflow = '';
}

document.addEventListener('keydown', e => { if (e.key === 'Escape') fecharModal(); });

function abrirModalPdf(titulo, url) {
  // #toolbar=0 esconde a barra de impressao/download; navpanes=0 esconde as miniaturas
  const limpo = url + '#toolbar=0&navpanes=0&view=FitH';
  abrirModal(titulo, '<iframe src="' + limpo + '" title="' + titulo + '"></iframe>', true);
}

document.addEventListener('DOMContentLoaded', iniciarApp);
