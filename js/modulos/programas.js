// ============================================================================
// CORTEX aba - js/modulos/programas.js
// Sprint 10: Intervencao.
// - Biblioteca de programas de ensino (clinica)
// - Programas e alvos por paciente (fila > intervencao > dominado)
// - Folha de aplicacao na sessao: tentativas I / FT / FP / G / Ve / Vi
// - Fechamento: resumo, promocao de alvos e evolucao diaria
// Licao da v1: alvo so e promovido no fechamento da sessao.
// ============================================================================

window.MODULOS = window.MODULOS || {};

window.MODULOS.programas = {

  RESPOSTAS: [
    ['I',  'Independente'],
    ['FT', 'Fisica total'],
    ['FP', 'Fisica parcial'],
    ['G',  'Gestual'],
    ['Ve', 'Verbal'],
    ['Vi', 'Visual']
  ],
  AREAS: ['Mando', 'Tato', 'Ecoico', 'Imitacao', 'Ouvinte', 'Brincar',
          'Habilidades Sociais', 'AVD', 'Coordenacao Motora', 'Academico', 'Outros'],

  el() { return document.getElementById('pagina'); },

  // ══════════════════ BIBLIOTECA (menu Programas) ══════════════════

  async render(el) {
    const podeE = perm('programas') === 'E';

    el.innerHTML =
      '<div class="pagina-cabecalho">' +
      '  <div><h2>Biblioteca de Programas</h2>' +
      '  <p class="sub">Programas de ensino da clinica. Os alvos sao definidos por paciente, no prontuario.</p></div>' +
      (podeE ? '<button class="btn btn-primario" onclick="MODULOS.programas.modalPrograma()">+ Novo programa</button>' : '') +
      '</div>' +
      '<div id="bib-lista"><div class="cartao"><p class="sub">Carregando...</p></div></div>';

    await this.carregarBiblioteca();
    this.desenharBiblioteca();
  },

  async carregarBiblioteca() {
    const { data } = await sb.from('programas')
      .select('*').order('area').order('nome');
    this.biblioteca = data || [];
  },

  desenharBiblioteca() {
    const podeE = perm('programas') === 'E';
    const alvo = document.getElementById('bib-lista');
    if (!alvo) return;

    if (this.biblioteca.length === 0) {
      alvo.innerHTML = '<div class="cartao"><div class="vazio">' +
        '<div class="simbolo-vazio">&#128218;</div><strong>Biblioteca vazia</strong>' +
        'Crie o primeiro programa de ensino.</div></div>';
      return;
    }

    const porArea = {};
    this.biblioteca.forEach(p => { (porArea[p.area] = porArea[p.area] || []).push(p); });

    alvo.innerHTML = Object.entries(porArea).map(([area, lista]) =>
      '<div class="cartao"><h3>' + escaparHtml(area) +
      ' <span class="selo selo-neutro">' + lista.length + '</span></h3>' +
      lista.map(p =>
        '<div class="linha-doc"><div><b>' + escaparHtml(p.nome) + '</b>' +
        '<small>' + escaparHtml(p.objetivo || '') + '</small></div>' +
        '<div class="pac-selos">' +
        (p.ativo ? '' : '<span class="selo selo-neutro">Inativo</span>') +
        (podeE ? '<button class="btn-chip" onclick="MODULOS.programas.modalPrograma(\'' + p.id + '\')">Editar</button>' : '') +
        '</div></div>').join('') +
      '</div>').join('');
  },

  modalPrograma(id) {
    const p = id ? this.biblioteca.find(x => x.id === id) : null;
    abrirModal(p ? 'Editar programa' : 'Novo programa',
      '<div class="grade-form">' +
      '  <div class="campo c2"><label>Nome *</label><input id="bp-nome" value="' + escaparHtml(p ? p.nome : '') + '"></div>' +
      '  <div class="campo"><label>Area *</label><select id="bp-area">' +
      this.AREAS.map(a => '<option' + (p && p.area === a ? ' selected' : '') + '>' + a + '</option>').join('') +
      '  </select></div>' +
      '  <div class="campo c3"><label>Objetivo</label><textarea id="bp-objetivo" rows="2">' +
      escaparHtml(p ? p.objetivo || '' : '') + '</textarea></div>' +
      '  <div class="campo c3"><label>Procedimento</label><textarea id="bp-proc" rows="3">' +
      escaparHtml(p ? p.procedimento || '' : '') + '</textarea></div>' +
      '  <div class="campo c2"><label>Criterio de avanco</label><input id="bp-criterio" ' +
      'placeholder="Ex.: 80% de independencia em 3 sessoes" value="' + escaparHtml(p ? p.criterio_avanco || '' : '') + '"></div>' +
      (p ? '<div class="campo"><label>Situacao</label><select id="bp-ativo">' +
        '<option value="true"' + (p.ativo ? ' selected' : '') + '>Ativo</option>' +
        '<option value="false"' + (!p.ativo ? ' selected' : '') + '>Inativo</option></select></div>' : '') +
      '</div>' +
      '<div class="mensagem-erro" id="bp-erro"></div>' +
      '<div class="barra-acoes">' +
      '  <button class="btn btn-fantasma" onclick="fecharModal()">Cancelar</button>' +
      '  <button class="btn btn-primario" onclick="MODULOS.programas.salvarPrograma(' +
      (p ? '\'' + p.id + '\'' : 'null') + ')">Salvar</button>' +
      '</div>', true);
  },

  async salvarPrograma(id) {
    const erro = document.getElementById('bp-erro');
    erro.classList.remove('visivel');
    const dados = {
      nome: document.getElementById('bp-nome').value.trim(),
      area: document.getElementById('bp-area').value,
      objetivo: document.getElementById('bp-objetivo').value.trim() || null,
      procedimento: document.getElementById('bp-proc').value.trim() || null,
      criterio_avanco: document.getElementById('bp-criterio').value.trim() || null
    };
    if (id) dados.ativo = document.getElementById('bp-ativo').value === 'true';
    if (!dados.nome) { erro.textContent = 'Informe o nome.'; erro.classList.add('visivel'); return; }

    const q = id
      ? sb.from('programas').update(dados).eq('id', id)
      : sb.from('programas').insert(dados);
    const { error } = await q;
    if (error) { erro.textContent = error.message; erro.classList.add('visivel'); return; }
    fecharModal();
    await this.carregarBiblioteca();
    this.desenharBiblioteca();
  },

  // ══════════════════ PROGRAMAS DO PACIENTE (aba do prontuario) ══════════════════

  async htmlProgramasPaciente(pacienteId) {
    const podeE = perm('programas') === 'E';
    this._pacProgPaciente = pacienteId;

    const { data } = await sb.from('paciente_programas')
      .select('id, status, programas(id, nome, area, criterio_avanco), alvos(id, descricao, status, ordem)')
      .eq('paciente_id', pacienteId)
      .order('criado_em');
    const lista = data || [];

    const grupos = {
      em_intervencao: ['Em intervencao', 'faixa-roxo'],
      na_fila: ['Na fila', 'faixa-azul'],
      dominado: ['Dominados', 'faixa-verde']
    };

    let html = podeE
      ? '<div class="cartao faixa-ambar"><h3>Adicionar programa</h3>' +
        '<p class="sub" style="margin-bottom:10px">Escolha da biblioteca e defina os alvos deste paciente.</p>' +
        '<button class="btn btn-primario" onclick="MODULOS.programas.modalAtribuir(\'' + pacienteId + '\')">+ Programa para o paciente</button></div>'
      : '';

    Object.entries(grupos).forEach(([status, [rotulo, faixa]]) => {
      const doGrupo = lista.filter(pp => pp.status === status);
      if (doGrupo.length === 0 && status !== 'em_intervencao') return;
      html += '<div class="cartao ' + faixa + '"><h3>' + rotulo +
        ' <span class="selo selo-neutro">' + doGrupo.length + '</span></h3>' +
        (doGrupo.length === 0 ? '<p class="sub">Nenhum programa aqui.</p>' :
        doGrupo.map(pp => {
          const alvos = (pp.alvos || []).sort((a, b) => a.ordem - b.ordem);
          const emInt = alvos.filter(a => a.status === 'em_intervencao').length;
          const dom = alvos.filter(a => a.status === 'dominado').length;
          return '<div class="linha-doc"><div><b>' + escaparHtml(pp.programas.nome) + '</b>' +
            '<small>' + escaparHtml(pp.programas.area) + ' &middot; ' +
            alvos.length + ' alvo(s): ' + emInt + ' em intervencao, ' + dom + ' dominado(s)' +
            (pp.programas.criterio_avanco ? ' &middot; ' + escaparHtml(pp.programas.criterio_avanco) : '') +
            '</small></div>' +
            '<div class="pac-selos">' +
            (podeE ? '<button class="btn-chip" onclick="MODULOS.programas.modalAlvos(\'' + pp.id + '\')">Alvos</button>' : '') +
            '</div></div>';
        }).join('')) +
        '</div>';
    });

    return html || '<div class="cartao"><p class="sub">Nenhum programa atribuido.</p></div>';
  },

  async modalAtribuir(pacienteId) {
    await this.carregarBiblioteca();
    const ativos = this.biblioteca.filter(p => p.ativo);
    if (ativos.length === 0) {
      abrirModal('Adicionar programa',
        '<p class="sub">A biblioteca esta vazia. Crie programas no menu Programas.</p>' +
        '<div class="barra-acoes"><button class="btn btn-primario" onclick="fecharModal()">Ok</button></div>');
      return;
    }
    abrirModal('Programa para o paciente',
      '<div class="campo"><label>Programa da biblioteca *</label><select id="at-prog">' +
      ativos.map(p => '<option value="' + p.id + '">' + escaparHtml(p.area + ' - ' + p.nome) + '</option>').join('') +
      '</select></div>' +
      '<div class="campo"><label>Alvos (um por linha) *</label>' +
      '<textarea id="at-alvos" rows="5" placeholder="Ex.:\nbola\ncarro\ncopo"></textarea></div>' +
      '<div class="campo"><label>Situacao inicial</label><select id="at-status">' +
      '<option value="em_intervencao">Em intervencao (entra na folha)</option>' +
      '<option value="na_fila">Na fila</option></select></div>' +
      '<div class="mensagem-erro" id="at-erro"></div>' +
      '<div class="barra-acoes">' +
      '  <button class="btn btn-fantasma" onclick="fecharModal()">Cancelar</button>' +
      '  <button class="btn btn-primario" onclick="MODULOS.programas.salvarAtribuicao(\'' + pacienteId + '\')">Adicionar</button>' +
      '</div>');
  },

  async salvarAtribuicao(pacienteId) {
    const erro = document.getElementById('at-erro');
    erro.classList.remove('visivel');
    const alvos = document.getElementById('at-alvos').value
      .split('\n').map(t => t.trim()).filter(Boolean);
    if (alvos.length === 0) { erro.textContent = 'Defina ao menos um alvo.'; erro.classList.add('visivel'); return; }

    try {
      const { data: pp, error: e1 } = await sb.from('paciente_programas').insert({
        paciente_id: pacienteId,
        programa_id: document.getElementById('at-prog').value,
        status: document.getElementById('at-status').value,
        criado_por: window.CORTEX_SESSAO.user.id
      }).select('id, status').single();
      if (e1) throw new Error(e1.message);

      const statusAlvo = pp.status === 'em_intervencao' ? 'em_intervencao' : 'em_aberto';
      const { error: e2 } = await sb.from('alvos').insert(
        alvos.map((d, i) => ({ paciente_programa_id: pp.id, descricao: d, ordem: i + 1, status: statusAlvo })));
      if (e2) throw new Error(e2.message);

      fecharModal();
      this.recarregarAbaProgramas();
    } catch (e) {
      erro.textContent = e.message; erro.classList.add('visivel');
    }
  },

  async modalAlvos(ppId) {
    const { data: pp } = await sb.from('paciente_programas')
      .select('id, status, paciente_id, programas(nome), alvos(id, descricao, status, ordem, nivel_dominio)')
      .eq('id', ppId).single();
    if (!pp) return;
    this._ppAtual = pp;

    const alvos = (pp.alvos || []).sort((a, b) => a.ordem - b.ordem);
    const seloAlvo = s =>
      s === 'em_intervencao' ? '<span class="selo selo-roxo">Intervencao</span>' :
      s === 'dominado' ? '<span class="selo selo-ok">Dominado</span>' :
      s === 'manutencao' ? '<span class="selo selo-warn">Manutencao</span>' :
      '<span class="selo selo-neutro">Aberto</span>';

    abrirModal('Alvos &middot; ' + escaparHtml(pp.programas.nome),
      alvos.map(a =>
        '<div class="linha-doc"><div><b>' + escaparHtml(a.descricao) + '</b>' +
        (a.nivel_dominio ? '<small>Dominio: ' + a.nivel_dominio + '/10</small>' : '<small>Dominio: sem registro</small>') +
        '</div>' +
        '<div class="pac-selos">' +
        (a.nivel_dominio ? '<span class="selo selo-roxo">' + a.nivel_dominio + '/10</span>' : '') +
        '<button class="btn-chip" onclick="MODULOS.programas.historicoAlvo(\'' + a.id + '\', \'' +
        escaparHtml(a.descricao).replace(/'/g, '') + '\')">Historico</button>' +
        seloAlvo(a.status) +
        '<select onchange="MODULOS.programas.mudarAlvo(\'' + a.id + '\', this.value)" ' +
        'style="padding:5px 8px; border:1.5px solid var(--line); border-radius:8px; font:inherit; font-size:11px; background:var(--surface); color:var(--ink)">' +
        [['em_aberto', 'Aberto'], ['em_intervencao', 'Intervencao'], ['manutencao', 'Manutencao'], ['dominado', 'Dominado']]
          .map(([v, r]) => '<option value="' + v + '"' + (a.status === v ? ' selected' : '') + '>' + r + '</option>').join('') +
        '</select></div></div>').join('') +
      '<div class="grade-form" style="margin-top:12px">' +
      '  <div class="campo c2"><label>Novo alvo</label><input id="na-desc"></div>' +
      '  <div class="campo" style="display:flex; align-items:flex-end">' +
      '    <button class="btn btn-fantasma" onclick="MODULOS.programas.addAlvo()">Adicionar</button></div>' +
      '</div>' +
      '<div class="campo"><label>Situacao do programa</label><select id="pp-status" ' +
      'onchange="MODULOS.programas.mudarPrograma(this.value)">' +
      [['na_fila', 'Na fila'], ['em_intervencao', 'Em intervencao'], ['dominado', 'Dominado']]
        .map(([v, r]) => '<option value="' + v + '"' + (pp.status === v ? ' selected' : '') + '>' + r + '</option>').join('') +
      '</select></div>');
  },

  async mudarAlvo(alvoId, status) {
    await sb.from('alvos').update({ status: status }).eq('id', alvoId);
    this.recarregarAbaProgramas();
  },

  async mudarPrograma(status) {
    await sb.from('paciente_programas').update({ status: status }).eq('id', this._ppAtual.id);
    this.recarregarAbaProgramas();
  },

  async addAlvo() {
    const desc = document.getElementById('na-desc').value.trim();
    if (!desc) return;
    const ordem = (this._ppAtual.alvos || []).length + 1;
    await sb.from('alvos').insert({
      paciente_programa_id: this._ppAtual.id, descricao: desc, ordem: ordem,
      status: this._ppAtual.status === 'em_intervencao' ? 'em_intervencao' : 'em_aberto'
    });
    this.modalAlvos(this._ppAtual.id);
  },

  async historicoAlvo(alvoId, descricao) {
    const { data } = await sb.from('alvo_sessao_registros')
      .select('tentativas, pct_independencia, nivel_dominio, observacao, sessoes(data, hora_inicio)')
      .eq('alvo_id', alvoId)
      .order('criado_em', { ascending: false })
      .limit(40);
    const lista = data || [];

    abrirModal('Historico do alvo &middot; ' + escaparHtml(descricao),
      (lista.length === 0
        ? '<p class="sub">Ainda sem registros de sessao para este alvo. O retrato e gravado no encerramento de cada sessao.</p>'
        : lista.map(r =>
            '<div class="linha-doc" style="align-items:flex-start"><div style="flex:1">' +
            '<b>' + (r.sessoes ? new Date(r.sessoes.data + 'T12:00:00').toLocaleDateString('pt-BR') : '-') + '</b>' +
            '<small>' + r.tentativas + ' tentativas &middot; ' + r.pct_independencia + '% I</small>' +
            (r.observacao
              ? '<p style="margin-top:5px; font-size:12px; line-height:1.6; white-space:pre-wrap">' +
                escaparHtml(r.observacao) + '</p>' : '') +
            '</div>' +
            '<span class="selo selo-roxo">' + r.nivel_dominio + '/10</span>' +
            '</div>').join('')), true);
  },

  recarregarAbaProgramas() {
    const alvo = document.getElementById('pac-aba-conteudo');
    if (alvo && this._pacProgPaciente) {
      this.htmlProgramasPaciente(this._pacProgPaciente).then(h => { alvo.innerHTML = h; });
    }
  },

  // ══════════════════ FOLHA DE APLICACAO (sessao) ══════════════════

  async abrirFolha(sessaoId) {
    const el = this.el();
    el.innerHTML = '<div class="cartao"><p class="sub">Preparando a folha de aplicacao...</p></div>';

    const { data: s } = await sb.from('sessoes')
      .select('id, data, hora_inicio, status, paciente_id, pacientes(nome)')
      .eq('id', sessaoId).single();
    if (!s) { abrirModulo('agenda'); return; }

    const { data: pps } = await sb.from('paciente_programas')
      .select('id, programas(id, nome, area, procedimento), alvos(id, descricao, status, ordem, nivel_dominio)')
      .eq('paciente_id', s.paciente_id)
      .eq('status', 'em_intervencao');

    const { data: regs } = await sb.from('registros_tentativas')
      .select('id, alvo_id, resposta').eq('sessao_id', sessaoId);

    this._folha = {
      sessao: s,
      programas: pps || [],
      registros: regs || []
    };

    this._folha.faixaComp = await MODULOS.comportamentos.faixaFolha(s.paciente_id, sessaoId);

    if (s.status === 'checkin') {
      await sb.from('sessoes').update({ status: 'em_atendimento' }).eq('id', sessaoId);
    }

    this.desenharFolha();
  },

  async atualizarFaixaComp() {
    const f = this._folha;
    if (!f || !document.getElementById('faixa-comp')) return;
    const { data: regs } = await sb.from('comportamento_registros')
      .select('comportamento_id, quantidade, duracao_seg')
      .eq('sessao_id', f.sessao.id);
    const soma = {};
    (regs || []).forEach(r => {
      soma[r.comportamento_id] = (soma[r.comportamento_id] || 0) +
        (r.quantidade || Math.round((r.duracao_seg || 0) / 60) || 0);
    });
    MODULOS.comportamentos.lista.forEach(c2 => {
      const b = document.getElementById('comp-badge-' + c2.id);
      if (b) b.textContent = soma[c2.id] || 0;
    });
  },

  contagem(alvoId) {
    const regs = this._folha.registros.filter(r => r.alvo_id === alvoId);
    const i = regs.filter(r => r.resposta === 'I').length;
    return { total: regs.length, i: i, pct: regs.length ? Math.round(i * 100 / regs.length) : 0 };
  },

  desenharFolha() {
    const f = this._folha;
    const s = f.sessao;

    let corpo = f.faixaComp || '';
    f.programas.forEach(pp => {
      const alvos = (pp.alvos || []).filter(a => a.status === 'em_intervencao')
        .sort((a, b) => a.ordem - b.ordem);
      if (alvos.length === 0) return;
      corpo += '<div class="cartao"><h3>' + escaparHtml(pp.programas.nome) +
        ' <span class="selo selo-neutro">' + escaparHtml(pp.programas.area) + '</span></h3>' +
        (pp.programas.procedimento
          ? '<p class="sub" style="margin-bottom:10px">' + escaparHtml(pp.programas.procedimento) + '</p>' : '') +
        alvos.map(a => {
          const ct = this.contagem(a.id);
          return '<div class="folha-alvo" id="alvo-' + a.id + '">' +
            '<div class="folha-alvo-topo">' +
            '  <b>' + escaparHtml(a.descricao) + '</b>' +
            '  <span class="folha-cont" id="cont-' + a.id + '">' +
            ct.total + ' tentativa(s) &middot; ' + ct.pct + '% I</span>' +
            '</div>' +
            '<div class="folha-botoes">' +
            this.RESPOSTAS.map(([v, rotulo]) =>
              '<button type="button" class="btn-resposta' + (v === 'I' ? ' indep' : '') + '" ' +
              'title="' + rotulo + '" ' +
              'onclick="MODULOS.programas.registrar(\'' + a.id + '\', \'' + v + '\')">' + v + '</button>').join('') +
            '</div></div>';
        }).join('') +
        '</div>';
    });

    if (!corpo) {
      corpo = '<div class="cartao"><div class="vazio">' +
        '<div class="simbolo-vazio">&#127919;</div>' +
        '<strong>Nenhum alvo em intervencao</strong>' +
        'Defina os programas e alvos deste paciente na aba Programas do prontuario.' +
        '</div></div>';
    }

    this.el().innerHTML =
      '<div class="pagina-cabecalho">' +
      '  <div>' +
      '    <button class="btn-voltar" onclick="abrirModulo(\'agenda\')">&larr; Agenda</button>' +
      '    <h2>Folha de aplicacao &middot; ' + escaparHtml(s.pacientes.nome) + '</h2>' +
      '    <p class="sub">' + new Date(s.data + 'T12:00:00').toLocaleDateString('pt-BR') +
      ' as ' + s.hora_inicio.slice(0, 5) +
      ' &middot; I = independente; FT/FP/G/Ve/Vi = tipo de ajuda. Cada toque registra uma tentativa.</p>' +
      '  </div>' +
      '  <div style="display:flex; gap:8px">' +
      '    <button class="btn btn-fantasma" onclick="MODULOS.programas.desfazer()">Desfazer ultima</button>' +
      '    <button class="btn btn-primario" onclick="MODULOS.programas.telaFechamento()">Encerrar sessao</button>' +
      '  </div>' +
      '</div>' + corpo;
  },

  async registrar(alvoId, resposta) {
    const { data, error } = await sb.from('registros_tentativas').insert({
      sessao_id: this._folha.sessao.id,
      alvo_id: alvoId,
      resposta: resposta,
      registrado_por: window.CORTEX_SESSAO.user.id
    }).select('id, alvo_id, resposta').single();
    if (error) { alert('Falha ao registrar: ' + error.message); return; }
    this._folha.registros.push(data);
    const ct = this.contagem(alvoId);
    const cont = document.getElementById('cont-' + alvoId);
    if (cont) cont.innerHTML = ct.total + ' tentativa(s) &middot; ' + ct.pct + '% I';
  },

  async desfazer() {
    const ultimo = this._folha.registros[this._folha.registros.length - 1];
    if (!ultimo) return;
    await sb.from('registros_tentativas').delete().eq('id', ultimo.id);
    this._folha.registros.pop();
    const ct = this.contagem(ultimo.alvo_id);
    const cont = document.getElementById('cont-' + ultimo.alvo_id);
    if (cont) cont.innerHTML = ct.total + ' tentativa(s) &middot; ' + ct.pct + '% I';
  },

  // ══════════════════ FECHAMENTO ══════════════════

  telaFechamento() {
    const f = this._folha;
    const linhas = [];
    f.programas.forEach(pp => {
      (pp.alvos || []).filter(a => a.status === 'em_intervencao').forEach(a => {
        const ct = this.contagem(a.id);
        if (ct.total === 0) return;
        linhas.push({ alvo: a, programa: pp.programas.nome, ct });
      });
    });

    this._fechamento = linhas;
    abrirModal('Encerrar sessao',
      (linhas.length
        ? '<p class="sub" style="margin-bottom:10px">Para cada alvo trabalhado: nivel de dominio da sessao (1 a 10), ' +
          'observacao (opcional) e, se atingiu criterio, a promocao a Dominado (que acontece apenas aqui, no fechamento).</p>' +
          linhas.map(l =>
            '<div class="fech-alvo" data-alvo="' + l.alvo.id + '">' +
            '  <div class="folha-alvo-topo">' +
            '    <b>' + escaparHtml(l.alvo.descricao) + '</b>' +
            '    <span class="folha-cont">' + escaparHtml(l.programa) + ' &middot; ' +
                 l.ct.total + ' tentativas &middot; ' + l.ct.pct + '% I</span>' +
            '  </div>' +
            '  <div class="fech-linha">' +
            '    <label class="fech-rotulo">Dominio</label>' +
            '    <select class="fech-nivel">' +
                 Array.from({length: 10}, (_, i) => i + 1).map(n =>
                   '<option value="' + n + '"' +
                   ((l.alvo.nivel_dominio || Math.max(1, Math.round(l.ct.pct / 10))) === n ? ' selected' : '') +
                   '>' + n + '</option>').join('') +
            '    </select><span class="fech-rotulo">/ 10</span>' +
            '    <label class="check" style="margin-left:auto">' +
            '      <input type="checkbox" class="promover" value="' + l.alvo.id + '"' +
                   (l.ct.pct >= 80 ? ' checked' : '') + '> Dominado</label>' +
            '  </div>' +
            '  <input class="fech-obs" placeholder="Observacao deste alvo na sessao (opcional)">' +
            '</div>').join('')
        : '<p class="sub">Nenhuma tentativa registrada nesta sessao.</p>') +
      '<div class="campo" style="margin-top:12px"><label>Evolucao diaria *</label>' +
      '<textarea id="fe-evolucao" rows="4" placeholder="Como foi a sessao, comportamento, observacoes..."></textarea></div>' +
      '<div class="mensagem-erro" id="fe-erro"></div>' +
      '<div class="barra-acoes">' +
      '  <button class="btn btn-fantasma" onclick="fecharModal()">Voltar a folha</button>' +
      '  <button class="btn btn-primario" id="fe-salvar" onclick="MODULOS.programas.encerrarSessao()">Concluir sessao</button>' +
      '</div>', true);
  },

  async encerrarSessao() {
    const erro = document.getElementById('fe-erro');
    const botao = document.getElementById('fe-salvar');
    erro.classList.remove('visivel');

    const texto = document.getElementById('fe-evolucao').value.trim();
    if (!texto) {
      erro.textContent = 'Escreva a evolucao diaria antes de concluir.';
      erro.classList.add('visivel');
      return;
    }

    botao.disabled = true;
    botao.textContent = 'Concluindo...';

    try {
      const f = this._folha;

      const promover = Array.from(document.querySelectorAll('.promover:checked'))
        .map(cb => cb.value);
      if (promover.length) {
        const { error: e1 } = await sb.from('alvos')
          .update({ status: 'dominado' }).in('id', promover);
        if (e1) throw new Error(e1.message);
      }

      // Retrato de cada alvo trabalhado nesta sessao (nivel 1-10 + observacao)
      const blocos = Array.from(document.querySelectorAll('.fech-alvo'));
      if (blocos.length) {
        const retratos = blocos.map(b => {
          const alvoId = b.dataset.alvo;
          const l = (this._fechamento || []).find(x => x.alvo.id === alvoId);
          return {
            sessao_id: f.sessao.id,
            alvo_id: alvoId,
            tentativas: l ? l.ct.total : 0,
            pct_independencia: l ? l.ct.pct : 0,
            nivel_dominio: parseInt(b.querySelector('.fech-nivel').value, 10),
            observacao: b.querySelector('.fech-obs').value.trim() || null,
            registrado_por: window.CORTEX_SESSAO.user.id
          };
        });
        const { error: eR } = await sb.from('alvo_sessao_registros')
          .upsert(retratos, { onConflict: 'sessao_id,alvo_id' });
        if (eR) throw new Error(eR.message);

        for (const r of retratos) {
          await sb.from('alvos')
            .update({ nivel_dominio: r.nivel_dominio }).eq('id', r.alvo_id);
        }
      }

      const { error: e2 } = await sb.from('evolucoes').insert({
        sessao_id: f.sessao.id,
        paciente_id: f.sessao.paciente_id,
        aplicador_id: window.CORTEX_SESSAO.user.id,
        texto: texto
      });
      if (e2) throw new Error(e2.message);

      const { error: e3 } = await sb.from('sessoes')
        .update({ status: 'concluida' }).eq('id', f.sessao.id);
      if (e3) throw new Error(e3.message);

      fecharModal();
      abrirModulo('agenda');
    } catch (e) {
      erro.textContent = e.message;
      erro.classList.add('visivel');
      botao.disabled = false;
      botao.textContent = 'Concluir sessao';
    }
  },

  // ══════════════════ EVOLUCOES (aba do prontuario) ══════════════════

  async htmlEvolucoes(pacienteId) {
    const { data: evs } = await sb.from('evolucoes')
      .select('id, texto, criado_em, sessao_id, aplicador:profiles!evolucoes_aplicador_id_fkey(nome), sessoes(data, hora_inicio)')
      .eq('paciente_id', pacienteId)
      .order('criado_em', { ascending: false })
      .limit(30);

    const lista = evs || [];
    if (lista.length === 0) {
      return '<div class="cartao"><div class="vazio"><div class="simbolo-vazio">&#128221;</div>' +
        '<strong>Nenhuma evolucao registrada</strong>' +
        'As evolucoes sao escritas pelo aplicador ao encerrar cada sessao.</div></div>';
    }

    // Percentual de independencia por sessao (para as barras de progresso)
    const ids = lista.map(e => e.sessao_id);
    const { data: regs } = await sb.from('registros_tentativas')
      .select('sessao_id, resposta').in('sessao_id', ids);
    const porSessao = {};
    (regs || []).forEach(r => {
      porSessao[r.sessao_id] = porSessao[r.sessao_id] || { t: 0, i: 0 };
      porSessao[r.sessao_id].t++;
      if (r.resposta === 'I') porSessao[r.sessao_id].i++;
    });

    const cron = lista.slice().reverse();
    const barras = cron.map(e => {
      const d = porSessao[e.sessao_id];
      const pct = d && d.t ? Math.round(d.i * 100 / d.t) : 0;
      const dia = e.sessoes ? new Date(e.sessoes.data + 'T12:00:00').toLocaleDateString('pt-BR').slice(0, 5) : '';
      return '<div class="prog-col" title="' + dia + ': ' + pct + '% I (' + (d ? d.t : 0) + ' tentativas)">' +
        '<div class="prog-barra" style="height:' + Math.max(pct, 4) + '%"></div>' +
        '<small>' + dia + '</small></div>';
    }).join('');

    return '<div class="cartao"><h3>Independencia por sessao</h3>' +
      '<p class="sub" style="margin-bottom:10px">% de respostas independentes (I) sobre o total de tentativas.</p>' +
      '<div class="prog-grafico">' + barras + '</div></div>' +
      '<div class="cartao"><h3>Evolucoes diarias</h3>' +
      lista.map(e => {
        const d = porSessao[e.sessao_id];
        const pct = d && d.t ? Math.round(d.i * 100 / d.t) : null;
        return '<div class="linha-doc" style="align-items:flex-start">' +
          '<div style="flex:1"><b>' +
          (e.sessoes ? new Date(e.sessoes.data + 'T12:00:00').toLocaleDateString('pt-BR') +
            ' as ' + e.sessoes.hora_inicio.slice(0, 5) : '') + '</b>' +
          '<small>' + escaparHtml(e.aplicador ? e.aplicador.nome : '-') +
          (pct !== null ? ' &middot; ' + pct + '% I em ' + d.t + ' tentativas' : '') + '</small>' +
          '<p style="margin-top:6px; font-size:12.5px; line-height:1.6; white-space:pre-wrap">' +
          escaparHtml(e.texto) + '</p></div>' +
          '</div>';
      }).join('') +
      '</div>';
  }
};
