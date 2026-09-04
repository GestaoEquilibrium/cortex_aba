// ============================================================================
// CORTEX aba - js/modulos/agenda.js
// Agenda com tres visoes (Dia / Semana / Mes) sobre as sessoes reais.
// Clicar numa sessao abre a janela suspensa com detalhes, confirmacao via
// WhatsApp (link que a familia responde e atualiza na hora), check-in,
// iniciar, finalizar e falta. A grade fixa continua como tela de gestao.
// ============================================================================

window.MODULOS = window.MODULOS || {};

window.MODULOS.agenda = {

  PODE_GERIR: ['direcao', 'coordenador', 'suporte'],
  DIAS: ['', 'Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado', 'Domingo'],
  MESES: ['Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
          'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],

  el: null,
  sessao: null,
  visao: 'dia',
  dataRef: null,
  grade: [],
  pacientes: [],
  equipe: [],
  salas: [],
  _canal: null,

  gere() { return perm('agenda_grade') === 'E'; },

  async render(el, sessao) {
    this.el = el;
    this.sessao = sessao;
    this.dataRef = new Date().toISOString().slice(0, 10);
    this.visao = 'dia';
    await this.carregarBase();
    this.telaPrincipal();
    this.ligarTempoReal();
  },

  async carregarBase() {
    const [g, p, e, s] = await Promise.all([
      sb.from('grade_horarios')
        .select('*, pacientes(id, nome, nivel), profissional:profiles!grade_horarios_aplicador_id_fkey(id, nome), salas(id, nome)')
        .eq('ativo', true).order('hora_inicio'),
      sb.from('pacientes').select('id, nome, nivel, aplicador_id').neq('status', 'encerrado').order('nome'),
      sb.from('profiles').select('id, nome, perfil').eq('atende_pacientes', true).eq('ativo', true).order('nome'),
      sb.from('salas').select('*').order('nome')
    ]);
    this.grade = g.data || [];
    this.pacientes = p.data || [];
    this.equipe = e.data || [];
    this.salas = s.data || [];
  },

  ligarTempoReal() {
    if (this._canal) sb.removeChannel(this._canal);
    this._canal = sb.channel('agenda-sessoes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessoes' },
        () => { if (document.getElementById('ag-corpo')) this.desenhar(); })
      .subscribe();
  },

  // ───────────────────────── ESTRUTURA ─────────────────────────

  telaPrincipal() {
    this.el.innerHTML =
      '<div class="pagina-cabecalho">' +
      '  <div><h2>Agenda</h2><p class="sub" id="ag-sub"></p></div>' +
      '  <div style="display:flex; gap:8px; flex-wrap:wrap">' +
      '    <button class="btn-chip" onclick="window.open(\'tv.html\', \'_blank\')">&#128250; TV</button>' +
      (this.gere()
        ? '<button class="btn-chip" onclick="MODULOS.agenda.telaGrade()">Grade fixa</button>' +
          '<button class="btn-chip" onclick="MODULOS.agenda.modalSalas()">Salas</button>' +
          '<button class="btn btn-primario" onclick="MODULOS.agenda.modalHorario()">+ Novo horario</button>'
        : '') +
      '  </div>' +
      '</div>' +
      '<div class="ag-controles">' +
      '  <div class="segmento">' +
      ['dia', 'semana', 'mes'].map(v =>
        '<button type="button" class="seg' + (this.visao === v ? ' ativo' : '') + '" data-visao="' + v + '" ' +
        'onclick="MODULOS.agenda.mudarVisao(\'' + v + '\')">' +
        (v === 'dia' ? 'Dia' : v === 'semana' ? 'Semana' : 'Mes') + '</button>').join('') +
      '  </div>' +
      '  <div class="ag-nav">' +
      '    <button class="botao-icone tema" onclick="MODULOS.agenda.navegar(-1)">&lsaquo;</button>' +
      '    <button class="btn-chip" onclick="MODULOS.agenda.irHoje()">Hoje</button>' +
      '    <button class="botao-icone tema" onclick="MODULOS.agenda.navegar(1)">&rsaquo;</button>' +
      '  </div>' +
      '</div>' +
      '<div id="ag-corpo"></div>';

    this.desenhar();
  },

  mudarVisao(v) {
    this.visao = v;
    document.querySelectorAll('[data-visao]').forEach(b =>
      b.classList.toggle('ativo', b.dataset.visao === v));
    this.desenhar();
  },

  navegar(delta) {
    const d = new Date(this.dataRef + 'T12:00:00');
    if (this.visao === 'dia') d.setDate(d.getDate() + delta);
    else if (this.visao === 'semana') d.setDate(d.getDate() + delta * 7);
    else d.setMonth(d.getMonth() + delta);
    this.dataRef = d.toISOString().slice(0, 10);
    this.desenhar();
  },

  irHoje() {
    this.dataRef = new Date().toISOString().slice(0, 10);
    this.desenhar();
  },

  desenhar() {
    if (this.visao === 'dia') this.desenharDia();
    else if (this.visao === 'semana') this.desenharSemana();
    else this.desenharMes();
  },

  segunda(dataStr) {
    const d = new Date(dataStr + 'T12:00:00');
    const dow = d.getDay();
    d.setDate(d.getDate() + (dow === 0 ? 1 : 1 - dow));
    return d;
  },

  fmt(d) { return d.toISOString().slice(0, 10); },

  selosSessao(s) {
    const st = {
      agendada: ['selo-st-amarelo', 'Agendada'],
      checkin: ['selo-st-azul', 'Chegou'],
      em_atendimento: ['selo-st-verde', 'Em atendimento'],
      concluida: ['selo-st-roxo', 'Concluida'],
      falta: ['selo-st-vermelho', 'Falta'],
      cancelada: ['selo-st-vermelho', 'Cancelada']
    }[s.status] || ['selo-neutro', s.status];
    const cf = {
      confirmada: '<span class="selo selo-ok">Confirmada</span>',
      desmarcada: '<span class="selo selo-bad">Desmarcada</span>'
    }[s.confirmacao] || '';
    return '<span class="selo ' + st[0] + '">' + st[1] + '</span>' + cf;
  },

  // ───────────────────────── VISAO DIA ─────────────────────────

  async desenharDia() {
    const d = new Date(this.dataRef + 'T12:00:00');
    document.getElementById('ag-sub').textContent =
      this.DIAS[d.getDay() === 0 ? 7 : d.getDay()] + ', ' + d.toLocaleDateString('pt-BR');

    await sb.rpc('gerar_sessoes_do_dia', { p_data: this.dataRef });

    const { data: sessoes, error } = await sb.from('sessoes')
      .select('*, pacientes(nome), profissional:profiles!sessoes_aplicador_id_fkey(nome), salas(nome)')
      .eq('data', this.dataRef).order('hora_inicio');

    const alvo = document.getElementById('ag-corpo');
    if (!alvo) return;
    if (error) { alvo.innerHTML = '<div class="cartao"><div class="mensagem-erro visivel">' + escaparHtml(error.message) + '</div></div>'; return; }

    if (!sessoes || sessoes.length === 0) {
      alvo.innerHTML = '<div class="cartao"><div class="vazio">' +
        '<div class="simbolo-vazio">&#128197;</div><strong>Sem sessoes neste dia</strong>' +
        'A grade fixa nao tem horarios para esta data.</div></div>';
      return;
    }

    alvo.innerHTML = '<div class="grade-checkin">' + sessoes.map(s => {
      const prof = s.profissional
        ? s.profissional.nome.split(' ').slice(0, 2).join(' ')
        : 'Sem profissional';
      return '<div class="cartao cartao-checkin clicavel-sessao ck-st-' + s.status + '" ' +
        'onclick="MODULOS.agenda.abrirSessao(\'' + s.id + '\')">' +
        '<div class="ck-hora">' + s.hora_inicio.slice(0, 5) + '</div>' +
        '<div class="ck-info">' +
        '  <b>' + escaparHtml(s.pacientes ? s.pacientes.nome : '?') + '</b>' +
        '  <span class="ck-prof">&#128100; ' + escaparHtml(prof) +
        (s.salas ? ' <small>&middot; ' + escaparHtml(s.salas.nome) + '</small>' : '') + '</span>' +
        '  <div class="pac-selos">' + this.selosSessao(s) + '</div>' +
        '</div></div>';
    }).join('') + '</div>';
  },

  // ───────────────────────── VISAO SEMANA ─────────────────────────

  async desenharSemana() {
    const seg = this.segunda(this.dataRef);
    const fim = new Date(seg); fim.setDate(seg.getDate() + 4);
    document.getElementById('ag-sub').textContent =
      'Semana de ' + seg.toLocaleDateString('pt-BR') + ' a ' + fim.toLocaleDateString('pt-BR');

    const datas = [];
    for (let i = 0; i < 5; i++) {
      const d = new Date(seg); d.setDate(seg.getDate() + i);
      datas.push(this.fmt(d));
    }
    await Promise.all(datas.map(dt => sb.rpc('gerar_sessoes_do_dia', { p_data: dt })));

    const { data: sessoes } = await sb.from('sessoes')
      .select('id, data, hora_inicio, status, confirmacao, pacientes(nome), profissional:profiles!sessoes_aplicador_id_fkey(nome), salas(nome)')
      .gte('data', datas[0]).lte('data', datas[4]).order('hora_inicio');

    const alvo = document.getElementById('ag-corpo');
    if (!alvo) return;

    let html = '<div class="agenda-grade">';
    datas.forEach((dt, i) => {
      const doDia = (sessoes || []).filter(s => s.data === dt);
      const hoje = dt === new Date().toISOString().slice(0, 10);
      html += '<div class="agenda-dia' + (hoje ? ' hoje' : '') + '">' +
        '<div class="agenda-dia-titulo">' + this.DIAS[i + 1] + ' ' +
        dt.slice(8, 10) + '/' + dt.slice(5, 7) +
        ' <span class="selo selo-neutro">' + doDia.length + '</span></div>';
      if (doDia.length === 0) html += '<div class="agenda-vazio">&mdash;</div>';
      doDia.forEach(s => {
        html += '<div class="chip-sessao clicavel ck-st-' + s.status + '" ' +
          'onclick="MODULOS.agenda.abrirSessao(\'' + s.id + '\')">' +
          '<b>' + s.hora_inicio.slice(0, 5) + '</b> ' +
          '<span class="chip-nome">' + escaparHtml(s.pacientes ?
            s.pacientes.nome.split(' ')[0] + ' ' + (s.pacientes.nome.split(' ')[1] || '') : '?') + '</span>' +
          '<small class="chip-prof">&#128100; ' + escaparHtml(s.profissional ? s.profissional.nome.split(' ')[0] : '-') +
          (s.salas ? ' &middot; ' + escaparHtml(s.salas.nome) : '') + '</small>' +
          '</div>';
      });
      html += '</div>';
    });
    html += '</div>';
    alvo.innerHTML = html;
  },

  // ───────────────────────── VISAO MES ─────────────────────────

  async desenharMes() {
    const ref = new Date(this.dataRef + 'T12:00:00');
    const ano = ref.getFullYear(), mes = ref.getMonth();
    document.getElementById('ag-sub').textContent = this.MESES[mes] + ' de ' + ano;

    const primeiro = new Date(ano, mes, 1);
    const ultimo = new Date(ano, mes + 1, 0);

    const { data: sessoes } = await sb.from('sessoes')
      .select('data, status')
      .gte('data', this.fmt(primeiro)).lte('data', this.fmt(ultimo));

    const porDia = {};
    (sessoes || []).forEach(s => {
      porDia[s.data] = porDia[s.data] || { total: 0, concluidas: 0, faltas: 0 };
      porDia[s.data].total++;
      if (s.status === 'concluida') porDia[s.data].concluidas++;
      if (s.status === 'falta') porDia[s.data].faltas++;
    });

    // Previsto pela grade fixa (para dias sem sessoes geradas)
    const gradePorDow = {};
    this.grade.forEach(h => { gradePorDow[h.dia_semana] = (gradePorDow[h.dia_semana] || 0) + 1; });

    const hoje = new Date().toISOString().slice(0, 10);
    let html = '<div class="cartao"><div class="mes-grade">' +
      ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'].map(d =>
        '<div class="mes-cab">' + d + '</div>').join('');

    const inicioDow = primeiro.getDay() === 0 ? 7 : primeiro.getDay();
    for (let i = 1; i < inicioDow; i++) html += '<div class="mes-dia vazio-mes"></div>';

    for (let dia = 1; dia <= ultimo.getDate(); dia++) {
      const d = new Date(ano, mes, dia);
      const dt = this.fmt(d);
      const dow = d.getDay() === 0 ? 7 : d.getDay();
      const info = porDia[dt];
      const previsto = !info && dow <= 6 ? gradePorDow[dow] : null;

      html += '<div class="mes-dia' + (dt === hoje ? ' hoje' : '') + '" ' +
        'onclick="MODULOS.agenda.abrirDia(\'' + dt + '\')">' +
        '<span class="mes-num">' + dia + '</span>' +
        (info
          ? '<span class="mes-info">' + info.total + ' sessao(oes)' +
            (info.faltas ? ' <b class="mes-falta">' + info.faltas + 'F</b>' : '') + '</span>'
          : previsto
            ? '<span class="mes-info previsto">' + previsto + ' na grade</span>'
            : '') +
        '</div>';
    }
    html += '</div></div>';
    document.getElementById('ag-corpo').innerHTML = html;
  },

  abrirDia(dt) {
    this.dataRef = dt;
    this.mudarVisao('dia');
  },

  // ───────────────────────── JANELA DA SESSAO ─────────────────────────

  async abrirSessao(id) {
    const { data: s } = await sb.from('sessoes')
      .select('*, pacientes(id, nome, data_nascimento, foto_path), profissional:profiles!sessoes_aplicador_id_fkey(nome), salas(nome)')
      .eq('id', id).single();
    if (!s) return;

    const { data: resps } = await sb.from('responsaveis')
      .select('nome, telefone, principal')
      .eq('paciente_id', s.pacientes.id)
      .order('principal', { ascending: false });
    const resp = (resps || []).find(r => r.telefone) || (resps || [])[0] || null;

    const dataFmt = new Date(s.data + 'T12:00:00').toLocaleDateString('pt-BR');
    const aberta = !['concluida', 'falta', 'cancelada'].includes(s.status);

    const podeOperar = perm('agenda') === 'E';

    let fotoUrl = null;
    if (s.pacientes.foto_path) {
      try {
        const { data: u } = await sb.storage.from('documentos')
          .createSignedUrl(s.pacientes.foto_path, 600);
        fotoUrl = u ? u.signedUrl : null;
      } catch (e) {}
    }

    const STATUS = [
      ['agendada',       'Agendada',        ''],
      ['checkin',        'Chegou (check-in)', ''],
      ['em_atendimento', 'Em atendimento',  ''],
      ['concluida',      'Concluida',       'st-verde'],
      ['falta',          'Falta',           'st-vermelho'],
      ['cancelada',      'Cancelada',       'st-cinza']
    ];
    const listaStatus = STATUS.map(([v, rotulo, cor]) => {
      const atual = s.status === v;
      return '<button type="button" class="st-btn ' + cor + (atual ? ' atual' : '') + '" ' +
        (atual || !podeOperar ? 'disabled' : 'onclick="MODULOS.agenda.mudarStatusSeguro(\'' + id + '\', \'' + v + '\')"') +
        '>' + (atual ? '&#10003; ' : '') + rotulo + '</button>';
    }).join('');

    let whats = '';
    if (podeOperar && aberta && resp && resp.telefone) {
      whats = '<button class="btn btn-fantasma" style="width:100%" onclick="MODULOS.agenda.abrirWhats(\'' + id + '\')">' +
        '&#128172; Enviar confirmacao no WhatsApp</button>';
    }

    this._sessaoModal = { s, resp };

    const dExt = new Date(s.data + 'T12:00:00');
    const mesCurto = dExt.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');

    abrirModal('Sessao',
      '<div class="sess-cab">' +
      '  <div class="sess-avatar">' +
      (fotoUrl ? '<img src="' + fotoUrl + '" alt="">' :
        escaparHtml(s.pacientes.nome.trim().split(/\s+/).map(x => x[0]).slice(0, 2).join('').toUpperCase())) +
      '  </div>' +
      '  <div class="sess-quem">' +
      '    <strong>' + escaparHtml(s.pacientes.nome) + '</strong>' +
      '    <span>' + (resp
             ? escaparHtml(resp.nome.split(' ')[0]) + (resp.telefone ? ' &middot; ' + escaparHtml(resp.telefone) : '')
             : 'Sem responsavel cadastrado') + '</span>' +
      '  </div>' +
      '  <div class="sess-cab-acoes">' + this.selosSessao(s) +
      '    <button class="btn-chip claro" onclick="fecharModal(); abrirModulo(\'pacientes\'); ' +
      '      setTimeout(function(){ MODULOS.pacientes.telaDetalhe(\'' + s.pacientes.id + '\'); }, 50)">Prontuario</button>' +
      '  </div>' +
      '</div>' +

      '<div class="sess-grid">' +
      '  <div class="sess-col">' +
      '    <div class="sess-quando">' +
      '      <div class="dia-badge"><b>' + s.data.slice(8) + '</b><span>' + mesCurto + '</span></div>' +
      '      <div><b>' + dExt.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }) + '</b>' +
      '      <p class="sub">' + s.hora_inicio.slice(0, 5) + ' &middot; ' + s.duracao_min + ' min</p></div>' +
      '    </div>' +
      '    <div class="caixa-info"><small>Profissional</small><b>' +
             escaparHtml(s.profissional ? s.profissional.nome : '-') + '</b></div>' +
      '    <div class="caixa-info"><small>Sala</small><b>' + escaparHtml(s.salas ? s.salas.nome : '-') + '</b></div>' +
      whats +
      '  </div>' +
      '  <div class="sess-col">' +
      '    <p class="st-titulo">Alterar status</p>' +
      listaStatus +
      '  </div>' +
      '</div>');
  },

  mudarStatusSeguro(id, novo) {
    const s = this._sessaoModal && this._sessaoModal.s;
    if (s && ['concluida', 'falta', 'cancelada'].includes(s.status) &&
        !confirm('Esta sessao ja esta encerrada como "' + s.status + '". Alterar mesmo assim?')) return;
    if (novo === 'falta' && !confirm('Registrar falta?')) return;
    if (novo === 'cancelada' && !confirm('Cancelar esta sessao?')) return;
    this.statusModal(id, novo);
  },

  async statusModal(id, status) {
    const { error } = await sb.from('sessoes').update({ status: status }).eq('id', id);
    if (error) { alert('Erro: ' + error.message); return; }
    this.abrirSessao(id);
    this.desenhar();
  },

  abrirWhats(sessaoId) {
    const { s, resp } = this._sessaoModal || {};
    if (!s || !resp || !resp.telefone) return;

    let fone = resp.telefone.replace(/\D/g, '');
    if (fone.length === 10 || fone.length === 11) fone = '55' + fone;

    const base = window.location.origin +
      window.location.pathname.replace(/[^/]*$/, '');
    const link = base + 'confirmar.html?t=' + s.confirmacao_token;

    const dataFmt = new Date(s.data + 'T12:00:00').toLocaleDateString('pt-BR');
    const msg =
      'Ola, ' + resp.nome.split(' ')[0] + '! Aqui e da Equilibrium Terapia Infantil. ' +
      'Estamos confirmando a sessao de ' + s.pacientes.nome.split(' ')[0] +
      ' no dia ' + dataFmt + ' as ' + s.hora_inicio.slice(0, 5) + '. ' +
      'Toque no link para CONFIRMAR ou DESMARCAR: ' + link;

    window.open('https://wa.me/' + fone + '?text=' + encodeURIComponent(msg), '_blank');
  },

  // ───────────────────────── GRADE FIXA (gestao) ─────────────────────────

  telaGrade() {
    this.el.innerHTML =
      '<div class="pagina-cabecalho">' +
      '  <div>' +
      '    <button class="btn-voltar" onclick="MODULOS.agenda.telaPrincipal(); MODULOS.agenda.ligarTempoReal()">&larr; Agenda</button>' +
      '    <h2>Grade fixa semanal</h2>' +
      '    <p class="sub">Horarios recorrentes que geram as sessoes de cada dia.</p>' +
      '  </div>' +
      (this.gere()
        ? '<button class="btn btn-primario" onclick="MODULOS.agenda.modalHorario()">+ Novo horario</button>'
        : '') +
      '</div>' +
      '<div class="toolbar">' +
      '  <select id="ag-f-prof" onchange="MODULOS.agenda.desenharGrade()">' +
      '    <option value="">Todos os profissionais</option>' +
      this.equipe.map(m => '<option value="' + m.id + '">' + escaparHtml(m.nome) + '</option>').join('') +
      '  </select>' +
      '  <select id="ag-f-sala" onchange="MODULOS.agenda.desenharGrade()">' +
      '    <option value="">Todas as salas</option>' +
      this.salas.filter(s => s.ativo).map(s => '<option value="' + s.id + '">' + escaparHtml(s.nome) + '</option>').join('') +
      '  </select>' +
      '</div>' +
      '<div id="ag-grade"></div>';
    this.desenharGrade();
  },

  desenharGrade() {
    const fp = document.getElementById('ag-f-prof')?.value || '';
    const fs = document.getElementById('ag-f-sala')?.value || '';
    const itens = this.grade.filter(h =>
      (!fp || h.aplicador_id === fp) && (!fs || h.sala_id === fs));

    let html = '<div class="agenda-grade">';
    for (let d = 1; d <= 5; d++) {
      const doDia = itens.filter(h => h.dia_semana === d);
      html += '<div class="agenda-dia">' +
        '<div class="agenda-dia-titulo">' + this.DIAS[d] +
        ' <span class="selo selo-neutro">' + doDia.length + '</span></div>';
      if (doDia.length === 0) html += '<div class="agenda-vazio">Sem horarios</div>';
      doDia.forEach(h => {
        html += '<div class="chip-sessao' + (this.gere() ? ' clicavel' : '') + '"' +
          (this.gere() ? ' onclick="MODULOS.agenda.modalHorario(\'' + h.id + '\')"' : '') + '>' +
          '<b>' + h.hora_inicio.slice(0, 5) + '</b> ' +
          '<span class="chip-nome">' + escaparHtml(h.pacientes ?
            h.pacientes.nome.split(' ')[0] + ' ' + (h.pacientes.nome.split(' ')[1] || '') : '?') + '</span>' +
          '<small>' + escaparHtml(h.profissional ? h.profissional.nome.split(' ')[0] : '-') +
          (h.salas ? ' &middot; ' + escaparHtml(h.salas.nome) : '') + '</small>' +
          '</div>';
      });
      html += '</div>';
    }
    html += '</div>';
    document.getElementById('ag-grade').innerHTML = html;
  },

  modalHorario(id) {
    const h = id ? this.grade.find(x => x.id === id) : null;

    abrirModal(h ? 'Editar horario' : 'Novo horario',
      '<div class="grade-form">' +
      '  <div class="campo c3"><label>Paciente *</label>' +
      '    <select id="h-paciente"' + (h ? ' disabled' : '') + '>' +
      '      <option value="">Selecione</option>' +
      this.pacientes.map(p =>
        '<option value="' + p.id + '"' + (h && h.paciente_id === p.id ? ' selected' : '') + '>' +
        escaparHtml(p.nome) + (p.nivel ? ' (' + (p.nivel === 'aba1' ? 'ABA 1' : 'ABA 2') + ')' : '') +
        '</option>').join('') +
      '    </select></div>' +
      '  <div class="campo"><label>Dia da semana *</label>' +
      '    <select id="h-dia">' +
      [1, 2, 3, 4, 5].map(d =>
        '<option value="' + d + '"' + (h && h.dia_semana === d ? ' selected' : '') + '>' +
        this.DIAS[d] + '</option>').join('') +
      '    </select></div>' +
      '  <div class="campo"><label>Hora de inicio *</label>' +
      '    <input type="time" id="h-hora" value="' + (h ? h.hora_inicio.slice(0, 5) : '08:00') + '" step="300"></div>' +
      '  <div class="campo"><label>Duracao (min) *</label>' +
      '    <input type="number" id="h-dur" min="20" max="180" step="5" value="' + (h ? h.duracao_min : 40) + '"></div>' +
      '  <div class="campo c2"><label>Profissional *</label>' +
      '    <select id="h-prof">' +
      '      <option value="">Selecione</option>' +
      this.equipe.map(m =>
        '<option value="' + m.id + '"' + (h && h.aplicador_id === m.id ? ' selected' : '') + '>' +
        escaparHtml(m.nome) + '</option>').join('') +
      '    </select></div>' +
      '  <div class="campo"><label>Sala</label>' +
      '    <select id="h-sala">' +
      '      <option value="">Sem sala fixa</option>' +
      this.salas.filter(s => s.ativo).map(s =>
        '<option value="' + s.id + '"' + (h && h.sala_id === s.id ? ' selected' : '') + '>' +
        escaparHtml(s.nome) + '</option>').join('') +
      '    </select></div>' +
      '</div>' +
      '<div class="mensagem-erro" id="h-erro"></div>' +
      '<div class="barra-acoes">' +
      (h ? '<button type="button" class="btn btn-fantasma" style="color:var(--st-bad); border-color:var(--st-bad)" ' +
           'onclick="MODULOS.agenda.encerrarHorario(\'' + h.id + '\')">Encerrar horario</button>' : '') +
      '  <button type="button" class="btn btn-fantasma" onclick="fecharModal()">Cancelar</button>' +
      '  <button type="button" class="btn btn-primario" id="h-salvar" ' +
      '    onclick="MODULOS.agenda.salvarHorario(' + (h ? '\'' + h.id + '\'' : 'null') + ')">Salvar</button>' +
      '</div>', true);

    if (!h) {
      document.getElementById('h-paciente').addEventListener('change', ev => {
        const p = this.pacientes.find(x => x.id === ev.target.value);
        if (p && p.aplicador_id) document.getElementById('h-prof').value = p.aplicador_id;
      });
    }
  },

  async salvarHorario(id) {
    const erro = document.getElementById('h-erro');
    const botao = document.getElementById('h-salvar');
    erro.classList.remove('visivel');

    const dados = {
      paciente_id: document.getElementById('h-paciente').value,
      dia_semana: parseInt(document.getElementById('h-dia').value, 10),
      hora_inicio: document.getElementById('h-hora').value,
      duracao_min: parseInt(document.getElementById('h-dur').value, 10),
      aplicador_id: document.getElementById('h-prof').value,
      sala_id: document.getElementById('h-sala').value || null
    };

    if (!dados.paciente_id || !dados.hora_inicio || !dados.aplicador_id || !dados.duracao_min) {
      erro.textContent = 'Preencha paciente, dia, hora, duracao e profissional.';
      erro.classList.add('visivel');
      return;
    }

    botao.disabled = true;
    botao.textContent = 'Salvando...';

    try {
      const anterior = id ? this.grade.find(x => x.id === id) : null;
      let salvo;
      if (id) {
        const { paciente_id, ...semPaciente } = dados;
        const { data, error } = await sb.from('grade_horarios')
          .update(semPaciente).eq('id', id).select('*').single();
        if (error) throw new Error(this.traduzErro(error.message));
        salvo = data;
      } else {
        const { data, error } = await sb.from('grade_horarios')
          .insert({ ...dados, criado_por: this.sessao.user.id })
          .select('*').single();
        if (error) throw new Error(this.traduzErro(error.message));
        salvo = data;
      }

      await this.notificarMudanca(id ? 'mudanca' : 'novo', salvo, anterior);
      fecharModal();
      await this.carregarBase();
      if (document.getElementById('ag-grade')) this.desenharGrade();
      else this.desenhar();
    } catch (e) {
      erro.textContent = e.message;
      erro.classList.add('visivel');
      botao.disabled = false;
      botao.textContent = 'Salvar';
    }
  },

  async encerrarHorario(id) {
    if (!confirm('Encerrar este horario da grade? As familias e o profissional serao notificados.')) return;
    const anterior = this.grade.find(x => x.id === id);
    const { error } = await sb.from('grade_horarios').update({ ativo: false }).eq('id', id);
    if (error) { alert('Erro: ' + error.message); return; }
    await this.notificarMudanca('encerramento', anterior, null);
    fecharModal();
    await this.carregarBase();
    if (document.getElementById('ag-grade')) this.desenharGrade();
    else this.desenhar();
  },

  traduzErro(m) {
    if (m.includes('CONFLITO_SALA')) return 'Conflito: a sala ja esta ocupada nesse dia e horario.';
    if (m.includes('CONFLITO_PROFISSIONAL')) return 'Conflito: o profissional ja tem atendimento nesse dia e horario.';
    if (m.includes('CONFLITO_PACIENTE')) return 'Conflito: o paciente ja tem atendimento nesse dia e horario.';
    return m;
  },

  async notificarMudanca(tipo, h, anterior) {
    try {
      const pac = this.pacientes.find(p => p.id === h.paciente_id);
      const prof = this.equipe.find(m => m.id === h.aplicador_id);
      const sala = this.salas.find(s => s.id === h.sala_id);
      const nomePac = pac ? pac.nome : 'Paciente';
      const descricao = this.DIAS[h.dia_semana] + ' as ' + String(h.hora_inicio).slice(0, 5) +
        (prof ? ' com ' + prof.nome.split(' ')[0] : '') +
        (sala ? ' (' + sala.nome + ')' : '');

      let titulo, corpo;
      if (tipo === 'novo') {
        titulo = 'Novo horario: ' + nomePac;
        corpo = 'Atendimento fixo toda ' + descricao + '.';
      } else if (tipo === 'encerramento') {
        titulo = 'Horario encerrado: ' + nomePac;
        corpo = 'O horario de ' + descricao + ' foi encerrado.';
      } else {
        titulo = 'Mudanca na agenda: ' + nomePac;
        corpo = 'Novo formato: toda ' + descricao + '.';
      }

      const notifs = [];
      if (h.aplicador_id) notifs.push({ destinatario_id: h.aplicador_id, titulo, corpo });
      if (anterior && anterior.aplicador_id && anterior.aplicador_id !== h.aplicador_id) {
        notifs.push({
          destinatario_id: anterior.aplicador_id,
          titulo: 'Mudanca na agenda: ' + nomePac,
          corpo: 'O atendimento deixou de estar com voce (novo formato: ' + descricao + ').'
        });
      }
      const { data: fams } = await sb.from('familia_pacientes')
        .select('usuario_id').eq('paciente_id', h.paciente_id);
      (fams || []).forEach(f => notifs.push({ destinatario_id: f.usuario_id, titulo, corpo }));
      if (notifs.length) await sb.from('notificacoes').insert(notifs);
    } catch (e) { /* notificacao nunca trava o fluxo */ }
  },

  modalSalas() {
    const linhas = this.salas.map(s =>
      '<div class="linha-doc"><b>' + escaparHtml(s.nome) + '</b>' +
      '<div class="pac-selos">' +
      (s.ativo ? '<span class="selo selo-ok">Ativa</span>' : '<span class="selo selo-neutro">Inativa</span>') +
      '<button class="btn-chip" onclick="MODULOS.agenda.alternarSala(\'' + s.id + '\', ' + (!s.ativo) + ')">' +
      (s.ativo ? 'Inativar' : 'Reativar') + '</button>' +
      '</div></div>').join('');

    abrirModal('Salas de atendimento',
      (linhas || '<p class="sub">Nenhuma sala cadastrada.</p>') +
      '<div class="grade-form" style="margin-top:14px">' +
      '  <div class="campo c2"><label>Nova sala</label><input id="sala-nome" placeholder="Ex.: Sala 1"></div>' +
      '  <div class="campo" style="display:flex; align-items:flex-end">' +
      '    <button class="btn btn-primario" onclick="MODULOS.agenda.criarSala()">Adicionar</button></div>' +
      '</div>');
  },

  async criarSala() {
    const nome = document.getElementById('sala-nome').value.trim();
    if (!nome) return;
    const { error } = await sb.from('salas').insert({ nome: nome });
    if (error) { alert('Erro: ' + error.message); return; }
    await this.carregarBase();
    this.modalSalas();
  },

  async alternarSala(id, ativo) {
    const { error } = await sb.from('salas').update({ ativo: ativo }).eq('id', id);
    if (error) { alert('Erro: ' + error.message); return; }
    await this.carregarBase();
    this.modalSalas();
  }
};
