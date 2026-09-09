// ============================================================================
// CORTEX aba - js/modulos/programas.js  (Sprint 17: Ficha de tentativas v2)
// - Biblioteca: cada programa define o NUMERO DE TENTATIVAS e QUAIS NIVEIS
//   DE AJUDA se aplicam (decisao da coordenacao).
// - Banco de Estimulos: cadastro unico da clinica (aplicador pode criar).
// - Ficha de aplicacao em grade numerada: cada tentativa = estimulo +
//   um nivel + reforcador digitado (banco de reforcadores so para sugestao).
// - Independencia = C (Correto) / total de tentativas do programa.
// - Cada sessao gera um retrato por programa (programa_sessao_registros).
// Legado: sessoes antigas usavam alvos e siglas I/G/Ve/Vi (convertidas
// para C/GE/VE/VI no banco) - relatorios antigos continuam legiveis.
// ============================================================================

window.MODULOS = window.MODULOS || {};

window.MODULOS.programas = {

  NIVEIS: [
    ['FT', 'Fisica total'],
    ['FP', 'Fisica parcial'],
    ['MO', 'Modelacao'],
    ['GE', 'Gestual'],
    ['VE', 'Verbal'],
    ['VI', 'Visual'],
    ['ER', 'Erro'],
    ['SR', 'Sem resposta'],
    ['NA', 'Nao aplicado'],
    ['FA', 'Falta'],
    ['C',  'Correto']
  ],
  NIVEIS_PADRAO: ['FT', 'FP', 'MO', 'GE', 'VE', 'VI', 'ER', 'SR', 'NA', 'FA', 'C'],

  AREAS: ['Mando', 'Tato', 'Ecoico', 'Imitacao', 'Ouvinte', 'Brincar',
          'Habilidades Sociais', 'AVD', 'Coordenacao Motora', 'Academico', 'Outros'],

  CORES_AREA: {
    'Mando': '#0EA5E9', 'Tato': '#8B5CF6', 'Ecoico': '#EC4899',
    'Imitacao': '#F59E0B', 'Ouvinte': '#10B981', 'Brincar': '#F97316',
    'Habilidades Sociais': '#6366F1', 'AVD': '#14B8A6',
    'Coordenacao Motora': '#84CC16', 'Academico': '#7C3AED', 'Outros': '#64748B'
  },

  el() { return document.getElementById('pagina'); },

  nomeNivel(sigla) {
    const n = this.NIVEIS.find(x => x[0] === sigla);
    return n ? n[1] : sigla;
  },

  legendaNiveis(siglas) {
    return '<div class="niv-legenda">' + (siglas || this.NIVEIS_PADRAO).map(s =>
      '<span class="niv-leg-item' + (s === 'C' ? ' correto' : '') + '">' +
      '<b>' + s + '</b> ' + this.nomeNivel(s) + '</span>').join('') + '</div>';
  },

  // ═══════════════════ MENU PROGRAMAS (Biblioteca | Estimulos) ═══════════════════

  async render(el) {
    this._subaba = this._subaba || 'biblioteca';
    el.innerHTML =
      '<div class="pagina-cabecalho">' +
      '  <div><h2 id="prog-titulo">Biblioteca de Programas</h2>' +
      '  <p class="sub" id="prog-sub">Programas de ensino da clinica.</p></div>' +
      '  <div id="prog-acao-topo"></div>' +
      '</div>' +
      '<div class="abas" style="margin-bottom:14px">' +
      '  <button class="aba" data-sub="biblioteca" onclick="MODULOS.programas.trocarSubaba(\'biblioteca\')">Biblioteca</button>' +
      '  <button class="aba" data-sub="estimulos" onclick="MODULOS.programas.trocarSubaba(\'estimulos\')">Estimulos</button>' +
      '</div>' +
      '<div id="prog-conteudo"><div class="cartao"><p class="sub">Carregando...</p></div></div>';
    this.trocarSubaba(this._subaba);
  },

  trocarSubaba(sub) {
    this._subaba = sub;
    document.querySelectorAll('.aba[data-sub]').forEach(b =>
      b.classList.toggle('ativa', b.dataset.sub === sub));
    if (sub === 'biblioteca') this.renderBiblioteca();
    else this.renderEstimulos();
  },

  // ─────────────── Biblioteca ───────────────

  async renderBiblioteca() {
    const podeE = perm('programas') === 'E';
    document.getElementById('prog-titulo').textContent = 'Biblioteca de Programas';
    document.getElementById('prog-sub').textContent =
      'A coordenacao define, por programa, o numero de tentativas e os niveis de ajuda usados.';
    document.getElementById('prog-acao-topo').innerHTML = podeE
      ? '<button class="btn btn-primario" onclick="MODULOS.programas.modalPrograma()">+ Novo programa</button>' : '';

    await this.carregarBiblioteca();
    const alvo = document.getElementById('prog-conteudo');
    if (!alvo) return;

    if (this.biblioteca.length === 0) {
      alvo.innerHTML = '<div class="cartao"><div class="vazio">' +
        '<div class="simbolo-vazio">&#128218;</div><strong>Biblioteca vazia</strong>' +
        'Crie o primeiro programa de ensino.</div></div>';
      return;
    }

    const porArea = {};
    this.biblioteca.forEach(p => { (porArea[p.area] = porArea[p.area] || []).push(p); });

    alvo.innerHTML = Object.entries(porArea).map(([area, lista]) => {
      const cor = this.CORES_AREA[area] || '#64748B';
      return '<div class="cartao"><h3><span class="area-chip" style="background:' + cor + '1A; color:' + cor + '">' +
        escaparHtml(area) + '</span> <span class="selo selo-neutro">' + lista.length + '</span></h3>' +
        lista.map(p =>
          '<div class="linha-doc"><div><b>' + escaparHtml(p.nome) + '</b>' +
          '<small>' + escaparHtml(p.objetivo || '') + '</small></div>' +
          '<div class="pac-selos">' +
          '<span class="selo selo-neutro">' + (p.tentativas_padrao || 10) + ' tentativas</span>' +
          (p.ativo ? '' : '<span class="selo selo-neutro">Inativo</span>') +
          (podeE
            ? '<button class="btn-chip" onclick="MODULOS.programas.modalPrograma(\'' + p.id + '\')">Editar</button>' : '') +
          '</div></div>').join('') +
        '</div>';
    }).join('');
  },

  async carregarBiblioteca() {
    const { data } = await sb.from('programas')
      .select('*').order('area').order('nome');
    this.biblioteca = data || [];
  },

  modalPrograma(id) {
    const p = id ? this.biblioteca.find(x => x.id === id) : null;
    const niveisAtuais = (p && p.niveis && p.niveis.length) ? p.niveis : this.NIVEIS_PADRAO;

    abrirModal(p ? 'Editar programa' : 'Novo programa',
      '<div class="grade-form">' +
      '  <div class="campo c2"><label>Nome *</label><input id="bp-nome" value="' + escaparHtml(p ? p.nome : '') + '"></div>' +
      '  <div class="campo"><label>Area *</label><select id="bp-area">' +
      this.AREAS.map(a => '<option' + (p && p.area === a ? ' selected' : '') + '>' + a + '</option>').join('') +
      '  </select></div>' +
      '  <div class="campo"><label>N&ordm; de tentativas *</label>' +
      '    <div class="stepper">' +
      '      <button type="button" onclick="MODULOS.programas.passoTentativas(-1)">&minus;</button>' +
      '      <input type="number" id="bp-tent" min="1" max="30" value="' + (p ? (p.tentativas_padrao || 10) : 10) + '">' +
      '      <button type="button" onclick="MODULOS.programas.passoTentativas(1)">+</button>' +
      '    </div>' +
      '    <small class="sub">Toda ficha de aplicacao deste programa tera exatamente este numero de tentativas.</small></div>' +
      '  <div class="campo c2"><label>Objetivo</label><textarea id="bp-objetivo" rows="2">' +
      escaparHtml(p ? p.objetivo || '' : '') + '</textarea></div>' +
      '  <div class="campo c3"><label>Procedimento</label><textarea id="bp-proc" rows="3">' +
      escaparHtml(p ? p.procedimento || '' : '') + '</textarea></div>' +
      '  <div class="campo c2"><label>Criterio de avanco</label><input id="bp-criterio" ' +
      'placeholder="Ex.: 80% de acertos em 3 sessoes consecutivas" value="' + escaparHtml(p ? p.criterio_avanco || '' : '') + '"></div>' +
      (p ? '<div class="campo"><label>Situacao</label><select id="bp-ativo">' +
        '<option value="true"' + (p.ativo ? ' selected' : '') + '>Ativo</option>' +
        '<option value="false"' + (!p.ativo ? ' selected' : '') + '>Inativo</option></select></div>' : '') +
      '</div>' +

      '<div class="campo" style="margin-top:12px"><label>Niveis de ajuda deste programa ' +
      '<small>(marque os que a aplicadora vera na ficha; C - Correto e sempre incluido)</small></label>' +
      '<div class="niv-escolha">' +
      this.NIVEIS.map(([v, r]) =>
        '<label class="niv-opcao' + (v === 'C' ? ' travado' : '') + '">' +
        '<input type="checkbox" class="bp-nivel" value="' + v + '"' +
        (niveisAtuais.includes(v) || v === 'C' ? ' checked' : '') +
        (v === 'C' ? ' disabled' : '') + '>' +
        '<b>' + v + '</b> ' + r + '</label>').join('') +
      '</div></div>' +

      '<div class="mensagem-erro" id="bp-erro"></div>' +
      '<div class="barra-acoes">' +
      '  <button class="btn btn-fantasma" onclick="fecharModal()">Cancelar</button>' +
      '  <button class="btn btn-primario" onclick="MODULOS.programas.salvarPrograma(' +
      (p ? '\'' + p.id + '\'' : 'null') + ')">Salvar</button>' +
      '</div>', true);
  },

  passoTentativas(delta) {
    const el = document.getElementById('bp-tent');
    el.value = Math.max(1, Math.min(30, (parseInt(el.value, 10) || 10) + delta));
  },

  async salvarPrograma(id) {
    const erro = document.getElementById('bp-erro');
    erro.classList.remove('visivel');

    const niveis = Array.from(document.querySelectorAll('.bp-nivel:checked')).map(cb => cb.value);
    if (!niveis.includes('C')) niveis.push('C');

    const dados = {
      nome: document.getElementById('bp-nome').value.trim(),
      area: document.getElementById('bp-area').value,
      tentativas_padrao: Math.max(1, Math.min(30, parseInt(document.getElementById('bp-tent').value, 10) || 10)),
      niveis: niveis,
      objetivo: document.getElementById('bp-objetivo').value.trim() || null,
      procedimento: document.getElementById('bp-proc').value.trim() || null,
      criterio_avanco: document.getElementById('bp-criterio').value.trim() || null
    };
    if (id) dados.ativo = document.getElementById('bp-ativo').value === 'true';
    if (!dados.nome) { erro.textContent = 'Informe o nome.'; erro.classList.add('visivel'); return; }
    if (niveis.length < 2) { erro.textContent = 'Marque ao menos um nivel de ajuda alem do C.'; erro.classList.add('visivel'); return; }

    const q = id
      ? sb.from('programas').update(dados).eq('id', id)
      : sb.from('programas').insert(dados);
    const { error } = await q;
    if (error) { erro.textContent = error.message; erro.classList.add('visivel'); return; }
    fecharModal();
    this.renderBiblioteca();
  },

  // ─────────────── Banco de Estimulos ───────────────

  async renderEstimulos() {
    document.getElementById('prog-titulo').textContent = 'Banco de Estimulos';
    document.getElementById('prog-sub').textContent =
      'Cadastro unico da clinica. Usado na aplicacao dos programas, sem redigitar a cada sessao.';
    const podeCriar = perm('evolucao') === 'E' || perm('programas') === 'E';
    document.getElementById('prog-acao-topo').innerHTML = podeCriar
      ? '<button class="btn btn-primario" onclick="MODULOS.programas.modalEstimulo()">+ Novo estimulo</button>' : '';

    await this.carregarEstimulos();
    const alvo = document.getElementById('prog-conteudo');
    if (!alvo) return;
    alvo.innerHTML =
      '<div class="cartao">' +
      '  <div style="display:flex; align-items:center; gap:10px; margin-bottom:12px">' +
      '    <input type="search" id="est-busca" placeholder="Buscar estimulo..." style="max-width:280px" ' +
      '      oninput="MODULOS.programas.desenharEstimulos()">' +
      '    <span class="selo selo-neutro" id="est-total"></span>' +
      '  </div>' +
      '  <div id="est-grade"></div>' +
      '</div>';
    this.desenharEstimulos();
  },

  async carregarEstimulos() {
    const { data } = await sb.from('estimulos')
      .select('*').order('categoria').order('nome');
    this.estimulos = data || [];
  },

  desenharEstimulos() {
    const alvo = document.getElementById('est-grade');
    if (!alvo) return;
    const busca = (document.getElementById('est-busca')?.value || '').toLowerCase();
    const podeCriar = perm('evolucao') === 'E' || perm('programas') === 'E';

    const lista = this.estimulos.filter(e =>
      !busca || e.nome.toLowerCase().includes(busca) || (e.categoria || '').toLowerCase().includes(busca));
    const totalEl = document.getElementById('est-total');
    if (totalEl) totalEl.textContent = lista.length;

    if (!lista.length) {
      alvo.innerHTML = '<p class="sub">Nenhum estimulo ' + (busca ? 'encontrado' : 'cadastrado ainda') + '.</p>';
      return;
    }

    const CORES = ['#0EA5E9', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#6366F1', '#14B8A6', '#F97316'];
    const corCat = {};
    let ci = 0;
    alvo.innerHTML = '<div class="est-grade">' + lista.map(e => {
      const cat = e.categoria || 'Outros';
      if (!(cat in corCat)) corCat[cat] = CORES[ci++ % CORES.length];
      const cor = corCat[cat];
      return '<div class="est-cartao' + (e.ativo ? '' : ' inativo') + '"' +
        (podeCriar ? ' onclick="MODULOS.programas.modalEstimulo(\'' + e.id + '\')"' : '') + '>' +
        '<span class="est-inicial" style="background:' + cor + '1A; color:' + cor + '">' +
        escaparHtml(e.nome[0].toUpperCase()) + '</span>' +
        '<div><b>' + escaparHtml(e.nome) + '</b><small>' + escaparHtml(cat) +
        (e.ativo ? '' : ' &middot; inativo') + '</small></div>' +
        '</div>';
    }).join('') + '</div>';
  },

  modalEstimulo(id) {
    const e = id ? this.estimulos.find(x => x.id === id) : null;
    const categorias = [...new Set(this.estimulos.map(x => x.categoria).filter(Boolean))];
    abrirModal(e ? 'Editar estimulo' : 'Novo estimulo',
      '<div class="grade-form">' +
      '  <div class="campo c2"><label>Nome *</label><input id="es-nome" value="' + escaparHtml(e ? e.nome : '') + '"></div>' +
      '  <div class="campo"><label>Categoria</label>' +
      '    <input id="es-cat" list="es-cats" placeholder="Ex.: Objetos, Cores..." value="' + escaparHtml(e ? e.categoria || '' : '') + '">' +
      '    <datalist id="es-cats">' + categorias.map(c => '<option value="' + escaparHtml(c) + '">').join('') + '</datalist>' +
      '  </div>' +
      (e ? '<div class="campo"><label>Situacao</label><select id="es-ativo">' +
        '<option value="true"' + (e.ativo ? ' selected' : '') + '>Ativo</option>' +
        '<option value="false"' + (!e.ativo ? ' selected' : '') + '>Inativo</option></select></div>' : '') +
      '</div>' +
      '<div class="mensagem-erro" id="es-erro"></div>' +
      '<div class="barra-acoes">' +
      '  <button class="btn btn-fantasma" onclick="fecharModal()">Cancelar</button>' +
      '  <button class="btn btn-primario" onclick="MODULOS.programas.salvarEstimulo(' +
      (e ? '\'' + e.id + '\'' : 'null') + ')">Salvar</button>' +
      '</div>');
  },

  async salvarEstimulo(id) {
    const erro = document.getElementById('es-erro');
    erro.classList.remove('visivel');
    const dados = {
      nome: document.getElementById('es-nome').value.trim(),
      categoria: document.getElementById('es-cat').value.trim() || null
    };
    if (id) dados.ativo = document.getElementById('es-ativo').value === 'true';
    else dados.criado_por = window.CORTEX_SESSAO.user.id;
    if (!dados.nome) { erro.textContent = 'Informe o nome.'; erro.classList.add('visivel'); return; }

    const q = id
      ? sb.from('estimulos').update(dados).eq('id', id)
      : sb.from('estimulos').insert(dados);
    const { error } = await q;
    if (error) { erro.textContent = error.message; erro.classList.add('visivel'); return; }
    fecharModal();
    this.renderEstimulos();
  },

  // ═══════════════════ ABA PROGRAMAS DO PRONTUARIO ═══════════════════

  async htmlProgramasPaciente(pacienteId) {
    const podeE = perm('programas') === 'E';
    this._pacProgPaciente = pacienteId;

    const { data } = await sb.from('paciente_programas')
      .select('id, status, programas(id, nome, area, objetivo, procedimento, tentativas_padrao, criterio_avanco)')
      .eq('paciente_id', pacienteId)
      .order('criado_em');
    this._progLista = data || [];
    const lista = this._progLista;

    // Ultimo retrato de cada programa (para a barra de progresso)
    this._ultimoPct = {};
    if (lista.length) {
      const { data: fotos } = await sb.from('programa_sessao_registros')
        .select('paciente_programa_id, pct_corretos, criado_em')
        .in('paciente_programa_id', lista.map(p => p.id))
        .order('criado_em');
      (fotos || []).forEach(f => { this._ultimoPct[f.paciente_programa_id] = f.pct_corretos; });
    }

    const nInt = lista.filter(p => p.status === 'em_intervencao').length;
    const nFila = lista.filter(p => p.status === 'na_fila').length;
    const nDom = lista.filter(p => p.status === 'dominado').length;

    let html = '<div class="aba-acoes">';
    if (perm('evolucao') === 'E') {
      html += '<button class="btn btn-primario" title="Abre a ficha de aplicacao por cima do prontuario. Usa a sessao de hoje ou cria uma avulsa; ao encerrar fica salva com data e detalhes." ' +
        'onclick="MODULOS.programas.abrirFolhaProntuario(\'' + pacienteId + '\')">&#9654; Iniciar atendimento</button>';
    }
    if (podeE) {
      html += '<button class="btn btn-fantasma" title="Escolha um programa da biblioteca para este paciente." ' +
        'onclick="MODULOS.programas.modalAtribuir(\'' + pacienteId + '\')">+ Adicionar programa</button>';
    }
    this._progFiltro = this._progFiltro || 'em_intervencao';
    const filtros = [['em_intervencao', 'Em intervencao', nInt], ['na_fila', 'Na fila', nFila], ['dominado', 'Dominados', nDom]];
    html += '<div class="filtro-chips">' + filtros.map(([v, r, n]) =>
      '<button class="fchip' + (this._progFiltro === v ? ' ativo' : '') + '" ' +
      'onclick="MODULOS.programas.filtrarProg(\'' + v + '\')">' + r +
      ' <span class="fchip-n">' + n + '</span></button>').join('') + '</div>';
    html += '</div>';

    html += '<div id="prog-grade">' + this.gradeProgramas() + '</div>';

    html += '<div class="cartao"><h3>Sessoes realizadas</h3>' +
      '<p class="sub" style="margin-bottom:8px">Toque numa sessao para ver o relatorio completo, com o grafico da sessao e a opcao de PDF.</p>' +
      '<div id="prog-atds"><p class="sub">Carregando...</p></div></div>';
    setTimeout(() => this.carregarAtendimentos(pacienteId), 0);

    return html;
  },

  filtrarProg(status) {
    this._progFiltro = status;
    document.querySelectorAll('.filtro-chips .fchip').forEach(b =>
      b.classList.toggle('ativo', b.textContent.trim().startsWith({
        em_intervencao: 'Em intervencao', na_fila: 'Na fila', dominado: 'Dominados'
      }[status])));
    const alvo = document.getElementById('prog-grade');
    if (alvo) alvo.innerHTML = this.gradeProgramas();
  },

  gradeProgramas() {
    const doGrupo = (this._progLista || []).filter(pp => pp.status === this._progFiltro);
    if (!doGrupo.length) {
      const vazio = {
        em_intervencao: 'Nenhum programa em intervencao. Adicione da biblioteca ou promova um da fila.',
        na_fila: 'Nenhum programa aguardando na fila.',
        dominado: 'Nenhum programa dominado ainda - eles chegam aqui conforme a crianca evolui.'
      }[this._progFiltro];
      return '<div class="cartao"><p class="sub">' + vazio + '</p></div>';
    }

    return '<div class="prog-grade">' + doGrupo.map(pp => {
      const cor = this.CORES_AREA[pp.programas.area] || '#64748B';
      const pct = this._ultimoPct[pp.id];
      return '<div class="prog-cartao clicavel" onclick="MODULOS.programas.modalProgramaPaciente(\'' + pp.id + '\')">' +
        '<div class="prog-cab">' +
        '  <span class="area-chip" style="background:' + cor + '1A; color:' + cor + '">' +
             escaparHtml(pp.programas.area) + '</span>' +
        '  <span class="selo selo-neutro">' + (pp.programas.tentativas_padrao || 10) + ' tentativas</span>' +
        '</div>' +
        '<b class="prog-nome">' + escaparHtml(pp.programas.nome) + '</b>' +
        '<div class="prog-progresso"><div class="prog-preench" style="width:' + (pct || 0) + '%; background:' + cor + '"></div></div>' +
        '<small class="prog-meta">' +
        (pct !== undefined ? 'Ultima sessao: ' + pct + '% de corretos' : 'Sem sessoes registradas ainda') +
        '</small>' +
        '</div>';
    }).join('') + '</div>';
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
      ativos.map(p => '<option value="' + p.id + '">' +
        escaparHtml(p.area + ' - ' + p.nome + ' (' + (p.tentativas_padrao || 10) + ' tentativas)') + '</option>').join('') +
      '</select></div>' +
      '<div class="campo"><label>Situacao inicial</label><select id="at-status">' +
      '<option value="em_intervencao">Em intervencao (entra na ficha)</option>' +
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
    const { error } = await sb.from('paciente_programas').insert({
      paciente_id: pacienteId,
      programa_id: document.getElementById('at-prog').value,
      status: document.getElementById('at-status').value,
      criado_por: window.CORTEX_SESSAO.user.id
    });
    if (error) { erro.textContent = error.message; erro.classList.add('visivel'); return; }
    fecharModal();
    this.recarregarAbaProgramas();
  },

  modalProgramaPaciente(ppId) {
    const pp = (this._progLista || []).find(x => x.id === ppId);
    if (!pp) return;
    this._ppAtual = pp;
    const p = pp.programas;
    const cor = this.CORES_AREA[p.area] || '#64748B';

    abrirModal(escaparHtml(p.nome),
      '<p><span class="area-chip" style="background:' + cor + '1A; color:' + cor + '">' + escaparHtml(p.area) + '</span> ' +
      '<span class="selo selo-neutro">' + (p.tentativas_padrao || 10) + ' tentativas por sessao</span></p>' +
      (p.objetivo ? '<div class="caixa-info larga" style="margin-top:10px"><small>Objetivo</small><b>' +
        escaparHtml(p.objetivo) + '</b></div>' : '') +
      (p.procedimento ? '<div class="caixa-info larga" style="margin-top:8px"><small>Procedimento</small><b>' +
        escaparHtml(p.procedimento) + '</b></div>' : '') +
      (p.criterio_avanco ? '<div class="caixa-info larga" style="margin-top:8px"><small>Criterio de avanco</small><b>' +
        escaparHtml(p.criterio_avanco) + '</b></div>' : '') +
      (perm('programas') === 'E'
        ? '<div class="campo" style="margin-top:12px"><label>Situacao do programa</label><select ' +
          'onchange="MODULOS.programas.mudarPrograma(this.value)">' +
          [['na_fila', 'Na fila'], ['em_intervencao', 'Em intervencao'], ['dominado', 'Dominado']]
            .map(([v, r]) => '<option value="' + v + '"' + (pp.status === v ? ' selected' : '') + '>' + r + '</option>').join('') +
          '</select></div>'
        : ''));
  },

  async mudarPrograma(status) {
    await sb.from('paciente_programas').update({ status: status }).eq('id', this._ppAtual.id);
    fecharModal();
    this.recarregarAbaProgramas();
  },

  recarregarAbaProgramas() {
    const alvo = document.getElementById('pac-aba-conteudo');
    if (alvo && this._pacProgPaciente) {
      this.htmlProgramasPaciente(this._pacProgPaciente).then(h => { alvo.innerHTML = h; });
    }
  },

  // ═══════════════════ FICHA DE APLICACAO (grade de tentativas) ═══════════════════

  elFolha() {
    return document.getElementById('folha-corpo') || this.el();
  },

  fecharFolha(recarregar) {
    document.getElementById('folha-overlay')?.remove();
    this._overlay = false;
    if (recarregar && this._pacProgPaciente && MODULOS.pacientes.paciente) {
      MODULOS.pacientes.abrirAba('programas');
    }
  },

  async abrirFolhaProntuario(pacienteId) {
    const hoje = new Date().toISOString().slice(0, 10);
    const { data: existente } = await sb.from('sessoes')
      .select('id, status')
      .eq('paciente_id', pacienteId).eq('data', hoje)
      .in('status', ['agendada', 'checkin', 'em_atendimento'])
      .order('hora_inicio').limit(1);

    let sessaoId = existente && existente[0] ? existente[0].id : null;
    if (!sessaoId) {
      const agora = new Date().toTimeString().slice(0, 5) + ':00';
      const { data: nova, error } = await sb.from('sessoes').insert({
        paciente_id: pacienteId,
        data: hoje,
        hora_inicio: agora,
        aplicador_id: window.CORTEX_SESSAO.user.id,
        status: 'em_atendimento'
      }).select('id').single();
      if (error) { alert('Nao foi possivel iniciar o atendimento: ' + error.message); return; }
      sessaoId = nova.id;
    }
    this.abrirFolha(sessaoId, true);
  },

  async abrirFolha(sessaoId, emJanela) {
    this._overlay = !!emJanela;
    if (this._overlay && !document.getElementById('folha-overlay')) {
      const ov = document.createElement('div');
      ov.id = 'folha-overlay';
      ov.className = 'folha-overlay';
      ov.innerHTML = '<div class="folha-pagina" id="folha-corpo"></div>';
      document.body.appendChild(ov);
    }
    this.elFolha().innerHTML = '<div class="cartao"><p class="sub">Preparando a ficha de aplicacao...</p></div>';

    const { data: s } = await sb.from('sessoes')
      .select('id, data, hora_inicio, status, paciente_id, pacientes(nome)')
      .eq('id', sessaoId).single();
    if (!s) { this._overlay ? this.fecharFolha(false) : abrirModulo('agenda'); return; }

    const [rPps, rRegs, rEst, rRef] = await Promise.all([
      sb.from('paciente_programas')
        .select('id, programas(id, nome, area, procedimento, tentativas_padrao, niveis, criterio_avanco)')
        .eq('paciente_id', s.paciente_id)
        .eq('status', 'em_intervencao'),
      sb.from('registros_tentativas')
        .select('id, paciente_programa_id, ordem, resposta, estimulo_id, reforcador')
        .eq('sessao_id', sessaoId),
      sb.from('estimulos').select('id, nome, categoria').eq('ativo', true).order('categoria').order('nome'),
      sb.from('reforcadores').select('nome').order('nome').limit(200)
    ]);

    const pps = rPps.data || [];
    const fichas = {};
    pps.forEach(pp => {
      const n = pp.programas.tentativas_padrao || 10;
      fichas[pp.id] = Array.from({ length: n }, () => ({ estimulo_id: '', resposta: '', reforcador: '' }));
    });
    (rRegs.data || []).forEach(r => {
      const g = fichas[r.paciente_programa_id];
      if (g && r.ordem >= 1 && r.ordem <= g.length) {
        g[r.ordem - 1] = { estimulo_id: r.estimulo_id || '', resposta: r.resposta || '', reforcador: r.reforcador || '' };
      }
    });

    this._folha = {
      sessao: s,
      programas: pps,
      fichas: fichas,
      estimulos: rEst.data || [],
      reforcadores: (rRef.data || []).map(x => x.nome)
    };
    this._sujo = false;
    this._folha.faixaComp = await MODULOS.comportamentos.faixaFolha(s.paciente_id, sessaoId);

    if (s.status === 'checkin' || s.status === 'agendada') {
      await sb.from('sessoes').update({ status: 'em_atendimento' }).eq('id', sessaoId);
    }

    this.desenharFolha();
  },

  opcoesEstimulo(selecionado) {
    const porCat = {};
    this._folha.estimulos.forEach(e => {
      (porCat[e.categoria || 'Outros'] = porCat[e.categoria || 'Outros'] || []).push(e);
    });
    let html = '<option value="">&mdash; sem estimulo &mdash;</option>';
    Object.entries(porCat).forEach(([cat, lista]) => {
      html += '<optgroup label="' + escaparHtml(cat) + '">' +
        lista.map(e => '<option value="' + e.id + '"' + (e.id === selecionado ? ' selected' : '') + '>' +
          escaparHtml(e.nome) + '</option>').join('') + '</optgroup>';
    });
    return html;
  },

  desenharFolha() {
    const f = this._folha;
    const s = f.sessao;

    let corpo = f.faixaComp || '';

    if (!f.programas.length) {
      corpo += '<div class="cartao"><div class="vazio">' +
        '<div class="simbolo-vazio">&#127919;</div>' +
        '<strong>Nenhum programa em intervencao</strong>' +
        'Adicione programas a este paciente na aba Programas do prontuario.' +
        '</div></div>';
    }

    f.programas.forEach(pp => {
      const p = pp.programas;
      const cor = this.CORES_AREA[p.area] || '#64748B';
      const niveis = (p.niveis && p.niveis.length) ? p.niveis : this.NIVEIS_PADRAO;
      const grade = f.fichas[pp.id];

      corpo += '<div class="cartao ficha-prog" id="ficha-' + pp.id + '">' +
        '<h3>' + escaparHtml(p.nome) + ' <span class="area-chip" style="background:' + cor + '1A; color:' + cor + '">' +
          escaparHtml(p.area) + '</span></h3>' +
        (p.procedimento ? '<p class="sub" style="margin:2px 0 10px">' + escaparHtml(p.procedimento) + '</p>' : '') +

        '<div class="ficha-rapido">' +
        '  <span class="fr-rotulo">Preencher rapido</span>' +
        '  <label>Nivel <select id="fr-niv-' + pp.id + '">' +
             niveis.map(v => '<option value="' + v + '">' + this.nomeNivel(v) + '</option>').join('') + '</select></label>' +
        '  <button class="btn-chip" onclick="MODULOS.programas.aplicarATodas(\'' + pp.id + '\', \'nivel\')">Aplicar a todas</button>' +
        '  <label>Estimulo <select id="fr-est-' + pp.id + '">' + this.opcoesEstimulo('') + '</select></label>' +
        '  <button class="btn-chip" onclick="MODULOS.programas.aplicarATodas(\'' + pp.id + '\', \'estimulo\')">Aplicar a todas</button>' +
        '  <button class="btn-chip" style="margin-left:auto" onclick="MODULOS.programas.limparFicha(\'' + pp.id + '\')">Limpar tudo</button>' +
        '</div>' +

        this.legendaNiveis(niveis) +

        '<div class="ficha-grade-cab"><span>#</span><span>Estimulo</span>' +
        '<span>Nivel de ajuda <small>&mdash; um por tentativa</small></span><span>Reforcador</span></div>' +
        grade.map((linha, i) =>
          '<div class="ficha-linha">' +
          '  <span class="ficha-num">' + String(i + 1).padStart(2, '0') + '</span>' +
          '  <select onchange="MODULOS.programas.mudarLinha(\'' + pp.id + '\', ' + i + ', \'estimulo_id\', this.value)">' +
               this.opcoesEstimulo(linha.estimulo_id) + '</select>' +
          '  <div class="ficha-niveis">' +
               niveis.map(v =>
                 '<button type="button" class="niv-btn' + (linha.resposta === v ? ' ativo' : '') +
                 (v === 'C' ? ' correto' : '') + '" ' +
                 'id="nb-' + pp.id + '-' + i + '-' + v + '" ' +
                 'title="' + this.nomeNivel(v) + '" ' +
                 'onclick="MODULOS.programas.marcarNivel(\'' + pp.id + '\', ' + i + ', \'' + v + '\')">' + v + '</button>').join('') +
          '  </div>' +
          '  <input placeholder="digitar..." list="lista-reforcadores" value="' + escaparHtml(linha.reforcador) + '" ' +
          '    onchange="MODULOS.programas.mudarLinha(\'' + pp.id + '\', ' + i + ', \'reforcador\', this.value)">' +
          '</div>').join('') +

        '<div class="ficha-rodape" id="rodape-' + pp.id + '">' + this.rodapePrograma(pp.id) + '</div>' +
        '</div>';
    });

    this.elFolha().innerHTML =
      '<div class="pagina-cabecalho">' +
      '  <div>' +
      (this._overlay
        ? '<button class="btn-voltar" onclick="MODULOS.programas.sairDaFolha()">&larr; Voltar ao prontuario</button>'
        : '<button class="btn-voltar" onclick="abrirModulo(\'agenda\')">&larr; Agenda</button>') +
      '    <h2>Ficha de aplicacao &middot; ' + escaparHtml(s.pacientes.nome) + '</h2>' +
      '    <p class="sub">' + new Date(s.data + 'T12:00:00').toLocaleDateString('pt-BR') +
      ' as ' + s.hora_inicio.slice(0, 5) +
      ' &middot; Cada linha e uma tentativa completa: estimulo + nivel de ajuda + reforcador.</p>' +
      '  </div>' +
      '  <div style="display:flex; gap:8px">' +
      '    <button class="btn btn-fantasma" id="btn-rascunho" onclick="MODULOS.programas.salvarFichas(true)">Salvar rascunho</button>' +
      '    <button class="btn btn-primario" onclick="MODULOS.programas.telaFechamento()">Encerrar sessao</button>' +
      '  </div>' +
      '</div>' +
      '<datalist id="lista-reforcadores">' +
      this._folha.reforcadores.map(r => '<option value="' + escaparHtml(r) + '">').join('') +
      '</datalist>' +
      corpo;
  },

  rodapePrograma(ppId) {
    const f = this._folha;
    const pp = f.programas.find(x => x.id === ppId);
    const grade = f.fichas[ppId];
    const n = grade.length;
    const preenchidas = grade.filter(l => l.resposta).length;
    const corretos = grade.filter(l => l.resposta === 'C').length;
    const pct = Math.round(corretos * 100 / n);
    return '<div class="fr-indep"><small>Independencia</small><b>' + pct + '%</b></div>' +
      '<div class="fr-meio"><span>' + corretos + '/' + n + ' corretos</span>' +
      '<div class="fr-trilho"><div class="fr-barra" style="width:' + pct + '%"></div></div>' +
      '<span>' + preenchidas + ' de ' + n + ' preenchidas</span></div>' +
      (pp.programas.criterio_avanco
        ? '<div class="fr-criterio"><small>Criterio de avanco</small><b>' +
          escaparHtml(pp.programas.criterio_avanco) + '</b></div>' : '');
  },

  atualizarRodape(ppId) {
    const el = document.getElementById('rodape-' + ppId);
    if (el) el.innerHTML = this.rodapePrograma(ppId);
  },

  mudarLinha(ppId, i, campo, valor) {
    this._folha.fichas[ppId][i][campo] = valor;
    this._sujo = true;
  },

  marcarNivel(ppId, i, sigla) {
    const linha = this._folha.fichas[ppId][i];
    const anterior = linha.resposta;
    linha.resposta = (anterior === sigla) ? '' : sigla;
    this._sujo = true;
    if (anterior) {
      document.getElementById('nb-' + ppId + '-' + i + '-' + anterior)?.classList.remove('ativo');
    }
    if (linha.resposta) {
      document.getElementById('nb-' + ppId + '-' + i + '-' + sigla)?.classList.add('ativo');
    }
    this.atualizarRodape(ppId);
  },

  aplicarATodas(ppId, tipo) {
    const grade = this._folha.fichas[ppId];
    if (tipo === 'nivel') {
      const v = document.getElementById('fr-niv-' + ppId).value;
      grade.forEach(l => { l.resposta = v; });
    } else {
      const v = document.getElementById('fr-est-' + ppId).value;
      grade.forEach(l => { l.estimulo_id = v; });
    }
    this._sujo = true;
    this.desenharFolha();
  },

  limparFicha(ppId) {
    if (!confirm('Limpar todas as tentativas deste programa nesta sessao?')) return;
    this._folha.fichas[ppId].forEach(l => { l.estimulo_id = ''; l.resposta = ''; l.reforcador = ''; });
    this._sujo = true;
    this.desenharFolha();
  },

  async salvarFichas(avisar) {
    const f = this._folha;
    try {
      for (const pp of f.programas) {
        const { error: eDel } = await sb.from('registros_tentativas').delete()
          .eq('sessao_id', f.sessao.id).eq('paciente_programa_id', pp.id);
        if (eDel) throw new Error(eDel.message);

        const linhas = f.fichas[pp.id]
          .map((l, i) => ({ l, ordem: i + 1 }))
          .filter(x => x.l.resposta)
          .map(x => ({
            sessao_id: f.sessao.id,
            paciente_programa_id: pp.id,
            ordem: x.ordem,
            resposta: x.l.resposta,
            estimulo_id: x.l.estimulo_id || null,
            reforcador: (x.l.reforcador || '').trim() || null,
            registrado_por: window.CORTEX_SESSAO.user.id
          }));
        if (linhas.length) {
          const { error } = await sb.from('registros_tentativas').insert(linhas);
          if (error) throw new Error(error.message);
        }
      }

      // Banco de reforcadores (fica salvo so para sugerir depois)
      const novos = new Set();
      Object.values(f.fichas).forEach(g => g.forEach(l => {
        const r = (l.reforcador || '').trim();
        if (r && !f.reforcadores.includes(r)) novos.add(r);
      }));
      if (novos.size) {
        await sb.from('reforcadores').upsert(
          [...novos].map(nome => ({ nome })), { onConflict: 'nome', ignoreDuplicates: true });
        f.reforcadores.push(...novos);
      }

      this._sujo = false;
      if (avisar) {
        const b = document.getElementById('btn-rascunho');
        if (b) { b.textContent = 'Salvo!'; setTimeout(() => { b.textContent = 'Salvar rascunho'; }, 1200); }
      }
      return true;
    } catch (e) {
      alert('Falha ao salvar a ficha: ' + e.message);
      return false;
    }
  },

  sairDaFolha() {
    if (this._sujo) {
      this.salvarFichas(false).then(() => this.fecharFolha(true));
    } else {
      this.fecharFolha(true);
    }
  },

  // ═══════════════════ FECHAMENTO ═══════════════════

  telaFechamento() {
    const f = this._folha;
    const linhas = f.programas.map(pp => {
      const grade = f.fichas[pp.id];
      const preenchidas = grade.filter(l => l.resposta).length;
      const corretos = grade.filter(l => l.resposta === 'C').length;
      const pct = Math.round(corretos * 100 / grade.length);
      return { pp, preenchidas, corretos, total: grade.length, pct };
    }).filter(l => l.preenchidas > 0);

    abrirModal('Encerrar sessao',
      (linhas.length
        ? '<p class="sub" style="margin-bottom:10px">Resumo por programa. Se algum atingiu o criterio de avanco, ' +
          'marque para promover a Dominado (decisao da coordenacao - nada vem pre-marcado).</p>' +
          linhas.map(l =>
            '<div class="linha-doc">' +
            '<div><b>' + escaparHtml(l.pp.programas.nome) + '</b>' +
            '<small>' + l.preenchidas + ' de ' + l.total + ' tentativas &middot; ' +
            l.corretos + ' corretos &middot; <b>' + l.pct + '% de independencia</b>' +
            (l.pp.programas.criterio_avanco ? ' &middot; criterio: ' + escaparHtml(l.pp.programas.criterio_avanco) : '') +
            '</small></div>' +
            '<label class="check"><input type="checkbox" class="promover" value="' + l.pp.id + '"> Dominado</label>' +
            '</div>').join('')
        : '<p class="sub">Nenhuma tentativa registrada nesta sessao.</p>') +
      '<div class="campo" style="margin-top:12px"><label>Evolucao diaria *</label>' +
      '<textarea id="fe-evolucao" rows="4" placeholder="Como foi a sessao, comportamento, atividades realizadas..."></textarea></div>' +
      '<div class="campo"><label>Destinacao da crianca</label>' +
      '<input id="fe-destinacao" placeholder="Ex.: entregue a mae as 09:50, orientada sobre a atividade de casa"></div>' +
      '<div class="mensagem-erro" id="fe-erro"></div>' +
      '<div class="barra-acoes">' +
      '  <button class="btn btn-fantasma" onclick="fecharModal()">Voltar a ficha</button>' +
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

      const okFichas = await this.salvarFichas(false);
      if (!okFichas) throw new Error('Nao foi possivel salvar a ficha.');

      // Retrato da sessao por programa
      for (const pp of f.programas) {
        const grade = f.fichas[pp.id];
        const preenchidas = grade.filter(l => l.resposta).length;
        if (!preenchidas) continue;
        const corretos = grade.filter(l => l.resposta === 'C').length;
        const { error: eR } = await sb.from('programa_sessao_registros').upsert({
          sessao_id: f.sessao.id,
          paciente_programa_id: pp.id,
          tentativas: preenchidas,
          corretos: corretos,
          pct_corretos: Math.round(corretos * 100 / grade.length)
        }, { onConflict: 'sessao_id,paciente_programa_id' });
        if (eR) throw new Error(eR.message);
      }

      const promover = Array.from(document.querySelectorAll('.promover:checked')).map(cb => cb.value);
      if (promover.length) {
        const { error: e1 } = await sb.from('paciente_programas')
          .update({ status: 'dominado' }).in('id', promover);
        if (e1) throw new Error(e1.message);
      }

      const { error: e2 } = await sb.from('evolucoes').insert({
        sessao_id: f.sessao.id,
        paciente_id: f.sessao.paciente_id,
        aplicador_id: window.CORTEX_SESSAO.user.id,
        texto: texto,
        destinacao: document.getElementById('fe-destinacao').value.trim() || null
      });
      if (e2) throw new Error(e2.message);

      const { error: e3 } = await sb.from('sessoes')
        .update({ status: 'concluida' }).eq('id', f.sessao.id);
      if (e3) throw new Error(e3.message);

      fecharModal();
      if (this._overlay) this.fecharFolha(true);
      else abrirModulo('agenda');
    } catch (e) {
      erro.textContent = e.message;
      erro.classList.add('visivel');
      botao.disabled = false;
      botao.textContent = 'Concluir sessao';
    }
  },

  // ═══════════════════ SESSOES REALIZADAS + RELATORIO ═══════════════════

  async carregarAtendimentos(pacienteId) {
    const alvo = document.getElementById('prog-atds');
    if (!alvo) return;

    const { data: ss } = await sb.from('sessoes')
      .select('id, data, hora_inicio, evolucoes(texto)')
      .eq('paciente_id', pacienteId).eq('status', 'concluida')
      .order('data', { ascending: false }).order('hora_inicio', { ascending: false })
      .limit(8);
    const lista = ss || [];
    if (!lista.length) {
      alvo.innerHTML = '<p class="sub">Nenhuma sessao registrada ainda.</p>';
      return;
    }

    const ids = lista.map(s => s.id);
    const [rNovo, rVelho] = await Promise.all([
      sb.from('programa_sessao_registros').select('sessao_id, pct_corretos').in('sessao_id', ids),
      sb.from('alvo_sessao_registros').select('sessao_id, pct_independencia').in('sessao_id', ids)
    ]);
    const temNovo = new Set((rNovo.data || []).map(r => r.sessao_id));
    const porSessao = {};
    (rNovo.data || []).forEach(r =>
      (porSessao[r.sessao_id] = porSessao[r.sessao_id] || []).push(r.pct_corretos || 0));
    (rVelho.data || []).forEach(r => {
      if (!temNovo.has(r.sessao_id))
        (porSessao[r.sessao_id] = porSessao[r.sessao_id] || []).push(r.pct_independencia || 0);
    });

    alvo.innerHTML = lista.map(s => {
      const pcts = porSessao[s.id] || [];
      const media = pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : null;
      const evo = (s.evolucoes && s.evolucoes[0] && s.evolucoes[0].texto) || '';
      return '<div class="atd-item clicavel" onclick="MODULOS.programas.abrirRelatorioSessao(\'' + s.id + '\')">' +
        '<div class="atd-meta"><b>' + s.data.split('-').reverse().join('/') + '</b> as ' +
        s.hora_inicio.slice(0, 5) +
        (pcts.length ? ' &middot; ' + pcts.length + ' programa(s)' : '') +
        (media !== null ? ' &middot; <span class="atd-pct">' + media + '% de corretos</span>' : '') +
        ' <span class="atd-abrir">Ver relatorio &rarr;</span></div>' +
        (evo ? '<p class="sub">' + escaparHtml(evo.length > 140 ? evo.slice(0, 140) + '...' : evo) + '</p>' : '') +
        '</div>';
    }).join('');
  },

  async abrirRelatorioSessao(sessaoId) {
    const ov = document.createElement('div');
    ov.id = 'rel-sessao-overlay';
    ov.className = 'folha-overlay';
    ov.innerHTML = '<div class="folha-pagina" id="rel-sessao-corpo"><p class="sub">Montando o relatorio...</p></div>';
    document.body.appendChild(ov);

    const [rS, rFotos, rTent, rEvo, rComp, rLegado] = await Promise.all([
      sb.from('sessoes')
        .select('id, data, hora_inicio, duracao_min, pacientes(nome), profissional:profiles!sessoes_aplicador_id_fkey(nome)')
        .eq('id', sessaoId).single(),
      sb.from('programa_sessao_registros')
        .select('paciente_programa_id, tentativas, corretos, pct_corretos, paciente_programas(programas(nome, area, tentativas_padrao))')
        .eq('sessao_id', sessaoId),
      sb.from('registros_tentativas')
        .select('paciente_programa_id, ordem, resposta, reforcador, estimulos(nome)')
        .eq('sessao_id', sessaoId).order('ordem'),
      sb.from('evolucoes').select('texto, aplicador:profiles!evolucoes_aplicador_id_fkey(nome)').eq('sessao_id', sessaoId),
      sb.from('comportamento_registros')
        .select('quantidade, duracao_seg, antecedente, descricao, consequencia, comportamentos(nome, medida)')
        .eq('sessao_id', sessaoId),
      sb.from('alvo_sessao_registros')
        .select('tentativas, pct_independencia, nivel_dominio, observacao, alvos(descricao)')
        .eq('sessao_id', sessaoId)
    ]);

    const s = rS.data;
    if (!s) { document.getElementById('rel-sessao-overlay')?.remove(); return; }
    const fotos = rFotos.data || [];
    const tents = rTent.data || [];
    const evo = (rEvo.data && rEvo.data[0]) || null;
    const comps = rComp.data || [];
    const legado = rLegado.data || [];
    const dataFmt = s.data.split('-').reverse().join('/');

    let grafico = '', detalhe = '';

    if (fotos.length) {
      grafico = '<div class="rel-bloco"><h4>Grafico da sessao <small>% de corretos (C) por programa</small></h4>' +
        '<div class="rel-grafico">' +
        fotos.map(fx => {
          const prog = fx.paciente_programas && fx.paciente_programas.programas;
          const cor = this.CORES_AREA[prog ? prog.area : ''] || '#64748B';
          const pct = fx.pct_corretos || 0;
          return '<div class="rel-col" title="' + escaparHtml(prog ? prog.nome : '') + ': ' + pct + '%">' +
            '<span class="rel-pct">' + pct + '%</span>' +
            '<div class="rel-trilho"><div class="rel-barra" style="height:' + pct + '%; background:' + cor + '"></div></div>' +
            '<span class="rel-rotulo">' + escaparHtml((prog ? prog.nome : '').slice(0, 16)) + '</span>' +
            '</div>';
        }).join('') + '</div></div>';

      const porPp = {};
      tents.forEach(t => (porPp[t.paciente_programa_id] = porPp[t.paciente_programa_id] || []).push(t));
      detalhe = '<div class="rel-bloco"><h4>Tentativa a tentativa</h4>' +
        this.legendaNiveis() +
        fotos.map(fx => {
          const prog = fx.paciente_programas && fx.paciente_programas.programas;
          const lista = porPp[fx.paciente_programa_id] || [];
          return '<div class="rel-alvo"><div class="rel-alvo-topo"><b>' + escaparHtml(prog ? prog.nome : '-') + '</b>' +
            '<span class="selo selo-neutro">' + fx.corretos + '/' +
            (prog ? (prog.tentativas_padrao || fx.tentativas) : fx.tentativas) + ' corretos &middot; ' +
            fx.pct_corretos + '%</span></div>' +
            '<div class="rel-tentativas">' +
            lista.map(t =>
              '<span class="rel-tent' + (t.resposta === 'C' ? ' correto' : '') + '" title="' + this.nomeNivel(t.resposta) +
              (t.reforcador ? ' - reforcador: ' + escaparHtml(t.reforcador) : '') + '">' +
              '<b>' + String(t.ordem || 0).padStart(2, '0') + '</b> ' +
              (t.estimulos ? escaparHtml(t.estimulos.nome) + ' ' : '') +
              '<i>' + t.resposta + '</i></span>').join('') +
            '</div></div>';
        }).join('') + '</div>';
    } else if (legado.length) {
      grafico = '<div class="rel-bloco"><h4>Grafico da sessao <small>% de independencia por alvo</small></h4>' +
        '<p class="sub">Sessao anterior ao modelo atual (registrada por alvos). Legenda de conversao: I&rarr;C, G&rarr;GE, Ve&rarr;VE, Vi&rarr;VI.</p>' +
        '<div class="rel-grafico">' +
        legado.map(fx =>
          '<div class="rel-col" title="' + escaparHtml(fx.alvos ? fx.alvos.descricao : '') + ': ' + (fx.pct_independencia || 0) + '%">' +
          '<span class="rel-pct">' + (fx.pct_independencia || 0) + '%</span>' +
          '<div class="rel-trilho"><div class="rel-barra" style="height:' + (fx.pct_independencia || 0) + '%; background:#7C3AED"></div></div>' +
          '<span class="rel-rotulo">' + escaparHtml((fx.alvos ? fx.alvos.descricao : '').slice(0, 16)) + '</span>' +
          '</div>').join('') + '</div></div>';
    }

    let compHtml = '';
    if (comps.length) {
      compHtml = '<div class="rel-bloco"><h4>Comportamentos registrados</h4>' +
        comps.map(r => {
          const nome = r.comportamentos ? r.comportamentos.nome : '-';
          const medida = r.comportamentos && r.comportamentos.medida === 'duracao'
            ? Math.round((r.duracao_seg || 0) / 60) + ' min' : (r.quantidade || 0) + 'x';
          return '<div class="rel-alvo"><div class="rel-alvo-topo"><b>' + escaparHtml(nome) + '</b>' +
            '<span class="selo selo-st-vermelho">' + medida + '</span></div>' +
            ((r.antecedente || r.descricao || r.consequencia)
              ? '<small>' + ['A: ' + (r.antecedente || '-'), 'B: ' + (r.descricao || '-'), 'C: ' + (r.consequencia || '-')]
                  .map(escaparHtml).join(' &middot; ') + '</small>'
              : '') + '</div>';
        }).join('') + '</div>';
    }

    document.getElementById('rel-sessao-corpo').innerHTML =
      '<div class="pagina-cabecalho nao-imprime">' +
      '  <div><button class="btn-voltar" onclick="document.getElementById(\'rel-sessao-overlay\').remove()">&larr; Fechar</button>' +
      '  <h2>Relatorio da sessao</h2></div>' +
      '  <div style="display:flex; gap:8px">' +
      '  <button class="btn btn-fantasma" title="Documento oficial da sessao com a identidade da clinica, pronto para PDF." ' +
      'onclick="MODULOS.programas.docEvolucaoDiaria(\'' + sessaoId + '\')">&#128196; Evolucao Diaria</button>' +
      '  <button class="btn btn-primario" onclick="window.print()">&#128424; Imprimir / PDF</button>' +
      '  </div></div>' +
      '<div class="rel-imprimivel" id="rel-imprimivel">' +
      '  <div class="rel-cab-imp">' +
      '    <h2>Relatorio de sessao &middot; CORTEX aba</h2>' +
      '    <p><b>' + escaparHtml(s.pacientes.nome) + '</b> &middot; ' + dataFmt + ' as ' + s.hora_inicio.slice(0, 5) +
      '    &middot; ' + s.duracao_min + ' min &middot; Profissional: ' +
           escaparHtml(s.profissional ? s.profissional.nome : '-') + '</p>' +
      '  </div>' +
      grafico + detalhe + compHtml +
      (evo ? '<div class="rel-bloco"><h4>Evolucao</h4><p class="rel-evo">' + escaparHtml(evo.texto) + '</p>' +
             (evo.aplicador ? '<small class="sub">Registrado por ' + escaparHtml(evo.aplicador.nome) + '</small>' : '') + '</div>'
           : '<div class="rel-bloco"><p class="sub">Sessao sem evolucao registrada.</p></div>') +
      '</div>';
  },

  // ═══════════════════ EVOLUCOES (aba do prontuario) ═══════════════════

  async htmlEvolucoes(pacienteId) {
    const { data: evs } = await sb.from('evolucoes')
      .select('id, texto, criado_em, sessao_id, aplicador:profiles!evolucoes_aplicador_id_fkey(nome), sessoes(data, hora_inicio)')
      .eq('paciente_id', pacienteId)
      .order('criado_em', { ascending: false })
      .limit(30);

    const lista = evs || [];
    if (lista.length === 0) {
      return (perm('evolucao') === 'E'
        ? '<div class="aba-acoes"><button class="btn btn-primario" ' +
          'onclick="MODULOS.programas.modalLancarEvolucao(\'' + pacienteId + '\')">+ Lancar evolucao</button></div>' : '') +
        '<div class="cartao"><div class="vazio"><div class="simbolo-vazio">&#128221;</div>' +
        '<strong>Nenhuma evolucao registrada</strong>' +
        'As evolucoes sao escritas ao encerrar a sessao, ou lancadas depois pelo botao acima.</div></div>';
    }

    const ids = lista.map(e => e.sessao_id);
    const { data: regs } = await sb.from('registros_tentativas')
      .select('sessao_id, resposta').in('sessao_id', ids);
    const porSessao = {};
    (regs || []).forEach(r => {
      porSessao[r.sessao_id] = porSessao[r.sessao_id] || { t: 0, c: 0 };
      porSessao[r.sessao_id].t++;
      if (r.resposta === 'C') porSessao[r.sessao_id].c++;
    });

    const cron = lista.slice().reverse();
    const barras = cron.map(e => {
      const d = porSessao[e.sessao_id];
      const pct = d && d.t ? Math.round(d.c * 100 / d.t) : 0;
      const dia = e.sessoes ? new Date(e.sessoes.data + 'T12:00:00').toLocaleDateString('pt-BR').slice(0, 5) : '';
      return '<div class="prog-col" title="' + dia + ': ' + pct + '% de corretos (' + (d ? d.t : 0) + ' tentativas)">' +
        '<div class="prog-barra" style="height:' + Math.max(pct, 4) + '%"></div>' +
        '<small>' + dia + '</small></div>';
    }).join('');

    const barraAcoes = perm('evolucao') === 'E'
      ? '<div class="aba-acoes"><button class="btn btn-primario" ' +
        'title="Lancamento retroativo: escolha a data, a sessao daquele dia, e escreva a evolucao dela." ' +
        'onclick="MODULOS.programas.modalLancarEvolucao(\'' + pacienteId + '\')">+ Lancar evolucao</button></div>'
      : '';

    return barraAcoes + '<div class="cartao"><h3>Corretos por sessao</h3>' +
      '<p class="sub" style="margin-bottom:10px">% de respostas corretas (C) sobre as tentativas registradas. ' +
      '<b>Legenda de dados antigos:</b> registros anteriores usavam I/G/Ve/Vi - convertidos para C/GE/VE/VI.</p>' +
      '<div class="prog-grafico">' + barras + '</div></div>' +
      '<div class="cartao"><h3>Evolucoes diarias</h3>' +
      lista.map(e => {
        const d = porSessao[e.sessao_id];
        const pct = d && d.t ? Math.round(d.c * 100 / d.t) : null;
        return '<div class="linha-doc" style="align-items:flex-start">' +
          '<div style="flex:1"><b>' +
          (e.sessoes ? new Date(e.sessoes.data + 'T12:00:00').toLocaleDateString('pt-BR') +
            ' as ' + e.sessoes.hora_inicio.slice(0, 5) : '') + '</b>' +
          '<small>' + escaparHtml(e.aplicador ? e.aplicador.nome : '-') +
          (pct !== null ? ' &middot; ' + pct + '% de corretos em ' + d.t + ' tentativas' : '') + '</small>' +
          '<p style="margin-top:6px; font-size:12.5px; line-height:1.6; white-space:pre-wrap">' +
          escaparHtml(e.texto) + '</p></div>' +
          '</div>';
      }).join('') +
      '</div>';
  },

  // Contador da faixa de comportamentos (chamado pelo modulo comportamentos)
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

  // Ordem canonica: da ajuda maxima (esquerda) a independencia (direita)
  ORDEM_GRAFICO: ['FA', 'NA', 'SR', 'ER', 'FT', 'FP', 'MO', 'GE', 'VE', 'VI', 'C'],

  corNivel(s) {
    if (s === 'C') return '#15803D';
    if (s === 'ER' || s === 'SR') return '#E9586A';
    if (s === 'NA' || s === 'FA') return '#94A3B8';
    return '#D97706';
  },

  graficoTentativas(niveisPrograma, tentativas) {
    const niveis = this.ORDEM_GRAFICO.filter(n => (niveisPrograma || this.NIVEIS_PADRAO).includes(n));
    if (!niveis.length || !tentativas.length) return '';

    const ESQ = 150, DIR = 46, TOPO = 30, LINHA = 24;
    const larguraEixo = 420;
    const passo = larguraEixo / Math.max(1, niveis.length - 1);
    const largura = ESQ + larguraEixo + DIR;
    const altura = TOPO + tentativas.length * LINHA + 8;
    const x = s => ESQ + niveis.indexOf(s) * passo;
    const y = i => TOPO + i * LINHA + LINHA / 2;

    let svg = '<svg viewBox="0 0 ' + largura + ' ' + altura + '" xmlns="http://www.w3.org/2000/svg" ' +
      'style="width:100%; height:auto; font-family:inherit">';

    // Faixa da independencia (coluna C) e grades verticais
    const iC = niveis.indexOf('C');
    if (iC > 0) {
      svg += '<rect x="' + (x('C') - passo / 2) + '" y="' + (TOPO - 4) + '" width="' + (passo / 2 + 14) +
        '" height="' + (tentativas.length * LINHA + 10) + '" fill="#ECFDF5" rx="8"/>';
    }
    niveis.forEach(n => {
      svg += '<line x1="' + x(n) + '" y1="' + (TOPO - 2) + '" x2="' + x(n) + '" y2="' +
        (TOPO + tentativas.length * LINHA + 4) + '" stroke="#DFE6EC" stroke-width="1" stroke-dasharray="3 4"/>' +
        '<text x="' + x(n) + '" y="' + (TOPO - 10) + '" text-anchor="middle" font-size="10.5" font-weight="800" ' +
        'fill="' + this.corNivel(n) + '">' + n + '</text>';
    });

    // Linha azul ligando as tentativas + bolinhas
    const pontos = tentativas.filter(t => niveis.includes(t.resposta));
    if (pontos.length > 1) {
      svg += '<polyline fill="none" stroke="#1468B2" stroke-width="2.5" stroke-linejoin="round" points="' +
        pontos.map(t => x(t.resposta) + ',' + y(tentativas.indexOf(t))).join(' ') + '"/>';
    }
    tentativas.forEach((t, i) => {
      const rot = String(t.ordem || i + 1).padStart(2, '0');
      const est = t.estimulos ? t.estimulos.nome : '';
      svg += '<text x="10" y="' + (y(i) + 3.5) + '" font-size="10.5" font-weight="800" fill="#64748B">' + rot + '</text>' +
        '<text x="34" y="' + (y(i) + 3.5) + '" font-size="10" fill="#23303C">' +
        escaparHtml(est.length > 16 ? est.slice(0, 15) + '\u2026' : est) + '</text>';
      if (niveis.includes(t.resposta)) {
        svg += '<circle cx="' + x(t.resposta) + '" cy="' + y(i) + '" r="7" fill="#fff" ' +
          'stroke="' + this.corNivel(t.resposta) + '" stroke-width="3"/>' +
          '<text x="' + (largura - DIR + 12) + '" y="' + (y(i) + 3.5) + '" font-size="10.5" font-weight="800" ' +
          'fill="' + this.corNivel(t.resposta) + '">' + t.resposta + '</text>';
      }
    });
    svg += '</svg>';
    return svg;
  },

  // ─────────── DOCUMENTO OFICIAL: Evolucao Diaria (identidade Equilibrium) ───────────

  async docEvolucaoDiaria(sessaoId) {
    document.getElementById('rel-sessao-overlay')?.remove();
    const ov = document.createElement('div');
    ov.id = 'doc-eq-overlay';
    ov.className = 'folha-overlay';
    ov.innerHTML = '<div class="folha-pagina" id="doc-eq-corpo" style="max-width:900px">' +
      '<p class="sub">Montando o documento...</p></div>';
    document.body.appendChild(ov);

    const [rS, rFotos, rEvo, rComp, rTent] = await Promise.all([
      sb.from('sessoes')
        .select('id, data, hora_inicio, duracao_min, paciente_id, pacientes(nome, data_nascimento, nivel), ' +
                'profissional:profiles!sessoes_aplicador_id_fkey(nome)')
        .eq('id', sessaoId).single(),
      sb.from('programa_sessao_registros')
        .select('paciente_programa_id, corretos, tentativas, pct_corretos, paciente_programas(programas(nome, area, tentativas_padrao, niveis))')
        .eq('sessao_id', sessaoId),
      sb.from('evolucoes').select('texto, destinacao, aplicador:profiles!evolucoes_aplicador_id_fkey(nome)')
        .eq('sessao_id', sessaoId),
      sb.from('comportamento_registros')
        .select('quantidade, duracao_seg, antecedente, descricao, consequencia, comportamentos(nome, medida)')
        .eq('sessao_id', sessaoId),
      sb.from('registros_tentativas')
        .select('paciente_programa_id, ordem, resposta, estimulos(nome)')
        .eq('sessao_id', sessaoId).order('ordem')
    ]);
    const s = rS.data;
    if (!s) { ov.remove(); return; }
    const fotos = rFotos.data || [];
    const evo = (rEvo.data && rEvo.data[0]) || {};
    const comps = rComp.data || [];
    const tentPorPp = {};
    (rTent.data || []).forEach(t =>
      (tentPorPp[t.paciente_programa_id] = tentPorPp[t.paciente_programa_id] || []).push(t));

    // Avaliacoes concluidas na data da sessao (SS ganha mini-quadro por area)
    const { data: avsDia } = await sb.from('avaliacoes')
      .select('id, protocolo, concluido_em')
      .eq('paciente_id', s.paciente_id).eq('status', 'concluida');
    const doDia = (avsDia || []).filter(a =>
      a.concluido_em && a.concluido_em.slice(0, 10) === s.data);
    let avalHtml = '';
    for (const av of doDia) {
      if (av.protocolo === 'ss') {
        await MODULOS.avaliacoes.carregarItensSS();
        const { data: resps } = await sb.from('ss_respostas')
          .select('item_id, pontos').eq('avaliacao_id', av.id);
        const mapa = {};
        (resps || []).forEach(r => { mapa[r.item_id] = r.pontos; });
        avalHtml += '<div style="margin-bottom:6px"><b style="font-size:12px">Socially Savvy concluido nesta data</b>' +
          MODULOS.avaliacoes.SS_AREAS.map(area => {
            const itens = MODULOS.avaliacoes.itensSS.filter(i => i.area === area);
            const r = itens.reduce((sm, i) => sm + (mapa[i.id] || 0), 0);
            const pct = itens.length ? Math.round(r * 100 / (itens.length * 3)) : 0;
            return '<div style="display:flex; align-items:center; gap:8px; font-size:11px; margin-top:3px">' +
              '<span style="width:210px">' + area + '</span>' +
              '<span style="flex:1; height:7px; background:#E5EDF4; border-radius:5px; overflow:hidden">' +
              '<i style="display:block; height:100%; width:' + pct + '%; background:var(--eq-azul); border-radius:5px"></i></span>' +
              '<b style="width:36px; text-align:right; color:var(--eq-azul)">' + pct + '%</b></div>';
          }).join('') + '</div>';
      } else {
        avalHtml += '<div style="font-size:12px"><b>QADI-R concluido nesta data</b> ' +
          '<span style="color:var(--eq-cinza)">&middot; resultado completo na aba Avaliacao do prontuario</span></div>';
      }
    }
    const fmt = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '&mdash;';

    const graficos = fotos.map(fx => {
      const prog = fx.paciente_programas && fx.paciente_programas.programas;
      const lista = tentPorPp[fx.paciente_programa_id] || [];
      if (!lista.length) return '';
      return '<div style="margin-top:10px; border:1px solid var(--eq-linha); border-radius:12px; padding:10px 8px 4px">' +
        '<div style="font-size:11px; font-weight:800; color:var(--eq-azul-escuro); margin:0 0 2px 10px">' +
        escaparHtml(prog ? prog.nome : '') + ' &middot; tentativa a tentativa (nivel de ajuda)</div>' +
        this.graficoTentativas(prog ? prog.niveis : null, lista) +
        '</div>';
    }).join('');

    const legendaGraf = fotos.length
      ? '<div style="display:flex; gap:14px; flex-wrap:wrap; font-size:10px; font-weight:700; ' +
        'color:var(--eq-cinza); margin-top:8px; padding-left:4px">' +
        '<span><i style="display:inline-block; width:9px; height:9px; border-radius:50%; border:2.5px solid #15803D; margin-right:4px"></i>Correto (independente)</span>' +
        '<span><i style="display:inline-block; width:9px; height:9px; border-radius:50%; border:2.5px solid #D97706; margin-right:4px"></i>Com ajuda (FT&rarr;VI)</span>' +
        '<span><i style="display:inline-block; width:9px; height:9px; border-radius:50%; border:2.5px solid #E9586A; margin-right:4px"></i>Erro / sem resposta</span>' +
        '<span><i style="display:inline-block; width:9px; height:9px; border-radius:50%; border:2.5px solid #94A3B8; margin-right:4px"></i>Nao aplicado / falta</span>' +
        '</div>'
      : '';

    const progHtml = fotos.length
      ? '<table style="width:100%; border-collapse:separate; border-spacing:0 6px; margin:-2px 0">' +
        fotos.map(fx => {
          const prog = fx.paciente_programas && fx.paciente_programas.programas;
          const total = prog ? (prog.tentativas_padrao || fx.tentativas) : fx.tentativas;
          return '<tr>' +
            '<td style="padding:7px 11px; background:var(--eq-fundo); border-radius:9px 0 0 9px; font-weight:700; font-size:12px">' +
            escaparHtml(prog ? prog.nome : '-') +
            ' <span style="color:var(--eq-cinza); font-weight:600">&middot; ' + escaparHtml(prog ? prog.area : '') + '</span></td>' +
            '<td style="padding:7px 11px; background:var(--eq-fundo); border-radius:0 9px 9px 0; text-align:right; white-space:nowrap; font-size:12px">' +
            '<b style="color:var(--eq-azul)">' + fx.pct_corretos + '%</b> de corretos (' + fx.corretos + '/' + total + ')' +
            '<span style="display:inline-block; vertical-align:middle; width:110px; height:7px; margin-left:8px; ' +
            'background:#E5EDF4; border-radius:5px; overflow:hidden"><i style="display:block; height:100%; width:' +
            fx.pct_corretos + '%; background:var(--eq-azul); border-radius:5px"></i></span></td></tr>';
        }).join('') + '</table>' + graficos + legendaGraf
      : '<span style="color:var(--eq-cinza)">Sem programas registrados nesta sessao.</span>';

    const compHtml = comps.length
      ? comps.map(r => {
          const nome = r.comportamentos ? r.comportamentos.nome : '-';
          const medida = r.comportamentos && r.comportamentos.medida === 'duracao'
            ? Math.round((r.duracao_seg || 0) / 60) + ' min' : (r.quantidade || 0) + 'x';
          const abc = [r.antecedente ? 'A: ' + r.antecedente : '', r.descricao ? 'B: ' + r.descricao : '',
                       r.consequencia ? 'C: ' + r.consequencia : ''].filter(Boolean).map(escaparHtml).join(' &middot; ');
          return '<div style="display:flex; gap:8px; align-items:baseline; margin-bottom:4px">' +
            '<span style="background:#FDEEF0; color:var(--eq-rosa); font-size:10.5px; font-weight:800; ' +
            'border-radius:999px; padding:2px 9px; white-space:nowrap">' + escaparHtml(nome) + ' &middot; ' + medida + '</span>' +
            (abc ? '<span style="font-size:12px">' + abc + '</span>' : '') + '</div>';
        }).join('')
      : '<span style="color:var(--eq-cinza)">Nenhum comportamento interferente registrado.</span>';

    document.getElementById('doc-eq-corpo').innerHTML =
      '<div class="pagina-cabecalho nao-imprime">' +
      '  <div><button class="btn-voltar" onclick="document.getElementById(\'doc-eq-overlay\').remove(); ' +
      'MODULOS.programas.abrirRelatorioSessao(\'' + sessaoId + '\')">&larr; Relatorio da sessao</button>' +
      '  <h2>Evolucao diaria &middot; documento oficial</h2></div>' +
      '  <button class="btn btn-primario" onclick="window.print()">&#128424; Imprimir / PDF</button>' +
      '</div>' +

      '<div class="doc-eq">' +
      '<div class="deq-cab">' +
      '  <img src="icones/equilibrium.png" alt="Equilibrium">' +
      '  <div class="deq-cab-t"><h1>Evolu&ccedil;&atilde;o Di&aacute;ria</h1>' +
      '  <p>Equilibrium Terapia Infantil &middot; Psicoterapia ABA</p></div>' +
      '  <span class="deq-pilula">SESS&Atilde;O ' + s.data.split('-').reverse().join('/') + '</span>' +
      '</div>' +

      '<div class="deq-caixa deq-dados" style="grid-template-columns:2fr 1fr 1fr 1.4fr; margin-top:4px">' +
      '  <div style="border-bottom:none"><small>Paciente</small><b>' + escaparHtml(s.pacientes.nome) + '</b></div>' +
      '  <div style="border-bottom:none"><small>Idade</small><b>' + calcularIdade(s.pacientes.data_nascimento) + '</b></div>' +
      '  <div style="border-bottom:none"><small>Hor&aacute;rio</small><b>' + s.hora_inicio.slice(0, 5) +
           ' &middot; ' + s.duracao_min + ' min</b></div>' +
      '  <div style="border-bottom:none"><small>Aplicador(a)</small><b>' +
           escaparHtml(s.profissional ? s.profissional.nome : '&mdash;') + '</b></div>' +
      '</div>' +

      '<h2><span class="ponto deq-teal"></span>Programas trabalhados</h2>' +
      '<div class="deq-caixa deq-texto" style="min-height:0">' + progHtml + '</div>' +

      (avalHtml
        ? '<h2><span class="ponto deq-teal"></span>Avalia&ccedil;&otilde;es do dia</h2>' +
          '<div class="deq-caixa deq-texto" style="min-height:0">' + avalHtml + '</div>'
        : '') +
      '<h2><span class="ponto deq-amarelo"></span>Sess&atilde;o, evolu&ccedil;&atilde;o e atividades realizadas</h2>' +
      '<div class="deq-caixa deq-texto">' + escaparHtml(evo.texto || '') + '</div>' +

      '<h2><span class="ponto deq-rosa"></span>Comportamentos interferentes</h2>' +
      '<div class="deq-caixa deq-texto" style="min-height:0">' + compHtml + '</div>' +

      '<h2><span class="ponto"></span>Destina&ccedil;&atilde;o da crian&ccedil;a</h2>' +
      '<div class="deq-caixa deq-texto" style="min-height:34px">' + escaparHtml(evo.destinacao || '') + '</div>' +

      '<div class="deq-assinatura">' +
      escaparHtml((evo.aplicador && evo.aplicador.nome) || (s.profissional && s.profissional.nome) || '') +
      '<br>Profissional / N&ordm; do Registro de Classe</div>' +

      '<div class="deq-rodape">' +
      '  <span>Equilibrium Terapia Infantil &middot; Uberl&acirc;ndia/MG</span>' +
      '  <span class="pontos"><i style="background:var(--eq-teal)"></i><i style="background:var(--eq-amarelo)"></i>' +
      '<i style="background:var(--eq-rosa)"></i><i style="background:var(--eq-azul)"></i></span>' +
      '  <span>Documento gerado pelo CORTEX aba &middot; ' + new Date().toLocaleDateString('pt-BR') + '</span>' +
      '</div>' +
      '</div>';
  },

  // ─────────── LANCAMENTO RETROATIVO DE EVOLUCAO ───────────

  modalLancarEvolucao(pacienteId) {
    this._retroPac = pacienteId;
    abrirModal('Lancar evolucao',
      '<p class="sub" style="margin-bottom:10px">Primeiro a data: o sistema mostra as sessoes daquele dia ' +
      'para voce escolher qual recebe a evolucao (as meninas lancam retroativo, entao a data manda).</p>' +
      '<div class="grade-form">' +
      '  <div class="campo"><label>Data da sessao *</label>' +
      '    <input type="date" id="re-data" value="' + new Date().toISOString().slice(0, 10) + '" ' +
      '      max="' + new Date().toISOString().slice(0, 10) + '" ' +
      '      onchange="MODULOS.programas.buscarSessoesDoDia()"></div>' +
      '</div>' +
      '<div id="re-lista"><p class="sub">Escolha a data.</p></div>' +
      '<div id="re-form"></div>' +
      '<div class="mensagem-erro" id="re-erro"></div>', true);
    this.buscarSessoesDoDia();
  },

  async buscarSessoesDoDia() {
    const data = document.getElementById('re-data').value;
    const alvo = document.getElementById('re-lista');
    document.getElementById('re-form').innerHTML = '';
    if (!data) { alvo.innerHTML = ''; return; }
    alvo.innerHTML = '<p class="sub">Buscando...</p>';

    const [rS, rE] = await Promise.all([
      sb.from('sessoes')
        .select('id, hora_inicio, status, profissional:profiles!sessoes_aplicador_id_fkey(nome)')
        .eq('paciente_id', this._retroPac).eq('data', data).order('hora_inicio'),
      sb.from('evolucoes').select('sessao_id').eq('paciente_id', this._retroPac)
    ]);
    const comEvo = new Set((rE.data || []).map(e => e.sessao_id));
    const sessoes = rS.data || [];

    const rot = { agendada: 'Agendada', checkin: 'Check-in', em_atendimento: 'Em atendimento',
                  concluida: 'Concluida', falta: 'Falta', cancelada: 'Cancelada' };
    alvo.innerHTML =
      (sessoes.length
        ? sessoes.map(s =>
            '<label class="linha-doc" style="cursor:pointer">' +
            '<span><input type="radio" name="re-sessao" value="' + s.id + '"' +
            (comEvo.has(s.id) ? ' disabled' : '') +
            ' onchange="MODULOS.programas.formEvolucaoRetro()"> ' +
            '<b>' + s.hora_inicio.slice(0, 5) + '</b> &middot; ' +
            escaparHtml(s.profissional ? s.profissional.nome : '-') +
            ' &middot; ' + (rot[s.status] || s.status) + '</span>' +
            (comEvo.has(s.id) ? '<span class="selo selo-ok">Ja tem evolucao</span>' : '') +
            '</label>').join('')
        : '<p class="sub">Nenhuma sessao nesta data.</p>') +
      '<label class="linha-doc" style="cursor:pointer"><span>' +
      '<input type="radio" name="re-sessao" value="nova" onchange="MODULOS.programas.formEvolucaoRetro()"> ' +
      '<b>Criar sessao retroativa</b> nesta data &middot; hora: </span>' +
      '<input type="time" id="re-hora" value="08:00" step="300" style="width:110px"></label>';
  },

  formEvolucaoRetro() {
    document.getElementById('re-form').innerHTML =
      '<div class="campo" style="margin-top:10px"><label>Evolucao da sessao *</label>' +
      '<textarea id="re-texto" rows="4" placeholder="Como foi a sessao, comportamento, atividades realizadas..."></textarea></div>' +
      '<div class="campo"><label>Destinacao da crianca</label>' +
      '<input id="re-dest" placeholder="Ex.: entregue a mae, orientada sobre a atividade de casa"></div>' +
      '<label class="check" style="margin:4px 0 8px"><input type="checkbox" id="re-concluir" checked> ' +
      'Marcar a sessao como concluida</label>' +
      '<div class="barra-acoes">' +
      '  <button class="btn btn-fantasma" onclick="fecharModal()">Cancelar</button>' +
      '  <button class="btn btn-primario" id="re-salvar" onclick="MODULOS.programas.salvarEvolucaoRetro()">Lancar</button>' +
      '</div>';
  },

  async salvarEvolucaoRetro() {
    const erro = document.getElementById('re-erro');
    const botao = document.getElementById('re-salvar');
    erro.classList.remove('visivel');

    const escolha = document.querySelector('input[name="re-sessao"]:checked');
    const texto = document.getElementById('re-texto').value.trim();
    if (!escolha) { erro.textContent = 'Escolha a sessao (ou crie a retroativa).'; erro.classList.add('visivel'); return; }
    if (!texto) { erro.textContent = 'Escreva a evolucao.'; erro.classList.add('visivel'); return; }

    botao.disabled = true;
    botao.textContent = 'Lancando...';
    try {
      let sessaoId = escolha.value;
      if (sessaoId === 'nova') {
        const { data: nova, error: eN } = await sb.from('sessoes').insert({
          paciente_id: this._retroPac,
          data: document.getElementById('re-data').value,
          hora_inicio: (document.getElementById('re-hora').value || '08:00') + ':00',
          aplicador_id: window.CORTEX_SESSAO.user.id,
          status: 'concluida'
        }).select('id').single();
        if (eN) throw new Error(eN.message);
        sessaoId = nova.id;
      }

      const { error: e1 } = await sb.from('evolucoes').insert({
        sessao_id: sessaoId,
        paciente_id: this._retroPac,
        aplicador_id: window.CORTEX_SESSAO.user.id,
        texto: texto,
        destinacao: document.getElementById('re-dest').value.trim() || null
      });
      if (e1) throw new Error(e1.message);

      if (escolha.value !== 'nova' && document.getElementById('re-concluir').checked) {
        await sb.from('sessoes').update({ status: 'concluida' }).eq('id', sessaoId);
      }

      fecharModal();
      if (this._pacProgPaciente && MODULOS.pacientes.paciente) {
        MODULOS.pacientes.abrirAba('evolucoes');
      }
    } catch (e) {
      erro.textContent = e.message;
      erro.classList.add('visivel');
      botao.disabled = false;
      botao.textContent = 'Lancar';
    }
  }
};
