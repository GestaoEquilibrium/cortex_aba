// ============================================================================
// CORTEX aba - js/modulos/agenda.js
// Sprint 4: grade fixa semanal (dia/hora/profissional/sala), sessoes por data,
// gestao de salas e notificacoes de mudanca para aplicador e familia.
// Conflitos de sala/profissional/paciente sao barrados por trigger no banco.
// ============================================================================

window.MODULOS = window.MODULOS || {};

window.MODULOS.agenda = {

  PODE_GERIR: ['direcao', 'coordenador', 'suporte'],
  DIAS: ['', 'Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta'],

  el: null,
  sessao: null,
  grade: [],
  pacientes: [],
  equipe: [],
  salas: [],

  async render(el, sessao) {
    this.el = el;
    this.sessao = sessao;
    await this.carregarBase();
    this.telaSemana();
  },

  async carregarBase() {
    const [g, p, e, s] = await Promise.all([
      sb.from('grade_horarios')
        .select('*, pacientes(id, nome, nivel), profissional:profiles!grade_horarios_aplicador_id_fkey(id, nome), salas(id, nome)')
        .eq('ativo', true)
        .order('hora_inicio'),
      sb.from('pacientes').select('id, nome, nivel, aplicador_id').neq('status', 'encerrado').order('nome'),
      sb.from('profiles').select('id, nome, perfil').in('perfil', ['aplicador', 'terapeuta']).eq('ativo', true).order('nome'),
      sb.from('salas').select('*').order('nome')
    ]);
    this.grade = g.data || [];
    this.pacientes = p.data || [];
    this.equipe = e.data || [];
    this.salas = s.data || [];
  },

  // ───────────────────────── SEMANA (grade fixa) ─────────────────────────

  telaSemana() {
    const gere = this.PODE_GERIR.includes(this.sessao.profile.perfil);

    this.el.innerHTML =
      '<div class="pagina-cabecalho">' +
      '  <div><h2>Agenda</h2><p class="sub">Grade fixa semanal da psicoterapia ABA.</p></div>' +
      '  <div style="display:flex; gap:8px; flex-wrap:wrap">' +
      '    <button class="btn-chip" onclick="MODULOS.agenda.telaDia()">Sessoes do dia</button>' +
      (gere
        ? '<button class="btn-chip" onclick="MODULOS.agenda.modalSalas()">Salas</button>' +
          '<button class="btn btn-primario" onclick="MODULOS.agenda.modalHorario()">+ Novo horario</button>'
        : '') +
      '  </div>' +
      '</div>' +
      '<div class="toolbar">' +
      '  <select id="ag-f-prof" onchange="MODULOS.agenda.desenharSemana()">' +
      '    <option value="">Todos os profissionais</option>' +
      this.equipe.map(m => '<option value="' + m.id + '">' + escaparHtml(m.nome) + '</option>').join('') +
      '  </select>' +
      '  <select id="ag-f-sala" onchange="MODULOS.agenda.desenharSemana()">' +
      '    <option value="">Todas as salas</option>' +
      this.salas.filter(s => s.ativo).map(s => '<option value="' + s.id + '">' + escaparHtml(s.nome) + '</option>').join('') +
      '  </select>' +
      '</div>' +
      '<div id="ag-semana"></div>';

    this.desenharSemana();
  },

  desenharSemana() {
    const fp = document.getElementById('ag-f-prof')?.value || '';
    const fs = document.getElementById('ag-f-sala')?.value || '';
    const gere = this.PODE_GERIR.includes(this.sessao.profile.perfil);

    const itens = this.grade.filter(h =>
      (!fp || h.aplicador_id === fp) && (!fs || h.sala_id === fs));

    let html = '<div class="agenda-grade">';
    for (let d = 1; d <= 5; d++) {
      const doDia = itens.filter(h => h.dia_semana === d);
      html += '<div class="agenda-dia">' +
        '<div class="agenda-dia-titulo">' + this.DIAS[d] +
        ' <span class="selo selo-neutro">' + doDia.length + '</span></div>';
      if (doDia.length === 0) {
        html += '<div class="agenda-vazio">Sem horarios</div>';
      }
      doDia.forEach(h => {
        html += '<div class="chip-sessao' + (gere ? ' clicavel' : '') + '"' +
          (gere ? ' onclick="MODULOS.agenda.modalHorario(\'' + h.id + '\')"' : '') + '>' +
          '<b>' + h.hora_inicio.slice(0, 5) + '</b> ' +
          '<span class="chip-nome">' + escaparHtml(h.pacientes ? h.pacientes.nome.split(' ')[0] +
            ' ' + (h.pacientes.nome.split(' ')[1] || '') : '?') + '</span>' +
          '<small>' + escaparHtml(h.profissional ? h.profissional.nome.split(' ')[0] : '-') +
          (h.salas ? ' &middot; ' + escaparHtml(h.salas.nome) : '') + '</small>' +
          '</div>';
      });
      html += '</div>';
    }
    html += '</div>';
    document.getElementById('ag-semana').innerHTML = html;
  },

  // ───────────────────────── HORARIO (criar/editar) ─────────────────────────

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
      '<p class="sub">Ao selecionar o paciente, o profissional designado no prontuario e sugerido automaticamente.</p>' +
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
      this.telaSemana();
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
    this.telaSemana();
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
    } catch (e) { /* notificacao nunca deve travar o fluxo */ }
  },

  // ───────────────────────── SESSOES DO DIA ─────────────────────────

  async telaDia(dataStr) {
    const hoje = dataStr || new Date().toISOString().slice(0, 10);

    this.el.innerHTML =
      '<div class="pagina-cabecalho">' +
      '  <div>' +
      '    <button class="btn-voltar" onclick="MODULOS.agenda.telaSemana()">&larr; Grade semanal</button>' +
      '    <h2>Sessoes do dia</h2>' +
      '    <p class="sub">As sessoes sao geradas a partir da grade fixa.</p>' +
      '  </div>' +
      '  <div style="display:flex; gap:8px; align-items:center">' +
      '    <input type="date" id="dia-data" value="' + hoje + '" ' +
      '      onchange="MODULOS.agenda.telaDia(this.value)" ' +
      '      style="padding:8px 12px; border:1.5px solid var(--line); border-radius:12px; font:inherit; font-size:13px; background:var(--surface); color:var(--ink)">' +
      '    <button class="btn btn-primario" onclick="MODULOS.agenda.gerarDia()">Gerar sessoes</button>' +
      '  </div>' +
      '</div>' +
      '<div id="dia-lista"><div class="cartao"><p class="sub">Carregando...</p></div></div>';

    await this.listarDia(hoje);
  },

  async listarDia(data) {
    const { data: sessoes, error } = await sb
      .from('sessoes')
      .select('*, pacientes(nome), profissional:profiles!sessoes_aplicador_id_fkey(nome), salas(nome)')
      .eq('data', data)
      .order('hora_inicio');

    const alvo = document.getElementById('dia-lista');
    if (error) {
      alvo.innerHTML = '<div class="cartao"><div class="mensagem-erro visivel">' +
        escaparHtml(error.message) + '</div></div>';
      return;
    }

    if (!sessoes || sessoes.length === 0) {
      alvo.innerHTML = '<div class="cartao"><div class="vazio">' +
        '<div class="simbolo-vazio">&#128197;</div>' +
        '<strong>Nenhuma sessao nesta data</strong>' +
        'Use "Gerar sessoes" para materializar a grade fixa do dia.' +
        '</div></div>';
      return;
    }

    const mapa = {
      agendada: ['selo-neutro', 'Agendada'],
      checkin: ['selo-roxo', 'Check-in'],
      em_atendimento: ['selo-warn', 'Em atendimento'],
      concluida: ['selo-ok', 'Concluida'],
      falta: ['selo-bad', 'Falta'],
      cancelada: ['selo-neutro', 'Cancelada']
    };

    alvo.innerHTML = '<div class="cartao">' + sessoes.map(s => {
      const m = mapa[s.status] || ['selo-neutro', s.status];
      const aberta = !['concluida', 'falta', 'cancelada'].includes(s.status);
      return '<div class="linha-doc">' +
        '<div><b>' + s.hora_inicio.slice(0, 5) + ' &middot; ' +
        escaparHtml(s.pacientes ? s.pacientes.nome : '?') + '</b>' +
        '<small>' + escaparHtml(s.profissional ? s.profissional.nome : '-') +
        (s.salas ? ' &middot; ' + escaparHtml(s.salas.nome) : '') + '</small></div>' +
        '<div class="pac-selos">' +
        '<span class="selo ' + m[0] + '">' + m[1] + '</span>' +
        (aberta
          ? '<button class="btn-chip" onclick="MODULOS.agenda.mudarStatus(\'' + s.id + '\', \'concluida\', \'' + s.data + '\')">Concluir</button>' +
            '<button class="btn-chip" style="color:var(--st-bad)" onclick="MODULOS.agenda.mudarStatus(\'' + s.id + '\', \'falta\', \'' + s.data + '\')">Falta</button>'
          : '') +
        '</div></div>';
    }).join('') + '</div>';
  },

  async gerarDia() {
    const data = document.getElementById('dia-data').value;
    const { data: qtd, error } = await sb.rpc('gerar_sessoes_do_dia', { p_data: data });
    if (error) { alert('Erro: ' + error.message); return; }
    await this.listarDia(data);
  },

  async mudarStatus(id, status, data) {
    const { error } = await sb.from('sessoes').update({ status: status }).eq('id', id);
    if (error) { alert('Erro: ' + error.message); return; }
    await this.listarDia(data);
  },

  // ───────────────────────── SALAS ─────────────────────────

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
