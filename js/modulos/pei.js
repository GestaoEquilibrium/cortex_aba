// ============================================================================
// CORTEX aba - js/modulos/pei.js
// Sprint 8: Plano de Ensino Individualizado (Formulario 02) gerado a partir
// dos "NAO" do QADI-R, com curadoria da coordenacao (meta/recurso/prazo),
// e Relatorio de Devolutiva (demanda, procedimento, analise, conclusao).
// ============================================================================

window.MODULOS = window.MODULOS || {};

window.MODULOS.pei = {

  PODE_GERIR: ['direcao', 'coordenador', 'terapeuta', 'suporte'],

  el() { return document.getElementById('pagina'); },
  podeGerir() { return perm('pei') === 'E'; },

  // ─────────────────── ABA PEI DO PRONTUARIO ───────────────────

  async htmlDoPaciente(pacienteId) {
    const { data: peis } = await sb.from('peis')
      .select('id, status, periodo_inicio, periodo_fim, criado_em, profissional:profiles!peis_profissional_id_fkey(nome)')
      .eq('paciente_id', pacienteId)
      .order('criado_em', { ascending: false });

    const { data: avs } = await sb.from('avaliacoes')
      .select('id, protocolo, concluido_em')
      .eq('paciente_id', pacienteId).eq('status', 'concluida')
      .order('concluido_em', { ascending: false }).limit(1);

    const temAvaliacao = avs && avs.length > 0;
    const nomeProt = temAvaliacao && avs[0].protocolo === 'ss' ? 'Socially Savvy' : 'QADI-R';

    let html = '';
    if (this.podeGerir()) {
      html += '<div class="aba-acoes">' +
        (temAvaliacao
          ? '<button class="btn btn-primario" ' +
            'title="Gera as metas candidatas a partir da ultima avaliacao concluida (' + nomeProt + ', ' +
            new Date(avs[0].concluido_em).toLocaleDateString('pt-BR') + ')." ' +
            'onclick="MODULOS.pei.abrirConstrutor(\'' + avs[0].id + '\', \'' + pacienteId + '\')">+ Elaborar PEI</button>' +
            '<span class="sub">A partir do ' + nomeProt + ' de ' +
            new Date(avs[0].concluido_em).toLocaleDateString('pt-BR') + '</span>'
          : '<button class="btn btn-primario" ' +
            'title="Sem avaliacao concluida: o sistema avisa e deixa elaborar com metas manuais." ' +
            'onclick="MODULOS.pei.abrirConstrutor(null, \'' + pacienteId + '\')">+ Elaborar PEI</button>' +
            '<span class="sub">Sem avaliacao concluida - o PEI sera montado com metas manuais.</span>') +
        '</div>';
    }

    html += '<div class="cartao"><h3>Planos de Ensino</h3>' +
      ((peis && peis.length) ? peis.map(p =>
        '<div class="linha-doc"><div><b>PEI &middot; ' +
        (p.periodo_inicio ? new Date(p.periodo_inicio + 'T12:00:00').toLocaleDateString('pt-BR') : '-') +
        ' a ' + (p.periodo_fim ? new Date(p.periodo_fim + 'T12:00:00').toLocaleDateString('pt-BR') : '-') + '</b>' +
        '<small>' + (p.profissional ? 'Responsavel: ' + escaparHtml(p.profissional.nome) : '') + '</small></div>' +
        '<div class="pac-selos">' +
        '<span class="selo ' + (p.status === 'ativo' ? 'selo-ok">Ativo' : 'selo-neutro">' + p.status) + '</span>' +
        '<button class="btn-chip" onclick="MODULOS.pei.abrirVisual(\'' + p.id + '\')">Abrir</button>' +
        '</div></div>').join('')
      : '<p class="sub">Nenhum PEI elaborado ainda.</p>') +
      '</div>';

    return html;
  },

  // ─────────────────── CONSTRUTOR ───────────────────

  async abrirConstrutor(avaliacaoId, pacienteId) {
    const planoBase = await CADEIA.planoAtivo(pacienteId);
    const faltas = [];
    if (!avaliacaoId) faltas.push('uma avaliacao concluida (as metas candidatas vem dela)');
    if (!planoBase) faltas.push('um Plano Terapeutico ativo (aba Plano)');
    if (!await CADEIA.avisar('o PEI', faltas)) return;

    const el = this.el();
    el.innerHTML = '<div class="cartao"><p class="sub">Preparando metas candidatas...</p></div>';

    const { data: avInfo } = avaliacaoId
      ? await sb.from('avaliacoes').select('protocolo').eq('id', avaliacaoId).single()
      : { data: null };
    const ehSS = avInfo && avInfo.protocolo === 'ss';

    const [{ data: pac }, { data: equipe }] = await Promise.all([
      sb.from('pacientes').select('id, nome, data_nascimento, aplicador_id').eq('id', pacienteId).single(),
      sb.from('profiles').select('id, nome').eq('ativo', true).eq('responsavel_tecnico', true).order('nome')
    ]);

    let candidatas, listaAreas;
    if (!avaliacaoId) {
      candidatas = [];
      listaAreas = MODULOS.avaliacoes.SS_AREAS;
    } else if (ehSS) {
      await MODULOS.avaliacoes.carregarItensSS();
      const { data: resps } = await sb.from('ss_respostas')
        .select('item_id, pontos').eq('avaliacao_id', avaliacaoId);
      const mapa = {};
      (resps || []).forEach(r => { mapa[r.item_id] = r.pontos; });
      candidatas = MODULOS.avaliacoes.itensSS
        .filter(i => mapa[i.id] !== undefined && mapa[i.id] <= 2)
        .map(i => ({ area: i.area, ss_id: i.id, meta: i.texto,
                     marcada: mapa[i.id] === 2,
                     origem: 'Socially Savvy &middot; ' + i.codigo +
                       (mapa[i.id] === 2 ? ' &middot; prioritario (pontuou 2)' : ' &middot; pontuou ' + mapa[i.id]) }));
      listaAreas = MODULOS.avaliacoes.SS_AREAS;
    } else {
      await MODULOS.avaliacoes.carregarQuestoes();
      const questoes = MODULOS.avaliacoes.questoes;
      const { data: resps } = await sb.from('avaliacao_respostas')
        .select('questao_id, resposta').eq('avaliacao_id', avaliacaoId);
      const mapa = {};
      (resps || []).forEach(r => { mapa[r.questao_id] = r.resposta; });
      candidatas = questoes
        .filter(q => mapa[q.id] === 'N')
        .map(q => ({ area: q.area, faixa: q.faixa, questao_id: q.id, marcada: true,
                     meta: q.pergunta.replace(/\?$/, '').trim() }));
      listaAreas = MODULOS.avaliacoes.AREAS;
    }

    this._construtor = { avaliacaoId, planoId: planoBase ? planoBase.id : null, paciente: pac, candidatas, seq: 0, ehSS };

    const hoje = new Date();
    const fim = new Date(hoje); fim.setMonth(fim.getMonth() + 6);

    const porArea = {};
    listaAreas.forEach(a => { porArea[a] = candidatas.filter(c => c.area === a); });

    let blocos = '';
    Object.entries(porArea).forEach(([area, itens]) => {
      blocos += '<div class="cartao"><h3>' + area +
        ' <span class="selo selo-warn">' + itens.length + ' candidata(s)</span></h3>' +
        '<div id="pei-area-' + this.slug(area) + '">' +
        itens.map(c => this.htmlMetaLinha(area, c)).join('') +
        '</div>' +
        '<button type="button" class="btn-chip" style="margin-top:8px" ' +
        'onclick="MODULOS.pei.addMetaManual(\'' + area + '\')">+ Meta manual</button>' +
        '</div>';
    });

    el.innerHTML =
      '<div class="pagina-cabecalho">' +
      '  <div>' +
      '    <button class="btn-voltar" onclick="MODULOS.pacientes.telaDetalhe(\'' + pac.id + '\', \'pei\')">&larr; Prontuario</button>' +
      '    <h2>Novo PEI &middot; ' + escaparHtml(pac.nome) + '</h2>' +
      '    <p class="sub">' + (!this._construtor.avaliacaoId ? 'Sem avaliacao vinculada: monte as metas manualmente com "+ Meta manual" em cada area. ' : candidatas.length + (this._construtor.ehSS ? ' metas candidatas do Socially Savvy: itens que pontuaram 2 vem marcados (prioritarios); 0 e 1 ficam disponiveis. ' : ' metas candidatas geradas dos "Nao" do QADI-R. ')) +
      'Desmarque as que nao entram, ajuste o texto e defina recurso e prazo.</p>' +
      '  </div>' +
      '  <button class="btn btn-primario" onclick="MODULOS.pei.salvarPei()">Salvar PEI</button>' +
      '</div>' +

      '<div class="cartao faixa-azul"><h3>Identificacao (Formulario 02)</h3>' +
      '<div class="grade-form">' +
      '  <div class="campo c3"><label>Finalidade</label>' +
      '    <textarea id="pei-finalidade" rows="2">' + (!this._construtor.avaliacaoId ? '' : this._construtor.ehSS ? 'Desenvolver habilidades sociais identificadas no Socially Savvy Checklist, promovendo participacao conjunta, linguagem social e autorregulacao.' : 'Desenvolver habilidades essenciais identificadas na avaliacao QADI-R, promovendo autonomia, comunicacao e interacao social.') + '</textarea></div>' +
      '  <div class="campo"><label>Periodo - inicio</label>' +
      '    <input type="date" id="pei-inicio" value="' + hoje.toISOString().slice(0, 10) + '"></div>' +
      '  <div class="campo"><label>Periodo - fim</label>' +
      '    <input type="date" id="pei-fim" value="' + fim.toISOString().slice(0, 10) + '"></div>' +
      '  <div class="campo"><label>Responsavel tecnico (assina)</label>' +
      '    <select id="pei-prof">' +
      (equipe || []).map(m => '<option value="' + m.id + '"' +
        (m.id === pac.aplicador_id ? ' selected' : '') + '>' + escaparHtml(m.nome) + '</option>').join('') +
      '    </select></div>' +
      '</div></div>' +

      blocos +

      '<div class="mensagem-erro" id="pei-erro"></div>' +
      '<div class="barra-acoes">' +
      '  <button class="btn btn-fantasma" onclick="MODULOS.pacientes.telaDetalhe(\'' + pac.id + '\', \'pei\')">Cancelar</button>' +
      '  <button class="btn btn-primario" onclick="MODULOS.pei.salvarPei()">Salvar PEI</button>' +
      '</div>';
  },

  slug(t) { return t.toLowerCase().replace(/[^a-z]/g, ''); },

  htmlMetaLinha(area, c) {
    const n = ++this._construtor.seq;
    return '<div class="pei-meta" data-area="' + escaparHtml(area) + '" data-questao="' + (c.questao_id || '') + '" ' +
      'data-ss="' + (c.ss_id || '') + '">' +
      '<label class="check pei-check"><input type="checkbox"' + (c.marcada === false ? '' : ' checked') + '></label>' +
      '<div class="pei-campos">' +
      '  <input class="pm-meta" value="' + escaparHtml(c.meta || '') + '" placeholder="Meta">' +
      (c.origem ? '<small class="pm-origem">' + c.origem + '</small>' : '') +
      (c.faixa ? '<small class="pm-origem">QADI-R &middot; ' + escaparHtml(c.faixa) + '</small>' : '') +
      '  <div class="pei-rp">' +
      '    <input class="pm-recurso" placeholder="Recurso (ex.: pareamento com figuras, DTT)">' +
      '    <input class="pm-prazo" placeholder="Prazo (ex.: 3 meses)">' +
      '  </div>' +
      '</div></div>';
  },

  addMetaManual(area) {
    const alvo = document.getElementById('pei-area-' + this.slug(area));
    const div = document.createElement('div');
    div.innerHTML = this.htmlMetaLinha(area, { meta: '' });
    alvo.appendChild(div.firstChild);
  },

  async salvarPei() {
    const erro = document.getElementById('pei-erro');
    erro.classList.remove('visivel');

    const metas = [];
    document.querySelectorAll('.pei-meta').forEach((m, i) => {
      if (!m.querySelector('input[type="checkbox"]').checked) return;
      const texto = m.querySelector('.pm-meta').value.trim();
      if (!texto) return;
      metas.push({
        area: m.dataset.area,
        meta: texto,
        recurso: m.querySelector('.pm-recurso').value.trim() || null,
        prazo: m.querySelector('.pm-prazo').value.trim() || null,
        origem_questao_id: m.dataset.questao ? parseInt(m.dataset.questao, 10) : null,
        origem_ss_id: m.dataset.ss ? parseInt(m.dataset.ss, 10) : null,
        ordem: i + 1
      });
    });

    if (metas.length === 0) {
      erro.textContent = 'Selecione ao menos uma meta.';
      erro.classList.add('visivel');
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      return;
    }

    const ctx = this._construtor;
    try {
      const { data: pei, error: e1 } = await sb.from('peis').insert({
        paciente_id: ctx.paciente.id,
        avaliacao_id: ctx.avaliacaoId || null,
        plano_id: ctx.planoId || null,
        finalidade: document.getElementById('pei-finalidade').value.trim() || null,
        periodo_inicio: document.getElementById('pei-inicio').value || null,
        periodo_fim: document.getElementById('pei-fim').value || null,
        profissional_id: document.getElementById('pei-prof').value || null,
        criado_por: window.CORTEX_SESSAO.user.id
      }).select('id').single();
      if (e1) throw new Error(e1.message);

      const { error: e2 } = await sb.from('pei_metas').insert(
        metas.map(m => ({ ...m, pei_id: pei.id })));
      if (e2) throw new Error(e2.message);

      this.abrirVisual(pei.id);
    } catch (e) {
      erro.textContent = e.message;
      erro.classList.add('visivel');
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }
  },

  // ─────────────────── VISUALIZACAO (Formulario 02) ───────────────────

  async abrirVisual(peiId) {
    const el = this.el();
    el.innerHTML = '<div class="cartao"><p class="sub">Carregando PEI...</p></div>';

    const { data: pei } = await sb.from('peis')
      .select('*, pacientes(id, nome, data_nascimento), profissional:profiles!peis_profissional_id_fkey(nome), pei_metas(*)')
      .eq('id', peiId).single();
    if (!pei) { return; }

    const metas = (pei.pei_metas || []).sort((a, b) => a.ordem - b.ordem);
    const porArea = {};
    metas.forEach(m => { (porArea[m.area] = porArea[m.area] || []).push(m); });

    // Programas do paciente para casar meta -> andamento
    const { data: pps } = await sb.from('paciente_programas')
      .select('status, pei_meta_id, programas(nome)').eq('paciente_id', pei.pacientes.id);
    const andamento = m => {
      // 1) vinculo exato pela meta (programas lancados pelo botao da meta); 2) reserva: nome igual
      const alvo = (m.meta || '').slice(0, 120).toLowerCase();
      const pp = (pps || []).find(x => x.pei_meta_id === m.id) ||
        (pps || []).find(x => !x.pei_meta_id && x.programas && x.programas.nome.toLowerCase() === alvo);
      if (!pp) return '';
      const rot = { na_fila: ['Na fila', 'selo-neutro'], em_intervencao: ['Em intervencao', 'selo-warn'],
        dominado: ['Dominado', 'selo-ok'] };
      const r = rot[pp.status] || [pp.status, 'selo-neutro'];
      return '<span class="selo ' + r[1] + '" style="margin-left:6px">' + r[0] + '</span>';
    };

    const CORES_DOM = ['azul', 'teal', 'amarelo', 'rosa'];
    const fmtD = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '-';
    let corpo = '';
    Object.entries(porArea).forEach(([area, lista], ai) => {
      corpo += '<h2 style="margin-top:14px"><span class="ponto deq-' + CORES_DOM[ai % 4] + '"></span>' +
        escaparHtml(area) + ' <small style="font-weight:600">&middot; ' + lista.length + ' meta(s)</small></h2>' +
        '<table class="deq-freq"><tr><th style="text-align:left; padding-left:10px">Meta</th>' +
        '<th style="text-align:left">Recurso</th><th style="width:90px">Prazo</th></tr>' +
        lista.map(m =>
          '<tr><td style="width:auto; text-align:left; padding:6px 10px">' + escaparHtml(m.meta) +
          andamento(m) +
          (this.podeGerir()
            ? ' <button class="btn-chip nao-imprime" style="margin-left:6px" ' +
              'title="Cria um programa na biblioteca a partir desta meta e coloca na fila do paciente." ' +
              'onclick="MODULOS.pei.lancarPrograma(\'' + m.id + '\')">&#9654; Lancar</button>'
            : '') + '</td>' +
          '<td style="width:auto; text-align:left; padding:6px 10px">' + escaparHtml(m.recurso || '-') + '</td>' +
          '<td style="width:auto">' + escaparHtml(m.prazo || '-') + '</td></tr>').join('') +
        '</table>';
    });

    el.innerHTML =
      '<div class="pagina-cabecalho">' +
      '  <div>' +
      '    <button class="btn-voltar" onclick="MODULOS.pacientes.telaDetalhe(\'' + pei.pacientes.id + '\', \'pei\')">&larr; Prontuario</button>' +
      '    <h2>Plano de Ensino Individualizado</h2>' +
      '  </div>' +
      '  <button class="btn btn-primario" onclick="MODULOS.pei.docPEI(\'' + pei.id + '\')">&#128424; Imprimir / Enviar ao portal</button>' +
      '</div>' +

      '<div class="cartao"><div class="doc-eq">' +
      '<div class="deq-cab">' +
      '  <img src="icones/equilibrium.png" alt="Equilibrium">' +
      '  <div class="deq-cab-t"><h1>PLANO DE ENSINO INDIVIDUALIZADO</h1>' +
      '  <p>Equilibrium Terapia Infantil &middot; Psicoterapia ABA &middot; Formul&aacute;rio 02</p></div>' +
      '</div>' +
      '<div class="deq-caixa deq-dados" style="grid-template-columns:repeat(4, 1fr); margin-top:8px">' +
      '  <div><small>Paciente</small><b>' + escaparHtml(pei.pacientes.nome) + '</b></div>' +
      '  <div><small>Nascimento</small><b>' + fmtD(pei.pacientes.data_nascimento) + '</b></div>' +
      '  <div><small>Periodo</small><b>' + fmtD(pei.periodo_inicio) + ' a ' + fmtD(pei.periodo_fim) + '</b></div>' +
      '  <div style="border-bottom:none"><small>Responsavel tecnico</small><b>' +
           escaparHtml(pei.profissional ? pei.profissional.nome : '-') + '</b></div>' +
      '</div>' +
      (pei.finalidade
        ? '<div class="deq-caixa deq-texto" style="margin-top:8px"><b style="font-size:11px">Finalidade:</b> ' +
          escaparHtml(pei.finalidade) + '</div>' : '') +
      corpo +
      '<p class="sub nao-imprime" style="margin-top:10px">O selo ao lado da meta mostra o andamento do programa vinculado. ' +
      '&#9654; Lancar cria o programa na biblioteca e coloca na fila deste paciente. Para papel ou portal, use o botao la em cima.</p>' +
      '<div class="deq-rodape">' +
      '  <span>Equilibrium Terapia Infantil &middot; Uberl&acirc;ndia/MG</span>' +
      '  <span class="pontos"><i style="background:var(--eq-teal)"></i><i style="background:var(--eq-amarelo)"></i>' +
      '<i style="background:var(--eq-rosa)"></i><i style="background:var(--eq-azul)"></i></span>' +
      '  <span>CORTEX aba</span>' +
      '</div>' +
      '</div></div>';
  },

  // ─────────────────── RELATORIO DE DEVOLUTIVA ───────────────────

  async abrirDevolutiva(avaliacaoId) {
    const el = this.el();
    el.innerHTML = '<div class="cartao"><p class="sub">Carregando devolutiva...</p></div>';

    const { data: av } = await sb.from('avaliacoes')
      .select('id, paciente_id, protocolo, concluido_em, pacientes(id, nome, data_nascimento)')
      .eq('id', avaliacaoId).single();
    if (!av) return;
    const nomeProt = CADEIA.nomeProtocolo(av.protocolo);

    let { data: rel } = await sb.from('relatorios_devolutiva')
      .select('*').eq('avaliacao_id', avaliacaoId).maybeSingle();

    if (!rel && this.podeGerir()) {
      const { data: novo } = await sb.from('relatorios_devolutiva')
        .insert({ avaliacao_id: avaliacaoId, paciente_id: av.paciente_id,
                  criado_por: window.CORTEX_SESSAO.user.id })
        .select('*').single();
      rel = novo;
    }
    if (!rel) {
      el.innerHTML = '<div class="cartao"><p class="sub">Devolutiva ainda nao elaborada.</p></div>';
      return;
    }
    this._devolutiva = rel;

    const resultadoHtml = await MODULOS.avaliacoes.htmlResultado(avaliacaoId);
    const editavel = this.podeGerir() && rel.status !== 'finalizado';

    const campo = (id, rotulo, valor) =>
      '<div class="campo"><label>' + rotulo + '</label>' +
      (editavel
        ? '<textarea id="dev-' + id + '" rows="4" oninput="MODULOS.pei.salvarDevAuto()" ' +
          'style="resize:vertical">' + escaparHtml(valor || '') + '</textarea>'
        : '<div class="caixa-info larga"><b>' + (valor ? escaparHtml(valor) : '&mdash;') + '</b></div>') +
      '</div>';

    el.innerHTML =
      '<div class="pagina-cabecalho nao-imprime">' +
      '  <div>' +
      '    <button class="btn-voltar" onclick="MODULOS.pacientes.telaDetalhe(\'' + av.pacientes.id + '\', \'avaliacao\')">&larr; Prontuario</button>' +
      '    <h2>Relatorio de Devolutiva &middot; ' + escaparHtml(av.pacientes.nome) + '</h2>' +
      '    <p class="sub">' + (editavel ? 'Texto salvo automaticamente enquanto voce escreve.' :
        'Relatorio ' + rel.status + '.') + '</p>' +
      '  </div>' +
      '  <div style="display:flex; gap:8px">' +
      (editavel
        ? '<button class="btn btn-fantasma" onclick="MODULOS.pei.finalizarDevolutiva()">Finalizar</button>'
        : '') +
      '  <button class="btn btn-primario" onclick="MODULOS.pei.docAvaliacao()">&#128196; Documento oficial</button>' +
      '  </div>' +
      '</div>' +

      '<div class="cartao folha-presenca">' +
      '  <div class="folha-titulo">' +
      '    <div><b>RELATORIO DE DEVOLUTIVA &middot; ' + nomeProt.toUpperCase() + '</b>' +
      '    <small>' + escaparHtml(av.pacientes.nome) + ' &middot; nasc. ' +
        new Date(av.pacientes.data_nascimento + 'T12:00:00').toLocaleDateString('pt-BR') +
        ' &middot; avaliacao concluida em ' +
        (av.concluido_em ? new Date(av.concluido_em).toLocaleDateString('pt-BR') : '-') + '</small></div>' +
      '    <span class="folha-marca">CORTEX aba &middot; Equilibrium Terapia Infantil</span>' +
      '  </div>' +
      resultadoHtml +
      campo('demanda', 'II. Descricao da demanda', rel.demanda) +
      campo('procedimento', 'III. Procedimento', rel.procedimento) +
      '<h3 style="margin-top:14px">IV. Analise por dominio</h3>' +
      '<p class="sub" style="margin-bottom:8px">Apresente o resultado e os atrasos identificados em cada area. ' +
      'O texto institucional que descreve cada dominio ja sai automaticamente no documento oficial.</p>' +
      MODULOS.pei.DOMINIOS.map(d => campo('an-' + d[0], d[1], (rel.analises || {})[d[0]])).join('') +
      campo('conclusao', 'V. Conclusao', rel.conclusao) +
      '</div>';

    if (editavel) {
      if (!rel.demanda) {
        const elD = document.getElementById('dev-demanda');
        if (elD) elD.placeholder = 'Paciente do sexo ..., com ... anos, encaminhado(a) pelo(a) Dr.(a) ..., ' +
          'para avaliacao do desenvolvimento e comportamento infantil, e planejamento da intervencao ABA, em virtude de ...';
      }
      if (!rel.procedimento) {
        const elP = document.getElementById('dev-procedimento');
        if (elP) elP.value = 'Foi utilizado questionario estruturado com base em ferramentas padronizadas de ' +
          'avaliacao do desenvolvimento infantil: VB-MAPP, Inventario Portage, Bayley-III e Vineland-II, ' +
          'organizado por faixas etarias e dominios do neurodesenvolvimento: Linguagem Receptiva, Linguagem ' +
          'Expressiva, Cognicao, Motricidade Grossa, Motricidade Fina e Socializacao. Sua aplicacao ocorreu ' +
          'ao longo de XX sessoes de 40 minutos, por meio de observacao clinica e interacao direta entre ' +
          'terapeuta e paciente.';
      }
    }
  },

  DOMINIOS: [
    ['lr', 'Linguagem Receptiva'],
    ['le', 'Linguagem Expressiva'],
    ['cog', 'Cognicao'],
    ['mg', 'Motricidade Grossa'],
    ['mf', 'Motricidade Fina'],
    ['soc', 'Socializacao']
  ],

  DOMINIO_DESC: {
    lr: 'Esta \u00e1rea avalia a capacidade da crian\u00e7a de compreender a linguagem falada. Engloba desde a rea\u00e7\u00e3o a sons e o reconhecimento de palavras familiares at\u00e9 a compreens\u00e3o de instru\u00e7\u00f5es simples, perguntas complexas e no\u00e7\u00f5es temporais. A linguagem receptiva \u00e9 a base para uma comunica\u00e7\u00e3o eficaz, refletindo o quanto a crian\u00e7a \u00e9 capaz de processar e interpretar informa\u00e7\u00f5es verbais oriundas do ambiente.',
    le: 'Refere-se \u00e0 habilidade da crian\u00e7a de se comunicar verbalmente ou por meio de outros recursos expressivos. Abrange desde vocaliza\u00e7\u00f5es e balbucios iniciais at\u00e9 a imita\u00e7\u00e3o de sons, uso de gestos com intencionalidade comunicativa, nomea\u00e7\u00e3o de objetos e pessoas, formula\u00e7\u00e3o de frases simples e relato de eventos. Esta \u00e1rea demonstra a capacidade da crian\u00e7a de se expressar de maneira compreens\u00edvel para os outros.',
    cog: 'Esta \u00e1rea investiga os processos mentais relacionados ao pensamento, aten\u00e7\u00e3o, mem\u00f3ria, aprendizagem e resolu\u00e7\u00e3o de problemas. As habilidades avaliadas incluem explora\u00e7\u00e3o do ambiente, aten\u00e7\u00e3o sustentada, associa\u00e7\u00e3o e identifica\u00e7\u00e3o de imagens/objetos, discrimina\u00e7\u00e3o de caracter\u00edsticas, reconhecimento de padr\u00f5es e compreens\u00e3o de rela\u00e7\u00f5es de causa e efeito. Trata-se de uma \u00e1rea fundamental para o desenvolvimento intelectual e para a constru\u00e7\u00e3o de estrat\u00e9gias de intera\u00e7\u00e3o com o meio.',
    mg: 'Avalia o desenvolvimento dos grandes grupos musculares envolvidos em movimentos amplos e coordenados. Inclui habilidades como rolar, sentar, engatinhar, andar (com e sem apoio), correr, saltar, chutar bola e subir/descer escadas. O dom\u00ednio da motricidade grossa est\u00e1 diretamente relacionado \u00e0 autonomia da crian\u00e7a, permitindo maior explora\u00e7\u00e3o e intera\u00e7\u00e3o com o ambiente f\u00edsico.',
    mf: 'Diz respeito \u00e0 coordena\u00e7\u00e3o dos pequenos m\u00fasculos, especialmente das m\u00e3os e dos dedos, necess\u00e1ria para tarefas que exigem precis\u00e3o. S\u00e3o investigadas habilidades como segurar e manipular objetos, empilhar blocos, encaixar pe\u00e7as, rabiscar, desenhar, recortar, utilizar instrumentos como l\u00e1pis e apontador, e manusear objetos pequenos. Essa \u00e1rea \u00e9 essencial n\u00e3o s\u00f3 para brincadeiras que envolvam destreza manual e para o processo de escrita, mas tamb\u00e9m para o desempenho independente em atividades de vida di\u00e1ria, como usar talheres, aboto\u00e1-las, amarrar os sapatos e pentear o cabelo.',
    soc: 'Explora a forma como a crian\u00e7a se relaciona com os outros e desenvolve habilidades sociais e emocionais. S\u00e3o observados comportamentos como estabelecimento de contato visual, sorriso em resposta \u00e0 intera\u00e7\u00e3o, interesse por outras crian\u00e7as, imita\u00e7\u00e3o de gestos e express\u00f5es, compartilhamento de brinquedos, participa\u00e7\u00e3o em brincadeiras cooperativas, express\u00e3o de sentimentos, compreens\u00e3o e respeito \u00e0s regras, demonstra\u00e7\u00e3o de empatia e capacidade de solicitar ajuda ou pedir desculpas. Essa \u00e1rea \u00e9 fundamental para a forma\u00e7\u00e3o de v\u00ednculos, adapta\u00e7\u00e3o a contextos sociais e desenvolvimento da intelig\u00eancia emocional.'
  },

  _devTimer: null,
  salvarDevAuto() {
    clearTimeout(this._devTimer);
    this._devTimer = setTimeout(async () => {
      const analises = {};
      MODULOS.pei.DOMINIOS.forEach(d => {
        analises[d[0]] = document.getElementById('dev-an-' + d[0])?.value || null;
      });
      const dados = {
        demanda: document.getElementById('dev-demanda')?.value || null,
        procedimento: document.getElementById('dev-procedimento')?.value || null,
        analises: analises,
        conclusao: document.getElementById('dev-conclusao')?.value || null
      };
      await sb.from('relatorios_devolutiva').update(dados).eq('id', this._devolutiva.id);
      Object.assign(this._devolutiva, dados);
    }, 700);
  },

  async finalizarDevolutiva() {
    if (!await popConfirmar('Finalizar a devolutiva? Depois ela fica somente leitura.')) return;
    clearTimeout(this._devTimer);
    const analises = {};
    MODULOS.pei.DOMINIOS.forEach(d => {
      analises[d[0]] = document.getElementById('dev-an-' + d[0])?.value || null;
    });
    const dados = {
      demanda: document.getElementById('dev-demanda')?.value || null,
      procedimento: document.getElementById('dev-procedimento')?.value || null,
      analises: analises,
      conclusao: document.getElementById('dev-conclusao')?.value || null,
      status: 'finalizado',
      finalizado_em: new Date().toISOString()
    };
    const { error } = await sb.from('relatorios_devolutiva')
      .update(dados).eq('id', this._devolutiva.id);
    if (error) { alert('Erro: ' + error.message); return; }
    this.abrirDevolutiva(this._devolutiva.avaliacao_id);
  },

  // ─────────── DOCUMENTO OFICIAL: Relatorio de Avaliacao (identidade Equilibrium) ───────────

  async docAvaliacao() {
    const rel = this._devolutiva;
    if (!rel) return;

    const ov = document.createElement('div');
    ov.id = 'doc-eq-overlay';
    ov.className = 'folha-overlay';
    ov.innerHTML = '<div class="folha-pagina" id="doc-eq-corpo" style="max-width:900px">' +
      '<p class="sub">Montando o documento...</p></div>';
    document.body.appendChild(ov);

    const [rAv, rPlano] = await Promise.all([
      sb.from('avaliacoes')
        .select('concluido_em, avaliador:profiles!avaliacoes_avaliador_id_fkey(nome), pacientes(nome, data_nascimento)')
        .eq('id', rel.avaliacao_id).single(),
      sb.from('planos_terapeuticos').select('frequencia_semanal').eq('paciente_id', rel.paciente_id)
        .eq('status', 'ativo').order('criado_em', { ascending: false }).limit(1)
    ]);
    const av = rAv.data;
    const pac = av.pacientes;
    const freq = rPlano.data && rPlano.data[0] && rPlano.data[0].frequencia_semanal
      ? rPlano.data[0].frequencia_semanal + ' sessoes semanais de 40 minutos' : '&mdash;';
    const fmt = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '&mdash;';

    const secTexto = (classe, titulo, valor) =>
      '<h2><span class="ponto ' + classe + '"></span>' + titulo + '</h2>' +
      '<div class="deq-caixa deq-texto">' + escaparHtml(valor || '') + '</div>';

    const dominios = this.DOMINIOS.map((d, i) => {
      const cores = ['deq-teal', 'deq-amarelo', 'deq-rosa', '', 'deq-teal', 'deq-amarelo'];
      const texto = (rel.analises || {})[d[0]] || rel.analise || '';
      return '<h2 style="margin-top:12px"><span class="ponto ' + cores[i] + '"></span>' + d[1] + '</h2>' +
        '<div class="deq-caixa">' +
        '<div class="deq-texto" style="min-height:0; color:var(--eq-cinza); font-size:11px; ' +
        'border-bottom:1px solid var(--eq-linha); background:var(--eq-fundo)">' +
        this.DOMINIO_DESC[d[0]] + '</div>' +
        '<div class="deq-texto">' + escaparHtml((rel.analises || {})[d[0]] || '') + '</div>' +
        '</div>';
    }).join('');

    window._docPortal = { paciente_id: rel.paciente_id, tipo: 'avaliacao', titulo: 'Relatorio de Avaliacao' };
    document.getElementById('doc-eq-corpo').innerHTML =
      '<div class="pagina-cabecalho nao-imprime">' +
      '  <div><button class="btn-voltar" onclick="document.getElementById(\'doc-eq-overlay\').remove()">&larr; Fechar</button>' +
      '  <h2>Relatorio de avaliacao &middot; documento oficial</h2></div>' +
      '  <button class="btn btn-primario" onclick="window.print()">&#128424; Imprimir / PDF</button>' +
      portalBtn() +
      '</div>' +

      '<div class="doc-eq">' +
      '<div class="deq-cab">' +
      '  <img src="icones/equilibrium.png" alt="Equilibrium">' +
      '  <div class="deq-cab-t"><h1>RELAT&Oacute;RIO</h1>' +
      '  <p>Avalia&ccedil;&atilde;o do Desenvolvimento e Comportamento Infantil</p></div>' +
      '</div>' +

      '<h2><span class="ponto deq-teal"></span>I. Identifica&ccedil;&atilde;o</h2>' +
      '<div class="deq-caixa deq-dados" style="grid-template-columns:2fr 1fr 1fr">' +
      '  <div><small>Nome</small><b>' + escaparHtml(pac.nome) + '</b></div>' +
      '  <div><small>Data de nascimento</small><b>' + fmt(pac.data_nascimento) + '</b></div>' +
      '  <div><small>Avalia&ccedil;&atilde;o conclu&iacute;da em</small><b>' +
           (av.concluido_em ? new Date(av.concluido_em).toLocaleDateString('pt-BR') : '&mdash;') + '</b></div>' +
      '  <div style="grid-column:span 1; border-bottom:none"><small>Psic&oacute;logo respons&aacute;vel</small>' +
      '  <b>Wessilon Marques de Sousa - CRP 04/53832</b></div>' +
      '  <div style="border-bottom:none"><small>Especialidade</small><b>Psicoterapia ABA</b></div>' +
      '  <div style="border-bottom:none"><small>Frequ&ecirc;ncia terap&ecirc;utica</small><b>' + freq + '</b></div>' +
      '</div>' +

      secTexto('deq-amarelo', 'II. Descri&ccedil;&atilde;o da Demanda', rel.demanda) +
      secTexto('deq-rosa', 'III. Procedimento', rel.procedimento) +

      '<h2 style="margin-top:16px"><span class="ponto"></span>IV. An&aacute;lise</h2>' +
      dominios +

      secTexto('deq-teal', 'V. Conclus&atilde;o', rel.conclusao) +

      '<div class="deq-local">Uberl&acirc;ndia-MG, ' + new Date().toLocaleDateString('pt-BR') + '</div>' +
      '<div class="deq-assinatura">Wessilon Marques de Sousa<br>' +
      'Neuropsic&oacute;logo e Analista do Comportamento<br>CRP 04/53832</div>' +

      '<div class="deq-rodape">' +
      '  <span>Equilibrium Terapia Infantil &middot; Uberl&acirc;ndia/MG</span>' +
      '  <span class="pontos"><i style="background:var(--eq-teal)"></i><i style="background:var(--eq-amarelo)"></i>' +
      '<i style="background:var(--eq-rosa)"></i><i style="background:var(--eq-azul)"></i></span>' +
      '  <span>Documento gerado pelo CORTEX aba &middot; ' + new Date().toLocaleDateString('pt-BR') + '</span>' +
      '</div>' +
      '</div>';
  },

  // ─────────── DOCUMENTO OFICIAL: PEI / Formulario 02 (identidade Equilibrium) ───────────

  async docPEI(peiId) {
    const ov = document.createElement('div');
    ov.id = 'doc-eq-overlay';
    ov.className = 'folha-overlay';
    ov.innerHTML = '<div class="folha-pagina" id="doc-eq-corpo" style="max-width:960px">' +
      '<p class="sub">Montando o documento...</p></div>';
    document.body.appendChild(ov);

    const { data: pei } = await sb.from('peis')
      .select('*, pacientes(nome, data_nascimento), profissional:profiles!peis_profissional_id_fkey(nome), pei_metas(*)')
      .eq('id', peiId).single();
    if (!pei) { ov.remove(); return; }

    const fmt = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '&mdash;';
    const metas = (pei.pei_metas || []).sort((a, b) => a.ordem - b.ordem);
    const porArea = {};
    metas.forEach(m => { (porArea[m.area] = porArea[m.area] || []).push(m); });
    const cores = ['deq-teal', 'deq-amarelo', 'deq-rosa', ''];

    const blocos = Object.entries(porArea).map(([area, lista], ix) =>
      '<h2 style="margin-top:12px"><span class="ponto ' + cores[ix % 4] + '"></span>' + escaparHtml(area) +
      ' <small>&middot; ' + lista.length + ' meta(s)</small></h2>' +
      '<div class="deq-caixa">' +
      '<table style="width:100%; border-collapse:collapse; font-size:12px">' +
      '<tr><th style="text-align:left; padding:7px 12px; background:var(--eq-azul); color:#fff; font-size:10.5px; letter-spacing:.06em">META</th>' +
      '<th style="text-align:left; padding:7px 12px; background:var(--eq-azul); color:#fff; font-size:10.5px; letter-spacing:.06em; width:220px">RECURSO</th>' +
      '<th style="text-align:left; padding:7px 12px; background:var(--eq-azul); color:#fff; font-size:10.5px; letter-spacing:.06em; width:95px">PRAZO</th></tr>' +
      lista.map(m =>
        '<tr>' +
        '<td style="padding:7px 12px; border-top:1px solid var(--eq-linha); line-height:1.55">' + escaparHtml(m.meta) + '</td>' +
        '<td style="padding:7px 12px; border-top:1px solid var(--eq-linha)">' + escaparHtml(m.recurso || '&mdash;') + '</td>' +
        '<td style="padding:7px 12px; border-top:1px solid var(--eq-linha)">' + escaparHtml(m.prazo || '&mdash;') + '</td></tr>').join('') +
      '</table></div>').join('');

    window._docPortal = { paciente_id: pei.paciente_id, tipo: 'pei', titulo: 'PEI' };
    document.getElementById('doc-eq-corpo').innerHTML =
      '<div class="pagina-cabecalho nao-imprime">' +
      '  <div><button class="btn-voltar" onclick="document.getElementById(\'doc-eq-overlay\').remove()">&larr; Fechar</button>' +
      '  <h2>PEI &middot; documento oficial</h2></div>' +
      '  <button class="btn btn-primario" onclick="window.print()">&#128424; Imprimir / PDF</button>' +
      portalBtn() +
      '</div>' +

      '<div class="doc-eq">' +
      '<div class="deq-cab">' +
      '  <img src="icones/equilibrium.png" alt="Equilibrium">' +
      '  <div class="deq-cab-t"><h1>PLANO DE ENSINO INDIVIDUALIZADO</h1>' +
      '  <p>Equilibrium Terapia Infantil &middot; Psicoterapia ABA</p></div>' +
      '  <span class="deq-pilula">' + fmt(pei.periodo_inicio) + ' &ndash; ' + fmt(pei.periodo_fim) + '</span>' +
      '</div>' +

      '<h2><span class="ponto deq-teal"></span>Identifica&ccedil;&atilde;o</h2>' +
      '<div class="deq-caixa deq-dados" style="grid-template-columns:2fr 1fr 1.4fr">' +
      '  <div style="border-bottom:none"><small>Paciente</small><b>' + escaparHtml(pei.pacientes.nome) + '</b></div>' +
      '  <div style="border-bottom:none"><small>Nascimento</small><b>' + fmt(pei.pacientes.data_nascimento) + '</b></div>' +
      '  <div style="border-bottom:none"><small>Respons&aacute;vel T&eacute;cnico</small><b>' +
           escaparHtml(pei.profissional ? pei.profissional.nome : '&mdash;') + '</b></div>' +
      '</div>' +

      (pei.finalidade
        ? '<h2><span class="ponto deq-amarelo"></span>Finalidade</h2>' +
          '<div class="deq-caixa deq-texto" style="min-height:0">' + escaparHtml(pei.finalidade) + '</div>' : '') +

      blocos +

      '<div class="deq-assinatura">' + escaparHtml(pei.profissional ? pei.profissional.nome : '') +
      '<br>Respons&aacute;vel T&eacute;cnico / N&ordm; do Registro de Classe</div>' +

      '<div class="deq-rodape">' +
      '  <span>Equilibrium Terapia Infantil &middot; Uberl&acirc;ndia/MG</span>' +
      '  <span class="pontos"><i style="background:var(--eq-teal)"></i><i style="background:var(--eq-amarelo)"></i>' +
      '<i style="background:var(--eq-rosa)"></i><i style="background:var(--eq-azul)"></i></span>' +
      '  <span>Documento gerado pelo CORTEX aba &middot; ' + new Date().toLocaleDateString('pt-BR') + '</span>' +
      '</div>' +
      '</div>';
  },

  // ─────────────── Meta do PEI vira programa na fila ───────────────

  async lancarPrograma(metaId) {
    const { data: m } = await sb.from('pei_metas')
      .select('*, peis(paciente_id)').eq('id', metaId).single();
    if (!m) return;
    if (!await popConfirmar('Criar o programa "' + (m.meta || '').slice(0, 60) +
        '" na biblioteca e coloca-lo NA FILA deste paciente?')) return;

    const { data: prog, error: e1 } = await sb.from('programas').insert({
      nome: (m.meta || '').slice(0, 120),
      area: m.area || 'Habilidades Sociais',
      objetivo: m.meta,
      procedimento: m.recurso || null,
      criterio_avanco: m.prazo ? 'Prazo do PEI: ' + m.prazo : null,
      ativo: true
    }).select('id').single();
    if (e1) { alert(e1.message); return; }

    const { error: e2 } = await sb.from('paciente_programas').insert({
      paciente_id: m.peis.paciente_id,
      programa_id: prog.id,
      status: 'na_fila',
      pei_id: m.pei_id,
      pei_meta_id: m.id,
      criado_por: window.CORTEX_SESSAO.user.id
    });
    if (e2) { alert(e2.message); return; }
    alert('Programa criado e colocado na fila. Ajuste niveis e tentativas no menu Programas se precisar.');
  }
};
