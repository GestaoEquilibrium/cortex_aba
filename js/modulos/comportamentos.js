// ============================================================================
// CORTEX aba - js/modulos/comportamentos.js  (Sprint 16)
// Registro de comportamentos-alvo: definicao operacional, medida por
// frequencia ou duracao, registro ABC e grafico de evolucao por dia.
// Vive como aba do prontuario + faixa rapida na folha de aplicacao.
// ============================================================================

window.MODULOS = window.MODULOS || {};

window.MODULOS.comportamentos = {

  lista: [],
  pacienteId: null,

  // ══════════════════ ABA DO PRONTUARIO ══════════════════

  async abaProntuario(alvo, paciente) {
    this.pacienteId = paciente.id;
    alvo.innerHTML = '<p class="sub">Carregando comportamentos...</p>';

    const { data, error } = await sb.from('comportamentos')
      .select('*')
      .eq('paciente_id', paciente.id)
      .order('criado_em');
    if (error) { alvo.innerHTML = '<p class="sub">Erro: ' + escaparHtml(error.message) + '</p>'; return; }
    this.lista = data || [];

    const podeE = perm('comportamentos') === 'E';
    let html =
      '<div class="secao-cabecalho">' +
      '  <h3>Comportamentos-alvo</h3>' +
      (podeE
        ? '<button class="btn btn-primario btn-mini" onclick="MODULOS.comportamentos.modalNovo()">+ Novo comportamento</button>'
        : '') +
      '</div>';

    if (!this.lista.length) {
      html += '<div class="vazio-suave"><div class="simbolo-vazio">&#128200;</div>' +
        '<strong>Nenhum comportamento cadastrado</strong>' +
        '<p class="sub">Cadastre os comportamentos que a equipe deve observar e registrar nas sessoes.</p></div>';
      alvo.innerHTML = html;
      return;
    }

    html += this.lista.map(c =>
      '<div class="cartao cartao-comp' + (c.ativo ? '' : ' inativo') + '">' +
      '  <div class="comp-topo">' +
      '    <div>' +
      '      <strong>' + escaparHtml(c.nome) + '</strong> ' +
      '      <span class="selo ' + (c.medida === 'duracao' ? 'selo-roxo">Duracao' : 'selo-warn">Frequencia') + '</span>' +
      (c.ativo ? '' : ' <span class="selo selo-neutro">Inativo</span>') +
      '      <p class="sub" style="margin:4px 0 0">' + escaparHtml(c.definicao || '') + '</p>' +
      '    </div>' +
      '    <div class="comp-acoes">' +
      (perm('comportamentos') === 'E'
        ? '<button class="btn-chip" onclick="MODULOS.comportamentos.modalRegistrar(\'' + c.id + '\')">+ Registrar</button>' +
          '<button class="btn-chip" onclick="MODULOS.comportamentos.modalNovo(\'' + c.id + '\')">Editar</button>'
        : '') +
      '    </div>' +
      '  </div>' +
      '  <div id="comp-graf-' + c.id + '"><p class="sub">Carregando historico...</p></div>' +
      '</div>').join('');

    alvo.innerHTML = html;
    this.lista.forEach(c => this.desenharGrafico(c));
  },

  async desenharGrafico(c) {
    const alvo = document.getElementById('comp-graf-' + c.id);
    if (!alvo) return;

    const desde = new Date();
    desde.setDate(desde.getDate() - 13);
    const dDesde = desde.toISOString().slice(0, 10);

    const { data: regs } = await sb.from('comportamento_registros')
      .select('data, quantidade, duracao_seg, antecedente, descricao, consequencia, criado_em, autor:profiles!comportamento_registros_registrado_por_fkey(nome)')
      .eq('comportamento_id', c.id)
      .gte('data', dDesde)
      .order('data');

    const lista = regs || [];
    if (!lista.length) {
      alvo.innerHTML = '<p class="sub" style="margin-top:8px">Sem registros nos ultimos 14 dias.</p>';
      return;
    }

    // Soma por dia
    const porDia = {};
    for (let i = 0; i < 14; i++) {
      const d = new Date(desde); d.setDate(desde.getDate() + i);
      porDia[d.toISOString().slice(0, 10)] = 0;
    }
    lista.forEach(r => {
      const v = c.medida === 'duracao' ? Math.round((r.duracao_seg || 0) / 60) : (r.quantidade || 0);
      if (r.data in porDia) porDia[r.data] += v;
    });
    const dias = Object.keys(porDia);
    const max = Math.max(1, ...Object.values(porDia));

    let html = '<div class="comp-grafico">' + dias.map(d => {
      const v = porDia[d];
      return '<div class="comp-dia" title="' + d.split('-').reverse().join('/') + ': ' + v +
        (c.medida === 'duracao' ? ' min' : 'x') + '">' +
        '<div class="comp-coluna"><div class="comp-preench" style="height:' +
        Math.round(v * 100 / max) + '%"></div></div>' +
        '<span>' + d.slice(8) + '</span></div>';
    }).join('') + '</div>' +
    '<p class="sub" style="margin-top:4px">Ultimos 14 dias &middot; ' +
    (c.medida === 'duracao' ? 'minutos somados por dia' : 'ocorrencias por dia') + '</p>';

    // Ultimos registros ABC
    const comAbc = lista.filter(r => r.antecedente || r.descricao || r.consequencia).slice(-5).reverse();
    if (comAbc.length) {
      html += '<details class="comp-abc"><summary>Registros ABC recentes (' + comAbc.length + ')</summary>' +
        comAbc.map(r =>
          '<div class="abc-item">' +
          '  <div class="abc-meta">' + r.data.split('-').reverse().join('/') +
          (r.autor ? ' &middot; ' + escaparHtml(r.autor.nome.split(' ')[0]) : '') + '</div>' +
          (r.antecedente ? '<div><b>A</b> ' + escaparHtml(r.antecedente) + '</div>' : '') +
          (r.descricao ? '<div><b>B</b> ' + escaparHtml(r.descricao) + '</div>' : '') +
          (r.consequencia ? '<div><b>C</b> ' + escaparHtml(r.consequencia) + '</div>' : '') +
          '</div>').join('') + '</details>';
    }
    alvo.innerHTML = html;
  },

  // ══════════════════ CADASTRO ══════════════════

  modalNovo(id) {
    const c = id ? this.lista.find(x => x.id === id) : null;
    abrirModal(c ? 'Editar comportamento' : 'Novo comportamento-alvo',
      '<div class="campo"><label>Nome do comportamento *</label>' +
      '  <input id="cp-nome" placeholder="Ex.: Estereotipia vocal, Auto-lesao, Fuga da tarefa" value="' +
           escaparHtml(c ? c.nome : '') + '"></div>' +
      '<div class="campo"><label>Definicao operacional *</label>' +
      '  <textarea id="cp-def" rows="3" placeholder="Descricao objetiva e observavel: o que conta e o que nao conta como ocorrencia.">' +
           escaparHtml(c ? (c.definicao || '') : '') + '</textarea></div>' +
      '<div class="campo"><label>Medida *</label>' +
      '  <select id="cp-medida">' +
      '    <option value="frequencia"' + (c && c.medida === 'frequencia' ? ' selected' : '') + '>Frequencia (quantas vezes)</option>' +
      '    <option value="duracao"' + (c && c.medida === 'duracao' ? ' selected' : '') + '>Duracao (quanto tempo)</option>' +
      '  </select></div>' +
      (c
        ? '<div class="campo"><label>Situacao</label><select id="cp-ativo">' +
          '<option value="true"' + (c.ativo ? ' selected' : '') + '>Ativo</option>' +
          '<option value="false"' + (!c.ativo ? ' selected' : '') + '>Inativo</option>' +
          '</select></div>'
        : '') +
      '<div class="mensagem-erro" id="cp-erro"></div>' +
      '<div class="barra-acoes">' +
      '  <button class="btn btn-fantasma" onclick="fecharModal()">Cancelar</button>' +
      '  <button class="btn btn-primario" onclick="MODULOS.comportamentos.salvar(' +
           (c ? "'" + c.id + "'" : 'null') + ')">Salvar</button>' +
      '</div>');
  },

  async salvar(id) {
    const erro = document.getElementById('cp-erro');
    erro.classList.remove('visivel');
    const dados = {
      nome: document.getElementById('cp-nome').value.trim(),
      definicao: document.getElementById('cp-def').value.trim(),
      medida: document.getElementById('cp-medida').value
    };
    if (!dados.nome || !dados.definicao) {
      erro.textContent = 'Preencha nome e definicao operacional.';
      erro.classList.add('visivel');
      return;
    }
    if (id) dados.ativo = document.getElementById('cp-ativo').value === 'true';
    else {
      dados.paciente_id = this.pacienteId;
      dados.criado_por = window.CORTEX_SESSAO.user.id;
    }
    const q = id
      ? sb.from('comportamentos').update(dados).eq('id', id)
      : sb.from('comportamentos').insert(dados);
    const { error } = await q;
    if (error) { erro.textContent = error.message; erro.classList.add('visivel'); return; }
    fecharModal();
    MODULOS.pacientes.abrirAba('comportamentos');
  },

  // ══════════════════ REGISTRO (prontuario ou folha) ══════════════════

  modalRegistrar(compId, sessaoId, aoSalvar) {
    const c = this.lista.find(x => x.id === compId);
    if (!c) return;
    const ehDuracao = c.medida === 'duracao';

    abrirModal('Registrar &middot; ' + escaparHtml(c.nome),
      '<p class="sub" style="margin-bottom:12px">' + escaparHtml(c.definicao || '') + '</p>' +
      (ehDuracao
        ? '<div class="campo"><label>Duracao (em segundos) *</label>' +
          '<input type="number" id="rg-valor" min="1" step="1" placeholder="Ex.: 45"></div>'
        : '<div class="campo"><label>Quantas ocorrencias? *</label>' +
          '<input type="number" id="rg-valor" min="1" step="1" value="1"></div>') +
      '<div class="campo"><label>A &middot; Antecedente <small>(o que veio antes - opcional)</small></label>' +
      '  <input id="rg-a" placeholder="Ex.: Foi apresentada uma demanda dificil"></div>' +
      '<div class="campo"><label>B &middot; Comportamento <small>(como foi - opcional)</small></label>' +
      '  <input id="rg-b" placeholder="Ex.: Jogou o material no chao e gritou"></div>' +
      '<div class="campo"><label>C &middot; Consequencia <small>(o que aconteceu depois - opcional)</small></label>' +
      '  <input id="rg-c" placeholder="Ex.: Bloqueio suave e redirecionamento para a tarefa"></div>' +
      '<div class="mensagem-erro" id="rg-erro"></div>' +
      '<div class="barra-acoes">' +
      '  <button class="btn btn-fantasma" onclick="fecharModal()">Cancelar</button>' +
      '  <button class="btn btn-primario" id="rg-salvar" onclick="MODULOS.comportamentos.salvarRegistro(\'' +
           compId + '\', ' + (sessaoId ? "'" + sessaoId + "'" : 'null') + ', ' + (aoSalvar ? 'true' : 'false') + ')">Registrar</button>' +
      '</div>');
  },

  async salvarRegistro(compId, sessaoId, recarregarFolha) {
    const c = this.lista.find(x => x.id === compId);
    const erro = document.getElementById('rg-erro');
    erro.classList.remove('visivel');
    const valor = parseInt(document.getElementById('rg-valor').value, 10);
    if (!valor || valor < 1) {
      erro.textContent = c.medida === 'duracao' ? 'Informe a duracao em segundos.' : 'Informe a quantidade.';
      erro.classList.add('visivel');
      return;
    }

    const botao = document.getElementById('rg-salvar');
    botao.disabled = true;
    const { error } = await sb.from('comportamento_registros').insert({
      comportamento_id: compId,
      sessao_id: sessaoId || null,
      data: new Date().toISOString().slice(0, 10),
      quantidade: c.medida === 'frequencia' ? valor : null,
      duracao_seg: c.medida === 'duracao' ? valor : null,
      antecedente: document.getElementById('rg-a').value.trim() || null,
      descricao: document.getElementById('rg-b').value.trim() || null,
      consequencia: document.getElementById('rg-c').value.trim() || null,
      registrado_por: window.CORTEX_SESSAO.user.id
    });
    if (error) {
      erro.textContent = error.message;
      erro.classList.add('visivel');
      botao.disabled = false;
      return;
    }
    fecharModal();
    if (recarregarFolha) MODULOS.programas.atualizarFaixaComp?.();
    else this.desenharGrafico(c);
  },

  // ══════════════════ FAIXA RAPIDA DA FOLHA DE APLICACAO ══════════════════

  async faixaFolha(pacienteId, sessaoId) {
    this.pacienteId = pacienteId;
    const { data } = await sb.from('comportamentos')
      .select('*').eq('paciente_id', pacienteId).eq('ativo', true).order('nome');
    this.lista = data || [];
    if (!this.lista.length) return '';

    const { data: regs } = await sb.from('comportamento_registros')
      .select('comportamento_id, quantidade, duracao_seg')
      .eq('sessao_id', sessaoId);
    const soma = {};
    (regs || []).forEach(r => {
      soma[r.comportamento_id] = (soma[r.comportamento_id] || 0) +
        (r.quantidade || Math.round((r.duracao_seg || 0) / 60) || 0);
    });

    return '<div class="cartao faixa-comp" id="faixa-comp">' +
      '<h4>Comportamentos <small>toque para registrar (com ABC opcional)</small></h4>' +
      '<div class="faixa-comp-botoes">' +
      this.lista.map(c =>
        '<button class="btn-chip comp-chip" onclick="MODULOS.comportamentos.modalRegistrar(\'' +
        c.id + '\', \'' + sessaoId + '\', true)">' +
        escaparHtml(c.nome) +
        '<span class="comp-badge" id="comp-badge-' + c.id + '">' + (soma[c.id] || 0) + '</span>' +
        '</button>').join('') +
      '</div></div>';
  }
};
