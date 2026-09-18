// ============================================================================
// CORTEX aba - js/modulos/guias.js
// Guias de convenio (direcao): autorizacoes com saldo, funil da agenda
// (agendado -> confirmado -> check-in -> atendido) e conferencia sessao a
// sessao dentro da vigencia de cada guia.
// ============================================================================

window.MODULOS = window.MODULOS || {};

window.MODULOS.guias = {

  el: null,
  sessao: null,
  _mes: null,

  ROTULO_STATUS: {
    agendada: 'Agendada', checkin: 'Check-in', em_atendimento: 'Em atendimento',
    concluida: 'Atendida', falta: 'Falta', cancelada: 'Cancelada'
  },

  async render(el, sessao) {
    this.el = el;
    this.sessao = sessao;
    if (!this._mes) this._mes = mesLocal();
    this.telaLista();
  },

  // ─────────────── Visao geral ───────────────

  async telaLista() {
    this.el.innerHTML =
      '<div class="pagina-cabecalho">' +
      '  <div><h2>Guias &middot; convenio</h2>' +
      '  <p class="sub">Controle da direcao: autorizacoes, saldo de sessoes e o funil da agenda para conferencia com o convenio.</p></div>' +
      '  <button class="btn btn-primario" onclick="MODULOS.guias.modalGuia()">+ Nova guia</button>' +
      '</div>' +
      '<div class="toolbar">' +
      '  <input type="month" id="gu-mes" value="' + this._mes + '" ' +
      '    onchange="MODULOS.guias._mes = this.value; MODULOS.guias.telaLista()">' +
      '</div>' +
      '<div id="gu-corpo"><div class="cartao"><p class="sub">Carregando...</p></div></div>';

    const inicio = this._mes + '-01';
    const fimD = new Date(this._mes + '-01T12:00:00');
    fimD.setMonth(fimD.getMonth() + 1); fimD.setDate(0);
    const fim = fimD.toISOString().slice(0, 10);

    const [rSes, rGuias] = await Promise.all([
      sb.from('sessoes')
        .select('id, data, status, confirmacao, paciente_id, pacientes(nome, convenio)')
        .gte('data', inicio).lte('data', fim),
      sb.from('guias')
        .select('*, pacientes(nome, convenio, carteirinha)')
        .order('vigencia_fim')
    ]);

    const alvo = document.getElementById('gu-corpo');
    if (rGuias.error) {
      alvo.innerHTML = '<div class="cartao"><div class="mensagem-erro visivel">' +
        escaparHtml(rGuias.error.message) + '</div></div>';
      return;
    }

    const sessoes = rSes.data || [];
    this._guias = rGuias.data || [];

    // Funil do mes
    const cont = { total: sessoes.length, confirmadas: 0, checkin: 0, atendidas: 0, faltas: 0, canceladas: 0 };
    sessoes.forEach(s => {
      if (s.confirmacao === 'confirmada') cont.confirmadas++;
      if (s.status === 'checkin' || s.status === 'em_atendimento') cont.checkin++;
      if (s.status === 'concluida') cont.atendidas++;
      if (s.status === 'falta') cont.faltas++;
      if (s.status === 'cancelada') cont.canceladas++;
    });

    // Consumo por guia (sessoes atendidas dentro da vigencia)
    const usoPorGuia = {};
    for (const g of this._guias) {
      usoPorGuia[g.id] = null;
    }

    const hoje = hojeLocal();

    alvo.innerHTML =
      '<div class="grade-visao" style="margin-bottom:14px">' +
      '  <div class="caixa-info"><small>Agendadas no mes</small><b>' + cont.total + '</b></div>' +
      '  <div class="caixa-info"><small>Confirmadas</small><b>' + cont.confirmadas + '</b></div>' +
      '  <div class="caixa-info"><small>Check-in</small><b>' + cont.checkin + '</b></div>' +
      '  <div class="caixa-info"><small>Atendidas</small><b style="color:#15803D">' + cont.atendidas + '</b></div>' +
      '  <div class="caixa-info"><small>Faltas</small><b style="color:var(--st-bad)">' + cont.faltas + '</b></div>' +
      '  <div class="caixa-info"><small>Canceladas</small><b>' + cont.canceladas + '</b></div>' +
      '</div>' +

      '<div class="cartao"><h3>Guias cadastradas <span class="selo selo-neutro">' + this._guias.length + '</span></h3>' +
      (this._guias.length
        ? '<div id="gu-lista">' + this._guias.map(g =>
            '<div class="linha-doc" id="gu-linha-' + g.id + '"><div style="flex:1">' +
            '<b>' + escaparHtml(g.pacientes ? g.pacientes.nome : '?') + '</b> &middot; ' +
            escaparHtml(g.convenio || (g.pacientes ? g.pacientes.convenio : '') || '-') +
            ' &middot; guia <b>' + escaparHtml(g.numero) + '</b>' +
            '<small>Vigencia ' + this.fmt(g.vigencia_inicio) + ' a ' + this.fmt(g.vigencia_fim) +
            ' &middot; ' + g.qtd_autorizada + ' sessoes autorizadas' +
            (g.vigencia_fim < hoje ? ' &middot; <b style="color:var(--st-bad)">vencida</b>' : '') +
            '</small>' +
            '<div class="gu-saldo" id="gu-saldo-' + g.id + '"><small class="sub">calculando saldo...</small></div>' +
            '</div>' +
            '<div class="pac-selos">' +
            '<button class="btn-chip cheio" onclick="MODULOS.guias.abrirGuia(\'' + g.id + '\')">Conferir</button>' +
            '<button class="btn-chip" onclick="MODULOS.guias.modalGuia(\'' + g.id + '\')">Editar</button>' +
            '</div></div>').join('') + '</div>'
        : '<p class="sub">Nenhuma guia cadastrada. Use + Nova guia.</p>') +
      '</div>';

    // Saldos em segundo plano
    for (const g of this._guias) this.calcularSaldo(g);
  },

  fmt(d) { return d ? d.split('-').reverse().join('/') : '-'; },

  async calcularSaldo(g) {
    const { data } = await sb.from('sessoes')
      .select('id, status')
      .eq('paciente_id', g.paciente_id)
      .gte('data', g.vigencia_inicio).lte('data', g.vigencia_fim);
    const atendidas = (data || []).filter(s => s.status === 'concluida').length;
    const agendadas = (data || []).filter(s => !['concluida', 'falta', 'cancelada'].includes(s.status)).length;
    const saldo = g.qtd_autorizada - atendidas;
    const pct = g.qtd_autorizada ? Math.min(100, Math.round(atendidas * 100 / g.qtd_autorizada)) : 0;
    const alvo = document.getElementById('gu-saldo-' + g.id);
    if (!alvo) return;
    alvo.innerHTML =
      '<div style="display:flex; align-items:center; gap:10px; margin-top:5px">' +
      '<div style="width:170px; height:8px; background:var(--surface-alt); border-radius:5px; overflow:hidden">' +
      '<div style="height:100%; width:' + pct + '%; border-radius:5px; background:' +
      (pct >= 100 ? 'var(--st-bad)' : pct >= 80 ? '#D97706' : '#15803D') + '"></div></div>' +
      '<small><b>' + atendidas + '</b> atendidas &middot; <b>' + agendadas + '</b> a realizar &middot; saldo <b style="color:' +
      (saldo <= 0 ? 'var(--st-bad)' : saldo <= 5 ? '#D97706' : '#15803D') + '">' + saldo + '</b></small>' +
      '</div>';
  },

  // ─────────────── Cadastro da guia ───────────────

  modalGuia(id) {
    const g = id ? this._guias.find(x => x.id === id) : null;
    const hoje = new Date();
    const fim = new Date(hoje); fim.setMonth(fim.getMonth() + 3);

    abrirModal(g ? 'Editar guia' : 'Nova guia',
      '<div class="grade-form">' +
      '  <div class="campo c2"><label>Paciente *</label><select id="gu-pac"' + (g ? ' disabled' : '') + '>' +
      '<option value="">Selecione</option></select></div>' +
      '  <div class="campo"><label>Numero da guia *</label>' +
      '    <input id="gu-num" value="' + escaparHtml(g ? g.numero : '') + '"></div>' +
      '  <div class="campo"><label>Convenio</label>' +
      '    <input id="gu-conv" placeholder="do cadastro se vazio" value="' + escaparHtml(g ? g.convenio || '' : '') + '"></div>' +
      '  <div class="campo"><label>Sessoes autorizadas *</label>' +
      '    <input type="number" id="gu-qtd" min="1" max="500" value="' + (g ? g.qtd_autorizada : 48) + '"></div>' +
      '  <div class="campo"><label>Senha / autorizacao</label>' +
      '    <input id="gu-senha" value="' + escaparHtml(g ? g.senha || '' : '') + '"></div>' +
      '  <div class="campo"><label>Vigencia - inicio *</label>' +
      '    <input type="date" id="gu-ini" value="' + (g ? g.vigencia_inicio : hoje.toISOString().slice(0, 10)) + '"></div>' +
      '  <div class="campo"><label>Vigencia - fim *</label>' +
      '    <input type="date" id="gu-fim" value="' + (g ? g.vigencia_fim : fim.toISOString().slice(0, 10)) + '"></div>' +
      '  <div class="campo c3"><label>Observacoes</label>' +
      '    <input id="gu-obs" value="' + escaparHtml(g ? g.obs || '' : '') + '"></div>' +
      '</div>' +
      '<div class="mensagem-erro" id="gu-erro"></div>' +
      '<div class="barra-acoes">' +
      (g ? '<button class="btn btn-fantasma" style="margin-right:auto" onclick="MODULOS.guias.excluirGuia(\'' + g.id + '\')">Excluir</button>' : '') +
      '  <button class="btn btn-fantasma" onclick="fecharModal()">Cancelar</button>' +
      '  <button class="btn btn-primario" onclick="MODULOS.guias.salvarGuia(' + (g ? '\'' + g.id + '\'' : 'null') + ')">Salvar</button>' +
      '</div>', true);

    this.preencherPacientes(g ? g.paciente_id : null);
  },

  async preencherPacientes(selecionado) {
    const { data } = await sb.from('pacientes')
      .select('id, nome, convenio').neq('status', 'encerrado').order('nome');
    const sel = document.getElementById('gu-pac');
    if (!sel) return;
    sel.innerHTML = '<option value="">Selecione</option>' +
      (data || []).map(p => '<option value="' + p.id + '"' +
        (p.id === selecionado ? ' selected' : '') + '>' + escaparHtml(p.nome) +
        (p.convenio ? ' (' + escaparHtml(p.convenio) + ')' : '') + '</option>').join('');
  },

  async salvarGuia(id) {
    const erro = document.getElementById('gu-erro');
    erro.classList.remove('visivel');
    const dados = {
      paciente_id: document.getElementById('gu-pac').value,
      numero: document.getElementById('gu-num').value.trim(),
      convenio: document.getElementById('gu-conv').value.trim() || null,
      qtd_autorizada: parseInt(document.getElementById('gu-qtd').value, 10) || 0,
      senha: document.getElementById('gu-senha').value.trim() || null,
      vigencia_inicio: document.getElementById('gu-ini').value,
      vigencia_fim: document.getElementById('gu-fim').value,
      obs: document.getElementById('gu-obs').value.trim() || null
    };
    if (!dados.paciente_id || !dados.numero || !dados.qtd_autorizada ||
        !dados.vigencia_inicio || !dados.vigencia_fim) {
      erro.textContent = 'Preencha paciente, numero, sessoes autorizadas e vigencia.';
      erro.classList.add('visivel');
      return;
    }
    if (dados.vigencia_fim < dados.vigencia_inicio) {
      erro.textContent = 'A vigencia final precisa ser depois da inicial.';
      erro.classList.add('visivel');
      return;
    }

    let resp;
    if (id) resp = await sb.from('guias').update(dados).eq('id', id);
    else resp = await sb.from('guias').insert(Object.assign({ criado_por: this.sessao.user.id }, dados));
    if (resp.error) {
      erro.textContent = resp.error.message;
      erro.classList.add('visivel');
      return;
    }
    fecharModal();
    this.telaLista();
  },

  async excluirGuia(id) {
    if (!await popConfirmar('Excluir esta guia? As sessoes nao sao afetadas; some apenas o controle.')) return;
    const { error } = await sb.from('guias').delete().eq('id', id);
    if (error) { alert(error.message); return; }
    fecharModal();
    this.telaLista();
  },

  // ─────────────── Conferencia da guia ───────────────

  async abrirGuia(id) {
    const g = this._guias.find(x => x.id === id);
    if (!g) return;

    const { data: sessoes } = await sb.from('sessoes')
      .select('id, data, hora_inicio, status, confirmacao, profissional:profiles!sessoes_aplicador_id_fkey(nome)')
      .eq('paciente_id', g.paciente_id)
      .gte('data', g.vigencia_inicio).lte('data', g.vigencia_fim)
      .order('data').order('hora_inicio');

    const lista = sessoes || [];
    const atendidas = lista.filter(s => s.status === 'concluida').length;
    const selo = s => {
      const cores = { concluida: 'selo-ok', falta: 'selo-bad', cancelada: 'selo-neutro',
                      checkin: 'selo-warn', em_atendimento: 'selo-warn', agendada: 'selo-roxo' };
      return '<span class="selo ' + (cores[s.status] || 'selo-neutro') + '">' +
        (this.ROTULO_STATUS[s.status] || s.status) + '</span>' +
        (s.confirmacao === 'confirmada' && s.status === 'agendada'
          ? '<span class="selo selo-ok">Confirmada</span>' : '');
    };

    this.el.innerHTML =
      '<div class="pagina-cabecalho">' +
      '  <div><button class="btn-voltar" onclick="MODULOS.guias.telaLista()">&larr; Guias</button>' +
      '  <h2>' + escaparHtml(g.pacientes ? g.pacientes.nome : '') + ' &middot; guia ' + escaparHtml(g.numero) + '</h2>' +
      '  <p class="sub">' + escaparHtml(g.convenio || (g.pacientes ? g.pacientes.convenio : '') || '') +
      (g.pacientes && g.pacientes.carteirinha ? ' &middot; carteirinha ' + escaparHtml(g.pacientes.carteirinha) : '') +
      ' &middot; vigencia ' + this.fmt(g.vigencia_inicio) + ' a ' + this.fmt(g.vigencia_fim) +
      (g.senha ? ' &middot; senha ' + escaparHtml(g.senha) : '') + '</p></div>' +
      '</div>' +

      '<div class="grade-visao" style="margin-bottom:14px">' +
      '  <div class="caixa-info"><small>Autorizadas</small><b>' + g.qtd_autorizada + '</b></div>' +
      '  <div class="caixa-info"><small>Atendidas</small><b style="color:#15803D">' + atendidas + '</b></div>' +
      '  <div class="caixa-info"><small>Saldo</small><b style="color:' +
           (g.qtd_autorizada - atendidas <= 0 ? 'var(--st-bad)' : 'inherit') + '">' +
           (g.qtd_autorizada - atendidas) + '</b></div>' +
      '  <div class="caixa-info"><small>Na vigencia</small><b>' + lista.length + ' sessoes</b></div>' +
      '</div>' +

      '<div class="cartao"><h3>Sessoes da vigencia <small class="sub">&middot; tudo que passou pela agenda</small></h3>' +
      (lista.length
        ? '<table class="tabela-presenca"><thead><tr>' +
          '<th>Data</th><th>Hora</th><th>Aplicador</th><th>Situacao</th></tr></thead><tbody>' +
          lista.map(s =>
            '<tr><td>' + this.fmt(s.data) + '</td>' +
            '<td>' + s.hora_inicio.slice(0, 5) + '</td>' +
            '<td>' + escaparHtml(s.profissional ? s.profissional.nome : '-') + '</td>' +
            '<td><div class="pac-selos">' + selo(s) + '</div></td></tr>').join('') +
          '</tbody></table>'
        : '<p class="sub">Nenhuma sessao dentro da vigencia.</p>') +
      '</div>';
  }
};
