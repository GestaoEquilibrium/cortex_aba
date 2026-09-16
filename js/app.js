// ============================================================================
// CORTEX aba - js/app.js
// Shell: sidebar por perfil, roteador de modulos, modo claro/escuro.
// Cada modulo se registra em window.MODULOS (ver js/modulos/*.js).
// ============================================================================

window.MODULOS = window.MODULOS || {};
window.CORTEX_SESSAO = null;

const SVG_ATTR = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';

const ICONES = {
  eventos:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3"/><path d="M3.5 19c.6-3 2.8-4.5 5.5-4.5S13.9 16 14.5 19"/><path d="M16 8.5l1.5 1.5L20.5 7"/></svg>',
  guias:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h9l4 4v14H6z"/><path d="M14.5 3v4.5H19"/><path d="M9 14l2 2 4-4.5"/></svg>',
  gerencial:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h16"/><rect x="6" y="11" width="3" height="6" rx="1"/><rect x="11" y="7" width="3" height="10" rx="1"/><rect x="16" y="13" width="3" height="4" rx="1"/></svg>',
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
  termos:     '<svg ' + SVG_ATTR + '><path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4M9 12h6M9 16h4"/></svg>',
  auditoria:  '<svg ' + SVG_ATTR + '><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3M11 8v3l2 2"/></svg>',
  diagnostico: '<svg ' + SVG_ATTR + '><path d="M3 12h4l2.5-6 4 12 2.5-6h5"/></svg>',
  chat:       '<svg ' + SVG_ATTR + '><path d="M21 11.5a8.5 8.5 0 0 1-12.4 7.5L3 21l2-5.6A8.5 8.5 0 1 1 21 11.5z"/></svg>',
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
      { id: 'inicio',     rotulo: 'Inicio',     chave: 'inicio' },
      { id: 'pacientes',  rotulo: 'Pacientes',  chave: 'pacientes' },
      { id: 'agenda',     rotulo: 'Agenda',     chave: 'agenda' },
      { id: 'avaliacoes', rotulo: 'Avaliacoes', chave: 'avaliacoes' },
      { id: 'programas',  rotulo: 'Programas',  chave: 'programas' }
    ]
  },
  {
    grupo: 'GESTAO',
    itens: [
      { id: 'presenca', rotulo: 'Lista de Presenca',  chave: 'presenca' },
      { id: 'faltas',   rotulo: 'Gestao de Faltas',   chave: 'faltas' },
      { id: 'termos',   rotulo: 'Termos digitais',    chave: 'termos' },
      { id: 'rh',       rotulo: 'RH',                 chave: 'rh' },
      { id: 'chat',       rotulo: 'Suporte',            chave: 'chat' },
      { id: 'admin',      rotulo: 'Usuarios e Acessos', perfis: ['direcao','suporte'] },
      { id: 'permissoes', rotulo: 'Permissoes',         perfis: ['suporte'] },
      { id: 'eventos',    rotulo: 'Supervisao', chave: 'eventos' },
      { id: 'guias',      rotulo: 'Guias',      chave: 'guias' },
      { id: 'gerencial',  rotulo: 'Relatorios G.', chave: 'gerencial' },
      { id: 'auditoria',  rotulo: 'Auditoria',          chave: 'auditoria' },
      { id: 'diagnostico', rotulo: 'Diagnostico',        perfis: ['suporte'] }
    ]
  }
];

