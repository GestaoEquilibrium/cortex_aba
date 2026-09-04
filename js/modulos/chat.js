// ============================================================================
// CORTEX aba - js/modulos/chat.js
// Sprint 14: Chat de Suporte.
// - Cada pessoa da equipe tem UMA conversa com o suporte tecnico
// - O suporte ve todas as conversas, com nao-lidas em destaque
// - Tempo real via Supabase Realtime (mesma base da TV)
// ============================================================================

window.MODULOS = window.MODULOS || {};

window.MODULOS.chat = {

  el: null,
  canal: null,
  conversaAberta: null, // usuario_id da conversa em foco (modo suporte)

  ehSuporte() { return window.CORTEX_SESSAO.profile.perfil_real === 'suporte'
    || window.CORTEX_SESSAO.profile.perfil === 'suporte'; },

  async render(el) {
    this.el = el;
    this.assinar();

    if (this.ehSuporte()) {
      el.innerHTML =
        '<div class="pagina-cabecalho">' +
        '  <div><h2>Chat de Suporte</h2>' +
        '  <p class="sub">Conversas da equipe com o suporte. Novas mensagens chegam sozinhas.</p></div>' +
        '</div>' +
        '<div class="chat-duplo">' +
        '  <div class="cartao chat-conversas" id="chat-conversas"><p class="sub">Carregando...</p></div>' +
        '  <div class="cartao chat-thread" id="chat-thread">' +
        '    <div class="vazio"><div class="simbolo-vazio">&#128172;</div>' +
        '    <strong>Escolha uma conversa</strong>Selecione ao lado para responder.</div>' +
        '  </div>' +
        '</div>';
      await this.listarConversas();
    } else {
      el.innerHTML =
        '<div class="pagina-cabecalho">' +
        '  <div><h2>Suporte</h2>' +
        '  <p class="sub">Fale com o suporte tecnico do CORTEX. Respostas chegam aqui mesmo.</p></div>' +
        '</div>' +
        '<div class="cartao chat-thread" id="chat-thread"><p class="sub">Carregando...</p></div>';
      await this.abrirConversa(window.CORTEX_SESSAO.user.id);
    }
  },

  // ─────────────── TEMPO REAL ───────────────

  assinar() {
    if (this.canal) return;
    try {
      this.canal = sb.channel('chat-suporte')
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'mensagens_suporte' },
          payload => this.aoChegar(payload.new))
        .subscribe();
    } catch (e) { /* sem realtime, o F5 resolve */ }
  },

  aoChegar(m) {
    // Modulo pode nao estar visivel; atualiza apenas se estiver
    if (!document.getElementById('chat-thread')) return;

    if (this.ehSuporte()) {
      this.listarConversas();
      if (this.conversaAberta && m.usuario_id === this.conversaAberta) {
        this.carregarThread(this.conversaAberta);
      }
    } else if (m.usuario_id === window.CORTEX_SESSAO.user.id) {
      this.carregarThread(m.usuario_id);
    }
  },

  // ─────────────── MODO SUPORTE: LISTA DE CONVERSAS ───────────────

  async listarConversas() {
    const { data } = await sb.from('mensagens_suporte')
      .select('usuario_id, autor_id, texto, criado_em, lida, dono:profiles!mensagens_suporte_usuario_id_fkey(nome, perfil)')
      .order('criado_em', { ascending: false })
      .limit(500);

    const conversas = {};
    (data || []).forEach(m => {
      if (!conversas[m.usuario_id]) {
        conversas[m.usuario_id] = {
          usuario_id: m.usuario_id,
          nome: m.dono ? m.dono.nome : 'Usuario',
          perfil: m.dono ? m.dono.perfil : '',
          ultima: m,
          naoLidas: 0
        };
      }
      if (!m.lida && m.autor_id === m.usuario_id) conversas[m.usuario_id].naoLidas++;
    });

    const lista = Object.values(conversas)
      .sort((a, b) => b.naoLidas - a.naoLidas ||
        new Date(b.ultima.criado_em) - new Date(a.ultima.criado_em));

    const alvo = document.getElementById('chat-conversas');
    if (!alvo) return;
    alvo.innerHTML = '<h3>Conversas</h3>' +
      (lista.length === 0
        ? '<p class="sub">Ninguem chamou ainda.</p>'
        : lista.map(c =>
            '<div class="chat-item' + (this.conversaAberta === c.usuario_id ? ' ativa' : '') + '" ' +
            'onclick="MODULOS.chat.abrirConversa(\'' + c.usuario_id + '\')">' +
            '<div><b>' + escaparHtml(c.nome) + '</b>' +
            '<small>' + escaparHtml((ROTULOS_PERFIL[c.perfil] || c.perfil) + ' &middot; ' +
              c.ultima.texto.slice(0, 42) + (c.ultima.texto.length > 42 ? '...' : '')) + '</small></div>' +
            (c.naoLidas ? '<span class="selo selo-bad">' + c.naoLidas + '</span>' : '') +
            '</div>').join(''));
  },

  // ─────────────── THREAD ───────────────

  async abrirConversa(usuarioId) {
    this.conversaAberta = usuarioId;
    await this.carregarThread(usuarioId);
    if (this.ehSuporte()) this.listarConversas();
  },

  async carregarThread(usuarioId) {
    const eu = window.CORTEX_SESSAO.user.id;
    const { data } = await sb.from('mensagens_suporte')
      .select('id, autor_id, texto, criado_em, lida, autor:profiles!mensagens_suporte_autor_id_fkey(nome)')
      .eq('usuario_id', usuarioId)
      .order('criado_em')
      .limit(200);
    const msgs = data || [];

    // Marca como lidas as mensagens do outro lado
    const doOutro = msgs.filter(m => !m.lida && m.autor_id !== eu).map(m => m.id);
    if (doOutro.length) {
      sb.from('mensagens_suporte').update({ lida: true }).in('id', doOutro).then(() => {});
    }

    const alvo = document.getElementById('chat-thread');
    if (!alvo) return;

    alvo.innerHTML =
      '<div class="chat-msgs" id="chat-msgs">' +
      (msgs.length === 0
        ? '<p class="sub" style="text-align:center; padding:20px">Sem mensagens ainda. Diga oi! &#128075;</p>'
        : msgs.map(m => {
            const minha = m.autor_id === eu;
            return '<div class="chat-bolha' + (minha ? ' minha' : '') + '">' +
              '<small>' + escaparHtml(m.autor ? m.autor.nome.split(' ')[0] : '') + ' &middot; ' +
              new Date(m.criado_em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) +
              '</small>' +
              '<div>' + escaparHtml(m.texto) + '</div></div>';
          }).join('')) +
      '</div>' +
      '<div class="chat-envio">' +
      '  <input id="chat-texto" placeholder="Escreva a mensagem..." ' +
      '    onkeydown="if(event.key===\'Enter\') MODULOS.chat.enviar()">' +
      '  <button class="btn btn-primario" onclick="MODULOS.chat.enviar()">Enviar</button>' +
      '</div>';

    const rolagem = document.getElementById('chat-msgs');
    rolagem.scrollTop = rolagem.scrollHeight;
    document.getElementById('chat-texto').focus();
  },

  async enviar() {
    const campo = document.getElementById('chat-texto');
    const texto = campo.value.trim();
    if (!texto) return;
    campo.value = '';

    const eu = window.CORTEX_SESSAO.user.id;
    const usuarioId = this.ehSuporte() ? this.conversaAberta : eu;
    if (!usuarioId) return;

    const { error } = await sb.from('mensagens_suporte').insert({
      usuario_id: usuarioId,
      autor_id: eu,
      texto: texto
    });
    if (error) { alert('Falha ao enviar: ' + error.message); campo.value = texto; return; }

    // Notificacao para o outro lado
    try {
      if (this.ehSuporte()) {
        await sb.from('notificacoes').insert({
          destinatario_id: usuarioId,
          titulo: 'Resposta do suporte',
          corpo: texto.slice(0, 120)
        });
      } else {
        await sb.from('notificacoes').insert({
          destinatario_perfil: 'suporte',
          titulo: 'Chat: ' + window.CORTEX_SESSAO.profile.nome,
          corpo: texto.slice(0, 120)
        });
      }
    } catch (e) { /* notificacao nunca trava o envio */ }

    this.carregarThread(usuarioId);
  }
};
