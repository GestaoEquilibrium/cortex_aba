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

      html +=
        '<div class="cartao faixa-azul">' +
        '  <div class="pac-topo" style="margin-bottom:14px">' +
        '    <div class="avatar-paciente">' + escaparHtml(this.iniciais(p.nome)) + '</div>' +
        '    <div class="pac-quem"><strong>' + escaparHtml(p.nome) + '</strong>' +
        '    <span>' + calcularIdade(p.data_nascimento) + '</span></div>' +
        '  </div>' +
        pendencia +
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
  }
};
