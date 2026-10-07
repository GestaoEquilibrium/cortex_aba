// ============================================================================
// CORTEX aba - js/modulos/presenca.js
// Sprint 6: lista de presenca semanal gerada automaticamente da grade fixa,
// organizada por dia e turno, no formato do Formulario 05 (pronta a imprimir).
// Patch 31: folhas no padrao dos documentos Equilibrium (doc-eq).
// Patch 33: no estilo da folha de papel da recepcao — titulo com o turno e o horario,
// colunas Presenca e Falta para marcar com X, criancas na ordem das aplicadoras e
// linhas em branco ate o fim da folha para os encaixes do dia.
// ============================================================================

window.MODULOS = window.MODULOS || {};

window.MODULOS.presenca = {

  DIAS: ['', 'SEGUNDA-FEIRA', 'TER&Ccedil;A-FEIRA', 'QUARTA-FEIRA', 'QUINTA-FEIRA', 'SEXTA-FEIRA'],
  // horario de cada turno no titulo da folha (corte dos turnos as 13:00)
  TURNOS: [
    { id: 'manha', rotulo: 'MANH&Atilde;', faixa: '7H &Agrave;S 13H', cor: 'deq-teal', de: '00:00', ate: '13:00' },
    { id: 'tarde', rotulo: 'TARDE', faixa: '13H &Agrave;S 19H', cor: 'deq-amarelo', de: '13:00', ate: '24:00' }
  ],
  LINHAS_FOLHA: 21,    // criancas + linhas em branco numa folha A4
  BRANCAS_MIN: 4,      // linhas em branco garantidas mesmo com a folha cheia

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
      '  <p class="sub">Gerada automaticamente da grade fixa, uma folha por dia e turno (Formulario 05).</p></div>' +
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

  // uma crianca por linha: horarios do turno, quantas sessoes e com quem.
  // Ordem da folha: pela aplicadora da primeira sessao da crianca no turno, depois pelo horario.
  montarLinhas(itens) {
    const porPaciente = {};
    itens.forEach(h => {
      const k = h.paciente_id;
      const apl = h.profissional ? h.profissional.nome : '';
      if (!porPaciente[k]) porPaciente[k] = { nome: h.pacientes ? h.pacientes.nome : '?', horas: [], aplicadores: [], principal: apl, primeira: String(h.hora_inicio).slice(0, 5) };
      const p = porPaciente[k];
      const hr = String(h.hora_inicio).slice(0, 5);
      p.horas.push(hr);
      if (hr < p.primeira) { p.primeira = hr; p.principal = apl; }
      if (apl && !p.aplicadores.includes(apl)) p.aplicadores.push(apl);
    });
    return Object.values(porPaciente).map(p => {
      p.horas.sort();
      // a aplicadora da primeira sessao vem primeiro
      p.aplicadores.sort((a, b) => (a === p.principal ? -1 : b === p.principal ? 1 : a.localeCompare(b)));
      return p;
    }).sort((a, b) => (a.principal || '~').localeCompare(b.principal || '~') || a.primeira.localeCompare(b.primeira) || a.nome.localeCompare(b.nome));
  },

  async gerar() {
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
    const geradoEm = new Date().toLocaleDateString('pt-BR');
    // patch 36: dia marcado como feriado na agenda nao tem folha
    const iso = x => x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0');
    const feriados = MODULOS.agenda && MODULOS.agenda.carregarFeriados ? await MODULOS.agenda.carregarFeriados(iso(segunda), iso(fim)) : {};
    const pulados = [];

    // monta as folhas (dia x turno) primeiro para saber o total
    const folhas = [];
    for (let d = 1; d <= 5; d++) {
      const dia = new Date(segunda);
      dia.setDate(segunda.getDate() + (d - 1));
      const dataFmt = dia.toLocaleDateString('pt-BR');
      // so horarios com crianca: reservas da grade (rotulo sem paciente) ficam fora da lista
      const doDia = this.grade.filter(h => h.dia_semana === d && h.paciente_id);
      if (doDia.length === 0) continue;
      if (feriados[iso(dia)]) { pulados.push(dataFmt.slice(0, 5) + ' (' + feriados[iso(dia)] + ')'); continue; }
      for (const t of this.TURNOS) {
        const itens = doDia.filter(h => String(h.hora_inicio).slice(0, 5) >= t.de && String(h.hora_inicio).slice(0, 5) < t.ate);
        if (itens.length === 0) continue;
        folhas.push({ d, dataFmt, t, lista: this.montarLinhas(itens) });
      }
    }

    if (!folhas.length) {
      alvo.innerHTML = '<div class="cartao"><div class="vazio">' +
        '<div class="simbolo-vazio">&#10003;</div>' +
        '<strong>Sem atendimentos nesta semana</strong>' +
        (pulados.length ? 'Feriado: ' + escaparHtml(pulados.join(', ')) + '.' : 'A grade nao tem horarios de segunda a sexta.') +
        '</div></div>';
      return;
    }

    const html = '<p class="sub nao-imprime" style="margin-bottom:12px">Semana de ' +
      segunda.toLocaleDateString('pt-BR') + ' a ' + fim.toLocaleDateString('pt-BR') + ' &middot; ' + folhas.length + ' folha(s): uma por dia e turno. Imprimir sai tudo de uma vez.' +
      (pulados.length ? ' <span class="selo selo-feriado">Feriado sem folha: ' + escaparHtml(pulados.join(', ')) + '</span>' : '') + '</p>' +
      folhas.map((f, i) => this.folha(f, i, folhas.length, geradoEm)).join('');

    alvo.innerHTML = html;
  },

  nomeCurto(n) { return String(n || '').split(' ').slice(0, 2).join(' '); },
  caixa() { return '<span class="lp-x" aria-hidden="true"></span>'; },

  folha(f, i, total, geradoEm) {
    const brancas = Math.max(this.BRANCAS_MIN, this.LINHAS_FOLHA - f.lista.length);
    const cab =
      '<div class="deq-cab">' +
      '  <img src="icones/equilibrium.png" alt="Equilibrium">' +
      '  <div class="deq-cab-t"><h1>LISTA DE PRESEN&Ccedil;A &ndash; TURNO ' + f.t.rotulo + ' <span class="lp-faixa">(' + f.t.faixa + ')</span></h1>' +
      '  <p>Equilibrium Terapia Infantil &middot; Psicoterapia ABA &middot; Formul&aacute;rio 05</p></div>' +
      '  <span class="deq-pilula">' + this.DIAS[f.d] + ': ' + f.dataFmt + '</span>' +
      '</div>';
    const rodape =
      '<div class="lp-totais">' +
      '  <span><small>Crian&ccedil;as na grade</small><b>' + f.lista.length + '</b></span>' +
      '  <span><small>Presen&ccedil;as</small><i></i></span>' +
      '  <span><small>Faltas</small><i></i></span>' +
      '  <span><small>Encaixes</small><i></i></span>' +
      '</div>' +
      '<div class="deq-conf"><div class="deq-assinatura">Recep&ccedil;&atilde;o &middot; confer&ecirc;ncia do turno</div><div class="deq-assinatura">Coordena&ccedil;&atilde;o</div></div>' +
      '<div class="deq-rodape">' +
      '  <span>Equilibrium Terapia Infantil &middot; Uberl&acirc;ndia/MG</span>' +
      '  <span class="pontos"><i style="background:var(--eq-teal)"></i><i style="background:var(--eq-amarelo)"></i><i style="background:var(--eq-rosa)"></i><i style="background:var(--eq-azul)"></i></span>' +
      '  <span>Gerado pelo CORTEX aba &middot; ' + geradoEm + ' &middot; folha ' + (i + 1) + ' de ' + total + '</span>' +
      '</div>';
    return '<div class="lp-folha"><div class="doc-eq lp-doc">' + cab + this.tabela(f, brancas) + rodape + '</div></div>';
  },

  // igual a folha de papel (opcao A escolhida por Wess, 07/10/2026): uma tabela so, aplicadora em cada linha
  tabela(f, brancas) {
    const sess = p => '<b' + (p.horas.length > 1 ? ' class="dupla"' : '') + '>' + p.horas.length + '</b>';
    let ant = null;
    const linhas = f.lista.map(p => {
      const novo = p.principal !== ant; ant = p.principal;
      return '<tr' + (novo ? ' class="lp-novo"' : '') + '>' +
        '<td class="pac">' + escaparHtml(p.nome) + '<small>' + p.horas.join(' &middot; ') + '</small></td>' +
        '<td class="sess c">' + sess(p) + '</td>' +
        '<td class="apl">' + escaparHtml(p.aplicadores.length > 1 ? p.aplicadores.map(x => x.split(' ')[0]).join(' / ') : this.nomeCurto(p.aplicadores[0] || '')) + '</td>' +
        '<td class="c mk">' + this.caixa() + '</td><td class="c mk">' + this.caixa() + '</td>' +
        '<td class="ass"></td></tr>';
    }).join('');
    // linhas para encaixe: sem quadradinho (so aparecem onde ja tem crianca)
    const vazias = Array.from({ length: brancas }, () => '<tr class="lp-branca"><td class="pac"></td><td></td><td></td><td class="mk"></td><td class="mk"></td><td class="ass"></td></tr>').join('');
    return '<div class="deq-caixa lp-tab"><table class="deq-lista lp-lista"><colgroup><col style="width:34%"><col style="width:9%"><col style="width:17%"><col style="width:8.5%"><col style="width:8.5%"><col></colgroup><thead><tr>' +
      '<th>Paciente</th><th class="c">N&ordm; sess&atilde;o/dia</th><th>Aplicador(a)</th><th class="c">Presen&ccedil;a</th><th class="c">Falta</th><th>Ass. respons&aacute;vel</th>' +
      '</tr></thead><tbody>' + linhas + vazias + '</tbody></table></div>' +
      '<div class="deq-legenda"><span><i style="background:var(--eq-amarelo)"></i>2 sess&otilde;es no turno (hor&aacute;rio duplo)</span><span>Marque X em Presen&ccedil;a ou Falta. Linhas em branco: encaixes do dia.</span></div>';
  }
};
