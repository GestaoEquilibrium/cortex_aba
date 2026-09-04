// ============================================================================
// CORTEX aba - js/modulos/faltas.js
// Sprint 12: gestao de faltas dos pacientes.
// - Faltas CONSECUTIVAS em destaque (sequencia atual, independente do mes)
// - Painel do mes: sessoes, faltas e % por paciente
// - Alerta automatico a direcao/coordenacao quando a sequencia chega a 2+
//   (uma notificacao por patamar, sem repeticao)
// - Contato rapido com o responsavel via WhatsApp e relatorio imprimivel
// ============================================================================

window.MODULOS = window.MODULOS || {};

window.MODULOS.faltas = {

  el: null,

  async render(el) {
    this.el = el;
    const mesAtual = new Date().toISOString().slice(0, 7);

    el.innerHTML =
      '<div class="pagina-cabecalho nao-imprime">' +
      '  <div><h2>Gestao de Faltas</h2>' +
      '  <p class="sub">Sequencias de faltas consecutivas e panorama do mes.</p></div>' +
      '  <div style="display:flex; gap:8px; align-items:center">' +
      '    <input type="month" id="ft-mes" value="' + mesAtual + '" ' +
      '      onchange="MODULOS.faltas.calcular()" ' +
      '      style="padding:8px 12px; border:1.5px solid var(--line); border-radius:12px; font:inherit; font-size:13px; background:var(--surface); color:var(--ink)">' +
      '    <button class="btn btn-primario" onclick="window.print()">&#128424; Imprimir</button>' +
      '  </div>' +
      '</div>' +
      '<div id="ft-corpo"><div class="cartao"><p class="sub">Calculando...</p></div></div>';

    await this.calcular();
  },

  async calcular() {
    const mes = document.getElementById('ft-mes').value;
    const inicio = mes + '-01';
    const fimD = new Date(mes + '-01T12:00:00');
    fimD.setMonth(fimD.getMonth() + 1); fimD.setDate(0);
    const fim = fimD.toISOString().slice(0, 10);
    const hoje = new Date().toISOString().slice(0, 10);

    // Historico fechado (concluida/falta) para a sequencia atual + dados do mes
    const [{ data: historico }, { data: doMes }, { data: pacs }] = await Promise.all([
      sb.from('sessoes')
        .select('paciente_id, data, hora_inicio, status')
        .in('status', ['concluida', 'falta'])
        .lte('data', hoje)
        .order('data', { ascending: false })
        .order('hora_inicio', { ascending: false })
        .limit(2000),
      sb.from('sessoes')
        .select('paciente_id, status')
        .gte('data', inicio).lte('data', fim)
        .in('status', ['concluida', 'falta', 'cancelada']),
      sb.from('pacientes')
        .select('id, nome, status, responsaveis(nome, telefone, principal)')
        .neq('status', 'encerrado')
    ]);

    const porPaciente = {};
    (pacs || []).forEach(p => {
      const resp = (p.responsaveis || []).sort((a, b) =>
        (b.principal ? 1 : 0) - (a.principal ? 1 : 0)).find(r => r.telefone) || null;
      porPaciente[p.id] = {
        id: p.id, nome: p.nome, resp: resp,
        streak: 0, streakFechada: false,
        mes: { total: 0, faltas: 0, canceladas: 0 }
      };
    });

    // Sequencia atual: percorre do mais recente para tras
    (historico || []).forEach(s => {
      const p = porPaciente[s.paciente_id];
      if (!p || p.streakFechada) return;
      if (s.status === 'falta') p.streak++;
      else p.streakFechada = true;
    });

    (doMes || []).forEach(s => {
      const p = porPaciente[s.paciente_id];
      if (!p) return;
      if (s.status === 'cancelada') { p.mes.canceladas++; return; }
      p.mes.total++;
      if (s.status === 'falta') p.mes.faltas++;
    });

    const lista = Object.values(porPaciente)
      .filter(p => p.streak > 0 || p.mes.total > 0 || p.mes.canceladas > 0);

    const consecutivos = lista.filter(p => p.streak >= 2)
      .sort((a, b) => b.streak - a.streak);

    await this.dispararAlertas(consecutivos);
    this.desenhar(mes, lista, consecutivos);
  },

  async dispararAlertas(consecutivos) {
    if (perm('faltas') !== 'E' || consecutivos.length === 0) return;
    try {
      const ids = consecutivos.map(p => p.id);
      const { data: jaAvisados } = await sb.from('faltas_alertas')
        .select('paciente_id, streak').in('paciente_id', ids);
      const mapa = {};
      (jaAvisados || []).forEach(a => {
        mapa[a.paciente_id] = Math.max(mapa[a.paciente_id] || 0, a.streak);
      });

      const novos = consecutivos.filter(p => p.streak > (mapa[p.id] || 0));
      if (novos.length === 0) return;

      const notifs = [];
      novos.forEach(p => {
        const corpo = p.nome + ' acumulou ' + p.streak +
          ' faltas consecutivas. Avaliar contato com a familia e continuidade.';
        notifs.push({ destinatario_perfil: 'direcao', titulo: 'Faltas consecutivas: ' + p.nome, corpo });
        notifs.push({ destinatario_perfil: 'coordenador', titulo: 'Faltas consecutivas: ' + p.nome, corpo });
      });
      await sb.from('notificacoes').insert(notifs);
      await sb.from('faltas_alertas').insert(
        novos.map(p => ({ paciente_id: p.id, streak: p.streak })));
    } catch (e) { /* alerta nunca trava o painel */ }
  },

  desenhar(mes, lista, consecutivos) {
    const alvo = document.getElementById('ft-corpo');
    if (!alvo) return;

    const mesRotulo = (() => {
      const d = new Date(mes + '-15T12:00:00');
      const r = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      return r.charAt(0).toUpperCase() + r.slice(1);
    })();

    let html = '';

    // ── Consecutivas (destaque) ──
    html += '<div class="cartao' + (consecutivos.length ? '" style="border-color:var(--st-bad)' : '') + '">' +
      '<h3>Faltas consecutivas' +
      (consecutivos.length ? ' <span class="selo selo-bad">' + consecutivos.length + ' paciente(s)</span>' : '') +
      '</h3>' +
      (consecutivos.length === 0
        ? '<p class="sub">Nenhum paciente com 2 ou mais faltas seguidas. &#127881;</p>'
        : consecutivos.map(p => {
            const whats = p.resp && p.resp.telefone
              ? '<button class="btn-chip nao-imprime" onclick="MODULOS.faltas.abrirWhats(\'' + p.id + '\')">&#128172; WhatsApp</button>'
              : '';
            return '<div class="linha-doc"><div><b>' + escaparHtml(p.nome) + '</b>' +
              '<small>' + (p.resp ? escaparHtml(p.resp.nome) +
                (p.resp.telefone ? ' &middot; ' + escaparHtml(p.resp.telefone) : '') : 'Sem responsavel com telefone') +
              '</small></div>' +
              '<div class="pac-selos">' +
              '<span class="selo selo-bad">' + p.streak + ' seguidas</span>' +
              whats +
              '<button class="btn-chip nao-imprime" onclick="abrirModulo(\'pacientes\'); ' +
              'setTimeout(function(){ MODULOS.pacientes.telaDetalhe(\'' + p.id + '\'); }, 50)">Prontuario</button>' +
              '</div></div>';
          }).join('')) +
      '</div>';

    // ── Panorama do mes ──
    const comMes = lista.filter(p => p.mes.total > 0 || p.mes.canceladas > 0)
      .sort((a, b) => b.mes.faltas - a.mes.faltas || a.nome.localeCompare(b.nome));

    html += '<div class="cartao folha-presenca">' +
      '<div class="folha-titulo">' +
      '  <div><b>PANORAMA DE FALTAS &middot; ' + mesRotulo.toUpperCase() + '</b>' +
      '  <small>Sessoes fechadas do mes (concluidas + faltas); canceladas a parte.</small></div>' +
      '  <span class="folha-marca">CORTEX aba &middot; Equilibrium Terapia Infantil</span>' +
      '</div>' +
      (comMes.length === 0
        ? '<p class="sub">Sem sessoes fechadas neste mes.</p>'
        : '<table class="tabela-presenca"><thead><tr>' +
          '<th>Paciente</th><th class="centro">Sessoes</th><th class="centro">Faltas</th>' +
          '<th class="centro">% Faltas</th><th class="centro">Canceladas</th>' +
          '<th class="centro">Seq. atual</th></tr></thead><tbody>' +
          comMes.map(p => {
            const pct = p.mes.total ? Math.round(p.mes.faltas * 100 / p.mes.total) : 0;
            const corPct = pct >= 30 ? 'var(--st-bad)' : pct >= 15 ? 'var(--st-warn)' : 'inherit';
            return '<tr><td>' + escaparHtml(p.nome) + '</td>' +
              '<td class="centro">' + p.mes.total + '</td>' +
              '<td class="centro">' + p.mes.faltas + '</td>' +
              '<td class="centro"><b style="color:' + corPct + '">' + pct + '%</b></td>' +
              '<td class="centro">' + p.mes.canceladas + '</td>' +
              '<td class="centro">' + (p.streak >= 2
                ? '<span class="selo selo-bad">' + p.streak + '</span>'
                : p.streak === 1 ? '1' : '&mdash;') + '</td></tr>';
          }).join('') +
          '</tbody></table>') +
      '</div>';

    alvo.innerHTML = html;
    this._lista = lista;
  },

  abrirWhats(pacienteId) {
    const p = (this._lista || []).find(x => x.id === pacienteId);
    if (!p || !p.resp || !p.resp.telefone) return;
    let fone = p.resp.telefone.replace(/\D/g, '');
    if (fone.length === 10 || fone.length === 11) fone = '55' + fone;
    const msg = 'Ola, ' + p.resp.nome.split(' ')[0] + '! Aqui e da Equilibrium Terapia Infantil. ' +
      'Sentimos falta de ' + p.nome.split(' ')[0] + ' nas ultimas sessoes e queremos saber se esta tudo bem. ' +
      'Podemos conversar sobre a agenda?';
    window.open('https://wa.me/' + fone + '?text=' + encodeURIComponent(msg), '_blank');
  }
};
