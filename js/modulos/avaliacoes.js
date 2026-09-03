// ============================================================================
// CORTEX aba - js/modulos/avaliacoes.js
// Sprint 7: QADI-R digital. Aplicacao por faixa etaria com SIM/NAO/NA,
// marcacao Oral/Nao Oral, salvamento automatico e pontuacao por area
// (% de SIM sobre as validas, excluindo NA).
// ============================================================================

window.MODULOS = window.MODULOS || {};

window.MODULOS.avaliacoes = {

  PODE_AVALIAR: ['direcao', 'coordenador', 'terapeuta', 'suporte'],
  FAIXAS: ['0 a 1 ano', '1 a 2 anos', '2 a 3 anos', '3 a 4 anos', '4 a 5 anos', '5 a 6 anos'],
  AREAS: ['Linguagem Receptiva', 'Linguagem Expressiva', 'Cognição',
          'Motricidade Grossa', 'Motricidade Fina', 'Socialização'],

  el: null,
  sessao: null,
  questoes: [],
  avaliacao: null,
  respostas: {},
  faixaAtual: null,
  pacienteAtual: null,

  async render(el, sessao) {
    this.el = el;
    this.sessao = sessao;
    await this.telaLista();
  },

  // ───────────────────────── LISTA GERAL ─────────────────────────

  async telaLista() {
    this.el.innerHTML =
      '<div class="pagina-cabecalho">' +
      '  <div><h2>Avaliacoes</h2>' +
      '  <p class="sub">Protocolos aplicados e em andamento. QADI-R disponivel; SS e IPO chegam depois.</p></div>' +
      '</div>' +
      '<div id="av-lista"><div class="cartao"><p class="sub">Carregando...</p></div></div>';

    const { data, error } = await sb
      .from('avaliacoes')
      .select('id, protocolo, status, iniciado_em, concluido_em, pacientes(id, nome), avaliador:profiles!avaliacoes_avaliador_id_fkey(nome)')
      .order('iniciado_em', { ascending: false });

    const alvo = document.getElementById('av-lista');
    if (error) {
      alvo.innerHTML = '<div class="cartao"><div class="mensagem-erro visivel">' +
        escaparHtml(error.message) + '</div></div>';
      return;
    }

    const podeAvaliar = this.PODE_AVALIAR.includes(this.sessao.profile.perfil);

    alvo.innerHTML =
      (podeAvaliar ? await this.htmlNovaAvaliacao() : '') +
      '<div class="cartao"><h3>Historico</h3>' +
      ((data && data.length) ? data.map(a =>
        '<div class="linha-doc">' +
        '<div><b>' + escaparHtml(a.pacientes ? a.pacientes.nome : '?') + ' &middot; QADI-R</b>' +
        '<small>' + (a.avaliador ? 'Avaliador: ' + escaparHtml(a.avaliador.nome) + ' &middot; ' : '') +
        new Date(a.iniciado_em).toLocaleDateString('pt-BR') + '</small></div>' +
        '<div class="pac-selos">' +
        (a.status === 'concluida'
          ? '<span class="selo selo-ok">Concluida</span>' +
            '<button class="btn-chip" onclick="MODULOS.avaliacoes.telaResultado(\'' + a.id + '\')">Resultado</button>'
          : '<span class="selo selo-warn">Em andamento</span>' +
            (podeAvaliar ? '<button class="btn-chip cheio" onclick="MODULOS.avaliacoes.abrirAplicacao(\'' + a.id + '\')">Continuar</button>' : '')) +
        '</div></div>').join('')
      : '<p class="sub">Nenhuma avaliacao registrada.</p>') +
      '</div>';
  },

  async htmlNovaAvaliacao() {
    const { data: pacs } = await sb.from('pacientes')
      .select('id, nome, status').in('status', ['avaliacao', 'ativo']).order('nome');
    this._pacs = pacs || [];
    return '<div class="cartao faixa-ambar"><h3>Nova avaliacao QADI-R</h3>' +
      '<div class="grade-form">' +
      '<div class="campo c2"><label>Paciente</label><select id="av-novo-pac">' +
      '<option value="">Selecione</option>' +
      this._pacs.map(p => '<option value="' + p.id + '">' + escaparHtml(p.nome) + '</option>').join('') +
      '</select></div>' +
      '<div class="campo" style="display:flex; align-items:flex-end">' +
      '<button class="btn btn-primario" onclick="MODULOS.avaliacoes.criarAvaliacao()">Iniciar aplicacao</button>' +
      '</div></div></div>';
  },

  async criarAvaliacao() {
    const pacienteId = document.getElementById('av-novo-pac').value;
    if (!pacienteId) return;

    const { data, error } = await sb.from('avaliacoes')
      .insert({ paciente_id: pacienteId, protocolo: 'qadi',
                avaliador_id: this.sessao.user.id })
      .select('id').single();
    if (error) { alert('Erro: ' + error.message); return; }
    this.abrirAplicacao(data.id);
  },

  // ───────────────────────── APLICACAO ─────────────────────────

  async carregarQuestoes() {
    if (this.questoes.length) return;
    const { data } = await sb.from('qadi_questoes').select('*').order('ordem');
    this.questoes = data || [];
  },

  async abrirAplicacao(avaliacaoId) {
    await this.carregarQuestoes();

    const { data: av, error } = await sb.from('avaliacoes')
      .select('*, pacientes(id, nome, data_nascimento)')
      .eq('id', avaliacaoId).single();
    if (error || !av) { this.telaLista(); return; }

    this.avaliacao = av;
    this.pacienteAtual = av.pacientes;

    this.respostas = {};
    const { data: resps } = await sb.from('avaliacao_respostas')
      .select('questao_id, resposta').eq('avaliacao_id', av.id);
    (resps || []).forEach(r => { this.respostas[r.questao_id] = r.resposta; });

    // Faixa inicial sugerida pela idade cronologica
    if (!this.faixaAtual) {
      const anos = Math.floor(
        (Date.now() - new Date(av.pacientes.data_nascimento + 'T12:00:00')) / 31557600000);
      this.faixaAtual = this.FAIXAS[Math.min(Math.max(anos, 0), 5)];
    }

    this.telaAplicacao();
  },

  telaAplicacao() {
    const av = this.avaliacao;

    const abasFaixas = this.FAIXAS.map(f => {
      const qs = this.questoes.filter(q => q.faixa === f);
      const resp = qs.filter(q => this.respostas[q.id]).length;
      return '<button class="aba' + (f === this.faixaAtual ? ' ativa' : '') + '" ' +
        'onclick="MODULOS.avaliacoes.trocarFaixa(\'' + f + '\')">' +
        f.replace(' anos', '').replace(' ano', '') +
        (resp ? ' <span class="feita">&#10003;' + resp + '</span>' : '') +
        '</button>';
    }).join('');

    const qsFaixa = this.questoes.filter(q => q.faixa === this.faixaAtual);
    let corpo = '';
    this.AREAS.forEach(area => {
      const qs = qsFaixa.filter(q => q.area === area);
      if (!qs.length) return;
      corpo += '<div class="cartao"><h3>' + area + '</h3>' +
        qs.map(q =>
          '<div class="campo questao"><label>' + escaparHtml(q.pergunta) + '</label>' +
          '<div class="segmento">' +
          [['S', 'Sim'], ['N', 'N&atilde;o'], ['NA', 'NA']].map(([v, r]) =>
            '<button type="button" class="seg' + (this.respostas[q.id] === v ? ' ativo' : '') + '" ' +
            'onclick="MODULOS.avaliacoes.responder(this, ' + q.id + ', \'' + v + '\')">' + r + '</button>'
          ).join('') +
          '</div></div>').join('') +
        '</div>';
    });

    this.el.innerHTML =
      '<div class="pagina-cabecalho">' +
      '  <div>' +
      '    <button class="btn-voltar" onclick="MODULOS.avaliacoes.telaLista()">&larr; Avaliacoes</button>' +
      '    <h2>QADI-R &middot; ' + escaparHtml(this.pacienteAtual.nome) + '</h2>' +
      '    <p class="sub">' + calcularIdade(this.pacienteAtual.data_nascimento) +
      ' &middot; Respostas salvas automaticamente. Aplique quantas faixas precisar.</p>' +
      '  </div>' +
      '  <div style="display:flex; gap:8px; align-items:center">' +
      '    <div class="segmento">' +
      '      <button type="button" class="seg' + (av.oral === true ? ' ativo' : '') + '" ' +
      '        onclick="MODULOS.avaliacoes.marcarOral(this, true)">Oral</button>' +
      '      <button type="button" class="seg' + (av.oral === false ? ' ativo' : '') + '" ' +
      '        onclick="MODULOS.avaliacoes.marcarOral(this, false)">N&atilde;o Oral</button>' +
      '    </div>' +
      '    <button class="btn btn-primario" onclick="MODULOS.avaliacoes.concluir()">Concluir</button>' +
      '  </div>' +
      '</div>' +
      '<div class="abas">' + abasFaixas + '</div>' +
      corpo +
      '<div class="cartao"><div class="campo" style="margin:0"><label>Observacoes</label>' +
      '<textarea id="av-obs" rows="3" oninput="MODULOS.avaliacoes.salvarObs()" ' +
      'style="resize:vertical">' + escaparHtml(av.observacoes || '') + '</textarea></div></div>';
  },

  trocarFaixa(f) {
    this.faixaAtual = f;
    this.telaAplicacao();
    window.scrollTo({ top: 0 });
  },

  async responder(botao, questaoId, valor) {
    const anterior = this.respostas[questaoId];
    this.respostas[questaoId] = valor;
    botao.parentElement.querySelectorAll('.seg').forEach(b => b.classList.remove('ativo'));
    botao.classList.add('ativo');

    const { error } = await sb.from('avaliacao_respostas').upsert(
      { avaliacao_id: this.avaliacao.id, questao_id: questaoId, resposta: valor },
      { onConflict: 'avaliacao_id,questao_id' });
    if (error) {
      this.respostas[questaoId] = anterior;
      alert('Falha ao salvar: ' + error.message);
    }
  },

  async marcarOral(botao, valor) {
    this.avaliacao.oral = valor;
    botao.parentElement.querySelectorAll('.seg').forEach(b => b.classList.remove('ativo'));
    botao.classList.add('ativo');
    await sb.from('avaliacoes').update({ oral: valor }).eq('id', this.avaliacao.id);
  },

  _obsTimer: null,
  salvarObs() {
    clearTimeout(this._obsTimer);
    this._obsTimer = setTimeout(async () => {
      const v = document.getElementById('av-obs').value;
      this.avaliacao.observacoes = v;
      await sb.from('avaliacoes').update({ observacoes: v }).eq('id', this.avaliacao.id);
    }, 600);
  },

  async concluir() {
    const respondidas = Object.keys(this.respostas).length;
    if (respondidas === 0) { alert('Nenhuma resposta registrada ainda.'); return; }
    if (!confirm('Concluir a avaliacao com ' + respondidas + ' resposta(s)? ' +
      'Depois de concluida ela fica somente leitura.')) return;

    const { error } = await sb.from('avaliacoes')
      .update({ status: 'concluida', concluido_em: new Date().toISOString() })
      .eq('id', this.avaliacao.id);
    if (error) { alert('Erro: ' + error.message); return; }
    this.telaResultado(this.avaliacao.id);
  },

  // ───────────────────────── RESULTADO ─────────────────────────

  async telaResultado(avaliacaoId) {
    this.el.innerHTML =
      '<button class="btn-voltar" onclick="MODULOS.avaliacoes.telaLista()">&larr; Avaliacoes</button>' +
      '<div id="av-resultado"><div class="cartao"><p class="sub">Calculando...</p></div></div>';
    document.getElementById('av-resultado').innerHTML = await this.htmlResultado(avaliacaoId);
  },

  // Reutilizado pela aba Avaliacao do prontuario
  async htmlResultado(avaliacaoId) {
    await this.carregarQuestoes();

    const { data: av } = await sb.from('avaliacoes')
      .select('*, paciente_id, pacientes(nome, data_nascimento), avaliador:profiles!avaliacoes_avaliador_id_fkey(nome)')
      .eq('id', avaliacaoId).single();
    if (!av) return '<div class="cartao"><p class="sub">Avaliacao nao encontrada.</p></div>';

    const { data: resps } = await sb.from('avaliacao_respostas')
      .select('questao_id, resposta').eq('avaliacao_id', avaliacaoId);
    const mapa = {};
    (resps || []).forEach(r => { mapa[r.questao_id] = r.resposta; });

    // Faixas com pelo menos uma resposta
    const faixasAplicadas = this.FAIXAS.filter(f =>
      this.questoes.some(q => q.faixa === f && mapa[q.id]));

    let tabela = '<table class="tabela-presenca"><thead><tr><th>Area</th>' +
      faixasAplicadas.map(f => '<th class="centro">' +
        f.replace(' anos', 'a').replace(' ano', 'a').replace(' a ', '&ndash;') + '</th>').join('') +
      '<th class="centro">Geral</th></tr></thead><tbody>';

    this.AREAS.forEach(area => {
      let gs = 0, gv = 0;
      let linha = '<tr><td>' + area + '</td>';
      faixasAplicadas.forEach(f => {
        const qs = this.questoes.filter(q => q.faixa === f && q.area === area);
        const sim = qs.filter(q => mapa[q.id] === 'S').length;
        const validas = qs.filter(q => mapa[q.id] === 'S' || mapa[q.id] === 'N').length;
        gs += sim; gv += validas;
        linha += '<td class="centro">' +
          (validas ? Math.round(sim * 100 / validas) + '%<br><small style="color:var(--ink-soft)">' +
            sim + '/' + validas + '</small>' : '&mdash;') + '</td>';
      });
      linha += '<td class="centro"><b>' +
        (gv ? Math.round(gs * 100 / gv) + '%' : '&mdash;') + '</b></td></tr>';
      tabela += linha;
    });
    tabela += '</tbody></table>';

    const totalResp = Object.keys(mapa).length;
    const na = Object.values(mapa).filter(v => v === 'NA').length;

    return '<div class="cartao faixa-ambar">' +
      '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; flex-wrap:wrap; gap:8px">' +
      '<h3 style="margin:0">QADI-R &middot; ' + escaparHtml(av.pacientes.nome) + '</h3>' +
      '<div class="pac-selos">' +
      (av.oral === true ? '<span class="selo selo-roxo">Oral</span>' :
       av.oral === false ? '<span class="selo selo-roxo">Nao Oral</span>' : '') +
      (av.status === 'concluida'
        ? '<span class="selo selo-ok">Concluida em ' + new Date(av.concluido_em).toLocaleDateString('pt-BR') + '</span>'
        : '<span class="selo selo-warn">Em andamento</span>') +
      '</div></div>' +
      '<div class="grade-visao" style="margin-bottom:14px">' +
      '<div class="caixa-info"><small>Avaliador</small><b>' +
      escaparHtml(av.avaliador ? av.avaliador.nome : '-') + '</b></div>' +
      '<div class="caixa-info"><small>Respostas</small><b>' + totalResp +
      (na ? ' (' + na + ' NA)' : '') + '</b></div>' +
      '<div class="caixa-info"><small>Faixas aplicadas</small><b>' +
      (faixasAplicadas.length ? faixasAplicadas.join(' &middot; ') : '-') + '</b></div>' +
      '</div>' +
      '<p class="sub" style="margin-bottom:8px">Percentual de SIM sobre as respostas validas (NA excluido).</p>' +
      tabela +
      (av.observacoes
        ? '<div class="caixa-info larga" style="margin-top:14px"><small>Observacoes</small><b>' +
          escaparHtml(av.observacoes) + '</b></div>'
        : '') +
      (av.status === 'concluida' && this.PODE_AVALIAR.includes(window.CORTEX_SESSAO.profile.perfil)
        ? '<div class="barra-acoes nao-imprime" style="margin-top:14px">' +
          '<button class="btn btn-fantasma" onclick="MODULOS.pei.abrirDevolutiva(\'' + av.id + '\')">Relatorio de devolutiva</button>' +
          '<button class="btn btn-primario" onclick="MODULOS.pei.abrirConstrutor(\'' + av.id + '\', \'' + av.paciente_id + '\')">Gerar PEI</button>' +
          '</div>'
        : '') +
      '</div>';
  },

  // Lista de avaliacoes de um paciente (aba do prontuario)
  async htmlDoPaciente(pacienteId) {
    const { data } = await sb.from('avaliacoes')
      .select('id, status, iniciado_em, concluido_em')
      .eq('paciente_id', pacienteId)
      .order('iniciado_em', { ascending: false });

    if (!data || data.length === 0) {
      return '<div class="cartao"><div class="vazio"><div class="simbolo-vazio">&#9998;</div>' +
        '<strong>Nenhuma avaliacao aplicada</strong>' +
        'Inicie o QADI-R pelo menu Avaliacoes.</div></div>';
    }

    // Mostra o resultado da mais recente + lista das demais
    let html = await this.htmlResultado(data[0].id);
    if (data.length > 1) {
      html += '<div class="cartao"><h3>Aplicacoes anteriores</h3>' +
        data.slice(1).map(a =>
          '<div class="linha-doc"><b>QADI-R &middot; ' +
          new Date(a.iniciado_em).toLocaleDateString('pt-BR') + '</b>' +
          '<span class="selo ' + (a.status === 'concluida' ? 'selo-ok">Concluida' : 'selo-warn">Em andamento') +
          '</span></div>').join('') + '</div>';
    }
    return html;
  }
};
