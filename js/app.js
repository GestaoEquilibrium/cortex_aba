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
      { id: 'coordenacao', rotulo: 'Coordenacao', chave: 'coordenacao', perfis: ['coordenador', 'direcao', 'suporte'] },
      { id: 'presenca', rotulo: 'Lista de Presenca',  chave: 'presenca' },
      { id: 'faltas',   rotulo: 'Gestao de Faltas',   chave: 'faltas' },
      { id: 'termos',   rotulo: 'Termos digitais',    chave: 'termos' },
      { id: 'rh',       rotulo: 'RH',                 chave: 'rh' },
      { id: 'chat',       rotulo: 'Chat',               chave: 'chat' },
      { id: 'admin',      rotulo: 'Usuarios e Acessos', perfis: ['direcao','coordenador','suporte'] },
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

  // Patch 31: "Entrar como pessoa" — suporte e direcao veem o sistema exatamente como um usuario
  // especifico (equipe, agenda, pendencias, permissoes do perfil dele), em modo somente visualizacao.
  let verUsuario = null;
  try { verUsuario = sessionStorage.getItem('cortex_ver_usuario'); } catch (e) {}
  if (verUsuario && ['suporte', 'direcao'].includes(profile.perfil_real) && verUsuario !== sessao.user.id) {
    const { data: alvo } = await sb.from('profiles').select('id, nome, perfil, foto_path').eq('id', verUsuario).maybeSingle();
    if (alvo) {
      window.CORTEX_VER_USUARIO = { id: alvo.id, nome: alvo.nome, perfil: alvo.perfil, meuId: sessao.user.id, meuNome: profile.nome };
      sessao.user = Object.assign({}, sessao.user, { id: alvo.id });
      profile.id = alvo.id; profile.nome = alvo.nome; profile.perfil = alvo.perfil; profile.foto_path = alvo.foto_path; profile.primeiro_acesso = false;
      if (typeof TEMA_POR_PERFIL !== 'undefined') document.documentElement.setAttribute('data-tema', TEMA_POR_PERFIL[alvo.perfil] || 'gestao');
      bloquearEscrita();
    } else { try { sessionStorage.removeItem('cortex_ver_usuario'); } catch (e) {} }
  }

  await carregarPermissoes(profile.perfil);
  await carregarDataPendencias();

  document.getElementById('usuario-nome').textContent = profile.nome;
  document.getElementById('usuario-perfil').innerHTML =
    (ROTULOS_PERFIL[profile.perfil] || profile.perfil) +
    (profile.perfil_real === 'suporte' && profile.perfil !== 'suporte' && !window.CORTEX_VER_USUARIO
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
    cartao.title = 'Trocar o perfil de visualizacao ou entrar como uma pessoa';
    cartao.onclick = abrirSeletorPerfil;
  } else if (profile.perfil_real === 'direcao') {
    // direcao: a linha do perfil abre "Entrar como pessoa" (o avatar continua abrindo Meu Perfil)
    const lp = document.getElementById('usuario-perfil');
    lp.style.cursor = 'pointer'; lp.title = 'Ver o sistema como uma pessoa da equipe';
    lp.onclick = ev => { ev.stopPropagation(); abrirSeletorPerfil(); };
  }
  if (window.CORTEX_VER_USUARIO) {
    document.getElementById('usuario-perfil').innerHTML += ' <span class="ver-como-selo">ver como</span>';
    montarBarraVerUsuario();
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

  // Patch 31: trava de acesso (a direcao configura em Meu perfil > Trava de acesso).
  // Enquanto a palavra certa nao for digitada, nada do sistema pode ser usado.
  if (!window.CORTEX_VER_USUARIO && profile.perfil !== 'familia') await TRAVA.verificar();

  abrirModulo(profile.perfil === 'familia' ? 'portal' : 'inicio');

  festejarAniversario(profile);

  if (profile.perfil !== 'familia') {
    // Patch 31: nenhum pop-up de pendencia abre sozinho na entrada. Tudo fica na Central de avisos
    // (sino flutuante com contador; no celular, sino no cabecalho) e abre quando a pessoa quiser.
    try { MODULOS.avisos?.iniciar?.(); } catch (e) { console.warn('avisos:', e); }
    // instalacao no celular / notificacoes push: continua pedindo uma vez, sozinho
    agendarPop(() => window.PWA && PWA.instalado() ? PWA.pedirNotificacoes() : null, 2200);
  }
}

