// ============================================================================
// CORTEX aba - js/modulos/checkin.js
// Tela da recepcao: sessoes de hoje com busca e botoes grandes de check-in.
// Atualiza sozinha (tempo real + verificacao periodica).
// ============================================================================

window.MODULOS = window.MODULOS || {};

window.MODULOS.checkin = {

  el: null,
  sessao: null,
  sessoes: [],
  _canal: null,
  _timer: null,

  async render(el, sessao) {
    this.el = el;
    this.sessao = sessao;

    const hoje = new Date();
    const dataFmt = hoje.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });

    el.innerHTML =
      '<div class="pagina-cabecalho">' +
      '  <div><h2>Check-in</h2>' +
      '  <p class="sub">' + dataFmt.charAt(0).toUpperCase() + dataFmt.slice(1) +
      ' &middot; toque em Check-in quando a crianca chegar; a TV avisa o profissional.</p></div>' +
      '  <button class="btn-chip" onclick="window.open(\'tv.html\', \'_blank\')">&#128250; Tela da TV</button>' +
      '</div>' +
      '<div class="toolbar">' +
      '  <input type="search" id="ck-busca" placeholder="Buscar crianca pelo nome..." ' +
      '    oninput="MODULOS.checkin.desenhar()" autocomplete="off">' +
      '</div>' +
      '<div id="ck-lista"><div class="cartao"><p class="sub">Carregando...</p></div></div>';

    // Garante as sessoes do dia e carrega
    await sb.rpc('gerar_sessoes_do_dia', { p_data: new Date().toISOString().slice(0, 10) });
    await this.carregar();

    // Tempo real + verificacao periodica de seguranca
    this.pararAtualizacao();
    this._canal = sb.channel('checkin-sessoes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessoes' },
        () => this.carregar())
      .subscribe();
    this._timer = setInterval(() => {
      if (!document.getElementById('ck-lista')) { this.pararAtualizacao(); return; }
      this.carregar();
    }, 30000);
  },

  pararAtualizacao() {
    if (this._canal) { sb.removeChannel(this._canal); this._canal = null; }
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
  },

  async carregar() {
    const hoje = new Date().toISOString().slice(0, 10);
    const { data, error } = await sb
      .from('sessoes')
      .select('id, hora_inicio, status, pacientes(nome), profissional:profiles!sessoes_aplicador_id_fkey(nome), salas(nome)')
      .eq('data', hoje)
      .order('hora_inicio');
    if (error) return;
    this.sessoes = data || [];
    this.desenhar();
  },

  desenhar() {
    const alvo = document.getElementById('ck-lista');
    if (!alvo) return;
    const termo = (document.getElementById('ck-busca')?.value || '').toLowerCase();

    const visiveis = this.sessoes.filter(s =>
      !['concluida', 'cancelada'].includes(s.status) &&
      (!termo || (s.pacientes && s.pacientes.nome.toLowerCase().includes(termo))));

    if (visiveis.length === 0) {
      alvo.innerHTML = '<div class="cartao"><div class="vazio">' +
        '<div class="simbolo-vazio">&#10003;</div>' +
        '<strong>' + (this.sessoes.length ? 'Nada pendente' : 'Sem sessoes hoje') + '</strong>' +
        (termo ? 'Nenhuma crianca com esse nome na agenda de hoje.' :
          'Todos os atendimentos do dia foram concluidos.') +
        '</div></div>';
      return;
    }

    const mapa = {
      agendada: ['selo-neutro', 'Aguardando'],
      checkin: ['selo-warn', 'Chegou'],
      em_atendimento: ['selo-ok', 'Em atendimento'],
      falta: ['selo-bad', 'Falta']
    };

    alvo.innerHTML = '<div class="grade-checkin">' + visiveis.map(s => {
      const m = mapa[s.status] || ['selo-neutro', s.status];
      let acao = '';
      if (s.status === 'agendada') {
        acao = '<button class="btn btn-primario btn-checkin" ' +
          'onclick="MODULOS.checkin.mudar(\'' + s.id + '\', \'checkin\')">Check-in</button>' +
          '<button class="btn-chip" style="color:var(--st-bad)" ' +
          'onclick="MODULOS.checkin.confirmarFalta(\'' + s.id + '\')">Falta</button>';
      } else if (s.status === 'checkin') {
        acao = '<button class="btn btn-primario btn-checkin" ' +
          'onclick="MODULOS.checkin.mudar(\'' + s.id + '\', \'em_atendimento\')">Iniciar</button>';
      } else if (s.status === 'em_atendimento') {
        acao = '<button class="btn btn-fantasma" ' +
          'onclick="MODULOS.checkin.mudar(\'' + s.id + '\', \'concluida\')">Concluir</button>';
      }
      return '<div class="cartao cartao-checkin' + (s.status === 'checkin' ? ' chegou' : '') + '">' +
        '<div class="ck-hora">' + s.hora_inicio.slice(0, 5) + '</div>' +
        '<div class="ck-info">' +
        '  <b>' + escaparHtml(s.pacientes ? s.pacientes.nome : '?') + '</b>' +
        '  <small>' + escaparHtml(s.profissional ? s.profissional.nome.split(' ')[0] : '-') +
        (s.salas ? ' &middot; ' + escaparHtml(s.salas.nome) : '') + '</small>' +
        '  <span class="selo ' + m[0] + '">' + m[1] + '</span>' +
        '</div>' +
        '<div class="ck-acoes">' + acao + '</div>' +
        '</div>';
    }).join('') + '</div>';
  },

  async mudar(id, status) {
    const { error } = await sb.from('sessoes').update({ status: status }).eq('id', id);
    if (error) { alert('Erro: ' + error.message); return; }
    this.carregar();
  },

  confirmarFalta(id) {
    if (confirm('Registrar falta para esta sessao?')) this.mudar(id, 'falta');
  }
};
