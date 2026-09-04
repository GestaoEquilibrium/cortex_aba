// ============================================================================
// CORTEX aba - js/modulos/painel.js  (v2 - redesenho)
// Painel da direcao no Inicio: faixa de indicadores compactos, jornada
// clinica, semana em colunas e produtividade por profissional.
// ============================================================================

window.MODULOS = window.MODULOS || {};

window.MODULOS.painel = {

  ETAPAS: [
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

      const seg = new Date(hoje);
      seg.setDate(hoje.getDate() - ((hoje.getDay() + 6) % 7));
      const dSeg = seg.toISOString().slice(0, 10);
      const sab = new Date(seg); sab.setDate(seg.getDate() + 5);
      const dSab = sab.toISOString().slice(0, 10);

      const [rMes, rSemana, rPacs] = await Promise.all([
        sb.from('sessoes')
          .select('data, status, profissional:profiles!sessoes_aplicador_id_fkey(id, nome)')
          .gte('data', inicioMes).lte('data', dHoje).limit(3000),
        sb.from('sessoes')
          .select('data, status')
          .gte('data', dSeg).lte('data', dSab).limit(1000),
        sb.from('pacientes').select('id, status').neq('status', 'encerrado')
      ]);

      const mes = rMes.data || [];
      const semana = rSemana.data || [];
      const pacs = rPacs.data || [];

      const ids = pacs.map(p => p.id);
      let funil = { total: ids.length, anamnese: 0, avaliacao: 0, plano: 0, pei: 0, intervencao: 0 };
      if (ids.length) {
        const [an, av, pl, pei, prog] = await Promise.all([
          sb.from('anamneses').select('paciente_id').in('paciente_id', ids).eq('status', 'concluida'),
          sb.from('avaliacoes').select('paciente_id').in('paciente_id', ids).eq('status', 'concluida'),
          sb.from('planos_terapeuticos').select('paciente_id').in('paciente_id', ids).eq('status', 'ativo'),
          sb.from('peis').select('paciente_id').in('paciente_id', ids),
          sb.from('paciente_programas').select('paciente_id').in('paciente_id', ids)
        ]);
        const conta = r => new Set((r.data || []).map(x => x.paciente_id)).size;
        funil.anamnese = conta(an); funil.avaliacao = conta(av); funil.plano = conta(pl);
        funil.pei = conta(pei); funil.intervencao = conta(prog);
      }

      alvo.innerHTML = this.html(mes, semana, pacs, funil, dHoje, seg);
    } catch (e) {
      alvo.remove();
    }
  },

  html(mes, semana, pacs, funil, dHoje, seg) {
    const sessoesHoje = mes.filter(s => s.data === dHoje).length;
    const realizadas = mes.filter(s => s.status === 'concluida').length;
    const faltas = mes.filter(s => s.status === 'falta').length;
    const ocorridas = realizadas + faltas;
    const absent = ocorridas ? Math.round(faltas * 100 / ocorridas) : 0;
    const ativos = pacs.filter(p => p.status === 'ativo').length;
    const triagem = pacs.filter(p => p.status === 'triagem').length;

    const corFaltas = absent >= 30 ? 'vermelho' : absent >= 15 ? 'ambar' : 'verde';
    const mesRotulo = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

    const kpi = (v, r, cor, extra) =>
      '<div class="kpi2 kpi2-' + cor + '">' +
      '  <div class="kpi2-valor">' + v + (extra ? '<small>' + extra + '</small>' : '') + '</div>' +
      '  <div class="kpi2-rotulo">' + r + '</div>' +
      '</div>';

    // ── Faixa de indicadores ──
    let html =
      '<div class="painel-kpis">' +
      kpi(sessoesHoje, 'Sessoes hoje', 'azul') +
      kpi(realizadas, 'Realizadas no mes', 'verde') +
      kpi(faltas, 'Faltas no mes', corFaltas, ocorridas ? absent + '%' : '') +
      kpi(ativos, 'Pacientes ativos', 'roxo') +
      kpi(triagem, 'Em triagem', triagem > 0 ? 'ambar' : 'cinza') +
      '</div>';

    // ── Duas colunas ──
    html += '<div class="painel-grid">';

    // Coluna 1: jornada + produtividade
    html += '<div class="cartao painel-bloco2">' +
      '<div class="painel-titulo"><h3>Jornada clinica</h3>' +
      '<span class="selo selo-neutro">' + funil.total + ' em acompanhamento</span></div>';
    const base = funil.total || 1;
    this.ETAPAS.forEach(([id, rotulo]) => {
      const v = funil[id];
      const pct = Math.round(v * 100 / base);
      html += '<div class="funil-linha" title="' + rotulo + ': ' + v + ' de ' + funil.total + ' (' + pct + '%)">' +
        '<span class="funil-rotulo">' + rotulo + '</span>' +
        '<span class="funil-trilho"><span class="funil-barra jor-' + id + ' feita" style="width:' +
          Math.max(pct, v > 0 ? 3 : 0) + '%"></span>' +
        '<span class="funil-pct">' + pct + '%</span></span>' +
        '<span class="funil-valor">' + v + '</span></div>';
    });
    html += '<p class="painel-nota">Pacientes nao encerrados que concluiram cada etapa. Clique nos cartoes da lista de Pacientes para destravar as pendencias.</p>';
    html += '</div>';

    // Coluna 2: semana
    const dias = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
    const porDia = dias.map((_, i) => {
      const d = new Date(seg); d.setDate(seg.getDate() + i);
      const chave = d.toISOString().slice(0, 10);
      const doDia = semana.filter(s => s.data === chave);
      return {
        rotulo: dias[i], hoje: chave === dHoje,
        total: doDia.length,
        faltas: doDia.filter(s => s.status === 'falta').length,
        concluidas: doDia.filter(s => s.status === 'concluida').length
      };
    });
    const maxDia = Math.max(1, ...porDia.map(d => d.total));

    html += '<div class="cartao painel-bloco2">' +
      '<div class="painel-titulo"><h3>Semana atual</h3>' +
      '<span class="selo selo-neutro">' + semana.length + ' sessoes</span></div>' +
      '<div class="sem2-grafico">' +
      porDia.map(d =>
        '<div class="sem2-dia' + (d.hoje ? ' hoje' : '') + '" title="' + d.rotulo + ': ' + d.total +
        ' sessoes, ' + d.concluidas + ' concluidas, ' + d.faltas + ' faltas">' +
        '  <span class="sem2-num">' + (d.total || '&middot;') + '</span>' +
        '  <div class="sem2-trilho">' +
        '    <div class="sem2-barra" style="height:' + Math.round(d.total * 100 / maxDia) + '%">' +
        (d.faltas ? '<div class="sem2-falta" style="height:' +
            Math.round(d.faltas * 100 / Math.max(d.total, 1)) + '%"></div>' : '') +
        '    </div>' +
        '  </div>' +
        '  <span class="sem2-rotulo">' + d.rotulo + '</span>' +
        '</div>').join('') +
      '</div>' +
      '<p class="painel-nota"><span class="legenda-cor" style="background:#DC2626"></span> faltas &middot; dia de hoje contornado</p>' +
      '</div>';

    // Largura total: produtividade
    const porProf = {};
    mes.filter(s => s.status === 'concluida').forEach(s => {
      if (!s.profissional) {
        porProf['x'] = porProf['x'] || { nome: 'Sem designacao', n: 0 };
        porProf['x'].n++;
        return;
      }
      const k = s.profissional.id;
      porProf[k] = porProf[k] || { nome: s.profissional.nome, n: 0 };
      porProf[k].n++;
    });
    const ranking = Object.values(porProf).sort((a, b) => b.n - a.n).slice(0, 8);

    if (ranking.length) {
      const maxProf = ranking[0].n;
      html += '<div class="cartao painel-bloco2 painel-largo">' +
        '<div class="painel-titulo"><h3>Sessoes concluidas por profissional</h3>' +
        '<span class="selo selo-neutro">' + mesRotulo + '</span></div>';
      ranking.forEach((r, i) => {
        const nomeCurto = r.nome.split(' ').slice(0, 2).join(' ');
        html += '<div class="funil-linha" title="' + escaparHtml(r.nome) + ': ' + r.n + ' sessao(oes)">' +
          '<span class="funil-rotulo">' + escaparHtml(nomeCurto) + '</span>' +
          '<span class="funil-trilho"><span class="funil-barra prof-barra' + (i === 0 ? ' lider' : '') +
          '" style="width:' + Math.round(r.n * 100 / maxProf) + '%"></span></span>' +
          '<span class="funil-valor">' + r.n + '</span></div>';
      });
      html += '</div>';
    }

    html += '</div>';
    return html;
  }
};
