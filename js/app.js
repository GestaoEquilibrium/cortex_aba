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
  coordenacao: '<svg ' + SVG_ATTR + '><circle cx="12" cy="7" r="3.5"/><path d="M4 21v-1a5 5 0 0 1 5-5h6a5 5 0 0 1 5 5v1"/><path d="M12 10.5v4"/></svg>',
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
      { id: 'coordenacao', rotulo: 'Coordenacao', chave: 'coordenacao' },
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
  montarBarraCelular(profile);
  carregarAssinaturas();

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
    // Fila de pop-ups da entrada: cada um so aparece depois que o anterior for fechado
    agendarPop(() => MODULOS.programas?.popupEvolucoesPendentes?.(), 900);
    agendarPop(() => MODULOS.agenda?.popupIndicativos?.(), 1200);
    agendarPop(() => MODULOS.eventos?.popupAvisos?.(), 1500);
    agendarPop(() => MODULOS.programas?.popupEquipe?.(), 1800);
    // instalacao no celular / notificacoes (entra na fila, depois dos avisos do dia)
    agendarPop(() => window.PWA && PWA.instalado() ? PWA.pedirNotificacoes() : null, 2200);
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

// ─────────────── CELULAR: barra inferior + cabecalho + folha "Mais" ───────────────
// Mesmos icones do sistema (ICONES). Ate 720px a sidebar some e esta barra assume.
const BARRA_CELULAR = [
  { id: 'inicio',    rotulo: 'Inicio' },
  { id: 'agenda',    rotulo: 'Agenda' },
  { id: 'pacientes', rotulo: 'Criancas' },
  { id: 'aplicar',   rotulo: 'Aplicar', acao: 'aplicarHoje' },
  { id: 'mais',      rotulo: 'Mais',   acao: 'menuMais' }
];
function montarBarraCelular(profile) {
  document.getElementById('barra-celular')?.remove();
  document.getElementById('cab-celular')?.remove();
  if (profile.perfil === 'familia') { montarBarraFamilia(); return; }
  const permitido = id => NAVEGACAO.some(g => g.itens.some(i => i.id === id && (i.chave ? perm(i.chave) !== '' : i.perfis.includes(profile.perfil))));
  const cab = document.createElement('header');
  cab.className = 'cab-celular'; cab.id = 'cab-celular';
  cab.innerHTML = '<div class="cab-cel-marca">' + document.querySelector('.marca .simbolo').outerHTML + '<b>CORTEX <span class="mao">aba</span></b></div>' +
    '<div class="cab-cel-tit" id="cab-cel-tit"></div>' +
    '<button class="cab-cel-avatar" onclick="MODULOS.perfil?.abrir?.()" title="Meu perfil">' + document.getElementById('avatar').innerHTML + '</button>';
  document.body.appendChild(cab);
  const nav = document.createElement('nav');
  nav.className = 'barra-celular'; nav.id = 'barra-celular';
  nav.innerHTML = BARRA_CELULAR.filter(b => b.acao || permitido(b.id)).map(b =>
    '<button type="button" data-cel="' + b.id + '" onclick="' + (b.acao ? b.acao + '()' : 'abrirModulo(\'' + b.id + '\')') + '">' +
    '<span class="icone">' + (ICONES[b.id] || ICONES_CEL[b.id] || '') + '</span><span>' + b.rotulo + '</span></button>').join('');
  document.body.appendChild(nav);
  marcarBarraCelular(window._moduloAtual || 'inicio');
}
const ICONES_CEL = window.ICONES_CEL = {
  documentos: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h9l4 4v14H6z"/><path d="M14.5 3v4.5H19"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="15" y2="16"/></svg>',
  caderninho: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3" width="14" height="18" rx="2"/><line x1="8" y1="3" x2="8" y2="21"/><line x1="11" y1="8" x2="16" y2="8"/><line x1="11" y1="12" x2="16" y2="12"/></svg>',
  conversa: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16v11H9l-5 4z"/></svg>',
  sair: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 4H5v16h5"/><path d="M14 8l4 4-4 4"/><line x1="18" y1="12" x2="9" y2="12"/></svg>',
  aplicar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M10 8.5v7l5.5-3.5z"/></svg>',
  mais:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/></svg>'
};
// Portal da familia no celular: cabecalho + barra propria (Inicio, Documentos, Caderninho, Conversa, Mais)
function montarBarraFamilia() {
  const cab = document.createElement('header');
  cab.className = 'cab-celular'; cab.id = 'cab-celular';
  cab.innerHTML = '<div class="cab-cel-marca">' + document.querySelector('.marca .simbolo').outerHTML + '<b>Equilibrium <span class="mao">fam&iacute;lia</span></b></div>' +
    '<div class="cab-cel-tit" id="cab-cel-tit">Portal da familia</div>' +
    '<button class="cab-cel-avatar" onclick="menuMaisFamilia()" title="Menu">' + document.getElementById('avatar').innerHTML + '</button>';
  document.body.appendChild(cab);
  const nav = document.createElement('nav');
  nav.className = 'barra-celular'; nav.id = 'barra-celular';
  const P = "MODULOS.portal";
  nav.innerHTML = [
    ['portal', 'Inicio', "abrirModulo('portal')", ICONES.inicio],
    ['documentos', 'Documentos', P + ".atalho('docs')", ICONES_CEL.documentos],
    ['caderninho', 'Caderninho', P + ".atalho('caderninho')", ICONES_CEL.caderninho],
    ['conversa', 'Conversa', P + ".atalho('conversa')", ICONES_CEL.conversa],
    ['mais', 'Mais', 'menuMaisFamilia()', ICONES_CEL.mais]
  ].map(([id, rot, acao, ic]) => '<button type="button" data-cel="' + id + '" onclick="' + acao + '"><span class="icone">' + ic + '</span><span>' + rot + '</span></button>').join('');
  document.body.appendChild(nav);
  marcarBarraCelular('portal');
}
function menuMaisFamilia() {
  document.getElementById('folha-mais')?.remove();
  const f = document.createElement('div');
  f.className = 'folha-mais'; f.id = 'folha-mais';
  const item = (ic, rot, acao) => '<button class="nav-item" onclick="document.getElementById(\'folha-mais\').remove(); ' + acao + '"><span class="icone">' + ic + '</span><span>' + rot + '</span></button>';
  f.innerHTML = '<div class="folha-mais-fundo" onclick="document.getElementById(\'folha-mais\').remove()"></div>' +
    '<div class="folha-mais-corpo"><div class="folha-mais-puxador"></div>' +
    item(ICONES.anamnese, 'Anamnese Global', "abrirModulo('anamnese')") +
    item(ICONES.agenda, 'Agenda e presencas', "MODULOS.portal.atalho('agenda')") +
    item(ICONES.termos, 'Termos e aceites', "MODULOS.portal.atalho('termos')") +
    item(ICONES.admin, 'Meu perfil', "MODULOS.perfil?.abrir?.()") +
    item(ICONES_CEL.sair, 'Sair', 'sair()') + '</div>';
  document.body.appendChild(f);
  marcarBarraCelular('mais');
}
function marcarBarraCelular(id) {
  document.querySelectorAll('.barra-celular button').forEach(b => b.classList.toggle('ativo', b.dataset.cel === id));
  const t = document.getElementById('cab-cel-tit');
  if (t) { const item = NAVEGACAO.flatMap(g => g.itens).find(i => i.id === id); t.textContent = item ? item.rotulo : ''; }
}
// "Mais": folha com o menu completo (mesmos itens e icones da sidebar)
function menuMais() {
  document.getElementById('folha-mais')?.remove();
  const f = document.createElement('div');
  f.className = 'folha-mais'; f.id = 'folha-mais';
  f.innerHTML = '<div class="folha-mais-fundo" onclick="document.getElementById(\'folha-mais\').remove()"></div>' +
    '<div class="folha-mais-corpo"><div class="folha-mais-puxador"></div>' +
    document.getElementById('sidebar-nav').innerHTML +
    '<button class="nav-item" onclick="document.getElementById(\'folha-mais\').remove(); sair()"><span class="icone">' +
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 4H5v16h5"/><path d="M14 8l4 4-4 4"/><line x1="18" y1="12" x2="9" y2="12"/></svg></span><span>Sair</span></button></div>';
  document.body.appendChild(f);
  f.querySelectorAll('a.nav-item').forEach(a => a.addEventListener('click', e => { e.preventDefault(); f.remove(); abrirModulo(a.dataset.modulo); }));
  marcarBarraCelular('mais');
}
// "Aplicar": sessoes de hoje do aplicador, um toque para abrir a ficha
async function aplicarHoje() {
  marcarBarraCelular('aplicar');
  const pagina = document.getElementById('pagina');
  window._moduloAtual = 'aplicar';
  const t = document.getElementById('cab-cel-tit'); if (t) t.textContent = 'Aplicar hoje';
  pagina.innerHTML = '<div class="cartao"><p class="sub">Buscando as sessoes de hoje...</p></div>';
  const d = new Date();
  const hoje = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const eu = window.CORTEX_SESSAO.user.id;
  let { data: sess } = await sb.from('sessoes')
    .select('id, hora_inicio, status, paciente_id, aplicador_id, pacientes(nome, foto_path)')
    .eq('data', hoje).not('status', 'in', '("cancelada")').order('hora_inicio');
  sess = sess || [];
  if (ehEquipe()) { const meus = await meusPacientesIds(); sess = sess.filter(s => s.aplicador_id === eu || meus.has(s.paciente_id)); }
  const ST = { agendada: ['selo-neutro', 'agendada'], checkin: ['selo-info', 'chegou'], em_atendimento: ['selo-warn', 'em atendimento'], concluida: ['selo-ok', 'concluida'], falta: ['selo-bad', 'falta'] };
  pagina.innerHTML = '<div class="pagina-cabecalho"><div><h2>Aplicar hoje</h2><p class="sub">' + d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }) + ' &middot; ' + sess.length + ' sessao(oes)</p></div></div>' +
    (sess.length ? sess.map(s => {
      const st = ST[s.status] || ['selo-neutro', s.status];
      return '<div class="cartao cel-sessao" onclick="' + (s.status === 'concluida' ? 'MODULOS.programas.docEvolucaoDiaria(\'' + s.id + '\')' : 'MODULOS.programas.abrirFolha(\'' + s.id + '\', true)') + '">' +
        '<div class="avatar-paciente ' + corAvatar(s.pacientes.nome) + '">' + s.pacientes.nome.split(' ').slice(0, 2).map(x => x[0]).join('').toUpperCase() + '</div>' +
        '<div class="cel-sessao-txt"><b>' + escaparHtml(s.pacientes.nome) + '</b><small>' + String(s.hora_inicio).slice(0, 5) + (s.status === 'concluida' ? ' &middot; encerrada &middot; toque para ver o relatorio' : ' &middot; toque para abrir a ficha') + '</small></div>' +
        '<span class="selo ' + st[0] + '">' + st[1] + '</span></div>';
    }).join('') : '<div class="cartao"><div class="vazio"><strong>Nenhuma sessao hoje</strong>Quando houver, ela aparece aqui e um toque abre a ficha.</div></div>');
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
  window._moduloAtual = id;
  if (typeof marcarBarraCelular === 'function') marcarBarraCelular(id);
  document.getElementById('folha-mais')?.remove();
  window.scrollTo(0, 0);

  const modulo = window.MODULOS[id];
  if (modulo && typeof modulo.render === 'function') {
    modulo.render(pagina, window.CORTEX_SESSAO);
    if (['pacientes', 'agenda', 'auditoria', 'eventos', 'presenca', 'faltas'].includes(id)) ESCOPO.montar(pagina);
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

// ─────────────── Assinaturas digitais (imagem por profissional) ───────────────
// Carregadas uma vez por sessao como data-URL (entram inteiras nos documentos e nos snapshots travados).
window.ASSINATURAS = {};
async function carregarAssinaturas() {
  try {
    const { data } = await sb.from('profiles').select('nome, assinatura_path').not('assinatura_path', 'is', null);
    for (const p of data || []) {
      try {
        const { data: blob } = await sb.storage.from('documentos').download(p.assinatura_path);
        if (!blob) continue;
        const url = await new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(blob); });
        window.ASSINATURAS[normalizarNomeAss(p.nome)] = url;
      } catch (e) { /* segue sem esta */ }
    }
  } catch (e) { /* coluna ainda nao existe: sem assinaturas */ }
}
function normalizarNomeAss(n) { return String(n || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); }
// bloco de assinatura dos documentos: imagem (se houver) + nome + titulo
function blocoAssinatura(nome, titulo) {
  const img = window.ASSINATURAS[normalizarNomeAss(nome)];
  return '<div class="deq-assinatura' + (img ? ' com-imagem' : '') + '">' +
    (img ? '<img class="deq-assinatura-img" src="' + img + '" alt=""><span class="deq-ass-linha"></span>' : '') +
    escaparHtml(nome || '') + (titulo ? '<br><small>' + titulo + '</small>' : '') + '</div>';
}

