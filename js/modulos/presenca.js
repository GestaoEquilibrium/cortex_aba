// ============================================================================
// CORTEX aba - js/modulos/presenca.js
// Sprint 6: lista de presenca semanal gerada automaticamente da grade fixa,
// organizada por dia e turno, no formato do Formulario 05 (pronta a imprimir):
// paciente, horarios, sessoes no turno, aplicador e campo de assinatura.
// Patch 31: folhas no padrao dos documentos Equilibrium (doc-eq).
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

    const hoje = hojeLocal();

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
    this.grade = await ESCOPO.pacs(data || [], 'paciente_id');
    this.gerar();
  },

  segundaDaSemana(dataStr) {
    const d = new Date(dataStr + 'T12:00:00');
    const dow = d.getDay(); // 0=Dom
    const delta = dow === 0 ? 1 : 1 - dow;
    d.setDate(d.getDate() + delta);
    return d;
  },

  // Patch 31: lista no padrao dos documentos Equilibrium (timbre, filete, quadro de dados,
  // tabela azul, rodape) — uma folha A4 por dia e turno, com horarios e selo de sessoes.
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

    const fim = new Date(segunda); fim.setDate(segunda.getDate() + 4);
    const fmtCurta = d => d.toLocaleDateString('pt-BR').slice(0, 5);
    const semana = fmtCurta(segunda) + ' a ' + fim.toLocaleDateString('pt-BR');
    const geradoEm = new Date().toLocaleDateString('pt-BR');

    // monta as folhas (dia x turno) primeiro para saber o total
    const folhas = [];
    for (let d = 1; d <= 5; d++) {
      const dia = new Date(segunda);
      dia.setDate(segunda.getDate() + (d - 1));
      const dataFmt = dia.toLocaleDateString('pt-BR');
      // so horarios com crianca: reservas da grade (rotulo sem paciente) ficam fora da lista
      const doDia = this.grade.filter(h => h.dia_semana === d && h.paciente_id);
      if (doDia.length === 0) continue;
      const turnos = [['Manha', 'Manh&atilde;', 'deq-teal', doDia.filter(h => h.hora_inicio < '13:00')],
                      ['Tarde', 'Tarde', 'deq-amarelo', doDia.filter(h => h.hora_inicio >= '13:00')]];
      for (const [turno, turnoHtml, cor, itens] of turnos) {
        if (itens.length === 0) continue;
        // agrupa por paciente: horarios, n sessoes no turno e aplicadores
        const porPaciente = {};
        itens.forEach(h => {
          const k = h.paciente_id;
          if (!porPaciente[k]) porPaciente[k] = { nome: h.pacientes ? h.pacientes.nome : '?', horas: [], aplicadores: [] };
          porPaciente[k].horas.push(String(h.hora_inicio).slice(0, 5));
          if (h.profissional && !porPaciente[k].aplicadores.includes(h.profissional.nome)) porPaciente[k].aplicadores.push(h.profissional.nome);
        });
        const lista = Object.values(porPaciente).sort((a, b) => a.nome.localeCompare(b.nome));
        folhas.push({ d, dataFmt, turno, turnoHtml, cor, lista });
      }
    }

    if (!folhas.length) {
      alvo.innerHTML = '<div class="cartao"><div class="vazio">' +
        '<div class="simbolo-vazio">&#10003;</div>' +
        '<strong>Sem atendimentos nesta semana</strong>' +
        'A grade nao tem horarios de segunda a sexta.' +
        '</div></div>';
      return;
    }

    const nomeCurto = n => n.split(' ').slice(0, 2).join(' ');
    const folha = (f, i) =>
      '<div class="lp-folha"><div class="doc-eq lp-doc">' +
      '<div class="deq-cab">' +
      '  <img src="icones/equilibrium.png" alt="Equilibrium">' +
      '  <div class="deq-cab-t"><h1>LISTA DE PRESEN&Ccedil;A</h1>' +
      '  <p>Equilibrium Terapia Infantil &middot; Psicoterapia ABA &middot; Formul&aacute;rio 05 &middot; turno da ' + (f.turno === 'Manha' ? 'manh&atilde;' : 'tarde') + '</p></div>' +
      '  <span class="deq-pilula">' + this.DIAS[f.d].toUpperCase() + ' &middot; ' + f.dataFmt + '</span>' +
      '</div>' +
      '<div class="deq-caixa deq-dados" style="grid-template-columns:1fr 1fr 1fr 1.4fr; margin-top:8px">' +
      '  <div><small>Data</small><b>' + f.dataFmt + '</b></div>' +
      '  <div><small>Turno</small><b>' + f.turnoHtml + '</b></div>' +
      '  <div><small>Crian&ccedil;as</small><b>' + f.lista.length + '</b></div>' +
      '  <div style="border-right:none"><small>Semana</small><b>' + semana + '</b></div>' +
      '</div>' +
      '<h2><span class="ponto ' + f.cor + '"></span>Presen&ccedil;as do turno <small>&middot; assinatura do respons&aacute;vel por crian&ccedil;a</small></h2>' +
      '<div class="deq-caixa lp-tab" style="margin-top:4px"><table class="deq-lista"><thead><tr>' +
      '<th class="c">#</th><th>Paciente</th><th>Hor&aacute;rios</th><th class="c">Sess&otilde;es</th><th>Aplicador(a)</th><th>Assinatura do respons&aacute;vel</th>' +
      '</tr></thead><tbody>' +
      f.lista.map((p, n) =>
        '<tr><td class="n c">' + String(n + 1).padStart(2, '0') + '</td>' +
        '<td class="pac">' + escaparHtml(p.nome) + '</td>' +
        '<td class="hor">' + p.horas.join(' &middot; ') + '</td>' +
        '<td class="sess c"><b' + (p.horas.length > 1 ? ' class="dupla"' : '') + '>' + p.horas.length + '</b></td>' +
        '<td>' + escaparHtml(p.aplicadores.map(nomeCurto).join(' / ')) + '</td>' +
        '<td class="ass"><span></span></td></tr>').join('') +
      '</tbody></table></div>' +
      '<div class="deq-legenda"><span><i style="background:#EEF5FB; border:1px solid #CFE0F0"></i>1 sess&atilde;o no turno</span>' +
      '<span><i style="background:var(--eq-amarelo)"></i>2 sess&otilde;es (hor&aacute;rio duplo)</span>' +
      '<span>O respons&aacute;vel assina na entrega da crian&ccedil;a.</span></div>' +
      '<div class="deq-conf"><div class="deq-assinatura">Recep&ccedil;&atilde;o &middot; confer&ecirc;ncia do turno</div><div class="deq-assinatura">Coordena&ccedil;&atilde;o</div></div>' +
      '<div class="deq-rodape">' +
      '  <span>Equilibrium Terapia Infantil &middot; Uberl&acirc;ndia/MG</span>' +
      '  <span class="pontos"><i style="background:var(--eq-teal)"></i><i style="background:var(--eq-amarelo)"></i><i style="background:var(--eq-rosa)"></i><i style="background:var(--eq-azul)"></i></span>' +
      '  <span>Gerado pelo CORTEX aba &middot; ' + geradoEm + ' &middot; folha ' + (i + 1) + ' de ' + folhas.length + '</span>' +
      '</div>' +
      '</div></div>';

    const html = '<p class="sub nao-imprime" style="margin-bottom:12px">Semana de ' +
      segunda.toLocaleDateString('pt-BR') + ' a ' + fim.toLocaleDateString('pt-BR') + ' &middot; ' + folhas.length + ' folha(s): uma por dia e turno. Imprimir sai tudo de uma vez.</p>' +
      folhas.map(folha).join('');

    alvo.innerHTML = html;
  }
};
