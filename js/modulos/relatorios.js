// ============================================================================
// CORTEX aba - js/modulos/relatorios.js
// Sprint 11: Relatorio Mensal (Formulario 07) em linguagem para a familia.
// A equipe elabora com um painel de dados do mes ao lado; ao liberar, o
// relatorio aparece no portal da familia e os responsaveis sao notificados.
// ============================================================================

window.MODULOS = window.MODULOS || {};

window.MODULOS.relatorios = {

  el() { return document.getElementById('pagina'); },
  podeGerir() { return perm('relatorios.mensal') === 'E'; },

  mesRotulo(mes) {
    const d = new Date(mes + '-15T12:00:00');
    const r = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    return r.charAt(0).toUpperCase() + r.slice(1);
  },

  // ─────────────── ABA RELATORIOS DO PRONTUARIO ───────────────

  async htmlDoPacienteBase(pacienteId) {
    this._pacienteId = pacienteId;
    const { data } = await sb.from('relatorios_mensais')
      .select('id, mes, status, liberado_em, elaborado:profiles!relatorios_mensais_elaborado_por_fkey(nome)')
      .eq('paciente_id', pacienteId)
      .order('mes', { ascending: false });
    const lista = data || [];

    const mesAtual = new Date().toISOString().slice(0, 7);

    let html = '';
    if (this.podeGerir()) {
      html += '<div class="cartao faixa-ambar"><h3>Novo relatorio mensal</h3>' +
        '<div class="grade-form">' +
        '<div class="campo"><label>Mes de referencia</label>' +
        '<input type="month" id="rm-mes" value="' + mesAtual + '"></div>' +
        '<div class="campo" style="display:flex; align-items:flex-end">' +
        '<button class="btn btn-primario" onclick="MODULOS.relatorios.abrirEditor(\'' +
        pacienteId + '\', document.getElementById(\'rm-mes\').value)">Elaborar</button></div>' +
        '</div>' +
        '<p class="sub">Se o mes ja tiver relatorio, ele sera aberto para continuar.</p></div>';
    }

    html += '<div class="cartao"><h3>Historico</h3>' +
      (lista.length ? lista.map(r =>
        '<div class="linha-doc"><div><b>' + this.mesRotulo(r.mes.slice(0, 7)) + '</b>' +
        '<small>' + (r.elaborado ? 'Por ' + escaparHtml(r.elaborado.nome) : '') +
        (r.liberado_em ? ' &middot; liberado em ' + new Date(r.liberado_em).toLocaleDateString('pt-BR') : '') +
        '</small></div>' +
        '<div class="pac-selos">' +
        (r.status === 'liberado' ? '<span class="selo selo-ok">No portal</span>'
          : r.status === 'gerado' ? '<span class="selo selo-info">Gerado</span>'
          : '<span class="selo selo-warn">Rascunho</span>') +
        '<button class="btn-chip" onclick="MODULOS.relatorios.abrirEditor(\'' + pacienteId +
        '\', \'' + r.mes.slice(0, 7) + '\')">' +
        (r.status !== 'rascunho' || !this.podeGerir() ? 'Abrir' : 'Continuar') + '</button>' +
        '</div></div>').join('')
      : '<p class="sub">Nenhum relatorio elaborado.</p>') +
      '</div>';

    return html;
  },

  // ─────────────── TEXTOS FIXOS E ASSINATURA PADRAO ───────────────
  ASSINATURA_PADRAO: { nome: 'Wessilon Marques de Sousa', titulo: 'Psic\u00f3logo e Analista do Comportamento \u00b7 CRP 04/53832' },
  NOMES_DIA: ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'],
  COR_PROG: ['#1468B2', '#56C4CF', '#F3B63D', '#E9586A', '#7C6FD0', '#3E9C6E', '#E07A2F', '#0EA5E9'],

  intervaloMes(mes) {
    const inicio = mes + '-01';
    const fimD = new Date(mes + '-01T12:00:00');
    fimD.setMonth(fimD.getMonth() + 1); fimD.setDate(0);
    return { inicio, fim: fimD.toISOString().slice(0, 10) };
  },

  // ─────────────── DADOS DO MES (tudo que o relatorio usa) ───────────────
  async dadosDoMes(pacienteId, mes) {
    const { inicio, fim } = this.intervaloMes(mes);
    const { data: sessoes } = await sb.from('sessoes')
      .select('id, data, hora_inicio, status').eq('paciente_id', pacienteId)
      .gte('data', inicio).lte('data', fim).order('data').order('hora_inicio');
    const lista = sessoes || [];
    const ids = lista.map(s => s.id);
    let fotos = [], evolucoes = [], compRegs = [];
    if (ids.length) {
      const [rF, rE, rC] = await Promise.all([
        sb.from('programa_sessao_registros')
          .select('sessao_id, paciente_programa_id, pct_corretos, corretos, tentativas, tentativas_sessao, nao_aplicado, motivo_nao_aplicado, paciente_programas(programas(id, nome, area, objetivo, procedimento))')
          .in('sessao_id', ids),
        sb.from('evolucoes').select('sessao_id, texto').in('sessao_id', ids),
        sb.from('comportamento_registros').select('sessao_id, data, descricao, comportamentos(nome)').in('sessao_id', ids)
      ]);
      fotos = rF.data || []; evolucoes = rE.data || []; compRegs = rC.data || [];
    }
    const dataDe = {}; lista.forEach(s => { dataDe[s.id] = s.data; });
    // por programa: serie de % por sessao (ordem cronologica)
    const porProg = {};
    fotos.filter(f => !f.nao_aplicado && f.paciente_programas && f.paciente_programas.programas).forEach(f => {
      const p = f.paciente_programas.programas;
      const e = porProg[p.id] = porProg[p.id] || { nome: p.nome, area: p.area, objetivo: p.objetivo || p.procedimento || '', serie: [] };
      e.serie.push({ data: dataDe[f.sessao_id], pct: f.pct_corretos, corretos: f.corretos, n: f.tentativas_sessao || f.tentativas });
    });
    Object.values(porProg).forEach(e => e.serie.sort((a, b) => a.data.localeCompare(b.data)));
    const naoAplicados = fotos.filter(f => f.nao_aplicado).map(f => ({
      nome: f.paciente_programas?.programas?.nome || 'programa', motivo: f.motivo_nao_aplicado, data: dataDe[f.sessao_id] }));
    return {
      sessoes: lista,
      concluidas: lista.filter(s => s.status === 'concluida').length,
      faltas: lista.filter(s => s.status === 'falta').length,
      canceladas: lista.filter(s => s.status === 'cancelada').length,
      porProg, naoAplicados,
      evolucoes: evolucoes.map(e => ({ data: dataDe[e.sessao_id], texto: e.texto || '' })).sort((a, b) => a.data.localeCompare(b.data)),
      comportamentos: compRegs
    };
  },

  // ─────────────── RASCUNHOS AUTOMATICOS (a equipe edita) ───────────────
  fmtBR(d) { return d ? d.split('-').reverse().join('/') : ''; },
  primeiraFrase(t) { const m = String(t || '').replace(/Programas aplicados:[^\n]*\n?/i, '').replace(/Motivo dos nao aplicados:[^\n]*/i, '').trim().match(/^[^.!?\n]{15,220}[.!?]?/); return m ? m[0].trim() : ''; },

  rascunhoObjetivos(d) {
    const progs = Object.values(d.porProg);
    if (!progs.length) return '';
    return progs.map(p => '\u2022 ' + p.nome + ': ' + (p.objetivo ? p.objetivo.replace(/\s+/g, ' ').trim().replace(/\.?$/, '.') : '(descrever o objetivo)')).join('\n');
  },

  rascunhoProgresso(d, nome) {
    const progs = Object.values(d.porProg);
    if (!progs.length) return '';
    const primeiro = nome.split(' ')[0];
    const ganhos = [], estaveis = [];
    progs.forEach(p => {
      const a = p.serie[0], z = p.serie[p.serie.length - 1];
      if (p.serie.length >= 2 && z.pct > a.pct) ganhos.push(p.nome + ' (' + a.pct + '% \u2192 ' + z.pct + '% de independ\u00eancia em ' + p.serie.length + ' sess\u00f5es)');
      else estaveis.push(p.nome + ' (' + z.pct + '% na \u00faltima sess\u00e3o)');
    });
    let t = '';
    if (ganhos.length) t += 'Ao longo do m\u00eas, ' + primeiro + ' apresentou evolu\u00e7\u00e3o em ' + ganhos.join('; ') + '. ';
    if (estaveis.length) t += 'Mantiveram-se em treino ' + estaveis.join('; ') + '. ';
    const frases = d.evolucoes.map(e => this.primeiraFrase(e.texto)).filter(Boolean).slice(-3);
    if (frases.length) t += 'Registros da equipe no per\u00edodo: ' + frases.map(f => '\u201c' + f + '\u201d').join('; ') + '.';
    return t.trim();
  },

  rascunhoDesafios(d, nome) {
    const primeiro = nome.split(' ')[0];
    const partes = [];
    const baixos = Object.values(d.porProg).filter(p => p.serie[p.serie.length - 1].pct < 50);
    if (baixos.length) partes.push('Permanecem com alta necessidade de ajuda os programas ' + baixos.map(p => p.nome + ' (' + p.serie[p.serie.length - 1].pct + '%)').join(', ') + ', que seguir\u00e3o com retirada gradual de prompts.');
    if (d.comportamentos.length) {
      const nomes = [...new Set(d.comportamentos.map(c => c.comportamentos?.nome).filter(Boolean))];
      partes.push('Foram registrados ' + d.comportamentos.length + ' epis\u00f3dio(s) de comportamento interferente' + (nomes.length ? ' (' + nomes.join(', ') + ')' : '') + ', manejados com as estrat\u00e9gias previstas no plano.');
    }
    if (d.naoAplicados.length) partes.push('Programas n\u00e3o aplicados em algumas sess\u00f5es: ' + [...new Set(d.naoAplicados.map(x => x.nome + (x.motivo ? ' (' + x.motivo + ')' : '')))].join('; ') + '.');
    if (d.faltas) partes.push('Houve ' + d.faltas + ' falta(s) no m\u00eas, o que reduziu as oportunidades de treino.');
    partes.push('Para o pr\u00f3ximo per\u00edodo, ser\u00e1 dada continuidade aos programas em andamento, com ajuste dos n\u00edveis de ajuda conforme o desempenho de ' + primeiro + '.');
    return partes.join(' ');
  },

  rascunhoConclusao(d, nome) {
    const primeiro = nome.split(' ')[0];
    const progs = Object.values(d.porProg);
    const ganhos = progs.filter(p => p.serie.length >= 2 && p.serie[p.serie.length - 1].pct > p.serie[0].pct);
    return 'De modo geral, ' + primeiro + ' apresentou ' + (ganhos.length ? 'evolu\u00e7\u00e3o positiva' : 'participa\u00e7\u00e3o consistente') + ' durante o m\u00eas, com ' + d.concluidas + ' sess\u00f5es realizadas' +
      (ganhos.length ? ' e avan\u00e7os em ' + ganhos.map(p => p.nome).join(', ') : '') + '. ' +
      'O planejamento para o pr\u00f3ximo per\u00edodo mant\u00e9m os objetivos em andamento, priorizando a generaliza\u00e7\u00e3o das habilidades adquiridas e a amplia\u00e7\u00e3o da autonomia.';
  },

  // ─────────────── EDITOR (form a esquerda, folha a direita) ───────────────
  async abrirEditor(pacienteId, mes) {
    const el = this.el();
    el.innerHTML = '<div class="cartao"><p class="sub">Preparando o relatorio...</p></div>';

    const [{ data: pac }, dados, rResp, rAss] = await Promise.all([
      sb.from('pacientes').select('id, nome, data_nascimento').eq('id', pacienteId).single(),
      this.dadosDoMes(pacienteId, mes),
      sb.from('responsaveis').select('nome, principal').eq('paciente_id', pacienteId).order('principal', { ascending: false }).limit(1),
      sb.from('profiles').select('id, nome, perfil').in('perfil', ['direcao', 'coordenador']).eq('ativo', true).order('nome')
    ]);

    let { data: rel } = await sb.from('relatorios_mensais')
      .select('*').eq('paciente_id', pacienteId).eq('mes', mes + '-01').maybeSingle();
    if (!rel && this.podeGerir()) {
      const { data: novo, error } = await sb.from('relatorios_mensais')
        .insert({ paciente_id: pacienteId, mes: mes + '-01', elaborado_por: window.CORTEX_SESSAO.user.id })
        .select('*').single();
      if (error) { el.innerHTML = '<div class="cartao"><div class="mensagem-erro visivel">' + escaparHtml(error.message) + '</div></div>'; return; }
      rel = novo;
    }
    if (!rel) { el.innerHTML = '<div class="cartao"><p class="sub">Relatorio nao encontrado.</p></div>'; return; }

    // rascunhos automaticos onde estiver vazio
    const auto = {};
    if (!rel.objetivos) auto.objetivos = this.rascunhoObjetivos(dados);
    if (!rel.progresso) auto.progresso = this.rascunhoProgresso(dados, pac.nome);
    if (!rel.desafios) auto.desafios = this.rascunhoDesafios(dados, pac.nome);
    if (!rel.conclusao) auto.conclusao = this.rascunhoConclusao(dados, pac.nome);
    if (rel.status === 'rascunho' && Object.keys(auto).length) {
      await sb.from('relatorios_mensais').update(auto).eq('id', rel.id);
      Object.assign(rel, auto);
    }
    if (rel.mostrar_canceladas === null || rel.mostrar_canceladas === undefined) rel.mostrar_canceladas = true;
    if (rel.incluir_grafico === null || rel.incluir_grafico === undefined) rel.incluir_grafico = true;
    if (!rel.assinatura_nome) { rel.assinatura_nome = this.ASSINATURA_PADRAO.nome; rel.assinatura_titulo = this.ASSINATURA_PADRAO.titulo; }

    this._rel = rel; this._pac = pac; this._dados = dados;
    this._resp = rResp.data && rResp.data[0] ? rResp.data[0].nome : null;
    this._assinaturas = [{ nome: this.ASSINATURA_PADRAO.nome, titulo: this.ASSINATURA_PADRAO.titulo }]
      .concat((rAss.data || []).filter(p => p.nome !== this.ASSINATURA_PADRAO.nome).map(p => ({ nome: p.nome, titulo: p.perfil === 'direcao' ? 'Dire\u00e7\u00e3o cl\u00ednica' : 'Coordena\u00e7\u00e3o ABA' })))
      .concat([{ nome: 'Equipe ABA', titulo: 'Equilibrium Terapia Infantil' }]);

    const travado = rel.status === 'gerado' || rel.status === 'liberado';
    const editavel = this.podeGerir() && !travado;
    const opc = (id, rot, marcado) => '<label class="check" style="display:flex; gap:6px; align-items:center; font-size:12.5px"><input type="checkbox" id="rm-' + id + '"' + (marcado ? ' checked' : '') + (editavel ? '' : ' disabled') + ' onchange="MODULOS.relatorios.salvarAuto()"> ' + rot + '</label>';

    el.innerHTML =
      '<div class="pagina-cabecalho nao-imprime">' +
      '  <div><button class="btn-voltar" onclick="MODULOS.pacientes.telaDetalhe(\'' + pacienteId + '\', \'relatorios\')">&larr; Prontuario</button>' +
      '    <h2>Relatorio de Evolucao Mensal &middot; ' + this.mesRotulo(mes) + '</h2>' +
      '    <p class="sub">' + escaparHtml(pac.nome) + (editavel ? ' &middot; rascunho salvo automaticamente' : travado ? ' &middot; gerado em ' + (rel.gerado_em ? new Date(rel.gerado_em).toLocaleString('pt-BR') : '-') + ' (travado)' : '') + '</p></div>' +
      '  <div style="display:flex; gap:8px; flex-wrap:wrap">' +
      (editavel && perm('relatorios.gerar') === 'E' ? '<button class="btn btn-primario" onclick="MODULOS.relatorios.gerarTravar()">&#128274; Gerar e travar</button>' : '') +
      (travado && rel.status !== 'liberado' && perm('relatorios.portal') === 'E' ? '<button class="btn btn-fantasma" onclick="MODULOS.relatorios.liberar()">Liberar no portal</button>' : '') +
      '  <button class="btn btn-fantasma" onclick="MODULOS.relatorios.docMensal()">&#128196; Folha / Imprimir</button>' +
      '  </div></div>' +

      '<div class="rm-split">' +
      '<div class="rm-form">' +
      '  <div class="cartao faixa-azul"><h3>Vem do sistema</h3>' +
      '  <div class="grade-visao">' +
      '    <div class="caixa-info"><small>Sessoes realizadas</small><b>' + dados.concluidas + '</b></div>' +
      '    <div class="caixa-info"><small>Faltas</small><b>' + dados.faltas + '</b></div>' +
      '    <div class="caixa-info"><small>Canceladas</small><b>' + dados.canceladas + '</b></div>' +
      '    <div class="caixa-info"><small>Programas no mes</small><b>' + Object.keys(dados.porProg).length + '</b></div>' +
      '  </div>' +
      '  <div style="display:flex; gap:14px; flex-wrap:wrap; margin-top:10px">' +
      opc('canc', 'Mostrar canceladas no quadro de frequencia', rel.mostrar_canceladas) +
      opc('graf', 'Incluir grafico de evolucao do mes', rel.incluir_grafico) +
      '  </div>' +
      '  <div class="campo" style="margin-top:8px"><label>Assinatura</label>' +
      '  <select id="rm-ass"' + (editavel ? '' : ' disabled') + ' onchange="MODULOS.relatorios.salvarAuto()">' +
      this._assinaturas.map(a => '<option value="' + escaparHtml(a.nome) + '"' + (a.nome === rel.assinatura_nome ? ' selected' : '') + '>' + escaparHtml(a.nome) + ' \u2014 ' + escaparHtml(a.titulo) + '</option>').join('') +
      '  </select></div></div>' +
      '  <div class="cartao">' +
      (editavel
        ? this.campoRel('objetivos', 'Objetivos de ensino <small class="sub">(programas do mes; uma linha por programa)</small>', rel.objetivos, 'Um programa por linha', 5) +
          this.campoRel('progresso', 'Progresso *', rel.progresso, 'Progresso da crianca nos objetivos', 6) +
          this.campoRel('desafios', 'Desafios e plano de intervencao', rel.desafios, 'Dificuldades, manejo e proximo periodo', 5) +
          this.campoRel('conclusao', 'Conclusao *', rel.conclusao, 'Sintese do mes', 4)
        : this.blocosLeitura(rel)) +
      '  </div>' +
      '</div>' +
      '<div class="rm-previa"><div class="folha-mini" id="rm-previa"></div></div>' +
      '</div>';
    this.atualizarPrevia();
  },

  campoRel(id, rotulo, valor, dica, linhas) {
    return '<div class="campo" style="margin-bottom:10px"><label>' + rotulo + '</label>' +
      '<textarea id="rm-' + id + '" rows="' + linhas + '" oninput="MODULOS.relatorios.salvarAuto()" ' +
      'style="resize:vertical" placeholder="' + dica + '...">' + escaparHtml(valor || '') + '</textarea></div>';
  },

  blocosLeitura(rel) {
    const bloco = (t, v) => v
      ? '<div style="margin-bottom:12px"><b style="font-size:12px; text-transform:uppercase; letter-spacing:.04em">' + t +
        '</b><p style="font-size:13px; line-height:1.8; white-space:pre-wrap; margin-top:4px">' + escaparHtml(v) + '</p></div>' : '';
    return bloco('Objetivos de ensino', rel.objetivos) + bloco('Progresso', rel.progresso) +
      bloco('Desafios e plano de intervencao', rel.desafios) + bloco('Conclusao', rel.conclusao) +
      (rel.texto && !rel.progresso ? '<p style="white-space:pre-wrap">' + escaparHtml(rel.texto) + '</p>' : '');
  },

  _timer: null,
  colherCampos() {
    const ass = document.getElementById('rm-ass');
    const a = ass ? this._assinaturas.find(x => x.nome === ass.value) : null;
    return {
      objetivos: document.getElementById('rm-objetivos')?.value.trim() || null,
      progresso: document.getElementById('rm-progresso')?.value.trim() || null,
      desafios: document.getElementById('rm-desafios')?.value.trim() || null,
      conclusao: document.getElementById('rm-conclusao')?.value.trim() || null,
      mostrar_canceladas: document.getElementById('rm-canc') ? document.getElementById('rm-canc').checked : true,
      incluir_grafico: document.getElementById('rm-graf') ? document.getElementById('rm-graf').checked : true,
      assinatura_nome: a ? a.nome : this._rel.assinatura_nome,
      assinatura_titulo: a ? a.titulo : this._rel.assinatura_titulo
    };
  },
  salvarAuto() {
    clearTimeout(this._timer);
    this._timer = setTimeout(async () => {
      const campos = this.colherCampos();
      Object.assign(this._rel, campos);
      this.atualizarPrevia();
      if (this._rel.status === 'rascunho') await sb.from('relatorios_mensais').update(campos).eq('id', this._rel.id);
    }, 500);
  },
  atualizarPrevia() {
    const alvo = document.getElementById('rm-previa');
    if (alvo) alvo.innerHTML = this.htmlMensal(this._rel, this._pac, this._resp, this._dados);
  },

  async gerarTravar() {
    clearTimeout(this._timer);
    const campos = this.colherCampos();
    if (!campos.progresso || !campos.conclusao) { popAviso('Preencha ao menos Progresso e Conclusao antes de gerar.'); return; }
    if (!await popConfirmar('Gerar o relatorio de ' + this.mesRotulo(this._rel.mes.slice(0, 7)) + '?\n\nDepois de gerado ele fica travado: nao pode mais ser editado, so impresso e liberado no portal.',
      { titulo: 'Gerar e travar', ok: 'Gerar e travar' })) return;
    Object.assign(this._rel, campos);
    const html = this.htmlMensal(this._rel, this._pac, this._resp, this._dados);
    const partes = [];
    if (campos.objetivos) partes.push('OBJETIVOS DE ENSINO\n' + campos.objetivos);
    if (campos.progresso) partes.push('PROGRESSO\n' + campos.progresso);
    if (campos.desafios) partes.push('DESAFIOS E PLANO DE INTERVENCAO\n' + campos.desafios);
    if (campos.conclusao) partes.push('CONCLUSAO\n' + campos.conclusao);
    const { error } = await sb.from('relatorios_mensais').update(Object.assign({}, campos, {
      texto: partes.join('\n\n'), html_snapshot: html, status: 'gerado',
      gerado_em: new Date().toISOString(), gerado_por: window.CORTEX_SESSAO.user.id })).eq('id', this._rel.id);
    if (error) { popAviso('Nao consegui gerar: ' + error.message); return; }
    this.abrirEditor(this._rel.paciente_id, this._rel.mes.slice(0, 7));
  },

  async liberar() {
    if (this._rel.status !== 'gerado') { popAviso('Gere e trave o relatorio antes de liberar no portal.'); return; }
    if (!await popConfirmar('Liberar este relatorio no portal da familia?')) return;
    const { error } = await sb.from('relatorios_mensais')
      .update({ status: 'liberado', liberado_em: new Date().toISOString() }).eq('id', this._rel.id);
    if (error) { popAviso('Erro: ' + error.message); return; }
    try {
      const { data: fams } = await sb.from('familia_pacientes').select('usuario_id, pacientes(nome)').eq('paciente_id', this._rel.paciente_id);
      const nomeCrianca = fams && fams[0] && fams[0].pacientes ? fams[0].pacientes.nome.split(' ')[0] : 'sua crianca';
      if (fams && fams.length) {
        await sb.from('notificacoes').insert(fams.map(f => ({
          destinatario_id: f.usuario_id, titulo: 'Novo relatorio mensal disponivel',
          corpo: 'O relatorio de ' + this.mesRotulo(this._rel.mes.slice(0, 7)) + ' de ' + nomeCrianca + ' ja esta no portal.' })));
      }
    } catch (e) { /* nao trava */ }
    this.abrirEditor(this._rel.paciente_id, this._rel.mes.slice(0, 7));
  },

  // ─────────────── HTML DA FOLHA (usado na previa, no documento e no snapshot) ───────────────
  htmlFrequencia(dados, mostrarCanceladas) {
    const porDow = {};
    dados.sessoes.forEach(s => {
      if (s.status === 'cancelada' && !mostrarCanceladas) return;
      if (!['concluida', 'falta', 'cancelada'].includes(s.status)) return;
      const dow = new Date(s.data + 'T12:00:00').getDay();
      (porDow[dow] = porDow[dow] || []).push(s);
    });
    const cols = Object.keys(porDow).map(Number).sort();
    if (!cols.length) return '<p class="sub" style="text-align:center">Sem sess\u00f5es registradas no m\u00eas.</p>';
    const maxL = Math.max(...cols.map(c => porDow[c].length));
    let presencas = 0, faltas = 0;
    dados.sessoes.forEach(s => { if (s.status === 'concluida') presencas++; if (s.status === 'falta') faltas++; });
    let html = '<table class="deq-freq deq-freq-dias"><tr>' + cols.map(c => '<th>' + this.NOMES_DIA[c] + '</th>').join('') + '</tr>';
    for (let i = 0; i < maxL; i++) {
      html += '<tr>' + cols.map(c => {
        const s = porDow[c][i];
        if (!s) return '<td class="vazia"></td>';
        const d = s.data.slice(8, 10) + '/' + s.data.slice(5, 7);
        const st = s.status === 'concluida' ? '( X ) P (&nbsp;&nbsp;) F' : s.status === 'falta' ? '(&nbsp;&nbsp;) P ( X ) F' : '<span class="deq-fv">cancelada</span>';
        return '<td><span class="deq-fdata">' + d + '</span> <span class="' + (s.status === 'concluida' ? 'deq-fp' : s.status === 'falta' ? 'deq-ff' : '') + '">' + st + '</span></td>';
      }).join('') + '</tr>';
    }
    html += '</table><div class="deq-freq-rodape"><span>P: PRESEN\u00c7A / F: FALTA</span><span>Presen\u00e7as <b>' + presencas + '</b> \u00b7 Faltas <b>' + faltas + '</b>' +
      ((presencas + faltas) ? ' \u00b7 Assiduidade <b>' + Math.round(presencas * 100 / (presencas + faltas)) + '%</b>' : '') + '</span></div>';
    return html;
  },

  htmlGraficoMes(dados) {
    const progs = Object.values(dados.porProg).filter(p => p.serie.length);
    if (!progs.length || !MODULOS.avaliacoes || !MODULOS.avaliacoes.gLinhas) return '';
    const datas = [...new Set(progs.flatMap(p => p.serie.map(x => x.data)))].sort();
    const series = progs.map((p, i) => ({
      nome: p.nome.length > 28 ? p.nome.slice(0, 27) + '\u2026' : p.nome, cor: this.COR_PROG[i % this.COR_PROG.length],
      valores: datas.map(d => { const x = p.serie.find(y => y.data === d); return x ? x.pct : null; })
    }));
    return MODULOS.avaliacoes.gLinhas(datas.map(d => d.slice(8, 10) + '/' + d.slice(5, 7)), series, { legenda: true, altura: 240 });
  },

  htmlMensal(rel, pac, resp, dados) {
    const mes = rel.mes.slice(0, 7);
    const fmt = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '-';
    const txt = v => escaparHtml(v || '').replace(/\n/g, '<br>');
    const bloco = (classe, titulo, valor) =>
      '<h2><span class="ponto ' + classe + '"></span>' + titulo + '</h2><div class="deq-caixa deq-texto">' + txt(valor) + '</div>';
    const { fim } = this.intervaloMes(mes);
    const dataAss = rel.gerado_em ? new Date(rel.gerado_em).toLocaleDateString('pt-BR') : fmt(fim);
    return '<div class="doc-eq">' +
      '<div class="deq-cab"><img src="icones/equilibrium.png" alt="Equilibrium">' +
      '  <div class="deq-cab-t"><h1>RELAT&Oacute;RIO DE EVOLU&Ccedil;&Atilde;O MENSAL</h1><p>Equilibrium Terapia Infantil &middot; Psicoterapia ABA</p></div>' +
      '  <span class="deq-pilula">' + this.mesRotulo(mes).toUpperCase() + '</span></div>' +
      '<div class="deq-caixa deq-dados" style="grid-template-columns:2fr 1fr 1.4fr 1fr">' +
      '  <div style="border-bottom:none"><small>Paciente</small><b>' + escaparHtml(pac.nome) + '</b></div>' +
      '  <div style="border-bottom:none"><small>Data de nascimento</small><b>' + fmt(pac.data_nascimento) + '</b></div>' +
      '  <div style="border-bottom:none"><small>Respons&aacute;vel</small><b>' + escaparHtml(resp || '&mdash;') + '</b></div>' +
      '  <div style="border-bottom:none"><small>Especialidade</small><b>Psicoterapia ABA</b></div></div>' +
      '<h2><span class="ponto"></span>Frequ&ecirc;ncia</h2><div class="deq-caixa">' + this.htmlFrequencia(dados, rel.mostrar_canceladas !== false) + '</div>' +
      bloco('deq-amarelo', 'Objetivos de ensino', rel.objetivos) +
      bloco('deq-teal', 'Progresso', rel.progresso) +
      bloco('deq-rosa', 'Desafios e plano de interven&ccedil;&atilde;o', rel.desafios) +
      bloco('deq-amarelo', 'Conclus&atilde;o', rel.conclusao) +
      '<div class="deq-local">Uberl&acirc;ndia-MG, ' + dataAss + '</div>' +
      '<div class="deq-assinatura">' + escaparHtml(rel.assinatura_nome || this.ASSINATURA_PADRAO.nome) + '<br><small>' + escaparHtml(rel.assinatura_titulo || this.ASSINATURA_PADRAO.titulo) + '</small></div>' +
      (rel.incluir_grafico !== false && Object.keys(dados.porProg).length
        ? '<div class="deq-quebra"></div><h2><span class="ponto deq-teal"></span>Anexo &middot; Evolu&ccedil;&atilde;o dos programas no m&ecirc;s <small>&middot; % de independ&ecirc;ncia por sess&atilde;o</small></h2>' +
          '<div class="deq-caixa">' + this.htmlGraficoMes(dados) + '</div>'
        : '') +
      '<div class="deq-rodape"><span>Equilibrium Terapia Infantil &middot; Uberl&acirc;ndia/MG</span>' +
      '<span class="pontos"><i style="background:var(--eq-teal)"></i><i style="background:var(--eq-amarelo)"></i><i style="background:var(--eq-rosa)"></i><i style="background:var(--eq-azul)"></i></span>' +
      '<span>Documento gerado pelo CORTEX aba &middot; ' + dataAss + '</span></div>' +
      '</div>';
  },

  // ─────────────── PORTAL DA FAMILIA ───────────────

  async htmlPortal(pacienteId, nomeCrianca) {
    const { data } = await sb.from('relatorios_mensais')
      .select('id, mes, texto, liberado_em')
      .eq('paciente_id', pacienteId)
      .eq('status', 'liberado')
      .order('mes', { ascending: false })
      .limit(12);
    const lista = data || [];
    if (lista.length === 0) return '';

    this._portalCache = this._portalCache || {};
    lista.forEach(r => { this._portalCache[r.id] = r; });

    return '<div style="margin-top:12px">' +
      '<b style="font-size:12.5px">Relatorios mensais</b>' +
      lista.map(r =>
        '<div class="linha-doc"><div><b>' + this.mesRotulo(r.mes.slice(0, 7)) + '</b>' +
        '<small>Publicado em ' + new Date(r.liberado_em).toLocaleDateString('pt-BR') + '</small></div>' +
        '<button class="btn btn-fantasma" onclick="MODULOS.relatorios.lerNoPortal(\'' + r.id + '\')">Ler</button>' +
        '</div>').join('') +
      '</div>';
  },

  lerNoPortal(id) {
    const r = (this._portalCache || {})[id];
    if (!r) return;
    abrirModal('Relatorio &middot; ' + this.mesRotulo(r.mes.slice(0, 7)),
      '<div style="font-size:13.5px; line-height:1.85; white-space:pre-wrap">' +
      escaparHtml(r.texto || '') + '</div>', true);
  },

  // ─────────────── DOCUMENTO OFICIAL (identidade Equilibrium) ───────────────

  async docMensal() {
    const rel = this._rel;
    if (!rel) return;
    const ov = document.createElement('div');
    ov.id = 'doc-eq-overlay';
    ov.className = 'folha-overlay';
    ov.innerHTML = '<div class="folha-pagina" id="doc-eq-corpo" style="max-width:900px"><p class="sub">Montando o documento...</p></div>';
    document.body.appendChild(ov);
    // travado: exatamente o que foi gerado; rascunho: monta ao vivo
    let corpo = rel.html_snapshot && rel.status !== 'rascunho' ? rel.html_snapshot : null;
    if (!corpo) {
      if (!this._dados) this._dados = await this.dadosDoMes(rel.paciente_id, rel.mes.slice(0, 7));
      Object.assign(rel, this.colherCampos());
      corpo = this.htmlMensal(rel, this._pac, this._resp, this._dados);
    }
    window._docPortal = { paciente_id: rel.paciente_id, tipo: 'relatorio_mensal', titulo: 'Relatorio Mensal' };
    document.getElementById('doc-eq-corpo').innerHTML =
      '<div class="pagina-cabecalho nao-imprime">' +
      '  <div><button class="btn-voltar" onclick="document.getElementById(\'doc-eq-overlay\').remove()">&larr; Fechar</button>' +
      '  <h2>Relatorio mensal &middot; documento oficial' + (rel.status === 'rascunho' ? ' <span class="selo selo-warn">rascunho</span>' : ' <span class="selo selo-ok">gerado</span>') + '</h2></div>' +
      '  <button class="btn btn-primario" onclick="window.print()">&#128424; Imprimir / PDF</button>' + portalBtn() + '</div>' + corpo;
  },

  // ─────────────── Balcao da aba Relatorios ───────────────

  async htmlDoPaciente(pacienteId) {
    this._pacRel = pacienteId;
    const base = await this.htmlDoPacienteBase(pacienteId);
    const barra =
      '<div class="aba-acoes">' +
      '<button class="btn btn-primario" onclick="MODULOS.relatorios.escolherSessao(\'' + pacienteId + '\')">&#128196; Relatorio da sessao</button>' +
      '<button class="btn btn-fantasma" onclick="MODULOS.programas.modalCompilado(\'' + pacienteId + '\')">&#128200; Relatorio do mes (compilado)</button>' +
      '</div>' +
      '<p class="sub" style="margin:-4px 0 10px">Relatorio da sessao junta tudo daquele dia: programas, tentativas, grafico e evolucao. O do mes compila todas as sessoes do periodo.</p>';
    return barra + base;
  },

  async escolherSessao(pacienteId) {
    const { data } = await sb.from('sessoes')
      .select('id, data, hora_inicio, status')
      .eq('paciente_id', pacienteId)
      .not('status', 'in', '("falta","cancelada")')
      .lte('data', new Date().toISOString().slice(0, 10))
      .order('data', { ascending: false }).order('hora_inicio', { ascending: false })
      .limit(20);
    const lista = data || [];
    if (!lista.length) { alert('Nenhuma sessao realizada ainda.'); return; }
    abrirModal('Relatorio da sessao',
      '<p class="sub" style="margin-bottom:8px">Escolha a sessao (20 mais recentes):</p>' +
      lista.map(s =>
        '<div class="linha-doc clicavel" onclick="fecharModal(); MODULOS.programas.docEvolucaoDiaria(\'' + s.id + '\')">' +
        '<div><b>' + s.data.split('-').reverse().join('/') + '</b>' +
        '<small>' + (s.hora_inicio ? 'as ' + s.hora_inicio.slice(0, 5) : '') +
        (s.status === 'concluida' ? ' &middot; concluida' : ' &middot; ' + s.status.replace('_', ' ')) + '</small></div>' +
        '<span class="selo ' + (s.status === 'concluida' ? 'selo-ok' : 'selo-warn') + '">Abrir</span>' +
        '</div>').join(''));
  }
};
