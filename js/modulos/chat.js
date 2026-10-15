// ============================================================================
// CORTEX aba - js/modulos/chat.js
// Patch 31: Chat da equipe (substitui o Chat de Suporte).
// - Conversas privadas entre qualquer dupla da equipe (uma so por dupla)
// - Grupos com nome, participantes, entrar/sair, mensagens de sistema
// - Comunicado: a gestao escolhe os destinatarios e cada um recebe no privado
// - Tempo real via Supabase Realtime (tabela chat_mensagens)
// Tabelas/RPCs: chat_conversas, chat_participantes, chat_mensagens,
//   fn_chat_lista, fn_chat_privada, fn_chat_criar_grupo, fn_chat_adicionar,
//   fn_chat_sair, fn_chat_comunicado, fn_chat_marcar_lida, fn_chat_nao_lidas
// ============================================================================

window.MODULOS = window.MODULOS || {};

window.MODULOS.chat = {

  el: null,
  canal: null,
  lista: [],            // conversas (fn_chat_lista)
  aberta: null,         // conversa em foco (objeto da lista)
  _msgs: [],            // mensagens da conversa aberta
  _parts: [],           // participantes da conversa aberta
  _equipe: null,        // cache: pessoas da equipe (profiles ativos, sem familia)
  _fotos: {},           // foto_path -> url assinada
  _busca: '',
  _timerLista: null,

  ICO: {
    chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.5 8.5 0 0 1-12.4 7.5L3 21l2-5.6A8.5 8.5 0 1 1 21 11.5z"/></svg>',
    grupo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    mega: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1z"/><path d="M15 9a3 3 0 0 1 0 6"/><path d="M18 6a7 7 0 0 1 0 12"/></svg>',
    enviar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',
    busca: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
    voltar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>',
    mais: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    lixo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>',
    pdf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/></svg>',
    rir: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8.5 14.5s1.3 1.8 3.5 1.8 3.5-1.8 3.5-1.8"/><line x1="9" y1="9.5" x2="9" y2="9.6"/><line x1="15" y1="9.5" x2="15" y2="9.6"/></svg>',
    responder: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg>',
    fechar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>'
  },
  // patch 58: responder uma mensagem especifica e painel com todos os emojis nas reacoes
  _resp: null,          // mensagem sendo respondida { id, nome, trecho }
  _orig: {},            // mensagens citadas que nao estao entre as carregadas (id -> mensagem)
  _semResp: false,      // banco sem a coluna resposta_a (SQL do patch 58 nao rodado)
  // patch 50: reacoes (uma por pessoa por mensagem) e anexos em cartao (imagem e PDF, opcao B do Wess)
  EMOJIS: ['\ud83d\udc4d', '\u2764\ufe0f', '\ud83d\ude02', '\ud83d\ude2e', '\ud83d\ude22', '\ud83d\ude4f'],
  LIMITE_ANEXOS: 6,
  MAX_MB: 10,
  _pend: [],            // anexos escolhidos e ainda nao enviados (conversa aberta)
  _pendCom: [],         // anexos do comunicado
  _reac: {},            // mensagem_id -> [{emoji, usuario_id, nome}]
  _anx: {},             // caminho do anexo -> { url, ate }
  _semAnexos: false,    // banco sem a coluna anexos (SQL do patch 50 nao rodado)

  eu() { return window.CORTEX_SESSAO.user.id; },
  ehGestao() {
    const p = window.CORTEX_SESSAO.profile;
    return ['direcao', 'coordenador', 'suporte'].includes(p.perfil_real || p.perfil);
  },
  // patch 45: so o suporte tecnico apaga conversa do banco (para todos os participantes)
  ehSuporte() { const p = window.CORTEX_SESSAO.profile; return (p.perfil_real || p.perfil) === 'suporte'; },

  // ─────────────── RENDER ───────────────

  async render(el) {
    this.el = el;
    if (window.CORTEX_VER_USUARIO) {
      el.innerHTML =
        '<div class="pagina-cabecalho"><div><h2>Chat</h2><p class="sub">Conversas da equipe</p></div></div>' +
        '<div class="cartao"><div class="vazio"><div class="simbolo-vazio">&#128274;</div>' +
        '<strong>O chat e pessoal</strong>No modo "ver como pessoa" as conversas mostradas seriam as suas, nao as de ' +
        escaparHtml(window.CORTEX_VER_USUARIO.nome.split(' ')[0]) + '. Saia do modo para usar o chat.</div></div>';
      return;
    }
    this.assinar();
    el.innerHTML =
      '<div class="chat-app" id="chat-app">' +
      '  <aside class="chat-lado">' +
      '    <div class="chat-lado-topo">' +
      '      <div class="chat-marca"><span class="chat-marca-ico">' + this.ICO.chat + '</span>' +
      '        <div><h2>Chat</h2><p class="sub">Equipe Equilibrium</p></div></div>' +
      '      <div class="chat-lado-acoes">' +
      (this.ehGestao() ? '        <button class="btn-redondo" title="Comunicado: mensagem no privado de varias pessoas" onclick="MODULOS.chat.modalComunicado()">' + this.ICO.mega + '</button>' : '') +
      '        <button class="btn btn-primario chat-nova" onclick="MODULOS.chat.modalNova()">' + this.ICO.mais + ' Nova</button>' +
      '      </div></div>' +
      '    <label class="chat-busca">' + this.ICO.busca + '<input id="chat-busca" placeholder="Buscar conversa" oninput="MODULOS.chat.filtrarLista(this.value)"></label>' +
      '    <div class="chat-conversas" id="chat-conversas"><p class="sub" style="padding:14px">Carregando...</p></div>' +
      '  </aside>' +
      '  <section class="chat-thread" id="chat-thread">' + this.htmlVazio() + '</section>' +
      '</div>';
    await this.carregarLista();
    if (this.aberta) {
      const ainda = this.lista.find(c => c.id === this.aberta.id);
      if (ainda) this.abrir(ainda.id); else this.aberta = null;
    }
  },

  htmlVazio() {
    return '<div class="chat-vazio"><div class="chat-vazio-ico">' + this.ICO.chat + '</div>' +
      '<strong>Escolha uma conversa</strong><span>ou comece uma nova com "+ Nova".</span></div>';
  },

  // ─────────────── TEMPO REAL ───────────────

  assinar() {
    if (this.canal) return;
    try {
      this.canal = sb.channel('chat-equipe')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_mensagens' }, p => this.aoChegar(p.new))
        .subscribe();
    } catch (e) { /* sem realtime, o F5 resolve */ }
  },

  aoChegar(m) {
    if (!m) return;
    this.atualizarBadge();
    if (!document.getElementById('chat-app')) return;
    if (this.aberta && m.conversa_id === this.aberta.id) {
      this.carregarThread(this.aberta.id, true);
    }
    clearTimeout(this._timerLista);
    this._timerLista = setTimeout(() => this.carregarLista(), 250);
  },

  // ─────────────── LISTA ───────────────

  async carregarLista() {
    const { data, error } = await sb.rpc('fn_chat_lista');
    if (error) {
      const alvo = document.getElementById('chat-conversas');
      if (alvo) alvo.innerHTML = '<p class="sub" style="padding:14px">' + (/fn_chat_lista|function/i.test(error.message)
        ? 'O chat ainda nao foi ativado no banco (rode o SQL do patch).' : 'Nao foi possivel carregar: ' + escaparHtml(error.message)) + '</p>';
      return;
    }
    this.lista = data || [];
    this._listaEm = Date.now();
    await this.assinarFotos(this.lista.map(c => c.outro_foto));
    // conversa aberta que sumiu (apagada pelo suporte ou saiu do grupo em outro aparelho)
    if (this.aberta && !this.lista.some(c => c.id === this.aberta.id) && document.getElementById('chat-thread')) { this.voltarLista(); return; }
    if (this.aberta) { const a = this.lista.find(c => c.id === this.aberta.id); if (a) this.aberta = a; }
    this.desenharLista();
    this.atualizarBadge();
  },

  async assinarFotos(caminhos) {
    const novos = (caminhos || []).filter(c => c && !this._fotos[c]);
    if (!novos.length) return;
    try {
      const { data } = await sb.storage.from('documentos').createSignedUrls(Array.from(new Set(novos)), 3600);
      (data || []).forEach(d => { if (d.signedUrl) this._fotos[d.path] = d.signedUrl; });
    } catch (e) { /* sem foto, fica a inicial */ }
  },

  filtrarLista(v) { this._busca = (v || '').trim().toLowerCase(); this.desenharLista(); },

  desenharLista() {
    const alvo = document.getElementById('chat-conversas');
    if (!alvo) return;
    const termo = this._busca;
    const itens = this.lista.filter(c => !termo || (c.nome || '').toLowerCase().includes(termo) || (c.ultima_texto || '').toLowerCase().includes(termo));
    if (!itens.length) {
      alvo.innerHTML = '<div class="chat-lista-vazia">' + (this.lista.length ? 'Nada com "' + escaparHtml(termo) + '".' :
        'Nenhuma conversa ainda.<br>Toque em <b>+ Nova</b> para falar com alguem da equipe.') + '</div>';
      return;
    }
    alvo.innerHTML = itens.map(c => {
      const grupo = c.tipo === 'grupo';
      const previa = c.ultima_texto
        ? (c.ultima_tipo === 'sistema' ? '<i>' + escaparHtml(c.ultima_texto) + '</i>'
          : (grupo && c.ultima_autor ? escaparHtml(c.ultima_autor) + ': ' : '') + (c.ultima_tipo === 'comunicado' ? '&#128227; ' : '') + escaparHtml(c.ultima_texto))
        : '<i>Sem mensagens</i>';
      return '<div class="chat-item' + (this.aberta && this.aberta.id === c.id ? ' ativa' : '') + (c.nao_lidas ? ' nova' : '') + '" onclick="MODULOS.chat.abrir(\'' + c.id + '\')">' +
        this.avatar(c) +
        '<div class="chat-item-meio"><b>' + escaparHtml(c.nome || '') + (c.outro_ativo === false ? ' <small class="sub">(inativo)</small>' : '') + '</b><span>' + previa + '</span></div>' +
        '<div class="chat-item-dir"><small>' + this.rotuloData(c.ultima_em || c.criado_em) + '</small>' +
        (c.nao_lidas ? '<span class="chat-cont">' + (c.nao_lidas > 99 ? '99+' : c.nao_lidas) + '</span>' : '') + '</div></div>';
    }).join('');
  },

  avatar(c, classe) {
    const cls = 'chat-avatar ' + (classe || '');
    if (c.tipo === 'grupo') return '<div class="' + cls + ' grupo">' + this.ICO.grupo + '</div>';
    const url = c.outro_foto && this._fotos[c.outro_foto];
    if (url) return '<div class="' + cls + '"><img src="' + url + '" alt=""></div>';
    return '<div class="' + cls + ' ' + corAvatar(c.nome) + '">' + this.iniciais(c.nome) + '</div>';
  },
  avatarPessoa(p, classe) {
    return this.avatar({ tipo: 'privada', nome: p.nome, outro_foto: p.foto_path }, classe);
  },
  iniciais(nome) { return String(nome || '?').split(' ').filter(Boolean).slice(0, 2).map(x => x[0]).join('').toUpperCase(); },

  rotuloData(iso) {
    if (!iso) return '';
    const d = new Date(iso); const hoje = new Date(); const ontem = new Date(); ontem.setDate(hoje.getDate() - 1);
    const mesmo = (a, b) => a.toDateString() === b.toDateString();
    if (mesmo(d, hoje)) return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    if (mesmo(d, ontem)) return 'Ontem';
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  },
  rotuloDia(iso) {
    const d = new Date(iso); const hoje = new Date(); const ontem = new Date(); ontem.setDate(hoje.getDate() - 1);
    const mesmo = (a, b) => a.toDateString() === b.toDateString();
    if (mesmo(d, hoje)) return 'Hoje';
    if (mesmo(d, ontem)) return 'Ontem';
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  },
  hora(iso) { return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); },

  // ─────────────── THREAD ───────────────

  async abrir(id) {
    if (this._resp && this._resp.conversa !== id) this._resp = null;
    const c = this.lista.find(x => x.id === id);
    if (!c) return;
    if (!this.aberta || this.aberta.id !== id) this._pend = [];
    this.aberta = c;
    document.getElementById('chat-app')?.classList.add('ver-thread');
    this.desenharLista();
    await this.carregarThread(id);
  },

  voltarLista() {
    document.getElementById('chat-app')?.classList.remove('ver-thread');
    this.aberta = null;
    const t = document.getElementById('chat-thread'); if (t) t.innerHTML = this.htmlVazio();
    this.desenharLista();
  },

  async carregarThread(id, soMensagens) {
    const alvo = document.getElementById('chat-thread');
    if (!alvo || !this.aberta || this.aberta.id !== id) return;
    const COLS = 'id, autor_id, texto, tipo, criado_em, autor:profiles!chat_mensagens_autor_id_fkey(nome, foto_path)';
    const qMsgs = cols => sb.from('chat_mensagens').select(cols).eq('conversa_id', id).order('criado_em').limit(400);
    const colsAgora = () => COLS + (this._semAnexos ? '' : ', anexos') + (this._semResp ? '' : ', resposta_a');
    const [rM0, rP] = await Promise.all([
      qMsgs(colsAgora()),
      sb.from('chat_participantes').select('usuario_id, ultima_leitura, pessoa:profiles!chat_participantes_usuario_id_fkey(nome, perfil, foto_path, ativo)')
        .eq('conversa_id', id)
    ]);
    let rM = rM0;
    // sem as colunas novas (SQL do patch 50 ou 58 ainda nao rodado): le sem elas
    for (let i = 0; i < 2 && rM.error && /anexos|resposta_a/i.test(rM.error.message); i++) {
      if (/resposta_a/i.test(rM.error.message)) this._semResp = true; else this._semAnexos = true;
      rM = await qMsgs(colsAgora());
    }
    if (!this.aberta || this.aberta.id !== id) return;   // trocou de conversa no meio
    this._msgs = rM.data || [];
    this._parts = rP.data || [];
    await this.assinarFotos(this._parts.map(p => p.pessoa && p.pessoa.foto_path));

    // patch 50: com a conversa ja aberta, so as mensagens sao redesenhadas - o campo de escrever fica como esta
    // (antes ele era refeito a cada mensagem e perdia o foco: era preciso clicar de novo para escrever)
    const rolAntes = document.getElementById('chat-msgs');
    const temCampo = !!document.getElementById('chat-texto');
    if (soMensagens && rolAntes && temCampo) {
      const noFim = rolAntes.scrollHeight - rolAntes.scrollTop - rolAntes.clientHeight < 90;
      const cab = alvo.querySelector('.chat-cab'); if (cab) cab.outerHTML = this.htmlCabecalho();
      rolAntes.innerHTML = this.htmlMensagens();
      if (noFim || this._rolarFim) rolAntes.scrollTop = rolAntes.scrollHeight;
      this._rolarFim = false;
    } else {
      alvo.innerHTML = this.htmlCabecalho() +
        '<div class="chat-msgs" id="chat-msgs">' + this.htmlMensagens() + '</div>' +
        '<div class="chat-pend" id="chat-pend" hidden></div>' +
        '<div class="chat-resp-barra" id="chat-resp" hidden></div>' +
        '<div class="chat-envio">' +
        '  <div class="chat-mais-caixa">' +
        '    <button type="button" class="chat-anexar" id="chat-anexar" title="Anexar imagem ou PDF" onmousedown="event.preventDefault()" onclick="MODULOS.chat.menuAnexo(event)">' + this.ICO.mais + '</button>' +
        '    <div class="chat-menu-anexo" id="chat-menu-anexo" hidden>' +
        '      <button type="button" onclick="MODULOS.chat.escolherAnexo(\'img\')">&#128444;&#65039; Imagem<small>da galeria ou do computador</small></button>' +
        '      <button type="button" class="so-toque" onclick="MODULOS.chat.escolherAnexo(\'foto\')">&#128247; Tirar foto<small>camera do celular</small></button>' +
        '      <button type="button" onclick="MODULOS.chat.escolherAnexo(\'pdf\')">&#128196; PDF</button>' +
        '    </div>' +
        '    <input type="file" id="chat-arq-img" accept="image/*" multiple hidden onchange="MODULOS.chat.addArquivos(this.files, this)">' +
        '    <input type="file" id="chat-arq-foto" accept="image/*" capture="environment" hidden onchange="MODULOS.chat.addArquivos(this.files, this)">' +
        '    <input type="file" id="chat-arq-pdf" accept="application/pdf" multiple hidden onchange="MODULOS.chat.addArquivos(this.files, this)">' +
        '  </div>' +
        '  <textarea id="chat-texto" rows="1" placeholder="' + (window.matchMedia('(max-width: 720px)').matches ? 'Escreva uma mensagem...' : 'Escreva uma mensagem... (Enter envia, Shift+Enter quebra a linha)') + '" ' +
        '    onkeydown="MODULOS.chat.tecla(event)" oninput="MODULOS.chat.crescer(this)" onpaste="MODULOS.chat.colou(event)"></textarea>' +
        '  <button class="chat-enviar" id="chat-enviar" title="Enviar" onmousedown="event.preventDefault()" onclick="MODULOS.chat.enviar()">' + this.ICO.enviar + '</button>' +
        '</div>';
      const ta = document.getElementById('chat-texto');
      const rol = document.getElementById('chat-msgs'); rol.scrollTop = rol.scrollHeight;
      if (window.matchMedia('(min-width: 721px)').matches) ta.focus();
      this.ligarArrastar(alvo);
      this.desenharPend();
    }
    this.desenharReacoes();
    this.assinarAnexos();
    this.carregarReacoes(id);
    this.carregarCitadas();
    this.desenharResp();

    // li tudo: zera as nao lidas desta conversa
    if (this.aberta.nao_lidas || this._msgs.some(m => m.autor_id !== this.eu())) {
      sb.rpc('fn_chat_marcar_lida', { p_conversa: id }).then(() => {
        const c = this.lista.find(x => x.id === id); if (c) c.nao_lidas = 0;
        this.desenharLista(); this.atualizarBadge();
      });
    }
  },

  htmlCabecalho() {
    const c = this.aberta; const grupo = c.tipo === 'grupo';
    const sub = grupo
      ? this._parts.length + ' participante' + (this._parts.length === 1 ? '' : 's') + ' &middot; toque para ver'
      : escaparHtml(ROTULOS_PERFIL[c.outro_perfil] || c.outro_perfil || '') + (c.outro_ativo === false ? ' &middot; inativo' : '');
    return '<header class="chat-cab' + (grupo ? ' clicavel' : '') + '"' + (grupo ? ' onclick="MODULOS.chat.abrirParticipantes()"' : '') + '>' +
      '<button class="chat-voltar" title="Voltar" onclick="event.stopPropagation(); MODULOS.chat.voltarLista()">' + this.ICO.voltar + '</button>' +
      this.avatar(c, 'cab') +
      '<div class="chat-cab-nome"><b>' + escaparHtml(c.nome || '') + '</b><small>' + sub + '</small></div>' +
      (grupo
        ? '<span class="chat-tag">GRUPO</span><button class="btn-redondo claro" title="Participantes" onclick="event.stopPropagation(); MODULOS.chat.abrirParticipantes()">' + this.ICO.grupo + '</button>'
        : '<span class="chat-tag neutra">' + escaparHtml((ROTULOS_PERFIL[c.outro_perfil] || c.outro_perfil || 'EQUIPE').toUpperCase()) + '</span>') +
      (this.ehSuporte() ? '<button class="btn-redondo claro chat-apagar" title="Apagar conversa do banco (so suporte)" onclick="event.stopPropagation(); MODULOS.chat.apagarConversa()">' + this.ICO.lixo + '</button>' : '') +
      '</header>';
  },

  htmlMensagens() {
    const eu = this.eu(); const grupo = this.aberta.tipo === 'grupo';
    if (!this._msgs.length) return '<div class="chat-msgs-vazio">Sem mensagens ainda. Diga oi! &#128075;</div>';
    // "lida por todos": a menor ultima_leitura entre os outros participantes
    const outros = this._parts.filter(p => p.usuario_id !== eu).map(p => new Date(p.ultima_leitura || 0).getTime());
    const lidoAte = outros.length ? Math.min.apply(null, outros) : 0;
    let dia = ''; let autorAnterior = null;
    return this._msgs.map(m => {
      let h = '';
      const d = this.rotuloDia(m.criado_em);
      if (d !== dia) { dia = d; autorAnterior = null; h += '<div class="chat-dia"><span>' + d + '</span></div>'; }
      if (m.tipo === 'sistema') {
        autorAnterior = null;
        return h + '<div class="chat-sistema"><span>' + escaparHtml(m.texto) + ' &middot; ' + this.hora(m.criado_em) + '</span></div>';
      }
      const minha = m.autor_id === eu;
      const nome = m.autor ? m.autor.nome.split(' ')[0] : 'Alguem';
      const mostraNome = grupo && !minha && autorAnterior !== m.autor_id;
      autorAnterior = m.autor_id;
      const lida = minha && lidoAte >= new Date(m.criado_em).getTime();
      // patch 50: grupo da mensagem = texto + cartoes de anexo + reacoes
      const anexos = Array.isArray(m.anexos) ? m.anexos.filter(a => a && a.path) : [];
      const soAnexo = anexos.length && (m.texto || '') === this.rotuloAnexos(anexos);
      const horaHtml = '<small class="chat-hora">' + this.hora(m.criado_em) + (minha ? ' <span class="chat-check' + (lida ? ' lida' : '') + '">' + (lida ? '&#10003;&#10003;' : '&#10003;') + '</span>' : '') + '</small>';
      const cabBolha = (mostraNome ? '<small class="chat-autor ' + corAvatar(m.autor ? m.autor.nome : '') + '">' + escaparHtml(nome) + '</small>' : '') +
        (m.tipo === 'comunicado' ? '<small class="chat-selo-com">&#128227; Comunicado</small>' : '');
      const classe = 'chat-bolha' + (minha ? ' minha' : '') + (m.tipo === 'comunicado' ? ' comunicado' : '') + (mostraNome ? ' com-nome' : '');
      const id = this.attr(m.id);
      // patch 58: mensagem que responde outra mostra a citacao dentro do balao (so anexo: dentro do 1o cartao)
      const cit = m.resposta_a ? this.htmlCitacao(m.resposta_a) : '';
      return h + '<div class="chat-msg' + (minha ? ' minha' : '') + '" data-id="' + id + '">' +
        (soAnexo ? '' : '<div class="' + classe + '">' + cabBolha + cit + '<div class="chat-texto">' + this.formatar(m.texto) + '</div>' + (anexos.length ? '' : horaHtml) + '</div>') +
        anexos.map((a, i) => this.htmlCartaoAnexo(a, (soAnexo && i === 0 ? cabBolha + cit : ''), i === anexos.length - 1 ? horaHtml : '', classe)).join('') +
        '<div class="chat-reacoes" data-id="' + id + '"></div>' +
        '<div class="chat-acoes">' +
        '<button type="button" class="chat-reagir" title="Reagir" data-id="' + id + '" onclick="MODULOS.chat.pickerReacao(this)">' + this.ICO.rir + '</button>' +
        '<button type="button" class="chat-responder" title="Responder" data-id="' + id + '" onmousedown="event.preventDefault()" onclick="MODULOS.chat.responder(this.dataset.id)">' + this.ICO.responder + '</button>' +
        '</div></div>';
    }).join('');
  },

  formatar(t) {
    return escaparHtml(t || '').replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>').replace(/\n/g, '<br>');
  },

  tecla(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.enviar(); }
    else if (e.key === 'Escape' && this._resp) { e.preventDefault(); this.cancelarResp(); }
  },

  // ─────── RESPONDER UMA MENSAGEM (patch 58) ───────
  msgPorId(id) { return this._msgs.find(m => String(m.id) === String(id)) || this._orig[String(id)] || null; },
  trechoDe(m) {
    if (!m) return '';
    const an = Array.isArray(m.anexos) ? m.anexos.filter(a => a && a.path) : [];
    const t = an.length && (m.texto || '') === this.rotuloAnexos(an) ? this.rotuloAnexos(an) : (m.texto || '');
    const s = String(t).replace(/\s+/g, ' ').trim();
    return s.length > 140 ? s.slice(0, 138) + '...' : s;
  },
  htmlCitacao(idCitada) {
    const o = this.msgPorId(idCitada);
    const nome = o ? (String(o.autor_id) === String(this.eu()) ? 'Voce' : (o.autor ? o.autor.nome.split(' ')[0] : 'Alguem')) : '';
    const cor = o && o.autor ? corAvatar(o.autor.nome) : '';
    const an = o && Array.isArray(o.anexos) ? o.anexos.filter(a => a && a.path) : [];
    const img = an.find(a => this.ehImagem(a.tipo));
    return '<button type="button" class="chat-cit" data-ir="' + this.attr(idCitada) + '" onclick="MODULOS.chat.irParaMensagem(this.dataset.ir)" title="Ir para a mensagem">' +
      '<span class="chat-cit-t">' + (o ? '<b class="' + cor + '">' + escaparHtml(nome) + '</b><span>' + escaparHtml(this.trechoDe(o)) + '</span>' : '<span class="chat-cit-sem">Mensagem que nao esta mais aqui</span>') + '</span>' +
      (img ? '<img class="chat-cit-img" data-path="' + this.attr(img.path) + '" alt="" onerror="this.remove()">' : '') + '</button>';
  },
  // mensagens citadas mais antigas que as 400 carregadas: busca e redesenha
  async carregarCitadas() {
    if (this._semResp) return;
    const falta = [...new Set(this._msgs.map(m => m.resposta_a).filter(id => id && !this.msgPorId(id)).map(String))];
    if (!falta.length) { this.ligarCitImgs(); return; }
    const conversa = this.aberta && this.aberta.id;
    const { data } = await sb.from('chat_mensagens').select('id, autor_id, texto, tipo, criado_em, anexos, autor:profiles!chat_mensagens_autor_id_fkey(nome, foto_path)').in('id', falta);
    (data || []).forEach(m => { this._orig[String(m.id)] = m; });
    if (!data || !data.length || !this.aberta || this.aberta.id !== conversa) return;
    const rol = document.getElementById('chat-msgs');
    if (rol) { const fim = rol.scrollHeight - rol.scrollTop - rol.clientHeight < 90; rol.innerHTML = this.htmlMensagens(); this.desenharReacoes(); if (fim) rol.scrollTop = rol.scrollHeight; }
    this.ligarCitImgs();
  },
  // miniatura da imagem citada (mesmos links assinados dos cartoes de anexo)
  async ligarCitImgs() {
    const imgs = document.querySelectorAll('#chat-msgs .chat-cit-img[data-path], #chat-resp .chat-cit-img[data-path]');
    for (const im of imgs) { try { const u = await this.urlAnexo(im.dataset.path); if (u) im.src = u; else im.remove(); } catch (e) { im.remove(); } }
  },
  responder(id) {
    const m = this.msgPorId(id); if (!m || !this.aberta) return;
    document.getElementById('chat-picker')?.remove();
    document.querySelectorAll('#chat-msgs .chat-msg.toque').forEach(x => x.classList.remove('toque'));
    const minha = String(m.autor_id) === String(this.eu());
    this._resp = { id: m.id, conversa: this.aberta.id, nome: minha ? 'voce mesmo(a)' : (m.autor ? m.autor.nome.split(' ')[0] : 'Alguem') };
    this.desenharResp();
    const ta = document.getElementById('chat-texto'); if (ta) ta.focus();
  },
  cancelarResp() { this._resp = null; this.desenharResp(); document.getElementById('chat-texto')?.focus(); },
  desenharResp() {
    const el = document.getElementById('chat-resp'); if (!el) return;
    const r = this._resp && this.aberta && this._resp.conversa === this.aberta.id ? this._resp : null;
    if (!r) { el.hidden = true; el.innerHTML = ''; return; }
    const m = this.msgPorId(r.id);
    const an = m && Array.isArray(m.anexos) ? m.anexos.filter(a => a && a.path) : [];
    const img = an.find(a => this.ehImagem(a.tipo));
    el.hidden = false;
    el.innerHTML = '<span class="chat-resp-ic">' + this.ICO.responder + '</span>' +
      '<div class="chat-resp-t"><b>Respondendo a ' + escaparHtml(r.nome) + '</b><span>' + escaparHtml(this.trechoDe(m)) + '</span></div>' +
      (img ? '<img class="chat-cit-img" data-path="' + this.attr(img.path) + '" alt="" onerror="this.remove()">' : '') +
      '<button type="button" class="chat-resp-x" title="Cancelar a resposta (Esc)" onmousedown="event.preventDefault()" onclick="MODULOS.chat.cancelarResp()">' + this.ICO.fechar + '</button>';
    if (img) this.ligarCitImgs();
  },
  irParaMensagem(id) {
    const el = document.querySelector('#chat-msgs .chat-msg[data-id="' + CSS.escape(String(id)) + '"]');
    if (!el) { popAviso('Essa mensagem e mais antiga que as ultimas 400 desta conversa.'); return; }
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.remove('piscar'); void el.offsetWidth; el.classList.add('piscar');
    setTimeout(() => el.classList.remove('piscar'), 1700);
  },
  crescer(ta) {
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 140) + 'px';
  },

  async enviar() {
    const ta = document.getElementById('chat-texto');
    if (!ta || !this.aberta || this._enviando) return;
    const texto = ta.value.trim();
    const pend = this._pend.slice();
    if (!texto && !pend.length) { ta.focus(); return; }
    this._enviando = true;
    ta.value = ''; this.crescer(ta); ta.focus();   // patch 50: o foco fica no campo para a proxima mensagem
    const conversa = this.aberta.id;
    const btn = document.getElementById('chat-enviar');
    try {
      let anexos = [];
      if (pend.length) {
        if (btn) btn.classList.add('enviando');
        this.desenharPend(true);
        anexos = await this.subirAnexos(pend);
      }
      const linha = { conversa_id: conversa, autor_id: this.eu(), texto: texto || this.rotuloAnexos(anexos) };
      if (anexos.length) linha.anexos = anexos;
      const resp = this._resp && this._resp.conversa === conversa ? this._resp : null;
      if (resp && !this._semResp) linha.resposta_a = resp.id;
      let { error } = await sb.from('chat_mensagens').insert(linha);
      if (error && /resposta_a/i.test(error.message)) {
        // sem o SQL do patch 58: manda a mensagem mesmo assim, sem a ligacao com a citada
        this._semResp = true; delete linha.resposta_a;
        ({ error } = await sb.from('chat_mensagens').insert(linha));
        if (!error) popAviso('Mensagem enviada, mas sem a citacao: falta rodar o SQL do patch 58 (responder mensagem).');
      }
      if (error) throw new Error(/anexos/i.test(error.message) ? 'falta rodar o SQL do patch 50 (envio de imagem e PDF).' : error.message);
      if (resp) { this._resp = null; this.desenharResp(); }
      if (pend.length) { this._pend = []; this.desenharPend(); }
      this._rolarFim = true;
      if (this.aberta && this.aberta.id === conversa) this.carregarThread(conversa, true);
      clearTimeout(this._timerLista);
      this._timerLista = setTimeout(() => this.carregarLista(), 200);
    } catch (e) {
      if (!ta.value) { ta.value = texto; this.crescer(ta); }
      this.desenharPend();
      popAviso('Nao foi possivel enviar: ' + e.message);
    } finally {
      this._enviando = false;
      if (btn) btn.classList.remove('enviando');
      if (document.getElementById('chat-texto') === ta && !document.getElementById('pop-fundo')) ta.focus();
    }
  },

  // \u2500\u2500\u2500\u2500\u2500\u2500\u2500 ANEXOS (patch 50, opcao B: cartao por anexo) \u2500\u2500\u2500\u2500\u2500\u2500\u2500
  attr(v) { return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); },
  tamanhoTxt(b) { b = Number(b) || 0; return b >= 1048576 ? (b / 1048576).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB'; },
  ehImagem(t) { return /^image\//.test(t || ''); },
  rotuloAnexos(an) {
    if (!an || !an.length) return '';
    if (an.length === 1) return (this.ehImagem(an[0].tipo) ? '\ud83d\uddbc\ufe0f ' : '\ud83d\udcc4 ') + (an[0].nome || 'anexo');
    return '\ud83d\udcce ' + an.length + ' anexos';
  },
  htmlCartaoAnexo(a, cab, hora, classe) {
    const img = this.ehImagem(a.tipo);
    const url = this._anx[a.path] && this._anx[a.path].ate > Date.now() ? this._anx[a.path].url : '';
    return '<div class="' + classe.replace(' com-nome', '') + ' chat-anexo">' + (cab || '') +
      '<div class="chat-anexo-linha">' +
      (img ? '<button type="button" class="chat-anexo-mini" data-path="' + this.attr(a.path) + '" onclick="MODULOS.chat.abrirAnexo(this.dataset.path)">' + (url ? '<img src="' + this.attr(url) + '" alt="">' : '') + '</button>'
           : '<span class="chat-anexo-mini pdf">' + this.ICO.pdf + '</span>') +
      '<div class="chat-anexo-info"><b>' + escaparHtml(a.nome || 'anexo') + '</b><small>' + (img ? 'Imagem' : 'PDF') + ' &middot; ' + this.tamanhoTxt(a.tamanho) + '</small></div>' +
      '<button type="button" class="chat-anexo-abrir" data-path="' + this.attr(a.path) + '" onclick="MODULOS.chat.abrirAnexo(this.dataset.path)">Abrir</button>' +
      '</div>' + (hora || '') + '</div>';
  },
  menuAnexo(ev) {
    if (ev) ev.stopPropagation();
    const m = document.getElementById('chat-menu-anexo'); if (!m) return;
    m.hidden = !m.hidden;
    if (!m.hidden) setTimeout(() => document.addEventListener('click', this._fecharMenu = () => { m.hidden = true; document.removeEventListener('click', this._fecharMenu); }, { once: true }), 0);
  },
  escolherAnexo(qual) {
    const m = document.getElementById('chat-menu-anexo'); if (m) m.hidden = true;
    const inp = document.getElementById('chat-arq-' + qual); if (inp) { inp.value = ''; inp.click(); }
  },
  // valida e guarda os arquivos escolhidos (ate 6, imagem ou PDF); destino = conversa aberta ou o comunicado
  addArquivos(files, input, destino) {
    const lista = destino === 'com' ? this._pendCom : this._pend;
    const recusados = [];
    Array.from(files || []).forEach(f => {
      const tipo = f.type || '';
      if (!this.ehImagem(tipo) && tipo !== 'application/pdf') { recusados.push(f.name + ' (so imagem ou PDF)'); return; }
      if (/image\/(heic|heif)/i.test(tipo)) { recusados.push(f.name + ' (formato HEIC: envie como JPG)'); return; }
      if (tipo === 'application/pdf' && f.size > this.MAX_MB * 1048576) { recusados.push(f.name + ' (maior que ' + this.MAX_MB + ' MB)'); return; }
      if (this.ehImagem(tipo) && f.size > 40 * 1048576) { recusados.push(f.name + ' (imagem grande demais)'); return; }
      if (lista.length >= this.LIMITE_ANEXOS) { recusados.push(f.name + ' (ate ' + this.LIMITE_ANEXOS + ' por mensagem)'); return; }
      lista.push({ file: f, nome: f.name || (this.ehImagem(tipo) ? 'imagem.jpg' : 'arquivo.pdf'), tipo, tamanho: f.size, previa: this.ehImagem(tipo) ? URL.createObjectURL(f) : '' });
    });
    if (input) input.value = '';
    const menu = document.getElementById('chat-menu-anexo'); if (menu) menu.hidden = true;
    if (destino === 'com') this.desenharPendCom(); else { this.desenharPend(); document.getElementById('chat-texto')?.focus(); }
    if (recusados.length) popAviso('Nao entrou: ' + recusados.join('; ') + '.');
  },
  htmlPend(lista, destino, enviando) {
    return lista.map((p, i) => '<div class="chat-pend-item">' +
      (p.previa ? '<img src="' + this.attr(p.previa) + '" alt="">' : '<span class="chat-anexo-mini pdf">' + this.ICO.pdf + '</span>') +
      '<span><b>' + escaparHtml(p.nome) + '</b><small>' + this.tamanhoTxt(p.tamanho) + '</small></span>' +
      (enviando ? '<small class="sub">enviando...</small>' : '<button type="button" class="btn-chip" title="Tirar" onclick="MODULOS.chat.tirarPend(' + i + ', \'' + destino + '\')">&times;</button>') + '</div>').join('');
  },
  desenharPend(enviando) {
    const el = document.getElementById('chat-pend'); if (!el) return;
    el.hidden = !this._pend.length;
    el.innerHTML = this._pend.length ? this.htmlPend(this._pend, 'msg', enviando) + (enviando ? '' : '<small class="sub chat-pend-dica">O texto do campo vai junto. Enter envia.</small>') : '';
  },
  desenharPendCom() {
    const el = document.getElementById('cm-pend'); if (!el) return;
    el.innerHTML = this.htmlPend(this._pendCom, 'com');
  },
  tirarPend(i, destino) {
    const lista = destino === 'com' ? this._pendCom : this._pend;
    const x = lista.splice(i, 1)[0]; if (x && x.previa) URL.revokeObjectURL(x.previa);
    if (destino === 'com') this.desenharPendCom(); else { this.desenharPend(); document.getElementById('chat-texto')?.focus(); }
  },
  colou(e) {
    const arqs = Array.from((e.clipboardData && e.clipboardData.files) || []).filter(f => this.ehImagem(f.type) || f.type === 'application/pdf');
    if (!arqs.length) return;
    e.preventDefault();
    this.addArquivos(arqs);
  },
  ligarArrastar(alvo) {
    if (!alvo || alvo._arrastar) return; alvo._arrastar = true;
    const tem = e => Array.from((e.dataTransfer && e.dataTransfer.types) || []).includes('Files');
    alvo.addEventListener('dragover', e => { if (!tem(e) || !this.aberta) return; e.preventDefault(); alvo.classList.add('soltar'); });
    alvo.addEventListener('dragleave', e => { if (e.target === alvo || !alvo.contains(e.relatedTarget)) alvo.classList.remove('soltar'); });
    alvo.addEventListener('drop', e => { if (!tem(e) || !this.aberta) return; e.preventDefault(); alvo.classList.remove('soltar'); this.addArquivos(e.dataTransfer.files); });
    // celular (sem mouse): tocar na mensagem mostra o botao de reagir dela
    alvo.addEventListener('click', e => {
      const msg = e.target.closest('.chat-msg'); if (!msg || e.target.closest('button, a')) return;
      const ja = msg.classList.contains('toque');
      alvo.querySelectorAll('.chat-msg.toque').forEach(x => x.classList.remove('toque'));
      if (!ja) msg.classList.add('toque');
    });
  },
  // foto: diminui (lado maior 1600 px, JPG) para subir rapido; GIF e PDF vao como estao
  async prepararArquivo(p) {
    if (!this.ehImagem(p.tipo) || /gif/i.test(p.tipo)) return { blob: p.file, tipo: p.tipo, nome: p.nome };
    try {
      const bmp = await new Promise((ok, erro) => { const im = new Image(); im.onload = () => ok(im); im.onerror = erro; im.src = p.previa || URL.createObjectURL(p.file); });
      const lado = Math.max(bmp.naturalWidth, bmp.naturalHeight);
      if (lado <= 1600 && p.file.size <= 600 * 1024) return { blob: p.file, tipo: p.tipo, nome: p.nome };
      const k = Math.min(1, 1600 / lado);
      const cv = document.createElement('canvas'); cv.width = Math.round(bmp.naturalWidth * k); cv.height = Math.round(bmp.naturalHeight * k);
      const cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height); cx.drawImage(bmp, 0, 0, cv.width, cv.height);
      const blob = await new Promise(ok => cv.toBlob(ok, 'image/jpeg', 0.84));
      if (!blob) return { blob: p.file, tipo: p.tipo, nome: p.nome };
      return { blob, tipo: 'image/jpeg', nome: p.nome.replace(/\.[^.]+$/, '') + '.jpg' };
    } catch (e) { return { blob: p.file, tipo: p.tipo, nome: p.nome }; }
  },
  async subirAnexos(lista) {
    const eu = this.eu(); const saida = [];
    for (const p of lista) {
      const a = await this.prepararArquivo(p);
      if (a.blob.size > this.MAX_MB * 1048576) throw new Error(a.nome + ' ficou maior que ' + this.MAX_MB + ' MB.');
      const limpo = (a.nome || 'anexo').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').slice(-60);
      const caminho = eu + '/' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8) + '-' + limpo;
      const { error } = await sb.storage.from('chat').upload(caminho, a.blob, { contentType: a.tipo, upsert: false });
      if (error) throw new Error(/bucket|not found|nao encontrad/i.test(error.message) ? 'falta rodar o SQL do patch 50 (envio de imagem e PDF).' : 'o arquivo ' + a.nome + ' nao subiu (' + error.message + ').');
      saida.push({ path: caminho, nome: a.nome, tipo: a.tipo, tamanho: a.blob.size });
    }
    return saida;
  },
  // miniaturas: link assinado (1 h) para os anexos que aparecem na conversa
  async assinarAnexos() {
    const rol = document.getElementById('chat-msgs'); if (!rol) return;
    const botoes = Array.from(rol.querySelectorAll('.chat-anexo-mini[data-path]'));
    const faltam = [...new Set(botoes.map(b => b.dataset.path).filter(p => !(this._anx[p] && this._anx[p].ate > Date.now())))];
    if (faltam.length) {
      try {
        const { data } = await sb.storage.from('chat').createSignedUrls(faltam, 3600);
        (data || []).forEach(d => { if (d && d.signedUrl) this._anx[d.path] = { url: d.signedUrl, ate: Date.now() + 3300 * 1000 }; });
      } catch (e) { /* sem miniatura, o cartao continua com Abrir */ }
    }
    botoes.forEach(b => { const x = this._anx[b.dataset.path]; if (x && !b.querySelector('img')) b.innerHTML = '<img src="' + this.attr(x.url) + '" alt="">'; });
  },
  async urlAnexo(caminho, baixar) {
    const { data, error } = await sb.storage.from('chat').createSignedUrl(caminho, 3600, baixar ? { download: baixar } : undefined);
    if (error || !data) throw new Error(error ? error.message : 'sem link');
    return data.signedUrl;
  },
  anexoPorCaminho(caminho) {
    for (const m of this._msgs || []) { const a = (m.anexos || []).find(x => x && x.path === caminho); if (a) return a; }
    return { path: caminho, nome: caminho.split('/').pop(), tipo: /\.pdf$/i.test(caminho) ? 'application/pdf' : 'image/jpeg' };
  },
  async abrirAnexo(caminho) {
    const a = this.anexoPorCaminho(caminho);
    if (!this.ehImagem(a.tipo)) {
      const w = window.open('', '_blank');
      try { const url = await this.urlAnexo(caminho); if (w) w.location.href = url; else window.location.href = url; }
      catch (e) { if (w) w.close(); popAviso('Nao consegui abrir o arquivo: ' + e.message); }
      return;
    }
    try {
      const [url, baixar] = await Promise.all([this.urlAnexo(caminho), this.urlAnexo(caminho, a.nome || true)]);
      abrirModal(escaparHtml(a.nome || 'Imagem'),
        '<div class="chat-visor"><img src="' + this.attr(url) + '" alt=""></div>' +
        '<div class="barra-acoes"><a class="btn btn-fantasma" href="' + this.attr(baixar) + '">&#11015; Baixar</a><button class="btn btn-primario" onclick="fecharModal()">Fechar</button></div>', true);
    } catch (e) { popAviso('Nao consegui abrir a imagem: ' + e.message); }
  },

  // \u2500\u2500\u2500\u2500\u2500\u2500\u2500 REACOES (patch 50) \u2500\u2500\u2500\u2500\u2500\u2500\u2500
  async carregarReacoes(conversa) {
    if (this._semReacoes) return;
    const { data, error } = await sb.rpc('fn_chat_reacoes', { p_conversa: conversa });
    if (error) { if (/fn_chat_reacoes|function|schema cache/i.test(error.message)) this._semReacoes = true; return; }
    if (!this.aberta || this.aberta.id !== conversa) return;
    const mapa = {};
    (data || []).forEach(r => { (mapa[r.mensagem_id] = mapa[r.mensagem_id] || []).push({ emoji: r.emoji, usuario_id: r.usuario_id, nome: r.nome }); });
    this._reac = mapa;
    this.desenharReacoes();
  },
  desenharReacoes() {
    const eu = this.eu();
    document.querySelectorAll('#chat-msgs .chat-reacoes').forEach(el => {
      const lista = this._reac[el.dataset.id] || [];
      const grupos = {};
      lista.forEach(r => { (grupos[r.emoji] = grupos[r.emoji] || []).push(r); });
      el.innerHTML = Object.keys(grupos).map(e => {
        const g = grupos[e]; const minha = g.some(r => r.usuario_id === eu);
        const quem = g.map(r => r.usuario_id === eu ? 'voce' : String(r.nome || '').split(' ')[0]).join(', ');
        return '<button type="button" class="chat-reacao' + (minha ? ' minha' : '') + '" title="' + this.attr(quem) + '" data-emoji="' + this.attr(e) + '" onclick="MODULOS.chat.reagir(this.parentNode.dataset.id, this.dataset.emoji)">' + e + (g.length > 1 ? ' <b>' + g.length + '</b>' : '') + '</button>';
      }).join('');
      el.hidden = !lista.length;
    });
  },
  pickerReacao(btn) {
    document.getElementById('chat-picker')?.remove();
    if (this._semReacoes) { popAviso('As reacoes ainda nao estao ativas: falta rodar o SQL do patch 50.'); return; }
    const id = btn.dataset.id;
    const meu = (this._reac[id] || []).find(r => r.usuario_id === this.eu());
    const pk = document.createElement('div'); pk.id = 'chat-picker'; pk.className = 'chat-picker';
    // patch 58: as 6 de sempre (+ a que a pessoa ja usou, se for outra) e o "+" que abre todos os emojis
    const rapidos = this.EMOJIS.concat(meu && !this.EMOJIS.includes(meu.emoji) ? [meu.emoji] : []);
    pk.innerHTML = rapidos.map(e => '<button type="button"' + (meu && meu.emoji === e ? ' class="minha"' : '') + ' data-emoji="' + this.attr(e) + '">' + e + '</button>').join('') +
      '<button type="button" class="chat-picker-mais" title="Todos os emojis" data-mais="1">' + this.ICO.mais + '</button>';
    pk.addEventListener('mousedown', ev => { if (!ev.target.closest('input')) ev.preventDefault(); });
    pk.addEventListener('click', ev => {
      const b = ev.target.closest('button'); if (!b) return;
      if (b.dataset.mais) { this.abrirPainelEmoji(id, pk); return; }
      if (!b.dataset.emoji) return;
      pk.remove(); this.guardarRecente(b.dataset.emoji); this.reagir(id, b.dataset.emoji);
    });
    document.body.appendChild(pk);
    const r = btn.getBoundingClientRect();
    const larg = pk.offsetWidth, alt = pk.offsetHeight;
    pk.style.left = Math.max(8, Math.min(window.innerWidth - larg - 8, r.left + r.width / 2 - larg / 2)) + 'px';
    pk.style.top = Math.max(8, r.top - alt - 8) + 'px';
    // patch 58: composedPath (e nao contains): o "+" troca o conteudo da barrinha no meio do clique
    setTimeout(() => document.addEventListener('click', function fora(ev) {
      if (!pk.isConnected) { document.removeEventListener('click', fora); return; }
      if (!ev.composedPath().includes(pk)) { pk.remove(); document.removeEventListener('click', fora); }
    }), 0);
  },
  // ─────── TODOS OS EMOJIS (patch 58) ───────
  // lista em js/emojis.js (nome em portugues para a busca), carregada so na primeira vez que alguem abre o painel
  carregarEmojis() {
    if (window.CORTEX_EMOJIS) return Promise.resolve(window.CORTEX_EMOJIS);
    if (this._carregandoEmojis) return this._carregandoEmojis;
    this._carregandoEmojis = new Promise((ok, falha) => {
      const s = document.createElement('script'); s.src = 'js/emojis.js?v=58';
      s.onload = () => ok(window.CORTEX_EMOJIS || []);
      s.onerror = () => { this._carregandoEmojis = null; falha(new Error('Nao consegui carregar os emojis.')); };
      document.head.appendChild(s);
    });
    return this._carregandoEmojis;
  },
  recentes() { try { return JSON.parse(localStorage.getItem('cortex_emoji_recentes') || '[]'); } catch (e) { return []; } },
  guardarRecente(e) {
    try { const l = this.recentes().filter(x => x !== e); l.unshift(e); localStorage.setItem('cortex_emoji_recentes', JSON.stringify(l.slice(0, 24))); } catch (x) { /* sem memoria do navegador */ }
  },
  semAcento(s) { return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); },
  async abrirPainelEmoji(id, pk) {
    let cats;
    try { cats = await this.carregarEmojis(); } catch (e) { popAviso(e.message); return; }
    const meu = ((this._reac[id] || []).find(r => r.usuario_id === this.eu()) || {}).emoji;
    const rec = this.recentes();
    // painel grande no meio da tela (no celular sobe de baixo), no lugar da barrinha
    if (pk) pk.remove();
    const fundo = document.createElement('div'); fundo.className = 'chat-emo-fundo'; fundo.id = 'chat-emo-fundo';
    const painel = document.createElement('div'); painel.className = 'chat-emo grande'; painel.id = 'chat-picker';
    fundo.appendChild(painel); document.body.appendChild(fundo);
    fundo.addEventListener('click', ev => { if (ev.target === fundo) fechar(); });
    const fechar = () => { fundo.remove(); document.removeEventListener('keydown', esc); };
    const esc = ev => { if (ev.key === 'Escape') { ev.preventDefault(); fechar(); } };
    document.addEventListener('keydown', esc);
    const lista = (rec.length ? [{ k: 'recentes', n: 'Recentes', i: '\ud83d\udd52', e: rec.map(e => [e, '']) }] : []).concat(cats);
    const botao = e => '<button type="button" class="chat-emo-e' + (e === meu ? ' minha' : '') + '" data-emoji="' + this.attr(e) + '">' + e + '</button>';
    painel.innerHTML = '<div class="chat-emo-topo"><input type="search" class="chat-emo-busca" placeholder="Buscar emoji (ex.: riso, coracao, palmas)" autocomplete="off">' +
      '<button type="button" class="chat-emo-x" title="Fechar (Esc)">' + this.ICO.fechar + '</button></div>' +
      '<div class="chat-emo-abas">' + lista.map((c, i) => '<button type="button" data-cat="' + c.k + '" title="' + c.n + '"' + (i === 0 ? ' class="ativa"' : '') + '>' + c.i + '</button>').join('') + '</div>' +
      '<div class="chat-emo-grade"></div>';
    const grade = painel.querySelector('.chat-emo-grade'), abas = painel.querySelector('.chat-emo-abas'), busca = painel.querySelector('.chat-emo-busca');
    const marcarAba = k => abas.querySelectorAll('button').forEach(b => b.classList.toggle('ativa', b.dataset.cat === k));
    // todas as categorias em sequencia, com titulo; as abas pulam para a categoria
    const irPara = k => { const s = grade.querySelector('[data-sec="' + k + '"]'); if (s) grade.scrollTop = s.offsetTop - grade.offsetTop; marcarAba(k); };
    const mostrar = k => {
      grade.innerHTML = lista.map(c => '<div class="chat-emo-sec" data-sec="' + c.k + '"><h5>' + c.n + '</h5><div class="chat-emo-g">' + c.e.map(x => botao(x[0])).join('') + '</div></div>').join('');
      irPara(k || lista[0].k);
    };
    mostrar(lista[0].k);
    grade.addEventListener('scroll', () => {
      if (busca.value.trim()) return;
      let atual = lista[0].k;
      grade.querySelectorAll('.chat-emo-sec').forEach(s => { if (s.offsetTop - grade.offsetTop <= grade.scrollTop + 30) atual = s.dataset.sec; });
      marcarAba(atual);
    });
    abas.addEventListener('click', ev => {
      const b = ev.target.closest('button[data-cat]'); if (!b) return;
      if (busca.value) { busca.value = ''; mostrar(b.dataset.cat); } else irPara(b.dataset.cat);
    });
    busca.addEventListener('input', () => {
      const q = this.semAcento(busca.value.trim());
      if (!q) { mostrar(lista[0].k); return; }
      const termos = q.split(/\s+/);
      const achou = [];
      cats.forEach(c => c.e.forEach(x => { if (termos.every(t => x[1].includes(t)) && !achou.includes(x[0])) achou.push(x[0]); }));
      grade.innerHTML = achou.length ? '<h5>' + achou.length + ' encontrado' + (achou.length === 1 ? '' : 's') + '</h5><div class="chat-emo-g">' + achou.slice(0, 160).map(botao).join('') + '</div>' : '<p class="chat-emo-nada">Nenhum emoji com "' + escaparHtml(busca.value.trim()) + '"</p>';
      abas.querySelectorAll('button').forEach(b => b.classList.remove('ativa'));
    });
    painel.addEventListener('click', ev => {
      if (ev.target.closest('.chat-emo-x')) { fechar(); return; }
      const b = ev.target.closest('.chat-emo-e'); if (!b) return;
      fechar(); this.guardarRecente(b.dataset.emoji); this.reagir(id, b.dataset.emoji);
    });
    if (window.matchMedia('(min-width: 721px)').matches) busca.focus();
  },

  async reagir(id, emoji) {
    document.querySelectorAll('#chat-msgs .chat-msg.toque').forEach(x => x.classList.remove('toque'));   // celular: esconde os botoes depois de escolher
    const eu = this.eu();
    const antes = (this._reac[id] || []).slice();
    const meu = antes.find(r => r.usuario_id === eu);
    // na tela na hora; o banco confirma
    const depois = antes.filter(r => r.usuario_id !== eu);
    if (!meu || meu.emoji !== emoji) depois.push({ emoji, usuario_id: eu, nome: window.CORTEX_SESSAO.profile.nome });
    this._reac[id] = depois; this.desenharReacoes();
    const { error } = await sb.rpc('fn_chat_reagir', { p_mensagem: id, p_emoji: emoji });
    if (error) {
      this._reac[id] = antes; this.desenharReacoes();
      popAviso(/fn_chat_reagir|function|schema cache/i.test(error.message) ? 'As reacoes ainda nao estao ativas: falta rodar o SQL do patch 50.' : 'Nao foi possivel reagir: ' + error.message);
    }
    document.getElementById('chat-texto')?.focus();
  },

  // ─────────────── BADGE (bolinha no menu) ───────────────

  // Chamado pelo app.js ao entrar (nome antigo mantido por compatibilidade)
  iniciarFlutuante() { this.iniciar(); },
  iniciar() {
    document.getElementById('chat-fab')?.remove();
    document.getElementById('chat-mini')?.remove();
    if (window.CORTEX_VER_USUARIO) return;
    this.assinar();
    this.atualizarBadge();
    // patch 45: alem do tempo real, confere a cada 20 s (e ao voltar para a aba), para o numero aparecer
    // mesmo quando o tempo real do Supabase nao entrega a mensagem
    clearInterval(this._timerBadge);
    this._timerBadge = setInterval(() => { if (!document.hidden) this.conferir(); }, 20000);
    if (!this._visOuvida) { this._visOuvida = true; document.addEventListener('visibilitychange', () => { if (!document.hidden) this.conferir(); }); }
  },
  async conferir() {
    const antes = this._naoLidas;
    await this.atualizarBadge();
    // com o chat aberto: chegou mensagem (ou alguma conversa sumiu) -> atualiza a lista e a conversa aberta
    if (document.getElementById('chat-app')) {
      if (this._naoLidas !== antes) await this.carregarLista();
      else if (Date.now() - (this._listaEm || 0) > 60000) await this.carregarLista();
      if (this.aberta && this._naoLidas > (antes || 0)) this.carregarThread(this.aberta.id, true);
      else if (this.aberta) this.carregarReacoes(this.aberta.id);
    }
  },

  // numero de mensagens nao lidas: botao com o numero no item Chat da sidebar (igual ao do Inicio),
  // bolinha no icone com o menu recolhido, contador no "Mais" do celular e "(n)" no titulo da aba
  async atualizarBadge() {
    let n = 0;
    try {
      const { data, error } = await sb.rpc('fn_chat_nao_lidas');
      if (error) return;
      n = parseInt(data, 10) || 0;
    } catch (e) { return; }
    this._naoLidas = n;
    const txt = n > 99 ? '99+' : String(n);
    const tit = n + ' mensage' + (n === 1 ? 'm nao lida' : 'ns nao lidas') + ' no chat';
    document.querySelectorAll('.nav-item[data-modulo="chat"]').forEach(item => {
      let selo = item.querySelector('.nav-badge');
      if (!selo) { selo = document.createElement('span'); selo.className = 'nav-badge'; item.appendChild(selo); }
      selo.textContent = txt; selo.title = tit; selo.hidden = n === 0;
    });
    const mais = document.querySelector('.barra-celular button[data-cel="mais"]');
    if (mais) {
      let c = mais.querySelector('.cel-conta-chat');
      if (!c) { c = document.createElement('span'); c.className = 'cel-conta cel-conta-chat'; mais.appendChild(c); }
      c.textContent = txt; c.title = tit; c.hidden = n === 0;
    }
    if (!this._tituloBase) this._tituloBase = document.title.replace(/^\(\d+\+?\)\s*/, '');
    document.title = (n ? '(' + txt + ') ' : '') + this._tituloBase;
  },

  // ─────────────── APAGAR CONVERSA (so suporte, patch 45) ───────────────
  // Some para todos os participantes: mensagens, participantes e a conversa saem do banco (fn_chat_apagar_conversa).
  async apagarConversa() {
    const c = this.aberta; if (!c || !this.ehSuporte()) return;
    const grupo = c.tipo === 'grupo';
    const n = (this._msgs || []).length;
    const ok = await popConfirmar('Apagar ' + (grupo ? 'o grupo "' + (c.nome || '') + '"' : 'a conversa com ' + (c.nome || '')) + ' para ' + (grupo ? 'todos os participantes' : 'as duas pessoas') + '?\n\n' +
      (n ? n + ' mensage' + (n === 1 ? 'm sai' : 'ns saem') : 'A conversa sai') + ' do banco de dados. Nao da para desfazer.',
      { titulo: 'Apagar conversa', ok: 'Apagar do banco', cancelar: 'Cancelar', tipo: 'aviso' });
    if (!ok) return;
    const { data, error } = await sb.rpc('fn_chat_apagar_conversa', { p_conversa: c.id });
    if (error) {
      popAviso(/fn_chat_apagar_conversa|Could not find the function|PGRST202/i.test(error.message + ' ' + (error.code || ''))
        ? 'Falta rodar o SQL do patch 45 no Supabase (funcao fn_chat_apagar_conversa).' : 'Nao foi possivel apagar: ' + error.message);
      return;
    }
    this.voltarLista();
    await this.carregarLista();
    popAviso('Conversa apagada do banco' + (typeof data === 'number' ? ' (' + data + ' mensage' + (data === 1 ? 'm' : 'ns') + ')' : '') + '.', 'Apagada');
  },

  // ─────────────── EQUIPE (pessoas) ───────────────

  async equipe() {
    if (this._equipe) return this._equipe;
    const { data } = await sb.from('profiles')
      .select('id, nome, perfil, foto_path, coordenador_id')
      .neq('perfil', 'familia').eq('ativo', true).neq('id', this.eu())
      .order('nome');
    this._equipe = data || [];
    await this.assinarFotos(this._equipe.map(p => p.foto_path));
    return this._equipe;
  },

  htmlPessoas(lista, modo, marcados) {
    if (!lista.length) return '<p class="sub" style="padding:10px">Ninguem encontrado.</p>';
    return lista.map(p =>
      modo === 'clique'
        ? '<div class="chat-pessoa" onclick="MODULOS.chat.iniciarConversa(\'' + p.id + '\')">' + this.avatarPessoa(p, 'peq') +
          '<div><b>' + escaparHtml(p.nome) + '</b><small>' + escaparHtml(ROTULOS_PERFIL[p.perfil] || p.perfil) + '</small></div></div>'
        : '<label class="chat-pessoa marcavel"><input type="checkbox" class="chat-marca-pessoa" value="' + p.id + '"' + (marcados && marcados.has(p.id) ? ' checked' : '') + ' onchange="MODULOS.chat.contarMarcados()">' +
          this.avatarPessoa(p, 'peq') + '<div><b>' + escaparHtml(p.nome) + '</b><small>' + escaparHtml(ROTULOS_PERFIL[p.perfil] || p.perfil) + '</small></div></label>'
    ).join('');
  },

  filtrarPessoas(termo, modo) {
    const t = (termo || '').toLowerCase();
    const alvo = document.getElementById('cp-lista');
    if (!alvo) return;
    const marcados = this.marcadosAtuais();   // preserva o que ja estava marcado (e respeita o que foi desmarcado)
    const lista = (this._equipe || []).filter(p => !this._excluir || !this._excluir.has(p.id)).filter(p => !t || p.nome.toLowerCase().includes(t) || (ROTULOS_PERFIL[p.perfil] || p.perfil || '').toLowerCase().includes(t));
    alvo.innerHTML = this.htmlPessoas(lista, modo, marcados);
    this.contarMarcados();
  },

  marcadosAtuais() {
    const s = new Set(this._marcados || []);
    // o que esta na tela manda (pode ter desmarcado)
    document.querySelectorAll('.chat-marca-pessoa').forEach(i => { if (i.checked) s.add(i.value); else s.delete(i.value); });
    this._marcados = s;
    return s;
  },

  contarMarcados() {
    const n = this.marcadosAtuais().size;
    const b = document.getElementById('cp-acao');
    if (b) { b.disabled = n === 0; b.textContent = (b.dataset.rotulo || 'Confirmar') + (n ? ' (' + n + ')' : ''); }
    const r = document.getElementById('cp-resumo');
    if (r) r.textContent = n ? n + ' pessoa' + (n === 1 ? '' : 's') + ' selecionada' + (n === 1 ? '' : 's') : 'Ninguem selecionado';
  },

  // ─────────────── NOVA CONVERSA / GRUPO ───────────────

  async modalNova(aba) {
    await this.equipe();
    this._marcados = new Set(); this._excluir = null;
    aba = aba || 'conversa';
    abrirModal('Nova conversa',
      '<div class="chat-abas">' +
      '  <button class="chat-aba' + (aba === 'conversa' ? ' ativa' : '') + '" onclick="MODULOS.chat.modalNova(\'conversa\')">Conversa</button>' +
      '  <button class="chat-aba' + (aba === 'grupo' ? ' ativa' : '') + '" onclick="MODULOS.chat.modalNova(\'grupo\')">Grupo</button></div>' +
      (aba === 'grupo'
        ? '<div class="campo"><label>Nome do grupo</label><input id="cp-nome" placeholder="Ex.: Equipe da Betania, Coordenacao, Recepcao"></div>' : '') +
      '<label class="chat-busca dentro"><span>' + this.ICO.busca + '</span><input id="cp-busca" placeholder="Buscar pelo nome ou funcao..." oninput="MODULOS.chat.filtrarPessoas(this.value, \'' + (aba === 'grupo' ? 'marcar' : 'clique') + '\')"></label>' +
      '<div class="chat-pessoas" id="cp-lista">' + this.htmlPessoas(this._equipe, aba === 'grupo' ? 'marcar' : 'clique', this._marcados) + '</div>' +
      (aba === 'grupo'
        ? '<div class="barra-acoes" style="align-items:center"><span class="sub" id="cp-resumo" style="margin-right:auto">Ninguem selecionado</span>' +
          '<button class="btn btn-fantasma" onclick="fecharModal()">Cancelar</button>' +
          '<button class="btn btn-primario" id="cp-acao" data-rotulo="Criar grupo" disabled onclick="MODULOS.chat.criarGrupo()">Criar grupo</button></div>'
        : ''), true);
    setTimeout(() => document.getElementById(aba === 'grupo' ? 'cp-nome' : 'cp-busca')?.focus(), 60);
  },

  async iniciarConversa(outroId) {
    fecharModal();
    const { data, error } = await sb.rpc('fn_chat_privada', { p_outro: outroId });
    if (error) { popAviso('Nao foi possivel abrir a conversa: ' + error.message); return; }
    await this.irPara(data);
  },

  async irPara(conversaId) {
    if (!document.getElementById('chat-app')) {
      abrirModulo('chat');
      await new Promise(r => setTimeout(r, 150));
    }
    await this.carregarLista();
    this.abrir(conversaId);
  },

  async criarGrupo() {
    const nome = (document.getElementById('cp-nome')?.value || '').trim();
    const membros = Array.from(this.marcadosAtuais());
    if (!nome) { popAviso('De um nome ao grupo.'); return; }
    if (!membros.length) { popAviso('Escolha pelo menos uma pessoa.'); return; }
    const b = document.getElementById('cp-acao'); if (b) { b.disabled = true; b.textContent = 'Criando...'; }
    const { data, error } = await sb.rpc('fn_chat_criar_grupo', { p_nome: nome, p_membros: membros });
    if (error) { if (b) { b.disabled = false; b.textContent = 'Criar grupo'; } popAviso('Nao foi possivel criar o grupo: ' + error.message); return; }
    fecharModal();
    await this.irPara(data);
  },

  // ─────────────── PARTICIPANTES DO GRUPO ───────────────

  abrirParticipantes() {
    const c = this.aberta; if (!c || c.tipo !== 'grupo') return;
    const eu = this.eu();
    const lista = this._parts.slice().sort((a, b) => (a.usuario_id === eu ? -1 : b.usuario_id === eu ? 1 : 0) || String((a.pessoa || {}).nome || '').localeCompare(String((b.pessoa || {}).nome || '')));
    abrirModal('Participantes &middot; ' + escaparHtml(c.nome || ''),
      '<div class="chat-pessoas" style="max-height:46vh">' +
      lista.map(p => { const q = p.pessoa || {}; return '<div class="chat-pessoa">' + this.avatarPessoa({ nome: q.nome, foto_path: q.foto_path }, 'peq') +
        '<div><b>' + escaparHtml(q.nome || 'Usuario') + (p.usuario_id === eu ? ' <small class="sub">(voce)</small>' : '') + '</b>' +
        '<small>' + escaparHtml(ROTULOS_PERFIL[q.perfil] || q.perfil || '') + (q.ativo === false ? ' &middot; inativo' : '') + '</small></div></div>'; }).join('') +
      '</div>' +
      '<div class="barra-acoes" style="flex-wrap:wrap">' +
      '  <button class="btn btn-fantasma" onclick="MODULOS.chat.sairGrupo()" style="margin-right:auto; color:var(--st-bad, #B91C1C)">Sair do grupo</button>' +
      '  <button class="btn btn-fantasma" onclick="MODULOS.chat.renomearGrupo()">Renomear</button>' +
      '  <button class="btn btn-primario" onclick="MODULOS.chat.modalAdicionar()">+ Adicionar pessoas</button></div>', true);
  },

  async modalAdicionar() {
    const c = this.aberta; if (!c) return;
    await this.equipe();
    this._marcados = new Set();
    this._excluir = new Set(this._parts.map(p => p.usuario_id));
    const lista = this._equipe.filter(p => !this._excluir.has(p.id));
    abrirModal('Adicionar ao grupo &middot; ' + escaparHtml(c.nome || ''),
      '<label class="chat-busca dentro"><span>' + this.ICO.busca + '</span><input id="cp-busca" placeholder="Buscar pelo nome ou funcao..." oninput="MODULOS.chat.filtrarPessoas(this.value, \'marcar\')"></label>' +
      '<div class="chat-pessoas" id="cp-lista">' + this.htmlPessoas(lista, 'marcar', this._marcados) + '</div>' +
      '<div class="barra-acoes" style="align-items:center"><span class="sub" id="cp-resumo" style="margin-right:auto">Ninguem selecionado</span>' +
      '<button class="btn btn-fantasma" onclick="MODULOS.chat.abrirParticipantes()">Voltar</button>' +
      '<button class="btn btn-primario" id="cp-acao" data-rotulo="Adicionar" disabled onclick="MODULOS.chat.adicionar()">Adicionar</button></div>', true);
    setTimeout(() => document.getElementById('cp-busca')?.focus(), 60);
  },

  async adicionar() {
    const c = this.aberta; if (!c) return;
    const membros = Array.from(this.marcadosAtuais());
    if (!membros.length) return;
    const { error } = await sb.rpc('fn_chat_adicionar', { p_conversa: c.id, p_membros: membros });
    if (error) { popAviso('Nao foi possivel adicionar: ' + error.message); return; }
    fecharModal();
    await this.carregarThread(c.id);
    this.carregarLista();
  },

  async renomearGrupo() {
    const c = this.aberta; if (!c) return;
    abrirModal('Renomear grupo',
      '<div class="campo"><label>Nome</label><input id="cp-nome" value="' + escaparHtml(c.nome || '') + '" onkeydown="if(event.key===\'Enter\') MODULOS.chat.salvarNome()"></div>' +
      '<div class="barra-acoes"><button class="btn btn-fantasma" onclick="MODULOS.chat.abrirParticipantes()">Voltar</button>' +
      '<button class="btn btn-primario" onclick="MODULOS.chat.salvarNome()">Salvar</button></div>');
    setTimeout(() => document.getElementById('cp-nome')?.select(), 60);
  },

  async salvarNome() {
    const c = this.aberta; if (!c) return;
    const nome = (document.getElementById('cp-nome')?.value || '').trim();
    if (!nome) { popAviso('De um nome ao grupo.'); return; }
    const { error } = await sb.from('chat_conversas').update({ nome: nome }).eq('id', c.id);
    if (error) { popAviso('Nao foi possivel renomear: ' + error.message); return; }
    fecharModal();
    c.nome = nome;
    await this.carregarLista();
    const atual = this.lista.find(x => x.id === c.id); if (atual) { this.aberta = atual; this.carregarThread(c.id, true); }
  },

  async sairGrupo() {
    const c = this.aberta; if (!c) return;
    const ok = await popConfirmar('Sair do grupo "' + (c.nome || '') + '"? Voce deixa de receber as mensagens dele.', { ok: 'Sair' });
    if (!ok) return;
    const { error } = await sb.rpc('fn_chat_sair', { p_conversa: c.id });
    if (error) { popAviso('Nao foi possivel sair: ' + error.message); return; }
    fecharModal();
    this.voltarLista();
    this.carregarLista();
  },

  // ─────────────── COMUNICADO ───────────────

  async modalComunicado() {
    await this.equipe();
    this._marcados = new Set(); this._excluir = null; this._pendCom = [];
    const eu = this.eu();
    const temEquipe = this._equipe.some(p => p.coordenador_id === eu);
    const chips = [
      ['todos', 'Todos'],
      ['aplicador', 'Aplicadores'],
      ['coordenacao', 'Coordenacao'],
      ['recepcao', 'Recepcao'],
      temEquipe ? ['equipe', 'Minha equipe'] : null
    ].filter(Boolean);
    abrirModal('Comunicado',
      '<p class="sub" style="margin:-4px 0 10px">Cada pessoa escolhida recebe a mensagem <b>no privado</b>, como se voce tivesse escrito para ela. Nao cria grupo.</p>' +
      '<div class="chat-chips">' + chips.map(ch => '<button class="btn-chip" onclick="MODULOS.chat.marcarConjunto(\'' + ch[0] + '\')">' + ch[1] + '</button>').join('') + '</div>' +
      '<label class="chat-busca dentro"><span>' + this.ICO.busca + '</span><input id="cp-busca" placeholder="Buscar pelo nome ou funcao..." oninput="MODULOS.chat.filtrarPessoas(this.value, \'marcar\')"></label>' +
      '<div class="chat-pessoas baixa" id="cp-lista">' + this.htmlPessoas(this._equipe, 'marcar', this._marcados) + '</div>' +
      '<div class="campo" style="margin-top:10px"><label>Mensagem</label><textarea id="cm-texto" rows="4" placeholder="Ex.: Lembrete: reuniao de equipe sexta as 18h na sala 2."></textarea></div>' +
      '<div class="campo"><button type="button" class="btn-chip" onclick="document.getElementById(\'cm-arq\').click()">+ Anexar imagem ou PDF</button>' +
      '<input type="file" id="cm-arq" accept="image/*,application/pdf" multiple hidden onchange="MODULOS.chat.addArquivos(this.files, this, \'com\')">' +
      '<div class="chat-pend com" id="cm-pend"></div></div>' +
      '<div class="barra-acoes" style="align-items:center"><span class="sub" id="cp-resumo" style="margin-right:auto">Ninguem selecionado</span>' +
      '<button class="btn btn-fantasma" onclick="fecharModal()">Cancelar</button>' +
      '<button class="btn btn-primario" id="cp-acao" data-rotulo="Enviar" disabled onclick="MODULOS.chat.enviarComunicado()">Enviar</button></div>', true);
  },

  marcarConjunto(qual) {
    const eu = this.eu();
    const alvo = this._equipe.filter(p => {
      if (qual === 'todos') return true;
      if (qual === 'aplicador') return ['aplicador', 'terapeuta'].includes(p.perfil);
      if (qual === 'coordenacao') return ['coordenador', 'direcao'].includes(p.perfil);
      if (qual === 'recepcao') return ['recepcao', 'callcenter'].includes(p.perfil);
      if (qual === 'equipe') return p.coordenador_id === eu;
      return false;
    }).map(p => p.id);
    const s = this.marcadosAtuais();
    const todosJa = alvo.length && alvo.every(id => s.has(id));
    alvo.forEach(id => { if (todosJa) s.delete(id); else s.add(id); });
    this._marcados = s;
    document.querySelectorAll('.chat-marca-pessoa').forEach(i => { i.checked = s.has(i.value); });
    this.contarMarcados();
  },

  async enviarComunicado() {
    const dest = Array.from(this.marcadosAtuais());
    const texto = (document.getElementById('cm-texto')?.value || '').trim();
    if (!dest.length) { popAviso('Escolha para quem vai o comunicado.'); return; }
    if (!texto) { popAviso('Escreva a mensagem.'); document.getElementById('cm-texto')?.focus(); return; }
    const pend = this._pendCom.slice();
    const ok = await popConfirmar('Enviar este comunicado' + (pend.length ? ' com ' + pend.length + ' anexo' + (pend.length === 1 ? '' : 's') : '') + ' para ' + dest.length + ' pessoa' + (dest.length === 1 ? '' : 's') + '? Cada uma recebe no privado.', { ok: 'Enviar' });
    if (!ok) return;
    const b = document.getElementById('cp-acao'); if (b) { b.disabled = true; b.textContent = 'Enviando...'; }
    let r;
    try {
      if (pend.length) {
        const anexos = await this.subirAnexos(pend);
        r = await sb.rpc('fn_chat_comunicado_anexos', { p_destinatarios: dest, p_texto: texto, p_anexos: anexos });
        if (r.error && /fn_chat_comunicado_anexos|schema cache|function/i.test(r.error.message)) r.error.message = 'falta rodar o SQL do patch 50 (comunicado com anexos).';
      } else r = await sb.rpc('fn_chat_comunicado', { p_destinatarios: dest, p_texto: texto });
    } catch (e) { r = { error: { message: e.message } }; }
    const { data, error } = r;
    if (error) { if (b) { b.disabled = false; b.textContent = 'Enviar'; } popAviso('Nao foi possivel enviar: ' + error.message); return; }
    this._pendCom = [];
    fecharModal();
    popAviso('Comunicado enviado para ' + (data || 0) + ' pessoa' + (data === 1 ? '' : 's') + '. Cada uma recebeu no privado.', 'Enviado');
    this.carregarLista();
  }
};
