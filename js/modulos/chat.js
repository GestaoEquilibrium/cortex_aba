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
    mais: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>'
  },

  eu() { return window.CORTEX_SESSAO.user.id; },
  ehGestao() {
    const p = window.CORTEX_SESSAO.profile;
    return ['direcao', 'coordenador', 'suporte'].includes(p.perfil_real || p.perfil);
  },

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
    await this.assinarFotos(this.lista.map(c => c.outro_foto));
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
    const c = this.lista.find(x => x.id === id);
    if (!c) return;
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
    const [rM, rP] = await Promise.all([
      sb.from('chat_mensagens').select('id, autor_id, texto, tipo, criado_em, autor:profiles!chat_mensagens_autor_id_fkey(nome, foto_path)')
        .eq('conversa_id', id).order('criado_em').limit(400),
      sb.from('chat_participantes').select('usuario_id, ultima_leitura, pessoa:profiles!chat_participantes_usuario_id_fkey(nome, perfil, foto_path, ativo)')
        .eq('conversa_id', id)
    ]);
    if (!this.aberta || this.aberta.id !== id) return;   // trocou de conversa no meio
    this._msgs = rM.data || [];
    this._parts = rP.data || [];
    await this.assinarFotos(this._parts.map(p => p.pessoa && p.pessoa.foto_path));

    const rascunho = soMensagens ? (document.getElementById('chat-texto')?.value || '') : '';
    alvo.innerHTML = this.htmlCabecalho() +
      '<div class="chat-msgs" id="chat-msgs">' + this.htmlMensagens() + '</div>' +
      '<div class="chat-envio">' +
      '  <textarea id="chat-texto" rows="1" placeholder="' + (window.matchMedia('(max-width: 720px)').matches ? 'Escreva uma mensagem...' : 'Escreva uma mensagem... (Enter envia, Shift+Enter quebra a linha)') + '" ' +
      '    onkeydown="MODULOS.chat.tecla(event)" oninput="MODULOS.chat.crescer(this)"></textarea>' +
      '  <button class="chat-enviar" title="Enviar" onclick="MODULOS.chat.enviar()">' + this.ICO.enviar + '</button>' +
      '</div>';
    const ta = document.getElementById('chat-texto');
    if (rascunho) { ta.value = rascunho; this.crescer(ta); }
    const rol = document.getElementById('chat-msgs'); rol.scrollTop = rol.scrollHeight;
    if (!soMensagens && window.matchMedia('(min-width: 721px)').matches) ta.focus();

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
      return h + '<div class="chat-bolha' + (minha ? ' minha' : '') + (m.tipo === 'comunicado' ? ' comunicado' : '') + (mostraNome ? ' com-nome' : '') + '">' +
        (mostraNome ? '<small class="chat-autor ' + corAvatar(m.autor ? m.autor.nome : '') + '">' + escaparHtml(nome) + '</small>' : '') +
        (m.tipo === 'comunicado' ? '<small class="chat-selo-com">&#128227; Comunicado</small>' : '') +
        '<div class="chat-texto">' + this.formatar(m.texto) + '</div>' +
        '<small class="chat-hora">' + this.hora(m.criado_em) + (minha ? ' <span class="chat-check' + (lida ? ' lida' : '') + '">' + (lida ? '&#10003;&#10003;' : '&#10003;') + '</span>' : '') + '</small>' +
        '</div>';
    }).join('');
  },

  formatar(t) {
    return escaparHtml(t || '').replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>').replace(/\n/g, '<br>');
  },

  tecla(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.enviar(); }
  },
  crescer(ta) {
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 140) + 'px';
  },

  async enviar() {
    const ta = document.getElementById('chat-texto');
    if (!ta || !this.aberta) return;
    const texto = ta.value.trim();
    if (!texto) return;
    ta.value = ''; this.crescer(ta);
    const conversa = this.aberta.id;
    const { error } = await sb.from('chat_mensagens').insert({ conversa_id: conversa, autor_id: this.eu(), texto: texto });
    if (error) { ta.value = texto; popAviso('Nao foi possivel enviar: ' + error.message); return; }
    if (this.aberta && this.aberta.id === conversa) this.carregarThread(conversa, true);
    clearTimeout(this._timerLista);
    this._timerLista = setTimeout(() => this.carregarLista(), 200);
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
  },

  async atualizarBadge() {
    let n = 0;
    try {
      const { data, error } = await sb.rpc('fn_chat_nao_lidas');
      if (error) return;
      n = data || 0;
    } catch (e) { return; }
    const item = document.querySelector('.nav-item[data-modulo="chat"]');
    if (item) {
      let selo = item.querySelector('.nav-badge');
      if (!selo) { selo = document.createElement('span'); selo.className = 'nav-badge'; item.appendChild(selo); }
      selo.textContent = n > 9 ? '9+' : n;
      selo.hidden = n === 0;
    }
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
    this._marcados = new Set(); this._excluir = null;
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
    const ok = await popConfirmar('Enviar este comunicado para ' + dest.length + ' pessoa' + (dest.length === 1 ? '' : 's') + '? Cada uma recebe no privado.', { ok: 'Enviar' });
    if (!ok) return;
    const b = document.getElementById('cp-acao'); if (b) { b.disabled = true; b.textContent = 'Enviando...'; }
    const { data, error } = await sb.rpc('fn_chat_comunicado', { p_destinatarios: dest, p_texto: texto });
    if (error) { if (b) { b.disabled = false; b.textContent = 'Enviar'; } popAviso('Nao foi possivel enviar: ' + error.message); return; }
    fecharModal();
    popAviso('Comunicado enviado para ' + (data || 0) + ' pessoa' + (data === 1 ? '' : 's') + '. Cada uma recebeu no privado.', 'Enviado');
    this.carregarLista();
  }
};
