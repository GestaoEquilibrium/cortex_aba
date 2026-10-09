// ============================================================================
// CORTEX aba - js/modulos/avisos.js  (patch 31)
// Central de avisos: nenhum pop-up de pendencia abre sozinho na entrada. Tudo
// fica numa lista unica (sino flutuante com contador; no celular, sino no
// cabecalho) que abre uma gaveta pela direita com botao de acao em cada linha.
// Reune: sessoes sem evolucao, indicativos, pendencias da equipe, estruturas de
// pre-supervisao a enviar (prazo = um dia antes), supervisoes/reunioes de hoje e
// amanha, demandas, parabens, avaliacoes vencendo, mensagens da familia e as
// notificacoes do sistema (tabela notificacoes).
// ============================================================================

window.MODULOS = window.MODULOS || {};

window.MODULOS.avisos = {

  itens: [],
  total: 0,
  _timer: null,
  _carregando: false,

  SINO: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>',

  // ─────────────── Montagem (chamado uma vez depois do login) ───────────────
  iniciar() {
    if (!window.CORTEX_SESSAO || window.CORTEX_SESSAO.profile.perfil === 'familia') return;
    document.getElementById('avisos-fab')?.remove();
    document.getElementById('avisos-cel')?.remove();
    const fab = document.createElement('button');
    fab.type = 'button'; fab.id = 'avisos-fab'; fab.className = 'avisos-fab'; fab.title = 'Avisos e pendencias';
    fab.innerHTML = this.SINO + '<span class="avisos-badge" id="avisos-badge" hidden>0</span>';
    fab.onclick = () => this.abrir();
    document.body.appendChild(fab);
    // celular: sino no cabecalho, antes do avatar
    const cab = document.getElementById('cab-celular');
    if (cab) {
      const b = document.createElement('button');
      b.type = 'button'; b.id = 'avisos-cel'; b.className = 'avisos-cel'; b.title = 'Avisos e pendencias';
      b.innerHTML = this.SINO + '<span class="avisos-badge" id="avisos-badge-cel" hidden>0</span>';
      b.onclick = () => this.abrir();
      const avatar = cab.querySelector('.cab-cel-avatar');
      if (avatar) cab.insertBefore(b, avatar); else cab.appendChild(b);
    }
    this.carregar();
    clearInterval(this._timer);
    this._timer = setInterval(() => { if (!document.hidden) this.carregar(); }, 3 * 60 * 1000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) this.carregar(); });
  },

  // ─────────────── Coleta ───────────────
  async carregar() {
    if (this._carregando) return;
    this._carregando = true;
    const itens = [];
    const sess = window.CORTEX_SESSAO;
    const eu = sess.user.id;
    const perfil = sess.profile.perfil;
    const hoje = hojeLocal();
    const gestao = ['direcao', 'coordenador', 'suporte'].includes(perfil);
    const fmt = d => d ? d.split('-').reverse().join('/') : '';
    const add = (grupo, cor, icone, titulo, sub, acao, botao, peso) => itens.push({ grupo, cor, icone, titulo, sub, acao, botao, peso: peso || 1 });

    // 1) Minhas sessoes sem evolucao
    try {
      const { data: ss } = await sb.from('sessoes').select('id, data, status, pacientes(nome)')
        .eq('aplicador_id', eu).lte('data', hoje).gte('data', window.CORTEX_EVO_DESDE || '2000-01-01')
        .neq('status', 'cancelada').order('data', { ascending: false }).limit(80);
      const passadas = (ss || []).filter(s => s.status === 'concluida' || s.status === 'falta' || s.data < hoje);
      if (passadas.length) {
        const { data: evs } = await sb.from('evolucoes').select('sessao_id').in('sessao_id', passadas.map(s => s.id));
        const com = new Set((evs || []).map(e => e.sessao_id));
        const pend = passadas.filter(s => !com.has(s.id));
        if (pend.length) add('Pendencias', 'rosa', 'pacientes', pend.length + ' sessao(oes) sem evolucao',
          pend.slice(0, 3).map(s => (s.pacientes ? s.pacientes.nome.split(' ')[0] : '?') + ' ' + fmt(s.data).slice(0, 5)).join(' - ') + (pend.length > 3 ? ' ...' : ''),
          'MODULOS.programas.popupEvolucoesPendentes()', 'Lancar', pend.length);
      }
    } catch (e) {}

    // 2) Indicativos de horario aguardando (quem edita agenda)
    if (perm('agenda') === 'E' || perm('agenda_grade') === 'E') {
      try {
        const { data } = await sb.from('indicativos').select('id, pacientes(nome), aplicador:profiles!indicativos_aplicador_id_fkey(nome)').eq('status', 'pendente').limit(20);
        if (data && data.length) add('Pendencias', 'azul', 'agenda', data.length + ' indicativo(s) de horario aguardando',
          data.slice(0, 2).map(i => (i.pacientes ? i.pacientes.nome.split(' ')[0] : '?') + ' com ' + (i.aplicador ? i.aplicador.nome.split(' ')[0] : '?')).join(' - '),
          'MODULOS.agenda.popupIndicativos()', 'Ver', data.length);
      } catch (e) {}
    }

    // 3) Pendencias de sessao da equipe (coordenacao/direcao/suporte)
    if (gestao && MODULOS.programas && MODULOS.programas.pendenciasEquipe) {
      try {
        const r = await MODULOS.programas.pendenciasEquipe();
        if (r && r.total) add('Pendencias', 'ambar', 'coordenacao', r.total + ' pendencia(s) de sessao na equipe',
          'Sessoes nao encerradas, sem ficha ou sem evolucao desde ' + (window.CORTEX_EVO_DESDE || '').split('-').reverse().join('/'), 'MODULOS.programas.popupEquipe()', 'Ver', 1);
      } catch (e) {}
    }

    // 4) Eventos, estruturas de pre-supervisao, demandas, parabens, avaliacoes vencendo
    if (MODULOS.eventos && MODULOS.eventos.dadosAvisos) {
      try {
        const d = await MODULOS.eventos.dadosAvisos();
        (d.preFalta || []).forEach(e => {
          const rot = e.travada ? 'prazo encerrado em ' + fmt(e.prazo) : e.prazo === hoje ? 'prazo HOJE' : e.prazo < hoje ? 'prazo encerrado' : 'prazo ' + fmt(e.prazo);
          add('Pendencias', e.travada ? 'rosa' : 'ambar', 'eventos', 'Estrutura de supervisao a enviar',
            e.titulo + ' - supervisao ' + fmt(e.data) + ' - ' + rot,
            e.travada ? "abrirModulo('eventos')" : "abrirModulo('eventos'); setTimeout(function(){ MODULOS.eventos.modalPre('', '" + e.id + "'); }, 600)",
            e.travada ? 'Abrir' : 'Preencher');
        });
        // patch 43: ATA a preencher (quem preenche) e ATAs atrasadas da equipe (gestao)
        (d.ataMinhas || []).forEach(e => add('Pendencias', e.atrasada ? 'rosa' : 'ambar', 'eventos',
          e.atrasada ? 'ATA atrasada' : 'ATA da ' + (e.tipo === 'supervisao' ? 'supervisao' : 'reuniao') + ' a preencher',
          e.titulo + ' - ' + (e.atrasada ? fmt(e.data) : 'hoje') + (e.hora ? ' as ' + e.hora.slice(0, 5) : '') + (e.rasc ? ' - rascunho salvo' : ''),
          "MODULOS.eventos.abrirAta('" + e.id + "')", 'Preencher'));
        if ((d.ataEquipe || []).length) add('Pendencias', 'rosa', 'eventos', d.ataEquipe.length + ' ATA(s) atrasada(s) na equipe',
          d.ataEquipe.slice(0, 3).map(e => e.titulo + ' (' + fmt(e.data).slice(0, 5) + ')').join(' - ') + (d.ataEquipe.length > 3 ? ' ...' : ''),
          "abrirModulo('eventos'); setTimeout(function(){ MODULOS.eventos.irAba('atas', 'pend'); }, 700)", 'Ver');
        (d.meus || []).forEach(e => add('Avisos', 'teal', 'eventos',
          (e.tipo === 'supervisao' ? 'Supervisao' : e.tipo === 'reuniao_pais' ? 'Reuniao com pais' : 'Reuniao') + ' ' + (e.data === d.hoje ? 'HOJE' : 'amanha') + (e.hora ? ' as ' + e.hora.slice(0, 5) : ''),
          e.titulo, "abrirModulo('eventos')", 'Abrir'));
        (d.minhasDem || []).forEach(x => add('Avisos', 'roxo', 'coordenacao', 'Demanda: ' + x.titulo,
          (x.detalhe ? x.detalhe + ' - ' : '') + 'de ' + (x.criador ? x.criador.nome.split(' ')[0] : '-') + (x.prazo ? ' - ate ' + fmt(x.prazo) : ''),
          "MODULOS.avisos.concluirDemanda('" + x.id + "')", 'Feita'));
        (d.parabens || []).forEach(x => add('Avisos', 'roxo', 'coordenacao', 'Parabens! ' + x.titulo,
          (x.detalhe ? x.detalhe + ' - ' : '') + (x.criador ? x.criador.nome.split(' ')[0] : 'Coordenacao'),
          "MODULOS.avisos.concluirDemanda('" + x.id + "')", 'Obrigado(a)!'));
        if (d.venc && d.venc.length) add('Avisos', 'teal', 'avaliacoes', d.venc.length + ' avaliacao(oes) vencendo ou vencida(s)',
          d.venc.slice(0, 3).map(v => v.nome.split(' ')[0] + ' (' + v.protocolo.toUpperCase() + ')').join(' - ') + (d.venc.length > 3 ? ' ...' : ''),
          "abrirModulo('avaliacoes')", 'Abrir', 1);
      } catch (e) {}
    }

    // 5) Mensagens da familia nao lidas (gestao)
    if (['direcao', 'coordenador'].includes(perfil)) {
      try {
        const { count } = await sb.from('portal_mensagens').select('id', { count: 'exact', head: true }).eq('origem', 'familia').eq('lida_clinica', false);
        if (count) add('Avisos', 'teal', 'chat', count + ' mensagem(ns) da familia sem resposta', 'Conversa familia e coordenacao', "abrirModulo('pacientes')", 'Abrir', 1);
      } catch (e) {}
    }

    // 6) Notificacoes do sistema (nao lidas)
    try {
      const { data } = await sb.from('notificacoes').select('id, titulo, corpo, criado_em')
        .or('destinatario_perfil.eq.' + perfil + ',destinatario_id.eq.' + eu)
        .eq('lida', false).order('criado_em', { ascending: false }).limit(15);
      (data || []).forEach(n => {
        const doChat = /^(Chat: |Grupo |Comunicado de )/.test(n.titulo || '');   // mensagens do chat abrem o chat (e la viram lidas)
        add('Notificacoes do sistema', 'azul', 'chat', n.titulo,
          (n.corpo || '') + ' - ' + new Date(n.criado_em).toLocaleDateString('pt-BR'),
          doChat ? "MODULOS.avisos.marcarLida('" + n.id + "'); abrirModulo('chat')" : "MODULOS.avisos.marcarLida('" + n.id + "')", doChat ? 'Abrir chat' : 'Ok');
      });
    } catch (e) {}

    this.itens = itens;
    this.total = itens.length;
    this._carregando = false;
    this.atualizarContadores();
    if (document.getElementById('avisos-gaveta')) this.desenharLista();
  },

  atualizarContadores() {
    const n = this.total;
    ['avisos-badge', 'avisos-badge-cel'].forEach(id => {
      const b = document.getElementById(id);
      if (b) { b.textContent = n > 99 ? '99+' : String(n); b.hidden = !n; }
    });
    // contador no item Inicio do menu e na barra do celular
    const nav = document.querySelector('.nav-item[data-modulo="inicio"]');
    if (nav) {
      let c = nav.querySelector('.nav-conta');
      if (!c) { c = document.createElement('span'); c.className = 'nav-conta'; nav.appendChild(c); }
      c.textContent = n > 99 ? '99+' : String(n); c.hidden = !n;
    }
    const cel = document.querySelector('.barra-celular button[data-cel="inicio"]');
    if (cel) {
      let c = cel.querySelector('.cel-conta');
      if (!c) { c = document.createElement('span'); c.className = 'cel-conta'; cel.appendChild(c); }
      c.textContent = n > 99 ? '99+' : String(n); c.hidden = !n;
    }
  },

  // ─────────────── Gaveta ───────────────
  abrir() {
    if (document.getElementById('avisos-gaveta')) { this.fechar(); return; }
    const fundo = document.createElement('div');
    fundo.id = 'avisos-fundo'; fundo.className = 'avisos-fundo';
    fundo.onclick = () => this.fechar();
    const g = document.createElement('aside');
    g.id = 'avisos-gaveta'; g.className = 'avisos-gaveta'; g.setAttribute('role', 'dialog'); g.setAttribute('aria-label', 'Avisos e pendencias');
    g.innerHTML = '<div class="avisos-topo"><h3>' + this.SINO + ' Avisos e pendencias <span class="selo selo-neutro" id="avisos-total">' + this.total + '</span></h3>' +
      '<button type="button" class="modal-fechar" onclick="MODULOS.avisos.fechar()" title="Fechar">&times;</button></div>' +
      '<div class="avisos-corpo" id="avisos-corpo"><p class="sub" style="padding:8px 4px">Carregando...</p></div>';
    document.body.appendChild(fundo);
    document.body.appendChild(g);
    requestAnimationFrame(() => { fundo.classList.add('aberta'); g.classList.add('aberta'); });
    this._esc = ev => { if (ev.key === 'Escape') this.fechar(); };
    document.addEventListener('keydown', this._esc);
    this.desenharLista();
    this.carregar();
  },

  fechar() {
    document.removeEventListener('keydown', this._esc || (() => {}));
    const f = document.getElementById('avisos-fundo'), g = document.getElementById('avisos-gaveta');
    if (f) f.classList.remove('aberta'); if (g) g.classList.remove('aberta');
    setTimeout(() => { f?.remove(); g?.remove(); }, 180);
  },

  desenharLista() {
    const alvo = document.getElementById('avisos-corpo');
    if (!alvo) return;
    const t = document.getElementById('avisos-total'); if (t) t.textContent = this.total;
    if (!this.itens.length) {
      alvo.innerHTML = '<div class="avisos-vazio"><div style="font-size:30px">&#10004;</div><b>Tudo em dia</b><p class="sub">Nenhuma pendencia ou aviso para voce agora.</p></div>';
      return;
    }
    const grupos = ['Pendencias', 'Avisos', 'Notificacoes do sistema'];
    let html = '';
    grupos.forEach(gr => {
      const l = this.itens.filter(i => i.grupo === gr);
      if (!l.length) return;
      html += '<div class="av-grupo">' + gr + ' <span class="selo selo-neutro">' + l.length + '</span></div>' +
        l.map(i => '<div class="av-item"><span class="ic ic-' + i.cor + '">' + (ICONES[i.icone] || ICONES.inicio) + '</span>' +
          '<span class="tx"><b>' + escaparHtml(i.titulo) + '</b><small>' + escaparHtml(i.sub || '') + '</small></span>' +
          '<button type="button" class="btn-chip" onclick="MODULOS.avisos.acao(this)" data-acao="' + escaparHtml(i.acao).replace(/"/g, '&quot;') + '">' + escaparHtml(i.botao || 'Abrir') + '</button></div>').join('');
    });
    const temNotif = this.itens.some(i => i.grupo === 'Notificacoes do sistema');
    html += '<div class="barra-acoes" style="margin-top:12px; justify-content:space-between">' +
      '<button type="button" class="btn btn-fantasma" onclick="MODULOS.avisos.carregar()">&#8635; Atualizar</button>' +
      (temNotif ? '<button type="button" class="btn btn-fantasma" onclick="MODULOS.avisos.marcarTodasLidas()">Marcar notificacoes como vistas</button>' : '') + '</div>';
    alvo.innerHTML = html;
  },

  // Executa a acao da linha: acoes que abrem pop-up/modulo fecham a gaveta antes
  acao(botao) {
    const codigo = botao.getAttribute('data-acao') || '';
    const fica = /marcarLida|concluirDemanda/.test(codigo);
    if (!fica) this.fechar();
    try { (new Function(codigo))(); } catch (e) { console.warn('avisos:', e); }
  },

  async marcarLida(id) {
    const { error } = await sb.from('notificacoes').update({ lida: true }).eq('id', id);
    if (error) { popAviso('Nao foi possivel marcar como lida: ' + error.message); return; }
    this.itens = this.itens.filter(i => !(i.acao || '').includes(id));
    this.total = this.itens.length; this.atualizarContadores(); this.desenharLista();
    if (MODULOS.inicio && document.getElementById('inicio-notifs')) MODULOS.inicio.carregarNotificacoes(window.CORTEX_SESSAO);
  },

  async marcarTodasLidas() {
    const sess = window.CORTEX_SESSAO;
    const { error } = await sb.from('notificacoes').update({ lida: true })
      .or('destinatario_perfil.eq.' + sess.profile.perfil + ',destinatario_id.eq.' + sess.user.id).eq('lida', false);
    if (error) { popAviso('Nao foi possivel marcar: ' + error.message); return; }
    this.itens = this.itens.filter(i => i.grupo !== 'Notificacoes do sistema');
    this.total = this.itens.length; this.atualizarContadores(); this.desenharLista();
    if (MODULOS.inicio && document.getElementById('inicio-notifs')) MODULOS.inicio.carregarNotificacoes(sess);
  },

  async concluirDemanda(id) {
    const { error } = await sb.from('demandas').update({ feita_em: new Date().toISOString() }).eq('id', id);
    if (error) { popAviso('Nao foi possivel gravar (demandas): ' + error.message); return; }
    this.itens = this.itens.filter(i => !(i.acao || '').includes(id));
    this.total = this.itens.length; this.atualizarContadores(); this.desenharLista();
  }
};
