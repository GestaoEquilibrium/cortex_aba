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
      .select('id, concluido_em')
      .eq('paciente_id', pacienteId).eq('status', 'concluida')
      .order('concluido_em', { ascending: false }).limit(1);

    const temAvaliacao = avs && avs.length > 0;

    let html = '';
    if (this.podeGerir()) {
      html += '<div class="aba-acoes">' +
        (temAvaliacao
          ? '<button class="btn btn-primario" ' +
            'title="Gera as metas candidatas a partir dos Nao da ultima avaliacao QADI-R concluida (' +
            new Date(avs[0].concluido_em).toLocaleDateString('pt-BR') + ')." ' +
            'onclick="MODULOS.pei.abrirConstrutor(\'' + avs[0].id + '\', \'' + pacienteId + '\')">+ Elaborar PEI</button>' +
            '<span class="sub">A partir da avaliacao de ' +
            new Date(avs[0].concluido_em).toLocaleDateString('pt-BR') + '</span>'
          : '<button class="btn btn-primario" disabled ' +
            'title="E preciso uma avaliacao QADI-R concluida para elaborar o PEI.">+ Elaborar PEI</button>' +
            '<span class="sub">Conclua uma avaliacao QADI-R na aba Avaliacao para liberar.</span>') +
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
    const el = this.el();
    el.innerHTML = '<div class="cartao"><p class="sub">Preparando metas candidatas...</p></div>';

    await MODULOS.avaliacoes.carregarQuestoes();
    const questoes = MODULOS.avaliacoes.questoes;

    const [{ data: pac }, { data: resps }, { data: equipe }] = await Promise.all([
      sb.from('pacientes').select('id, nome, data_nascimento, aplicador_id').eq('id', pacienteId).single(),
      sb.from('avaliacao_respostas').select('questao_id, resposta').eq('avaliacao_id', avaliacaoId),
      sb.from('profiles').select('id, nome').eq('atende_pacientes', true).eq('ativo', true).order('nome')
    ]);

    const mapa = {};
    (resps || []).forEach(r => { mapa[r.questao_id] = r.resposta; });

    const candidatas = questoes
      .filter(q => mapa[q.id] === 'N')
      .map(q => ({ area: q.area, faixa: q.faixa, questao_id: q.id,
                   meta: q.pergunta.replace(/\?$/, '').trim() }));

    this._construtor = { avaliacaoId, paciente: pac, candidatas, seq: 0 };

    const hoje = new Date();
    const fim = new Date(hoje); fim.setMonth(fim.getMonth() + 6);

    const porArea = {};
    MODULOS.avaliacoes.AREAS.forEach(a => { porArea[a] = candidatas.filter(c => c.area === a); });

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
      '    <p class="sub">' + candidatas.length + ' metas candidatas geradas dos "Nao" do QADI-R. ' +
      'Desmarque as que nao entram, ajuste o texto e defina recurso e prazo.</p>' +
      '  </div>' +
      '  <button class="btn btn-primario" onclick="MODULOS.pei.salvarPei()">Salvar PEI</button>' +
      '</div>' +

      '<div class="cartao faixa-azul"><h3>Identificacao (Formulario 02)</h3>' +
      '<div class="grade-form">' +
      '  <div class="campo c3"><label>Finalidade</label>' +
      '    <textarea id="pei-finalidade" rows="2">Desenvolver habilidades essenciais identificadas na avaliacao QADI-R, promovendo autonomia, comunicacao e interacao social.</textarea></div>' +
      '  <div class="campo"><label>Periodo - inicio</label>' +
      '    <input type="date" id="pei-inicio" value="' + hoje.toISOString().slice(0, 10) + '"></div>' +
      '  <div class="campo"><label>Periodo - fim</label>' +
      '    <input type="date" id="pei-fim" value="' + fim.toISOString().slice(0, 10) + '"></div>' +
      '  <div class="campo"><label>Profissional responsavel</label>' +
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
    return '<div class="pei-meta" data-area="' + escaparHtml(area) + '" data-questao="' + (c.questao_id || '') + '">' +
      '<label class="check pei-check"><input type="checkbox" checked></label>' +
      '<div class="pei-campos">' +
      '  <input class="pm-meta" value="' + escaparHtml(c.meta || '') + '" placeholder="Meta">' +
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
        avaliacao_id: ctx.avaliacaoId,
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

    let tabela = '<table class="tabela-presenca"><thead><tr>' +
      '<th style="width:150px">Area de estimulo</th><th>Meta</th>' +
      '<th style="width:220px">Recurso</th><th style="width:100px">Prazo</th></tr></thead><tbody>';
    Object.entries(porArea).forEach(([area, lista]) => {
      lista.forEach((m, i) => {
        tabela += '<tr>' +
          (i === 0 ? '<td rowspan="' + lista.length + '" style="vertical-align:top"><b>' + escaparHtml(area) + '</b></td>' : '') +
          '<td>' + escaparHtml(m.meta) + '</td>' +
          '<td>' + escaparHtml(m.recurso || '-') + '</td>' +
          '<td>' + escaparHtml(m.prazo || '-') + '</td></tr>';
      });
    });
    tabela += '</tbody></table>';

    el.innerHTML =
      '<div class="pagina-cabecalho nao-imprime">' +
      '  <div>' +
      '    <button class="btn-voltar" onclick="MODULOS.pacientes.telaDetalhe(\'' + pei.pacientes.id + '\', \'pei\')">&larr; Prontuario</button>' +
      '    <h2>Plano de Ensino Individualizado</h2>' +
      '  </div>' +
      '  <button class="btn btn-primario" onclick="window.print()">&#128424; Imprimir</button>' +
      '</div>' +

      '<div class="cartao folha-presenca">' +
      '  <div class="folha-titulo">' +
      '    <div><b>PLANO DE ENSINO INDIVIDUALIZADO</b>' +
      '    <small>Formulario 02 &middot; Psicoterapia ABA</small></div>' +
      '    <span class="folha-marca">CORTEX aba &middot; Equilibrium Terapia Infantil</span>' +
      '  </div>' +
      '  <div class="grade-visao" style="margin-bottom:14px">' +
      '    <div class="caixa-info larga"><small>Paciente</small><b>' + escaparHtml(pei.pacientes.nome) + '</b></div>' +
      '    <div class="caixa-info"><small>Nascimento</small><b>' +
        new Date(pei.pacientes.data_nascimento + 'T12:00:00').toLocaleDateString('pt-BR') + '</b></div>' +
      '    <div class="caixa-info"><small>Periodo</small><b>' +
        (pei.periodo_inicio ? new Date(pei.periodo_inicio + 'T12:00:00').toLocaleDateString('pt-BR') : '-') + ' a ' +
        (pei.periodo_fim ? new Date(pei.periodo_fim + 'T12:00:00').toLocaleDateString('pt-BR') : '-') + '</b></div>' +
      '    <div class="caixa-info"><small>Profissional responsavel</small><b>' +
        escaparHtml(pei.profissional ? pei.profissional.nome : '-') + '</b></div>' +
      (pei.finalidade ? '<div class="caixa-info larga"><small>Finalidade</small><b>' +
        escaparHtml(pei.finalidade) + '</b></div>' : '') +
      '  </div>' +
      tabela +
      '</div>';
  },

  // ─────────────────── RELATORIO DE DEVOLUTIVA ───────────────────

  async abrirDevolutiva(avaliacaoId) {
    const el = this.el();
    el.innerHTML = '<div class="cartao"><p class="sub">Carregando devolutiva...</p></div>';

    const { data: av } = await sb.from('avaliacoes')
      .select('id, paciente_id, concluido_em, pacientes(id, nome, data_nascimento)')
      .eq('id', avaliacaoId).single();
    if (!av) return;

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
      '  <button class="btn btn-primario" onclick="window.print()">&#128424; Imprimir</button>' +
      '  </div>' +
      '</div>' +

      '<div class="cartao folha-presenca">' +
      '  <div class="folha-titulo">' +
      '    <div><b>RELATORIO DE DEVOLUTIVA &middot; QADI-R</b>' +
      '    <small>' + escaparHtml(av.pacientes.nome) + ' &middot; nasc. ' +
        new Date(av.pacientes.data_nascimento + 'T12:00:00').toLocaleDateString('pt-BR') +
        ' &middot; avaliacao concluida em ' +
        (av.concluido_em ? new Date(av.concluido_em).toLocaleDateString('pt-BR') : '-') + '</small></div>' +
      '    <span class="folha-marca">CORTEX aba &middot; Equilibrium Terapia Infantil</span>' +
      '  </div>' +
      resultadoHtml +
      campo('demanda', 'Demanda', rel.demanda) +
      campo('procedimento', 'Procedimento', rel.procedimento) +
      campo('analise', 'Analise clinica', rel.analise) +
      campo('conclusao', 'Conclusao', rel.conclusao) +
      '</div>';
  },

  _devTimer: null,
  salvarDevAuto() {
    clearTimeout(this._devTimer);
    this._devTimer = setTimeout(async () => {
      const dados = {
        demanda: document.getElementById('dev-demanda')?.value || null,
        procedimento: document.getElementById('dev-procedimento')?.value || null,
        analise: document.getElementById('dev-analise')?.value || null,
        conclusao: document.getElementById('dev-conclusao')?.value || null
      };
      await sb.from('relatorios_devolutiva').update(dados).eq('id', this._devolutiva.id);
    }, 700);
  },

  async finalizarDevolutiva() {
    if (!confirm('Finalizar a devolutiva? Depois ela fica somente leitura.')) return;
    clearTimeout(this._devTimer);
    const dados = {
      demanda: document.getElementById('dev-demanda')?.value || null,
      procedimento: document.getElementById('dev-procedimento')?.value || null,
      analise: document.getElementById('dev-analise')?.value || null,
      conclusao: document.getElementById('dev-conclusao')?.value || null,
      status: 'finalizado',
      finalizado_em: new Date().toISOString()
    };
    const { error } = await sb.from('relatorios_devolutiva')
      .update(dados).eq('id', this._devolutiva.id);
    if (error) { alert('Erro: ' + error.message); return; }
    this.abrirDevolutiva(this._devolutiva.avaliacao_id);
  }
};
