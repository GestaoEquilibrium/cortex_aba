// ============================================================================
// CORTEX aba - js/modulos/painel.js
// Painel da direcao: indicadores do mes, funil da jornada clinica, sessoes
// da semana e produtividade por profissional. Renderizado dentro do Inicio
// para quem tem a chave 'painel' na matriz de permissoes.
// ============================================================================

window.MODULOS = window.MODULOS || {};

window.MODULOS.painel = {

  ETAPAS: [
    ['admissao',    'Admissao'],
    ['anamnese',    'Anamnese'],
    ['avaliacao',   'Avaliacao'],
    ['plano',       'Plano'],
    ['pei',         'PEI'],
    ['intervencao', 'Intervencao']
  ],

  async carregar(alvoId) {
    const alvo = document.getElementById(alvoId);
    if (!alvo) return;

    try {
      const hoje = new Date();
      const dHoje = hoje.toISOString().slice(0, 10);
      const inicioMes = dHoje.slice(0, 8) + '01';

      // Segunda-feira da semana atual
      const seg = new Date(hoje);
      seg.setDate(hoje.getDate() - ((hoje.getDay() + 6) % 7));
      const dSeg = seg.toISOString().slice(0, 10);
      const sab = new Date(seg); sab.setDate(seg.getDate() + 5);
      const dSab = sab.toISOString().slice(0, 10);

      const [rMes, rSemana, rPacs] = await Promise.all([
        sb.from('sessoes')
          .select('data, status, profissional:profiles!sessoes_aplicador_id_fkey(nome)')
          .gte('data', inicioMes).lte('data', dHoje).limit(3000),
        sb.from('sessoes')
          .select('data, status')
          .gte('data', dSeg).lte('data', dSab).limit(1000),
        sb.from('pacientes').select('id, status').neq('status', 'encerrado')
      ]);

      const mes = rMes.data || [];
      const semana = rSemana.data || [];
      const pacs = rPacs.data || [];

      // Jornada em lote (mesma logica dos cartoes de pacientes)
      const ids = pacs.map(p => p.id);
      let funil = { admissao: ids.length, anamnese: 0, plano: 0, avaliacao: 0, pei: 0, intervencao: 0 };
      if (ids.length) {
        const [an, pl, av, pei, prog] = await Promise.all([
          sb.from('anamneses').select('paciente_id').in('paciente_id', ids).eq('status', 'concluida'),
          sb.from('planos_terapeuticos').select('paciente_id').in('paciente_id', ids).eq('status', 'ativo'),
          sb.from('avaliacoes').select('paciente_id').in('paciente_id', ids).eq('status', 'concluida'),
          sb.from('peis').select('paciente_id').in('paciente_id', ids),
          sb.from('paciente_programas').select('paciente_id').in('paciente_id', ids)
        ]);
        const conta = r => new Set((r.data || []).map(x => x.paciente_id)).size;
        funil.anamnese = conta(an); funil.plano = conta(pl); funil.avaliacao = conta(av);
        funil.pei = conta(pei); funil.intervencao = conta(prog);
      }

      alvo.innerHTML = this.html(mes, semana, pacs, funil, dHoje, seg);
    } catch (e) {
      alvo.remove();
    }
  },

  html(mes, semana, pacs, funil, dHoje, seg) {
    // ── KPIs do mes ──
    const sessoesHoje = mes.filter(s => s.data === dHoje).length;
    const realizadas = mes.filter(s => s.status === 'concluida').length;
    const faltas = mes.filter(s => s.status === 'falta').length;
    const ocorridas = realizadas + faltas;
    const absenteismo = ocorridas ? Math.round(faltas * 100 / ocorridas) : 0;
    const ativos = pacs.filter(p => p.status === 'ativo').length;

    const kpi = (v, r, cor) =>
      '<div class="kpi kpi-' + cor + '"><div class="kpi-valor">' + v + '</div>' +
      '<div class="kpi-rotulo">' + r + '</div></div>';

    let html =
      '<div class="cartao painel-direcao">' +
      '<h3>Painel da direcao <span class="selo selo-neutro">' +
      new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) + '</span></h3>' +

      '<div class="kpis" style="margin-bottom:14px">' +
      kpi(sessoesHoje, 'Sessoes hoje', 'azul') +
      kpi(realizadas, 'Realizadas no mes', 'verde') +
      kpi(faltas, 'Faltas no mes' + (ocorridas ? ' (' + absenteismo + '%)' : ''),
          absenteismo >= 30 ? 'vermelho' : absenteismo >= 15 ? 'ambar' : 'verde') +
      kpi(ativos, 'Pacientes ativos', 'roxo') +
      '</div>';

    // ── Funil da jornada ──
    const total = funil.admissao || 1;
    html += '<div class="painel-bloco"><h4>Jornada clinica <small>' + funil.admissao +
      ' paciente(s) em acompanhamento</small></h4>';
    this.ETAPAS.forEach(([id, rotulo]) => {
      const v = funil[id];
      const pct = Math.round(v * 100 / total);
      html += '<div class="funil-linha" title="' + rotulo + ': ' + v + ' de ' + funil.admissao + '">' +
        '<span class="funil-rotulo">' + rotulo + '</span>' +
        '<span class="funil-trilho"><span class="funil-barra jor-' + id + ' feita" style="width:' +
        Math.max(pct, v > 0 ? 4 : 0) + '%"></span></span>' +
        '<span class="funil-valor">' + v + '</span></div>';
    });
    html += '</div>';

    // ── Semana em colunas ──
    const dias = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
    const porDia = dias.map((_, i) => {
      const d = new Date(seg); d.setDate(seg.getDate() + i);
      const chave = d.toISOString().slice(0, 10);
      const doDia = semana.filter(s => s.data === chave);
      return {
        rotulo: dias[i],
        hoje: chave === dHoje,
        total: doDia.length,
        concluidas: doDia.filter(s => s.status === 'concluida').length,
        faltas: doDia.filter(s => s.status === 'falta').length
      };
    });
    const maxDia = Math.max(1, ...porDia.map(d => d.total));

    html += '<div class="painel-bloco"><h4>Semana atual <small>' +
      semana.length + ' sessao(oes) agendada(s)</small></h4>' +
      '<div class="semana-grafico">' +
      porDia.map(d =>
        '<div class="semana-dia' + (d.hoje ? ' hoje' : '') + '" title="' + d.rotulo + ': ' +
        d.total + ' sessao(oes), ' + d.concluidas + ' concluida(s), ' + d.faltas + ' falta(s)">' +
        '<div class="semana-coluna">' +
        '<div class="semana-preench" style="height:' + Math.round(d.total * 100 / maxDia) + '%">' +
        (d.faltas ? '<div class="semana-falta" style="height:' +
          Math.round(d.faltas * 100 / Math.max(d.total, 1)) + '%"></div>' : '') +
        '</div></div>' +
        '<span class="semana-num">' + (d.total || '') + '</span>' +
        '<span class="semana-rotulo">' + d.rotulo + '</span>' +
        '</div>').join('') +
      '</div></div>';

    // ── Produtividade por profissional (mes) ──
    const porProf = {};
    mes.filter(s => s.status === 'concluida').forEach(s => {
      const nome = s.profissional ? s.profissional.nome.split(' ')[0] : 'Sem designacao';
      porProf[nome] = (porProf[nome] || 0) + 1;
    });
    const ranking = Object.entries(porProf).sort((a, b) => b[1] - a[1]).slice(0, 8);

    if (ranking.length) {
      const maxProf = ranking[0][1];
      html += '<div class="painel-bloco"><h4>Sessoes concluidas por profissional <small>no mes</small></h4>';
      ranking.forEach(([nome, v]) => {
        html += '<div class="funil-linha">' +
          '<span class="funil-rotulo">' + escaparHtml(nome) + '</span>' +
          '<span class="funil-trilho"><span class="funil-barra prof-barra" style="width:' +
          Math.round(v * 100 / maxProf) + '%"></span></span>' +
          '<span class="funil-valor">' + v + '</span></div>';
      });
      html += '</div>';
    }

    return html + '</div>';
  }
};