async function iniciarApp() {
  const sessao = await exigirSessao();
  if (!sessao) return;

  window.CORTEX_SESSAO = sessao;
  const { profile } = sessao;

  // "Ver como": o suporte pode navegar com o sistema de outro perfil
  profile.perfil_real = profile.perfil;
  let verComo = null;
  try { verComo = sessionStorage.getItem('cortex_ver_como'); } catch (e) {}
  if (profile.perfil_real === 'suporte' && verComo && verComo !== 'suporte') {
    profile.perfil = verComo;
    if (typeof TEMA_POR_PERFIL !== 'undefined' && TEMA_POR_PERFIL[verComo]) {
      document.documentElement.setAttribute('data-tema', TEMA_POR_PERFIL[verComo]);
    }
  }

  await carregarPermissoes(profile.perfil);

  document.getElementById('usuario-nome').textContent = profile.nome;
  document.getElementById('usuario-perfil').innerHTML =
    (ROTULOS_PERFIL[profile.perfil] || profile.perfil) +
    (profile.perfil_real === 'suporte' && profile.perfil !== 'suporte'
      ? ' <span class="ver-como-selo">ver como</span>' : '');
  document.getElementById('avatar').textContent = iniciais(profile.nome);
  if (profile.perfil !== 'familia') {
    const av = document.getElementById('avatar');
    av.style.cursor = 'pointer';
    av.title = 'Meu perfil: dados pessoais e foto';
    av.onclick = () => MODULOS.perfil?.abrir?.();
    if (profile.perfil_real !== 'suporte') {
      const quem = document.getElementById('usuario-cartao');
      quem.style.cursor = 'pointer';
      quem.title = 'Meu perfil: dados pessoais e foto';
      quem.onclick = () => MODULOS.perfil?.abrir?.();
    }
  }

  if (profile.perfil_real === 'suporte') {
    const cartao = document.getElementById('usuario-cartao');
    cartao.classList.add('clicavel-perfil');
    cartao.title = 'Trocar o perfil de visualizacao';
    cartao.onclick = abrirSeletorPerfil;
  }

  montarSidebar(profile.perfil);

  // Primeiro acesso: foto + troca de senha obrigatorias (bloqueante)
  if (window.MODULOS && MODULOS.primeiro && MODULOS.primeiro.precisa(profile)) {
    MODULOS.primeiro.abrir(profile);
  }

  // Avatar com foto (quando houver)
  if (profile.foto_path) {
    sb.storage.from('documentos').createSignedUrl(profile.foto_path, 3600)
      .then(({ data }) => {
        if (data) document.getElementById('avatar').innerHTML =
          '<img src="' + data.signedUrl +
          '" style="width:100%; height:100%; object-fit:cover; border-radius:inherit">';
      });
  }

  // Chat: bolinha de nao-lidas na sidebar + mini-chat flutuante
  if ((perm('chat') !== '' || profile.perfil_real === 'suporte')
      && window.MODULOS && MODULOS.chat) {
    try { MODULOS.chat.iniciarFlutuante(); } catch (e) {}
  }

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

  festejarAniversario(profile);

  if (profile.perfil !== 'familia') {
    setTimeout(() => { MODULOS.programas?.popupEvolucoesPendentes?.(); }, 900);
    setTimeout(() => { MODULOS.agenda?.popupIndicativos?.(); }, 2200);
    setTimeout(() => { MODULOS.eventos?.popupAvisos?.(); }, 3400);
  }
}

