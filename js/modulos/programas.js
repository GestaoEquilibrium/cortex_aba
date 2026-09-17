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
    ['C',  'Correto (independente)']
  ],
  NIVEIS_PADRAO: ['FT', 'FP', 'MO', 'GE', 'VE', 'VI', 'ER', 'SR', 'NA', 'FA', 'C'],

  // 'I' (do modelo antigo de duas marcas) volta a ser C
  normalizarNiveis(lista) {
    const l = (lista && lista.length ? lista : this.NIVEIS_PADRAO)
      .map(n => n === 'I' ? 'C' : n)
      .filter(n => this.NIVEIS_PADRAO.includes(n));
    if (!l.includes('C')) l.push('C');
    return [...new Set(l)];
  },

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

  // Uma cor por nivel de ajuda - a mesma nos botoes da ficha e na legenda
  COR_NIVEL_UI: { FT: '#7C3AED', FP: '#A855F7', MO: '#2563EB', GE: '#0EA5E9', VE: '#F59E0B', VI: '#F97316',
                  ER: '#E11D48', SR: '#BE123C', NA: '#94A3B8', FA: '#64748B', C: '#16A34A', I: '#16A34A' },
  corUi(s) { return this.COR_NIVEL_UI[s] || '#475569'; },

  legendaNiveis(siglas) {
    return '<div class="niv-legenda">' + (siglas || this.NIVEIS_PADRAO).map(s =>
      '<span class="niv-leg-item' + (s === 'C' ? ' correto' : '') + '" style="--nv:' + this.corUi(s) + '">' +
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
    const niveisAtuais = this.normalizarNiveis(p && p.niveis);

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
      '<small>(marque os que a aplicadora vera na ficha; C - Correto e sempre incluido. ' +
      'Marcar um nivel de ajuda significa que a crianca realizou com aquela ajuda; o erro tem o proprio ER.)</small></label>' +
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
      .select('id, status, tentativas, programas(id, nome, area, objetivo, procedimento, tentativas_padrao, criterio_avanco)')
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
    html += '<button class="btn btn-fantasma" title="Relatorio compilado: um grafico por programa juntando todas as sessoes do periodo, dias por cores." ' +
      'onclick="MODULOS.programas.modalCompilado(\'' + pacienteId + '\')">&#128200; Compilado</button>';
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
        '  <span class="selo ' + (pp.tentativas ? 'selo-roxo' : 'selo-neutro') + '" ' +
        'title="' + (pp.tentativas ? 'Ajustado para este paciente (padrao do programa: ' + (pp.programas.tentativas_padrao || 10) + ')' : 'Padrao do programa') +
        (perm('programas') === 'E' ? '. Toque no cartao e ajuste em Tentativas.' : '') + '">' +
        (pp.tentativas || pp.programas.tentativas_padrao || 10) + ' tentativas' + (pp.tentativas ? ' *' : '') + '</span>' +
        '</div>' +
        (['direcao', 'coordenador', 'suporte'].includes(window.CORTEX_SESSAO.profile.perfil)
          ? '<button class="prog-apagar" title="Remover este programa do paciente (coordenacao)" ' +
            'onclick="event.stopPropagation(); MODULOS.programas.apagarDoPaciente(\'' + pp.id + '\', \'' +
            escaparHtml(pp.programas.nome).replace(/'/g, '') + '\')">&#10005;</button>'
          : '') +
        '<b class="prog-nome">' + escaparHtml(pp.programas.nome) + '</b>' +
        '<div class="prog-progresso"><div class="prog-preench" style="width:' + (pct || 0) + '%; background:' + cor + '"></div></div>' +
        '<small class="prog-meta">' +
        (pct !== undefined ? 'Ultima sessao: ' + pct + '% de corretos' : 'Sem sessoes registradas ainda') +
        '</small>' +
        '</div>';
    }).join('') + '</div>';
  },

  async modalAtribuir(pacienteId) {
    const peiBase = await CADEIA.peiAtivo(pacienteId);
    if (!await CADEIA.avisar('programas para o paciente', peiBase ? [] : ['um PEI ativo (aba PEI) - os programas devem nascer das metas dele'])) return;
    this._peiBase = peiBase;
    await this.carregarBiblioteca();
    const ativos = this.biblioteca.filter(p => p.ativo);
    if (ativos.length === 0) {
      abrirModal('Adicionar programa',
        '<p class="sub">A biblioteca esta vazia. Crie programas no menu Programas.</p>' +
        '<div class="barra-acoes"><button class="btn btn-primario" onclick="fecharModal()">Ok</button></div>');
      return;
    }
    this._bibAtivos = ativos;
    abrirModal('Adicionar programa a este paciente',
      '<div class="campo"><label>Programa da biblioteca * <small class="sub">(digite para buscar por nome ou area)</small></label>' +
      '<input id="at-busca" placeholder="Ex.: pareamento, mando, motora..." autocomplete="off" oninput="MODULOS.programas.filtrarAtribuir(this.value)" style="margin-bottom:6px">' +
      '<div class="at-lista" id="at-lista">' + this.htmlListaAtribuir(ativos, '') + '</div>' +
      '<input type="hidden" id="at-prog" value="' + (ativos[0] ? ativos[0].id : '') + '"></div>' +
      '<div class="campo"><label>Situacao inicial</label><select id="at-status">' +
      '<option value="em_intervencao">Em intervencao (entra na ficha)</option>' +
      '<option value="na_fila">Na fila</option></select></div>' +
      '<div class="campo"><label>Tentativas por sessao para ESTE paciente</label>' +
      '<input type="number" id="at-tent" min="1" max="40" placeholder="vazio = padrao do programa">' +
      '<small class="sub">So preencha se este paciente usar um numero diferente do padrao.</small></div>' +
      '<div class="mensagem-erro" id="at-erro"></div>' +
      '<div class="barra-acoes">' +
      '  <button class="btn btn-fantasma" onclick="fecharModal()">Cancelar</button>' +
      '  <button class="btn btn-primario" onclick="MODULOS.programas.salvarAtribuicao(\'' + pacienteId + '\')">Adicionar</button>' +
      '</div>');
  },

  // lista clicavel com busca (substitui o select longo)
  htmlListaAtribuir(lista, termo) {
    const n = t => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const t = n(termo).trim();
    const filtrados = lista.filter(p => !t || n(p.nome).includes(t) || n(p.area).includes(t));
    const sel = document.getElementById('at-prog') ? document.getElementById('at-prog').value : (lista[0] ? lista[0].id : '');
    if (!filtrados.length) return '<p class="sub" style="padding:8px">Nenhum programa com esse nome.</p>';
    return filtrados.slice(0, 60).map(p => {
      const cor = this.CORES_AREA[p.area] || '#64748B';
      return '<div class="at-item' + (p.id === sel ? ' marcado' : '') + '" onclick="MODULOS.programas.escolherAtribuir(\'' + p.id + '\', this)">' +
        '<span class="at-nome">' + escaparHtml(p.nome) + '<small>' + (p.tentativas_padrao || 10) + ' tentativas' + (p.objetivo ? ' &middot; ' + escaparHtml(p.objetivo.slice(0, 70)) : '') + '</small></span>' +
        '<i class="area-chip" style="background:' + cor + '1A; color:' + cor + '">' + escaparHtml(p.area) + '</i></div>';
    }).join('') + (filtrados.length > 60 ? '<p class="sub" style="padding:6px 8px">+ ' + (filtrados.length - 60) + ' programa(s) - refine a busca</p>' : '');
  },
  filtrarAtribuir(termo) {
    const alvo = document.getElementById('at-lista');
    if (alvo) alvo.innerHTML = this.htmlListaAtribuir(this._bibAtivos || [], termo);
  },
  escolherAtribuir(id, el) {
    document.getElementById('at-prog').value = id;
    document.querySelectorAll('.at-item').forEach(x => x.classList.remove('marcado'));
    if (el) el.classList.add('marcado');
  },

  async salvarAtribuicao(pacienteId) {
    if (!document.getElementById('at-prog').value) { popAviso('Escolha um programa na lista.'); return; }
    const erro = document.getElementById('at-erro');
    erro.classList.remove('visivel');
    const tent = parseInt(document.getElementById('at-tent').value, 10);
    const { error } = await sb.from('paciente_programas').insert({
      paciente_id: pacienteId,
      programa_id: document.getElementById('at-prog').value,
      status: document.getElementById('at-status').value,
      tentativas: (tent >= 1 && tent <= 40) ? tent : null,
      pei_id: this._peiBase ? this._peiBase.id : null,
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
          '</select></div>' +
          '<div class="campo" style="margin-top:10px"><label>Tentativas por sessao <b>para este paciente</b> ' +
          '<small>(vazio = padrao do programa, ' + (p.tentativas_padrao || 10) + '. Vale a partir da proxima ficha.)</small></label>' +
          '<div style="display:flex; gap:8px; align-items:center">' +
          '<input type="number" id="ppt-tent" min="1" max="40" style="width:110px" ' +
          'placeholder="' + (p.tentativas_padrao || 10) + '" value="' + (pp.tentativas || '') + '">' +
          '<button class="btn btn-chip" onclick="MODULOS.programas.salvarTentativasPaciente()">Salvar tentativas</button>' +
          '</div></div>'
        : ''));
  },

  async salvarTentativasPaciente() {
    const v = document.getElementById('ppt-tent').value;
    const n = v ? parseInt(v, 10) : null;
    if (v && (!n || n < 1 || n > 40)) { alert('Entre 1 e 40 (ou vazio para o padrao).'); return; }
    const { error } = await sb.from('paciente_programas')
      .update({ tentativas: n }).eq('id', this._ppAtual.id);
    if (error) { alert(error.message); return; }
    fecharModal();
    this.recarregarAbaProgramas();
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
      const gestao = ['direcao', 'coordenador', 'suporte'].includes(window.CORTEX_SESSAO.profile.perfil);
      const agora = new Date().toTimeString().slice(0, 5);
      abrirModal('Sem sessao agendada hoje',
        '<p style="margin-bottom:8px">O atendimento e sempre vinculado a uma sessao da <b>Agenda</b>: ' +
        'assim os programas e a evolucao ficam presos a data e ao horario certos.</p>' +
        (gestao
          ? '<p class="sub" style="margin-bottom:14px">Voce pode criar um <b>encaixe</b> agora: ele entra na Agenda de hoje as <b>' +
            agora + '</b>, vinculado a voce, e a ficha de aplicacao abre em seguida.</p>' +
            '<div class="mensagem-erro" id="enc-erro"></div>' +
            '<div class="barra-acoes">' +
            '  <button class="btn btn-fantasma" onclick="fecharModal()">Agora nao</button>' +
            '  <button class="btn btn-primario" id="enc-criar" onclick="MODULOS.programas.criarEncaixe(\'' + pacienteId + '\')">Criar encaixe e abrir a ficha</button>' +
            '</div>'
          : '<p class="sub" style="margin-bottom:14px">Peca a coordenacao para agendar (ou criar um encaixe) e volte aqui.</p>' +
            '<div class="barra-acoes"><button class="btn btn-primario" onclick="fecharModal()">Entendi</button></div>'),
        false, 'agenda');
      return;
    }
    this.abrirFolha(sessaoId, true);
  },

  async criarEncaixe(pacienteId) {
    const botao = document.getElementById('enc-criar');
    const erro = document.getElementById('enc-erro');
    if (botao) { botao.disabled = true; botao.textContent = 'Criando...'; }
    const { data: nova, error } = await sb.from('sessoes').insert({
      paciente_id: pacienteId,
      data: new Date().toISOString().slice(0, 10),
      hora_inicio: new Date().toTimeString().slice(0, 5) + ':00',
      aplicador_id: window.CORTEX_SESSAO.user.id,
      status: 'em_atendimento'
    }).select('id').single();
    if (error) {
      if (erro) { erro.textContent = 'Nao consegui criar o encaixe: ' + error.message; erro.classList.add('visivel'); }
      if (botao) { botao.disabled = false; botao.textContent = 'Criar encaixe e abrir a ficha'; }
      return;
    }
    fecharModal();
    this.abrirFolha(nova.id, true);
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

    const [rPps, rRegs, rEst, rRef, rCfg] = await Promise.all([
      sb.from('paciente_programas')
        .select('id, tentativas, programas(id, nome, area, procedimento, tentativas_padrao, niveis, criterio_avanco)')
        .eq('paciente_id', s.paciente_id)
        .eq('status', 'em_intervencao'),
      sb.from('registros_tentativas')
        .select('id, paciente_programa_id, ordem, resposta, acertou, estimulo_id, reforcador')
        .eq('sessao_id', sessaoId),
      sb.from('estimulos').select('id, nome, categoria').eq('ativo', true).order('categoria').order('nome'),
      sb.from('reforcadores').select('nome').order('nome').limit(200),
      sb.from('fichas_config').select('paciente_programa_id, tentativas, selecionado').eq('sessao_id', sessaoId)
    ]);

    const pps = rPps.data || [];
    const cfg = {}, selecionados = {};
    (rCfg.data || []).forEach(c => { cfg[c.paciente_programa_id] = c.tentativas; selecionados[c.paciente_programa_id] = c.selecionado !== false; });
    const fichas = {};
    const estimuloProg = {};
    const tentPrevistas = {};
    pps.forEach(pp => {
      // previsto = ajuste do paciente ou padrao do programa; a sessao pode declarar outro numero
      tentPrevistas[pp.id] = pp.tentativas || pp.programas.tentativas_padrao || 10;
      const n = cfg[pp.id] || tentPrevistas[pp.id];
      fichas[pp.id] = Array.from({ length: n }, () => ({ resposta: '', reforcador: '', estimulo: '' }));
      estimuloProg[pp.id] = '';
    });
    (rRegs.data || []).forEach(r => {
      const g = fichas[r.paciente_programa_id];
      if (!g) return;
      // registro alem da grade (sessao declarada menor depois): a grade cresce para nao perder dado
      while (r.ordem > g.length) g.push({ resposta: '', reforcador: '', estimulo: '' });
      if (r.ordem >= 1) {
        g[r.ordem - 1] = {
          resposta: (r.resposta === 'I' ? 'C' : r.resposta) || '',
          reforcador: r.reforcador || '',
          estimulo: r.estimulo_id || ''
        };
        if (r.estimulo_id && !estimuloProg[r.paciente_programa_id]) estimuloProg[r.paciente_programa_id] = r.estimulo_id;
      }
    });

    // programas com tentativa ja marcada contam como selecionados mesmo sem config
    Object.entries(fichas).forEach(([id, g]) => { if (g.some(l => l.resposta)) selecionados[id] = true; });
    const jaEscolheu = (rCfg.data || []).length > 0;

    this._folha = {
      sessao: s,
      programas: pps,
      selecionados: selecionados,
      etapa: jaEscolheu ? 'aplicar' : 'selecionar',
      idx: 0,
      fichas: fichas,
      tentPrevistas: tentPrevistas,
      estimuloProg: estimuloProg,
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

  // Programas escolhidos para hoje, na ordem da lista
  programasDoDia() {
    const f = this._folha;
    return f.programas.filter(pp => f.selecionados[pp.id]);
  },

  desenharFolha() {
    const f = this._folha;
    const s = f.sessao;
    if (f.etapa === 'selecionar' && f.programas.length) { this.desenharSelecao(); return; }

    let corpo = f.faixaComp || '';
    const doDia = this.programasDoDia();
    if (f.idx >= doDia.length) f.idx = Math.max(0, doDia.length - 1);
    const atual = doDia[f.idx];

    if (doDia.length) {
      corpo += '<div class="ficha-passos">' +
        doDia.map((pp, i) => {
          const c = this.contarFicha(f.fichas[pp.id]);
          return '<button type="button" class="passo' + (i === f.idx ? ' ativo' : '') + (c.preenchidas ? ' feito' : '') + '" ' +
            'onclick="MODULOS.programas.irPara(' + i + ')" title="' + escaparHtml(pp.programas.nome) + '">' +
            '<b>' + (i + 1) + '</b><span>' + escaparHtml(pp.programas.nome.length > 22 ? pp.programas.nome.slice(0, 21) + '\u2026' : pp.programas.nome) + '</span>' +
            (c.preenchidas ? '<small>' + c.preenchidas + '/' + c.n + '</small>' : '') + '</button>';
        }).join('') +
        '<button type="button" class="passo passo-mais" onclick="MODULOS.programas.voltarSelecao()" title="Escolher outros programas">&#9998; programas</button>' +
        '</div>';
    }

    if (!f.programas.length) {
      corpo += '<div class="cartao"><div class="vazio">' +
        '<div class="simbolo-vazio">&#127919;</div>' +
        '<strong>Nenhum programa em intervencao</strong>' +
        'Adicione programas a este paciente na aba Programas do prontuario.' +
        '</div></div>';
    }

    (atual ? [atual] : []).forEach(pp => {
      const p = pp.programas;
      const cor = this.CORES_AREA[p.area] || '#64748B';
      const niveis = this.normalizarNiveis(p.niveis);
      const grade = f.fichas[pp.id];

      corpo += '<div class="cartao ficha-prog" id="ficha-' + pp.id + '">' +
        '<h3><small class="sub" style="font-weight:700">Programa ' + (f.idx + 1) + ' de ' + doDia.length + '</small><br>' +
          escaparHtml(p.nome) + ' <span class="area-chip" style="background:' + cor + '1A; color:' + cor + '">' +
          escaparHtml(p.area) + '</span></h3>' +
        (p.procedimento ? '<p class="sub" style="margin:2px 0 10px">' + escaparHtml(p.procedimento) + '</p>' : '') +

        '<div class="ficha-rapido">' +
        '  <label>Tentativas nesta sessao ' +
        '  <input type="number" min="1" max="40" class="ficha-tent" value="' + grade.length + '" ' +
        '    onchange="MODULOS.programas.mudarTentativas(\'' + pp.id + '\', this.value)"></label>' +
        '  <small class="sub">programa preve ' + f.tentPrevistas[pp.id] + '</small>' +
        '  <label>Estimulo padrao <small>(preenche as tentativas sem estimulo)</small> ' +
        '  <select onchange="MODULOS.programas.mudarEstimulo(\'' + pp.id + '\', this.value)">' +
             this.opcoesEstimulo(f.estimuloProg[pp.id]) + '</select></label>' +
        '  <span class="fr-rotulo" style="margin-left:auto">Preencher rapido</span>' +
        '  <label>Nivel <select id="fr-niv-' + pp.id + '">' +
             niveis.map(v => '<option value="' + v + '">' + this.nomeNivel(v) + '</option>').join('') + '</select></label>' +
        '  <button class="btn-chip" onclick="MODULOS.programas.aplicarATodas(\'' + pp.id + '\')">Aplicar</button>' +
        '  <button class="btn-chip" onclick="MODULOS.programas.limparFicha(\'' + pp.id + '\')">Limpar tudo</button>' +
        '</div>' +

        this.legendaNiveis(niveis) +

        '<div class="ficha-grade-cab ficha-v4"><span>#</span>' +
        '<span>Estimulo</span>' +
        '<span>Nivel de ajuda <small>&mdash; um por tentativa; o nivel ja diz que realizou (erro = ER)</small></span>' +
        '<span>Reforcador</span></div>' +
        grade.map((linha, i) =>
          '<div class="ficha-linha ficha-v4">' +
          '  <span class="ficha-num">' + String(i + 1).padStart(2, '0') + '</span>' +
          '  <select class="ficha-est" onchange="MODULOS.programas.mudarLinha(\'' + pp.id + '\', ' + i + ', \'estimulo\', this.value)">' +
               this.opcoesEstimulo(linha.estimulo || f.estimuloProg[pp.id]) + '</select>' +
          '  <div class="ficha-niveis">' +
               niveis.map(v =>
                 '<button type="button" class="niv-btn' + (linha.resposta === v ? ' ativo' : '') +
                 (v === 'C' ? ' correto' : '') + '" style="--nv:' + this.corUi(v) + '" ' +
                 'id="nb-' + pp.id + '-' + i + '-' + v + '" ' +
                 'title="' + this.nomeNivel(v) + '" ' +
                 'onclick="MODULOS.programas.marcarNivel(\'' + pp.id + '\', ' + i + ', \'' + v + '\')">' + v + '</button>').join('') +
          '  </div>' +
          '  <input placeholder="digitar..." list="lista-reforcadores" value="' + escaparHtml(linha.reforcador) + '" ' +
          '    onchange="MODULOS.programas.mudarLinha(\'' + pp.id + '\', ' + i + ', \'reforcador\', this.value)">' +
          '</div>').join('') +

        '<div class="ficha-rodape" id="rodape-' + pp.id + '">' + this.rodapePrograma(pp.id) + '</div>' +
        '<div class="barra-acoes ficha-nav">' +
        (f.idx > 0 ? '<button class="btn btn-fantasma" onclick="MODULOS.programas.irPara(' + (f.idx - 1) + ')">&lsaquo; Anterior</button>' : '<span></span>') +
        (f.idx < doDia.length - 1
          ? '<button class="btn btn-primario" onclick="MODULOS.programas.irPara(' + (f.idx + 1) + ')">Salvar e continuar &rsaquo;</button>'
          : '<button class="btn btn-primario" onclick="MODULOS.programas.telaFechamento()">Encerrar sessao</button>') +
        '</div>' +
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

  desenharSelecao() {
    const f = this._folha, s = f.sessao;
    const semConfig = !Object.keys(f.selecionados).length;
    this.elFolha().innerHTML =
      '<div class="pagina-cabecalho"><div>' +
      (this._overlay
        ? '<button class="btn-voltar" onclick="MODULOS.programas.sairDaFolha()">&larr; Voltar ao prontuario</button>'
        : '<button class="btn-voltar" onclick="abrirModulo(\'agenda\')">&larr; Agenda</button>') +
      '<h2>O que vamos aplicar hoje &middot; ' + escaparHtml(s.pacientes.nome) + '</h2>' +
      '<p class="sub">' + new Date(s.data + 'T12:00:00').toLocaleDateString('pt-BR') + ' as ' + s.hora_inicio.slice(0, 5) +
      ' &middot; Marque os programas desta sessao. Depois eles aparecem um de cada vez.</p></div></div>' +
      (f.faixaComp || '') +
      '<div class="cartao"><div class="sel-lista">' +
      f.programas.map(pp => {
        const p = pp.programas, cor = this.CORES_AREA[p.area] || '#64748B';
        const marcado = semConfig ? true : !!f.selecionados[pp.id];
        return '<label class="sel-item' + (marcado ? ' marcado' : '') + '">' +
          '<input type="checkbox" value="' + pp.id + '"' + (marcado ? ' checked' : '') + ' onchange="this.closest(\'.sel-item\').classList.toggle(\'marcado\', this.checked)">' +
          '<span class="sel-nome">' + escaparHtml(p.nome) + '<small>' + escaparHtml(p.area) + ' &middot; preve ' + f.tentPrevistas[pp.id] + ' tentativas' +
          (p.procedimento ? ' &middot; ' + escaparHtml(p.procedimento.slice(0, 80)) : '') + '</small></span>' +
          '<i class="area-chip" style="background:' + cor + '1A; color:' + cor + '">' + escaparHtml(p.area) + '</i></label>';
      }).join('') + '</div>' +
      '<p class="sub" style="margin-top:8px">Os que ficarem de fora entram no encerramento como <b>nao aplicados</b>, com um campo para o motivo.</p>' +
      '<div class="barra-acoes">' +
      '<button class="btn btn-fantasma" onclick="document.querySelectorAll(\'.sel-item input\').forEach(c => { c.checked = true; c.closest(\'.sel-item\').classList.add(\'marcado\'); })">Marcar todos</button>' +
      '<button class="btn btn-primario" onclick="MODULOS.programas.comecarAplicacao()">Comecar &rsaquo;</button></div></div>';
  },

  async comecarAplicacao() {
    const f = this._folha;
    const marcados = new Set(Array.from(document.querySelectorAll('.sel-item input:checked')).map(c => c.value));
    if (!marcados.size) { popAviso('Marque pelo menos um programa para comecar.'); return; }
    f.programas.forEach(pp => { f.selecionados[pp.id] = marcados.has(pp.id); });
    // guarda a escolha (uma linha por programa) para sobreviver a fechar/reabrir a ficha
    const linhas = f.programas.map(pp => ({ sessao_id: f.sessao.id, paciente_programa_id: pp.id,
      tentativas: f.fichas[pp.id].length, selecionado: !!f.selecionados[pp.id] }));
    const { error } = await sb.from('fichas_config').upsert(linhas, { onConflict: 'sessao_id,paciente_programa_id' });
    if (error) popAviso('Nao consegui guardar a selecao: ' + error.message);
    f.etapa = 'aplicar'; f.idx = 0;
    this.desenharFolha();
  },

  async voltarSelecao() {
    await this.salvarFichas(true);
    this._folha.etapa = 'selecionar';
    this.desenharFolha();
  },

  async irPara(i) {
    await this.salvarFichas(true);
    this._folha.idx = i;
    this.desenharFolha();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  contarFicha(grade) {
    const n = grade.length;
    const corretos = grade.filter(l => l.resposta === 'C').length;
    const preenchidas = grade.filter(l => l.resposta).length;
    return { n, corretos, preenchidas, pct: n ? Math.round(corretos * 100 / n) : 0 };
  },

  rodapePrograma(ppId) {
    const f = this._folha;
    const pp = f.programas.find(x => x.id === ppId);
    const c = this.contarFicha(f.fichas[ppId]);
    const prev = f.tentPrevistas[ppId];
    return '<div class="fr-indep"><small>Independencia</small><b>' + c.pct + '%</b></div>' +
      '<div class="fr-meio"><span>' + c.corretos + '/' + c.n + ' corretos' +
      (prev !== c.n ? ' <small class="sub">(programa preve ' + prev + ')</small>' : '') + '</span>' +
      '<div class="fr-trilho"><div class="fr-barra" style="width:' + c.pct + '%"></div></div>' +
      '<span>' + c.preenchidas + ' de ' + c.n + ' preenchidas</span></div>' +
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

  mudarEstimulo(ppId, valor) {
    this._folha.estimuloProg[ppId] = valor;
    this._sujo = true;
  },

  async mudarTentativas(ppId, valor) {
    const g = this._folha.fichas[ppId];
    const n = Math.max(1, Math.min(40, parseInt(valor, 10) || g.length));
    if (n < g.length) {
      const perdidas = g.slice(n).filter(l => l.resposta).length;
      if (perdidas && !await popConfirmar('Reduzir para ' + n + ' tentativas apaga ' + perdidas +
        ' tentativa(s) ja marcada(s) no fim da ficha. Continuar?')) { this.desenharFolha(); return; }
      g.length = n;
    }
    while (g.length < n) g.push({ resposta: '', reforcador: '', estimulo: '' });
    this._sujo = true;
    const { error } = await sb.from('fichas_config').upsert(
      { sessao_id: this._folha.sessao.id, paciente_programa_id: ppId, tentativas: n },
      { onConflict: 'sessao_id,paciente_programa_id' });
    if (error) alert('Nao consegui guardar o numero de tentativas: ' + error.message);
    this.desenharFolha();
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

  aplicarATodas(ppId) {
    const v = document.getElementById('fr-niv-' + ppId).value;
    this._folha.fichas[ppId].forEach(l => { l.resposta = v; });
    this._sujo = true;
    this.desenharFolha();
  },

  async limparFicha(ppId) {
    if (!await popConfirmar('Limpar todas as tentativas deste programa nesta sessao?')) return;
    this._folha.fichas[ppId].forEach(l => { l.resposta = ''; l.reforcador = ''; l.estimulo = ''; });
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
            acertou: null,
            estimulo_id: x.l.estimulo || f.estimuloProg[pp.id] || null,
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
      const c = this.contarFicha(grade);
      return { pp, preenchidas: c.preenchidas, corretos: c.corretos, total: c.n, pct: c.pct };
    }).filter(l => l.preenchidas > 0);
    const naoAplicados = f.programas.filter(pp => !linhas.some(l => l.pp.id === pp.id));
    // Evolucao ja vem preenchida com o que foi feito (o aplicador so complementa)
    const resumo = (linhas.length
      ? 'Programas aplicados: ' + linhas.map(l => l.pp.programas.nome + ' (' + l.corretos + '/' + l.total + ', ' + l.pct + '% de independencia)').join('; ') + '.'
      : 'Nenhum programa aplicado nesta sessao.') +
      (naoAplicados.length ? '\nNao aplicados: ' + naoAplicados.map(pp => pp.programas.nome).join('; ') + ' (motivo abaixo).' : '') +
      '\n\nComportamento e observacoes: ';

    abrirModal('Encerrar sessao',
      (linhas.length
        ? '<p class="sub" style="margin-bottom:10px">Resumo por programa. Se algum atingiu o criterio de avanco, ' +
          'marque para promover a Dominado (decisao da coordenacao - nada vem pre-marcado).</p>' +
          linhas.map(l =>
            '<div class="linha-doc">' +
            '<div><b>' + escaparHtml(l.pp.programas.nome) + '</b>' +
            '<small>' + l.preenchidas + ' de ' + l.total + ' tentativas' +
            (f.tentPrevistas[l.pp.id] !== l.total ? ' (programa preve ' + f.tentPrevistas[l.pp.id] + ')' : '') + ' &middot; ' +
            l.corretos + ' corretos &middot; <b>' + l.pct + '% de independencia</b>' +
            (l.pp.programas.criterio_avanco ? ' &middot; criterio: ' + escaparHtml(l.pp.programas.criterio_avanco) : '') +
            '</small></div>' +
            '<label class="check"><input type="checkbox" class="promover" value="' + l.pp.id + '"> Dominado</label>' +
            '</div>').join('')
        : '<p class="sub">Nenhuma tentativa registrada nesta sessao.</p>') +
      (naoAplicados.length
        ? '<h4 style="margin:12px 0 4px; font-size:12.5px">Nao aplicados hoje <span class="selo selo-warn">' + naoAplicados.length + '</span></h4>' +
          '<p class="sub" style="margin-bottom:6px">Diga o motivo de cada um - vai para a evolucao e para o relatorio.</p>' +
          naoAplicados.map(pp =>
            '<div class="campo"><label>' + escaparHtml(pp.programas.nome) + ' *</label>' +
            '<input class="fe-motivo" data-pp="' + pp.id + '" list="fe-motivos" placeholder="Ex.: crianca desregulada; faltou tempo; material indisponivel"></div>').join('') +
          '<datalist id="fe-motivos"><option value="Faltou tempo na sessao"><option value="Crianca desregulada / sem engajamento"><option value="Material indisponivel">' +
          '<option value="Priorizado outro programa"><option value="Crianca chegou atrasada"><option value="Programa em revisao pela coordenacao"></datalist>'
        : '') +
      '<div class="campo" style="margin-top:12px"><label>Evolucao diaria * <small class="sub">(ja veio com o resumo dos programas; complete)</small></label>' +
      '<textarea id="fe-evolucao" rows="6">' + escaparHtml(resumo) + '</textarea></div>' +
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

    let texto = document.getElementById('fe-evolucao').value.trim();
    if (!texto || /Comportamento e observacoes:\s*$/.test(texto)) {
      erro.textContent = 'Complete a evolucao diaria (comportamento e observacoes) antes de concluir.';
      erro.classList.add('visivel');
      return;
    }
    const motivos = {};
    let faltaMotivo = false;
    document.querySelectorAll('.fe-motivo').forEach(i => { motivos[i.dataset.pp] = i.value.trim(); if (!i.value.trim()) faltaMotivo = true; });
    if (faltaMotivo) {
      erro.textContent = 'Informe o motivo de cada programa nao aplicado.';
      erro.classList.add('visivel');
      return;
    }
    botao.disabled = true;
    botao.textContent = 'Concluindo...';

    try {
      const f = this._folha;

      const okFichas = await this.salvarFichas(false);
      if (!okFichas) throw new Error('Nao foi possivel salvar a ficha.');

      // Retrato da sessao por programa (aplicados e nao aplicados com motivo)
      const motivosTxt = [];
      for (const pp of f.programas) {
        const grade = f.fichas[pp.id];
        const c = this.contarFicha(grade);
        const naoAplicado = !c.preenchidas;
        if (naoAplicado) motivosTxt.push(pp.programas.nome + ': ' + (motivos[pp.id] || '-'));
        const { error: eR } = await sb.from('programa_sessao_registros').upsert({
          sessao_id: f.sessao.id,
          paciente_programa_id: pp.id,
          tentativas: c.preenchidas,
          tentativas_sessao: naoAplicado ? 0 : c.n,
          tentativas_previstas: f.tentPrevistas[pp.id],
          corretos: c.corretos,
          pct_corretos: c.pct,
          acertos: c.corretos,
          pct_acertos: c.pct,
          nao_aplicado: naoAplicado,
          motivo_nao_aplicado: naoAplicado ? (motivos[pp.id] || null) : null
        }, { onConflict: 'sessao_id,paciente_programa_id' });
        if (eR) throw new Error(eR.message);
      }
      if (motivosTxt.length) texto += '\n\nMotivo dos nao aplicados: ' + motivosTxt.join('; ') + '.';

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
      .select('id, data, hora_inicio, status, evolucoes(texto)')
      .eq('paciente_id', pacienteId).lte('data', new Date().toISOString().slice(0, 10))
      .not('status', 'in', '("falta","cancelada")')
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
      return '<div class="atd-item clicavel" onclick="MODULOS.programas.docEvolucaoDiaria(\'' + s.id + '\')">' +
        '<div class="atd-topo">' +
        '<div class="atd-meta"><b>' + s.data.split('-').reverse().join('/') + '</b> as ' +
        s.hora_inicio.slice(0, 5) +
        (pcts.length ? ' &middot; ' + pcts.length + ' programa(s)' : '') +
        (media !== null ? ' &middot; <span class="atd-pct">' + media + '% de corretos</span>' : '') +
        (s.status !== 'concluida' ? ' <span class="selo selo-warn">Nao concluida</span>' : '') +
        '</div>' +
        (s.status !== 'concluida' && perm('evolucao') === 'E'
          ? '<button type="button" class="btn btn-fantasma atd-btn" ' +
            'onclick="event.stopPropagation(); MODULOS.programas.concluirSessaoLista(\'' + s.id + '\')">Concluir sessao</button>'
          : '') +
        '<button type="button" class="btn btn-primario atd-btn" ' +
        'onclick="event.stopPropagation(); MODULOS.programas.docEvolucaoDiaria(\'' + s.id + '\')">' +
        '&#128202; Ver relatorio</button>' +
        (['direcao', 'coordenador', 'suporte'].includes(window.CORTEX_SESSAO.profile.perfil)
          ? '<button class="btn-chip" style="color:#E9586A; border-color:#F5C2C9" title="Apagar esta sessao e todos os registros dela (gestao)" ' +
            'onclick="event.stopPropagation(); MODULOS.programas.apagarSessao(\'' + s.id + '\', \'' +
            (s.data || '') + '\')">&#10005;</button>'
          : '') +
        '</div>' +
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
        .select('paciente_programa_id, tentativas, corretos, pct_corretos, acertos, pct_acertos, paciente_programas(programas(nome, area, tentativas_padrao))')
        .eq('sessao_id', sessaoId),
      sb.from('registros_tentativas')
        .select('paciente_programa_id, ordem, resposta, acertou, reforcador, estimulos(nome)')
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
            fx.tentativas + ' corretos &middot; ' + fx.pct_corretos + '%</span></div>' +
            '<div class="rel-tentativas">' +
            lista.map(t => {
              const sig = t.resposta === 'I' ? 'C' : t.resposta;
              return '<span class="rel-tent' + (sig === 'C' ? ' correto' : '') + '" title="' + this.nomeNivel(sig) +
                (t.reforcador ? ' - reforcador: ' + escaparHtml(t.reforcador) : '') + '">' +
                '<b>' + String(t.ordem || 0).padStart(2, '0') + '</b> ' +
                (t.estimulos ? escaparHtml(t.estimulos.nome) + ' ' : '') +
                '<i>' + sig + '</i></span>';
            }).join('') +
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
      '    &middot; ' + s.duracao_min + ' min &middot; Aplicador: ' +
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
      .select('sessao_id, resposta, acertou').in('sessao_id', ids);
    const porSessao = {};
    (regs || []).forEach(r => {
      porSessao[r.sessao_id] = porSessao[r.sessao_id] || { t: 0, c: 0 };
      porSessao[r.sessao_id].t++;
      if (r.resposta === 'C' || r.resposta === 'I') porSessao[r.sessao_id].c++;
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
    if (s === 'C' || s === 'I') return '#15803D';
    if (s === 'ER' || s === 'SR') return '#E9586A';
    if (s === 'NA' || s === 'FA') return '#94A3B8';
    return '#D97706';
  },



  // Opcao B: as tentativas se espalham pela largura toda; ate 6 tentativas o item fica em meia coluna
  // (largura 330), acima disso ocupa a linha inteira (680). Altura fixa pelos niveis do programa.
  graficoTentativas(niveisPrograma, tentativas, largo) {
    const niveis = this.ORDEM_GRAFICO.filter(n => (niveisPrograma || this.NIVEIS_PADRAO).includes(n));
    if (!niveis.length || !tentativas.length) return '';
    const n = tentativas.length;
    const W = largo ? 680 : 330, ESQ = 36, DIR = 12, TOPO = 12, LIN = 20;
    const BASE = TOPO + niveis.length * LIN, H = BASE + 26;
    const util = W - ESQ - DIR, passo = util / n;
    const x = i => ESQ + passo * (i + 0.5);
    const yDe = s => TOPO + (niveis.length - 1 - niveis.indexOf(s)) * LIN + LIN / 2;
    let svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" style="width:100%; height:auto; font-family:inherit">';
    if (niveis.includes('C')) {
      svg += '<rect x="' + ESQ + '" y="' + (yDe('C') - LIN / 2 + 1) + '" width="' + util + '" height="' + (LIN - 2) + '" fill="#ECFDF5" rx="4"/>';
    }
    niveis.forEach(nv => {
      svg += '<line x1="' + ESQ + '" y1="' + yDe(nv) + '" x2="' + (W - DIR) + '" y2="' + yDe(nv) + '" stroke="#EDF2F6"/>' +
        '<text x="' + (ESQ - 7) + '" y="' + (yDe(nv) + 3.5) + '" text-anchor="end" font-size="9.5" font-weight="800" fill="' + this.corUi(nv) + '">' + nv + '</text>';
    });
    const pts = [];
    tentativas.forEach((t, i) => {
      svg += '<text x="' + x(i) + '" y="' + (BASE + 12) + '" text-anchor="middle" font-size="8.5" font-weight="700" fill="#94A3B8">' + (t.ordem || i + 1) + '</text>';
      if (niveis.includes(t.resposta)) {
        pts.push(x(i) + ',' + yDe(t.resposta));
        svg += '<circle cx="' + x(i) + '" cy="' + yDe(t.resposta) + '" r="6.5" fill="#fff" stroke="' + this.corUi(t.resposta) + '" stroke-width="3"/>';
      }
    });
    if (pts.length > 1) svg = svg.replace('<circle', '<polyline fill="none" stroke="#1468B2" stroke-width="2" opacity=".55" stroke-linejoin="round" points="' + pts.join(' ') + '"/><circle');
    svg += '<text x="' + (ESQ + util / 2) + '" y="' + (BASE + 23) + '" text-anchor="middle" font-size="8.5" fill="#94A3B8">tentativas</text>';
    return svg + '</svg>';
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
        .select('paciente_programa_id, corretos, tentativas, tentativas_sessao, tentativas_previstas, pct_corretos, acertos, pct_acertos, nao_aplicado, motivo_nao_aplicado, paciente_programas(programas(nome, area, tentativas_padrao, niveis))')
        .eq('sessao_id', sessaoId),
      sb.from('evolucoes').select('texto, destinacao, aplicador:profiles!evolucoes_aplicador_id_fkey(nome)')
        .eq('sessao_id', sessaoId),
      sb.from('comportamento_registros')
        .select('quantidade, duracao_seg, antecedente, descricao, consequencia, comportamentos(nome, medida)')
        .eq('sessao_id', sessaoId),
      sb.from('registros_tentativas')
        .select('paciente_programa_id, ordem, resposta, acertou, estimulos(nome)')
        .eq('sessao_id', sessaoId).order('ordem')
    ]);
    const s = rS.data;
    if (!s) { ov.remove(); return; }
    const fotos = rFotos.data || [];
    const evo = (rEvo.data && rEvo.data[0]) || {};
    const comps = rComp.data || [];
    const tentPorPp = {};
    (rTent.data || []).forEach(t => {
      if (t.resposta === 'I') t.resposta = 'C';
      (tentPorPp[t.paciente_programa_id] = tentPorPp[t.paciente_programa_id] || []).push(t);
    });

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

    const graficos = '<div class="deq-grade2">' + fotos.map(fx => {
      const prog = fx.paciente_programas && fx.paciente_programas.programas;
      const lista = tentPorPp[fx.paciente_programa_id] || [];
      if (!lista.length) return '';
      const largo = lista.length > 6;
      return '<div class="deq-graf-item' + (largo ? ' deq-graf-largo' : '') + '">' +
        '<div class="deq-graf-tit">' + escaparHtml(prog ? prog.nome : '') +
        ' <small>' + fx.corretos + '/' + (fx.tentativas_sessao || fx.tentativas) + ' C &middot; ' + fx.pct_corretos + '%</small></div>' +
        this.graficoTentativas(prog ? prog.niveis : null, lista, largo) +
        '</div>';
    }).join('') + '</div>';

    const legendaGraf = fotos.length
      ? '<div style="display:flex; gap:14px; flex-wrap:wrap; font-size:10px; font-weight:700; ' +
        'color:var(--eq-cinza); margin-top:8px; padding-left:4px">' +
        this.ORDEM_GRAFICO.slice().reverse().map(nv => '<span><i style="display:inline-block; width:9px; height:9px; border-radius:50%; border:2.5px solid ' +
          this.corUi(nv) + '; margin-right:4px"></i>' + nv + ' ' + this.nomeNivel(nv) + '</span>').join('') +
        '</div>'
      : '';

    const progHtml = fotos.length
      ? '<table style="width:100%; border-collapse:separate; border-spacing:0 6px; margin:-2px 0">' +
        fotos.map(fx => {
          const prog = fx.paciente_programas && fx.paciente_programas.programas;
          const total = fx.tentativas_sessao || fx.tentativas;
          const prev = fx.tentativas_previstas || (prog ? prog.tentativas_padrao : null);
          const notaPrev = (prev && prev !== total) ? ' &middot; programa preve ' + prev : '';
          if (fx.nao_aplicado) {
            return '<tr>' +
              '<td style="padding:7px 11px; background:#FFF6E5; border-radius:9px 0 0 9px; font-weight:700; font-size:12px">' +
              escaparHtml(prog ? prog.nome : '-') + ' <span style="color:var(--eq-cinza); font-weight:600">&middot; ' + escaparHtml(prog ? prog.area : '') + '</span></td>' +
              '<td style="padding:7px 11px; background:#FFF6E5; border-radius:0 9px 9px 0; text-align:right; font-size:12px">' +
              '<b style="color:#B45309">N&atilde;o aplicado</b>' + (fx.motivo_nao_aplicado ? ' &middot; ' + escaparHtml(fx.motivo_nao_aplicado) : '') + '</td></tr>';
          }
          return '<tr>' +
            '<td style="padding:7px 11px; background:var(--eq-fundo); border-radius:9px 0 0 9px; font-weight:700; font-size:12px">' +
            escaparHtml(prog ? prog.nome : '-') +
            ' <span style="color:var(--eq-cinza); font-weight:600">&middot; ' + escaparHtml(prog ? prog.area : '') + '</span></td>' +
            '<td style="padding:7px 11px; background:var(--eq-fundo); border-radius:0 9px 9px 0; text-align:right; white-space:nowrap; font-size:12px">' +
            '<b style="color:var(--eq-azul)">' + fx.pct_corretos + '%</b> de corretos (' + fx.corretos + '/' + total + notaPrev + ')' +
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

    window._docPortal = { paciente_id: s.paciente_id, tipo: 'evolucao_diaria', titulo: 'Evolucao Diaria' };
    document.getElementById('doc-eq-corpo').innerHTML =
      '<div class="pagina-cabecalho nao-imprime">' +
      '  <div><button class="btn-voltar" onclick="document.getElementById(\'doc-eq-overlay\').remove()">&larr; Fechar</button>' +
      '  <h2>Evolucao diaria &middot; documento oficial</h2></div>' +
      '  <button class="btn btn-primario" onclick="window.print()">&#128424; Imprimir / PDF</button>' +
      portalBtn() +
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
      '<br>Aplicador(a) / N&ordm; do Registro de Classe</div>' +

      '<div class="deq-rodape">' +
      '  <span>Equilibrium Terapia Infantil &middot; Uberl&acirc;ndia/MG</span>' +
      '  <span class="pontos"><i style="background:var(--eq-teal)"></i><i style="background:var(--eq-amarelo)"></i>' +
      '<i style="background:var(--eq-rosa)"></i><i style="background:var(--eq-azul)"></i></span>' +
      '  <span>Documento gerado pelo CORTEX aba &middot; ' + new Date().toLocaleDateString('pt-BR') + '</span>' +
      '</div>' +
      '</div>';
  },

  async concluirSessaoLista(sessaoId) {
    const { error } = await sb.from('sessoes').update({ status: 'concluida' }).eq('id', sessaoId);
    if (error) { alert(error.message); return; }
    this.carregarAtendimentos(this._pacProgPaciente);
  },

  // ─────────── PENDENCIAS DE EVOLUCAO (pop-up do login) ───────────

  async popupEvolucoesPendentes() {
    const eu = window.CORTEX_SESSAO.user.id;
    const hoje = new Date().toISOString().slice(0, 10);
    const { data: ss } = await sb.from('sessoes')
      .select('id, data, hora_inicio, status, paciente_id, pacientes(nome)')
      .eq('aplicador_id', eu).lte('data', hoje)
      .not('status', 'in', '("falta","cancelada")')
      .order('data', { ascending: false }).limit(60);
    const passadas = (ss || []).filter(s =>
      s.status === 'concluida' || s.data < hoje);
    if (!passadas.length) return;

    const { data: evs } = await sb.from('evolucoes')
      .select('sessao_id').in('sessao_id', passadas.map(s => s.id));
    const comEvo = new Set((evs || []).map(e => e.sessao_id));
    const pend = passadas.filter(s => !comEvo.has(s.id)).slice(0, 20);
    if (!pend.length) return;

    abrirModal('Sessoes sem evolucao',
      '<p class="sub" style="margin-bottom:10px">Voce tem <b>' + pend.length +
      '</b> sessao(oes) aguardando evolucao. Toque para escrever agora:</p>' +
      pend.map(s =>
        '<div class="linha-doc"><span><b>' + escaparHtml(s.pacientes ? s.pacientes.nome : '?') +
        '</b><small>' + s.data.split('-').reverse().join('/') + ' as ' + s.hora_inicio.slice(0, 5) + '</small></span>' +
        '<button class="btn-chip cheio" onclick="MODULOS.programas.evolucaoRapida(\'' + s.id + '\', \'' +
        s.paciente_id + '\', \'' + escaparHtml((s.pacientes ? s.pacientes.nome : '').split(' ')[0]) + '\', \'' +
        s.data + '\')">Lancar evolucao</button></div>').join(''),
      false, 'evolucao');
  },

  // ─────────────── Pop-up da coordenadora: pendencias de sessao da equipe dela ───────────────
  // Equipe = criancas com pacientes.coordenador_id = eu + criancas dos aplicadores cujo profiles.coordenador_id = eu.
  // Direcao/suporte veem todas as equipes, agrupadas por coordenadora.
  async popupEquipe(tentativa) {
    // nao atropela o pop-up anterior da entrada: espera ele ser fechado (ate ~2 min)
    if (document.getElementById('modal-fundo') || document.getElementById('pop-fundo')) {
      if ((tentativa || 0) < 40) setTimeout(() => this.popupEquipe((tentativa || 0) + 1), 3000);
      return;
    }
    const perfil = window.CORTEX_SESSAO.profile.perfil;
    if (!['direcao', 'suporte', 'coordenador'].includes(perfil)) return;
    const r = await this.pendenciasEquipe();
    if (!r) return;
    abrirModal('Pendencias da equipe', r.html +
      '<div class="barra-acoes"><button class="btn btn-primario" onclick="fecharModal()">Entendi</button></div>', true, 'aviso');
  },

  // Calcula as pendencias de sessao da equipe (coordenadora: a dela; direcao/suporte: todas, por equipe;
  // coordId forca uma equipe especifica). Retorna { html, total } ou null se nao ha nada.
  async pendenciasEquipe(coordId) {
    const sess = window.CORTEX_SESSAO;
    const perfil = sess.profile.perfil;
    const eu = coordId || sess.user.id;
    const veTudo = !coordId && ['direcao', 'suporte'].includes(perfil);

    const hoje = new Date().toISOString().slice(0, 10);
    const desde = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

    const [rPac, rProf, rEm] = await Promise.all([
      sb.from('pacientes').select('id, nome, coordenador_id, aplicador_id').eq('status', 'ativo'),
      sb.from('profiles').select('id, nome, coordenador_id, perfil').eq('ativo', true),
      sb.from('equipe_membros').select('coordenador_id, aplicador_id')
    ]);
    const profs = {}; (rProf.data || []).forEach(p => { profs[p.id] = p; });
    const equipesDe = {}; (rEm.data || []).forEach(x => { (equipesDe[x.aplicador_id] = equipesDe[x.aplicador_id] || []).push(x.coordenador_id); });
    // coordenadoras de uma crianca: a da crianca + todas as do aplicador dela
    const coordsDe = pac => [...new Set([pac.coordenador_id, pac.aplicador_id && profs[pac.aplicador_id] ? profs[pac.aplicador_id].coordenador_id : null]
      .concat(pac.aplicador_id ? (equipesDe[pac.aplicador_id] || []) : []).filter(Boolean))];
    const coordDe = pac => coordsDe(pac)[0] || null;
    const minhas = (rPac.data || []).filter(p => veTudo ? coordsDe(p).length > 0 : coordsDe(p).includes(eu));
    if (!minhas.length) return null;
    const pacMap = {}; minhas.forEach(p => { pacMap[p.id] = p; });

    const { data: ss } = await sb.from('sessoes')
      .select('id, data, hora_inicio, status, paciente_id, aplicador_id')
      .in('paciente_id', minhas.map(p => p.id))
      .gte('data', desde).lte('data', hoje)
      .not('status', 'in', '("falta","cancelada")')
      .order('data', { ascending: false }).limit(400);
    const passadas = (ss || []).filter(s => s.data < hoje || s.status === 'concluida' || s.status === 'em_atendimento');
    if (!passadas.length) return null;

    const ids = passadas.map(s => s.id);
    const [rEv, rReg] = await Promise.all([
      sb.from('evolucoes').select('sessao_id').in('sessao_id', ids),
      sb.from('programa_sessao_registros').select('sessao_id').in('sessao_id', ids)
    ]);
    const comEvo = new Set((rEv.data || []).map(e => e.sessao_id));
    const comFicha = new Set((rReg.data || []).map(r => r.sessao_id));

    const pend = passadas.map(s => {
      const faltas = [];
      if (!comEvo.has(s.id)) faltas.push('sem evolucao');
      if (!comFicha.has(s.id)) faltas.push('sem ficha de programas');
      if (s.status !== 'concluida') faltas.push('nao encerrada');
      return { s, faltas };
    }).filter(x => x.faltas.length);
    if (!pend.length) return null;

    // agrupa: coordenadora (so quando ve tudo) -> aplicador -> sessoes
    const grupos = {};
    pend.forEach(x => {
      const pac = pacMap[x.s.paciente_id];
      const coord = veTudo ? (coordDe(pac) || '-') : eu;
      const apl = x.s.aplicador_id || 'sem';
      ((grupos[coord] = grupos[coord] || {})[apl] = grupos[coord][apl] || []).push({ ...x, pac });
    });
    const nome = id => profs[id] ? profs[id].nome.split(' ').slice(0, 2).join(' ') : 'Sem aplicador';
    const fmt = d => d.split('-').reverse().join('/');
    const selo = f => '<span class="selo ' + (f === 'nao encerrada' ? 'selo-warn' : f === 'sem evolucao' ? 'selo-bad' : 'selo-neutro') + '">' + f + '</span>';

    let html = '<p class="sub" style="margin-bottom:10px"><b>' + pend.length + '</b> sessao(oes) dos ultimos 30 dias com pendencia' +
      (veTudo ? ', por equipe' : ' na sua equipe') + '. Toque no nome para abrir o prontuario.</p>';
    Object.entries(grupos).forEach(([coord, porApl]) => {
      if (veTudo) html += '<h4 style="margin:10px 0 4px; font-size:12.5px">Equipe ' + escaparHtml(nome(coord)) + '</h4>';
      Object.entries(porApl).sort((a, b) => b[1].length - a[1].length).forEach(([apl, lista]) => {
        html += '<div class="cartao" style="padding:10px 12px; margin:6px 0">' +
          '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px">' +
          '<b>' + escaparHtml(nome(apl)) + '</b><span class="selo selo-warn">' + lista.length + ' sessao(oes)</span></div>' +
          lista.slice(0, 12).map(x =>
            '<div class="linha-doc" style="padding:5px 0"><span><a href="#" onclick="fecharModal(); MODULOS.pacientes.telaDetalhe(\'' + x.pac.id + '\', \'evolucoes\'); return false;" style="font-weight:700">' +
            escaparHtml(x.pac.nome) + '</a><small>' + fmt(x.s.data) + ' as ' + (x.s.hora_inicio || '').slice(0, 5) + '</small></span>' +
            '<span class="pac-selos">' + x.faltas.map(selo).join('') + '</span></div>').join('') +
          (lista.length > 12 ? '<p class="sub">+ ' + (lista.length - 12) + ' sessao(oes)</p>' : '') +
          '</div>';
      });
    });
    return { html, total: pend.length };
  },

  evolucaoRapida(sessaoId, pacienteId, nome, data) {
    abrirModal('Evolucao \u00b7 ' + nome + ' \u00b7 ' + data.split('-').reverse().join('/'),
      '<div class="campo"><label>Evolucao da sessao *</label>' +
      '<textarea id="er-texto" rows="4" placeholder="Como foi a sessao..."></textarea></div>' +
      '<div class="campo"><label>Destinacao da crianca</label>' +
      '<input id="er-dest" placeholder="Ex.: entregue a mae"></div>' +
      '<label class="check" style="margin:4px 0 8px"><input type="checkbox" id="er-concluir" checked> ' +
      'Marcar a sessao como concluida</label>' +
      '<div class="mensagem-erro" id="er-erro"></div>' +
      '<div class="barra-acoes">' +
      '  <button class="btn btn-fantasma" onclick="MODULOS.programas.popupEvolucoesPendentes()">Voltar</button>' +
      '  <button class="btn btn-primario" id="er-salvar" onclick="MODULOS.programas.salvarEvolucaoRapida(\'' +
      sessaoId + '\', \'' + pacienteId + '\')">Lancar</button>' +
      '</div>', false, 'evolucao');
  },

  async salvarEvolucaoRapida(sessaoId, pacienteId) {
    const erro = document.getElementById('er-erro');
    const texto = document.getElementById('er-texto').value.trim();
    if (!texto) { erro.textContent = 'Escreva a evolucao.'; erro.classList.add('visivel'); return; }
    const botao = document.getElementById('er-salvar');
    botao.disabled = true; botao.textContent = 'Lancando...';
    try {
      const { error: e1 } = await sb.from('evolucoes').insert({
        sessao_id: sessaoId, paciente_id: pacienteId,
        aplicador_id: window.CORTEX_SESSAO.user.id,
        texto: texto,
        destinacao: document.getElementById('er-dest').value.trim() || null
      });
      if (e1) throw new Error(e1.message);
      if (document.getElementById('er-concluir').checked) {
        await sb.from('sessoes').update({ status: 'concluida' }).eq('id', sessaoId);
      }
      fecharModal();
      this.popupEvolucoesPendentes();
    } catch (e) {
      erro.textContent = e.message; erro.classList.add('visivel');
      botao.disabled = false; botao.textContent = 'Lancar';
    }
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
  },

  // ═══════════ RELATORIO COMPILADO (mensal / semestral) ═══════════

  COR_DIA: ['#1468B2', '#56C4CF', '#F3B63D', '#E9586A', '#7C6FD0', '#3E9C6E',
            '#0E4E86', '#2AA7B5', '#D9930D', '#BE123C', '#5B4FB0', '#2F7A55'],

  modalCompilado(pacienteId) {
    const mes = new Date().toISOString().slice(0, 7);
    abrirModal('Relatorio compilado',
      '<p class="sub" style="margin-bottom:10px">Um grafico por programa com todas as tentativas de todas as sessoes do periodo, cada dia numa cor.</p>' +
      '<div class="grade-form">' +
      '<div class="campo"><label>Tipo</label><select id="rc-tipo">' +
      '<option value="mensal">Mensal (mes escolhido)</option>' +
      '<option value="semestral">Semestral (evolucao por meses)</option></select></div>' +
      '<div class="campo"><label>Mes de referencia</label><input type="month" id="rc-mes" value="' + mes + '"></div>' +
      '</div>' +
      '<div class="barra-acoes"><button class="btn btn-primario" ' +
      'onclick="fecharModal(); MODULOS.programas.docCompilado(\'' + pacienteId + '\', ' +
      'document.getElementById(\'rc-tipo\') ? null : null)">Gerar</button></div>');
    // ligar o gerar com os valores lidos na hora
    setTimeout(() => {
      const btn = document.querySelector('#modal-fundo .btn-primario');
      if (btn) btn.onclick = () => {
        const tipo = document.getElementById('rc-tipo').value;
        const m = document.getElementById('rc-mes').value;
        fecharModal();
        this.docCompilado(pacienteId, tipo, m);
      };
    }, 30);
  },

  async docCompilado(pacienteId, tipo, mesRef) {
    tipo = tipo || 'mensal';
    mesRef = mesRef || new Date().toISOString().slice(0, 7);
    const fimD = new Date(mesRef + '-01T12:00:00');
    fimD.setMonth(fimD.getMonth() + 1); fimD.setDate(0);
    const fim = fimD.toISOString().slice(0, 10);
    const iniD = new Date(mesRef + '-01T12:00:00');
    if (tipo === 'semestral') iniD.setMonth(iniD.getMonth() - 5);
    const ini = iniD.toISOString().slice(0, 10);

    document.getElementById('doc-eq-overlay')?.remove();
    const ov = document.createElement('div');
    ov.id = 'doc-eq-overlay';
    ov.className = 'folha-overlay';
    ov.innerHTML = '<div class="folha-pagina" id="doc-eq-corpo" style="max-width:980px"><p class="sub">Compilando as sessoes...</p></div>';
    document.body.appendChild(ov);

    const [rPac, rSes, rPei] = await Promise.all([
      sb.from('pacientes').select('nome, data_nascimento').eq('id', pacienteId).single(),
      sb.from('sessoes').select('id, data').eq('paciente_id', pacienteId)
        .eq('status', 'concluida').gte('data', ini).lte('data', fim).order('data'),
      sb.from('peis').select('id, pei_metas(area, meta, prazo)').eq('paciente_id', pacienteId)
        .eq('status', 'ativo').maybeSingle()
    ]);
    const pac = rPac.data;
    const sessoes = rSes.data || [];
    if (!pac || !sessoes.length) {
      document.getElementById('doc-eq-corpo').innerHTML =
        '<div class="pagina-cabecalho"><div><button class="btn-voltar" onclick="document.getElementById(\'doc-eq-overlay\').remove()">&larr; Fechar</button>' +
        '<h2>Relatorio compilado</h2></div></div><div class="cartao"><p class="sub">Nenhuma sessao concluida no periodo.</p></div>';
      return;
    }
    const ids = sessoes.map(s => s.id);
    const dataDe = {};
    sessoes.forEach(s => { dataDe[s.id] = s.data; });

    const [rTent, rPsr, rPP] = await Promise.all([
      sb.from('registros_tentativas')
        .select('sessao_id, paciente_programa_id, ordem, resposta').in('sessao_id', ids).order('ordem'),
      sb.from('programa_sessao_registros')
        .select('sessao_id, paciente_programa_id, pct_corretos').in('sessao_id', ids),
      sb.from('paciente_programas').select('id, status, programas(nome, area, niveis)')
        .eq('paciente_id', pacienteId)
    ]);
    const ppDe = {};
    (rPP.data || []).forEach(x => { ppDe[x.id] = x; });

    // Agrupar tentativas: programa -> sessao(data) -> lista
    const porProg = {};
    (rTent.data || []).forEach(t => {
      if (t.resposta === 'I') t.resposta = 'C';
      const d = dataDe[t.sessao_id];
      if (!d) return;
      const P = porProg[t.paciente_programa_id] = porProg[t.paciente_programa_id] || {};
      (P[t.sessao_id] = P[t.sessao_id] || { data: d, lista: [] }).lista.push(t);
    });

    const fmtD = d => d.split('-').reverse().join('/');
    let corpo = '';

    if (tipo === 'mensal') {
      corpo += '<h2 style="margin-top:14px"><span class="ponto deq-azul"></span>Programas &middot; tentativa a tentativa no m&ecirc;s <small>&middot; uma cor por dia</small></h2>' +
        '<div class="deq-grade2">';
      Object.entries(porProg).forEach(([ppId, sesMap]) => {
        const pp = ppDe[ppId];
        if (!pp) return;
        const blocos = Object.entries(sesMap)
          .sort((a, b) => a[1].data.localeCompare(b[1].data) || a[0].localeCompare(b[0]));
        const tot = blocos.reduce((s, [, b]) => s + b.lista.length, 0);
        const cor = blocos.reduce((s, [, b]) => s + b.lista.filter(t => t.resposta === 'C').length, 0);
        const largo = tot > 12;
        corpo += '<div class="deq-graf-item' + (largo ? ' deq-graf-largo' : '') + '">' +
          '<div class="deq-graf-tit">' + escaparHtml(pp.programas.nome) +
          ' <small>' + blocos.length + ' sess&otilde;es &middot; ' + cor + '/' + tot + ' C (' + (tot ? Math.round(cor * 100 / tot) : 0) + '%)</small></div>' +
          this.graficoCompilado(pp.programas.niveis, blocos, largo) + '</div>';
      });
      corpo += '</div>';
      // Metas do PEI e andamento
      const metas = rPei.data ? (rPei.data.pei_metas || []) : [];
      if (metas.length) {
        const andamento = m => {
          const pp = (rPP.data || []).find(x =>
            x.programas && x.programas.nome.toLowerCase() === (m.meta || '').slice(0, 120).toLowerCase());
          if (!pp) return '<span style="color:var(--eq-cinza)">meta clinica (sem programa vinculado)</span>';
          const rot = { na_fila: 'Na fila', em_intervencao: 'Em intervencao', dominado: '<b style="color:#15803D">Dominado</b>' };
          return rot[pp.status] || pp.status;
        };
        corpo += '<h2 style="margin-top:16px"><span class="ponto deq-teal"></span>Metas do PEI e andamento</h2>' +
          '<table class="deq-freq"><tr><th style="text-align:left; padding-left:10px">Area</th>' +
          '<th style="text-align:left">Meta</th><th>Prazo</th><th>Andamento</th></tr>' +
          metas.map(m => '<tr><td style="width:auto; text-align:left; padding:6px 10px">' + escaparHtml(m.area || '-') + '</td>' +
            '<td style="width:auto; text-align:left; padding:6px 10px">' + escaparHtml(m.meta || '') + '</td>' +
            '<td style="width:auto">' + escaparHtml(m.prazo || '-') + '</td>' +
            '<td style="width:auto">' + andamento(m) + '</td></tr>').join('') +
          '</table>';
      }
    } else {
      // Semestral: % de corretos por mes, por programa
      const porMes = {};
      (rPsr.data || []).forEach(f => {
        const mes = (dataDe[f.sessao_id] || '').slice(0, 7);
        if (!mes) return;
        const P = porMes[f.paciente_programa_id] = porMes[f.paciente_programa_id] || {};
        (P[mes] = P[mes] || []).push(f.pct_corretos || 0);
      });
      const meses = [];
      const c = new Date(ini + 'T12:00:00');
      for (let i = 0; i < 6; i++) { meses.push(c.toISOString().slice(0, 7)); c.setMonth(c.getMonth() + 1); }
      const ROT_MES = m => m.slice(5) + '/' + m.slice(2, 4);

      Object.entries(porMes).forEach(([ppId, mm]) => {
        const pp = ppDe[ppId];
        if (!pp) return;
        const medias = meses.map(m => {
          const l = mm[m];
          return l ? Math.round(l.reduce((s, x) => s + x, 0) / l.length) : null;
        });
        const W = 640, H = 150, ESQ = 44, TOPO = 16, BASE = H - 28;
        const passo = (W - ESQ - 20) / 5;
        const y = pct => BASE - (pct / 100) * (BASE - TOPO);
        const pontos = medias.map((v, i) => v === null ? null : (ESQ + i * passo) + ',' + y(v)).filter(Boolean);
        corpo += '<div class="deq-graf-item"><div class="deq-graf-tit">' +
          escaparHtml(pp.programas.nome) + ' <small>&middot; % de corretos por m&ecirc;s</small></div>' +
          '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%; height:auto">' +
          [0, 50, 100].map(g => '<line x1="' + ESQ + '" y1="' + y(g) + '" x2="' + (W - 16) + '" y2="' + y(g) +
            '" stroke="#DFE6EC" stroke-dasharray="3 4"/><text x="' + (ESQ - 6) + '" y="' + (y(g) + 3) +
            '" text-anchor="end" font-size="9" fill="#94A3B8">' + g + '%</text>').join('') +
          (pontos.length > 1 ? '<polyline fill="none" stroke="#1468B2" stroke-width="2.5" points="' + pontos.join(' ') + '"/>' : '') +
          medias.map((v, i) => {
            const x = ESQ + i * passo;
            return '<text x="' + x + '" y="' + (H - 8) + '" text-anchor="middle" font-size="9.5" font-weight="700" fill="#64748B">' +
              ROT_MES(meses[i]) + '</text>' +
              (v === null ? '' :
                '<circle cx="' + x + '" cy="' + y(v) + '" r="7" fill="#fff" stroke="' + this.COR_DIA[i] + '" stroke-width="3"/>' +
                '<text x="' + x + '" y="' + (y(v) - 11) + '" text-anchor="middle" font-size="10.5" font-weight="800" fill="' +
                this.COR_DIA[i] + '">' + v + '%</text>');
          }).join('') +
          '</svg></div>';
      });
      corpo = '<div class="deq-grade2">' + corpo + '</div>';
    }

    window._docPortal = { paciente_id: pacienteId, tipo: 'outro',
      titulo: 'Relatorio Compilado ' + (tipo === 'mensal' ? 'Mensal' : 'Semestral') };
    document.getElementById('doc-eq-corpo').innerHTML =
      '<div class="pagina-cabecalho nao-imprime">' +
      '  <div><button class="btn-voltar" onclick="document.getElementById(\'doc-eq-overlay\').remove()">&larr; Fechar</button>' +
      '  <h2>Relatorio compilado &middot; ' + (tipo === 'mensal' ? 'mensal' : 'semestral') + '</h2></div>' +
      '  <button class="btn btn-primario" onclick="window.print()">&#128424; Imprimir / PDF</button>' +
      portalBtn() +
      '</div>' +
      '<div class="doc-eq">' +
      '<div class="deq-cab"><img src="icones/equilibrium.png" alt="Equilibrium">' +
      '<div class="deq-cab-t"><h1>RELAT&Oacute;RIO COMPILADO &middot; ' + (tipo === 'mensal' ? 'MENSAL' : 'SEMESTRAL') + '</h1>' +
      '<p>Equilibrium Terapia Infantil &middot; ' + fmtD(ini) + ' a ' + fmtD(fim) + ' &middot; ' +
      sessoes.length + ' sessao(oes) concluida(s)</p></div></div>' +
      '<div class="deq-caixa deq-dados" style="grid-template-columns:1fr 1fr; margin-top:8px">' +
      '<div><small>Paciente</small><b>' + escaparHtml(pac.nome) + '</b></div>' +
      '<div><small>Nascimento</small><b>' + (pac.data_nascimento ? fmtD(pac.data_nascimento) : '-') + '</b></div>' +
      '</div>' +
      (corpo || '<p class="sub" style="margin-top:14px">Sem tentativas registradas no periodo.</p>') +
      '<div class="deq-rodape"><span>Equilibrium Terapia Infantil &middot; Uberl&acirc;ndia/MG</span>' +
      '<span class="pontos"><i style="background:var(--eq-teal)"></i><i style="background:var(--eq-amarelo)"></i>' +
      '<i style="background:var(--eq-rosa)"></i><i style="background:var(--eq-azul)"></i></span>' +
      '<span>Gerado pelo CORTEX aba &middot; ' + new Date().toLocaleDateString('pt-BR') + '</span></div>' +
      '</div>';
  },

  // Grafico compilado: X = tentativas em blocos por sessao (cor do dia), Y = niveis
  graficoCompilado(niveisPrograma, blocos, largo) {
    const niveis = this.ORDEM_GRAFICO.filter(n => this.normalizarNiveis(niveisPrograma).includes(n));
    const total = blocos.reduce((s, [, b]) => s + b.lista.length, 0);
    if (!total) return '<p class="sub">Sem tentativas.</p>';
    const W = largo ? 680 : 330, ESQ = 36, TOPO = 10, LIN = 19, BASE = TOPO + niveis.length * LIN;
    const PX = (W - ESQ - 16 - blocos.length * 10) / total;
    const H = BASE + 30;
    const yDe = s => TOPO + (niveis.length - 1 - niveis.indexOf(s)) * LIN + LIN / 2;

    let svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%; height:auto">';
    niveis.forEach(n => {
      svg += '<line x1="' + ESQ + '" y1="' + yDe(n) + '" x2="' + (W - 8) + '" y2="' + yDe(n) +
        '" stroke="#EDF2F6"/>' +
        '<text x="' + (ESQ - 7) + '" y="' + (yDe(n) + 3.5) + '" text-anchor="end" font-size="9.5" font-weight="800" fill="' +
        this.corUi(n) + '">' + n + '</text>';
    });
    let x = ESQ + 6;
    blocos.forEach(([, b], bi) => {
      const cor = this.COR_DIA[bi % this.COR_DIA.length];
      const pts = [];
      b.lista.forEach(t => {
        if (niveis.includes(t.resposta)) {
          pts.push(x + ',' + yDe(t.resposta));
          svg += '<circle cx="' + x + '" cy="' + yDe(t.resposta) + '" r="5.5" fill="#fff" stroke="' + this.corUi(t.resposta) + '" stroke-width="2.6"/>';
        }
        x += PX;
      });
      if (pts.length > 1) svg = svg.replace('<circle cx="' + pts[0].split(',')[0] + '"',
        '<polyline fill="none" stroke="' + cor + '" stroke-width="1.8" opacity=".75" points="' + pts.join(' ') + '"/>' +
        '<circle cx="' + pts[0].split(',')[0] + '"');
      const meioX = x - (b.lista.length * PX) / 2 - PX / 2;
      svg += '<text x="' + meioX + '" y="' + (BASE + 14) + '" text-anchor="middle" font-size="9" font-weight="800" fill="' + cor + '">' +
        b.data.slice(8, 10) + '/' + b.data.slice(5, 7) + '</text>' +
        '<text x="' + meioX + '" y="' + (BASE + 24) + '" text-anchor="middle" font-size="8" fill="#94A3B8">' +
        b.lista.filter(t => t.resposta === 'C').length + '/' + b.lista.length + ' C</text>';
      x += 10;
      if (bi < blocos.length - 1) svg += '<line x1="' + (x - 5) + '" y1="' + TOPO + '" x2="' + (x - 5) + '" y2="' + BASE +
        '" stroke="#DFE6EC" stroke-dasharray="2 4"/>';
    });
    svg += '</svg>';
    return svg;
  },

  // ─────────────── Coordenacao remove programa do paciente ───────────────

  async apagarDoPaciente(ppId, nome) {
    const { count } = await sb.from('registros_tentativas')
      .select('sessao_id', { count: 'exact', head: true })
      .eq('paciente_programa_id', ppId);
    const aviso = count
      ? 'O programa "' + nome + '" tem ' + count + ' tentativa(s) registrada(s) em sessoes.\n\n' +
        'Apagar remove o programa DESTE paciente e TODO o historico dele (tentativas e fechamentos por sessao). ' +
        'Os relatorios ja gerados em PDF nao mudam.\n\nApagar mesmo assim?'
      : 'Remover o programa "' + nome + '" deste paciente?';
    if (!await popConfirmar(aviso)) return;
    if (count && !await popConfirmar('Confirmacao final: apagar o historico de ' + count + ' tentativa(s) de "' + nome + '"?')) return;

    const d1 = await sb.from('registros_tentativas').delete().eq('paciente_programa_id', ppId);
    if (d1.error) { alert('Tentativas: ' + d1.error.message); return; }
    const d2 = await sb.from('programa_sessao_registros').delete().eq('paciente_programa_id', ppId);
    if (d2.error) { alert('Fechamentos: ' + d2.error.message); return; }
    const { error } = await sb.from('paciente_programas').delete().eq('id', ppId);
    if (error) {
      alert('Nao consegui remover: ' + error.message +
        '\n\nSe a mensagem falar de violacao/policy, rode o SQL de permissoes de exclusao que enviei junto com este patch.');
      return;
    }
    if (this._pacProgPaciente && window.MODULOS.pacientes) MODULOS.pacientes.telaDetalhe(this._pacProgPaciente, 'programas');
  },

  // ─────────────── Gestao apaga sessao realizada ───────────────

  async apagarSessao(sessaoId, data) {
    const { count } = await sb.from('registros_tentativas')
      .select('sessao_id', { count: 'exact', head: true }).eq('sessao_id', sessaoId);
    const rotulo = data ? data.split('-').reverse().join('/') : 'esta sessao';
    if (!await popConfirmar('Apagar a sessao de ' + rotulo + '?' +
        (count ? '\n\nEla tem ' + count + ' tentativa(s) registrada(s). Apagar remove a sessao, as tentativas, os fechamentos e a evolucao dela. PDFs ja gerados nao mudam.' : ''))) return;
    if (count && !await popConfirmar('Confirmacao final: apagar de vez a sessao de ' + rotulo + ' com todo o historico?')) return;

    const passos = [
      ['Evolucao', sb.from('evolucoes').delete().eq('sessao_id', sessaoId)],
      ['Tentativas', sb.from('registros_tentativas').delete().eq('sessao_id', sessaoId)],
      ['Fechamentos', sb.from('programa_sessao_registros').delete().eq('sessao_id', sessaoId)]
    ];
    for (const [nome, q] of passos) {
      const { error } = await q;
      if (error) { alert(nome + ': ' + error.message); return; }
    }
    const { error } = await sb.from('sessoes').delete().eq('id', sessaoId);
    if (error) {
      alert('Nao consegui apagar a sessao: ' + error.message +
        '\n\nSe falar de policy, rode o SQL de exclusao de sessoes que mandei com este patch.');
      return;
    }
    if (this._pacProgPaciente && window.MODULOS.pacientes) {
      MODULOS.pacientes.telaDetalhe(this._pacProgPaciente, 'programas');
    }
  }
};