// ─────────────── TRAVA DE ACESSO (patch 31) ───────────────
// A direcao escolhe quem fica travado e a palavra (tabela travas_acesso; a palavra nunca chega ao
// navegador - a conferencia e feita no banco pela RPC fn_trava_tentar). Enquanto travado, uma
// tela com cadeado cobre o sistema inteiro e nao fecha.
const TRAVA = {
  _ok: null,
  async verificar() {
    let st = null;
    try { const r = await sb.rpc('fn_trava_status'); st = r.data; } catch (e) { return; }
    if (!st || !st.travada) return;
    return new Promise(resolve => { this._ok = resolve; this.mostrar(st); });
  },
  mostrar(st) {
    document.getElementById('trava-overlay')?.remove();
    const ov = document.createElement('div');
    ov.id = 'trava-overlay'; ov.className = 'trava-overlay';
    ov.innerHTML =
      '<div class="trava-caixa" role="dialog" aria-modal="true">' +
      '  <div class="trava-cadeado"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10.5" width="16" height="10.5" rx="2.5"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/><circle cx="12" cy="15.5" r="1.3" fill="currentColor" stroke="none"/><path d="M12 16.8v1.7"/></svg></div>' +
      '  <h2>Acesso bloqueado</h2>' +
      '  <p>' + escaparHtml(st.mensagem || 'Para continuar, informe a senha do banco de dados fornecida pela direcao.') + '</p>' +
      '  <form onsubmit="event.preventDefault(); TRAVA.tentar()">' +
      '    <input type="password" id="trava-palavra" autocomplete="off" placeholder="Senha" autofocus>' +
      '    <button type="submit" class="btn btn-primario" id="trava-btn">Desbloquear</button>' +
      '  </form>' +
      '  <div class="trava-erro" id="trava-erro"></div>' +
      '  <small>Equilibrium Terapia Infantil &middot; CORTEX aba</small>' +
      '</div>';
    document.body.appendChild(ov);
    document.body.classList.add('travado');
    setTimeout(() => document.getElementById('trava-palavra')?.focus(), 50);
    // nada fora da caixa recebe teclado nem clique enquanto travado
    this._guarda = ev => { if (document.getElementById('trava-overlay') && !ev.target.closest('#trava-overlay')) { ev.stopPropagation(); ev.preventDefault(); document.getElementById('trava-palavra')?.focus(); } };
    ['keydown', 'mousedown', 'click', 'focusin'].forEach(t => document.addEventListener(t, this._guarda, true));
  },
  async tentar() {
    const inp = document.getElementById('trava-palavra'); const erro = document.getElementById('trava-erro'); const btn = document.getElementById('trava-btn');
    const palavra = (inp.value || '').trim(); if (!palavra) { inp.focus(); return; }
    btn.disabled = true; btn.textContent = 'Verificando...'; erro.textContent = '';
    let r; try { r = await sb.rpc('fn_trava_tentar', { p_palavra: palavra }); } catch (e) { r = { error: e }; }
    const d = r.data || {};
    if (r.error || !d.ok) {
      btn.disabled = false; btn.textContent = 'Desbloquear';
      erro.textContent = r.error ? 'Nao foi possivel verificar agora. Tente de novo.' : 'Senha incorreta.' + (d.tentativas ? ' (' + d.tentativas + 'a tentativa)' : '');
      inp.value = ''; inp.focus();
      const cx = document.querySelector('.trava-caixa'); if (cx) { cx.classList.remove('treme'); void cx.offsetWidth; cx.classList.add('treme'); }
      return;
    }
    ['keydown', 'mousedown', 'click', 'focusin'].forEach(t => document.removeEventListener(t, this._guarda, true));
    document.body.classList.remove('travado');
    const ov = document.getElementById('trava-overlay'); if (ov) { ov.classList.add('saindo'); setTimeout(() => ov.remove(), 350); }
    if (this._ok) { this._ok(); this._ok = null; }
  }
};