function montarSidebar(perfil) {
  const nav = document.getElementById('sidebar-nav');
  nav.innerHTML = '';

  NAVEGACAO.forEach(grupo => {
    const itensVisiveis = grupo.itens.filter(i =>
      i.chave ? perm(i.chave) !== '' : i.perfis.includes(perfil));
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

// Classe de cor do avatar (av-1..av-6) estavel por nome
function corAvatar(nome) {
  let h = 0;
  for (const c of String(nome || '')) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return 'av-' + (h % 6 + 1);
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


// ── "Ver como" (exclusivo do suporte) ───────────────────────────────
function abrirSeletorPerfil() {
  const atual = window.CORTEX_SESSAO.profile.perfil;
  const opcoes = ['suporte', 'direcao', 'coordenador', 'terapeuta', 'aplicador', 'callcenter', 'recepcao', 'familia'];

  abrirModal('Ver o sistema como...',
    '<p class="sub" style="margin-bottom:14px">Voce continua logado como Suporte; apenas a ' +
    'visualizacao (menu, botoes, tema e permissoes) muda. Valido nesta aba do navegador.</p>' +
    opcoes.map(p =>
      '<button type="button" class="opcao-perfil' + (p === atual ? ' atual' : '') + '" ' +
      'onclick="definirVerComo(\'' + p + '\')">' +
      '<b>' + (ROTULOS_PERFIL[p] || p) + '</b>' +
      (p === 'suporte' ? '<small>Acesso total (seu perfil real)</small>' :
       p === 'familia' ? '<small>Portal da familia (sem vinculos, aparece vazio)</small>' :
       '<small>Conforme a matriz de permissoes</small>') +
      (p === atual ? '<span class="selo selo-ok">Atual</span>' : '') +
      '</button>').join(''));
}

function definirVerComo(p) {
  try {
    if (p === 'suporte') sessionStorage.removeItem('cortex_ver_como');
    else sessionStorage.setItem('cortex_ver_como', p);
  } catch (e) {}
  window.location.reload();
}

// ── Permissoes dinamicas (fonte: tabela public.permissoes) ─────────────
// Suporte sempre tem 'E' em tudo. Demais perfis: o que a matriz definir.
let CORTEX_PERMS = {};
let CORTEX_PERM_TUDO = false;

async function carregarPermissoes(perfil) {
  if (perfil === 'suporte') { CORTEX_PERM_TUDO = true; return; }
  if (perfil === 'familia') return; // portal fixo
  const { data } = await sb.from('permissoes')
    .select('chave, nivel').eq('perfil', perfil);
  CORTEX_PERMS = {};
  (data || []).forEach(r => { CORTEX_PERMS[r.chave] = r.nivel; });
}

// perm('pacientes') -> 'E' | 'V' | ''
function perm(chave) {
  if (CORTEX_PERM_TUDO) return 'E';
  return CORTEX_PERMS[chave] || '';
}

// ── Modais (janela suspensa) ────────────────────────────────────────────
// ── Envio de documentos ao portal da familia ──
const ROTULO_DOC_PORTAL = {
  pt: 'Plano Terapeutico', relatorio_mensal: 'Relatorio Mensal',
  avaliacao: 'Relatorio de Avaliacao', pei: 'PEI',
  evolucao_diaria: 'Evolucao Diaria', anamnese: 'Anamnese', outro: 'Documento'
};

function podeEnviarPortal() {
  const p = window.CORTEX_SESSAO?.profile;
  return p && (p.perfil === 'direcao' || p.perfil === 'coordenador');
}

function portalBtn() {
  if (!podeEnviarPortal() || !window._docPortal) return '';
  return '  <button class="btn btn-fantasma" id="btn-enviar-portal" ' +
    'title="Disponibiliza este documento, exatamente como esta, para a familia ver no portal." ' +
    'onclick="enviarDocPortal(this)">&#128228; Enviar ao portal</button>';
}

async function enviarDocPortal(botao) {
  const ctx = window._docPortal;
  const doc = document.querySelector('#doc-eq-overlay .doc-eq, .folha-overlay .doc-eq');
  if (!ctx || !doc) { alert('Documento nao encontrado.'); return; }
  botao.disabled = true; botao.textContent = 'Enviando...';
  const { error } = await sb.from('portal_documentos').insert({
    paciente_id: ctx.paciente_id,
    tipo: ctx.tipo,
    titulo: ctx.titulo,
    html: doc.outerHTML,
    enviado_por: window.CORTEX_SESSAO.user.id
  });
  if (error) { alert(error.message); botao.disabled = false; botao.textContent = '\u{1F4E4} Enviar ao portal'; return; }
  botao.textContent = '\u2713 No portal';
}

const TIPOS_POP = {
  evolucao: { classe: 'pop-evolucao', icone: '&#9998;' },
  agenda:   { classe: 'pop-agenda',   icone: '&#128197;' },
  aviso:    { classe: 'pop-aviso',    icone: '&#128276;' }
};

function abrirModal(titulo, html, larga, tipo) {
  fecharModal();
  const t = TIPOS_POP[tipo];
  const fundo = document.createElement('div');
  fundo.className = 'modal-fundo';
  fundo.id = 'modal-fundo';
  fundo.innerHTML =
    '<div class="modal' + (larga ? ' modal-larga' : '') + (t ? ' ' + t.classe : '') + '" role="dialog" aria-modal="true">' +
    '  <div class="modal-topo">' +
    '    <h3>' + (t ? '<span class="pop-icone">' + t.icone + '</span> ' : '') + titulo + '</h3>' +
    '    <button type="button" class="modal-fechar" onclick="fecharModal()" title="Fechar">&times;</button>' +
    '  </div>' +
    '  <div class="modal-corpo">' + html + '</div>' +
    '</div>';
  fundo.addEventListener('click', e => { if (e.target === fundo) fecharModal(); });
  document.body.appendChild(fundo);
  document.body.style.overflow = 'hidden';
}

// ─────────────── Avisos e confirmacoes em pop-up (nunca alert/confirm do navegador) ───────────────
// Camada propria, acima da janela suspensa e do modal: um aviso dentro de um formulario nao derruba o formulario.
function popBase(titulo, html, tipo) {
  document.getElementById('pop-fundo')?.remove();
  const t = TIPOS_POP[tipo || 'aviso'];
  const fundo = document.createElement('div');
  fundo.className = 'modal-fundo pop-fundo';
  fundo.id = 'pop-fundo';
  fundo.innerHTML =
    '<div class="modal pop-caixa' + (t ? ' ' + t.classe : '') + '" role="alertdialog" aria-modal="true">' +
    '  <div class="modal-topo"><h3>' + (t ? '<span class="pop-icone">' + t.icone + '</span> ' : '') + titulo + '</h3></div>' +
    '  <div class="modal-corpo">' + html + '</div></div>';
  document.body.appendChild(fundo);
  return fundo;
}
function fecharPop() { document.getElementById('pop-fundo')?.remove(); }
function textoPop(msg) {
  return '<p class="pop-texto">' + escaparHtml(String(msg == null ? '' : msg)).replace(/\n/g, '<br>') + '</p>';
}
function popAviso(msg, titulo) {
  popBase(titulo || 'Aviso', textoPop(msg) +
    '<div class="barra-acoes"><button class="btn btn-primario" id="pop-ok" onclick="fecharPop()">Entendi</button></div>', 'aviso');
  setTimeout(() => document.getElementById('pop-ok')?.focus(), 30);
}
function popConfirmar(msg, opcoes) {
  const o = opcoes || {};
  return new Promise(resolve => {
    const fundo = popBase(o.titulo || 'Confirmar', textoPop(msg) +
      '<div class="barra-acoes">' +
      '  <button class="btn btn-fantasma" id="pop-nao">' + (o.cancelar || 'Cancelar') + '</button>' +
      '  <button class="btn btn-primario" id="pop-sim">' + (o.ok || 'Confirmar') + '</button></div>', o.tipo || 'aviso');
    const fim = v => { fundo.remove(); resolve(v); };
    fundo.querySelector('#pop-nao').onclick = () => fim(false);
    fundo.querySelector('#pop-sim').onclick = () => fim(true);
    fundo.addEventListener('keydown', e => { if (e.key === 'Escape') fim(false); });
    setTimeout(() => fundo.querySelector('#pop-sim').focus(), 30);
  });
}
function popCopiar(texto, titulo) {
  popBase(titulo || 'Copie manualmente',
    '<input class="pop-copia" readonly value="' + escaparHtml(texto) + '" onclick="this.select()">' +
    '<div class="barra-acoes"><button class="btn btn-primario" onclick="fecharPop()">Fechar</button></div>', 'aviso');
}
window.alert = msg => popAviso(msg);
window.prompt = (rotulo, texto) => { popCopiar(texto || '', rotulo); return null; };
window.confirm = msg => { console.warn('confirm() bloqueado - use popConfirmar'); popAviso(msg); return false; };

function fecharModal() {
  const m = document.getElementById('modal-fundo');
  if (m) m.remove();
  document.body.style.overflow = '';
}

document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (document.getElementById('pop-fundo')) { fecharPop(); return; }
  fecharModal();
});

// Clicar no fundo escurecido fecha a janela suspensa (com o fechamento certo de cada uma)
document.addEventListener('click', e => {
  const alvo = e.target;
  if (!alvo.classList || !alvo.classList.contains('folha-overlay')) return;
  if (alvo.id === 'plano-elab-overlay' && window.MODULOS?.plano?.fecharConstrutor) {
    MODULOS.plano.fecharConstrutor();
  } else if (alvo.id === 'aval-overlay' && window.MODULOS?.avaliacoes?.fecharJanela) {
    MODULOS.avaliacoes.fecharJanela();
  } else {
    alvo.remove();
  }
});

// Aniversario do usuario: foguetinhos e baloes na primeira entrada do dia
function festejarAniversario(profile) {
  if (!profile.data_nascimento) return;
  const hoje = new Date();
  const hojeMD = String(hoje.getMonth() + 1).padStart(2, '0') + '-' + String(hoje.getDate()).padStart(2, '0');
  if (profile.data_nascimento.slice(5) !== hojeMD) return;
  const chave = 'cortex_niver_' + profile.id + '_' + hoje.getFullYear();
  try { if (localStorage.getItem(chave)) return; localStorage.setItem(chave, '1'); } catch (e) {}

  const festa = document.createElement('div');
  festa.className = 'festa-niver';
  const itens = ['\u{1F388}', '\u{1F389}', '\u{1F38A}', '\u{2728}', '\u{1F388}', '\u{1F386}'];
  let spans = '';
  for (let i = 0; i < 36; i++) {
    spans += '<span style="left:' + Math.round(Math.random() * 96) + '%; ' +
      'animation-delay:' + (Math.random() * 2.2).toFixed(2) + 's; ' +
      'animation-duration:' + (3 + Math.random() * 3).toFixed(2) + 's; ' +
      'font-size:' + (18 + Math.round(Math.random() * 22)) + 'px">' +
      itens[i % itens.length] + '</span>';
  }
  festa.innerHTML = spans +
    '<div class="festa-cartao">\u{1F382} <b>Feliz aniversario, ' +
    escaparHtml(profile.nome.split(' ')[0]) + '!</b><br>' +
    '<small>A equipe Equilibrium te deseja um dia incrivel.</small></div>';
  festa.addEventListener('click', () => festa.remove());
  document.body.appendChild(festa);
  setTimeout(() => festa.remove(), 9000);
}

function abrirModalPdf(titulo, url) {
  // #toolbar=0 esconde a barra de impressao/download; navpanes=0 esconde as miniaturas
  const limpo = url + '#toolbar=0&navpanes=0&view=FitH';
  abrirModal(titulo, '<iframe src="' + limpo + '" title="' + titulo + '"></iframe>', true);
}

document.addEventListener('DOMContentLoaded', iniciarApp);
