// ============================================================================
// CORTEX aba - js/modulos/presenca.js
// Sprint 6: lista de presenca semanal gerada automaticamente da grade fixa,
// organizada por dia e turno, no formato do Formulario 05 (pronta a imprimir):
// paciente, numero de sessoes no dia, aplicador e campo de assinatura.
// ============================================================================

window.MODULOS = window.MODULOS || {};

window.MODULOS.presenca = {

  DIAS: ['', 'Segunda-feira', 'Terca-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira'],

  el: null,
  sessao: null,
  grade: [],

  async render(el, sessao) {
    this.el = el;
    this.sessao = sessao;

    const hoje = new Date().toISOString().slice(0, 10);

    el.innerHTML =
      '<div class="pagina-cabecalho nao-imprime">' +
      '  <div><h2>Lista de Presenca</h2>' +
      '  <p class="sub">Gerada automaticamente da grade fixa, por dia e turno (Formulario 05).</p></div>' +
      '  <div style="display:flex; gap:8px; align-items:center">' +
      '    <input type="date" id="lp-data" value="' + hoje + '" onchange="MODULOS.presenca.gerar()" ' +
      '      style="padding:8px 12px; border:1.5px solid var(--line); border-radius:12px; font:inherit; font-size:13px; background:var(--surface); color:var(--ink)">' +
      '    <button class="btn btn-primario" onclick="window.print()">&#128424; Imprimir</button>' +
      '  </div>' +
      '</div>' +
      '<div id="lp-conteudo"><div class="cartao"><p class="sub">Carregando...</p></div></div>';

    const { data, error } = await sb
      .from('grade_horarios')
      .select('paciente_id, dia_semana, hora_inicio, pacientes(nome), profissional:profiles!grade_horarios_aplicador_id_fkey(nome)')
      .eq('ativo', true)
      .order('hora_inicio');

    if (error) {
      document.getElementById('lp-conteudo').innerHTML =
        '<div class="cartao"><div class="mensagem-erro visivel">' + escaparHtml(error.message) + '</div></div>';
      return;
    }
    this.grade = data || [];
    this.gerar();
  },

  segundaDaSemana(dataStr) {
    const d = new Date(dataStr + 'T12:00:00');
    const dow = d.getDay(); // 0=Dom
    const delta = dow === 0 ? 1 : 1 - dow;
    d.setDate(d.getDate() + delta);
    return d;
  },

  gerar() {
    const base = document.getElementById('lp-data').value;
    const segunda = this.segundaDaSemana(base);
    const alvo = document.getElementById('lp-conteudo');

    if (this.grade.length === 0) {
      alvo.innerHTML = '<div class="cartao"><div class="vazio">' +
        '<div class="simbolo-vazio">&#10003;</div>' +
        '<strong>Grade vazia</strong>Cadastre horarios na Agenda para gerar a lista.' +
        '</div></div>';
      return;
    }

    let html = '';
    for (let d = 1; d <= 5; d++) {
      const dia = new Date(segunda);
      dia.setDate(segunda.getDate() + (d - 1));
      const dataFmt = dia.toLocaleDateString('pt-BR');

      const doDia = this.grade.filter(h => h.dia_semana === d);
      if (doDia.length === 0) continue;

      const turnos = {
        'Manha': doDia.filter(h => h.hora_inicio < '13:00'),
        'Tarde': doDia.filter(h => h.hora_inicio >= '13:00')
      };

      for (const [turno, itens] of Object.entries(turnos)) {
        if (itens.length === 0) continue;

        // Agrupa por paciente: n sessoes no dia/turno + aplicadores
        const porPaciente = {};
        itens.forEach(h => {
          const chave = h.paciente_id;
          if (!porPaciente[chave]) {
            porPaciente[chave] = { nome: h.pacientes ? h.pacientes.nome : '?', n: 0, aplicadores: new Set() };
          }
          porPaciente[chave].n++;
          if (h.profissional) porPaciente[chave].aplicadores.add(h.profissional.nome);
        });

        const linhas = Object.values(porPaciente)
          .sort((a, b) => a.nome.localeCompare(b.nome))
          .map(p =>
            '<tr>' +
            '<td>' + escaparHtml(p.nome) + '</td>' +
            '<td class="centro">' + p.n + '</td>' +
            '<td>' + escaparHtml(Array.from(p.aplicadores).join(' / ')) + '</td>' +
            '<td class="assinatura"></td>' +
            '</tr>').join('');

        html +=
          '<div class="cartao folha-presenca">' +
          '  <div class="folha-titulo">' +
          '    <div><b>LISTA DE PRESENCA &middot; TURNO ' + turno.toUpperCase() + '</b>' +
          '    <small>' + this.DIAS[d] + ' &middot; ' + dataFmt + '</small></div>' +
          '    <span class="folha-marca">CORTEX aba &middot; Equilibrium Terapia Infantil</span>' +
          '  </div>' +
          '  <table class="tabela-presenca">' +
          '    <thead><tr>' +
          '      <th>Paciente</th><th class="centro">Sessoes/dia</th>' +
          '      <th>Aplicador</th><th>Assinatura do responsavel</th>' +
          '    </tr></thead>' +
          '    <tbody>' + linhas + '</tbody>' +
          '  </table>' +
          '</div>';
      }
    }

    if (!html) {
      html = '<div class="cartao"><div class="vazio">' +
        '<div class="simbolo-vazio">&#10003;</div>' +
        '<strong>Sem atendimentos nesta semana</strong>' +
        'A grade nao tem horarios de segunda a sexta.' +
        '</div></div>';
    } else {
      const fim = new Date(segunda); fim.setDate(segunda.getDate() + 4);
      html = '<p class="sub nao-imprime" style="margin-bottom:12px">Semana de ' +
        segunda.toLocaleDateString('pt-BR') + ' a ' + fim.toLocaleDateString('pt-BR') + '</p>' + html;
    }

    alvo.innerHTML = html;
  }
};
