// ============================================================================
// CORTEX aba - js/modulos/relatorios.js
// Sprint 11: Relatorio Mensal (Formulario 07) em linguagem para a familia.
// A equipe elabora com um painel de dados do mes ao lado; ao liberar, o
// relatorio aparece no portal da familia e os responsaveis sao notificados.
// ============================================================================

window.MODULOS = window.MODULOS || {};

window.MODULOS.relatorios = {

  el() { return document.getElementById('pagina'); },
  podeGerir() { return perm('relatorios') === 'E'; },

  mesRotulo(mes) {
    const d = new Date(mes + '-15T12:00:00');
    const r = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    return r.charAt(0).toUpperCase() + r.slice(1);
  },

  // ─────────────── ABA RELATORIOS DO PRONTUARIO ───────────────

  async htmlDoPaciente(pacienteId) {
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
        (r.status === 'liberado'
          ? '<span class="selo selo-ok">No portal</span>'
          : '<span class="selo selo-warn">Rascunho</span>') +
        '<button class="btn-chip" onclick="MODULOS.relatorios.abrirEditor(\'' + pacienteId +
        '\', \'' + r.mes.slice(0, 7) + '\')">' +
        (r.status === 'liberado' || !this.podeGerir() ? 'Abrir' : 'Continuar') + '</button>' +
        '</div></div>').join('')
      : '<p class="sub">Nenhum relatorio elaborado.</p>') +
      '</div>';

    return html;
  },

  // ─────────────── DADOS DO MES (apoio a escrita) ───────────────

  async dadosDoMes(pacienteId, mes) {
    const inicio = mes + '-01';
    const fimD = new Date(mes + '-01T12:00:00');
    fimD.setMonth(fimD.getMonth() + 1); fimD.setDate(0);
    const fim = fimD.toISOString().slice(0, 10);

    const { data: sessoes } = await sb.from('sessoes')
      .select('id, status').eq('paciente_id', pacienteId)
      .gte('data', inicio).lte('data', fim);
    const ids = (sessoes || []).map(s => s.id);

    let tentativas = 0, indep = 0;
    if (ids.length) {
      const { data: regs } = await sb.from('registros_tentativas')
        .select('resposta').in('sessao_id', ids);
      (regs || []).forEach(r => { tentativas++; if (r.resposta === 'C') indep++; });
    }

    return {
      concluidas: (sessoes || []).filter(s => s.status === 'concluida').length,
      faltas: (sessoes || []).filter(s => s.status === 'falta').length,
      canceladas: (sessoes || []).filter(s => s.status === 'cancelada').length,
      tentativas: tentativas,
      pctI: tentativas ? Math.round(indep * 100 / tentativas) : null
    };
  },

  // ─────────────── EDITOR ───────────────

  async abrirEditor(pacienteId, mes) {
    const el = this.el();
    el.innerHTML = '<div class="cartao"><p class="sub">Preparando o relatorio...</p></div>';

    const [{ data: pac }, dados] = await Promise.all([
      sb.from('pacientes').select('id, nome, data_nascimento').eq('id', pacienteId).single(),
      this.dadosDoMes(pacienteId, mes)
    ]);

    let { data: rel } = await sb.from('relatorios_mensais')
      .select('*').eq('paciente_id', pacienteId).eq('mes', mes + '-01').maybeSingle();

    if (!rel && this.podeGerir()) {
      const { data: novo, error } = await sb.from('relatorios_mensais')
        .insert({ paciente_id: pacienteId, mes: mes + '-01',
                  elaborado_por: window.CORTEX_SESSAO.user.id })
        .select('*').single();
      if (error) {
        el.innerHTML = '<div class="cartao"><div class="mensagem-erro visivel">' +
          escaparHtml(error.message) + '</div></div>';
        return;
      }
      rel = novo;
    }
    if (!rel) {
      el.innerHTML = '<div class="cartao"><p class="sub">Relatorio nao encontrado.</p></div>';
      return;
    }

    this._rel = rel;
    const editavel = this.podeGerir() && rel.status !== 'liberado';

    el.innerHTML =
      '<div class="pagina-cabecalho nao-imprime">' +
      '  <div>' +
      '    <button class="btn-voltar" onclick="MODULOS.pacientes.telaDetalhe(\'' + pacienteId + '\', \'relatorios\')">&larr; Prontuario</button>' +
      '    <h2>Relatorio Mensal &middot; ' + this.mesRotulo(mes) + '</h2>' +
      '    <p class="sub">' + escaparHtml(pac.nome) +
      (editavel ? ' &middot; texto salvo automaticamente' :
        rel.status === 'liberado' ? ' &middot; liberado no portal da familia' : '') + '</p>' +
      '  </div>' +
      '  <div style="display:flex; gap:8px">' +
      (editavel
        ? '<button class="btn btn-fantasma" onclick="MODULOS.relatorios.liberar()">Liberar no portal</button>'
        : '') +
      '  <button class="btn btn-primario" onclick="MODULOS.relatorios.docMensal()">&#128196; Documento oficial</button>' +
      '  </div>' +
      '</div>' +

      '<div class="cartao nao-imprime faixa-azul"><h3>Dados do mes (apoio, nao vai para a familia)</h3>' +
      '<div class="grade-visao">' +
      '  <div class="caixa-info"><small>Sessoes realizadas</small><b>' + dados.concluidas + '</b></div>' +
      '  <div class="caixa-info"><small>Faltas</small><b>' + dados.faltas + '</b></div>' +
      '  <div class="caixa-info"><small>Canceladas</small><b>' + dados.canceladas + '</b></div>' +
      '  <div class="caixa-info"><small>Tentativas registradas</small><b>' + dados.tentativas + '</b></div>' +
      '  <div class="caixa-info"><small>Independencia</small><b>' +
        (dados.pctI === null ? '-' : dados.pctI + '%') + '</b></div>' +
      '</div></div>' +

      '<div class="cartao folha-presenca">' +
      '  <div class="folha-titulo">' +
      '    <div><b>RELATORIO MENSAL &middot; ' + this.mesRotulo(mes).toUpperCase() + '</b>' +
      '    <small>Formulario 07 &middot; ' + escaparHtml(pac.nome) + ' &middot; nasc. ' +
        new Date(pac.data_nascimento + 'T12:00:00').toLocaleDateString('pt-BR') + '</small></div>' +
      '    <span class="folha-marca">CORTEX aba &middot; Equilibrium Terapia Infantil</span>' +
      '  </div>' +
      (editavel
        ? this.campoRel('objetivos', 'Objetivos de ensino', rel.objetivos,
            'Programas para treino de habilidades trabalhados no mes (pre-preenchido pela ficha; ajuste a vontade)', 4) +
          this.campoRel('progresso', 'Progresso *', rel.progresso,
            'Progresso da crianca em relacao aos objetivos de ensino e mudancas comportamentais observadas no periodo', 5) +
          this.campoRel('desafios', 'Desafios e plano de intervencao', rel.desafios,
            'Comportamentos interferentes e dificuldades durante os atendimentos, alem do manejo realizado', 4) +
          this.campoRel('conclusao', 'Conclusao *', rel.conclusao,
            'Sintese qualitativa da evolucao global no mes e planejamento para o proximo periodo', 4)
        : this.blocosLeitura(rel)) +
      '</div>';

    if (editavel && !rel.objetivos) this.sugerirObjetivos(pacienteId, mes);
  },

  campoRel(id, rotulo, valor, dica, linhas) {
    return '<div class="campo" style="margin-bottom:10px"><label>' + rotulo + '</label>' +
      '<textarea id="rm-' + id + '" rows="' + linhas + '" oninput="MODULOS.relatorios.salvarAuto()" ' +
      'style="resize:vertical" placeholder="' + dica + '...">' +
      escaparHtml(valor || '') + '</textarea></div>';
  },

  blocosLeitura(rel) {
    const tem4 = rel.objetivos || rel.progresso || rel.desafios || rel.conclusao;
    if (!tem4) {
      return '<div style="font-size:13px; line-height:1.8; white-space:pre-wrap">' +
        (rel.texto ? escaparHtml(rel.texto) : '<span class="sub">Sem texto.</span>') + '</div>';
    }
    const bloco = (t, v) => v
      ? '<div style="margin-bottom:12px"><b style="font-size:12px; text-transform:uppercase; letter-spacing:.04em">' +
        t + '</b><p style="font-size:13px; line-height:1.8; white-space:pre-wrap; margin-top:4px">' +
        escaparHtml(v) + '</p></div>' : '';
    return bloco('Objetivos de ensino', rel.objetivos) + bloco('Progresso', rel.progresso) +
      bloco('Desafios e plano de intervencao', rel.desafios) + bloco('Conclusao', rel.conclusao);
  },

  async sugerirObjetivos(pacienteId, mes) {
    const inicio = mes + '-01';
    const fimD = new Date(mes + '-01T12:00:00');
    fimD.setMonth(fimD.getMonth() + 1); fimD.setDate(0);
    const { data: ss } = await sb.from('sessoes').select('id')
      .eq('paciente_id', pacienteId).gte('data', inicio).lte('data', fimD.toISOString().slice(0, 10));
    const ids = (ss || []).map(s => s.id);
    if (!ids.length) return;
    const { data: fotos } = await sb.from('programa_sessao_registros')
      .select('paciente_programa_id, pct_corretos, criado_em, paciente_programas(programas(nome, area))')
      .in('sessao_id', ids).order('criado_em');
    if (!fotos || !fotos.length) return;
    const porProg = {};
    fotos.forEach(f => {
      const prog = f.paciente_programas && f.paciente_programas.programas;
      if (prog) porProg[prog.nome] = { area: prog.area, pct: f.pct_corretos };
    });
    const texto = 'No mes foram trabalhados os programas: ' +
      Object.entries(porProg).map(([nome, d]) =>
        nome + ' (' + d.area + ', ' + d.pct + '% de corretos na ultima sessao)').join('; ') + '.';
    const el = document.getElementById('rm-objetivos');
    if (el && !el.value.trim()) { el.value = texto; this.salvarAuto(); }
  },

  _timer: null,
  colherCampos() {
    return {
      objetivos: document.getElementById('rm-objetivos')?.value.trim() || null,
      progresso: document.getElementById('rm-progresso')?.value.trim() || null,
      desafios: document.getElementById('rm-desafios')?.value.trim() || null,
      conclusao: document.getElementById('rm-conclusao')?.value.trim() || null
    };
  },
  salvarAuto() {
    clearTimeout(this._timer);
    this._timer = setTimeout(async () => {
      const campos = this.colherCampos();
      await sb.from('relatorios_mensais').update(campos).eq('id', this._rel.id);
      Object.assign(this._rel, campos);
    }, 700);
  },

  async liberar() {
    clearTimeout(this._timer);
    const campos = this.colherCampos();
    if (!campos.progresso || !campos.conclusao) {
      alert('Preencha ao menos Progresso e Conclusao antes de liberar.');
      return;
    }
    if (!confirm('Liberar este relatorio no portal da familia? Depois de liberado ele fica somente leitura.')) return;

    const partes = [];
    if (campos.objetivos) partes.push('OBJETIVOS DE ENSINO\n' + campos.objetivos);
    if (campos.progresso) partes.push('PROGRESSO\n' + campos.progresso);
    if (campos.desafios) partes.push('DESAFIOS E PLANO DE INTERVENCAO\n' + campos.desafios);
    if (campos.conclusao) partes.push('CONCLUSAO\n' + campos.conclusao);

    const { error } = await sb.from('relatorios_mensais')
      .update(Object.assign({}, campos, {
        texto: partes.join('\n\n'),
        status: 'liberado', liberado_em: new Date().toISOString() }))
      .eq('id', this._rel.id);
    if (error) { alert('Erro: ' + error.message); return; }

    // Notifica os responsaveis com acesso ao portal
    try {
      const { data: fams } = await sb.from('familia_pacientes')
        .select('usuario_id, pacientes(nome)').eq('paciente_id', this._rel.paciente_id);
      const nomeCrianca = fams && fams[0] && fams[0].pacientes
        ? fams[0].pacientes.nome.split(' ')[0] : 'sua crianca';
      if (fams && fams.length) {
        await sb.from('notificacoes').insert(fams.map(f => ({
          destinatario_id: f.usuario_id,
          titulo: 'Novo relatorio mensal disponivel',
          corpo: 'O relatorio de ' + this.mesRotulo(this._rel.mes.slice(0, 7)) +
                 ' de ' + nomeCrianca + ' ja esta no portal.'
        })));
      }
    } catch (e) { /* nao trava a liberacao */ }

    this.abrirEditor(this._rel.paciente_id, this._rel.mes.slice(0, 7));
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
    const mes = rel.mes.slice(0, 7);

    const ov = document.createElement('div');
    ov.id = 'doc-eq-overlay';
    ov.className = 'folha-overlay';
    ov.innerHTML = '<div class="folha-pagina" id="doc-eq-corpo" style="max-width:900px">' +
      '<p class="sub">Montando o documento...</p></div>';
    document.body.appendChild(ov);

    const inicio = mes + '-01';
    const fimD = new Date(mes + '-01T12:00:00');
    fimD.setMonth(fimD.getMonth() + 1); fimD.setDate(0);
    const fim = fimD.toISOString().slice(0, 10);

    const [rPac, rResp, rSes] = await Promise.all([
      sb.from('pacientes').select('nome, data_nascimento').eq('id', rel.paciente_id).single(),
      sb.from('responsaveis').select('nome, principal').eq('paciente_id', rel.paciente_id)
        .order('principal', { ascending: false }).limit(1),
      sb.from('sessoes').select('data, status').eq('paciente_id', rel.paciente_id)
        .gte('data', inicio).lte('data', fim).order('data')
    ]);
    const pac = rPac.data;
    const resp = rResp.data && rResp.data[0] ? rResp.data[0].nome : null;
    const sessoes = rSes.data || [];

    // Status por dia: concluida -> P, falta -> F
    const porDia = {};
    sessoes.forEach(s => {
      if (s.status === 'concluida') porDia[s.data] = 'P';
      else if (s.status === 'falta' && porDia[s.data] !== 'P') porDia[s.data] = 'F';
    });
    let presencas = 0, faltas = 0;
    Object.values(porDia).forEach(v => { if (v === 'P') presencas++; else faltas++; });
    const assid = (presencas + faltas) ? Math.round(presencas * 100 / (presencas + faltas)) : null;

    // Grade seg-sex do mes
    const [ano, mesN] = mes.split('-').map(Number);
    const primeiro = new Date(ano, mesN - 1, 1);
    const cursor = new Date(primeiro);
    cursor.setDate(cursor.getDate() - ((cursor.getDay() + 6) % 7)); // volta ate segunda
    const hoje = new Date().toISOString().slice(0, 10);
    let linhas = '';
    while (cursor.getMonth() === mesN - 1 || cursor < primeiro) {
      let tr = '<tr>';
      for (let i = 0; i < 5; i++) {
        const iso = cursor.toISOString().slice(0, 10);
        if (cursor.getMonth() !== mesN - 1) {
          tr += '<td class="vazia"></td>';
        } else {
          const rot = String(cursor.getDate()).padStart(2, '0') + '/' + String(mesN).padStart(2, '0');
          const st = porDia[iso];
          const selo = st === 'P' ? '<span class="deq-fp">P</span>'
            : st === 'F' ? '<span class="deq-ff">F</span>'
            : '<span class="deq-fv">&ndash;</span>';
          tr += '<td><span class="deq-fdata">' + rot + '</span>' + selo + '</td>';
        }
        cursor.setDate(cursor.getDate() + 1);
      }
      cursor.setDate(cursor.getDate() + 2); // pula o fim de semana
      linhas += tr + '</tr>';
      if (cursor.getMonth() !== mesN - 1 && cursor > primeiro) break;
    }

    const fmt = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '-';
    const tem4 = rel.objetivos || rel.progresso || rel.desafios || rel.conclusao;
    const bloco = (classe, titulo, valor) =>
      '<h2><span class="ponto ' + classe + '"></span>' + titulo + '</h2>' +
      '<div class="deq-caixa deq-texto">' +
      escaparHtml(valor || (!tem4 && titulo === 'Progresso' ? rel.texto || '' : '')) + '</div>';

    document.getElementById('doc-eq-corpo').innerHTML =
      '<div class="pagina-cabecalho nao-imprime">' +
      '  <div><button class="btn-voltar" onclick="document.getElementById(\'doc-eq-overlay\').remove()">&larr; Fechar</button>' +
      '  <h2>Relatorio mensal &middot; documento oficial</h2></div>' +
      '  <button class="btn btn-primario" onclick="window.print()">&#128424; Imprimir / PDF</button>' +
      '</div>' +

      '<div class="doc-eq">' +
      '<div class="deq-cab">' +
      '  <img src="icones/equilibrium.png" alt="Equilibrium">' +
      '  <div class="deq-cab-t"><h1>RELAT&Oacute;RIO DE EVOLU&Ccedil;&Atilde;O MENSAL</h1>' +
      '  <p>Equilibrium Terapia Infantil &middot; Psicoterapia ABA</p></div>' +
      '  <span class="deq-pilula">' + this.mesRotulo(mes).toUpperCase() + '</span>' +
      '</div>' +

      '<h2><span class="ponto deq-teal"></span>Identifica&ccedil;&atilde;o</h2>' +
      '<div class="deq-caixa deq-dados" style="grid-template-columns:2fr 1fr 1.4fr 1fr">' +
      '  <div style="border-bottom:none"><small>Paciente</small><b>' + escaparHtml(pac.nome) + '</b></div>' +
      '  <div style="border-bottom:none"><small>Nascimento</small><b>' + fmt(pac.data_nascimento) + '</b></div>' +
      '  <div style="border-bottom:none"><small>Respons&aacute;vel</small><b>' + escaparHtml(resp || '&mdash;') + '</b></div>' +
      '  <div style="border-bottom:none"><small>Especialidade</small><b>Psicoterapia ABA</b></div>' +
      '</div>' +

      '<h2><span class="ponto"></span>Frequ&ecirc;ncia <small>&middot; P Presen&ccedil;a &middot; F Falta &middot; &ndash; sem registro</small></h2>' +
      '<div class="deq-caixa">' +
      '  <table class="deq-freq">' +
      '    <tr><th>SEG</th><th>TER</th><th>QUA</th><th>QUI</th><th>SEX</th></tr>' + linhas +
      '  </table>' +
      '  <div class="deq-freq-rodape">' +
      '    <span>P: PRESEN&Ccedil;A / F: FALTA</span>' +
      '    <span>Presen&ccedil;as <b>' + presencas + '</b> &middot; Faltas <b>' + faltas + '</b>' +
      (assid !== null ? ' &middot; Assiduidade <b>' + assid + '%</b>' : '') + '</span>' +
      '  </div>' +
      '</div>' +

      bloco('deq-amarelo', 'Objetivos de ensino', rel.objetivos) +
      bloco('deq-teal', 'Progresso', rel.progresso) +
      bloco('deq-rosa', 'Desafios e plano de interven&ccedil;&atilde;o', rel.desafios) +
      bloco('deq-amarelo', 'Conclus&atilde;o', rel.conclusao) +

      '<div class="deq-local">Uberl&acirc;ndia-MG, ' + new Date().toLocaleDateString('pt-BR') + '</div>' +
      '<div class="deq-assinatura">Equipe ABA<br>Equilibrium Terapia Infantil</div>' +

      '<div class="deq-rodape">' +
      '  <span>Equilibrium Terapia Infantil &middot; Uberl&acirc;ndia/MG</span>' +
      '  <span class="pontos"><i style="background:var(--eq-teal)"></i><i style="background:var(--eq-amarelo)"></i>' +
      '<i style="background:var(--eq-rosa)"></i><i style="background:var(--eq-azul)"></i></span>' +
      '  <span>Documento gerado pelo CORTEX aba &middot; ' + new Date().toLocaleDateString('pt-BR') + '</span>' +
      '</div>' +
      '</div>';
  }
};