// Datas de HOJE em horario local (toISOString e UTC: a partir das 21h no Brasil ja virava "amanha")
function hojeLocal() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function mesLocal() { return hojeLocal().slice(0, 7); }

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
// Subchaves ('programas.atribuir') herdam do modulo ('programas') enquanto nao forem definidas.
function perm(chave) {
  if (CORTEX_PERM_TUDO) return 'E';
  if (CORTEX_PERMS[chave] !== undefined) return CORTEX_PERMS[chave] || '';
  const i = chave.indexOf('.');
  if (i > 0) return CORTEX_PERMS[chave.slice(0, i)] || '';
  return '';
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
  if (!p) return false;
  if (CORTEX_PERM_TUDO) return true;
  return perm('relatorios.portal') === 'E';
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

// Pop-ups da entrada em fila: espera nao haver modal/pop aberto (ate ~3 min) antes de chamar
function agendarPop(fn, atraso) {
  const tentar = n => {
    if (document.getElementById('modal-fundo') || document.getElementById('pop-fundo') || window._popOcupado) {
      if (n < 90) setTimeout(() => tentar(n + 1), 2000);
      return;
    }
    window._popOcupado = true;
    Promise.resolve(fn()).finally(() => { window._popOcupado = false; });
  };
  setTimeout(() => tentar(0), atraso);
}

// ─────────────── Impressao: rodape no pe de TODAS as paginas ───────────────
// O Chrome nao respeita position:fixed dentro das margens do papel, mas repete <tfoot> em cada
// pagina e reserva o espaco. Na hora de imprimir, cada documento vira uma tabela com o rodape no tfoot;
// depois volta ao normal.
window.addEventListener('beforeprint', () => {
  document.querySelectorAll('.doc-eq').forEach(doc => {
    if (doc.dataset.tabelado) return;
    const rod = Array.from(doc.children).find(c => c.classList.contains('deq-rodape'));
    if (!rod) return;
    const tb = document.createElement('table'); tb.className = 'deq-pagina';
    const tfoot = document.createElement('tfoot'); const trf = document.createElement('tr'); const tdf = document.createElement('td');
    const tbody = document.createElement('tbody'); const trb = document.createElement('tr'); const tdb = document.createElement('td');
    Array.from(doc.children).forEach(c => { if (c !== rod) tdb.appendChild(c); });
    tdf.appendChild(rod); trf.appendChild(tdf); tfoot.appendChild(trf); trb.appendChild(tdb); tbody.appendChild(trb);
    tb.appendChild(tfoot); tb.appendChild(tbody);
    doc.appendChild(tb); doc.dataset.tabelado = '1';
  });
});
window.addEventListener('afterprint', () => {
  document.querySelectorAll('.doc-eq[data-tabelado]').forEach(doc => {
    const tb = doc.querySelector(':scope > table.deq-pagina'); if (!tb) return;
    const tdb = tb.querySelector('tbody > tr > td'), tdf = tb.querySelector('tfoot > tr > td');
    Array.from(tdb.children).forEach(c => doc.appendChild(c));
    Array.from(tdf.children).forEach(c => doc.appendChild(c));
    tb.remove(); delete doc.dataset.tabelado;
  });
});

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

// ─────────────── Carteira do aplicador: pacientes onde ele e principal OU esta em paciente_aplicadores ───────────────
async function meusPacientesIds(forcar) {
  if (window._meusPac && !forcar) return window._meusPac;
  const eu = window.CORTEX_SESSAO.user.id;
  const [a, b] = await Promise.all([
    sb.from('pacientes').select('id').eq('aplicador_id', eu),
    sb.from('paciente_aplicadores').select('paciente_id').eq('aplicador_id', eu)
  ]);
  window._meusPac = new Set([...(a.data || []).map(x => x.id), ...(b.data || []).map(x => x.paciente_id)]);
  return window._meusPac;
}
function ehEquipe() { return ['aplicador', 'terapeuta'].includes(window.CORTEX_SESSAO?.profile?.perfil); }

// ─────────────── ESCOPO DA COORDENADORA: "Minha equipe" (padrao) ou "Geral" ───────────────
// Equipe = criancas com pacientes.coordenador_id = eu + criancas dos aplicadores cujo profiles.coordenador_id = eu.
// Vale para Pacientes, Agenda, Auditoria, Supervisao, Lista de Presenca e Faltas. A escolha fica guardada no navegador.
const ESCOPO = {
  ehCoord() { return window.CORTEX_SESSAO?.profile?.perfil === 'coordenador'; },
  ativo() {
    if (!this.ehCoord()) return false;
    if (CORTEX_PERMS['coordenacao.geral'] === '') return true;
    try { return localStorage.getItem('cortex_escopo') !== 'geral'; } catch (e) { return true; }
  },
  async carregar(forcar, coordId) {
    if (window._equipe && !forcar && !coordId) return window._equipe;
    const eu = coordId || window.CORTEX_SESSAO.user.id;
    const [rProf, rPac, rPa, rEm] = await Promise.all([
      sb.from('profiles').select('id, nome, coordenador_id').eq('ativo', true),
      sb.from('pacientes').select('id, coordenador_id, aplicador_id').neq('status', 'encerrado'),
      sb.from('paciente_aplicadores').select('paciente_id, aplicador_id'),
      sb.from('equipe_membros').select('coordenador_id, aplicador_id').eq('coordenador_id', eu)
    ]);
    const apl = new Set((rProf.data || []).filter(p => p.coordenador_id === eu).map(p => p.id));
    (rEm.data || []).forEach(x => apl.add(x.aplicador_id));
    const pacs = new Set();
    (rPac.data || []).forEach(p => { if (p.coordenador_id === eu || apl.has(p.aplicador_id)) pacs.add(p.id); });
    (rPa.data || []).forEach(x => { if (apl.has(x.aplicador_id)) pacs.add(x.paciente_id); });
    // aplicadores que atendem criancas da equipe tambem contam como equipe
    (rPac.data || []).forEach(p => { if (pacs.has(p.id) && p.aplicador_id) apl.add(p.aplicador_id); });
    (rPa.data || []).forEach(x => { if (pacs.has(x.paciente_id)) apl.add(x.aplicador_id); });
    const eq = { pacientes: pacs, aplicadores: apl, nomes: Object.fromEntries((rProf.data || []).map(p => [p.id, p.nome])) };
    if (!coordId) window._equipe = eq;
    return eq;
  },
  async pacs(lista, campo) {
    if (!this.ativo()) return lista;
    const eq = await this.carregar();
    return (lista || []).filter(r => eq.pacientes.has(r[campo || 'paciente_id']));
  },
  async apls(lista, campo, permitirVazio) {
    if (!this.ativo()) return lista;
    const eq = await this.carregar();
    const eu = window.CORTEX_SESSAO.user.id;
    return (lista || []).filter(r => {
      const v = r[campo || 'aplicador_id'];
      return v === eu || eq.aplicadores.has(v) || (permitirVazio && !v);
    });
  },
  alternar(valor) {
    try { localStorage.setItem('cortex_escopo', valor); } catch (e) {}
    if (window._moduloAtual) abrirModulo(window._moduloAtual);
  },
  html() {
    if (!this.ehCoord()) return '';
    if (CORTEX_PERMS['coordenacao.geral'] === '') return '';   // so some quando NEGADO explicitamente em Permissoes
    const eq = this.ativo();
    return '<div class="toggle-visao escopo-toggle" title="Ver so a minha equipe ou tudo">' +
      '<button type="button" class="' + (eq ? 'ativo' : '') + '" onclick="ESCOPO.alternar(\'equipe\')">Minha equipe</button>' +
      '<button type="button" class="' + (!eq ? 'ativo' : '') + '" onclick="ESCOPO.alternar(\'geral\')">Geral</button></div>';
  },
  // encaixa o botao no cabecalho da pagina assim que ele existir
  montar(pagina) {
    if (!this.ehCoord()) return;
    let n = 0;
    const tenta = () => {
      const cab = pagina.querySelector('.pagina-cabecalho');
      if (cab) { if (!cab.querySelector('.escopo-toggle')) cab.insertAdjacentHTML('beforeend', this.html()); return; }
      if (++n < 30) setTimeout(tenta, 120);
    };
    tenta();
  }
};

// ─────────────── Cadeia clinica: avaliacao -> plano -> PEI -> programas ───────────────
// Regra de Wess: nunca bloqueia; sem a etapa anterior, avisa em pop-up e segue se a pessoa quiser.
// O vinculo (avaliacao_id / plano_id / pei_id) e gravado sempre que a etapa anterior existe.
const CADEIA = {
  async ultimaAvaliacao(pacienteId) {
    const { data } = await sb.from('avaliacoes').select('id, protocolo, concluido_em')
      .eq('paciente_id', pacienteId).eq('status', 'concluida')
      .order('concluido_em', { ascending: false }).limit(1);
    return data && data[0] ? data[0] : null;
  },
  async planoAtivo(pacienteId) {
    const { data } = await sb.from('planos_terapeuticos').select('id, vigencia_inicio, vigencia_fim')
      .eq('paciente_id', pacienteId).eq('status', 'ativo')
      .order('criado_em', { ascending: false }).limit(1);
    return data && data[0] ? data[0] : null;
  },
  async peiAtivo(pacienteId) {
    const { data } = await sb.from('peis').select('id, periodo_inicio, periodo_fim')
      .eq('paciente_id', pacienteId).eq('status', 'ativo')
      .order('criado_em', { ascending: false }).limit(1);
    return data && data[0] ? data[0] : null;
  },
  nomeProtocolo(p) { return p === 'ss' ? 'Socially Savvy' : p === 'portage' ? 'Portage' : 'QADI-R'; },
  // faltas = lista de textos das etapas ausentes; retorna true para seguir
  async avisar(etapa, faltas) {
    if (!faltas.length) return true;
    return popConfirmar('Para elaborar ' + etapa + ' o esperado e ter antes:\n' +
      faltas.map(f => '\u2022 ' + f).join('\n') +
      '\n\nVoce pode seguir mesmo assim - o vinculo com a etapa anterior ficara em branco e os relatorios vao apontar isso.',
      { titulo: 'Etapa anterior em falta', ok: 'Seguir mesmo assim', cancelar: 'Voltar', tipo: 'aviso' });
  }
};
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
