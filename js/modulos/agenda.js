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
    this.dataRef = hojeLocal();
    // call center abre direto na visao por aplicador (reservas)
    this.visao = sessao.profile.perfil === 'callcenter' ? 'equipe' : 'dia';
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
      sb.from('profiles').select('id, nome, perfil, duracao_sessao_min').eq('atende_pacientes', true).eq('ativo', true).order('nome'),
      sb.from('salas').select('*').order('nome')
    ]);
    this.grade = g.data || [];
    this.pacientes = p.data || [];
    this.equipe = e.data || [];
    this.salas = s.data || [];

    const [j, c] = await Promise.all([
      sb.from('jornadas').select('*').order('dia_semana').order('hora_inicio'),
      sb.from('configuracoes').select('valor').eq('chave', 'duracao_sessao_min').maybeSingle()
    ]);
    this.jornadas = j.data || [];
    this._durGlobal = parseInt(c.data ? c.data.valor : '45', 10) || 45;
  },

  durDe(profId) {
    const m = this.equipe.find(x => x.id === profId);
    return (m && m.duracao_sessao_min) || this._durGlobal;
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
          '<button class="btn-chip" title="Jornada e horarios de cada aplicador, com os espacos livres." ' +
          'onclick="MODULOS.agenda.telaHorarios()">Horarios</button>' +
          '<button class="btn-chip" onclick="MODULOS.agenda.modalSalas()">Salas</button>' +
          '<button class="btn-chip" title="O sistema sugere o aplicador com menor carga e horarios livres para o paciente." ' +
          'onclick="MODULOS.agenda.modalIndicar()">Indicar</button>' +
          '<button class="btn btn-primario" onclick="MODULOS.agenda.modalHorario()">+ Novo horario</button>'
        : '') +
      '  </div>' +
      '</div>' +
      '<div class="ag-controles">' +
      '  <div class="segmento">' +
      ['dia', 'semana', 'mes'].concat(this.podeReservar() ? ['equipe'] : []).map(v =>
        '<button type="button" class="seg' + (this.visao === v ? ' ativo' : '') + '" data-visao="' + v + '" ' +
        'onclick="MODULOS.agenda.mudarVisao(\'' + v + '\')">' +
        ({ dia: 'Dia', semana: 'Semana', mes: 'Mes', equipe: 'Por aplicador' })[v] + '</button>').join('') +
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
    if (this.visao === 'dia' || this.visao === 'equipe') d.setDate(d.getDate() + delta);
    else if (this.visao === 'semana') d.setDate(d.getDate() + delta * 7);
    else d.setMonth(d.getMonth() + delta);
    this.dataRef = d.toISOString().slice(0, 10);
    this.desenhar();
  },

  irHoje() {
    this.dataRef = hojeLocal();
    this.desenhar();
  },

  desenhar() {
    if (this.visao === 'equipe') { this.desenharEquipe(); return; }
    if (this.visao === 'dia') this.desenharDia();
    else if (this.visao === 'semana') this.desenharSemana();
    else this.desenharMes();
  },

  // ───────────────────── VISAO POR APLICADOR (call center: reservas de horario) ─────────────────────
  podeReservar() {
    return perm('agenda.reservas') === 'E' || ['callcenter', 'direcao', 'suporte'].includes(this.sessao.profile.perfil);
  },

  hm(t) { return String(t || '').slice(0, 5); },
  somaMin(hhmm, min) {
    const [h, m] = hhmm.split(':').map(Number);
    const t = h * 60 + m + min;
    return String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0');
  },

  async desenharEquipe() {
    const corpo = document.getElementById('ag-corpo');
    const data = this.dataRef;
    const d = new Date(data + 'T12:00:00');
    const dow = d.getDay();
    document.getElementById('ag-sub').textContent =
      d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }) + ' - horarios de cada aplicador';
    corpo.innerHTML = '<div class="cartao"><p class="sub">Montando a grade...</p></div>';

    const [rS, rR] = await Promise.all([
      sb.from('sessoes').select('id, hora_inicio, status, aplicador_id, paciente_id, pacientes(nome)').eq('data', data),
      sb.from('reservas_agenda').select('*, quem:profiles!reservas_agenda_reservado_por_fkey(nome)').eq('data', data).eq('status', 'reservado')
    ]);
    const sess = rS.data || [], res = rR.data || [];

    // colunas: aplicadores com jornada no dia (ou com sessao/reserva no dia)
    const jorDia = this.jornadas.filter(j => j.dia_semana === dow);
    const cols = this.equipe.filter(p => jorDia.some(j => j.profissional_id === p.id) ||
      sess.some(s => s.aplicador_id === p.id) || res.some(r => r.aplicador_id === p.id));
    if (!cols.length) {
      corpo.innerHTML = '<div class="cartao"><div class="vazio"><div class="simbolo-vazio">&#128197;</div><strong>Ninguem com jornada neste dia</strong>' +
        'Cadastre as jornadas em Horarios para a grade aparecer.</div></div>';
      return;
    }
    // linhas: uniao dos inicios de slot de cada jornada (pela duracao do aplicador) + horarios reais
    const horas = new Set();
    cols.forEach(p => {
      const dur = this.durDe(p.id);
      jorDia.filter(j => j.profissional_id === p.id).forEach(j => {
        let h = this.hm(j.hora_inicio);
        while (this.somaMin(h, dur) <= this.hm(j.hora_fim)) { horas.add(h); h = this.somaMin(h, dur); }
      });
    });
    sess.forEach(s => horas.add(this.hm(s.hora_inicio)));
    res.forEach(r => horas.add(this.hm(r.hora_inicio)));
    const linhas = [...horas].sort();

    const dentro = (p, h) => jorDia.some(j => j.profissional_id === p.id && this.hm(j.hora_inicio) <= h && h < this.hm(j.hora_fim));
    const ocupa = (p, h) => {
      const dur = this.durDe(p.id);
      return sess.find(s => s.aplicador_id === p.id && s.status !== 'cancelada' &&
        this.hm(s.hora_inicio) <= h && h < this.somaMin(this.hm(s.hora_inicio), dur));
    };
    const ST = { agendada: 'ag-eq-agendada', checkin: 'ag-eq-checkin', em_atendimento: 'ag-eq-atend', concluida: 'ag-eq-concluida', falta: 'ag-eq-falta' };

    let html = '<div class="cartao ag-eq-wrap"><table class="ag-eq"><thead><tr><th class="ag-eq-h"></th>' +
      cols.map(p => '<th><b>' + escaparHtml(p.nome.split(' ').slice(0, 2).join(' ')) + '</b><small>' +
        jorDia.filter(j => j.profissional_id === p.id).map(j => this.hm(j.hora_inicio) + '-' + this.hm(j.hora_fim)).join(' / ') + '</small></th>').join('') +
      '</tr></thead><tbody>';
    linhas.forEach(h => {
      html += '<tr><td class="ag-eq-h">' + h + '</td>' +
        cols.map(p => {
          const s = ocupa(p, h);
          if (s) {
            if (this.hm(s.hora_inicio) !== h) return '<td class="ag-eq-cont"></td>';
            return '<td class="ag-eq-cel ' + (ST[s.status] || '') + '" onclick="MODULOS.agenda.abrirSessao(\'' + s.id + '\')" title="Abrir sessao">' +
              '<b>' + escaparHtml((s.pacientes ? s.pacientes.nome : '').split(' ').slice(0, 2).join(' ')) + '</b><small>' + this.selosSessao(s).replace(/<[^>]+>/g, ' ').trim() + '</small></td>';
          }
          const r = res.find(x => x.aplicador_id === p.id && this.hm(x.hora_inicio) === h);
          if (r) return '<td class="ag-eq-cel ag-eq-reserva" onclick="MODULOS.agenda.modalReserva(\'' + r.id + '\')" title="Reservado por ' + escaparHtml(r.quem ? r.quem.nome : '') + '">' +
            '<b>' + escaparHtml(r.nome_paciente) + '</b><small>reservado &middot; ' + escaparHtml((r.quem ? r.quem.nome : '').split(' ')[0]) + '</small></td>';
          if (!dentro(p, h)) return '<td class="ag-eq-fora"></td>';
          return '<td class="ag-eq-livre" onclick="MODULOS.agenda.modalReservar(\'' + p.id + '\', \'' + h + '\')" title="Reservar este horario">+ livre</td>';
        }).join('') + '</tr>';
    });
    html += '</tbody></table></div>' +
      '<p class="sub" style="margin-top:8px">Clique num horario livre para <b>reservar</b> (nome do paciente ou interessado). ' +
      'A reserva guarda quem fez; depois voce <b>confirma</b> (vira sessao na agenda) ou <b>libera</b>.</p>';
    corpo.innerHTML = html;
    this._eqCache = { sess, res };
  },

  modalReservar(profId, hora) {
    const prof = this.equipe.find(p => p.id === profId);
    abrirModal('Reservar horario',
      '<p class="sub" style="margin-bottom:10px"><b>' + escaparHtml(prof ? prof.nome : '') + '</b> &middot; ' +
      new Date(this.dataRef + 'T12:00:00').toLocaleDateString('pt-BR') + ' as <b>' + hora + '</b></p>' +
      '<div class="campo"><label>Nome do paciente ou interessado *</label>' +
      '<input id="rv-nome" list="rv-pacs" autocomplete="off" placeholder="Digite o nome (pode ser alguem ainda sem cadastro)">' +
      '<datalist id="rv-pacs">' + this.pacientes.map(p => '<option value="' + escaparHtml(p.nome) + '">').join('') + '</datalist></div>' +
      '<div class="campo"><label>Telefone</label><input id="rv-fone" inputmode="tel"></div>' +
      '<div class="campo"><label>Observacao</label><input id="rv-obs" placeholder="Ex.: aguardando guia do convenio"></div>' +
      '<div class="mensagem-erro" id="rv-erro"></div>' +
      '<div class="barra-acoes"><button class="btn btn-fantasma" onclick="fecharModal()">Cancelar</button>' +
      '<button class="btn btn-primario" onclick="MODULOS.agenda.salvarReserva(\'' + profId + '\', \'' + hora + '\')">Reservar</button></div>', false, 'agenda');
    setTimeout(() => document.getElementById('rv-nome')?.focus(), 50);
  },

  async salvarReserva(profId, hora) {
    const nome = document.getElementById('rv-nome').value.trim();
    const erro = document.getElementById('rv-erro');
    if (!nome) { erro.textContent = 'Informe o nome.'; erro.classList.add('visivel'); return; }
    const pac = this.pacientes.find(p => p.nome.toLowerCase() === nome.toLowerCase());
    const { error } = await sb.from('reservas_agenda').insert({
      data: this.dataRef, hora_inicio: hora + ':00', aplicador_id: profId,
      nome_paciente: nome, paciente_id: pac ? pac.id : null,
      telefone: document.getElementById('rv-fone').value.trim() || null,
      observacao: document.getElementById('rv-obs').value.trim() || null,
      reservado_por: this.sessao.user.id
    });
    if (error) { erro.textContent = error.message; erro.classList.add('visivel'); return; }
    fecharModal();
    this.desenharEquipe();
  },

  modalReserva(id) {
    const r = (this._eqCache?.res || []).find(x => x.id === id);
    if (!r) return;
    const prof = this.equipe.find(p => p.id === r.aplicador_id);
    abrirModal('Horario reservado',
      '<div class="grade-visao" style="margin-bottom:10px">' +
      '<div class="caixa-info"><small>Paciente</small><b>' + escaparHtml(r.nome_paciente) + '</b></div>' +
      '<div class="caixa-info"><small>Aplicador</small><b>' + escaparHtml(prof ? prof.nome : '') + '</b></div>' +
      '<div class="caixa-info"><small>Quando</small><b>' + r.data.split('-').reverse().join('/') + ' as ' + this.hm(r.hora_inicio) + '</b></div>' +
      '<div class="caixa-info"><small>Reservado por</small><b>' + escaparHtml(r.quem ? r.quem.nome : '-') + '<br><small>' + new Date(r.criado_em).toLocaleString('pt-BR') + '</small></b></div>' +
      (r.telefone ? '<div class="caixa-info"><small>Telefone</small><b>' + escaparHtml(r.telefone) + '</b></div>' : '') +
      (r.observacao ? '<div class="caixa-info"><small>Observacao</small><b>' + escaparHtml(r.observacao) + '</b></div>' : '') +
      '</div>' +
      '<div class="campo"><label>Confirmar para qual paciente cadastrado?</label>' +
      '<select id="rv-pac"><option value="">Selecione...</option>' +
      this.pacientes.map(p => '<option value="' + p.id + '"' + (p.id === r.paciente_id || p.nome.toLowerCase() === r.nome_paciente.toLowerCase() ? ' selected' : '') + '>' + escaparHtml(p.nome) + '</option>').join('') +
      '</select><small class="sub">Se ainda nao esta cadastrado, faca a admissao (ou envie o link de cadastro) e confirme depois.</small></div>' +
      '<div class="mensagem-erro" id="rv-erro"></div>' +
      '<div class="barra-acoes">' +
      '<button class="btn btn-fantasma" onclick="MODULOS.agenda.liberarReserva(\'' + r.id + '\')">Liberar horario</button>' +
      '<button class="btn btn-primario" onclick="MODULOS.agenda.confirmarReserva(\'' + r.id + '\')">Confirmar e agendar</button></div>', false, 'agenda');
  },

  async liberarReserva(id) {
    if (!await popConfirmar('Liberar este horario? A reserva sai da grade.', { ok: 'Liberar', tipo: 'agenda' })) return;
    const { error } = await sb.from('reservas_agenda').update({ status: 'liberado', liberado_por: this.sessao.user.id, liberado_em: new Date().toISOString() }).eq('id', id);
    if (error) { popAviso('Nao consegui liberar: ' + error.message); return; }
    fecharModal(); this.desenharEquipe();
  },

  async confirmarReserva(id) {
    const r = (this._eqCache?.res || []).find(x => x.id === id);
    const pacId = document.getElementById('rv-pac').value;
    const erro = document.getElementById('rv-erro');
    if (!pacId) { erro.textContent = 'Escolha o paciente cadastrado para confirmar.'; erro.classList.add('visivel'); return; }
    const { data: nova, error } = await sb.from('sessoes').insert({
      paciente_id: pacId, data: r.data, hora_inicio: r.hora_inicio, duracao_min: this.durDe(r.aplicador_id),
      aplicador_id: r.aplicador_id, status: 'agendada', criado_por: this.sessao.user.id
    }).select('id').single();
    if (error) { erro.textContent = 'Sessao: ' + error.message; erro.classList.add('visivel'); return; }
    { const { error: _e } = await sb.from('reservas_agenda').update({ status: 'confirmado', paciente_id: pacId, sessao_id: nova.id,
      confirmado_por: this.sessao.user.id, confirmado_em: new Date().toISOString() }).eq('id', id); if (_e) popAviso('Nao foi possivel gravar (reservas_agenda): ' + _e.message); }
    fecharModal(); this.desenharEquipe();
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

    let { data: sessoes, error } = await sb.from('sessoes')
      .select('*, pacientes(nome), profissional:profiles!sessoes_aplicador_id_fkey(nome), salas(nome)')
      .eq('data', this.dataRef).order('hora_inicio');
    sessoes = await this.soMinhas(sessoes);

    const comEvo = new Set();
    if (sessoes && sessoes.length) {
      const { data: evs } = await sb.from('evolucoes')
        .select('sessao_id').in('sessao_id', sessoes.map(s => s.id));
      (evs || []).forEach(e => comEvo.add(e.sessao_id));
    }
    this._comEvoDia = comEvo;

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
        '  <div class="pac-selos">' + this.selosSessao(s) +
        (s.status === 'concluida' && !this._comEvoDia.has(s.id)
          ? '<span class="selo selo-sem-evo" title="A sessao foi concluida mas a evolucao ainda nao foi escrita.">&#9998; sem evolucao</span>' : '') +
        '</div>' +
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

    let { data: sessoes } = await sb.from('sessoes')
      .select('id, data, hora_inicio, status, confirmacao, paciente_id, aplicador_id, pacientes(nome), profissional:profiles!sessoes_aplicador_id_fkey(nome), salas(nome)')
      .gte('data', datas[0]).lte('data', datas[4]).order('hora_inicio');
    sessoes = await this.soMinhas(sessoes);

    const alvo = document.getElementById('ag-corpo');
    if (!alvo) return;

    let html = '<div class="agenda-grade">';
    datas.forEach((dt, i) => {
      const doDia = (sessoes || []).filter(s => s.data === dt);
      const hoje = dt === hojeLocal();
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

    let { data: sessoes } = await sb.from('sessoes')
      .select('data, status, paciente_id, aplicador_id')
      .gte('data', this.fmt(primeiro)).lte('data', this.fmt(ultimo));
    sessoes = await this.soMinhas(sessoes);

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

    const hoje = hojeLocal();
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

  // ─────────────── JANELA DA SESSAO (abas: Resumo · Paciente · Guias · Historico) ───────────────
  MOTIVOS_CANCEL: [
    ['paciente', 'Desmarcado pelo paciente'],
    ['clinica', 'Desmarcado pela clinica'],
    ['profissional', 'Profissional ausente'],
    ['nao_autorizado', 'Nao autorizado (convenio)']
  ],

  async abrirSessao(id, aba) {
    const { data: s } = await sb.from('sessoes')
      .select('*, pacientes(id, nome, data_nascimento, foto_path, convenio, carteirinha, nivel, cid), profissional:profiles!sessoes_aplicador_id_fkey(nome), salas(nome), criador:profiles!sessoes_criado_por_fkey(nome)')
      .eq('id', id).single();
    if (!s) return;
    const pac = s.pacientes;
    // tudo em paralelo (a trilha de auditoria so e lida na aba Historico - e a consulta mais pesada)
    const [rResp, rGuias, rMeus, rFoto] = await Promise.all([
      sb.from('responsaveis').select('nome, telefone, email, parentesco, principal').eq('paciente_id', pac.id).order('principal', { ascending: false }),
      sb.from('guias').select('id, numero, qtd_autorizada, vigencia_inicio, vigencia_fim, convenio, obs').eq('paciente_id', pac.id).order('vigencia_fim', { ascending: false }),
      ehEquipe() ? meusPacientesIds() : Promise.resolve(new Set()),
      pac.foto_path ? sb.storage.from('documentos').createSignedUrl(pac.foto_path, 600).catch(() => ({ data: null })) : Promise.resolve({ data: null })
    ]);
    const resps = rResp.data || [];
    const resp = resps.find(r => r.telefone) || resps[0] || null;
    const guias = rGuias.data || [];
    const ultAud = null;

    // saldo das guias (sessoes concluidas dentro da vigencia)
    const { data: consumo } = guias.length
      ? await sb.from('sessoes').select('id, data, status').eq('paciente_id', pac.id)
          .gte('data', guias.map(g => g.vigencia_inicio).sort()[0]).lte('data', guias.map(g => g.vigencia_fim).sort().reverse()[0])
      : { data: [] };
    guias.forEach(g => {
      const dentro = (consumo || []).filter(x => x.data >= g.vigencia_inicio && x.data <= g.vigencia_fim);
      g.atendidas = dentro.filter(x => x.status === 'concluida').length;
      g.agendadas = dentro.filter(x => !['concluida', 'falta', 'cancelada'].includes(x.status)).length;
      g.saldo = g.qtd_autorizada - g.atendidas;
      g.vigente = g.vigencia_inicio <= s.data && s.data <= g.vigencia_fim;
    });
    const guiaVigente = guias.find(g => g.vigente && g.saldo > 0) || null;
    const guiaSemSaldo = !guiaVigente && guias.find(g => g.vigente) || null;

    const aberta = !['concluida', 'falta', 'cancelada'].includes(s.status);
    const podeOperar = perm('agenda.status') === 'E';
    const podeCancelar = perm('agenda.cancelar') === 'E';
    const meus = rMeus || new Set();
    const ehMinha = ehEquipe() && (s.aplicador_id === window.CORTEX_SESSAO.user.id || meus.has(pac.id));
    const fotoUrl = rFoto && rFoto.data ? rFoto.data.signedUrl : null;

    this._sessaoModal = { s, resp, guias, guiaVigente };
    const dExt = new Date(s.data + 'T12:00:00');
    const mesCurto = dExt.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
    const fmt = d => d ? d.split('-').reverse().join('/') : '-';
    const fim = (() => { const [h, m] = s.hora_inicio.split(':').map(Number); const t = h * 60 + m + (s.duracao_min || 40); return String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0'); })();

    // ── status: fluxo normal + faltou + cancelamentos com motivo
    const btnSt = (v, rot, cor, ativo, acao) =>
      '<button type="button" class="st-btn ' + cor + (ativo ? ' atual' : '') + '" ' + (ativo || !acao ? 'disabled' : 'onclick="' + acao + '"') + '>' + (ativo ? '&#10003; ' : '') + rot + '</button>';
    const lib = v => podeOperar || (ehMinha && ['concluida', 'falta'].includes(v));
    const fluxo = [['agendada', 'Agendada', ''], ['checkin', 'Check-in (chegou)', 'st-azul'], ['em_atendimento', 'Em atendimento', ''], ['concluida', 'Concluida', 'st-verde'], ['falta', 'Faltou', 'st-vermelho']]
      .map(([v, rot, cor]) => btnSt(v, rot, cor, s.status === v, lib(v) ? "MODULOS.agenda.mudarStatusSeguro('" + id + "', '" + v + "')" : null)).join('');
    const cancel = this.MOTIVOS_CANCEL.map(([m, rot]) =>
      btnSt('cancelada', rot, 'st-cinza', s.status === 'cancelada' && s.motivo_cancelamento === m, podeCancelar ? "MODULOS.agenda.cancelarCom('" + id + "', '" + m + "')" : null)).join('');
    const reabrir = !aberta && podeCancelar ? '<button type="button" class="st-btn" onclick="MODULOS.agenda.mudarStatusSeguro(\'' + id + '\', \'agendada\')">&#8634; Reabrir como agendada</button>' : '';

    // ── confirmacao
    const conf = s.confirmacao === 'confirmada' ? '<span class="selo selo-ok">CONFIRMADA</span>' : s.confirmacao === 'desmarcada' ? '<span class="selo selo-bad">DESMARCADA PELA FAMILIA</span>' : '<span class="selo selo-neutro">SEM CONFIRMACAO</span>';
    const base = window.location.origin + window.location.pathname.replace(/[^/]*$/, '');
    const link = s.confirmacao_token ? base + 'confirmar.html?t=' + s.confirmacao_token : '';
    const blocoConf = aberta && podeOperar ? '<div class="sess-conf"><small>CONFIRMAR POR</small>' +
      (resp && resp.telefone ? '<button class="btn-chip cheio" onclick="MODULOS.agenda.abrirWhats(\'' + id + '\')">WhatsApp</button>' : '<span class="sub">sem telefone</span>') +
      (link ? '<button class="btn-chip" onclick="navigator.clipboard.writeText(\'' + link + '\').then(function(){ popAviso(\'Link de confirmacao copiado.\'); })" title="Copiar link">&#10697; copiar link</button>' : '') +
      (resp && resp.email ? '<a class="btn-chip" href="mailto:' + escaparHtml(resp.email) + '?subject=' + encodeURIComponent('Confirmacao de sessao - ' + pac.nome.split(' ')[0]) + '&body=' + encodeURIComponent('Ola! Confirme a sessao de ' + pac.nome.split(' ')[0] + ' em ' + fmt(s.data) + ' as ' + s.hora_inicio.slice(0, 5) + ': ' + link) + '">E-mail</a>' : '') +
      '</div>' : '';

    // ── guia da sessao
    const guiaTxt = s.guia_id && guias.find(g => g.id === s.guia_id)
      ? (g => '<b>Guia ' + escaparHtml(g.numero) + '</b> &middot; saldo ' + g.saldo + ' de ' + g.qtd_autorizada)(guias.find(g => g.id === s.guia_id))
      : guiaVigente ? '<b>Guia ' + escaparHtml(guiaVigente.numero) + '</b> vigente &middot; saldo ' + guiaVigente.saldo + ' de ' + guiaVigente.qtd_autorizada + ' <small class="sub">(vincula no check-in)</small>'
      : guiaSemSaldo ? '<b style="color:var(--st-bad)">Guia ' + escaparHtml(guiaSemSaldo.numero) + ' sem saldo</b>'
      : (pac.convenio && !/particular/i.test(pac.convenio) ? '<b style="color:var(--st-warn)">Sem guia autorizada para esta data</b>' : '<span class="sub">Particular &middot; sem guia</span>');

    const aba0 = aba || 'resumo';
    const tab = (idT, rot) => '<button type="button" class="aba' + (aba0 === idT ? ' ativa' : '') + '" onclick="MODULOS.agenda.abrirSessao(\'' + id + '\', \'' + idT + '\')">' + rot + '</button>';

    let corpo = '';
    if (aba0 === 'resumo') {
      corpo =
        '<div class="sess-grid">' +
        '  <div class="sess-col">' +
        '    <p class="st-titulo">Data e horario</p>' +
        '    <div class="sess-quando"><div class="dia-badge"><b>' + s.data.slice(8) + '</b><span>' + mesCurto + '</span></div>' +
        '      <div><b>' + dExt.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + '</b>' +
        '      <p class="sub">' + s.hora_inicio.slice(0, 5) + ' &ndash; ' + fim + ' (' + (s.duracao_min || 40) + ' min)</p></div></div>' +
        '    <div class="grade-visao" style="grid-template-columns:1fr 1fr">' +
        '      <div class="caixa-info"><small>Procedimento</small><b>Psicoterapia ABA &middot; Sess&atilde;o</b></div>' +
        '      <div class="caixa-info"><small>Convenio</small><b>' + escaparHtml(pac.convenio || 'Particular') + (pac.carteirinha ? '<br><small class="sub">' + escaparHtml(pac.carteirinha) + '</small>' : '') + '</b></div>' +
        '      <div class="caixa-info"><small>Aplicador</small><b>' + escaparHtml(s.profissional ? s.profissional.nome : '-') + '</b></div>' +
        '      <div class="caixa-info"><small>Sala</small><b>' + escaparHtml(s.salas ? s.salas.nome : '-') + '</b></div>' +
        '    </div>' +
        '    <div class="caixa-info" style="margin-top:8px"><small>Guia</small>' + guiaTxt + '</div>' +
        '    <div class="caixa-info" style="margin-top:8px"><small>Observacoes ' + (podeOperar ? '<button class="btn-chip" style="margin-left:6px" onclick="MODULOS.agenda.editarObs(\'' + id + '\')">&#9998;</button>' : '') + '</small>' +
        '      <div id="sess-obs" style="font-size:13px; line-height:1.5">' + (s.observacoes ? escaparHtml(s.observacoes).replace(/\n/g, '<br>') : '<span class="sub">&mdash;</span>') + '</div></div>' +
        blocoConf +
        '  </div>' +
        '  <div class="sess-col">' +
        '    <p class="st-titulo">Alterar status</p>' + fluxo +
        '    <p class="st-titulo" style="margin-top:10px">Cancelar com motivo</p>' + cancel + reabrir +
        '  </div>' +
        '</div>' +
        '<div class="sess-rodape-meta"><span>Criado por <b>' + escaparHtml(s.criador ? s.criador.nome : (s.id_externo ? 'importacao' : '-')) + '</b>' + (s.criado_em ? ' &middot; ' + new Date(s.criado_em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '') + '</span>' +
        '<span>Alteracoes: veja a aba <b>Historico</b></span></div>';
    } else if (aba0 === 'paciente') {
      const idade = pac.data_nascimento ? calcularIdade(pac.data_nascimento) : '-';
      corpo = '<div class="grade-visao" style="grid-template-columns:1fr 1fr">' +
        '<div class="caixa-info"><small>Nascimento</small><b>' + fmt(pac.data_nascimento) + ' (' + idade + ')</b></div>' +
        '<div class="caixa-info"><small>Nivel ABA</small><b>' + escaparHtml(pac.nivel || '-') + '</b></div>' +
        '<div class="caixa-info"><small>Convenio</small><b>' + escaparHtml(pac.convenio || 'Particular') + '</b></div>' +
        '<div class="caixa-info"><small>Carteirinha</small><b>' + escaparHtml(pac.carteirinha || '-') + '</b></div>' +
        '<div class="caixa-info"><small>CID-11</small><b>' + escaparHtml(pac.cid || '-') + '</b></div></div>' +
        '<p class="st-titulo" style="margin-top:12px">Responsaveis</p>' +
        (resps.length ? resps.map(r => '<div class="linha-doc"><div><b>' + escaparHtml(r.nome) + '</b><small>' + escaparHtml(r.parentesco || '') + (r.telefone ? ' &middot; ' + escaparHtml(r.telefone) : '') + (r.email ? ' &middot; ' + escaparHtml(r.email) : '') + '</small></div>' +
          (r.principal ? '<span class="selo selo-ok">principal</span>' : '') + '</div>').join('') : '<p class="sub">Nenhum responsavel cadastrado.</p>') +
        '<div class="barra-acoes"><button class="btn btn-fantasma" onclick="fecharModal(); MODULOS.pacientes.telaDetalhe(\'' + pac.id + '\')">Abrir prontuario</button></div>';
    } else if (aba0 === 'guias') {
      corpo = (guias.length ? guias.map(g => {
        const pct = g.qtd_autorizada ? Math.min(100, Math.round(g.atendidas * 100 / g.qtd_autorizada)) : 0;
        return '<div class="cartao" style="padding:10px 12px; margin-bottom:8px' + (g.vigente ? '; border-color:var(--acao)' : '') + '">' +
          '<div style="display:flex; justify-content:space-between; gap:8px; flex-wrap:wrap"><b>Guia ' + escaparHtml(g.numero) + '</b>' +
          '<span class="pac-selos">' + (g.vigente ? '<span class="selo selo-ok">vigente</span>' : g.vigencia_fim < s.data ? '<span class="selo selo-neutro">vencida</span>' : '<span class="selo selo-info">futura</span>') +
          (s.guia_id === g.id ? '<span class="selo selo-info">desta sessao</span>' : '') + '</span></div>' +
          '<small class="sub">' + escaparHtml(g.convenio || pac.convenio || '') + ' &middot; vigencia ' + fmt(g.vigencia_inicio) + ' a ' + fmt(g.vigencia_fim) + '</small>' +
          '<div style="display:flex; align-items:center; gap:10px; margin-top:6px"><div style="flex:1; height:8px; background:var(--surface-alt); border-radius:5px; overflow:hidden"><div style="height:100%; width:' + pct + '%; background:' + (pct >= 100 ? 'var(--st-bad)' : pct >= 80 ? '#D97706' : '#15803D') + '"></div></div>' +
          '<small><b>' + g.atendidas + '</b> atendidas &middot; <b>' + g.agendadas + '</b> a realizar &middot; saldo <b style="color:' + (g.saldo <= 0 ? 'var(--st-bad)' : g.saldo <= 5 ? '#D97706' : '#15803D') + '">' + g.saldo + '</b></small></div>' +
          (podeOperar && aberta && s.guia_id !== g.id && g.saldo > 0 ? '<div class="barra-acoes" style="margin-top:6px"><button class="btn-chip" onclick="MODULOS.agenda.vincularGuia(\'' + id + '\', \'' + g.id + '\')">Usar esta guia nesta sessao</button></div>' : '') +
          '</div>';
      }).join('') : '<p class="sub">Nenhuma guia cadastrada para esta crianca.</p>') +
        (perm('guias') === 'E' ? '<div class="barra-acoes"><button class="btn btn-fantasma" onclick="fecharModal(); abrirModulo(\'guias\')">Cadastrar / gerir guias</button></div>' : '');
    } else {
      corpo = '<div class="sess-historico" id="sess-hist" style="max-height:none; font-size:12px"><small class="sub">Carregando historico...</small></div>';
    }

    abrirModal('Sessao',
      '<div class="sess-cab">' +
      '  <div class="sess-avatar">' + (fotoUrl ? '<img src="' + fotoUrl + '" alt="">' : escaparHtml(pac.nome.trim().split(/\s+/).map(x => x[0]).slice(0, 2).join('').toUpperCase())) + '</div>' +
      '  <div class="sess-quem"><strong>' + escaparHtml(pac.nome) + '</strong>' +
      '    <span>' + (resp ? escaparHtml(resp.nome.split(' ')[0]) + (resp.telefone ? ' &middot; ' + escaparHtml(resp.telefone) : '') : 'Sem responsavel cadastrado') + '</span>' +
      '    <span style="margin-top:4px">' + conf + '</span></div>' +
      '  <div class="sess-cab-acoes">' + this.selosSessao(s) +
      '    <button class="btn-chip claro" onclick="fecharModal(); MODULOS.pacientes.telaDetalhe(\'' + pac.id + '\')">Prontuario</button></div>' +
      '</div>' +
      '<div class="abas sess-abas">' + tab('resumo', 'Resumo') + tab('paciente', 'Dados do paciente') + tab('guias', 'Guias' + (guias.length ? ' <small>' + guias.length + '</small>' : '')) + tab('historico', 'Historico') + '</div>' +
      corpo, true, 'agenda');
    if (aba0 === 'historico') this.historicoSessao(s.id);
  },

  async editarObs(id) {
    const s = this._sessaoModal && this._sessaoModal.s; if (!s) return;
    abrirModal('Observacoes da sessao',
      '<div class="campo"><textarea id="obs-txt" rows="4">' + escaparHtml(s.observacoes || '') + '</textarea></div>' +
      '<div class="barra-acoes"><button class="btn btn-fantasma" onclick="MODULOS.agenda.abrirSessao(\'' + id + '\')">Cancelar</button>' +
      '<button class="btn btn-primario" onclick="MODULOS.agenda.salvarObs(\'' + id + '\')">Salvar</button></div>', false, 'agenda');
  },
  async salvarObs(id) {
    const { error } = await sb.from('sessoes').update({ observacoes: document.getElementById('obs-txt').value.trim() || null }).eq('id', id);
    if (error) { popAviso('Erro: ' + error.message); return; }
    this.abrirSessao(id);
  },

  async cancelarCom(id, motivo) {
    const rot = (this.MOTIVOS_CANCEL.find(m => m[0] === motivo) || [])[1] || 'Cancelar';
    if (!await popConfirmar(rot + '?\n\nA sessao sai do funil da guia e nao conta como atendida.', { ok: rot, tipo: 'agenda' })) return;
    const { error } = await sb.from('sessoes').update({ status: 'cancelada', motivo_cancelamento: motivo }).eq('id', id);
    if (error) { popAviso('Erro: ' + error.message); return; }
    this.abrirSessao(id); this.desenhar();
  },

  async vincularGuia(id, guiaId) {
    const { error } = await sb.from('sessoes').update({ guia_id: guiaId }).eq('id', id);
    if (error) { popAviso('Erro: ' + error.message); return; }
    this.abrirSessao(id, 'guias');
  },

  // Rodape acumulativo: quem mexeu na sessao, quando e o que mudou (trilha de auditoria)
  async historicoSessao(id) {
    const alvo = document.getElementById('sess-hist');
    if (!alvo) return;
    const { data } = await sb.from('auditoria').select('acao, usuario_nome, criado_em, dados_antes, dados_depois')
      .eq('tabela', 'sessoes')
      .or('dados_depois->>id.eq.' + id + ',dados_antes->>id.eq.' + id)
      .order('criado_em', { ascending: true }).limit(60);
    if (!alvo.isConnected) return;
    const ROT = { agendada: 'agendada', checkin: 'chegou', em_atendimento: 'em atendimento', concluida: 'concluida', falta: 'falta', cancelada: 'cancelada' };
    const linhas = (data || []).map(r => {
      const a = r.dados_antes || {}, d = r.dados_depois || {};
      const quando = new Date(r.criado_em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
      let oque;
      if (r.acao === 'INSERT') oque = 'criou a sessao (' + (ROT[d.status] || d.status || '') + (d.hora_inicio ? ', ' + String(d.hora_inicio).slice(0, 5) : '') + ')';
      else if (r.acao === 'DELETE') oque = 'apagou a sessao';
      else {
        const m = [];
        if (a.status !== d.status) m.push('status ' + (ROT[a.status] || a.status) + ' &rarr; ' + (ROT[d.status] || d.status));
        if (a.confirmacao !== d.confirmacao) m.push('confirmacao: ' + (d.confirmacao || 'nenhuma'));
        if (a.data !== d.data) m.push('data ' + String(a.data).split('-').reverse().join('/') + ' &rarr; ' + String(d.data).split('-').reverse().join('/'));
        if (a.hora_inicio !== d.hora_inicio) m.push('horario ' + String(a.hora_inicio).slice(0, 5) + ' &rarr; ' + String(d.hora_inicio).slice(0, 5));
        if (a.aplicador_id !== d.aplicador_id) m.push('trocou o aplicador');
        if (a.sala_id !== d.sala_id) m.push('trocou a sala');
        oque = m.length ? m.join(' &middot; ') : 'alterou dados';
      }
      return '<div><b>' + quando + '</b> &middot; ' + escaparHtml(r.usuario_nome || 'Sistema/importacao') + ' &middot; ' + oque + '</div>';
    });
    alvo.innerHTML = '<small class="sub" style="display:block; margin-bottom:3px; font-weight:800; letter-spacing:.04em">HISTORICO</small>' +
      (linhas.length ? linhas.join('') : '<div>Sem registros de alteracao ainda.</div>');
  },

  // Aplicador/terapeuta ve na agenda so as sessoes dele e das criancas da carteira dele
  async soMinhas(sessoes) {
    if (ESCOPO.ativo()) {
      const eq = await ESCOPO.carregar();
      const eu = window.CORTEX_SESSAO.user.id;
      return (sessoes || []).filter(s => eq.pacientes.has(s.paciente_id) || s.aplicador_id === eu || eq.aplicadores.has(s.aplicador_id));
    }
    if (!ehEquipe()) return sessoes;
    const meus = await meusPacientesIds();
    const eu = window.CORTEX_SESSAO.user.id;
    return (sessoes || []).filter(s => s.aplicador_id === eu || meus.has(s.paciente_id));
  },

  async mudarStatusSeguro(id, novo) {
    const s = this._sessaoModal && this._sessaoModal.s;
    if (s && ['concluida', 'falta', 'cancelada'].includes(s.status) &&
        !await popConfirmar('Esta sessao ja esta encerrada como "' + s.status + '". Alterar mesmo assim?')) return;
    if (novo === 'falta' && !await popConfirmar('Registrar falta?')) return;
    if (novo === 'cancelada' && !await popConfirmar('Cancelar esta sessao?')) return;
    this.statusModal(id, novo);
  },

  async statusModal(id, status) {
    const dados = { status: status };
    const m = this._sessaoModal || {};
    // Check-in / atendimento: amarra a guia vigente com saldo; sem guia, avisa e pergunta
    if (['checkin', 'em_atendimento', 'concluida'].includes(status) && m.s && !m.s.guia_id) {
      const pac = m.s.pacientes || {};
      if (m.guiaVigente) dados.guia_id = m.guiaVigente.id;
      else if (pac.convenio && !/particular/i.test(pac.convenio)) {
        const seg = await popConfirmar('Esta crianca e de convenio (' + pac.convenio + ') e nao ha guia autorizada com saldo para esta data.\n\nRegistrar ' +
          (status === 'checkin' ? 'o check-in' : status === 'concluida' ? 'a conclusao' : 'o atendimento') + ' mesmo assim? A sessao fica marcada como "sem guia" para a direcao conferir.',
          { titulo: 'Sem guia autorizada', ok: 'Registrar mesmo assim', cancelar: 'Voltar', tipo: 'aviso' });
        if (!seg) return;
        dados.sem_guia = true;
      }
    }
    if (status !== 'cancelada') dados.motivo_cancelamento = null;
    const { error } = await sb.from('sessoes').update(dados).eq('id', id);
    if (error) { popAviso('Erro: ' + error.message); return; }
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
          '<span class="chip-nome">' + (h.pacientes
            ? escaparHtml(h.pacientes.nome.split(' ')[0] + ' ' + (h.pacientes.nome.split(' ')[1] || ''))
            : '<i>' + escaparHtml(h.rotulo || 'Reserva') + '</i>') + '</span>' +
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

    const ehReserva = h ? !h.paciente_id : false;
    abrirModal(h ? 'Editar horario' : 'Novo horario',
      '<div class="campo"><label>Tipo</label><div class="segmento" id="h-tipo">' +
      '<button type="button" class="seg' + (!ehReserva ? ' ativo' : '') + '" onclick="MODULOS.agenda.tipoHorario(this, false)">Paciente</button>' +
      '<button type="button" class="seg' + (ehReserva ? ' ativo' : '') + '" onclick="MODULOS.agenda.tipoHorario(this, true)">Reserva</button>' +
      '</div></div>' +
      '<div class="grade-form">' +
      '  <div class="campo c3" id="h-campo-pac" style="' + (ehReserva ? 'display:none' : '') + '"><label>Paciente *</label>' +
      '    <select id="h-paciente"' + (h && !ehReserva ? ' disabled' : '') + '>' +
      '      <option value="">Selecione</option>' +
      this.pacientes.map(p =>
        '<option value="' + p.id + '"' + (h && h.paciente_id === p.id ? ' selected' : '') + '>' +
        escaparHtml(p.nome) + (p.nivel ? ' (' + (p.nivel === 'aba1' ? 'ABA 1' : 'ABA 2') + ')' : '') +
        '</option>').join('') +
      '    </select></div>' +
      '  <div class="campo c3" id="h-campo-res" style="' + (ehReserva ? '' : 'display:none') + '">' +
      '    <label>Rotulo da reserva * <small>(preencha como quiser: Supervisao, Evolucao, Lanche...)</small></label>' +
      '    <input id="h-rotulo" list="h-rotulos" placeholder="Ex.: Lanche / Evolucao" value="' +
      escaparHtml(h ? h.rotulo || '' : '') + '">' +
      '    <datalist id="h-rotulos"><option value="Supervisao"><option value="Evolucao">' +
      '<option value="Lanche / Evolucao"><option value="Reuniao"></datalist></div>' +
      '  <div class="campo"><label>Dia da semana *</label>' +
      '    <select id="h-dia">' +
      [1, 2, 3, 4, 5].map(d =>
        '<option value="' + d + '"' + (h && h.dia_semana === d ? ' selected' : '') + '>' +
        this.DIAS[d] + '</option>').join('') +
      '    </select></div>' +
      '  <div class="campo"><label>Hora de inicio *</label>' +
      '    <input type="time" id="h-hora" value="' + (h ? h.hora_inicio.slice(0, 5) : '08:00') + '" step="300"></div>' +
      '  <div class="campo"><label>Duracao (min) *</label>' +
      '    <input type="number" id="h-dur" min="20" max="180" step="5" value="' + (h ? h.duracao_min : this._durGlobal) + '"></div>' +
      '  <div class="campo c2"><label>Aplicador *</label>' +
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

  tipoHorario(botao, reserva) {
    botao.parentElement.querySelectorAll('.seg').forEach(b => b.classList.remove('ativo'));
    botao.classList.add('ativo');
    document.getElementById('h-campo-pac').style.display = reserva ? 'none' : '';
    document.getElementById('h-campo-res').style.display = reserva ? '' : 'none';
  },

  async salvarHorario(id) {
    const erro = document.getElementById('h-erro');
    const botao = document.getElementById('h-salvar');
    erro.classList.remove('visivel');

    const ehReserva = document.getElementById('h-campo-res').style.display !== 'none';
    const dados = {
      paciente_id: ehReserva ? null : document.getElementById('h-paciente').value,
      rotulo: ehReserva ? document.getElementById('h-rotulo').value.trim() : null,
      dia_semana: parseInt(document.getElementById('h-dia').value, 10),
      hora_inicio: document.getElementById('h-hora').value,
      duracao_min: parseInt(document.getElementById('h-dur').value, 10),
      aplicador_id: document.getElementById('h-prof').value,
      sala_id: document.getElementById('h-sala').value || null
    };

    if (!dados.hora_inicio || !dados.aplicador_id || !dados.duracao_min ||
        (ehReserva ? !dados.rotulo : !dados.paciente_id)) {
      erro.textContent = ehReserva
        ? 'Preencha o rotulo da reserva, dia, hora, duracao e profissional.'
        : 'Preencha paciente, dia, hora, duracao e profissional.';
      erro.classList.add('visivel');
      return;
    }

    botao.disabled = true;
    botao.textContent = 'Salvando...';

    try {
      const anterior = id ? this.grade.find(x => x.id === id) : null;
      let salvo;
      if (id) {
        const payload = dados.paciente_id === null && !dados.rotulo ? dados : dados;
        const { paciente_id, ...semPaciente } = payload;
        const corpo = (this.grade.find(x => x.id === id) || {}).paciente_id ? semPaciente : payload;
        const { data, error } = await sb.from('grade_horarios')
          .update(corpo).eq('id', id).select('*').single();
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
    if (!await popConfirmar('Encerrar este horario da grade? As familias e o profissional serao notificados.')) return;
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
      if (!h.paciente_id) return;  // reservas nao geram notificacao
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
  },

  // ═══════════════════ HORARIOS DOS APLICADORES (jornada + buracos) ═══════════════════

  minutos(h) { const [x, y] = h.slice(0, 5).split(':').map(Number); return x * 60 + y; },
  horaTxt(min) {
    return String(Math.floor(min / 60)).padStart(2, '0') + ':' + String(min % 60).padStart(2, '0');
  },

  slotsDoDia(profId, dia) {
    const dur = this.durDe(profId);
    const blocos = this.jornadas.filter(j => j.profissional_id === profId && j.dia_semana === dia);
    const ocupados = this.grade.filter(g => g.aplicador_id === profId && g.dia_semana === dia);
    const slots = [];
    blocos.forEach(b => {
      let ini = this.minutos(b.hora_inicio);
      const fim = this.minutos(b.hora_fim);
      while (ini + dur <= fim) {
        const slotIni = ini, slotFim = ini + dur;
        const ocup = ocupados.find(g => {
          const gi = this.minutos(g.hora_inicio), gf = gi + g.duracao_min;
          return gi < slotFim && slotIni < gf;
        });
        slots.push({ dia, hora: this.horaTxt(slotIni), ocupacao: ocup || null });
        ini += dur;
      }
    });
    return slots;
  },

  cargaDe(profId) {
    return this.grade.filter(g => g.aplicador_id === profId && g.paciente_id).length;
  },

  reservasDe(profId) {
    return this.grade.filter(g => g.aplicador_id === profId && !g.paciente_id).length;
  },

  telaHorarios(profId) {
    const equipeOrd = this.equipe.slice().sort((x, y) => this.cargaDe(x.id) - this.cargaDe(y.id));
    this._horProf = profId || this._horProf || (equipeOrd[0] && equipeOrd[0].id);

    this.el.innerHTML =
      '<div class="pagina-cabecalho">' +
      '  <div><button class="btn-voltar" onclick="abrirModulo(\'agenda\')">&larr; Agenda</button>' +
      '  <h2>Horarios dos aplicadores</h2>' +
      '  <p class="sub">Jornada semanal, sessoes fixas e espacos livres. A carga e o total de sessoes fixas por semana.</p></div>' +
      '  <div style="display:flex; gap:8px; flex-wrap:wrap">' +
      (this.gere()
        ? '<button class="btn-chip" title="Visao geral da ocupacao: vagas, reservas e % por aplicador." ' +
          'onclick="MODULOS.agenda.telaControle()">Controle</button>' +
          '<button class="btn-chip" title="Duracao padrao das sessoes, geral e por aplicador." ' +
          'onclick="MODULOS.agenda.modalDuracoes()">Duracao</button>' +
          '<button class="btn-chip" onclick="MODULOS.agenda.modalJornada()">Jornada</button>' +
          '<button class="btn btn-primario" onclick="MODULOS.agenda.modalIndicar()">Indicar horarios</button>'
        : '') +
      '  </div>' +
      '</div>' +
      '<div class="toolbar">' +
      '  <select id="hor-prof" onchange="MODULOS.agenda.telaHorarios(this.value)">' +
      equipeOrd.map(m => '<option value="' + m.id + '"' + (m.id === this._horProf ? ' selected' : '') + '>' +
        escaparHtml(m.nome) + ' - ' + this.cargaDe(m.id) + ' sessoes/sem</option>').join('') +
      '  </select>' +
      '  <span class="selo selo-neutro">' + this.durDe(this._horProf) + ' min por sessao</span>' +
      '</div>' +
      '<div id="hor-grade"></div>';

    this.desenharHorarios();
  },

  desenharHorarios() {
    const profId = this._horProf;
    const alvo = document.getElementById('hor-grade');
    if (!alvo) return;

    const temJornada = this.jornadas.some(j => j.profissional_id === profId);
    if (!temJornada) {
      alvo.innerHTML = '<div class="cartao"><div class="vazio"><div class="simbolo-vazio">&#128336;</div>' +
        '<strong>Sem jornada cadastrada</strong>' +
        (this.gere() ? 'Use o botao Jornada para definir os blocos de trabalho deste aplicador.'
          : 'A coordenacao ainda nao definiu a jornada.') + '</div></div>';
      return;
    }

    let livres = 0, ocupadas = 0;
    let html = '<div class="agenda-grade">';
    for (let d = 1; d <= 6; d++) {
      const slots = this.slotsDoDia(profId, d);
      if (!slots.length && d === 6) continue;
      html += '<div class="agenda-dia"><div class="agenda-dia-titulo">' + this.DIAS[d] +
        ' <span class="selo selo-neutro">' + slots.filter(s => !s.ocupacao).length + ' livres</span></div>';
      if (!slots.length) html += '<div class="agenda-vazio">Fora da jornada</div>';
      slots.forEach(s => {
        if (s.ocupacao) {
          ocupadas++;
          const g = s.ocupacao;
          html += '<div class="chip-sessao clicavel ' + (g.pacientes ? 'hor-ocupado' : 'hor-reserva') + '"' +
            (this.gere() ? ' onclick="MODULOS.agenda.modalHorario(\'' + g.id + '\')"' : '') + '>' +
            '<b>' + g.hora_inicio.slice(0, 5) + '</b> ' +
            '<span class="chip-nome">' + (g.pacientes
              ? escaparHtml(g.pacientes.nome.split(' ').slice(0, 2).join(' '))
              : '<i>' + escaparHtml(g.rotulo || 'Reserva') + '</i>') + '</span>' +
            (g.salas ? '<small>' + escaparHtml(g.salas.nome) + '</small>' : '') +
            '</div>';
        } else {
          livres++;
          html += '<div class="chip-sessao hor-livre' + (this.gere() ? ' clicavel' : '') + '"' +
            (this.gere() ? ' title="Toque para marcar um paciente neste espaco" ' +
              'onclick="MODULOS.agenda.novoNoSlot(' + s.dia + ', \'' + s.hora + '\')"' : '') + '>' +
            '<b>' + s.hora + '</b> <span class="chip-nome">livre</span></div>';
        }
      });
      html += '</div>';
    }
    html += '</div>';
    alvo.innerHTML = html +
      '<div class="cartao" style="margin-top:12px"><p class="sub">' +
      '<b>' + ocupadas + '</b> sessoes fixas na semana &middot; <b>' + livres + '</b> espacos livres dentro da jornada.</p></div>';
  },

  novoNoSlot(dia, hora) {
    this.modalHorario();
    setTimeout(() => {
      const d = document.getElementById('h-dia'), h = document.getElementById('h-hora'),
            p = document.getElementById('h-prof'), du = document.getElementById('h-dur');
      if (d) d.value = dia;
      if (h) h.value = hora;
      if (p) p.value = this._horProf;
      if (du) du.value = this.durDe(this._horProf);
    }, 50);
  },

  // ─────────────── Jornada ───────────────

  modalJornada(profId) {
    const id = profId || this._horProf;
    const m = this.equipe.find(x => x.id === id);
    const blocos = this.jornadas.filter(j => j.profissional_id === id);

    let corpo = '<div class="campo"><label>Aplicador</label><select onchange="MODULOS.agenda.modalJornada(this.value)">' +
      this.equipe.map(x => '<option value="' + x.id + '"' + (x.id === id ? ' selected' : '') + '>' +
        escaparHtml(x.nome) + '</option>').join('') + '</select></div>';

    for (let d = 1; d <= 6; d++) {
      const doDia = blocos.filter(b => b.dia_semana === d);
      corpo += '<div class="linha-doc" style="align-items:flex-start"><div style="flex:1"><b>' + this.DIAS[d] + '</b>' +
        (doDia.length
          ? doDia.map(b => '<small style="display:inline-flex; align-items:center; gap:6px; margin-right:10px">' +
              b.hora_inicio.slice(0, 5) + ' &ndash; ' + b.hora_fim.slice(0, 5) +
              ' <button class="btn-chip" style="padding:1px 7px" ' +
              'onclick="MODULOS.agenda.removerBloco(\'' + b.id + '\', \'' + id + '\')">&times;</button></small>').join('')
          : '<small class="sub"> sem jornada</small>') +
        '</div></div>';
    }

    corpo += '<div class="grade-form" style="margin-top:12px">' +
      '<div class="campo"><label>Dia</label><select id="jr-dia">' +
      [1, 2, 3, 4, 5, 6].map(d => '<option value="' + d + '">' + this.DIAS[d] + '</option>').join('') + '</select></div>' +
      '<div class="campo"><label>Inicio</label><input type="time" id="jr-ini" value="08:00" step="300"></div>' +
      '<div class="campo"><label>Fim</label><input type="time" id="jr-fim" value="12:00" step="300"></div>' +
      '</div>' +
      '<div class="mensagem-erro" id="jr-erro"></div>' +
      '<div class="barra-acoes">' +
      '  <button class="btn btn-fantasma" onclick="fecharModal()">Fechar</button>' +
      '  <button class="btn btn-primario" onclick="MODULOS.agenda.salvarBloco(\'' + id + '\')">Adicionar bloco</button>' +
      '</div>';

    abrirModal('Jornada de ' + escaparHtml(m ? m.nome.split(' ')[0] : ''), corpo, true);
  },

  async salvarBloco(profId) {
    const erro = document.getElementById('jr-erro');
    erro.classList.remove('visivel');
    const ini = document.getElementById('jr-ini').value, fim = document.getElementById('jr-fim').value;
    if (!ini || !fim || fim <= ini) {
      erro.textContent = 'Horario final precisa ser depois do inicial.';
      erro.classList.add('visivel');
      return;
    }
    const { error } = await sb.from('jornadas').insert({
      profissional_id: profId,
      dia_semana: parseInt(document.getElementById('jr-dia').value, 10),
      hora_inicio: ini, hora_fim: fim
    });
    if (error) { erro.textContent = error.message; erro.classList.add('visivel'); return; }
    await this.carregarBase();
    this.modalJornada(profId);
    if (document.getElementById('hor-grade')) this.desenharHorarios();
  },

  async removerBloco(id, profId) {
    { const { error: _e } = await sb.from('jornadas').delete().eq('id', id); if (_e) popAviso('Nao foi possivel gravar (jornadas): ' + _e.message); }
    await this.carregarBase();
    this.modalJornada(profId);
    if (document.getElementById('hor-grade')) this.desenharHorarios();
  },

  // ─────────────── Duracao das sessoes ───────────────

  modalDuracoes() {
    abrirModal('Duracao das sessoes',
      '<div class="campo"><label>Duracao geral (min)</label>' +
      '<input type="number" id="du-geral" min="20" max="180" step="5" value="' + this._durGlobal + '"></div>' +
      '<p class="sub" style="margin:8px 0">Por aplicador (vazio = usa a geral):</p>' +
      this.equipe.map(m =>
        '<div class="linha-doc"><b>' + escaparHtml(m.nome) + '</b>' +
        '<input type="number" class="du-prof" data-id="' + m.id + '" min="20" max="180" step="5" ' +
        'style="width:90px" placeholder="' + this._durGlobal + '" value="' + (m.duracao_sessao_min || '') + '">' +
        '</div>').join('') +
      '<div class="mensagem-erro" id="du-erro"></div>' +
      '<div class="barra-acoes">' +
      '  <button class="btn btn-fantasma" onclick="fecharModal()">Cancelar</button>' +
      '  <button class="btn btn-primario" onclick="MODULOS.agenda.salvarDuracoes()">Salvar</button>' +
      '</div>', true);
  },

  async salvarDuracoes() {
    const erro = document.getElementById('du-erro');
    erro.classList.remove('visivel');
    try {
      const geral = parseInt(document.getElementById('du-geral').value, 10) || 45;
      const { error: e1 } = await sb.from('configuracoes')
        .upsert({ chave: 'duracao_sessao_min', valor: String(geral) }, { onConflict: 'chave' });
      if (e1) throw new Error(e1.message);
      for (const inp of document.querySelectorAll('.du-prof')) {
        const v = inp.value ? parseInt(inp.value, 10) : null;
        const m = this.equipe.find(x => x.id === inp.dataset.id);
        if ((m.duracao_sessao_min || null) !== v) {
          const { error: e2 } = await sb.from('profiles')
            .update({ duracao_sessao_min: v }).eq('id', inp.dataset.id);
          if (e2) throw new Error(e2.message);
        }
      }
      fecharModal();
      await this.carregarBase();
      if (document.getElementById('hor-grade')) this.telaHorarios(this._horProf);
    } catch (e) {
      erro.textContent = e.message;
      erro.classList.add('visivel');
    }
  },

  // ═══════════════════ INDICATIVO AUTOMATICO ═══════════════════

  livresDe(profId) {
    let livres = [];
    for (let d = 1; d <= 6; d++) {
      livres = livres.concat(this.slotsDoDia(profId, d).filter(s => !s.ocupacao));
    }
    return livres;
  },

  distribuir(livres, n) {
    // Espalha pelos dias: um por dia em rodadas, do horario mais cedo
    const porDia = {};
    livres.forEach(s => (porDia[s.dia] = porDia[s.dia] || []).push(s));
    Object.values(porDia).forEach(l => l.sort((a, b) => a.hora.localeCompare(b.hora)));
    const dias = Object.keys(porDia).map(Number).sort();
    const escolha = [];
    while (escolha.length < n) {
      let pegou = false;
      for (const d of dias) {
        if (escolha.length >= n) break;
        if (porDia[d].length) { escolha.push(porDia[d].shift()); pegou = true; }
      }
      if (!pegou) break;
    }
    return escolha.sort((a, b) => a.dia - b.dia || a.hora.localeCompare(b.hora));
  },

  async modalIndicar() {
    const pacs = this.pacientes;
    abrirModal('Indicar horarios',
      '<p class="sub" style="margin-bottom:10px">O sistema escolhe o aplicador com <b>menor carga semanal</b> que tenha ' +
      'espacos livres na jornada, e distribui as sessoes pelos dias. Voce revisa e envia para a confirmacao da agenda.</p>' +
      '<div class="grade-form">' +
      '  <div class="campo c2"><label>Paciente *</label><select id="in-pac" ' +
      '    onchange="MODULOS.agenda.preencherQtd(this.value)">' +
      '    <option value="">Selecione</option>' +
      pacs.map(p => '<option value="' + p.id + '">' + escaparHtml(p.nome) + '</option>').join('') +
      '  </select></div>' +
      '  <div class="campo"><label>Sessoes por semana *</label>' +
      '    <input type="number" id="in-qtd" min="1" max="15" value="5"></div>' +
      '</div>' +
      '<div class="barra-acoes" style="margin-top:4px">' +
      '  <button class="btn btn-primario" onclick="MODULOS.agenda.calcularIndicativo()">Calcular indicacao</button>' +
      '</div>' +
      '<div id="in-proposta"></div>' +
      '<div class="mensagem-erro" id="in-erro"></div>', true);
  },

  async preencherQtd(pacId) {
    if (!pacId) return;
    const { data } = await sb.from('encaminhamentos').select('sessoes_semanais')
      .eq('paciente_id', pacId).order('criado_em', { ascending: false }).limit(1);
    if (data && data[0] && data[0].sessoes_semanais) {
      document.getElementById('in-qtd').value = data[0].sessoes_semanais;
    }
  },

  calcularIndicativo() {
    const erro = document.getElementById('in-erro');
    erro.classList.remove('visivel');
    const pacId = document.getElementById('in-pac').value;
    const n = parseInt(document.getElementById('in-qtd').value, 10) || 0;
    if (!pacId || n < 1) {
      erro.textContent = 'Escolha o paciente e o numero de sessoes.';
      erro.classList.add('visivel');
      return;
    }

    const ranking = this.equipe
      .map(m => ({ m, carga: this.cargaDe(m.id), livres: this.livresDe(m.id) }))
      .filter(x => x.livres.length > 0)
      .sort((a, b) => (a.carga - b.carga) || (b.livres.length - a.livres.length));

    if (!ranking.length) {
      erro.textContent = 'Nenhum aplicador tem jornada com espacos livres. Cadastre as jornadas em Horarios.';
      erro.classList.add('visivel');
      return;
    }

    const cabem = ranking.filter(x => x.livres.length >= n);
    const escolhido = (cabem[0] || ranking[0]);
    this._indic = { pacId, n, ranking };
    this.desenharProposta(escolhido.m.id);
  },

  desenharProposta(profId) {
    const dados = this._indic.ranking.find(x => x.m.id === profId);
    const n = this._indic.n;
    const sugeridos = this.distribuir(dados.livres.slice(), n);
    const chaves = new Set(sugeridos.map(s => s.dia + '|' + s.hora));

    document.getElementById('in-proposta').innerHTML =
      '<div class="cartao" style="margin-top:12px">' +
      '<div class="campo"><label>Aplicador indicado <small>(ordenado por menor carga)</small></label>' +
      '<select onchange="MODULOS.agenda.desenharProposta(this.value)">' +
      this._indic.ranking.map(x =>
        '<option value="' + x.m.id + '"' + (x.m.id === profId ? ' selected' : '') + '>' +
        escaparHtml(x.m.nome) + ' - ' + x.carga + ' sessoes/sem, ' + x.livres.length + ' livres</option>').join('') +
      '</select></div>' +
      (dados.livres.length < n
        ? '<p class="sub" style="color:var(--st-bad)">Este aplicador tem so ' + dados.livres.length +
          ' espaco(s) livre(s) para ' + n + ' sessoes - marque o que couber ou divida com outro.</p>' : '') +
      '<p class="sub" style="margin:6px 0">Marcados: <b id="in-cont">' + sugeridos.length + '</b> de ' + n +
      ' &middot; ' + this.durDe(profId) + ' min cada</p>' +
      '<div style="display:flex; flex-wrap:wrap; gap:6px">' +
      dados.livres.map(s =>
        '<label class="niv-opcao" style="min-width:0">' +
        '<input type="checkbox" class="in-slot" data-dia="' + s.dia + '" data-hora="' + s.hora + '"' +
        (chaves.has(s.dia + '|' + s.hora) ? ' checked' : '') +
        ' onchange="document.getElementById(\'in-cont\').textContent = document.querySelectorAll(\'.in-slot:checked\').length">' +
        '<b>' + this.DIAS[s.dia].slice(0, 3) + '</b> ' + s.hora + '</label>').join('') +
      '</div>' +
      '<div class="barra-acoes" style="margin-top:12px">' +
      '  <button class="btn btn-primario" onclick="MODULOS.agenda.enviarIndicativo(\'' + profId + '\')">Enviar para confirmacao</button>' +
      '</div></div>';
  },

  async enviarIndicativo(profId) {
    const erro = document.getElementById('in-erro');
    erro.classList.remove('visivel');
    const slots = Array.from(document.querySelectorAll('.in-slot:checked'))
      .map(cb => ({ dia: parseInt(cb.dataset.dia, 10), hora: cb.dataset.hora }));
    if (!slots.length) {
      erro.textContent = 'Marque ao menos um horario.';
      erro.classList.add('visivel');
      return;
    }
    const { error } = await sb.from('indicativos').insert({
      paciente_id: this._indic.pacId,
      aplicador_id: profId,
      duracao_min: this.durDe(profId),
      slots: slots,
      criado_por: window.CORTEX_SESSAO.user.id
    });
    if (error) { erro.textContent = error.message; erro.classList.add('visivel'); return; }
    fecharModal();
    alert('Indicativo enviado. Ele aparece para a agenda/coordenacao confirmar na proxima entrada no sistema.');
  },

  // ─────────────── Confirmacao (pop-up de entrada) ───────────────

  async popupIndicativos() {
    if (perm('agenda') !== 'E' && perm('agenda_grade') !== 'E') return;
    const { data } = await sb.from('indicativos')
      .select('id, slots, duracao_min, criado_em, pacientes(nome), aplicador:profiles!indicativos_aplicador_id_fkey(nome), autor:profiles!indicativos_criado_por_fkey(nome)')
      .eq('status', 'pendente').order('criado_em');
    if (!data || !data.length) return;
    this._pendentes = data;

    abrirModal('Indicativos aguardando confirmacao',
      '<p class="sub" style="margin-bottom:10px">Sugestoes de agenda geradas pelo sistema. ' +
      'Confirmar grava as sessoes fixas na grade do aplicador (as sessoes do dia nascem dela sozinhas).</p>' +
      data.map(i =>
        '<div class="linha-doc" style="align-items:flex-start"><div style="flex:1">' +
        '<b>' + escaparHtml(i.pacientes ? i.pacientes.nome : '?') + '</b> &rarr; ' +
        escaparHtml(i.aplicador ? i.aplicador.nome : '?') +
        '<small>' + i.slots.map(s => this.DIAS[s.dia].slice(0, 3) + ' ' + s.hora).join(' &middot; ') +
        ' &middot; ' + i.duracao_min + ' min' +
        (i.autor ? ' &middot; indicado por ' + escaparHtml(i.autor.nome.split(' ')[0]) : '') + '</small></div>' +
        '<div class="pac-selos">' +
        '<button class="btn-chip cheio" onclick="MODULOS.agenda.confirmarIndicativo(\'' + i.id + '\')">Confirmar</button>' +
        '<button class="btn-chip" onclick="MODULOS.agenda.recusarIndicativo(\'' + i.id + '\')">Recusar</button>' +
        '</div></div>').join('') +
      '<div class="mensagem-erro" id="ind-erro"></div>' +
      '<div class="barra-acoes"><button class="btn btn-fantasma" onclick="fecharModal()">Deixar para depois</button></div>', true, 'agenda');
  },

  async confirmarIndicativo(id) {
    const erro = document.getElementById('ind-erro');
    if (erro) erro.classList.remove('visivel');
    const i = (this._pendentes || []).find(x => x.id === id);
    if (!i) return;

    const { data: cheio } = await sb.from('indicativos')
      .select('*').eq('id', id).single();
    const inseridos = [];
    try {
      for (const s of cheio.slots) {
        const { data: g, error } = await sb.from('grade_horarios').insert({
          paciente_id: cheio.paciente_id,
          dia_semana: s.dia,
          hora_inicio: s.hora,
          duracao_min: cheio.duracao_min,
          aplicador_id: cheio.aplicador_id,
          criado_por: window.CORTEX_SESSAO.user.id
        }).select('id').single();
        if (error) throw new Error(this.traduzErro(error.message) + ' (' + this.DIAS[s.dia] + ' ' + s.hora + ')');
        inseridos.push(g.id);
      }
      { const { error: _e } = await sb.from('indicativos').update({
        status: 'confirmado',
        decidido_por: window.CORTEX_SESSAO.user.id,
        decidido_em: new Date().toISOString()
      }).eq('id', id); if (_e) popAviso('Nao foi possivel gravar (indicativos): ' + _e.message); }

      try {
        const notifs = [{
          destinatario_id: cheio.aplicador_id,
          titulo: 'Novos horarios: ' + (i.pacientes ? i.pacientes.nome : 'paciente'),
          corpo: 'Sessoes fixas confirmadas: ' + cheio.slots.map(s => this.DIAS[s.dia] + ' ' + s.hora).join(', ') + '.'
        }];
        const { data: fams } = await sb.from('familia_pacientes')
          .select('usuario_id').eq('paciente_id', cheio.paciente_id);
        (fams || []).forEach(f => notifs.push({
          destinatario_id: f.usuario_id,
          titulo: 'Agenda definida',
          corpo: 'Os horarios de atendimento foram confirmados: ' +
            cheio.slots.map(s => this.DIAS[s.dia] + ' ' + s.hora).join(', ') + '.'
        }));
        await sb.from('notificacoes').insert(notifs);
      } catch (e) { /* notificacao nunca trava */ }

      await this.carregarBase();
      this.popupIndicativos();
      if (!(this._pendentes || []).some(x => x.id !== id)) fecharModal();
    } catch (e) {
      for (const gid of inseridos) await sb.from('grade_horarios').delete().eq('id', gid);
      if (erro) { erro.textContent = e.message; erro.classList.add('visivel'); }
      else alert(e.message);
    }
  },

  async recusarIndicativo(id) {
    if (!await popConfirmar('Recusar este indicativo? Ele some da fila (a coordenacao pode gerar outro).')) return;
    { const { error: _e } = await sb.from('indicativos').update({
      status: 'recusado',
      decidido_por: window.CORTEX_SESSAO.user.id,
      decidido_em: new Date().toISOString()
    }).eq('id', id); if (_e) popAviso('Nao foi possivel gravar (indicativos): ' + _e.message); }
    fecharModal();
    this.popupIndicativos();
  },

  // ─────────────── Painel Controle (ocupacao) ───────────────

  telaControle() {
    const linhas = this.equipe.map(m => {
      let totais = 0;
      for (let d = 1; d <= 6; d++) totais += this.slotsDoDia(m.id, d).length;
      const ocupadas = this.cargaDe(m.id);
      const reservadas = this.reservasDe(m.id);
      const livres = Math.max(0, totais - ocupadas - reservadas);
      const uteis = ocupadas + livres;
      const pct = uteis ? Math.round(ocupadas * 100 / uteis) : null;
      return { m, totais, reservadas, ocupadas, livres, pct };
    }).filter(x => x.totais > 0)
      .sort((x, y) => (y.pct || 0) - (x.pct || 0));

    const semJornada = this.equipe.filter(m =>
      !this.jornadas.some(j => j.profissional_id === m.id));

    this.el.innerHTML =
      '<div class="pagina-cabecalho">' +
      '  <div><button class="btn-voltar" onclick="MODULOS.agenda.telaHorarios()">&larr; Horarios</button>' +
      '  <h2>Controle de ocupacao</h2>' +
      '  <p class="sub">Calculado ao vivo pela jornada e pela grade fixa. Vagas uteis = totais menos reservas.</p></div>' +
      '</div>' +
      '<div class="cartao">' +
      (linhas.length
        ? '<table class="tabela-presenca"><thead><tr>' +
          '<th>Aplicador</th><th class="centro">Vagas totais</th><th class="centro">Reservadas</th>' +
          '<th class="centro">Ocupadas</th><th class="centro">Livres</th><th class="centro">% ocupacao</th><th></th>' +
          '</tr></thead><tbody>' +
          linhas.map(x =>
            '<tr><td><b>' + escaparHtml(x.m.nome) + '</b><br><small class="sub">' +
            this.durDe(x.m.id) + ' min por sessao</small></td>' +
            '<td class="centro">' + x.totais + '</td>' +
            '<td class="centro">' + x.reservadas + '</td>' +
            '<td class="centro">' + x.ocupadas + '</td>' +
            '<td class="centro"><b style="color:' + (x.livres > 0 ? '#15803D' : 'var(--ink-muted)') + '">' + x.livres + '</b></td>' +
            '<td class="centro"><div style="display:flex; align-items:center; gap:8px; justify-content:center">' +
            '<div style="width:90px; height:8px; background:var(--surface-alt); border-radius:5px; overflow:hidden">' +
            '<div style="height:100%; width:' + (x.pct || 0) + '%; border-radius:5px; background:' +
            ((x.pct || 0) >= 90 ? 'var(--st-bad)' : (x.pct || 0) >= 75 ? '#D97706' : '#15803D') + '"></div></div>' +
            '<b>' + (x.pct === null ? '-' : x.pct + '%') + '</b></div></td>' +
            '<td><button class="btn-chip" onclick="MODULOS.agenda.telaHorarios(\'' + x.m.id + '\')">Abrir</button></td></tr>'
          ).join('') +
          '</tbody></table>'
        : '<p class="sub">Nenhuma jornada cadastrada ainda.</p>') +
      (semJornada.length
        ? '<p class="sub" style="margin-top:10px">Sem jornada cadastrada: ' +
          semJornada.map(m => escaparHtml(m.nome.split(' ')[0])).join(', ') + '.</p>' : '') +
      '</div>';
  }
};