function montarSidebar(perfil) {
  const nav = document.getElementById('sidebar-nav');
  nav.innerHTML = '';

  NAVEGACAO.forEach(grupo => {
    const itensVisiveis = grupo.itens.filter(i =>
      i.chave ? (CORTEX_PERMS[i.chave] === undefined && i.perfis ? i.perfis.includes(perfil) : perm(i.chave) !== '') : i.perfis.includes(perfil));
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
  if (window.TRANS) TRANS.prepararMenu();   // patch 32: pilula que desliza entre os itens
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
  const permitido = id => NAVEGACAO.some(g => g.itens.some(i => i.id === id && (i.chave ? (CORTEX_PERMS[i.chave] === undefined && i.perfis ? i.perfis.includes(profile.perfil) : perm(i.chave) !== '') : i.perfis.includes(profile.perfil))));
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

// Patch 32: a troca de tela passa pela camada de transicoes (js/transicoes.js), quando houver
function abrirModulo(id) {
  if (window.TRANS) { TRANS.trocarTela(() => abrirModuloAgora(id)); return; }
  abrirModuloAgora(id);
}
function abrirModuloAgora(id) {
  document.querySelectorAll('.nav-item').forEach(n =>
    n.classList.toggle('ativa', n.dataset.modulo === id));

  const pagina = document.getElementById('pagina');
  pagina.innerHTML = '';
  window._moduloAtual = id;
  if (typeof marcarBarraCelular === 'function') marcarBarraCelular(id);
  document.getElementById('folha-mais')?.remove();
  window.scrollTo(0, 0);

  const modulo = window.MODULOS[id];
  ESCOPO.parar();
  if (modulo && typeof modulo.render === 'function') {
    modulo.render(pagina, window.CORTEX_SESSAO);
    if (['pacientes', 'agenda', 'auditoria', 'eventos', 'presenca', 'faltas', 'avaliacoes'].includes(id)) ESCOPO.montar(pagina);
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
async function abrirSeletorPerfil() {
  const atual = window.CORTEX_SESSAO.profile.perfil;
  const real = window.CORTEX_SESSAO.profile.perfil_real;
  const opcoes = ['suporte', 'direcao', 'coordenador', 'terapeuta', 'aplicador', 'callcenter', 'recepcao', 'familia'];
  const vu = window.CORTEX_VER_USUARIO;

  // pessoas da equipe (sem familia), para "entrar como"
  const { data: pessoas } = await sb.from('profiles').select('id, nome, perfil').eq('ativo', true).neq('perfil', 'familia').order('nome');
  const meuId = vu ? vu.meuId : window.CORTEX_SESSAO.user.id;
  const htmlPessoa =
    '<h3 style="margin:0 0 6px">Entrar como uma pessoa</h3>' +
    '<p class="sub" style="margin-bottom:8px">Voce ve o sistema exatamente como essa pessoa ve (equipe, agenda, pendencias, permissoes do perfil dela), em <b>modo somente visualizacao</b>: nada e gravado enquanto estiver assim.</p>' +
    (vu ? '<div class="caixa-info" style="margin-bottom:8px; border-left:4px solid var(--st-warn)"><small>Agora vendo como</small><b>' + escaparHtml(vu.nome) + ' <span class="sub">(' + (ROTULOS_PERFIL[vu.perfil] || vu.perfil) + ')</span></b>' +
          '<div style="margin-top:6px"><button type="button" class="btn btn-primario" onclick="sairVerUsuario()">Voltar a ser ' + escaparHtml(vu.meuNome.split(' ')[0]) + '</button></div></div>' : '') +
    '<div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-bottom:14px">' +
    '<select id="vu-pessoa" style="flex:1; min-width:220px"><option value="">Escolha a pessoa...</option>' +
    (pessoas || []).filter(x => x.id !== meuId).map(x => '<option value="' + x.id + '"' + (vu && vu.id === x.id ? ' selected' : '') + '>' + escaparHtml(x.nome) + ' - ' + (ROTULOS_PERFIL[x.perfil] || x.perfil) + '</option>').join('') + '</select>' +
    '<button type="button" class="btn btn-primario" onclick="definirVerUsuario(document.getElementById(\'vu-pessoa\').value)">Ver como esta pessoa</button></div>';

  const htmlPerfil = real === 'suporte'
    ? '<h3 style="margin:0 0 6px">Ou so trocar o perfil</h3>' +
      '<p class="sub" style="margin-bottom:10px">Voce continua logado como Suporte; apenas a visualizacao (menu, botoes, tema e permissoes) muda. Valido nesta aba do navegador.</p>' +
      opcoes.map(p =>
        '<button type="button" class="opcao-perfil' + (p === atual && !vu ? ' atual' : '') + '" ' +
        'onclick="definirVerComo(\'' + p + '\')">' +
        '<b>' + (ROTULOS_PERFIL[p] || p) + '</b>' +
        (p === 'suporte' ? '<small>Acesso total (seu perfil real)</small>' :
         p === 'familia' ? '<small>Portal da familia (sem vinculos, aparece vazio)</small>' :
         '<small>Conforme a matriz de permissoes</small>') +
        (p === atual && !vu ? '<span class="selo selo-ok">Atual</span>' : '') +
        '</button>').join('')
    : '';

  abrirModal('Ver o sistema como...', htmlPessoa + htmlPerfil, true);
}

function definirVerUsuario(id) {
  if (!id) { popAviso('Escolha a pessoa.'); return; }
  try { sessionStorage.setItem('cortex_ver_usuario', id); sessionStorage.removeItem('cortex_ver_como'); } catch (e) {}
  window.location.reload();
}
function sairVerUsuario() {
  try { sessionStorage.removeItem('cortex_ver_usuario'); } catch (e) {}
  window.location.reload();
}

// Barra fixa no topo enquanto estiver vendo como outra pessoa
function montarBarraVerUsuario() {
  const vu = window.CORTEX_VER_USUARIO; if (!vu) return;
  document.getElementById('ver-usuario-barra')?.remove();
  const b = document.createElement('div');
  b.id = 'ver-usuario-barra'; b.className = 'ver-usuario-barra';
  b.innerHTML = '<span>&#128065; Vendo como <b>' + escaparHtml(vu.nome) + '</b> <small>(' + (ROTULOS_PERFIL[vu.perfil] || vu.perfil) + ')</small> &middot; somente visualizacao</span>' +
    '<button type="button" onclick="sairVerUsuario()">Voltar a ser ' + escaparHtml(vu.meuNome.split(' ')[0]) + '</button>';
  document.body.appendChild(b);
  document.body.classList.add('ver-usuario');
}

// Em "ver como pessoa" nada pode ser gravado: insert/update/delete/upsert, RPCs de escrita e uploads
// voltam um erro amigavel em vez de ir ao banco (que gravaria em nome do usuario real).
function bloquearEscrita() {
  const quem = () => (window.CORTEX_VER_USUARIO ? window.CORTEX_VER_USUARIO.nome.split(' ')[0] : 'outra pessoa');
  const bloqueado = () => {
    const b = { then(res, rej) { return Promise.resolve({ data: null, error: { message: 'Modo "ver como ' + quem() + '": somente visualizacao, nada foi gravado.' }, count: 0 }).then(res, rej); } };
    ['select', 'eq', 'neq', 'in', 'is', 'gte', 'lte', 'gt', 'lt', 'not', 'or', 'order', 'limit', 'single', 'maybeSingle', 'match', 'filter', 'range', 'contains', 'returns'].forEach(m => { b[m] = () => b; });
    return b;
  };
  const _from = sb.from.bind(sb);
  sb.from = t => { const q = _from(t); ['insert', 'update', 'delete', 'upsert'].forEach(m => { q[m] = bloqueado; }); return q; };
  const _rpc = sb.rpc.bind(sb);
  sb.rpc = (fn, args, opts) => ['gerar_sessoes_do_dia', 'migrations_pendentes'].includes(fn) ? _rpc(fn, args, opts) : bloqueado();
  try {
    const _sfrom = sb.storage.from.bind(sb.storage);
    sb.storage.from = bucket => { const o = _sfrom(bucket); o.upload = bloqueado; o.remove = bloqueado; o.update = bloqueado; return o; };
  } catch (e) { /* storage pode nao existir */ }
  try { if (sb.functions) sb.functions.invoke = bloqueado; } catch (e) {}
  try { if (sb.auth) sb.auth.updateUser = bloqueado; } catch (e) {}
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

// Menu Programas (biblioteca/estimulos): chave propria 'programas.menu'. Sem linha na matriz, so gestao.
function podeMenuProgramas() {
  if (CORTEX_PERM_TUDO) return true;
  if (CORTEX_PERMS['programas.menu'] !== undefined) return CORTEX_PERMS['programas.menu'] !== '';
  const p = window.CORTEX_SESSAO && window.CORTEX_SESSAO.profile;
  return !!p && ['coordenador', 'direcao', 'suporte'].includes(p.perfil);
}
// Reabrir relatorio travado: so coordenacao/direcao (chave 'relatorios.reabrir' + trava por perfil)
function podeReabrirRelatorio() {
  const p = window.CORTEX_SESSAO && window.CORTEX_SESSAO.profile;
  if (!p) return false;
  if (CORTEX_PERM_TUDO) return true;
  if (!['coordenador', 'direcao'].includes(p.perfil)) return false;
  return CORTEX_PERMS['relatorios.reabrir'] !== undefined ? CORTEX_PERMS['relatorios.reabrir'] === 'E' : true;
}
// Pendencias de sessao (sem evolucao, sem ficha de programas, nao encerrada) so contam a partir desta data.
// Wess zerou em 01/10/2026 ("limpar as pendencias e comecar a contar de hoje"). Pode ser mudada sem patch:
// linha chave = 'pendencias_desde' na tabela configuracoes (lida no login, formato AAAA-MM-DD).
window.CORTEX_EVO_DESDE = '2026-10-01';
// Data de corte das pendencias vinda do banco (configuracoes.pendencias_desde); sem a linha, vale a constante acima
async function carregarDataPendencias() {
  try {
    const { data } = await sb.from('configuracoes').select('valor').eq('chave', 'pendencias_desde').maybeSingle();
    if (data && /^\d{4}-\d{2}-\d{2}$/.test(String(data.valor || '').trim())) window.CORTEX_EVO_DESDE = String(data.valor).trim();
  } catch (e) { /* mantem a constante */ }
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
  if (!window._docPortal) return '';
  const p = window.CORTEX_SESSAO && window.CORTEX_SESSAO.profile;
  const podeAssinar = perm('relatorios.assinar') === 'E';
  return (podeEnviarPortal()
    ? '  <button class="btn btn-fantasma" id="btn-enviar-portal" ' +
      'title="Disponibiliza este documento, exatamente como esta, para a familia ver no portal." ' +
      'onclick="enviarDocPortal(this)">&#128228; Enviar ao portal</button>' : '') +
    (podeAssinar && window._docPortal.tipo !== 'avaliacao' ? pdfAssinadoBtn() : '');
}
// botao "PDF assinado": telas de geracao de relatorio (depois de gerar e travar) e documentos sem editor
function pdfAssinadoBtn() {
  // permissao "Relatorios > PDF assinado" (herda de Relatorios): direcao e coordenacao por padrao
  if (perm('relatorios.assinar') !== 'E') return '';
  return '  <button class="btn btn-fantasma" id="btn-pdf-assinado" title="Gera o PDF e assina com o certificado digital ICP-Brasil (A1)" ' +
    'onclick="gerarPdfAssinado(this)">&#128274; PDF assinado (ICP-Brasil)</button>';
}

// ─────────────── PDF assinado com certificado digital A1 ───────────────
// 1) monta o PDF do documento aqui no navegador (html2pdf, mesmo visual da impressao)
// 2) manda para a Edge Function assinar-pdf, que assina com o certificado guardado nos secrets
// 3) devolve o PDF assinado (download) e guarda uma copia em documentos/assinados
function carregarScript(src) {
  return new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = src;
    s.onload = res; s.onerror = () => rej(new Error('Nao foi possivel carregar ' + src.split('/').pop()));
    document.head.appendChild(s);
  });
}
async function carregarHtml2pdf() {
  if (!window.html2canvas) await carregarScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
  if (!(window.jspdf && window.jspdf.jsPDF)) await carregarScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
}
// Divide o documento (.doc-eq) em paginas A4 de 794x1123px: cabecalho e rodape repetidos, conteudo distribuido
// por unidades (h2, caixas, graficos, assinatura); caixas de texto sao quebradas por paragrafo quando nao cabem.
function paginarDocumentoPdf(doc, wrap) {
  const ALT = 1123, PAD_T = 30, PAD_B = 26, PAD_X = 38;
  const cab = doc.querySelector('.deq-cab'), rod = doc.querySelector('.deq-rodape');
  const classes = doc.className;
  // unidades de fluxo
  const ehUnidade = el => el.matches('h2, h3, p, table, svg, img, .deq-caixa, .deq-assinatura, .deq-carimbo-icp, .deq-graf-item, .deq-dados, .deq-freq, .deq-quebra, .deq-anexo');
  const unidades = [];
  const coletar = el => {
    [...el.children].forEach(ch => {
      if (ch === cab || ch === rod) return;
      if (ehUnidade(ch)) unidades.push(ch);
      else if (ch.children.length && !ch.querySelector('svg, table, img')) coletar(ch);
      else unidades.push(ch);
    });
  };
  coletar(doc);
  // caixa de texto -> paragrafos (divisivel); mantem classes/estilo
  const divisivel = el => el.classList && el.classList.contains('deq-caixa') && !el.querySelector('svg, table, img, .deq-dados') &&
    (el.innerHTML.includes('<br') || el.querySelector(':scope > .deq-par'));
  const paragrafos = el => {
    if (el.querySelector(':scope > .deq-par')) return [...el.children];
    const partes = el.innerHTML.split(/<br\s*\/?>/i);
    return partes.map(h => { const d = document.createElement('div'); d.className = 'deq-par'; d.innerHTML = h.trim() || '&nbsp;'; if (!h.trim()) d.style.height = '8px'; return d; });
  };
  const novaPagina = () => {
    const pg = document.createElement('div');
    pg.className = classes + ' pdf-pagina';
    pg.style.cssText = 'box-sizing:border-box; width:794px; height:' + ALT + 'px; padding:' + PAD_T + 'px ' + PAD_X + 'px ' + PAD_B + 'px; margin:0; border-radius:0; background:#fff; position:relative; overflow:hidden;';
    if (cab) pg.appendChild(cab.cloneNode(true));
    const cont = document.createElement('div'); cont.className = 'pdf-cont';
    pg.appendChild(cont);
    let rodH = 0;
    if (rod) { const r = rod.cloneNode(true); r.style.cssText = 'position:absolute; left:' + PAD_X + 'px; right:' + PAD_X + 'px; bottom:' + PAD_B + 'px; margin:0;'; pg.appendChild(r); rodH = r.offsetHeight; }
    wrap.appendChild(pg);
    if (rod) rodH = pg.lastChild.offsetHeight;
    pg._cont = cont;
    pg._max = ALT - PAD_T - PAD_B - (cab ? pg.firstChild.offsetHeight + 10 : 0) - (rod ? rodH + 14 : 0);
    return pg;
  };
  const paginas = [];
  let pg = novaPagina(); paginas.push(pg);
  const cabe = () => pg._cont.offsetHeight <= pg._max;
  const vazia = () => pg._cont.children.length === 0;
  const fila = unidades.slice();
  let guarda = 0;
  while (fila.length && guarda++ < 5000) {
    const u = fila.shift();
    pg._cont.appendChild(u);
    if (cabe()) continue;
    // nao coube: tenta dividir caixa de texto por paragrafo
    if (divisivel(u)) {
      const pars = paragrafos(u);
      const primeira = u.cloneNode(false); primeira.innerHTML = '';
      pg._cont.replaceChild(primeira, u);
      let n = 0;
      while (pars.length) {
        primeira.appendChild(pars[0]);
        if (cabe()) { pars.shift(); n++; continue; }
        primeira.removeChild(pars[0]);
        // paragrafo de texto puro: divide por frases para nao deixar buraco no fim da pagina
        const par = pars[0];
        if (!par.children.length && par.textContent.trim().length > 120) {
          const frases = par.textContent.split(/(?<=[.!?;:])\s+/);
          const a = par.cloneNode(false); a.textContent = ''; primeira.appendChild(a);
          let k = 0;
          while (k < frases.length) { a.textContent = frases.slice(0, k + 1).join(' '); if (!cabe()) { a.textContent = frases.slice(0, k).join(' '); break; } k++; }
          if (k >= 1 && k < frases.length) { par.textContent = frases.slice(k).join(' '); n++; }
          else primeira.removeChild(a);
        }
        break;
      }
      // pedaco pequeno demais no fim da pagina (so o titulo da area, por exemplo): vai inteiro para a proxima
      if (n < 2 || primeira.offsetHeight < 110) { while (primeira.lastChild) pars.unshift(primeira.removeChild(primeira.lastChild)); primeira.remove(); n = 0; }
      if (pars.length) { const resto = u.cloneNode(false); resto.innerHTML = ''; resto.classList.add('deq-cont'); pars.forEach(p => resto.appendChild(p)); fila.unshift(resto); }
      if (n === 0 && vazia()) { /* paragrafo maior que a pagina: deixa e segue */ continue; }
      if (n === 0) { pg = novaPagina(); paginas.push(pg); }
      else { pg = novaPagina(); paginas.push(pg); }
      continue;
    }
    if (vazia()) continue;                    // unidade maior que a pagina: fica e transborda (raro)
    pg._cont.removeChild(u);
    // titulo orfao no fim da pagina vai junto para a proxima
    const ult = pg._cont.lastElementChild;
    if (ult && /^H[23]$/.test(ult.tagName)) { pg._cont.removeChild(ult); fila.unshift(ult); }
    fila.unshift(u);
    pg = novaPagina(); paginas.push(pg);
  }
  // numeracao no rodape
  paginas.forEach((p, i) => { const r = p.querySelector('.deq-rodape'); if (r) { const n = document.createElement('span'); n.textContent = 'p\u00e1g. ' + (i + 1) + '/' + paginas.length; r.appendChild(n); } });
  return paginas;
}

async function gerarPdfAssinado(botao) {
  const ctx = window._docPortal;
  const doc = document.querySelector('#doc-eq-overlay .doc-eq, .folha-overlay .doc-eq, .folha-pagina .doc-eq, #rm-previa .doc-eq, #la-previa .doc-eq');
  if (!ctx || !doc) { popAviso('Documento nao encontrado.'); return; }
  const rotulo = botao.innerHTML;
  botao.disabled = true; botao.textContent = 'Montando o PDF...';
  try {
    await carregarHtml2pdf();
    // clone limpo, sem os botoes da tela
    const clone = doc.cloneNode(true);
    clone.querySelectorAll('.nao-imprime, button').forEach(e => e.remove());
    // graficos SVG viram imagem fixa (nao quebram entre paginas nem somem)
    clone.querySelectorAll('svg').forEach(sv => { sv.style.maxWidth = '100%'; sv.style.height = 'auto'; sv.setAttribute('width', sv.getAttribute('width') || '700'); });
    // carimbo da assinatura digital (a assinatura criptografica vai no arquivo; isto e o visivel)
    // o carimbo entra EM CIMA da linha de assinatura, centralizado (no lugar da assinatura manuscrita)
    const carimbo = document.createElement('div');
    carimbo.className = 'deq-carimbo-icp';
    carimbo.innerHTML = '<b>Documento assinado digitalmente</b><br>WESSILON MARQUES DE SOUSA &middot; CPF ***.***.706-88 &middot; Certificado ICP-Brasil A1<br>' +
      new Date().toLocaleString('pt-BR') + ' &middot; verifique em validar.iti.gov.br';
    const ass = clone.querySelector('.deq-assinatura');
    if (ass) {
      ass.querySelectorAll('.deq-assinatura-img, .deq-ass-linha').forEach(e => e.remove());
      ass.classList.remove('com-imagem');
      ass.classList.add('assinado-icp');
      ass.insertAdjacentElement('afterbegin', carimbo);
    } else (clone.querySelector('.deq-rodape') || clone).insertAdjacentElement(clone.querySelector('.deq-rodape') ? 'beforebegin' : 'beforeend', carimbo);
    // Paginacao propria: cada pagina A4 e um bloco fechado (cabecalho + conteudo + rodape) e vira UMA imagem em alta
    // resolucao. Nada e cortado no meio; blocos de texto longos sao divididos por paragrafo entre as paginas.
    // paginas montadas fora da tela; cada uma e capturada sozinha num palco 794x1123 (sem deslocamento de scroll)
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:absolute; left:0; top:0; width:794px; background:#fff; z-index:-1; pointer-events:none; visibility:hidden;';
    document.body.appendChild(wrap);
    const paginas = paginarDocumentoPdf(clone, wrap);
    const palco = document.createElement('div');
    palco.style.cssText = 'position:absolute; left:0; top:0; width:794px; height:1123px; overflow:hidden; background:#fff; z-index:-1; pointer-events:none;';
    document.body.appendChild(palco);
    const escala = 2.6, sy = window.scrollY;
    window.scrollTo(0, 0);
    const pdf = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
    try {
      for (let i = 0; i < paginas.length; i++) {
        botao.textContent = 'Montando o PDF... pagina ' + (i + 1) + ' de ' + paginas.length;
        palco.innerHTML = ''; palco.appendChild(paginas[i]);
        const canvas = await window.html2canvas(palco, {
          scale: escala, useCORS: true, backgroundColor: '#ffffff', logging: false,
          width: 794, height: 1123, x: 0, y: 0, scrollX: 0, scrollY: 0, windowWidth: 794, windowHeight: 1123
        });
        if (i > 0) pdf.addPage('a4', 'portrait');
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.93), 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
      }
    } finally { palco.remove(); window.scrollTo(0, sy); }
    const blob = pdf.output('blob');
    wrap.remove();
    const b64 = await new Promise(res => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.readAsDataURL(blob); });

    botao.textContent = 'Assinando com o certificado...';
    const { data: sess } = await sb.auth.getSession();
    const resp = await fetch(CORTEX_CONFIG.SUPABASE_URL + '/functions/v1/assinar-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + sess.session.access_token, 'apikey': CORTEX_CONFIG.SUPABASE_ANON_KEY },
      body: JSON.stringify({ pdf_base64: b64, tipo: ctx.tipo, titulo: ctx.titulo, paciente_id: ctx.paciente_id })
    });
    const r = await resp.json();
    if (!resp.ok || !r.ok) throw new Error(r.erro || ('HTTP ' + resp.status));
    // download
    const bin = atob(r.pdf_base64); const arr = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    const url = URL.createObjectURL(new Blob([arr], { type: 'application/pdf' }));
    const a = document.createElement('a'); a.href = url; a.download = r.nome_arquivo || 'documento_assinado.pdf'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    popAviso('PDF assinado digitalmente por ' + (r.assinante || 'certificado A1') + '. Uma copia ficou guardada em Documentos da crianca.' +
      (r.aviso ? '\n\n' + r.aviso : ''));
  } catch (e) {
    popAviso('Nao consegui gerar o PDF assinado: ' + e.message);
  } finally { botao.disabled = false; botao.innerHTML = rotulo; }
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
    // "diretos" = so quem esta ligado a coordenadora (coordenador_id ou vinculo extra); e o que a agenda usa
    const diretos = new Set(apl);
    const pacs = new Set();
    (rPac.data || []).forEach(p => { if (p.coordenador_id === eu || apl.has(p.aplicador_id)) pacs.add(p.id); });
    (rPa.data || []).forEach(x => { if (apl.has(x.aplicador_id)) pacs.add(x.paciente_id); });
    // aplicadores que atendem criancas da equipe tambem contam como equipe
    (rPac.data || []).forEach(p => { if (pacs.has(p.id) && p.aplicador_id) apl.add(p.aplicador_id); });
    (rPa.data || []).forEach(x => { if (pacs.has(x.paciente_id)) apl.add(x.aplicador_id); });
    const eq = { pacientes: pacs, aplicadores: apl, aplicadoresDiretos: diretos, nomes: Object.fromEntries((rProf.data || []).map(p => [p.id, p.nome])) };
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
  // Encaixa o botao no cabecalho da pagina e fica de olho: quando o modulo redesenha a tela principal
  // (ex.: "Voltar a lista de pacientes", "Voltar" da grade fixa), o cabecalho nasce de novo sem o botao
  // e ele e recolocado. Nao entra em telas internas (cabecalho com botao Voltar) nem em documentos.
  montar(pagina) {
    this.parar();
    if (!this.ehCoord()) return;
    const encaixar = () => {
      pagina.querySelectorAll(':scope > .pagina-cabecalho').forEach(cab => {
        if (cab.querySelector('.escopo-toggle') || cab.querySelector('.btn-voltar')) return;
        cab.insertAdjacentHTML('beforeend', this.html());
      });
    };
    encaixar();
    this._obs = new MutationObserver(() => encaixar());
    this._obs.observe(pagina, { childList: true, subtree: true });
  },
  parar() { if (this._obs) { this._obs.disconnect(); this._obs = null; } }
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
