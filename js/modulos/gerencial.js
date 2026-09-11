// ============================================================================
// CORTEX aba - js/modulos/gerencial.js
// Relatorios gerenciais exportaveis: Atendimentos (funil completo da agenda),
// Pacientes e Guias. Sai em planilha (CSV que o Excel abre direto) ou em
// PDF pela janela de impressao, na identidade dos documentos.
// ============================================================================

window.MODULOS = window.MODULOS || {};

window.MODULOS.gerencial = {

  el: null,
  sessao: null,
  _dados: null,

  ROTULO_STATUS: {
    agendada: 'Agendada', checkin: 'Check-in', em_atendimento: 'Em atendimento',
    concluida: 'Atendida', falta: 'Falta', cancelada: 'Cancelada'
  },

  async render(el, sessao) {
    this.el = el;
    this.sessao = sessao;

    const hoje = new Date();
    const inicio = hoje.toISOString().slice(0, 8) + '01';

    const [rPacs, rEquipe] = await Promise.all([
      sb.from('pacientes').select('id, nome').order('nome'),
      sb.from('profiles').select('id, nome').eq('atende_pacientes', true).eq('ativo', true).order('nome')
    ]);
    this._pacs = rPacs.data || [];
    this._equipe = rEquipe.data || [];

    el.innerHTML =
      '<div class="pagina-cabecalho">' +
      '  <div><h2>Relatorios gerenciais</h2>' +
      '  <p class="sub">Gere, confira na tela e exporte em planilha (abre no Excel) ou PDF.</p></div>' +
      '</div>' +

      '<div class="cartao"><div class="grade-form">' +
      '  <div class="campo"><label>Relatorio</label><select id="ge-tipo" onchange="MODULOS.gerencial.mudouTipo()">' +
      '    <option value="atendimentos">Atendimentos (funil da agenda)</option>' +
      '    <option value="pacientes">Pacientes (cadastro)</option>' +
      '    <option value="guias">Guias e saldos</option>' +
      '  </select></div>' +
      '  <div class="campo" id="ge-c-ini"><label>De</label>' +
      '    <input type="date" id="ge-ini" value="' + inicio + '"></div>' +
      '  <div class="campo" id="ge-c-fim"><label>Ate</label>' +
      '    <input type="date" id="ge-fim" value="' + hoje.toISOString().slice(0, 10) + '"></div>' +
      '  <div class="campo" id="ge-c-pac"><label>Paciente</label><select id="ge-pac">' +
      '    <option value="">Todos</option>' +
      this._pacs.map(p => '<option value="' + p.id + '">' + escaparHtml(p.nome) + '</option>').join('') +
      '  </select></div>' +
      '  <div class="campo" id="ge-c-apl"><label>Aplicador</label><select id="ge-apl">' +
      '    <option value="">Todos</option>' +
      this._equipe.map(m => '<option value="' + m.id + '">' + escaparHtml(m.nome) + '</option>').join('') +
      '  </select></div>' +
      '  <div class="campo" id="ge-c-st"><label>Situacao</label><select id="ge-st">' +
      '    <option value="">Todas</option>' +
      Object.entries(this.ROTULO_STATUS).map(([v, r]) => '<option value="' + v + '">' + r + '</option>').join('') +
      '  </select></div>' +
      '</div>' +
      '<div class="barra-acoes" style="margin-top:4px">' +
      '  <button class="btn btn-primario" onclick="MODULOS.gerencial.gerar()">Gerar relatorio</button>' +
      '</div></div>' +

      '<div id="ge-resultado"></div>';
  },

  mudouTipo() {
    const t = document.getElementById('ge-tipo').value;
    const soAtend = t === 'atendimentos';
    document.getElementById('ge-c-apl').style.display = soAtend ? '' : 'none';
    document.getElementById('ge-c-st').style.display = soAtend ? '' : 'none';
    document.getElementById('ge-c-ini').style.display = t === 'pacientes' ? 'none' : '';
    document.getElementById('ge-c-fim').style.display = t === 'pacientes' ? 'none' : '';
    document.getElementById('ge-c-pac').style.display = t === 'guias' ? 'none' : '';
  },

  async gerar() {
    const tipo = document.getElementById('ge-tipo').value;
    const alvo = document.getElementById('ge-resultado');
    alvo.innerHTML = '<div class="cartao"><p class="sub">Gerando...</p></div>';
    try {
      if (tipo === 'atendimentos') await this.gerarAtendimentos();
      else if (tipo === 'pacientes') await this.gerarPacientes();
      else await this.gerarGuias();
    } catch (e) {
      alvo.innerHTML = '<div class="cartao"><div class="mensagem-erro visivel">' +
        escaparHtml(e.message) + '</div></div>';
    }
  },

  // ─────────────── Atendimentos (funil da agenda) ───────────────

  async gerarAtendimentos() {
    const ini = document.getElementById('ge-ini').value;
    const fim = document.getElementById('ge-fim').value;
    if (!ini || !fim || fim < ini) throw new Error('Confira o periodo.');

    let q = sb.from('sessoes')
      .select('data, hora_inicio, duracao_min, status, confirmacao, ' +
              'pacientes(nome, convenio), profissional:profiles!sessoes_aplicador_id_fkey(nome)')
      .gte('data', ini).lte('data', fim)
      .order('data').order('hora_inicio');
    const pac = document.getElementById('ge-pac').value;
    const apl = document.getElementById('ge-apl').value;
    const st = document.getElementById('ge-st').value;
    if (pac) q = q.eq('paciente_id', pac);
    if (apl) q = q.eq('aplicador_id', apl);
    if (st) q = q.eq('status', st);

    const { data, error } = await q.limit(3000);
    if (error) throw new Error(error.message);
    const lista = data || [];

    const cont = { total: lista.length, confirmadas: 0, checkin: 0, atendidas: 0, faltas: 0, canceladas: 0 };
    lista.forEach(s => {
      if (s.confirmacao === 'confirmada') cont.confirmadas++;
      if (s.status === 'checkin' || s.status === 'em_atendimento') cont.checkin++;
      if (s.status === 'concluida') cont.atendidas++;
      if (s.status === 'falta') cont.faltas++;
      if (s.status === 'cancelada') cont.canceladas++;
    });

    const cab = ['Data', 'Hora', 'Paciente', 'Convenio', 'Aplicador', 'Duracao (min)', 'Situacao', 'Confirmada pela familia'];
    const linhas = lista.map(s => [
      this.fmt(s.data), s.hora_inicio.slice(0, 5),
      s.pacientes ? s.pacientes.nome : '', s.pacientes ? s.pacientes.convenio || '' : '',
      s.profissional ? s.profissional.nome : '', s.duracao_min,
      this.ROTULO_STATUS[s.status] || s.status,
      s.confirmacao === 'confirmada' ? 'Sim' : ''
    ]);

    this._dados = {
      titulo: 'Relatorio de Atendimentos',
      sub: 'Periodo ' + this.fmt(ini) + ' a ' + this.fmt(fim),
      resumo: [
        ['Agendadas no periodo', cont.total], ['Confirmadas pela familia', cont.confirmadas],
        ['Check-in realizados', cont.checkin], ['Atendidas', cont.atendidas],
        ['Faltas', cont.faltas], ['Canceladas', cont.canceladas]
      ],
      cab, linhas, arquivo: 'atendimentos_' + ini + '_' + fim
    };
    this.mostrar();
  },

  // ─────────────── Pacientes ───────────────

  async gerarPacientes() {
    let q = sb.from('pacientes')
      .select('nome, data_nascimento, sexo, convenio, carteirinha, nivel, status, admitido_em, ' +
              'aplicador:profiles!pacientes_aplicador_id_fkey(nome)')
      .order('nome');
    const pac = document.getElementById('ge-pac').value;
    if (pac) q = q.eq('id', pac);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    const lista = data || [];

    const cab = ['Nome', 'Nascimento', 'Sexo', 'Convenio', 'Carteirinha', 'Nivel', 'Situacao', 'Admissao', 'Aplicador'];
    const linhas = lista.map(p => [
      p.nome, this.fmt(p.data_nascimento), p.sexo || '', p.convenio || '', p.carteirinha || '',
      p.nivel ? 'Nivel ' + p.nivel : '', p.status, this.fmt(p.admitido_em),
      p.aplicador ? p.aplicador.nome : ''
    ]);

    this._dados = {
      titulo: 'Relatorio de Pacientes',
      sub: lista.length + ' paciente(s)',
      resumo: [
        ['Total', lista.length],
        ['Ativos', lista.filter(p => p.status === 'ativo').length],
        ['Em avaliacao', lista.filter(p => p.status === 'avaliacao').length],
        ['Encerrados', lista.filter(p => p.status === 'encerrado').length]
      ],
      cab, linhas, arquivo: 'pacientes_' + new Date().toISOString().slice(0, 10)
    };
    this.mostrar();
  },

  // ─────────────── Guias e saldos ───────────────

  async gerarGuias() {
    const ini = document.getElementById('ge-ini').value;
    const fim = document.getElementById('ge-fim').value;

    const { data: guias, error } = await sb.from('guias')
      .select('*, pacientes(nome, convenio, carteirinha)')
      .order('vigencia_fim');
    if (error) throw new Error(error.message);
    const lista = (guias || []).filter(g =>
      !ini || !fim || (g.vigencia_inicio <= fim && g.vigencia_fim >= ini));
    if (!lista.length) throw new Error('Nenhuma guia no periodo (o modulo Guias e restrito a direcao).');

    const linhas = [];
    for (const g of lista) {
      const { data: ses } = await sb.from('sessoes')
        .select('status').eq('paciente_id', g.paciente_id)
        .gte('data', g.vigencia_inicio).lte('data', g.vigencia_fim);
      const atendidas = (ses || []).filter(s => s.status === 'concluida').length;
      const faltas = (ses || []).filter(s => s.status === 'falta').length;
      linhas.push([
        g.pacientes ? g.pacientes.nome : '', g.convenio || (g.pacientes ? g.pacientes.convenio : '') || '',
        g.numero, g.pacientes ? g.pacientes.carteirinha || '' : '',
        this.fmt(g.vigencia_inicio), this.fmt(g.vigencia_fim),
        g.qtd_autorizada, atendidas, faltas, g.qtd_autorizada - atendidas
      ]);
    }

    this._dados = {
      titulo: 'Relatorio de Guias e Saldos',
      sub: lista.length + ' guia(s)' + (ini && fim ? ' com vigencia no periodo ' + this.fmt(ini) + ' a ' + this.fmt(fim) : ''),
      resumo: [
        ['Guias', lista.length],
        ['Autorizadas (soma)', linhas.reduce((s, l) => s + l[6], 0)],
        ['Atendidas (soma)', linhas.reduce((s, l) => s + l[7], 0)],
        ['Saldo (soma)', linhas.reduce((s, l) => s + l[9], 0)]
      ],
      cab: ['Paciente', 'Convenio', 'Guia', 'Carteirinha', 'Vigencia inicio', 'Vigencia fim',
            'Autorizadas', 'Atendidas', 'Faltas', 'Saldo'],
      linhas, arquivo: 'guias_' + new Date().toISOString().slice(0, 10)
    };
    this.mostrar();
  },

  // ─────────────── Tela, planilha e PDF ───────────────

  fmt(d) { return d ? String(d).slice(0, 10).split('-').reverse().join('/') : ''; },

  mostrar() {
    const d = this._dados;
    document.getElementById('ge-resultado').innerHTML =
      '<div class="cartao">' +
      '<div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:10px">' +
      '  <div><h3 style="margin:0">' + d.titulo + '</h3><p class="sub">' + d.sub + ' &middot; ' + d.linhas.length + ' linha(s)</p></div>' +
      '  <div style="display:flex; gap:8px">' +
      '    <button class="btn btn-fantasma" onclick="MODULOS.gerencial.baixarPlanilha()">&#128202; Planilha (Excel)</button>' +
      '    <button class="btn btn-primario" onclick="MODULOS.gerencial.abrirPdf()">&#128424; PDF / Imprimir</button>' +
      '  </div>' +
      '</div>' +
      '<div class="grade-visao" style="margin-bottom:12px">' +
      d.resumo.map(([r, v]) => '<div class="caixa-info"><small>' + r + '</small><b>' + v + '</b></div>').join('') +
      '</div>' +
      '<div style="overflow:auto; max-height:56vh">' +
      '<table class="tabela-presenca"><thead><tr>' +
      d.cab.map(c => '<th>' + c + '</th>').join('') + '</tr></thead><tbody>' +
      d.linhas.slice(0, 400).map(l => '<tr>' + l.map(v => '<td>' + escaparHtml(String(v ?? '')) + '</td>').join('') + '</tr>').join('') +
      '</tbody></table>' +
      (d.linhas.length > 400 ? '<p class="sub" style="margin-top:8px">Mostrando 400 de ' + d.linhas.length +
        ' na tela; a planilha e o PDF saem completos.</p>' : '') +
      '</div></div>';
  },

  baixarPlanilha() {
    const d = this._dados;
    const esc = v => {
      const t = String(v ?? '');
      return /[;"\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
    };
    const csv = '\ufeff' +
      d.titulo + ';' + d.sub + '\n\n' +
      d.resumo.map(([r, v]) => r + ';' + v).join('\n') + '\n\n' +
      d.cab.join(';') + '\n' +
      d.linhas.map(l => l.map(esc).join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = d.arquivo + '.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  },

  abrirPdf() {
    const d = this._dados;
    document.getElementById('doc-eq-overlay')?.remove();
    const ov = document.createElement('div');
    ov.id = 'doc-eq-overlay';
    ov.className = 'folha-overlay';
    ov.innerHTML = '<div class="folha-pagina" style="max-width:1000px">' +
      '<div class="pagina-cabecalho nao-imprime">' +
      '  <div><button class="btn-voltar" onclick="document.getElementById(\'doc-eq-overlay\').remove()">&larr; Fechar</button>' +
      '  <h2>' + d.titulo + '</h2></div>' +
      '  <button class="btn btn-primario" onclick="window.print()">&#128424; Imprimir / PDF</button>' +
      '</div>' +
      '<div class="doc-eq">' +
      '<div class="deq-cab">' +
      '  <img src="icones/equilibrium.png" alt="Equilibrium">' +
      '  <div class="deq-cab-t"><h1>' + d.titulo.toUpperCase() + '</h1>' +
      '  <p>Equilibrium Terapia Infantil &middot; ' + d.sub + '</p></div>' +
      '</div>' +
      '<div class="deq-caixa deq-dados" style="grid-template-columns:repeat(' + Math.min(6, d.resumo.length) + ', 1fr); margin-top:8px">' +
      d.resumo.map(([r, v]) => '<div style="border-bottom:none"><small>' + r + '</small><b>' + v + '</b></div>').join('') +
      '</div>' +
      '<table class="deq-freq" style="margin-top:12px"><tr>' +
      d.cab.map(c => '<th style="padding:6px 8px; font-size:9.5px">' + c + '</th>').join('') + '</tr>' +
      d.linhas.map(l => '<tr>' + l.map(v =>
        '<td style="width:auto; padding:5px 8px; font-size:10px; text-align:left">' +
        escaparHtml(String(v ?? '')) + '</td>').join('') + '</tr>').join('') +
      '</table>' +
      '<div class="deq-rodape">' +
      '  <span>Equilibrium Terapia Infantil &middot; Uberl&acirc;ndia/MG</span>' +
      '  <span class="pontos"><i style="background:var(--eq-teal)"></i><i style="background:var(--eq-amarelo)"></i>' +
      '<i style="background:var(--eq-rosa)"></i><i style="background:var(--eq-azul)"></i></span>' +
      '  <span>Gerado pelo CORTEX aba &middot; ' + new Date().toLocaleDateString('pt-BR') + '</span>' +
      '</div>' +
      '</div></div>';
    document.body.appendChild(ov);
  }
};
