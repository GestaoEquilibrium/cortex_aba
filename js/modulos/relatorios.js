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
      (regs || []).forEach(r => { tentativas++; if (r.resposta === 'I') indep++; });
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
      '  <button class="btn btn-primario" onclick="window.print()">&#128424; Imprimir</button>' +
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
        ? '<div class="campo"><label>Texto para a familia (linguagem simples e acolhedora) *</label>' +
          '<textarea id="rm-texto" rows="14" oninput="MODULOS.relatorios.salvarAuto()" ' +
          'style="resize:vertical" placeholder="Como foi o mes, conquistas, o que estamos trabalhando, orientacoes para casa...">' +
          escaparHtml(rel.texto || '') + '</textarea></div>'
        : '<div style="font-size:13px; line-height:1.8; white-space:pre-wrap">' +
          (rel.texto ? escaparHtml(rel.texto) : '<span class="sub">Sem texto.</span>') + '</div>') +
      '</div>';
  },

  _timer: null,
  salvarAuto() {
    clearTimeout(this._timer);
    this._timer = setTimeout(async () => {
      const texto = document.getElementById('rm-texto')?.value || '';
      await sb.from('relatorios_mensais')
        .update({ texto: texto }).eq('id', this._rel.id);
      this._rel.texto = texto;
    }, 700);
  },

  async liberar() {
    clearTimeout(this._timer);
    const texto = document.getElementById('rm-texto')?.value.trim() || '';
    if (!texto) { alert('Escreva o relatorio antes de liberar.'); return; }
    if (!confirm('Liberar este relatorio no portal da familia? Depois de liberado ele fica somente leitura.')) return;

    const { error } = await sb.from('relatorios_mensais')
      .update({ texto: texto, status: 'liberado', liberado_em: new Date().toISOString() })
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
  }
};
