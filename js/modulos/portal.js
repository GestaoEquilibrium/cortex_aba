// ============================================================================
// CORTEX aba - js/modulos/portal.js
// Inicio do portal da familia: filhos vinculados e pendencias (anamnese).
// ============================================================================

window.MODULOS = window.MODULOS || {};

window.MODULOS.portal = {

  async render(el, sessao) {
    this.el = el;
    this.sessao = sessao;
    const nome = sessao.profile.nome.split(' ')[0];

    el.innerHTML =
      '<section class="heroi portal">' +
      '  <div>' +
      '    <h1>Ola, ' + escaparHtml(nome) + '!</h1>' +
      '    <div class="sub">Este e o espaco da familia na Equilibrium Terapia Infantil.</div>' +
      '  </div>' +
      '</section>' +
      '<div id="portal-conteudo"><div class="cartao"><p class="sub">Carregando...</p></div></div>';

    const alvo = document.getElementById('portal-conteudo');

    // Filhos vinculados a este responsavel
    const { data: vinculos, error } = await sb
      .from('familia_pacientes')
      .select('paciente_id, pacientes(id, nome, data_nascimento, status)')
      .eq('usuario_id', sessao.user.id);

    if (error || !vinculos || vinculos.length === 0) {
      alvo.innerHTML =
        '<div class="cartao"><div class="vazio">' +
        '<div class="simbolo-vazio">&#9825;</div>' +
        '<strong>Nenhuma crianca vinculada ainda</strong>' +
        'Se isso parecer um engano, fale com a recepcao da clinica.' +
        '</div></div>';
      return;
    }

    let html = '';
    for (const v of vinculos) {
      const p = v.pacientes;
      if (!p) continue;

      const { data: an } = await sb
        .from('anamneses')
        .select('id, status')
        .eq('paciente_id', p.id)
        .maybeSingle();

      const statusAn = an ? an.status : 'pendente';
      let pendencia;
      if (statusAn === 'concluida') {
        pendencia =
          '<div class="linha-doc"><div><b>Anamnese Global</b>' +
          '<small>Recebida! A coordenacao esta analisando as informacoes.</small></div>' +
          '<span class="selo selo-ok">Concluida</span></div>';
      } else {
        const rotulo = statusAn === 'em_andamento' ? 'Continuar preenchimento' : 'Preencher agora';
        pendencia =
          '<div class="linha-doc"><div><b>Anamnese Global</b>' +
          '<small>Questionario essencial para iniciarmos o acompanhamento de ' +
          escaparHtml(p.nome.split(' ')[0]) + '.</small></div>' +
          '<button class="btn btn-primario" onclick="MODULOS.anamnese.abrir(\'' + p.id + '\')">' +
          rotulo + '</button></div>';
      }

      let relatorios = '';
      try { relatorios = await MODULOS.relatorios.htmlPortal(p.id, p.nome); } catch (e) {}

      let agenda = '';
      try { agenda = await this.htmlAgenda(p.id, p.nome); } catch (e) {}

      let termos = '';
      try { termos = await this.htmlTermos(p.id); } catch (e) {}

      const { count: nDocs } = await sb.from('portal_documentos')
        .select('id', { count: 'exact', head: true }).eq('paciente_id', p.id);
      const recursos =
        '<div class="portal-recursos">' +
        '<button class="btn btn-fantasma" onclick="MODULOS.portal.docsPortal(\'' + p.id + '\', \'' +
          escaparHtml(p.nome.split(' ')[0]) + '\')">&#128196; Documentos' +
          (nDocs ? ' <span class="fchip-n">' + nDocs + '</span>' : '') + '</button>' +
        '<button class="btn btn-fantasma" onclick="MODULOS.portal.caderninho(\'' + p.id + '\', \'' +
          escaparHtml(p.nome.split(' ')[0]) + '\')">&#128211; Caderninho</button>' +
        '<button class="btn btn-fantasma" onclick="MODULOS.portal.conversa(\'' + p.id + '\', \'' +
          escaparHtml(p.nome.split(' ')[0]) + '\')">&#128172; Conversar com a coordenacao</button>' +
        '</div>';

      html +=
        '<div class="cartao faixa-azul">' +
        '  <div class="pac-topo" style="margin-bottom:14px">' +
        '    <div class="avatar-paciente">' + escaparHtml(this.iniciais(p.nome)) + '</div>' +
        '    <div class="pac-quem"><strong>' + escaparHtml(p.nome) + '</strong>' +
        '    <span>' + calcularIdade(p.data_nascimento) + '</span></div>' +
        '  </div>' +
        pendencia + recursos +
        termos +
        agenda +
        relatorios +
        '</div>';
    }

    alvo.innerHTML = html;
  },

  // ── Termos digitais pendentes de aceite ──

  _termosCache: {},

  async htmlTermos(pacienteId) {
    const [{ data: termos }, { data: aceites }] = await Promise.all([
      sb.from('termos').select('id, titulo, texto').eq('ativo', true),
      sb.from('termo_aceites').select('termo_id').eq('paciente_id', pacienteId)
    ]);
    const aceitos = new Set((aceites || []).map(a => a.termo_id));
    const pendentes = (termos || []).filter(t => !aceitos.has(t.id));
    if (pendentes.length === 0) return '';

    pendentes.forEach(t => { this._termosCache[t.id] = t; });

    return '<div class="portal-pendencia" style="margin-top:10px">' +
      '<b>&#128196; Termos aguardando o seu aceite</b>' +
      pendentes.map(t =>
        '<div class="linha-doc"><div><b>' + escaparHtml(t.titulo) + '</b></div>' +
        '<button class="btn btn-primario" onclick="MODULOS.portal.lerTermo(\'' +
        t.id + '\', \'' + pacienteId + '\')">Ler e aceitar</button></div>').join('') +
      '</div>';
  },

  lerTermo(termoId, pacienteId) {
    const t = this._termosCache[termoId];
    if (!t) return;
    abrirModal(escaparHtml(t.titulo),
      '<div style="max-height:45vh; overflow-y:auto; font-size:13px; line-height:1.8; ' +
      'white-space:pre-wrap; padding:4px 2px; margin-bottom:14px; border-bottom:1px solid var(--line)">' +
      escaparHtml(t.texto) + '</div>' +
      '<div class="campo"><label>Para aceitar, digite seu nome completo (vale como assinatura)</label>' +
      '<input id="ta-nome" placeholder="Nome completo do responsavel"></div>' +
      '<div class="mensagem-erro" id="ta-erro"></div>' +
      '<div class="barra-acoes">' +
      '  <button class="btn btn-fantasma" onclick="fecharModal()">Fechar</button>' +
      '  <button class="btn btn-primario" id="ta-btn" onclick="MODULOS.portal.aceitarTermo(\'' +
      termoId + '\', \'' + pacienteId + '\')">Li e aceito</button>' +
      '</div>', true);
  },

  async aceitarTermo(termoId, pacienteId) {
    const erro = document.getElementById('ta-erro');
    const botao = document.getElementById('ta-btn');
    erro.classList.remove('visivel');

    const nome = document.getElementById('ta-nome').value.trim();
    if (nome.split(' ').filter(Boolean).length < 2) {
      erro.textContent = 'Digite o nome completo para confirmar.';
      erro.classList.add('visivel');
      return;
    }

    botao.disabled = true;
    const { error } = await sb.from('termo_aceites').insert({
      termo_id: termoId,
      paciente_id: pacienteId,
      usuario_id: window.CORTEX_SESSAO.user.id,
      nome_confirmado: nome
    });
    if (error) {
      erro.textContent = 'Nao foi possivel registrar: ' + error.message;
      erro.classList.add('visivel');
      botao.disabled = false;
      return;
    }
    fecharModal();
    this.render(this.el, this.sessao || window.CORTEX_SESSAO);
  },

  // ── Proximas sessoes da crianca (com confirmacao no proprio portal) ──

  _tokens: {},

  async htmlAgenda(pacienteId, nomeCrianca) {
    const hoje = new Date().toISOString().slice(0, 10);
    const limite = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);

    const { data } = await sb.from('sessoes')
      .select('id, data, hora_inicio, status, confirmacao, confirmacao_token')
      .eq('paciente_id', pacienteId)
      .gte('data', hoje).lte('data', limite)
      .in('status', ['agendada', 'checkin', 'em_atendimento'])
      .order('data').order('hora_inicio')
      .limit(10);
    const lista = data || [];
    if (lista.length === 0) return '';

    const nomeDia = d => {
      const dt = new Date(d + 'T12:00:00');
      const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
      return dias[dt.getDay()] + ' ' + dt.toLocaleDateString('pt-BR').slice(0, 5);
    };

    return '<div style="margin-top:12px">' +
      '<b style="font-size:12.5px">Proximas sessoes</b>' +
      lista.map(s => {
        this._tokens[s.id] = s.confirmacao_token;
        const ehHoje = s.data === hoje;
        let selo, acoes = '';
        if (s.confirmacao === 'confirmada') {
          selo = '<span class="selo selo-ok">Confirmada</span>';
        } else if (s.confirmacao === 'desmarcada') {
          selo = '<span class="selo selo-neutro">Desmarcada</span>';
        } else {
          selo = '<span class="selo selo-warn">Aguardando</span>';
          acoes =
            '<button class="btn-chip" onclick="MODULOS.portal.responder(\'' + s.id + '\', \'sim\', this)">Confirmar</button>' +
            '<button class="btn-chip" onclick="MODULOS.portal.responder(\'' + s.id + '\', \'nao\', this)">Desmarcar</button>';
        }
        return '<div class="linha-doc"><div><b>' + nomeDia(s.data) +
          (ehHoje ? ' (hoje)' : '') + ' &middot; ' + s.hora_inicio.slice(0, 5) + '</b>' +
          '<small>Sessao de ' + escaparHtml(nomeCrianca.split(' ')[0]) + '</small></div>' +
          '<div class="pac-selos">' + selo + acoes + '</div></div>';
      }).join('') +
      '</div>';
  },

  async responder(sessaoId, resposta, botao) {
    if (resposta === 'nao' &&
        !confirm('Desmarcar esta sessao? A clinica sera avisada.')) return;
    const token = this._tokens[sessaoId];
    if (!token) return;

    botao.disabled = true;
    const { error } = await sb.rpc('responder_confirmacao',
      { p_token: token, p_resposta: resposta });
    if (error) {
      alert('Nao foi possivel registrar: ' + error.message);
      botao.disabled = false;
      return;
    }
    this.render(this.el, this.sessao || window.CORTEX_SESSAO);
  },

  iniciais(nome) {
    const p = nome.trim().split(/\s+/);
    return ((p[0] ? p[0][0] : '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
  },

  // ─────────────── Documentos enviados pela coordenacao ───────────────

  async docsPortal(pacId, nome) {
    const ov = this.novaJanela('Documentos de ' + nome);
    const { data } = await sb.from('portal_documentos')
      .select('id, tipo, titulo, enviado_em')
      .eq('paciente_id', pacId).order('enviado_em', { ascending: false });
    const lista = data || [];
    document.getElementById('portal-jan-corpo').innerHTML =
      (lista.length
        ? lista.map(d =>
            '<div class="linha-doc"><div><b>' + escaparHtml(d.titulo) + '</b>' +
            '<small>Enviado em ' + new Date(d.enviado_em).toLocaleDateString('pt-BR') + '</small></div>' +
            '<button class="btn btn-primario" onclick="MODULOS.portal.verDoc(\'' + d.id + '\')">Ver documento</button>' +
            '</div>').join('')
        : '<p class="sub">A coordenacao ainda nao enviou documentos. Eles aparecem aqui assim que forem liberados.</p>');
  },

  async verDoc(id) {
    const { data: d } = await sb.from('portal_documentos')
      .select('titulo, html').eq('id', id).single();
    if (!d) return;
    const ov = this.novaJanela(d.titulo, true);
    document.getElementById('portal-jan-corpo').innerHTML =
      '<div class="barra-acoes nao-imprime" style="justify-content:flex-end; margin-bottom:8px">' +
      '<button class="btn btn-primario" onclick="window.print()">&#128424; Imprimir / PDF</button></div>' + d.html;
    ov.id = 'doc-eq-overlay';  // entra na regra de impressao dos documentos
  },

  // ─────────────── Caderninho de realizacoes ───────────────

  async caderninho(pacId, nome) {
    this._cadPac = pacId; this._cadNome = nome;
    this.novaJanela('Caderninho de ' + nome);
    document.getElementById('portal-jan-corpo').innerHTML =
      '<p class="sub" style="margin-bottom:10px">Registre aqui as conquistas de ' + escaparHtml(nome) +
      ' fora da clinica: algo que conseguiu fazer, uma palavra nova, uma refeicao... A equipe acompanha tudo.</p>' +
      '<div class="grade-form">' +
      '  <div class="campo"><label>Dia</label><input type="date" id="cad-data" ' +
      '    value="' + new Date().toISOString().slice(0, 10) + '" max="' + new Date().toISOString().slice(0, 10) + '"></div>' +
      '  <div class="campo c2"><label>O que aconteceu?</label>' +
      '    <input id="cad-texto" placeholder="Ex.: comeu sozinho com a colher no almoco"></div>' +
      '</div>' +
      '<div class="barra-acoes"><button class="btn btn-primario" onclick="MODULOS.portal.salvarCaderninho()">Registrar</button></div>' +
      '<div class="mensagem-erro" id="cad-erro"></div>' +
      '<div id="cad-lista" style="margin-top:14px"><p class="sub">Carregando...</p></div>';
    this.listarCaderninho();
  },

  async listarCaderninho() {
    const { data } = await sb.from('caderninho')
      .select('data, texto, criado_em')
      .eq('paciente_id', this._cadPac).order('data', { ascending: false }).limit(60);
    const alvo = document.getElementById('cad-lista');
    if (!alvo) return;
    alvo.innerHTML = (data && data.length
      ? data.map(r => '<div class="linha-doc"><div><b>' +
          r.data.split('-').reverse().join('/') + '</b><small>' + escaparHtml(r.texto) + '</small></div></div>').join('')
      : '<p class="sub">Nenhum registro ainda. O primeiro e por sua conta!</p>');
  },

  async salvarCaderninho() {
    const erro = document.getElementById('cad-erro');
    erro.classList.remove('visivel');
    const texto = document.getElementById('cad-texto').value.trim();
    const data = document.getElementById('cad-data').value;
    if (!texto || !data) { erro.textContent = 'Preencha o dia e o que aconteceu.'; erro.classList.add('visivel'); return; }
    const { error } = await sb.from('caderninho').insert({
      paciente_id: this._cadPac, autor_id: this.sessao.user.id, data: data, texto: texto });
    if (error) { erro.textContent = error.message; erro.classList.add('visivel'); return; }
    document.getElementById('cad-texto').value = '';
    this.listarCaderninho();
  },

  // ─────────────── Conversa com a coordenacao ───────────────

  async conversa(pacId, nome) {
    this._convPac = pacId;
    this.novaJanela('Conversa sobre ' + nome);
    document.getElementById('portal-jan-corpo').innerHTML =
      '<div id="conv-lista" class="conv-lista"><p class="sub">Carregando...</p></div>' +
      '<div class="conv-envio">' +
      '  <input id="conv-texto" placeholder="Escreva sua mensagem..." ' +
      '    onkeydown="if(event.key===\'Enter\') MODULOS.portal.enviarMensagem()">' +
      '  <button class="btn btn-primario" onclick="MODULOS.portal.enviarMensagem()">Enviar</button>' +
      '</div>';
    await this.listarConversa();
    sb.from('portal_mensagens').update({ lida_familia: true })
      .eq('paciente_id', pacId).eq('origem', 'clinica').eq('lida_familia', false).then(() => {});
  },

  async listarConversa() {
    const { data } = await sb.from('portal_mensagens')
      .select('origem, texto, criado_em, autor:profiles!portal_mensagens_autor_id_fkey(nome)')
      .eq('paciente_id', this._convPac).order('criado_em').limit(200);
    const alvo = document.getElementById('conv-lista');
    if (!alvo) return;
    alvo.innerHTML = (data && data.length
      ? data.map(m =>
          '<div class="conv-msg ' + (m.origem === 'familia' ? 'minha' : 'deles') + '">' +
          '<small>' + (m.origem === 'familia' ? 'Voce' : 'Coordenacao') + ' &middot; ' +
          new Date(m.criado_em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) + '</small>' +
          escaparHtml(m.texto) + '</div>').join('')
      : '<p class="sub">Nenhuma mensagem ainda. Escreva abaixo: a coordenacao recebe e responde por aqui.</p>');
    alvo.scrollTop = alvo.scrollHeight;
  },

  async enviarMensagem() {
    const campo = document.getElementById('conv-texto');
    const texto = campo.value.trim();
    if (!texto) return;
    campo.value = '';
    const { error } = await sb.from('portal_mensagens').insert({
      paciente_id: this._convPac, autor_id: this.sessao.user.id, origem: 'familia', texto: texto });
    if (error) { alert(error.message); return; }
    this.listarConversa();
  },

  novaJanela(titulo, larga) {
    document.getElementById('portal-jan')?.remove();
    document.getElementById('doc-eq-overlay')?.remove();
    const ov = document.createElement('div');
    ov.id = 'portal-jan';
    ov.className = 'folha-overlay';
    ov.innerHTML = '<div class="folha-pagina" style="max-width:' + (larga ? '960px' : '640px') + '">' +
      '<div class="pagina-cabecalho nao-imprime">' +
      '  <div><button class="btn-voltar" onclick="document.getElementById(\'' + 'portal-jan' + '\')?.remove(); document.getElementById(\'doc-eq-overlay\')?.remove()">&larr; Fechar</button>' +
      '  <h2>' + titulo + '</h2></div></div>' +
      '<div id="portal-jan-corpo"></div></div>';
    document.body.appendChild(ov);
    return ov;
  }
};
