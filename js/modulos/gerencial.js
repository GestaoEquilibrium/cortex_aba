// ============================================================================
// CORTEX aba - js/modulos/gerencial.js
// Relatorios gerenciais exportaveis: Atendimentos (funil completo da agenda),
// Pacientes e Guias. Sai em planilha (CSV que o Excel abre direto) ou em
// PDF pela janela de impressao, na identidade dos documentos.
// ============================================================================

window.MODULOS = window.MODULOS || {};

window.MODULOS.gerencial = {

  el: null,
  sessao: null,
  _dados: null,

  ROTULO_STATUS: {
    agendada: 'Agendada', checkin: 'Check-in', em_atendimento: 'Em atendimento',
    concluida: 'Atendida', falta: 'Falta', cancelada: 'Cancelada'
  },

  async render(el, sessao) {
    this.el = el;
    this.sessao = sessao;

    const hoje = new Date();
    const inicio = hoje.toISOString().slice(0, 8) + '01';

    const [rPacs, rEquipe] = await Promise.all([
      sb.from('pacientes').select('id, nome').order('nome'),
      sb.from('profiles').select('id, nome').eq('atende_pacientes', true).eq('ativo', true).order('nome')
    ]);
    this._pacs = rPacs.data || [];
    this._equipe = rEquipe.data || [];

    el.innerHTML =
      '<div class="pagina-cabecalho">' +
      '  <div><h2>Relatorios gerenciais</h2>' +
      '  <p class="sub">Gere, confira na tela e exporte em planilha (abre no Excel) ou PDF.</p></div>' +
      '</div>' +

      '<div class="cartao"><div class="grade-form">' +
      '  <div class="campo"><label>Relatorio</label><select id="ge-tipo" onchange="MODULOS.gerencial.mudouTipo()">' +
      '    <option value="atendimentos">Atendimentos (funil da agenda)</option>' +
      '    <option value="pacientes">Pacientes (cadastro)</option>' +
      '    <option value="guias">Guias e saldos</option>' +
      '  </select></div>' +
      '  <div class="campo" id="ge-c-ini"><label>De</label>' +
      '    <input type="date" id="ge-ini" value="' + inicio + '"></div>' +
      '  <div class="campo" id="ge-c-fim"><label>Ate</label>' +
      '    <input type="date" id="ge-fim" value="' + hoje.toISOString().slice(0, 10) + '"></div>' +
      '  <div class="campo" id="ge-c-pac"><label>Paciente</label><select id="ge-pac">' +
      '    <option value="">Todos</option>' +
      this._pacs.map(p => '<option value="' + p.id + '">' + escaparHtml(p.nome) + '</option>').join('') +
      '  </select></div>' +
      '  <div class="campo" id="ge-c-apl"><label>Aplicador</label><select id="ge-apl">' +
      '    <option value="">Todos</option>' +
      this._equipe.map(m => '<option value="' + m.id + '">' + escaparHtml(m.nome) + '</option>').join('') +
      '  </select></div>' +
      '  <div class="campo" id="ge-c-st"><label>Situacao</label><select id="ge-st">' +
      '    <option value="">Todas</option>' +
      Object.entries(this.ROTULO_STATUS).map(([v, r]) => '<option value="' + v + '">' + r + '</option>').join('') +
      '  </select></div>' +
      '</div>' +
      '<div class="barra-acoes" style="margin-top:4px">' +
      '  <button class="btn btn-primario" onclick="MODULOS.gerencial.gerar()">Gerar relatorio</button>' +
      '</div></div>' +

      '<div id="ge-resultado"></div>' +

      (perm('gerencial.importar') === 'E'
        ? '<div class="cartao" style="margin-top:14px"><h3>Importar atendimentos do outro sistema</h3>' +
          '<p class="sub" style="margin-bottom:8px">Exportacao "atendimentos_prontuario_*.csv": cria/atualiza as sessoes da agenda (status, aplicador) ' +
          'e traz as evolucoes escritas la, sem sobrescrever o que ja foi escrito aqui. Pode repetir: nao duplica.</p>' +
          '<div class="barra-acoes" style="justify-content:flex-start">' +
          '  <input type="file" id="imp-arq" accept=".csv,text/csv" onchange="MODULOS.gerencial.lerCsv(this.files[0])">' +
          '</div><div id="imp-previa"></div></div>'
        : '');
  },

  // ─────────────── IMPORTACAO DO CSV DO OUTRO SISTEMA ───────────────
  IMP_STATUS: { 'Concluído / Realizado': 'concluida', 'Falta': 'falta', 'Cancelado (Paciente)': 'cancelada',
                'Cancelado (Clínica)': 'cancelada', 'Em Espera (Recepção)': 'checkin', 'Confirmado': 'agendada', 'Agendado': 'agendada' },

  normNome(t) {
    return String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  },

  parseCsv(texto, sep) {
    const linhas = []; let campo = '', linha = [], aspas = false;
    for (let i = 0; i < texto.length; i++) {
      const c = texto[i];
      if (aspas) {
        if (c === '"') { if (texto[i + 1] === '"') { campo += '"'; i++; } else aspas = false; }
        else campo += c;
      } else if (c === '"') aspas = true;
      else if (c === sep) { linha.push(campo); campo = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && texto[i + 1] === '\n') i++;
        linha.push(campo); linhas.push(linha); linha = []; campo = '';
      } else campo += c;
    }
    if (campo.length || linha.length) { linha.push(campo); linhas.push(linha); }
    return linhas.filter(l => l.some(x => x.trim() !== ''));
  },

  async lerCsv(arquivo) {
    if (!arquivo) return;
    const previa = document.getElementById('imp-previa');
    previa.innerHTML = '<p class="sub">Lendo...</p>';
    let texto = await arquivo.text();
    if (texto.charCodeAt(0) === 0xFEFF) texto = texto.slice(1);
    const sep = (texto.split('\n')[0].match(/;/g) || []).length >= (texto.split('\n')[0].match(/,/g) || []).length ? ';' : ',';
    const linhas = this.parseCsv(texto, sep);
    const cab = linhas[0].map(c => c.trim());
    const col = nome => cab.findIndex(c => this.normNome(c) === this.normNome(nome));
    const iId = col('ID Agendamento'), iData = col('Data'), iHora = col('Horário'), iPac = col('Paciente'),
          iProf = col('Profissional'), iSt = col('Status'), iEvo = col('Prontuário Evoluído?'), iTxt = col('Conteúdo da Evolução');
    if ([iId, iData, iHora, iPac, iProf, iSt].some(i => i < 0)) {
      previa.innerHTML = '<div class="mensagem-erro visivel">Este arquivo nao tem as colunas esperadas (ID Agendamento, Data, Horario, Paciente, Profissional, Status).</div>';
      return;
    }
    const regs = linhas.slice(1).map(l => ({
      id_ext: l[iId].trim(), data: l[iData].trim().replace(/^(\d{2})\/(\d{2})\/(\d{4})$/, '$3-$2-$1'),
      hora: (l[iHora] || '').trim().slice(0, 5) + ':00', paciente: l[iPac].trim(), profissional: l[iProf].trim(),
      status: this.IMP_STATUS[l[iSt].trim()] || 'agendada', statusTxt: l[iSt].trim(),
      evoluido: iEvo >= 0 && this.normNome(l[iEvo]) === 'sim', evolucao: iTxt >= 0 ? (l[iTxt] || '').trim() : ''
    })).filter(r => r.id_ext && /^\d{4}-\d{2}-\d{2}$/.test(r.data));

    // casamento de nomes
    const [rPac, rProf] = await Promise.all([
      sb.from('pacientes').select('id, nome'), sb.from('profiles').select('id, nome').eq('ativo', true)
    ]);
    const pacs = (rPac.data || []).map(p => ({ ...p, n: this.normNome(p.nome) }));
    const profs = (rProf.data || []).map(p => ({ ...p, n: this.normNome(p.nome) }));
    // pares lembrados de importacoes anteriores (nome do outro sistema -> crianca)
    const { data: rAlias } = await sb.from('importacao_alias').select('nome_externo, paciente_id');
    const alias = {}; (rAlias || []).forEach(a => { alias[this.normNome(a.nome_externo)] = a.paciente_id; });
    const achaPac = nome => {
      const n = this.normNome(nome);
      if (alias[n]) { const p = pacs.find(x => x.id === alias[n]); if (p) return p; }
      return pacs.find(p => p.n === n) || pacs.find(p => n.startsWith(p.n) || p.n.startsWith(n)) || null;
    };
    const achaProf = nome => {
      const n = this.normNome(nome), dois = n.split(' ').slice(0, 2).join(' ');
      return profs.find(p => p.n === n) || profs.find(p => p.n.startsWith(dois)) || null;
    };
    const mapaPac = {}, mapaProf = {};
    [...new Set(regs.map(r => r.paciente))].forEach(nm => { mapaPac[nm] = achaPac(nm); });
    [...new Set(regs.map(r => r.profissional))].forEach(nm => { mapaProf[nm] = achaProf(nm); });
    this._imp = { regs, mapaPac, mapaProf, pacs, profs };

    const semPac = Object.keys(mapaPac).filter(k => !mapaPac[k]);
    const semProf = Object.keys(mapaProf).filter(k => !mapaProf[k]);
    const datas = regs.map(r => r.data).sort();
    const contagem = {}; regs.forEach(r => { contagem[r.statusTxt] = (contagem[r.statusTxt] || 0) + 1; });

    previa.innerHTML =
      '<div class="grade-visao" style="margin:10px 0">' +
      '<div class="caixa-info"><small>Agendamentos</small><b>' + regs.length + '</b></div>' +
      '<div class="caixa-info"><small>Periodo</small><b>' + datas[0].split('-').reverse().join('/') + ' a ' + datas[datas.length - 1].split('-').reverse().join('/') + '</b></div>' +
      '<div class="caixa-info"><small>Com evolucao</small><b>' + regs.filter(r => r.evoluido && r.evolucao).length + '</b></div>' +
      '<div class="caixa-info"><small>Criancas</small><b>' + Object.keys(mapaPac).length + '</b></div>' +
      '</div>' +
      '<p class="sub">' + Object.entries(contagem).map(([k, v]) => escaparHtml(k) + ': <b>' + v + '</b>').join(' &middot; ') + '</p>' +
      (semPac.length
        ? '<h4 style="margin:12px 0 6px">Criancas que nao casaram com o cadastro <span class="selo selo-warn">' + semPac.length + '</span></h4>' +
          '<p class="sub">Escolha a crianca certa ou deixe em branco para pular os agendamentos dela.</p>' +
          semPac.map(nm => '<div class="linha-doc"><span><b>' + escaparHtml(nm) + '</b></span>' +
            '<select data-imp-pac="' + escaparHtml(nm) + '"><option value="">(pular)</option>' +
            pacs.sort((a, b) => a.nome.localeCompare(b.nome)).map(p => '<option value="' + p.id + '">' + escaparHtml(p.nome) + '</option>').join('') +
            '</select></div>').join('')
        : '<p class="sub"><span class="selo selo-ok">todas as criancas casaram</span></p>') +
      (semProf.length
        ? '<h4 style="margin:12px 0 6px">Profissionais que nao casaram <span class="selo selo-warn">' + semProf.length + '</span></h4>' +
          semProf.map(nm => '<div class="linha-doc"><span><b>' + escaparHtml(nm) + '</b></span>' +
            '<select data-imp-prof="' + escaparHtml(nm) + '"><option value="">(sem aplicador)</option>' +
            profs.map(p => '<option value="' + p.id + '">' + escaparHtml(p.nome) + '</option>').join('') +
            '</select></div>').join('')
        : '') +
      '<div class="mensagem-erro" id="imp-erro"></div>' +
      '<div class="barra-acoes"><button class="btn btn-primario" id="imp-btn" onclick="MODULOS.gerencial.importarCsv()">Importar</button></div>';
  },

  async importarCsv() {
    const I = this._imp; if (!I) return;
    const erro = document.getElementById('imp-erro'); erro.classList.remove('visivel');
    const botao = document.getElementById('imp-btn'); botao.disabled = true;
    const passo = t => { botao.textContent = t; };
    const novosAlias = [];
    document.querySelectorAll('[data-imp-pac]').forEach(s => {
      I.mapaPac[s.dataset.impPac] = s.value ? I.pacs.find(p => p.id === s.value) : null;
      if (s.value) novosAlias.push({ nome_externo: s.dataset.impPac, paciente_id: s.value });
    });
    if (novosAlias.length) await sb.from('importacao_alias').upsert(novosAlias, { onConflict: 'nome_externo' });
    document.querySelectorAll('[data-imp-prof]').forEach(s => { I.mapaProf[s.dataset.impProf] = s.value ? I.profs.find(p => p.id === s.value) : null; });

    try {
      let regs = I.regs.filter(r => I.mapaPac[r.paciente]);
      const pulados = I.regs.length - regs.length;
      const datas = regs.map(r => r.data).sort();
      const pacIds = [...new Set(regs.map(r => I.mapaPac[r.paciente].id))];

      // 1) sessoes: upsert pela chave (paciente, data, hora)
      passo('Gravando sessoes...');
      // duplicidades do outro sistema (mesma crianca, data e hora): fica a de status mais avancado
      const peso = { concluida: 4, falta: 3, checkin: 2, agendada: 1, cancelada: 0 };
      const unicos = {};
      regs.forEach(r => {
        const k = I.mapaPac[r.paciente].id + '|' + r.data + '|' + r.hora;
        if (!unicos[k] || (peso[r.status] || 0) > (peso[unicos[k].status] || 0)) unicos[k] = r;
      });
      regs = Object.values(unicos);
      const linhas = regs.map(r => ({
        paciente_id: I.mapaPac[r.paciente].id, data: r.data, hora_inicio: r.hora, duracao_min: 40,
        aplicador_id: I.mapaProf[r.profissional] ? I.mapaProf[r.profissional].id : null,
        status: r.status, id_externo: r.id_ext
      }));
      // sem aplicador no CSV: nao apaga o que ja existe (upsert manda null) -> separa
      const comApl = linhas.filter(l => l.aplicador_id), semApl = linhas.filter(l => !l.aplicador_id).map(l => { const c = { ...l }; delete c.aplicador_id; return c; });
      for (const lote of [comApl, semApl]) {
        for (let i = 0; i < lote.length; i += 200) {
          const { error } = await sb.from('sessoes').upsert(lote.slice(i, i + 200), { onConflict: 'paciente_id,data,hora_inicio' });
          if (error) throw new Error('Sessoes: ' + error.message);
        }
      }

      // 2) evolucoes: so onde a sessao ainda nao tem
      passo('Gravando evolucoes...');
      const { data: sess } = await sb.from('sessoes').select('id, paciente_id, data, hora_inicio')
        .in('paciente_id', pacIds).gte('data', datas[0]).lte('data', datas[datas.length - 1]);
      const chave = s => s.paciente_id + '|' + s.data + '|' + String(s.hora_inicio).slice(0, 8);
      const porChave = {}; (sess || []).forEach(s => { porChave[chave(s)] = s.id; });
      const ids = (sess || []).map(s => s.id);
      const jaTem = new Set();
      for (let i = 0; i < ids.length; i += 300) {
        const { data: ev } = await sb.from('evolucoes').select('sessao_id').in('sessao_id', ids.slice(i, i + 300));
        (ev || []).forEach(e => jaTem.add(e.sessao_id));
      }
      const novas = regs.filter(r => r.evoluido && r.evolucao).map(r => {
        const sid = porChave[I.mapaPac[r.paciente].id + '|' + r.data + '|' + r.hora];
        return sid && !jaTem.has(sid) ? {
          sessao_id: sid, paciente_id: I.mapaPac[r.paciente].id,
          aplicador_id: I.mapaProf[r.profissional] ? I.mapaProf[r.profissional].id : window.CORTEX_SESSAO.user.id,
          texto: r.evolucao, id_externo: r.id_ext
        } : null;
      }).filter(Boolean);
      for (let i = 0; i < novas.length; i += 200) {
        const { error } = await sb.from('evolucoes').insert(novas.slice(i, i + 200));
        if (error) throw new Error('Evolucoes: ' + error.message);
      }

      document.getElementById('imp-previa').innerHTML =
        '<div class="grade-visao" style="margin:10px 0">' +
        '<div class="caixa-info"><small>Sessoes gravadas</small><b>' + linhas.length + '</b></div>' +
        '<div class="caixa-info"><small>Evolucoes novas</small><b>' + novas.length + '</b></div>' +
        '<div class="caixa-info"><small>Ja tinham evolucao</small><b>' + (regs.filter(r => r.evoluido && r.evolucao).length - novas.length) + '</b></div>' +
        '<div class="caixa-info"><small>Pulados (sem crianca)</small><b>' + pulados + '</b></div>' +
        '</div><p class="sub"><span class="selo selo-ok">importacao concluida</span> Agenda, prontuarios e pendencias ja refletem o arquivo.</p>';
      document.getElementById('imp-arq').value = '';
    } catch (e) {
      erro.textContent = e.message; erro.classList.add('visivel');
      botao.disabled = false; botao.textContent = 'Importar';
    }
  },

  mudouTipo() {
    const t = document.getElementById('ge-tipo').value;
    const soAtend = t === 'atendimentos';
    document.getElementById('ge-c-apl').style.display = soAtend ? '' : 'none';
    document.getElementById('ge-c-st').style.display = soAtend ? '' : 'none';
    document.getElementById('ge-c-ini').style.display = t === 'pacientes' ? 'none' : '';
    document.getElementById('ge-c-fim').style.display = t === 'pacientes' ? 'none' : '';
    document.getElementById('ge-c-pac').style.display = t === 'guias' ? 'none' : '';
  },

  async gerar() {
    const tipo = document.getElementById('ge-tipo').value;
    const alvo = document.getElementById('ge-resultado');
    alvo.innerHTML = '<div class="cartao"><p class="sub">Gerando...</p></div>';
    try {
      if (tipo === 'atendimentos') await this.gerarAtendimentos();
      else if (tipo === 'pacientes') await this.gerarPacientes();
      else await this.gerarGuias();
    } catch (e) {
      alvo.innerHTML = '<div class="cartao"><div class="mensagem-erro visivel">' +
        escaparHtml(e.message) + '</div></div>';
    }
  },

  // ─────────────── Atendimentos (funil da agenda) ───────────────

  async gerarAtendimentos() {
    const ini = document.getElementById('ge-ini').value;
    const fim = document.getElementById('ge-fim').value;
    if (!ini || !fim || fim < ini) throw new Error('Confira o periodo.');

    let q = sb.from('sessoes')
      .select('data, hora_inicio, duracao_min, status, confirmacao, ' +
              'pacientes(nome, convenio), profissional:profiles!sessoes_aplicador_id_fkey(nome)')
      .gte('data', ini).lte('data', fim)
      .order('data').order('hora_inicio');
    const pac = document.getElementById('ge-pac').value;
    const apl = document.getElementById('ge-apl').value;
    const st = document.getElementById('ge-st').value;
    if (pac) q = q.eq('paciente_id', pac);
    if (apl) q = q.eq('aplicador_id', apl);
    if (st) q = q.eq('status', st);

    const { data, error } = await q.limit(3000);
    if (error) throw new Error(error.message);
    const lista = data || [];

    const cont = { total: lista.length, confirmadas: 0, checkin: 0, atendidas: 0, faltas: 0, canceladas: 0 };
    lista.forEach(s => {
      if (s.confirmacao === 'confirmada') cont.confirmadas++;
      if (s.status === 'checkin' || s.status === 'em_atendimento') cont.checkin++;
      if (s.status === 'concluida') cont.atendidas++;
      if (s.status === 'falta') cont.faltas++;
      if (s.status === 'cancelada') cont.canceladas++;
    });

    const cab = ['Data', 'Hora', 'Paciente', 'Convenio', 'Aplicador', 'Duracao (min)', 'Situacao', 'Confirmada pela familia'];
    const linhas = lista.map(s => [
      this.fmt(s.data), s.hora_inicio.slice(0, 5),
      s.pacientes ? s.pacientes.nome : '', s.pacientes ? s.pacientes.convenio || '' : '',
      s.profissional ? s.profissional.nome : '', s.duracao_min,
      this.ROTULO_STATUS[s.status] || s.status,
      s.confirmacao === 'confirmada' ? 'Sim' : ''
    ]);

    this._dados = {
      titulo: 'Relatorio de Atendimentos',
      sub: 'Periodo ' + this.fmt(ini) + ' a ' + this.fmt(fim),
      resumo: [
        ['Agendadas no periodo', cont.total], ['Confirmadas pela familia', cont.confirmadas],
        ['Check-in realizados', cont.checkin], ['Atendidas', cont.atendidas],
        ['Faltas', cont.faltas], ['Canceladas', cont.canceladas]
      ],
      cab, linhas, arquivo: 'atendimentos_' + ini + '_' + fim
    };
    this.mostrar();
  },

  // ─────────────── Pacientes ───────────────

  async gerarPacientes() {
    let q = sb.from('pacientes')
      .select('nome, data_nascimento, sexo, convenio, carteirinha, nivel, status, admitido_em, ' +
              'aplicador:profiles!pacientes_aplicador_id_fkey(nome)')
      .order('nome');
    const pac = document.getElementById('ge-pac').value;
    if (pac) q = q.eq('id', pac);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    const lista = data || [];

    const cab = ['Nome', 'Nascimento', 'Sexo', 'Convenio', 'Carteirinha', 'Nivel', 'Situacao', 'Admissao', 'Aplicador'];
    const linhas = lista.map(p => [
      p.nome, this.fmt(p.data_nascimento), p.sexo || '', p.convenio || '', p.carteirinha || '',
      p.nivel ? 'Nivel ' + p.nivel : '', p.status, this.fmt(p.admitido_em),
      p.aplicador ? p.aplicador.nome : ''
    ]);

    this._dados = {
      titulo: 'Relatorio de Pacientes',
      sub: lista.length + ' paciente(s)',
      resumo: [
        ['Total', lista.length],
        ['Ativos', lista.filter(p => p.status === 'ativo').length],
        ['Em avaliacao', lista.filter(p => p.status === 'avaliacao').length],
        ['Encerrados', lista.filter(p => p.status === 'encerrado').length]
      ],
      cab, linhas, arquivo: 'pacientes_' + hojeLocal()
    };
    this.mostrar();
  },

  // ─────────────── Guias e saldos ───────────────

  async gerarGuias() {
    const ini = document.getElementById('ge-ini').value;
    const fim = document.getElementById('ge-fim').value;

    const { data: guias, error } = await sb.from('guias')
      .select('*, pacientes(nome, convenio, carteirinha)')
      .order('vigencia_fim');
    if (error) throw new Error(error.message);
    const lista = (guias || []).filter(g =>
      !ini || !fim || (g.vigencia_inicio <= fim && g.vigencia_fim >= ini));
    if (!lista.length) throw new Error('Nenhuma guia no periodo (o modulo Guias e restrito a direcao).');

    const linhas = [];
    for (const g of lista) {
      const { data: ses } = await sb.from('sessoes')
        .select('status').eq('paciente_id', g.paciente_id)
        .gte('data', g.vigencia_inicio).lte('data', g.vigencia_fim);
      const atendidas = (ses || []).filter(s => s.status === 'concluida').length;
      const faltas = (ses || []).filter(s => s.status === 'falta').length;
      linhas.push([
        g.pacientes ? g.pacientes.nome : '', g.convenio || (g.pacientes ? g.pacientes.convenio : '') || '',
        g.numero, g.pacientes ? g.pacientes.carteirinha || '' : '',
        this.fmt(g.vigencia_inicio), this.fmt(g.vigencia_fim),
        g.qtd_autorizada, atendidas, faltas, g.qtd_autorizada - atendidas
      ]);
    }

    this._dados = {
      titulo: 'Relatorio de Guias e Saldos',
      sub: lista.length + ' guia(s)' + (ini && fim ? ' com vigencia no periodo ' + this.fmt(ini) + ' a ' + this.fmt(fim) : ''),
      resumo: [
        ['Guias', lista.length],
        ['Autorizadas (soma)', linhas.reduce((s, l) => s + l[6], 0)],
        ['Atendidas (soma)', linhas.reduce((s, l) => s + l[7], 0)],
        ['Saldo (soma)', linhas.reduce((s, l) => s + l[9], 0)]
      ],
      cab: ['Paciente', 'Convenio', 'Guia', 'Carteirinha', 'Vigencia inicio', 'Vigencia fim',
            'Autorizadas', 'Atendidas', 'Faltas', 'Saldo'],
      linhas, arquivo: 'guias_' + hojeLocal()
    };
    this.mostrar();
  },

  // ─────────────── Tela, planilha e PDF ───────────────

  fmt(d) { return d ? String(d).slice(0, 10).split('-').reverse().join('/') : ''; },

  mostrar() {
    const d = this._dados;
    document.getElementById('ge-resultado').innerHTML =
      '<div class="cartao">' +
      '<div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:10px">' +
      '  <div><h3 style="margin:0">' + d.titulo + '</h3><p class="sub">' + d.sub + ' &middot; ' + d.linhas.length + ' linha(s)</p></div>' +
      '  <div style="display:flex; gap:8px">' +
      '    <button class="btn btn-fantasma" onclick="MODULOS.gerencial.baixarPlanilha()">&#128202; Planilha (Excel)</button>' +
      '    <button class="btn btn-primario" onclick="MODULOS.gerencial.abrirPdf()">&#128424; PDF / Imprimir</button>' +
      '  </div>' +
      '</div>' +
      '<div class="grade-visao" style="margin-bottom:12px">' +
      d.resumo.map(([r, v]) => '<div class="caixa-info"><small>' + r + '</small><b>' + v + '</b></div>').join('') +
      '</div>' +
      '<div style="overflow:auto; max-height:56vh">' +
      '<table class="tabela-presenca"><thead><tr>' +
      d.cab.map(c => '<th>' + c + '</th>').join('') + '</tr></thead><tbody>' +
      d.linhas.slice(0, 400).map(l => '<tr>' + l.map(v => '<td>' + escaparHtml(String(v ?? '')) + '</td>').join('') + '</tr>').join('') +
      '</tbody></table>' +
      (d.linhas.length > 400 ? '<p class="sub" style="margin-top:8px">Mostrando 400 de ' + d.linhas.length +
        ' na tela; a planilha e o PDF saem completos.</p>' : '') +
      '</div></div>';
  },

  baixarPlanilha() {
    const d = this._dados;
    const esc = v => {
      const t = String(v ?? '');
      return /[;"\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
    };
    const csv = '\ufeff' +
      d.titulo + ';' + d.sub + '\n\n' +
      d.resumo.map(([r, v]) => r + ';' + v).join('\n') + '\n\n' +
      d.cab.join(';') + '\n' +
      d.linhas.map(l => l.map(esc).join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = d.arquivo + '.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  },

  abrirPdf() {
    const d = this._dados;
    document.getElementById('doc-eq-overlay')?.remove();
    const ov = document.createElement('div');
    ov.id = 'doc-eq-overlay';
    ov.className = 'folha-overlay';
    ov.innerHTML = '<div class="folha-pagina" style="max-width:1000px">' +
      '<div class="pagina-cabecalho nao-imprime">' +
      '  <div><button class="btn-voltar" onclick="document.getElementById(\'doc-eq-overlay\').remove()">&larr; Fechar</button>' +
      '  <h2>' + d.titulo + '</h2></div>' +
      '  <button class="btn btn-primario" onclick="window.print()">&#128424; Imprimir / PDF</button>' +
      '</div>' +
      '<div class="doc-eq">' +
      '<div class="deq-cab">' +
      '  <img src="icones/equilibrium.png" alt="Equilibrium">' +
      '  <div class="deq-cab-t"><h1>' + d.titulo.toUpperCase() + '</h1>' +
      '  <p>Equilibrium Terapia Infantil &middot; ' + d.sub + '</p></div>' +
      '</div>' +
      '<div class="deq-caixa deq-dados" style="grid-template-columns:repeat(' + Math.min(6, d.resumo.length) + ', 1fr); margin-top:8px">' +
      d.resumo.map(([r, v]) => '<div style="border-bottom:none"><small>' + r + '</small><b>' + v + '</b></div>').join('') +
      '</div>' +
      '<table class="deq-freq" style="margin-top:12px"><tr>' +
      d.cab.map(c => '<th style="padding:6px 8px; font-size:9.5px">' + c + '</th>').join('') + '</tr>' +
      d.linhas.map(l => '<tr>' + l.map(v =>
        '<td style="width:auto; padding:5px 8px; font-size:10px; text-align:left">' +
        escaparHtml(String(v ?? '')) + '</td>').join('') + '</tr>').join('') +
      '</table>' +
      '<div class="deq-rodape">' +
      '  <span>Equilibrium Terapia Infantil &middot; Uberl&acirc;ndia/MG</span>' +
      '  <span class="pontos"><i style="background:var(--eq-teal)"></i><i style="background:var(--eq-amarelo)"></i>' +
      '<i style="background:var(--eq-rosa)"></i><i style="background:var(--eq-azul)"></i></span>' +
      '  <span>Gerado pelo CORTEX aba &middot; ' + new Date().toLocaleDateString('pt-BR') + '</span>' +
      '</div>' +
      '</div></div>';
    document.body.appendChild(ov);
  }
};
