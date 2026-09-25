// ============================================================================
// CORTEX aba - js/modulos/avaliacoes.js
// Sprint 7: QADI-R digital. Aplicacao por faixa etaria com SIM/NAO/NA,
// marcacao Oral/Nao Oral, salvamento automatico e pontuacao por area
// (% de SIM sobre as validas, excluindo NA).
// ============================================================================

window.MODULOS = window.MODULOS || {};

window.MODULOS.avaliacoes = {

  SS_AREAS: ['Participacao Conjunta', 'Brincadeira Social', 'Autorregulacao',
             'Social/Emocional', 'Linguagem Social',
             'Comportamento de Sala de Aula/Grupo', 'Linguagem Nao-Verbal'],
  // Socially Savvy: -1 = item nao aplicado (fora da conta); areas_excluidas (avaliacoes) = area inteira nao aplicada
  SS_NA: -1,
  ssAreasDe(av) {
    const ex = (av && Array.isArray(av.areas_excluidas)) ? av.areas_excluidas : [];
    return this.SS_AREAS.filter(a => !ex.includes(a));
  },
  // itens de uma area + mapa item_id -> pontos  =>  { r, max, pct (null se nada valido), na }
  ssPontuar(itens, mapa) {
    const validos = itens.filter(i => mapa[i.id] !== -1);
    const r = validos.reduce((s, i) => s + (mapa[i.id] > 0 ? mapa[i.id] : 0), 0);
    const max = validos.length * 3;
    return { r, max, pct: max ? Math.round(r * 100 / max) : null, na: itens.length - validos.length };
  },
  SS_ESCALA: [
    [0, 'Raramente ou nunca demonstra'],
    [1, 'Demonstra em poucas situacoes'],
    [2, 'Demonstra em algumas situacoes e pessoas'],
    [3, 'Demonstra consistentemente entre situacoes e pessoas']
  ],
  itensSS: [],

  _overlay: false,

  abrirJanela(avaliacaoId, resultado) {
    document.getElementById('aval-overlay')?.remove();
    const ov = document.createElement('div');
    ov.id = 'aval-overlay';
    ov.className = 'folha-overlay';
    ov.innerHTML = '<div class="folha-pagina" id="aval-corpo" style="max-width:1100px"></div>';
    document.body.appendChild(ov);
    this.el = document.getElementById('aval-corpo');
    this._overlay = true;
    if (resultado) this.telaResultado(avaliacaoId);
    else this.abrirAplicacao(avaliacaoId);
  },

  fecharJanela() {
    document.getElementById('aval-overlay')?.remove();
    this._overlay = false;
    const alvo = document.getElementById('pac-aba-conteudo');
    if (alvo && this._pacAtualId && MODULOS.pacientes.paciente) {
      MODULOS.pacientes.abrirAba('avaliacao');
    }
  },

  voltarHtml() {
    return this._overlay
      ? '<button class="btn-voltar" onclick="MODULOS.avaliacoes.fecharJanela()">&larr; Fechar</button>'
      : '<button class="btn-voltar" onclick="MODULOS.avaliacoes.telaLista()">&larr; Avaliacoes</button>';
  },

  async iniciarDoProntuario(pacienteId, protocolo) {
    const { data, error } = await sb.from('avaliacoes')
      .insert({ paciente_id: pacienteId, protocolo: protocolo,
                avaliador_id: window.CORTEX_SESSAO.user.id })
      .select('id').single();
    if (error) { alert('Erro: ' + error.message); return; }
    this.abrirJanela(data.id);
  },

  async carregarItensSS() {
    if (this.itensSS.length) return;
    const { data } = await sb.from('ss_itens').select('*').order('ordem');
    this.itensSS = data || [];
  },

  PODE_AVALIAR: ['direcao', 'coordenador', 'terapeuta', 'suporte'],
  FAIXAS: ['0 a 1 ano', '1 a 2 anos', '2 a 3 anos', '3 a 4 anos', '4 a 5 anos', '5 a 6 anos'],
  AREAS: ['Linguagem Receptiva', 'Linguagem Expressiva', 'Cognição',
          'Motricidade Grossa', 'Motricidade Fina', 'Socialização'],

  el: null,
  sessao: null,
  questoes: [],
  avaliacao: null,
  respostas: {},
  faixaAtual: null,
  pacienteAtual: null,

  async render(el, sessao) {
    this.el = el;
    this.sessao = sessao;
    await this.telaLista();
  },

  // ───────────────────────── LISTA GERAL ─────────────────────────

  async telaLista() {
    this.el.innerHTML =
      '<div class="pagina-cabecalho">' +
      '  <div><h2>Avaliacoes &middot; administracao</h2>' +
      '  <p class="sub">Uma linha por paciente: situacao de cada protocolo, atrasos e documentos. As aplicacoes acontecem no prontuario.</p></div>' +
      '</div>' +
      '<div id="av-venc"></div>' +
      '<div class="toolbar" style="display:flex; gap:10px; flex-wrap:wrap; align-items:center">' +
      '  <input id="av-busca" placeholder="Buscar paciente..." style="flex:1; min-width:220px" ' +
      '    oninput="MODULOS.avaliacoes.filtrarQuadro()">' +
      '  <label class="check" style="margin:0"><input type="checkbox" id="av-so-pend" onchange="MODULOS.avaliacoes.filtrarQuadro()"> So com pendencia</label>' +
      '  <button class="btn-chip" onclick="MODULOS.avaliacoes.verCatalogo(\'qadi\')">Itens QADI-R</button>' +
      '  <button class="btn-chip" onclick="MODULOS.avaliacoes.verCatalogo(\'ss\')">Itens Socially Savvy</button>' +
      '</div>' +
      '<div id="av-lista"><div class="cartao"><p class="sub">Carregando...</p></div></div>';
    this.quadroVencimentos();

    const [rAv, rPac] = await Promise.all([
      sb.from('avaliacoes')
        .select('id, paciente_id, protocolo, status, iniciado_em, concluido_em')
        .order('iniciado_em', { ascending: false }).limit(1000),
      sb.from('pacientes').select('id, nome').neq('status', 'encerrado').order('nome')
    ]);
    await Promise.all([this.carregarQuestoes(), this.carregarItensSS()]);

    const porPac = {};
    (rAv.data || []).forEach(a => {
      (porPac[a.paciente_id] = porPac[a.paciente_id] || []).push(a);
    });

    this._quadro = (rPac.data || []).map(p => {
      const avs = porPac[p.id] || [];
      const resumo = prot => {
        const doProt = avs.filter(a => a.protocolo === prot);
        const aberta = doProt.find(a => a.status !== 'concluida');
        const conc = doProt.filter(a => a.status === 'concluida');
        return { aberta, n: conc.length,
          ultima: conc.length ? conc[0].concluido_em : null,
          dias: aberta ? Math.floor((Date.now() - new Date(aberta.iniciado_em)) / 86400000) : null };
      };
      const ss = resumo('ss'), qadi = resumo('qadi'), por = resumo('portage');
      return { p, ss, qadi, por, pendente: !!(ss.aberta || qadi.aberta || por.aberta),
        semNada: !avs.length };
    });
    this.filtrarQuadro();
  },

  seloProt(r, prot, pacId) {
    if (r.aberta) {
      return '<button class="btn-chip cheio" ' +
        'onclick="MODULOS.avaliacoes.abrirJanela(\'' + r.aberta.id + '\')">' +
        'Continuar' + (r.dias >= 7 ? ' &middot; <b>' + r.dias + 'd</b>' : '') + '</button>';
    }
    if (r.n) {
      const fn = prot === 'ss' ? 'docSS' : prot === 'portage' ? 'docPortage' : 'docQADI';
      return '<button class="btn-chip" title="Documento consolidado (' + r.n + ' aplicacao(oes))" ' +
        'onclick="MODULOS.avaliacoes.' + fn + '(\'' + pacId + '\')">' +
        r.n + ' AV &middot; ' + new Date(r.ultima).toLocaleDateString('pt-BR').slice(0, 5) + ' &#128196;</button>';
    }
    return '<span class="selo selo-neutro">&mdash;</span>';
  },

  filtrarQuadro() {
    const alvo = document.getElementById('av-lista');
    if (!alvo || !this._quadro) return;
    const termo = (document.getElementById('av-busca')?.value || '').toLowerCase();
    const soPend = document.getElementById('av-so-pend')?.checked;
    let lista = this._quadro.filter(x =>
      (!termo || x.p.nome.toLowerCase().includes(termo)) &&
      (!soPend || x.pendente));
    const total = lista.length;
    const pendentes = this._quadro.filter(x => x.pendente).length;
    lista = lista.slice(0, 40);

    alvo.innerHTML =
      '<div class="grade-visao" style="margin-bottom:12px">' +
      '  <div class="caixa-info"><small>Pacientes</small><b>' + this._quadro.length + '</b></div>' +
      '  <div class="caixa-info"><small>Com aplicacao aberta</small><b style="color:' + (pendentes ? '#D97706' : 'inherit') + '">' + pendentes + '</b></div>' +
      '  <div class="caixa-info"><small>QADI-R &middot; catalogo</small><b>' + this.questoes.length + '</b></div>' +
      '  <div class="caixa-info"><small>Socially Savvy &middot; catalogo</small><b>' + this.itensSS.length + '</b></div>' +
      '</div>' +
      '<div class="cartao">' +
      '<table class="tabela-presenca tabela-quadro"><thead><tr>' +
      '<th>Paciente</th><th>Socially Savvy</th><th>QADI-R</th><th>Portage</th><th></th></tr></thead><tbody>' +
      lista.map(x =>
        '<tr' + (x.pendente ? ' style="background:#FFFBEB"' : '') + '>' +
        '<td><b>' + escaparHtml(x.p.nome) + '</b>' +
        (x.semNada ? ' <span class="selo selo-neutro">sem avaliacoes</span>' : '') + '</td>' +
        '<td>' + this.seloProt(x.ss, 'ss', x.p.id) + '</td>' +
        '<td>' + this.seloProt(x.qadi, 'qadi', x.p.id) + '</td>' +
        '<td>' + this.seloProt(x.por, 'portage', x.p.id) + '</td>' +
        '<td><button class="btn-chip" onclick="MODULOS.pacientes.telaDetalhe(\'' + x.p.id + '\', \'avaliacao\')">Abrir pasta</button></td>' +
        '</tr>').join('') +
      '</tbody></table>' +
      (total > 40 ? '<p class="sub" style="margin-top:8px">Mostrando 40 de ' + total + ' &mdash; refine pela busca.</p>' : '') +
      '</div>';
  },

  verCatalogo(protocolo) {
    let corpo = '';
    if (protocolo === 'qadi') {
      this.FAIXAS.forEach(f => {
        const qs = this.questoes.filter(q => q.faixa === f);
        corpo += '<h3 style="margin-top:10px">' + f + ' <span class="selo selo-neutro">' + qs.length + '</span></h3>' +
          qs.map(q => '<div class="linha-doc"><div><small style="color:var(--ink-muted)">' +
            escaparHtml(q.area) + '</small><br>' + escaparHtml(q.pergunta) + '</div></div>').join('');
      });
    } else {
      this.SS_AREAS.forEach(area => {
        const its = this.itensSS.filter(i => i.area === area);
        corpo += '<h3 style="margin-top:10px">' + area + ' <span class="selo selo-neutro">' + its.length + '</span></h3>' +
          its.map(i => '<div class="linha-doc"><div><b style="color:var(--ink-muted); margin-right:6px">' +
            i.codigo + '</b>' + escaparHtml(i.texto) + '</div></div>').join('');
      });
    }
    abrirModal('Catalogo &middot; ' + (protocolo === 'qadi' ? 'QADI-R' : 'Socially Savvy'),
      '<div style="max-height:60vh; overflow:auto; padding-right:6px">' + corpo + '</div>' +
      '<div class="barra-acoes"><button class="btn btn-primario" onclick="fecharModal()">Fechar</button></div>', true);
  },

  async cancelarAvaliacao(id, rotulo, pacienteId) {
    if (!await popConfirmar('Cancelar e apagar a aplicacao "' + rotulo + '"?\n' +
      'As respostas ja registradas serao apagadas junto. Esta acao nao tem volta.', { ok: 'Cancelar aplicacao', cancelar: 'Voltar' })) return;
    // respostas primeiro (sem depender de cascade), depois a avaliacao
    for (const t of ['avaliacao_respostas', 'ss_respostas', 'portage_respostas']) {
      const { error: eR } = await sb.from(t).delete().eq('avaliacao_id', id);
      if (eR) { popAviso('Nao foi possivel apagar as respostas (' + t + '): ' + eR.message); return; }
    }
    const { error } = await sb.from('avaliacoes').delete().eq('id', id);
    if (error) { popAviso('Nao foi possivel cancelar: ' + error.message); return; }
    if (pacienteId) MODULOS.pacientes.telaDetalhe(pacienteId, 'avaliacao'); else this.telaLista();
  },

  // ───────────────────────── APLICACAO ─────────────────────────

  async carregarQuestoes() {
    if (this.questoes.length) return;
    const { data } = await sb.from('qadi_questoes').select('*').order('ordem');
    this.questoes = data || [];
  },

  async abrirAplicacao(avaliacaoId) {
    const { data: av, error } = await sb.from('avaliacoes')
      .select('*, pacientes(id, nome, data_nascimento)')
      .eq('id', avaliacaoId).single();
    if (error || !av) { this.telaLista(); return; }

    this.avaliacao = av;
    this.pacienteAtual = av.pacientes;

    if (av.protocolo === 'ss') { await this.abrirAplicacaoSS(); return; }
    if (av.protocolo === 'portage') { await this.abrirAplicacaoPortage(); return; }
    await this.carregarQuestoes();

    this.respostas = {};
    const { data: resps } = await sb.from('avaliacao_respostas')
      .select('questao_id, resposta').eq('avaliacao_id', av.id);
    (resps || []).forEach(r => { this.respostas[r.questao_id] = r.resposta; });

    // Faixa inicial sugerida pela idade cronologica
    if (!this.faixaAtual) {
      const anos = Math.floor(
        (Date.now() - new Date(av.pacientes.data_nascimento + 'T12:00:00')) / 31557600000);
      this.faixaAtual = this.FAIXAS[Math.min(Math.max(anos, 0), 5)];
    }

    this.telaAplicacao();
  },

  celular() { return window.innerWidth <= 720; },

  // ─────────────── CELULAR: um item por tela (QADI / SS / Portage) ───────────────
  // Monta uma lista linear de itens do "bloco" atual (faixa do QADI, area do SS, area+faixa do Portage)
  // e mostra um por vez com botoes grandes; salva a cada toque e avanca.
  _mIdx: 0,
  itensCelular() {
    const av = this.avaliacao;
    if (av.protocolo === 'ss') {
      const area = this._ssArea || this.SS_AREAS[0];
      const ex = (av.areas_excluidas || []);
      const itensArea = ex.includes(area) ? [] : this.itensSS.filter(i => i.area === area);
      return { bloco: area, itens: itensArea.map(i => ({ id: i.id, texto: i.texto, sub: i.codigo, resp: this.respSS[i.id] })),
        opcoes: [['0', '0', '#94A3B8', 'Nunca / nao faz'], ['1', '1', '#E9586A', 'Raramente'], ['2', '2', '#F3B63D', 'As vezes'], ['3', '3', '#16A34A', 'Sempre / dominado'], ['-1', 'NA', '#64748B', 'Nao aplicado (fora da conta)']],
        blocos: this.SS_AREAS.map(a => [a, a, ex.includes(a) ? 'nao aplicada' : this.itensSS.filter(i => i.area === a && this.respSS[i.id] !== undefined).length + '/' + this.itensSS.filter(i => i.area === a).length]),
        total: this.itensSS.filter(i => !ex.includes(i.area)).length, feitos: Object.keys(this.respSS).length, areaExcluida: ex.includes(area) };
    }
    if (av.protocolo === 'portage') {
      const itens = this.itensPortage.filter(i => i.area === this._pArea && i.faixa === this._pFaixa);
      return { bloco: this._pArea + ' \u00b7 ' + this.P_FAIXAS[this._pFaixa], itens: itens.map(i => ({ id: i.id, texto: i.texto, sub: 'item ' + i.ordem, resp: this._pResp[i.id] })),
        opcoes: [['S', 'Sim', '#16A34A', ''], ['AV', 'As vezes', '#F59E0B', ''], ['N', 'Nao', '#E11D48', ''], ['NA', 'NA', '#94A3B8', 'nao se aplica']],
        blocos: this.P_AREAS.flatMap(a => this.P_FAIXAS.map((f, fi) => { const l = this.itensPortage.filter(x => x.area === a && x.faixa === fi); return l.length ? [a + '|' + fi, a + ' \u00b7 ' + f, l.filter(x => this._pResp[x.id]).length + '/' + l.length] : null; }).filter(Boolean)),
        total: this.itensPortage.length, feitos: Object.keys(this._pResp).length };
    }
    const qs = this.questoes.filter(q => q.faixa === this.faixaAtual);
    return { bloco: this.faixaAtual, itens: qs.map(q => ({ id: q.id, texto: q.pergunta, sub: q.area, resp: this.respostas[q.id] })),
      opcoes: [['S', 'SIM', '#16A34A', ''], ['N', 'N\u00c3O', '#E11D48', ''], ['NA', 'Nao se aplica', '#94A3B8', '']],
      blocos: this.FAIXAS.map(f => [f, f, this.questoes.filter(q => q.faixa === f && this.respostas[q.id]).length + '/' + this.questoes.filter(q => q.faixa === f).length]),
      total: this.questoes.length, feitos: Object.keys(this.respostas).length };
  },
  telaCelular() {
    const av = this.avaliacao;
    const d = this.itensCelular();
    if (!d.itens.length) { this._mIdx = 0; }
    if (this._mIdx >= d.itens.length) this._mIdx = Math.max(0, d.itens.findIndex(i => i.resp === undefined));
    if (this._mIdx < 0) this._mIdx = 0;
    const i = d.itens[this._mIdx];
    const nome = av.protocolo === 'ss' ? 'Socially Savvy' : av.protocolo === 'portage' ? 'Portage' : 'QADI-R';
    const blocoAtual = av.protocolo === 'portage' ? this._pArea + '|' + this._pFaixa : av.protocolo === 'ss' ? (this._ssArea || this.SS_AREAS[0]) : this.faixaAtual;
    const feitosBloco = d.itens.filter(x => x.resp !== undefined).length;
    const concluir = av.protocolo === 'ss' ? 'concluirSS' : av.protocolo === 'portage' ? 'concluirPortage' : 'concluir';
    this.el.innerHTML =
      '<div class="cel-ficha">' +
      '<div class="cel-ficha-topo"><button class="btn-voltar" onclick="MODULOS.avaliacoes.fecharJanela()">&larr;</button>' +
      '<div class="cel-ficha-tit"><b>' + nome + ' &middot; ' + escaparHtml(av.pacientes ? av.pacientes.nome.split(' ').slice(0, 2).join(' ') : '') + '</b>' +
      '<small>' + d.feitos + '/' + d.total + ' respondidos &middot; salva sozinho</small></div></div>' +
      '<select class="cel-bloco" onchange="MODULOS.avaliacoes.mudarBlocoCelular(this.value)">' +
      d.blocos.map(([v, r, n]) => '<option value="' + escaparHtml(v) + '"' + (v === blocoAtual ? ' selected' : '') + '>' + escaparHtml(r) + ' \u00b7 ' + n + '</option>').join('') + '</select>' +
      '<div class="prog-fina"><i style="width:' + (d.itens.length ? Math.round(feitosBloco * 100 / d.itens.length) : 0) + '%"></i></div>' +
      (i
        ? '<div class="cel-ficha-cont"><b>Item ' + (this._mIdx + 1) + ' de ' + d.itens.length + '</b><small>' + escaparHtml(i.sub || '') + '</small></div>' +
          '<div class="cartao cel-item"><small>' + escaparHtml(i.sub || '') + '</small><p>' + escaparHtml(i.texto) + '</p></div>' +
          '<div class="cel-resp' + (d.opcoes.length === 3 ? ' tres' : d.opcoes.length === 5 ? ' cinco' : '') + '">' +
          d.opcoes.map(([v, r, cor, dica]) => '<button class="cel-nv' + (String(i.resp) === v ? ' ativo' : '') + '" style="--nv:' + cor + '" onclick="MODULOS.avaliacoes.responderCelular(\'' + v + '\')"><b>' + r + '</b>' + (dica ? '<span>' + dica + '</span>' : '') + '</button>').join('') +
          '</div>'
        : '<div class="cartao"><p class="sub">' + (d.areaExcluida ? 'Area marcada como <b>nao aplicada</b>: fica fora da pontuacao e do relatorio.' : 'Nenhum item neste bloco.') + '</p></div>') +
      (av.protocolo === 'ss' ? '<div style="text-align:center; margin:6px 0"><button class="btn-chip" onclick="MODULOS.avaliacoes.alternarAreaSS(\'' + escaparHtml(d.bloco) + '\')">' + (d.areaExcluida ? '&#8634; Voltar a aplicar esta area' : '&#10005; Nao aplicar esta area') + '</button></div>' : '') +
      '<div class="cel-nav">' +
      '<button class="btn btn-fantasma" onclick="MODULOS.avaliacoes.irItem(' + (this._mIdx - 1) + ')"' + (this._mIdx === 0 ? ' disabled' : '') + '>&lsaquo; Anterior</button>' +
      (this._mIdx < d.itens.length - 1
        ? '<button class="btn btn-fantasma" onclick="MODULOS.avaliacoes.irItem(' + (this._mIdx + 1) + ')">Proximo &rsaquo;</button>'
        : '<button class="btn btn-primario" onclick="MODULOS.avaliacoes.proximoBloco()">Proximo bloco &rsaquo;</button>') +
      '</div>' +
      '<div class="cel-rodape"><span class="sub" style="font-size:11.5px">' + escaparHtml(d.bloco) + ' &middot; ' + feitosBloco + '/' + d.itens.length + '</span>' +
      '<button class="btn-chip cheio" onclick="MODULOS.avaliacoes.' + concluir + '()">Concluir aplicacao</button></div>' +
      '</div>';
  },
  irItem(i) { const d = this.itensCelular(); this._mIdx = Math.max(0, Math.min(d.itens.length - 1, i)); this.telaCelular(); },
  mudarBlocoCelular(v) {
    const av = this.avaliacao;
    if (av.protocolo === 'portage') { const [a, f] = v.split('|'); this._pArea = a; this._pFaixa = parseInt(f, 10); }
    else if (av.protocolo === 'ss') this._ssArea = v;
    else this.faixaAtual = v;
    this._mIdx = 0; this.telaCelular();
  },
  proximoBloco() {
    const d = this.itensCelular();
    const av = this.avaliacao;
    const atual = av.protocolo === 'portage' ? this._pArea + '|' + this._pFaixa : av.protocolo === 'ss' ? (this._ssArea || this.SS_AREAS[0]) : this.faixaAtual;
    const k = d.blocos.findIndex(b => b[0] === atual);
    if (k >= 0 && k < d.blocos.length - 1) this.mudarBlocoCelular(d.blocos[k + 1][0]);
    else popAviso('Este era o ultimo bloco. Se terminou, toque em Concluir aplicacao.');
  },
  async responderCelular(v) {
    const av = this.avaliacao;
    const d = this.itensCelular();
    const i = d.itens[this._mIdx]; if (!i) return;
    let error;
    if (av.protocolo === 'ss') {
      const pts = parseInt(v, 10);
      this.respSS[i.id] = pts;
      ({ error } = await sb.from('ss_respostas').upsert({ avaliacao_id: av.id, item_id: i.id, pontos: pts }, { onConflict: 'avaliacao_id,item_id' }));
    } else if (av.protocolo === 'portage') {
      this._pResp[i.id] = v;
      ({ error } = await sb.from('portage_respostas').upsert({ avaliacao_id: av.id, item_id: i.id, valor: v }, { onConflict: 'avaliacao_id,item_id' }));
    } else {
      this.respostas[i.id] = v;
      ({ error } = await sb.from('avaliacao_respostas').upsert({ avaliacao_id: av.id, questao_id: i.id, resposta: v }, { onConflict: 'avaliacao_id,questao_id' }));
    }
    if (error) { popAviso('Falha ao salvar: ' + error.message); return; }
    if (navigator.vibrate) navigator.vibrate(10);
    if (this._mIdx < d.itens.length - 1) this._mIdx++;
    this.telaCelular();
  },

  telaAplicacao() {
    const av = this.avaliacao;
    if (this.celular()) { this.telaCelular(); return; }

    const abasFaixas = this.FAIXAS.map(f => {
      const qs = this.questoes.filter(q => q.faixa === f);
      const resp = qs.filter(q => this.respostas[q.id]).length;
      return '<button class="aba' + (f === this.faixaAtual ? ' ativa' : '') + '" ' +
        'onclick="MODULOS.avaliacoes.trocarFaixa(\'' + f + '\')">' +
        f.replace(' anos', '').replace(' ano', '') +
        (resp ? ' <span class="feita">&#10003;' + resp + '</span>' : '') +
        '</button>';
    }).join('');

    const qsFaixa = this.questoes.filter(q => q.faixa === this.faixaAtual);
    let corpo = '';
    this.AREAS.forEach(area => {
      const qs = qsFaixa.filter(q => q.area === area);
      if (!qs.length) return;
      corpo += '<div class="cartao"><h3>' + area + '</h3>' +
        qs.map(q =>
          '<div class="campo questao"><label>' + escaparHtml(q.pergunta) + '</label>' +
          '<div class="segmento">' +
          [['S', 'Sim'], ['N', 'N&atilde;o'], ['NA', 'NA']].map(([v, r]) =>
            '<button type="button" class="seg' + (this.respostas[q.id] === v ? ' ativo' : '') + '" ' +
            'onclick="MODULOS.avaliacoes.responder(this, ' + q.id + ', \'' + v + '\')">' + r + '</button>'
          ).join('') +
          '</div></div>').join('') +
        '</div>';
    });

    this.el.innerHTML =
      '<div class="pagina-cabecalho">' +
      '  <div>' +
      this.voltarHtml() +
      '    <h2>QADI-R &middot; ' + escaparHtml(this.pacienteAtual.nome) + '</h2>' +
      '    <p class="sub">' + calcularIdade(this.pacienteAtual.data_nascimento) +
      ' &middot; Respostas salvas automaticamente. Aplique quantas faixas precisar.</p>' +
      '  </div>' +
      '  <div style="display:flex; gap:8px; align-items:center">' +
      '    <div class="segmento">' +
      '      <button type="button" class="seg' + (av.oral === true ? ' ativo' : '') + '" ' +
      '        onclick="MODULOS.avaliacoes.marcarOral(this, true)">Oral</button>' +
      '      <button type="button" class="seg' + (av.oral === false ? ' ativo' : '') + '" ' +
      '        onclick="MODULOS.avaliacoes.marcarOral(this, false)">N&atilde;o Oral</button>' +
      '    </div>' +
      '    <button class="btn btn-primario" onclick="MODULOS.avaliacoes.concluir()">Concluir</button>' +
      '  </div>' +
      '</div>' +
      '<div class="abas">' + abasFaixas + '</div>' +
      corpo +
      '<div class="cartao"><div class="campo" style="margin:0"><label>Observacoes</label>' +
      '<textarea id="av-obs" rows="3" oninput="MODULOS.avaliacoes.salvarObs()" ' +
      'style="resize:vertical">' + escaparHtml(av.observacoes || '') + '</textarea></div></div>';
  },

  trocarFaixa(f) {
    this.faixaAtual = f;
    this.telaAplicacao();
    window.scrollTo({ top: 0 });
  },

  async responder(botao, questaoId, valor) {
    const anterior = this.respostas[questaoId];
    this.respostas[questaoId] = valor;
    botao.parentElement.querySelectorAll('.seg').forEach(b => b.classList.remove('ativo'));
    botao.classList.add('ativo');

    const { error } = await sb.from('avaliacao_respostas').upsert(
      { avaliacao_id: this.avaliacao.id, questao_id: questaoId, resposta: valor },
      { onConflict: 'avaliacao_id,questao_id' });
    if (error) {
      this.respostas[questaoId] = anterior;
      alert('Falha ao salvar: ' + error.message);
    }
  },

  async marcarOral(botao, valor) {
    this.avaliacao.oral = valor;
    botao.parentElement.querySelectorAll('.seg').forEach(b => b.classList.remove('ativo'));
    botao.classList.add('ativo');
    { const { error: _e } = await sb.from('avaliacoes').update({ oral: valor }).eq('id', this.avaliacao.id); if (_e) popAviso('Nao foi possivel gravar (avaliacoes): ' + _e.message); }
  },

  _obsTimer: null,
  salvarObs() {
    clearTimeout(this._obsTimer);
    this._obsTimer = setTimeout(async () => {
      const v = document.getElementById('av-obs').value;
      this.avaliacao.observacoes = v;
      { const { error: _e } = await sb.from('avaliacoes').update({ observacoes: v }).eq('id', this.avaliacao.id); if (_e) popAviso('Nao foi possivel gravar (avaliacoes): ' + _e.message); }
    }, 600);
  },

  async concluir() {
    const respondidas = Object.keys(this.respostas).length;
    if (respondidas === 0) { alert('Nenhuma resposta registrada ainda.'); return; }
    if (!await popConfirmar('Concluir a avaliacao com ' + respondidas + ' resposta(s)? ' +
      'Depois de concluida ela fica somente leitura.')) return;

    const { error } = await sb.from('avaliacoes')
      .update({ status: 'concluida', concluido_em: new Date().toISOString() })
      .eq('id', this.avaliacao.id);
    if (error) { alert('Erro: ' + error.message); return; }
    this.telaResultado(this.avaliacao.id);
  },

  // ───────────────────────── RESULTADO ─────────────────────────

  async telaResultado(avaliacaoId) {
    this.el.innerHTML =
      this.voltarHtml() +
      '<div id="av-resultado"><div class="cartao"><p class="sub">Calculando...</p></div></div>';
    document.getElementById('av-resultado').innerHTML = await this.htmlResultado(avaliacaoId);
  },

  // Reutilizado pela aba Avaliacao do prontuario
  // Botao "Devolutiva" da ultima aplicacao concluida do protocolo (qualquer protocolo)
  // Devolutiva antiga (Sprint 8) desativada: o Relatorio de Avaliacao (laudo_avaliacao) a substitui.
  btnDevolutiva(concluidas, protocolo) {
    return '';
    // eslint-disable-next-line no-unreachable
    if (perm('pei.devolutiva') !== 'E') return '';
    const lista = concluidas.filter(a => a.protocolo === protocolo)
      .sort((a, b) => String(b.concluido_em || '').localeCompare(String(a.concluido_em || '')));
    if (!lista.length) return '';
    return '<button class="btn-chip" title="Relatorio de devolutiva desta avaliacao" ' +
      'onclick="MODULOS.pei.abrirDevolutiva(\'' + lista[0].id + '\')">Devolutiva</button>';
  },

  async htmlResultadoPortage(av) {
    await this.carregarItensPortage();
    const { data: resps } = await sb.from('portage_respostas')
      .select('item_id, valor').eq('avaliacao_id', av.id);
    const mapa = {};
    (resps || []).forEach(r => { mapa[r.item_id] = r.valor; });
    const areas = this.calcPortage(mapa);
    const idadeGlobal = areas.reduce((s, a) => s + a.idade, 0) / this.P_AREAS.length;
    return '<div class="cartao"><h3>Resultado do Portage' +
      (av.concluido_em ? ' <small class="sub">&middot; ' + new Date(av.concluido_em).toLocaleDateString('pt-BR') + '</small>' : '') + '</h3>' +
      this.gTabela(['Area'].concat(this.P_FAIXAS.map(f => f.split(' ')[0])).concat(['Total', 'Idade desenv.']),
        areas.map(a => [a.area].concat(a.faixas.map(x => x === null ? null : x.pct + '%'))
          .concat([a.total === null ? null : '<b>' + a.total + '%</b>', '<b>' + this.fmtIdade(a.idade) + '</b>']))
        .concat([['<b>Idade global</b>'].concat(this.P_FAIXAS.map(() => '')).concat(['', '<b>' + this.fmtIdade(idadeGlobal) + '</b>'])])) +
      '<div style="margin-top:10px">' + this.gBarras(this.P_AREAS, [{ nome: 'Total', cor: '#1468B2',
        valores: areas.map(a => a.total === null ? null : a.total) }]) + '</div>' +
      '</div>';
  },

  async htmlResultado(avaliacaoId) {
    await this.carregarQuestoes();

    const { data: av } = await sb.from('avaliacoes')
      .select('*, paciente_id, pacientes(nome, data_nascimento), avaliador:profiles!avaliacoes_avaliador_id_fkey(nome)')
      .eq('id', avaliacaoId).single();
    if (!av) return '<div class="cartao"><p class="sub">Avaliacao nao encontrada.</p></div>';
    if (av.protocolo === 'ss') return this.htmlResultadoSS(av);
    if (av.protocolo === 'portage') return this.htmlResultadoPortage(av);

    const { data: resps } = await sb.from('avaliacao_respostas')
      .select('questao_id, resposta').eq('avaliacao_id', avaliacaoId);
    const mapa = {};
    (resps || []).forEach(r => { mapa[r.questao_id] = r.resposta; });

    // Faixas com pelo menos uma resposta
    const faixasAplicadas = this.FAIXAS.filter(f =>
      this.questoes.some(q => q.faixa === f && mapa[q.id]));

    let tabela = '<table class="tabela-presenca"><thead><tr><th>Area</th>' +
      faixasAplicadas.map(f => '<th class="centro">' +
        f.replace(' anos', 'a').replace(' ano', 'a').replace(' a ', '&ndash;') + '</th>').join('') +
      '<th class="centro">Geral</th></tr></thead><tbody>';

    this.AREAS.forEach(area => {
      let gs = 0, gv = 0;
      let linha = '<tr><td>' + area + '</td>';
      faixasAplicadas.forEach(f => {
        const qs = this.questoes.filter(q => q.faixa === f && q.area === area);
        const sim = qs.filter(q => mapa[q.id] === 'S').length;
        const validas = qs.filter(q => mapa[q.id] === 'S' || mapa[q.id] === 'N').length;
        gs += sim; gv += validas;
        linha += '<td class="centro">' +
          (validas ? Math.round(sim * 100 / validas) + '%<br><small style="color:var(--ink-soft)">' +
            sim + '/' + validas + '</small>' : '&mdash;') + '</td>';
      });
      linha += '<td class="centro"><b>' +
        (gv ? Math.round(gs * 100 / gv) + '%' : '&mdash;') + '</b></td></tr>';
      tabela += linha;
    });
    tabela += '</tbody></table>';

    const totalResp = Object.keys(mapa).length;
    const na = Object.values(mapa).filter(v => v === 'NA').length;

    return '<div class="cartao faixa-ambar">' +
      '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; flex-wrap:wrap; gap:8px">' +
      '<h3 style="margin:0">QADI-R &middot; ' + escaparHtml(av.pacientes.nome) + '</h3>' +
      '<div class="pac-selos">' +
      (av.oral === true ? '<span class="selo selo-roxo">Oral</span>' :
       av.oral === false ? '<span class="selo selo-roxo">Nao Oral</span>' : '') +
      (av.status === 'concluida'
        ? '<span class="selo selo-ok">Concluida em ' + new Date(av.concluido_em).toLocaleDateString('pt-BR') + '</span>'
        : '<span class="selo selo-warn">Em andamento</span>') +
      '</div></div>' +
      '<div class="grade-visao" style="margin-bottom:14px">' +
      '<div class="caixa-info"><small>Avaliador</small><b>' +
      escaparHtml(av.avaliador ? av.avaliador.nome : '-') + '</b></div>' +
      '<div class="caixa-info"><small>Respostas</small><b>' + totalResp +
      (na ? ' (' + na + ' NA)' : '') + '</b></div>' +
      '<div class="caixa-info"><small>Faixas aplicadas</small><b>' +
      (faixasAplicadas.length ? faixasAplicadas.join(' &middot; ') : '-') + '</b></div>' +
      '</div>' +
      '<p class="sub" style="margin-bottom:8px">Percentual de SIM sobre as respostas validas (NA excluido).</p>' +
      tabela +
      (av.observacoes
        ? '<div class="caixa-info larga" style="margin-top:14px"><small>Observacoes</small><b>' +
          escaparHtml(av.observacoes) + '</b></div>'
        : '') +
      (av.status === 'concluida' && perm('pei') === 'E'
        ? '<div class="barra-acoes nao-imprime" style="margin-top:14px">' +
          '<span class="sub">O Relatorio de Avaliacao sai pelo botao Relatorio da aba Avaliacao; o PEI e elaborado na aba PEI do prontuario.</span>' +
          '</div>'
        : '') +
      '</div>';
  },

  // Lista de avaliacoes de um paciente (aba do prontuario)
  async htmlDoPaciente(pacienteId) {
    this._pacAtualId = pacienteId;
    const { data } = await sb.from('avaliacoes')
      .select('id, protocolo, status, iniciado_em, concluido_em, origem, observacoes')
      .eq('paciente_id', pacienteId)
      .order('iniciado_em', { ascending: false });

    const podeQadi = perm('avaliacoes.qadi') === 'E';
    const podeSS = perm('avaliacoes.ss') === 'E' || perm('evolucao') === 'E';
    const podePortage = perm('avaliacoes.portage') === 'E';
    let acoes = '';
    if (podeQadi || podeSS || podePortage) {
      acoes = '<div class="aba-acoes">' +
        (podeQadi
          ? '<button class="btn btn-primario" title="Inicia uma aplicacao QADI-R deste paciente, em janela por cima do prontuario." ' +
            'onclick="MODULOS.avaliacoes.iniciarDoProntuario(\'' + pacienteId + '\', \'qadi\')">+ QADI-R</button>' : '') +
        (podeSS
          ? '<button class="btn btn-primario" ' +
            'title="Inicia uma aplicacao Socially Savvy deste paciente, em janela por cima do prontuario." ' +
            'onclick="MODULOS.avaliacoes.iniciarDoProntuario(\'' + pacienteId + '\', \'ss\')">+ Socially Savvy</button>' : '') +
        (podePortage
          ? '<button class="btn btn-primario" title="Guia Portage: 479 itens em 5 areas por faixa etaria (Sim / As vezes / Nao / NA)." ' +
            'onclick="MODULOS.avaliacoes.iniciarDoProntuario(\'' + pacienteId + '\', \'portage\')">+ Portage</button>' : '') +
        '</div>';
    }

    if (!data || data.length === 0) {
      return acoes + '<div class="cartao"><div class="vazio"><div class="simbolo-vazio">&#9998;</div>' +
        '<strong>Nenhuma avaliacao aplicada</strong>' +
        (podeSS ? 'Inicie o QADI-R ou o Socially Savvy pelos botoes acima.' :
          'As aplicacoes aparecem aqui quando a equipe avaliar.') + '</div></div>';
    }

    const abertas = data.filter(x => x.status !== 'concluida');
    if (abertas.length) {
      acoes += '<div class="cartao faixa-ambar"><h3>Em andamento</h3>' +
        abertas.map(x =>
          '<div class="linha-doc"><div><b>' + (x.protocolo === 'ss' ? 'Socially Savvy' : x.protocolo === 'portage' ? 'Portage' : 'QADI-R') + '</b>' +
          '<small>Iniciada em ' + new Date(x.iniciado_em).toLocaleDateString('pt-BR') + '</small></div>' +
          '<div class="pac-selos">' +
          (perm('avaliacoes.cancelar') === 'E'
            ? '<button class="btn-chip" title="Cancelar e apagar esta aplicacao" onclick="MODULOS.avaliacoes.cancelarAvaliacao(\'' + x.id + '\', \'' +
              (x.protocolo === 'ss' ? 'Socially Savvy' : x.protocolo === 'portage' ? 'Portage' : 'QADI-R') + '\', \'' + pacienteId + '\')">&#10005; Cancelar</button>' : '') +
          '<button class="btn-chip cheio" onclick="MODULOS.avaliacoes.abrirJanela(\'' + x.id + '\')">Continuar</button>' +
          '</div></div>').join('') + '</div>';
    }

    const concluidas = data.filter(x => x.status === 'concluida');
    // relatorios de avaliacao ja gerados (para trocar "Relatorio" por "Documento")
    const { data: rels } = await sb.from('relatorios_avaliacao').select('id, avaliacao_id, avaliacoes_ids, tipo, status').eq('paciente_id', pacienteId);
    this._relAv = rels || [];
    this._pacRelAv = pacienteId;
    let html = acoes;
    // Avaliacoes registradas fora do sistema (quadro geral importado): entram no vencimento, sem documento
    const externas = concluidas.filter(x => x.origem === 'importado');
    if (externas.length) {
      const NOME_PROT = { ss: 'Socially Savvy', qadi: 'QADI-R', portage: 'Portage', vbmapp: 'VB-MAPP', ipo: 'IPO + QI', interno: 'Protocolo interno' };
      html += '<div class="cartao faixa-roxo"><h3>Registradas fora do sistema <span class="selo selo-roxo">' + externas.length + '</span></h3>' +
        '<p class="sub" style="margin-bottom:6px">Importadas do quadro geral da coordenacao: contam para o vencimento (6 meses), mas nao tem itens nem documento aqui.</p>' +
        externas.map(x =>
          '<div class="linha-doc"><div><b>' + (NOME_PROT[x.protocolo] || x.protocolo.toUpperCase()) + '</b>' +
          '<small>Aplicada em ' + new Date(x.concluido_em).toLocaleDateString('pt-BR') +
          (x.observacoes ? ' &middot; ' + escaparHtml(x.observacoes.replace(/^Importado[^-]*- /, '')) : '') + '</small></div>' +
          '<span class="selo selo-neutro">externa</span></div>').join('') + '</div>';
    }
    if (concluidas.length) {
      const temSS = concluidas.some(x => x.protocolo === 'ss');
      const nSS = concluidas.filter(x => x.protocolo === 'ss').length;
      html += '<div class="cartao"><h3>Concluidas <span class="selo selo-neutro">' + concluidas.length + '</span></h3>' +
        '<p class="sub" style="margin-bottom:8px">Os resultados vivem nos documentos oficiais: gere e imprima ou envie ao portal.</p>' +
        (MODULOS.laudo_avaliacao.btnCompleto(concluidas) ? '<div style="margin-bottom:10px">' + MODULOS.laudo_avaliacao.btnCompleto(concluidas) + '</div>' : '') +
        (temSS
          ? '<div class="linha-doc"><div><b>Socially Savvy &middot; consolidado</b>' +
            '<small>' + nSS + ' aplicacao(oes) (AV1' + (nSS > 1 ? '-AV' + Math.min(nSS, 9) : '') + ') com datas, areas e graficos</small></div>' +
            '<div class="pac-selos">' +
            '<button class="btn btn-fantasma" onclick="MODULOS.avaliacoes.docSS(\'' + pacienteId + '\')">&#128202; Consolidado</button>' +
            this.btnDevolutiva(concluidas, 'ss') + MODULOS.laudo_avaliacao.btn(concluidas, 'ss') +
            '</div>' +
            '</div>'
          : '') +
        (concluidas.some(a => a.protocolo === 'portage')
          ? '<div class="linha-doc"><div><b>Portage &middot; consolidado</b>' +
            '<small>' + concluidas.filter(a => a.protocolo === 'portage').length +
            ' aplicacao(oes) &middot; % por faixa etaria e idades de desenvolvimento</small></div>' +
            '<div class="pac-selos">' +
            '<button class="btn btn-fantasma" onclick="MODULOS.avaliacoes.docPortage(\'' + pacienteId + '\')">&#128202; Consolidado</button>' +
            this.btnDevolutiva(concluidas, 'portage') + MODULOS.laudo_avaliacao.btn(concluidas, 'portage') +
            '</div></div>'
          : '') +
        (concluidas.some(a => a.protocolo === 'qadi')
          ? '<div class="linha-doc"><div><b>QADI-R &middot; consolidado</b>' +
            '<small>' + concluidas.filter(a => a.protocolo === 'qadi').length +
            ' aplicacao(oes) &middot; pontuacao adquirida x esperada por area (regra Equilibrium)</small></div>' +
            '<div class="pac-selos">' +
            '<button class="btn btn-fantasma" onclick="MODULOS.avaliacoes.docQADI(\'' + pacienteId + '\')">&#128202; Consolidado</button>' +
            this.btnDevolutiva(concluidas, 'qadi') + MODULOS.laudo_avaliacao.btn(concluidas, 'qadi') +
            '</div></div>'
          : '') +
        '</div>';
    }
    html += this.htmlApagarAvaliacoes(concluidas);
    return html;
  },

  // ─────────────── Apagar avaliacoes concluidas para refazer (so coordenacao/direcao) ───────────────
  podeApagarAv() {
    const p = window.CORTEX_SESSAO && window.CORTEX_SESSAO.profile;
    if (!p) return false;
    if (typeof CORTEX_PERM_TUDO !== 'undefined' && CORTEX_PERM_TUDO) return true;
    return ['coordenador', 'direcao'].includes(p.perfil) && perm('avaliacoes.cancelar') === 'E';
  },
  htmlApagarAvaliacoes(concluidas) {
    if (!this.podeApagarAv() || !concluidas.length) return '';
    const NOME = { ss: 'Socially Savvy', qadi: 'QADI-R', portage: 'Portage', vbmapp: 'VB-MAPP', ipo: 'IPO + QI', interno: 'Protocolo interno' };
    const fmt = d => d ? new Date(d).toLocaleDateString('pt-BR') : '-';
    const rels = this._relAv || [];
    const ord = concluidas.slice().sort((a, b) => String(b.concluido_em || '').localeCompare(String(a.concluido_em || '')));
    return '<div class="cartao faixa-vermelho"><h3>Apagar avaliacoes <small class="sub">&middot; coordenacao</small></h3>' +
      '<p class="sub" style="margin-bottom:8px">Marque a(s) avaliacao(oes) que precisam ser feitas de novo. Apagar tira a aplicacao, todas as respostas e os relatorios de avaliacao ligados a ela. Nao tem volta.</p>' +
      ord.map(x => {
        const nRel = rels.filter(r => (r.avaliacoes_ids && r.avaliacoes_ids.length ? r.avaliacoes_ids : [r.avaliacao_id]).includes(x.id)).length;
        return '<label class="linha-doc" style="cursor:pointer"><input type="checkbox" class="av-apagar-chk" value="' + x.id + '" style="margin-right:10px">' +
          '<div style="flex:1"><b>' + (NOME[x.protocolo] || x.protocolo) + '</b><small>Concluida em ' + fmt(x.concluido_em) +
          (x.origem === 'importado' ? ' &middot; externa' : '') + (nRel ? ' &middot; ' + nRel + ' relatorio(s) de avaliacao' : '') + '</small></div></label>';
      }).join('') +
      '<div class="barra-acoes" style="margin-top:8px"><button class="btn btn-fantasma" onclick="MODULOS.avaliacoes.apagarAvaliacoesSelecionadas()">&#10005; Apagar selecionadas</button></div>' +
      '</div>';
  },
  async apagarAvaliacoesSelecionadas() {
    const ids = [...document.querySelectorAll('.av-apagar-chk:checked')].map(c => c.value);
    if (!ids.length) { popAviso('Marque ao menos uma avaliacao para apagar.'); return; }
    if (!await popConfirmar('Apagar ' + ids.length + ' avaliacao(oes)?\n\nSomem a aplicacao, todas as respostas e os relatorios de avaliacao feitos a partir dela. O que ja foi enviado ao portal ou assinado em PDF continua guardado. Esta acao nao tem volta.',
      { titulo: 'Apagar avaliacoes', ok: 'Apagar de vez', cancelar: 'Voltar' })) return;
    if (!await popConfirmar('Tem certeza? Vai apagar ' + ids.length + ' avaliacao(oes) deste paciente.', { titulo: 'Ultima confirmacao', ok: 'Sim, apagar' })) return;
    const rels = (this._relAv || []).filter(r => (r.avaliacoes_ids && r.avaliacoes_ids.length ? r.avaliacoes_ids : [r.avaliacao_id]).some(id => ids.includes(id))).map(r => r.id);
    const passo = async (tabela, q) => { const { error } = await q; if (error) throw new Error(tabela + ': ' + error.message); };
    try {
      if (rels.length) await passo('relatorios_avaliacao', sb.from('relatorios_avaliacao').delete().in('id', rels));
      await passo('relatorios_devolutiva', sb.from('relatorios_devolutiva').delete().in('avaliacao_id', ids));
      for (const t of ['avaliacao_respostas', 'ss_respostas', 'portage_respostas']) await passo(t, sb.from(t).delete().in('avaliacao_id', ids));
      const { error, count } = await sb.from('avaliacoes').delete({ count: 'exact' }).in('id', ids);
      if (error) throw new Error('avaliacoes: ' + error.message);
      if (!count) { popAviso('Nada foi apagado: sem permissao no banco (policy avaliacoes_apagar_gestao).'); return; }
      popAviso(count + ' avaliacao(oes) apagada(s).');
    } catch (e) {
      popAviso('Nao consegui apagar (' + e.message + '). Se falar em chave estrangeira, existe PEI ou outro registro ligado a essa avaliacao.');
      return;
    }
    if (this._pacRelAv) MODULOS.pacientes.telaDetalhe(this._pacRelAv, 'avaliacao');
  },

  // ═══════════ DOCUMENTOS OFICIAIS DAS AVALIACOES (identidade Equilibrium) ═══════════

  cabecalhoDoc(titulo, sub) {
    return '<div class="deq-cab">' +
      '  <img src="icones/equilibrium.png" alt="Equilibrium">' +
      '  <div class="deq-cab-t"><h1>' + titulo + '</h1><p>Equilibrium Terapia Infantil &middot; ' + sub + '</p></div>' +
      '</div>';
  },

  rodapeDoc() {
    return '<div class="deq-rodape">' +
      '  <span>Equilibrium Terapia Infantil &middot; Uberl&acirc;ndia/MG</span>' +
      '  <span class="pontos"><i style="background:var(--eq-teal)"></i><i style="background:var(--eq-amarelo)"></i>' +
      '<i style="background:var(--eq-rosa)"></i><i style="background:var(--eq-azul)"></i></span>' +
      '  <span>Gerado pelo CORTEX aba &middot; ' + new Date().toLocaleDateString('pt-BR') + '</span>' +
      '</div>';
  },

  abrirDocOverlay(titulo) {
    document.getElementById('doc-eq-overlay')?.remove();
    const ov = document.createElement('div');
    ov.id = 'doc-eq-overlay';
    ov.className = 'folha-overlay';
    ov.innerHTML = '<div class="folha-pagina" id="doc-eq-corpo" style="max-width:960px">' +
      '<p class="sub">Montando o documento...</p></div>';
    document.body.appendChild(ov);
    return ov;
  },

  // Cores do catavento para as aplicacoes AV1..AV4+
  COR_AV: ['#1468B2', '#56C4CF', '#F3B63D', '#E9586A', '#7C6FD0', '#3E9C6E'],

  // ═══════════ GRAFICOS SVG DOS DOCUMENTOS (formato das planilhas, cores Equilibrium) ═══════════
  // series: [{ nome, cor, valores: [n|null] }] ; categorias: ['...'] ; opc: { max, unidade, altura, fmt }
  COR_AREA: ['#1468B2', '#56C4CF', '#F3B63D', '#E9586A', '#7C6FD0', '#3E9C6E', '#E07A2F'],

  _gRotulo(texto, x, y, extra) {
    // quebra rotulos longos em 2 linhas
    const partes = String(texto).split(' ');
    if (partes.length < 2 || texto.length <= 12) {
      return '<text x="' + x + '" y="' + y + '" text-anchor="middle" ' + extra + '>' + escaparHtml(texto) + '</text>';
    }
    const meio = Math.ceil(partes.length / 2);
    return '<text x="' + x + '" y="' + y + '" text-anchor="middle" ' + extra + '>' +
      '<tspan x="' + x + '" dy="0">' + escaparHtml(partes.slice(0, meio).join(' ')) + '</tspan>' +
      '<tspan x="' + x + '" dy="10">' + escaparHtml(partes.slice(meio).join(' ')) + '</tspan></text>';
  },

  _gLegenda(series, W, y) {
    let x = 8, out = '';
    series.forEach(s => {
      out += '<rect x="' + x + '" y="' + (y - 8) + '" width="10" height="10" rx="2" fill="' + s.cor + '"/>' +
        '<text x="' + (x + 14) + '" y="' + y + '" font-size="9.5" font-weight="700" fill="#475569">' + escaparHtml(s.nome) + '</text>';
      x += 22 + s.nome.length * 5.6;
    });
    return out;
  },

  _gEixo(W, H, ESQ, DIR, TOPO, BASE, max, unidade) {
    const y = v => BASE - (v / max) * (BASE - TOPO);
    const passos = max === 100 ? [0, 25, 50, 75, 100] : [0, .25, .5, .75, 1].map(f => Math.round(max * f));
    return passos.map(g =>
      '<line x1="' + ESQ + '" y1="' + y(g) + '" x2="' + (W - DIR) + '" y2="' + y(g) + '" stroke="#E2E8F0" stroke-dasharray="3 4"/>' +
      '<text x="' + (ESQ - 6) + '" y="' + (y(g) + 3) + '" text-anchor="end" font-size="9" fill="#94A3B8">' + g + (unidade || '') + '</text>').join('');
  },

  gBarras(categorias, series, opc) {
    opc = opc || {};
    const max = opc.max || 100, un = opc.unidade === undefined ? '%' : opc.unidade;
    const fmt = opc.fmt || (v => v + un);
    const W = 680, H = opc.altura || 230, ESQ = 40, DIR = 10, TOPO = 22, BASE = H - 44;
    const y = v => BASE - (Math.min(v, max) / max) * (BASE - TOPO);
    const nC = categorias.length, nS = series.length;
    const larguraCat = (W - ESQ - DIR) / nC;
    const gap = Math.max(4, larguraCat * 0.18);
    const larguraBarra = Math.min(34, (larguraCat - gap) / nS);
    let svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%; height:auto; font-family:inherit">' +
      this._gEixo(W, H, ESQ, DIR, TOPO, BASE, max, un);
    categorias.forEach((cat, ci) => {
      if (ci % 2 === 0) svg += '<rect x="' + (ESQ + ci * larguraCat) + '" y="' + TOPO + '" width="' + larguraCat + '" height="' + (BASE - TOPO) + '" fill="#F5F8FB"/>';
      const x0 = ESQ + ci * larguraCat + (larguraCat - larguraBarra * nS) / 2;
      series.forEach((s, si) => {
        const v = s.valores[ci];
        if (v === null || v === undefined) return;
        const x = x0 + si * larguraBarra;
        const cor = (nS === 1 && opc.porCategoria !== false) ? this.COR_AREA[ci % this.COR_AREA.length] : s.cor;
        svg += '<rect x="' + x + '" y="' + y(v) + '" width="' + (larguraBarra - 2) + '" height="' + (BASE - y(v)) +
          '" rx="3" fill="' + cor + '"/>';
        // rotulo do valor: normal em barras largas; vertical dentro da barra quando estreitas
        if (larguraBarra >= 22) {
          svg += '<text x="' + (x + (larguraBarra - 2) / 2) + '" y="' + (y(v) - 4) + '" text-anchor="middle" font-size="8.5" font-weight="800" fill="' + cor + '">' + fmt(v) + '</text>';
        } else if (BASE - y(v) > 26) {
          const cx = x + (larguraBarra - 2) / 2, cy = y(v) + 6;
          svg += '<text transform="translate(' + cx + ' ' + cy + ') rotate(90)" text-anchor="start" font-size="7.5" font-weight="800" fill="#fff">' + fmt(v) + '</text>';
        }
      });
      svg += this._gRotulo(cat, ESQ + ci * larguraCat + larguraCat / 2, BASE + 12, 'font-size="9" font-weight="700" fill="#475569"');
    });
    svg += '<line x1="' + ESQ + '" y1="' + BASE + '" x2="' + (W - DIR) + '" y2="' + BASE + '" stroke="#CBD5E1"/>';
    if (nS > 1 || opc.legenda) svg += this._gLegenda(series, W, H - 6);
    return svg + '</svg>';
  },

  gLinhas(categorias, series, opc) {
    opc = opc || {};
    const max = opc.max || 100, un = opc.unidade === undefined ? '%' : opc.unidade;
    const fmt = opc.fmt || (v => v + un);
    const W = 680, H = opc.altura || 220, ESQ = 64, DIR = 60, TOPO = 22, BASE = H - 44;
    const y = v => BASE - (Math.min(v, max) / max) * (BASE - TOPO);
    const nC = categorias.length;
    const passo = nC > 1 ? (W - ESQ - DIR) / (nC - 1) : 0;
    const x = i => nC > 1 ? ESQ + i * passo : (ESQ + W - DIR) / 2;
    let svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%; height:auto; font-family:inherit">' +
      this._gEixo(W, H, ESQ, DIR, TOPO, BASE, max, un);
    categorias.forEach((cat, i) =>
      svg += this._gRotulo(cat, x(i), BASE + 12, 'font-size="9" font-weight="700" fill="#475569"'));
    series.forEach(s => {
      const pts = s.valores.map((v, i) => (v === null || v === undefined) ? null : x(i) + ',' + y(v)).filter(Boolean);
      if (pts.length > 1) {
        const p0 = pts[0].split(',')[0], pN = pts[pts.length - 1].split(',')[0];
        svg += '<polygon fill="' + s.cor + '" fill-opacity="' + (series.length === 1 ? '.14' : '.06') + '" points="' + p0 + ',' + BASE + ' ' + pts.join(' ') + ' ' + pN + ',' + BASE + '"/>';
      }
      svg += '<polyline fill="none" stroke="' + s.cor + '" stroke-width="2.5" stroke-linejoin="round" points="' + pts.join(' ') + '"/>';
      s.valores.forEach((v, i) => {
        if (v === null || v === undefined) return;
        const cor = (series.length === 1 && opc.porCategoria !== false) ? this.COR_AREA[i % this.COR_AREA.length] : s.cor;
        svg += '<circle cx="' + x(i) + '" cy="' + y(v) + '" r="5.5" fill="' + cor + '" stroke="#fff" stroke-width="2"/>' +
          '<text x="' + x(i) + '" y="' + (y(v) - 9) + '" text-anchor="middle" font-size="8.5" font-weight="800" fill="' + cor + '">' + fmt(v) + '</text>';
      });
    });
    svg += '<line x1="' + ESQ + '" y1="' + BASE + '" x2="' + (W - DIR) + '" y2="' + BASE + '" stroke="#CBD5E1"/>';
    if (series.length > 1 || opc.legenda) svg += this._gLegenda(series, W, H - 6);
    return svg + '</svg>';
  },

  gRadar(categorias, series, opc) {
    opc = opc || {};
    const max = opc.max || 100;
    const W = 680, H = 300, CX = W / 2, CY = 140, R = 100;
    const n = categorias.length;
    const ang = i => -Math.PI / 2 + (2 * Math.PI * i) / n;
    const pt = (i, v) => (CX + Math.cos(ang(i)) * R * v / max) + ',' + (CY + Math.sin(ang(i)) * R * v / max);
    let svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%; height:auto; font-family:inherit">';
    [25, 50, 75, 100].forEach(g => {
      svg += '<polygon fill="none" stroke="#E2E8F0" points="' + categorias.map((c, i) => pt(i, g)).join(' ') + '"/>';
      svg += '<text x="' + (CX + 4) + '" y="' + (CY - R * g / max + 3) + '" font-size="8" fill="#94A3B8">' + g + '%</text>';
    });
    categorias.forEach((c, i) => {
      const corA = this.COR_AREA[i % this.COR_AREA.length];
      svg += '<line x1="' + CX + '" y1="' + CY + '" x2="' + pt(i, max).replace(',', '" y2="') + '" stroke="' + corA + '" stroke-opacity=".35"/>';
      const lx = CX + Math.cos(ang(i)) * (R + 22), ly = CY + Math.sin(ang(i)) * (R + 22);
      svg += this._gRotulo(c, lx, ly + 3, 'font-size="9" font-weight="800" fill="' + corA + '"');
    });
    series.forEach(s => {
      svg += '<polygon fill="' + s.cor + '" fill-opacity="' + (series.length === 1 ? '.22' : '.14') + '" stroke="' + s.cor + '" stroke-width="2.5" stroke-linejoin="round" points="' +
        categorias.map((c, i) => pt(i, s.valores[i] || 0)).join(' ') + '"/>';
      categorias.forEach((c, i) => {
        const [px, py] = pt(i, s.valores[i] || 0).split(',');
        const cor = series.length === 1 ? this.COR_AREA[i % this.COR_AREA.length] : s.cor;
        svg += '<circle cx="' + px + '" cy="' + py + '" r="5" fill="' + cor + '" stroke="#fff" stroke-width="2"/>' +
          '<text x="' + px + '" y="' + (parseFloat(py) - 8) + '" text-anchor="middle" font-size="8" font-weight="800" fill="' + cor + '">' + (s.valores[i] || 0) + '%</text>';
      });
    });
    svg += this._gLegenda(series, W, H - 8);
    return svg + '</svg>';
  },

  // tabela colorida: cab = ['Area', 'AV1', ...]; linhas = [['Nome', v, v...]]; cores = cor por coluna (opcional)
  gTabela(cab, linhas, cores) {
    return '<table class="deq-freq deq-graf-tab"><tr>' +
      cab.map((c, i) => '<th' + (i === 0 ? ' style="text-align:left; padding-left:10px"' : '') +
        (cores && cores[i] ? ' style="background:' + cores[i] + '"' : '') + '>' + c + '</th>').join('') + '</tr>' +
      linhas.map((l, li) => '<tr>' + l.map((v, i) =>
        '<td style="' + (i === 0 ? 'text-align:left; padding:6px 10px; font-weight:700' : 'width:auto') + '">' +
        (i === 0 && li < linhas.length - 1 && !/^<b>/.test(String(v))
          ? '<i class="deq-bolinha" style="background:' + this.COR_AREA[li % this.COR_AREA.length] + '"></i>' : '') +
        (v === null || v === undefined ? '&mdash;' : v) + '</td>').join('') + '</tr>').join('') + '</table>';
  },


  async docSS(pacienteId) {
    await this.carregarItensSS();
    const ov = this.abrirDocOverlay();

    const [rAvs, rPac] = await Promise.all([
      sb.from('avaliacoes').select('id, concluido_em, contexto, duracao, areas_excluidas, avaliador:profiles!avaliacoes_avaliador_id_fkey(nome)')
        .eq('paciente_id', pacienteId).eq('protocolo', 'ss').eq('status', 'concluida')
        .order('concluido_em'),
      sb.from('pacientes').select('nome, data_nascimento').eq('id', pacienteId).single()
    ]);
    const avs = rAvs.data || [];
    const pac = rPac.data;
    if (!avs.length || !pac) { ov.remove(); return; }

    const { data: resps } = await sb.from('ss_respostas')
      .select('avaliacao_id, item_id, pontos').in('avaliacao_id', avs.map(a => a.id));
    const mapa = {};
    (resps || []).forEach(r => { mapa[r.avaliacao_id + '|' + r.item_id] = r.pontos; });

    // % por area em cada AV + total (area nao aplicada na AV = null; NA por item fora da conta)
    const AREAS = this.SS_AREAS.filter(area => avs.some(av => this.ssAreasDe(av).includes(area)));
    const dados = avs.map(av => {
      const aplicadas = this.ssAreasDe(av);
      const porArea = AREAS.map(area => {
        if (!aplicadas.includes(area)) return { area, pct: null, r: 0, max: 0 };
        const itens = this.itensSS.filter(i => i.area === area);
        const m = {}; itens.forEach(i => { if (mapa[av.id + '|' + i.id] !== undefined) m[i.id] = mapa[av.id + '|' + i.id]; });
        const p = this.ssPontuar(itens, m);
        return { area, pct: p.pct === null ? 0 : p.pct, r: p.r, max: p.max };
      });
      const totR = porArea.reduce((s, x) => s + x.r, 0);
      const totM = porArea.reduce((s, x) => s + x.max, 0);
      return { av, porArea, total: totM ? Math.round(totR * 100 / totM) : 0 };
    });

    const fmtD = d => new Date(d).toLocaleDateString('pt-BR');

    // Tabela + graficos no formato da planilha SS (CONSOLIDADO): barras agrupadas, linhas e radar por AV
    const seriesAV = dados.map((d, i) => ({
      nome: 'AV' + (i + 1) + ' (' + fmtD(d.av.concluido_em) + ')', cor: this.COR_AV[i % 6],
      valores: AREAS.map(area => d.porArea.find(p => p.area === area).pct)
    }));
    const naoAplicadas = this.SS_AREAS.filter(a => !AREAS.includes(a));
    const tabSS = this.gTabela(
      ['&Aacute;rea'].concat(dados.map((d, i) => 'AV' + (i + 1))),
      AREAS.map(area => [area].concat(dados.map(d => {
        const x = d.porArea.find(p => p.area === area); return x.pct === null ? null : x.pct + '% <small>(' + x.r + '/' + x.max + ')</small>';
      }))).concat([['<b>Total geral</b>'].concat(dados.map(d => '<b>' + d.total + '%</b>'))]),
      [null].concat(dados.map((d, i) => this.COR_AV[i % 6]))) +
      (naoAplicadas.length ? '<p style="font-size:10.5px; color:var(--eq-cinza); margin-top:4px">&Aacute;rea(s) n&atilde;o aplicada(s): ' + naoAplicadas.join(', ') + '.</p>' : '');
    const grafAreas = tabSS +
      '<div style="margin-top:12px">' + this.gBarras(AREAS, seriesAV) + '</div>' +
      '<div style="margin-top:8px">' + this.gLinhas(AREAS, seriesAV) + '</div>' +
      '<div style="margin-top:8px">' + this.gRadar(AREAS, seriesAV) + '</div>';

    // Grafico 2: evolucao do total (bolinhas ligadas, nosso estilo)
    let grafTotal = '';
    if (dados.length > 1) {
      const W = 640, H = 150, ESQ = 46, DIR = 20, TOPO = 18, BASE = H - 30;
      const passo = (W - ESQ - DIR) / (dados.length - 1);
      const y = pct => BASE - (pct / 100) * (BASE - TOPO);
      grafTotal = '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%; height:auto">' +
        [0, 25, 50, 75, 100].map(g =>
          '<line x1="' + ESQ + '" y1="' + y(g) + '" x2="' + (W - DIR) + '" y2="' + y(g) +
          '" stroke="#DFE6EC" stroke-dasharray="3 4"/>' +
          '<text x="' + (ESQ - 8) + '" y="' + (y(g) + 3) + '" text-anchor="end" font-size="9" fill="#94A3B8">' + g + '%</text>').join('') +
        '<polyline fill="none" stroke="#1468B2" stroke-width="2.5" points="' +
        dados.map((d, i) => (ESQ + i * passo) + ',' + y(d.total)).join(' ') + '"/>' +
        dados.map((d, i) =>
          '<circle cx="' + (ESQ + i * passo) + '" cy="' + y(d.total) + '" r="7" fill="#fff" stroke="' +
          this.COR_AV[i % 6] + '" stroke-width="3"/>' +
          '<text x="' + (ESQ + i * passo) + '" y="' + (y(d.total) - 12) + '" text-anchor="middle" font-size="11" font-weight="800" fill="' +
          this.COR_AV[i % 6] + '">' + d.total + '%</text>' +
          '<text x="' + (ESQ + i * passo) + '" y="' + (H - 8) + '" text-anchor="middle" font-size="9.5" font-weight="700" fill="#64748B">AV' +
          (i + 1) + ' &middot; ' + fmtD(d.av.concluido_em) + '</text>').join('') +
        '</svg>';
    }

    window._docPortal = { paciente_id: pacienteId, tipo: 'avaliacao', titulo: 'Socially Savvy - Consolidado' };
    document.getElementById('doc-eq-corpo').innerHTML =
      '<div class="pagina-cabecalho nao-imprime">' +
      '  <div><button class="btn-voltar" onclick="document.getElementById(\'doc-eq-overlay\').remove()">&larr; Fechar</button>' +
      '  <h2>Socially Savvy &middot; documento oficial</h2></div>' +
      '  <button class="btn btn-primario" onclick="window.print()">&#128424; Imprimir / PDF</button>' +
      portalBtn() +
      '</div>' +
      '<div class="doc-eq">' +
      this.cabecalhoDoc('SOCIALLY SAVVY &middot; CONSOLIDADO', 'Avalia&ccedil;&atilde;o de habilidades sociais &middot; 110 itens em 7 &aacute;reas') +
      '<div class="deq-caixa deq-dados" style="grid-template-columns:1fr 1fr; margin-top:8px">' +
      '  <div><small>Paciente</small><b>' + escaparHtml(pac.nome) + '</b></div>' +
      '  <div><small>Nascimento</small><b>' + (pac.data_nascimento ? pac.data_nascimento.split('-').reverse().join('/') : '-') + '</b></div>' +
      '</div>' +
      '<h2 style="margin-top:12px"><span class="ponto deq-azul"></span>Aplica&ccedil;&otilde;es realizadas</h2>' +
      '<div class="deq-caixa deq-dados" style="grid-template-columns:repeat(' + Math.min(dados.length, 4) + ', 1fr)">' +
      dados.map((d, i) =>
        '<div' + (i === dados.length - 1 ? ' style="border-bottom:none"' : '') + '><small style="color:' + this.COR_AV[i % 6] + '">AV' + (i + 1) + '</small>' +
        '<b>' + fmtD(d.av.concluido_em) + '<br><span style="font-size:10px; font-weight:600">' +
        escaparHtml(d.av.avaliador ? d.av.avaliador.nome.split(' ')[0] : '-') +
        ' &middot; ' + d.total + '%</span></b></div>').join('') +
      '</div>' +
      '<h2 style="margin-top:14px"><span class="ponto deq-teal"></span>Resultado por &aacute;rea</h2>' +
      '<div class="deq-caixa">' + grafAreas + '</div>' +
      (grafTotal
        ? '<h2 style="margin-top:14px"><span class="ponto deq-amarelo"></span>Evolu&ccedil;&atilde;o entre aplica&ccedil;&otilde;es</h2>' +
          '<div class="deq-caixa">' + grafTotal + '</div>'
        : '') +
      (function () {
        const u = dados[dados.length - 1];
        const ordenadas = u.porArea.slice().sort((a, b) => b.pct - a.pct);
        let t = 'Na aplica&ccedil;&atilde;o mais recente (' + fmtD(u.av.concluido_em) + '), o total geral foi de <b>' +
          u.total + '%</b> das habilidades sociais avaliadas. A &aacute;rea mais desenvolvida &eacute; ' +
          ordenadas[0].area + ' (' + ordenadas[0].pct + '%), e a de maior necessidade de est&iacute;mulo &eacute; ' +
          ordenadas[ordenadas.length - 1].area + ' (' + ordenadas[ordenadas.length - 1].pct + '%). ';
        if (dados.length > 1) {
          const dif = u.total - dados[0].total;
          t += 'Entre a AV1 e a AV' + dados.length + ', o total ' +
            (dif > 0 ? 'evoluiu <b>+' + dif + ' pontos percentuais</b>' :
             dif < 0 ? 'recuou ' + dif + ' pontos percentuais' : 'manteve-se estavel') + '. ';
          const ganhos = u.porArea.map(a => {
            const antes = dados[0].porArea.find(x => x.area === a.area);
            return { area: a.area, g: a.pct - (antes ? antes.pct : 0) };
          }).filter(x => x.g > 0).sort((a, b) => b.g - a.g).slice(0, 3);
          if (ganhos.length) t += 'Maiores ganhos: ' + ganhos.map(x => x.area + ' (+' + x.g + 'pp)').join(', ') + '. ';
        }
        t += 'Os itens com menor pontua&ccedil;&atilde;o orientam a prioriza&ccedil;&atilde;o de metas no PEI.';
        return '<h2 style="margin-top:14px"><span class="ponto deq-rosa"></span>An&aacute;lise</h2>' +
          '<div class="deq-caixa deq-texto">' + t +
          '<br><small style="color:var(--eq-cinza)">Texto de apoio gerado automaticamente a partir das pontua&ccedil;&otilde;es; a leitura cl&iacute;nica cabe &agrave; equipe.</small></div>';
      })() +
      '<p style="font-size:10px; color:var(--eq-cinza); margin-top:10px">Pontua&ccedil;&atilde;o 0&ndash;3 por item; percentual = pontos obtidos sobre o m&aacute;ximo da &aacute;rea. O PEI derivado desta avalia&ccedil;&atilde;o &eacute; elaborado na aba PEI e possui documento pr&oacute;prio.</p>' +
      this.rodapeDoc() +
      '</div>';
  },

  async docQADI(pacienteId) {
    await this.carregarQuestoes();
    const ov = this.abrirDocOverlay();

    const [rAvs, rPac] = await Promise.all([
      sb.from('avaliacoes').select('id, concluido_em, oral, observacoes, avaliador:profiles!avaliacoes_avaliador_id_fkey(nome)')
        .eq('paciente_id', pacienteId).eq('protocolo', 'qadi').eq('status', 'concluida')
        .order('concluido_em'),
      sb.from('pacientes').select('nome, data_nascimento').eq('id', pacienteId).single()
    ]);
    const avs = (rAvs.data || []).slice(0, 4);
    const pac = rPac.data;
    if (!avs.length || !pac) { ov.remove(); return; }

    const { data: resps } = await sb.from('avaliacao_respostas')
      .select('avaliacao_id, questao_id, resposta').in('avaliacao_id', avs.map(a => a.id));
    const porAv = {};
    (resps || []).forEach(r => {
      (porAv[r.avaliacao_id] = porAv[r.avaliacao_id] || {})[r.questao_id] = r.resposta;
    });

    // Regra Equilibrium (planilha PONTUACAO): por area, Adquirida = SIM nas
    // faixas aplicadas da AV; Esperada = total de itens dessas faixas.
    const calc = avs.map(av => {
      const mapa = porAv[av.id] || {};
      const faixas = this.FAIXAS.filter(f => this.questoes.some(q => q.faixa === f && mapa[q.id]));
      const areas = this.AREAS.map(area => {
        const qs = this.questoes.filter(q => faixas.includes(q.faixa) && q.area === area);
        const adq = qs.filter(q => mapa[q.id] === 'S').length;
        return { area, adq, esp: qs.length, pct: qs.length ? Math.round(adq * 100 / qs.length) : null };
      });
      const tAdq = areas.reduce((s, x) => s + x.adq, 0);
      const tEsp = areas.reduce((s, x) => s + x.esp, 0);
      return { av, faixas, areas, tAdq, tEsp, tPct: tEsp ? Math.round(tAdq * 100 / tEsp) : 0 };
    });

    const fmtD = d => new Date(d).toLocaleDateString('pt-BR');

    const grafico = '<div style="display:grid; gap:14px; padding:4px 6px">' +
      this.AREAS.map(area => {
        const linhas = calc.map((c, i) => {
          const x = c.areas.find(p => p.area === area);
          if (!x || x.pct === null) return '';
          return '<div style="display:flex; align-items:center; gap:10px; margin-top:4px">' +
            '<small style="width:36px; font-weight:800; color:' + this.COR_AV[i % 6] + '">AV' + (i + 1) + '</small>' +
            '<div style="flex:1; height:10px; background:#EFF4F8; border-radius:6px; overflow:hidden">' +
            '<i style="display:block; height:100%; width:' + x.pct + '%; background:' + this.COR_AV[i % 6] + '; border-radius:6px"></i></div>' +
            '<b style="width:86px; text-align:right; font-size:11px; white-space:nowrap">' + x.adq + '/' + x.esp + ' &middot; ' + x.pct + '%</b></div>';
        }).join('');
        if (!linhas) return '';
        return '<div><div style="font-size:11.5px; font-weight:800; color:var(--eq-azul-escuro)">' + area + '</div>' + linhas + '</div>';
      }).join('') + '</div>';

    // Texto de apoio gerado pelo sistema (simples por ora)
    const ult = calc[calc.length - 1];
    const comDado = ult.areas.filter(a => a.pct !== null);
    const fortes = comDado.filter(a => a.pct >= 85).map(a => a.area);
    const atencao = comDado.filter(a => a.pct < 70).sort((a, b) => a.pct - b.pct);
    let analise = 'Na aplica&ccedil;&atilde;o mais recente (' + fmtD(ult.av.concluido_em) + '), ' +
      escaparHtml(pac.nome.split(' ')[0]) + ' alcan&ccedil;ou <b>' + ult.tAdq + ' de ' + ult.tEsp +
      ' pontos esperados (' + ult.tPct + '%)</b> nas faixas aplicadas. ';
    if (ult.tPct >= 85) analise += 'O desempenho global mostra-se compat&iacute;vel com o esperado para as faixas avaliadas. ';
    else if (ult.tPct >= 60) analise += 'O desempenho global indica desenvolvimento em aquisi&ccedil;&atilde;o, com defasagens localizadas. ';
    else analise += 'O desempenho global indica defasagens importantes, sugerindo prioriza&ccedil;&atilde;o no plano de interven&ccedil;&atilde;o. ';
    if (fortes.length) analise += 'Destacam-se como pontos fortes: ' + fortes.join(', ') + '. ';
    if (atencao.length) analise += 'Pontos de aten&ccedil;&atilde;o: ' +
      atencao.map(a => a.area + ' (' + a.pct + '%)').join(', ') + '. ';
    if (calc.length > 1) {
      const dif = ult.tPct - calc[0].tPct;
      analise += 'Entre a AV1 e a AV' + calc.length + ', o total geral ' +
        (dif > 0 ? 'evoluiu <b>+' + dif + ' pontos percentuais</b>.' :
         dif < 0 ? 'recuou ' + dif + ' pontos percentuais.' : 'manteve-se estavel.');
    }
    const secAnalise =
      '<h2 style="margin-top:14px"><span class="ponto deq-rosa"></span>An&aacute;lise</h2>' +
      '<div class="deq-caixa deq-texto">' + analise +
      '<br><small style="color:var(--eq-cinza)">Texto de apoio gerado automaticamente a partir das pontua&ccedil;&otilde;es; a leitura cl&iacute;nica cabe &agrave; equipe.</small></div>';

    window._docPortal = { paciente_id: pacienteId, tipo: 'avaliacao', titulo: 'QADI-R - Consolidado' };
    document.getElementById('doc-eq-corpo').innerHTML =
      '<div class="pagina-cabecalho nao-imprime">' +
      '  <div><button class="btn-voltar" onclick="document.getElementById(\'doc-eq-overlay\').remove()">&larr; Fechar</button>' +
      '  <h2>QADI-R &middot; documento oficial</h2></div>' +
      '  <button class="btn btn-primario" onclick="window.print()">&#128424; Imprimir / PDF</button>' +
      portalBtn() +
      '</div>' +
      '<div class="doc-eq">' +
      this.cabecalhoDoc('QADI-R &middot; PONTUA&Ccedil;&Atilde;O', 'Question&aacute;rio de Avalia&ccedil;&atilde;o do Desenvolvimento Infantil &middot; regra Equilibrium') +
      '<div class="deq-caixa deq-dados" style="grid-template-columns:1fr 1fr; margin-top:8px">' +
      '  <div><small>Paciente</small><b>' + escaparHtml(pac.nome) + '</b></div>' +
      '  <div><small>Nascimento</small><b>' + (pac.data_nascimento ? pac.data_nascimento.split('-').reverse().join('/') : '-') + '</b></div>' +
      '</div>' +
      '<h2 style="margin-top:12px"><span class="ponto deq-azul"></span>Aplica&ccedil;&otilde;es</h2>' +
      '<div class="deq-caixa deq-dados" style="grid-template-columns:repeat(' + calc.length + ', 1fr)">' +
      calc.map((c, i) =>
        '<div' + (i === calc.length - 1 ? ' style="border-bottom:none"' : '') + '><small style="color:' + this.COR_AV[i % 6] + '">AV' + (i + 1) + '</small>' +
        '<b>' + fmtD(c.av.concluido_em) + '<br><span style="font-size:10px; font-weight:600">' +
        escaparHtml(c.av.avaliador ? c.av.avaliador.nome.split(' ')[0] : '-') +
        (c.av.oral === true ? ' &middot; Oral' : c.av.oral === false ? ' &middot; N&atilde;o oral' : '') +
        ' &middot; faixas ' + c.faixas.map(f => f.split(' ')[0] + '-' + f.split(' ')[2]).join(', ') +
        '</span></b></div>').join('') +
      '</div>' +
      
      '<h2 style="margin-top:14px"><span class="ponto deq-amarelo"></span>Perfil por &aacute;rea &middot; adquirida/esperada</h2>' +
      '<div class="deq-caixa">' + grafico + '</div>' +
      '<h2 style="margin-top:14px"><span class="ponto deq-teal"></span>Quadro e gr&aacute;ficos por &aacute;rea</h2>' +
      '<div class="deq-caixa">' +
      this.gTabela(['&Aacute;rea'].concat(calc.map((c, i) => 'AV' + (i + 1))),
        this.AREAS.map(area => [area].concat(calc.map(c => {
          const x = c.areas.find(p => p.area === area);
          return x && x.pct !== null ? x.pct + '% <small>(' + x.adq + '/' + x.esp + ')</small>' : null;
        }))).concat([['<b>Total</b>'].concat(calc.map(c => '<b>' + c.tPct + '% (' + c.tAdq + '/' + c.tEsp + ')</b>'))]),
        [null].concat(calc.map((c, i) => this.COR_AV[i % 6]))) +
      '<div style="margin-top:12px"><p class="sub" style="font-size:10.5px; margin-bottom:2px">Pontua&ccedil;&atilde;o adquirida &times; esperada por &aacute;rea &middot; AV' + calc.length + ' (faixas ' + ult.faixas.join(', ') + ')</p>' +
      this.gBarras(this.AREAS, [
        { nome: 'Adquirida', cor: '#1468B2', valores: this.AREAS.map(a => { const x = ult.areas.find(p => p.area === a); return x && x.esp ? x.adq : null; }) },
        { nome: 'Esperada', cor: '#F3B63D', valores: this.AREAS.map(a => { const x = ult.areas.find(p => p.area === a); return x && x.esp ? x.esp : null; }) }
      ], { max: Math.max(10, ...ult.areas.map(a => a.esp)), unidade: '' }) + '</div>' +
      (calc.length > 1
        ? '<div style="margin-top:8px"><p class="sub" style="font-size:10.5px; margin-bottom:2px">Evolu&ccedil;&atilde;o do % por &aacute;rea entre aplica&ccedil;&otilde;es</p>' +
          this.gLinhas(this.AREAS, calc.map((c, i) => ({ nome: 'AV' + (i + 1), cor: this.COR_AV[i % 6],
            valores: this.AREAS.map(a => { const x = c.areas.find(p => p.area === a); return x ? x.pct : null; }) }))) + '</div>'
        : '') +
      '</div>' +
      secAnalise +
      calc.filter(c => c.av.observacoes).map((c, i) =>
        '<div class="deq-caixa deq-texto" style="margin-top:8px"><b style="font-size:11px">Observa&ccedil;&otilde;es AV' +
        (i + 1) + ':</b> ' + escaparHtml(c.av.observacoes) + '</div>').join('') +
      '<p style="font-size:10px; color:var(--eq-cinza); margin-top:10px">Regra de corre&ccedil;&atilde;o Equilibrium: pontua&ccedil;&atilde;o adquirida = respostas SIM nas faixas aplicadas; esperada = total de itens dessas faixas. Percentual = adquirida &divide; esperada.</p>' +
      this.rodapeDoc() +
      '</div>';
  },

  // ═══════════════════ SOCIALLY SAVVY ═══════════════════

  async abrirAplicacaoSS() {
    await this.carregarItensSS();
    const av = this.avaliacao;

    this.respSS = {};
    const { data: resps } = await sb.from('ss_respostas')
      .select('item_id, pontos').eq('avaliacao_id', av.id);
    (resps || []).forEach(r => { this.respSS[r.item_id] = r.pontos; });

    // Numero da aplicacao (AV 1..4) pela ordem de inicio
    const { data: todas } = await sb.from('avaliacoes')
      .select('id').eq('paciente_id', av.paciente_id).eq('protocolo', 'ss')
      .order('iniciado_em');
    this.numSS = Math.max(1, (todas || []).findIndex(x => x.id === av.id) + 1);

    this.telaAplicacaoSS();
  },

  telaAplicacaoSS() {
    const av = this.avaliacao;
    if (this.celular()) { this.telaCelular(); return; }
    const total = this.itensSS.filter(i => !(av.areas_excluidas || []).includes(i.area)).length;
    const feitas = Object.keys(this.respSS).length;

    const excl = av.areas_excluidas || [];
    let corpo = '';
    this.SS_AREAS.forEach(area => {
      const itens = this.itensSS.filter(i => i.area === area);
      if (!itens.length) return;
      const fora = excl.includes(area);
      const feitasArea = itens.filter(i => this.respSS[i.id] !== undefined).length;
      const chip = '<button type="button" class="btn-chip" style="margin-left:auto" onclick="MODULOS.avaliacoes.alternarAreaSS(\'' + escaparHtml(area) + '\')">' +
        (fora ? '&#8634; Voltar a aplicar' : '&#10005; Nao aplicar esta area') + '</button>';
      if (fora) {
        corpo += '<div class="cartao" style="opacity:.75"><h3 style="display:flex; align-items:center; gap:8px">' + area +
          ' <span class="selo selo-neutro">nao aplicada</span>' + chip + '</h3>' +
          '<p class="sub">Esta area fica fora da pontuacao, dos graficos e do relatorio de avaliacao.</p></div>';
        return;
      }
      corpo += '<div class="cartao"><h3 style="display:flex; align-items:center; gap:8px">' + area +
        ' <span class="selo selo-neutro" id="ss-cont-' + this.slugSS(area) + '">' +
        feitasArea + '/' + itens.length + '</span>' + chip + '</h3>' +
        itens.map(i =>
          '<div class="campo questao"><label><b style="color:var(--ink-muted); margin-right:6px">' +
          i.codigo + '</b>' + escaparHtml(i.texto) + '</label>' +
          '<div class="segmento">' +
          [0, 1, 2, 3].map(v =>
            '<button type="button" class="seg' + (this.respSS[i.id] === v ? ' ativo' : '') + '" ' +
            'title="' + this.SS_ESCALA[v][1] + '" ' +
            'onclick="MODULOS.avaliacoes.responderSS(this, ' + i.id + ', ' + v + ')">' + v + '</button>'
          ).join('') +
          '<button type="button" class="seg seg-na' + (this.respSS[i.id] === -1 ? ' ativo' : '') + '" ' +
            'title="Nao aplicado: este item fica fora da conta" ' +
            'onclick="MODULOS.avaliacoes.responderSS(this, ' + i.id + ', -1)">NA</button>' +
          '</div></div>').join('') +
        '</div>';
    });

    this.el.innerHTML =
      '<div class="pagina-cabecalho">' +
      '  <div>' +
      this.voltarHtml() +
      '    <h2>Socially Savvy &middot; ' + escaparHtml(this.pacienteAtual.nome) +
      '    <span class="selo selo-roxo">Avaliacao ' + this.numSS + '</span></h2>' +
      '    <p class="sub">' + calcularIdade(this.pacienteAtual.data_nascimento) +
      ' &middot; Respostas salvas a cada toque &middot; <span id="ss-progresso">' + feitas + '</span> de ' + total + ' itens</p>' +
      '  </div>' +
      '  <button class="btn btn-primario" onclick="MODULOS.avaliacoes.concluirSS()">Concluir</button>' +
      '</div>' +

      '<div class="cartao"><div class="grade-form">' +
      '  <div class="campo c2"><label>Contexto(s) da avaliacao</label>' +
      '    <input id="ss-contexto" oninput="MODULOS.avaliacoes.salvarCabSS()" ' +
      '      placeholder="Ex.: sala de atendimento, recreio, casa..." value="' + escaparHtml(av.contexto || '') + '"></div>' +
      '  <div class="campo"><label>Duracao da(s) observacao(oes)</label>' +
      '    <input id="ss-duracao" oninput="MODULOS.avaliacoes.salvarCabSS()" ' +
      '      placeholder="Ex.: 3 sessoes de 40 min" value="' + escaparHtml(av.duracao || '') + '"></div>' +
      '</div>' +
      '<div class="niv-legenda" style="margin:4px 0 0">' +
      this.SS_ESCALA.map(([v, r]) => '<span class="niv-leg-item"><b>' + v + '</b> ' + r + '</span>').join('') +
      '<span class="niv-leg-item"><b>NA</b> Nao aplicado (fora da conta)</span>' +
      '</div></div>' +
      corpo +
      '<div class="cartao"><div class="campo" style="margin:0"><label>Observacoes</label>' +
      '<textarea id="av-obs" rows="3" oninput="MODULOS.avaliacoes.salvarObs()" ' +
      'style="resize:vertical">' + escaparHtml(av.observacoes || '') + '</textarea></div></div>';
  },

  slugSS(t) { return t.toLowerCase().replace(/[^a-z]/g, ''); },

  // ─────────────── Areas nao aplicadas (avaliacoes.areas_excluidas) ───────────────
  async salvarAreasSS(avId, areas, avLocal) {
    const { error } = await sb.from('avaliacoes').update({ areas_excluidas: areas }).eq('id', avId);
    if (error) { popAviso('Nao consegui guardar as areas: ' + error.message); return false; }
    if (avLocal) avLocal.areas_excluidas = areas;
    if (this.avaliacao && this.avaliacao.id === avId) this.avaliacao.areas_excluidas = areas;
    return true;
  },
  async alternarAreaSS(area) {
    const av = this.avaliacao; if (!av) return;
    const atual = av.areas_excluidas || [];
    const fora = atual.includes(area);
    if (!fora && !await popConfirmar('Marcar "' + area + '" como nao aplicada?\n\nA area sai da pontuacao, dos graficos e do relatorio de avaliacao. Da para voltar atras.', { titulo: 'Nao aplicar area', ok: 'Nao aplicar' })) return;
    const novas = fora ? atual.filter(a => a !== area) : atual.concat([area]);
    if (!await this.salvarAreasSS(av.id, novas, av)) return;
    this._mIdx = 0;
    this.telaAplicacaoSS();
  },
  // depois de concluida: gestao ajusta as areas pelo resultado
  async modalAreasSS(avId) {
    const { data: av } = await sb.from('avaliacoes').select('id, areas_excluidas, status').eq('id', avId).single();
    if (!av) return;
    const ex = av.areas_excluidas || [];
    abrirModal('Areas aplicadas nesta avaliacao',
      '<p class="sub" style="margin-bottom:8px">Desmarque a area que nao foi aplicada. Ela sai da pontuacao, dos graficos e do relatorio de avaliacao.</p>' +
      this.SS_AREAS.map(a => '<label class="check" style="display:flex; gap:8px; align-items:center; margin:6px 0"><input type="checkbox" class="ss-area-chk" value="' + escaparHtml(a) + '"' + (ex.includes(a) ? '' : ' checked') + '> ' + a + '</label>').join('') +
      '<div class="barra-acoes"><button class="btn btn-fantasma" onclick="fecharModal()">Cancelar</button>' +
      '<button class="btn btn-primario" onclick="MODULOS.avaliacoes.confirmarAreasSS(\'' + avId + '\')">Salvar</button></div>', false, 'evolucao');
  },
  async confirmarAreasSS(avId) {
    const fora = [...document.querySelectorAll('.ss-area-chk')].filter(c => !c.checked).map(c => c.value);
    if (fora.length >= this.SS_AREAS.length) { popAviso('Deixe ao menos uma area aplicada.'); return; }
    if (!await this.salvarAreasSS(avId, fora)) return;
    fecharModal();
    const alvo = document.getElementById('av-resultado');
    if (alvo) alvo.innerHTML = await this.htmlResultado(avId);
    else if (this.avaliacao && this.avaliacao.id === avId && this.avaliacao.status !== 'concluida') this.telaAplicacaoSS();
    else popAviso('Areas atualizadas. Reabra o resultado para ver a nova pontuacao.');
  },

  async responderSS(botao, itemId, pontos) {
    const anterior = this.respSS[itemId];
    this.respSS[itemId] = pontos;
    botao.parentElement.querySelectorAll('.seg').forEach(b => b.classList.remove('ativo'));
    botao.classList.add('ativo');

    const { error } = await sb.from('ss_respostas').upsert(
      { avaliacao_id: this.avaliacao.id, item_id: itemId, pontos: pontos },
      { onConflict: 'avaliacao_id,item_id' });
    if (error) {
      if (anterior === undefined) delete this.respSS[itemId];
      else this.respSS[itemId] = anterior;
      popAviso('Falha ao salvar: ' + error.message);
      return;
    }
    const prog = document.getElementById('ss-progresso');
    if (prog) prog.textContent = Object.keys(this.respSS).length;
    const item = this.itensSS.find(i => i.id === itemId);
    if (item) {
      const doArea = this.itensSS.filter(i => i.area === item.area);
      const cont = document.getElementById('ss-cont-' + this.slugSS(item.area));
      if (cont) cont.textContent =
        doArea.filter(i => this.respSS[i.id] !== undefined).length + '/' + doArea.length;
    }
  },

  _cabTimer: null,
  salvarCabSS() {
    clearTimeout(this._cabTimer);
    this._cabTimer = setTimeout(async () => {
      const dados = {
        contexto: document.getElementById('ss-contexto')?.value || null,
        duracao: document.getElementById('ss-duracao')?.value || null
      };
      Object.assign(this.avaliacao, dados);
      { const { error: _e } = await sb.from('avaliacoes').update(dados).eq('id', this.avaliacao.id); if (_e) popAviso('Nao foi possivel gravar (avaliacoes): ' + _e.message); }
    }, 600);
  },

  async concluirSS() {
    const ex = (this.avaliacao && this.avaliacao.areas_excluidas) || [];
    const itensAplic = this.itensSS.filter(i => !ex.includes(i.area));
    const total = itensAplic.length;
    const feitas = itensAplic.filter(i => this.respSS[i.id] !== undefined).length;
    if (feitas < total) {
      popAviso('Faltam ' + (total - feitas) + ' item(ns) para pontuar. O Socially Savvy e concluido com os ' +
        total + ' itens das areas aplicadas respondidos (use NA no item que nao foi aplicado).');
      return;
    }
    if (!await popConfirmar('Concluir a Avaliacao ' + this.numSS + ' do Socially Savvy? Depois ela fica somente leitura.')) return;

    const { error } = await sb.from('avaliacoes')
      .update({ status: 'concluida', concluido_em: new Date().toISOString() })
      .eq('id', this.avaliacao.id);
    if (error) { alert('Erro: ' + error.message); return; }
    this.telaResultado(this.avaliacao.id);
  },

  // ─────────────── Resultado SS + consolidado ───────────────

  async htmlResultadoSS(av) {
    await this.carregarItensSS();

    const { data: resps } = await sb.from('ss_respostas')
      .select('item_id, pontos').eq('avaliacao_id', av.id);
    const mapa = {};
    (resps || []).forEach(r => { mapa[r.item_id] = r.pontos; });

    const porArea = this.ssAreasDe(av).map(area => {
      const itens = this.itensSS.filter(i => i.area === area);
      const p = this.ssPontuar(itens, mapa);
      return { area, realizados: p.r, esperados: p.max, na: p.na, pct: p.pct === null ? 0 : p.pct };
    });
    const totR = porArea.reduce((s, x) => s + x.realizados, 0);
    const totE = porArea.reduce((s, x) => s + x.esperados, 0) || 1;
    const naoAplic = this.SS_AREAS.filter(a => !this.ssAreasDe(av).includes(a));
    const podeAjustarAreas = perm('avaliacoes.ss') === 'E' || perm('avaliacoes.relatorio') === 'E';
    const linhaAreas = '<p class="sub" style="margin:0 0 8px; display:flex; gap:8px; align-items:center; flex-wrap:wrap">' +
      (naoAplic.length ? '<span>Area(s) nao aplicada(s): <b>' + naoAplic.join(', ') + '</b></span>' : '<span>Todas as 7 areas aplicadas</span>') +
      (podeAjustarAreas ? '<button class="btn-chip" onclick="MODULOS.avaliacoes.modalAreasSS(\'' + av.id + '\')">Ajustar areas</button>' : '') + '</p>';

    let tabela = '<table class="tabela-presenca"><thead><tr>' +
      '<th>Area de desenvolvimento social</th><th class="centro">Realizados</th>' +
      '<th class="centro">Esperados</th><th class="centro">%</th></tr></thead><tbody>' +
      porArea.map(x =>
        '<tr><td>' + x.area + (x.na ? ' <small class="sub">(' + x.na + ' NA)</small>' : '') + '</td><td class="centro">' + x.realizados + '</td>' +
        '<td class="centro">' + x.esperados + '</td><td class="centro"><b>' + x.pct + '%</b></td></tr>').join('') +
      '<tr><td><b>TOTAL</b></td><td class="centro"><b>' + totR + '</b></td>' +
      '<td class="centro"><b>' + totE + '</b></td><td class="centro"><b>' +
      Math.round(totR * 100 / totE) + '%</b></td></tr>' +
      '</tbody></table>';

    const grafico = '<div class="rel-grafico" style="margin-top:12px">' +
      porArea.map(x =>
        '<div class="rel-col" title="' + x.area + ': ' + x.pct + '%">' +
        '<span class="rel-pct">' + x.pct + '%</span>' +
        '<div class="rel-trilho"><div class="rel-barra" style="height:' + x.pct + '%; background:#1468B2"></div></div>' +
        '<span class="rel-rotulo">' + x.area.slice(0, 14) + '</span></div>').join('') +
      '</div>';

    // Consolidado: todas as aplicacoes concluidas do paciente
    let consolidado = '';
    const { data: todas } = await sb.from('avaliacoes')
      .select('id, concluido_em, areas_excluidas').eq('paciente_id', av.paciente_id)
      .eq('protocolo', 'ss').eq('status', 'concluida').order('concluido_em');
    if (todas && todas.length > 1) {
      const { data: todasResp } = await sb.from('ss_respostas')
        .select('avaliacao_id, item_id, pontos').in('avaliacao_id', todas.map(t => t.id));
      const porAv = {};
      (todasResp || []).forEach(r =>
        ((porAv[r.avaliacao_id] = porAv[r.avaliacao_id] || {})[r.item_id] = r.pontos));

      consolidado = '<div class="cartao"><h3>Consolidado das aplicacoes</h3>' +
        '<table class="tabela-presenca"><thead><tr><th>Area</th>' +
        todas.map((t, i) => '<th class="centro">AV ' + (i + 1) + '<br><small>' +
          new Date(t.concluido_em).toLocaleDateString('pt-BR').slice(0, 5) + '</small></th>').join('') +
        '</tr></thead><tbody>' +
        this.SS_AREAS.filter(area => todas.some(t => this.ssAreasDe(t).includes(area))).map(area => {
          const itens = this.itensSS.filter(i => i.area === area);
          return '<tr><td>' + area + '</td>' +
            todas.map(t => {
              if (!this.ssAreasDe(t).includes(area)) return '<td class="centro">&mdash;</td>';
              const p = this.ssPontuar(itens, porAv[t.id] || {});
              return '<td class="centro">' + (p.pct === null ? '&mdash;' : p.pct + '%') + '</td>';
            }).join('') + '</tr>';
        }).join('') +
        '</tbody></table></div>';
    }

    return '<div class="cartao faixa-azul">' +
      '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; flex-wrap:wrap; gap:8px">' +
      '<h3 style="margin:0">Socially Savvy &middot; ' + escaparHtml(av.pacientes.nome) + '</h3>' +
      '<div class="pac-selos">' +
      (av.status === 'concluida'
        ? '<span class="selo selo-ok">Concluida em ' +
          new Date(av.concluido_em).toLocaleDateString('pt-BR') + '</span>' : '<span class="selo selo-warn">Em andamento</span>') +
      (av.avaliador ? '<span class="selo selo-neutro">' + escaparHtml(av.avaliador.nome) + '</span>' : '') +
      '</div></div>' +
      ((av.contexto || av.duracao)
        ? '<p class="sub" style="margin-bottom:8px">' +
          (av.contexto ? 'Contexto: ' + escaparHtml(av.contexto) : '') +
          (av.contexto && av.duracao ? ' &middot; ' : '') +
          (av.duracao ? 'Duracao: ' + escaparHtml(av.duracao) : '') + '</p>' : '') +
      linhaAreas + tabela + grafico +
      (av.observacoes ? '<p class="sub" style="margin-top:10px">Obs.: ' + escaparHtml(av.observacoes) + '</p>' : '') +
      '</div>' + consolidado;
  },

  // ─────────────── Quadro de vencimentos (validade das avaliacoes) ───────────────

  async quadroVencimentos() {
    const alvo = document.getElementById('av-venc');
    if (!alvo || !window.MODULOS.eventos) return;
    const venc = await MODULOS.eventos.avaliacoesVencendo();
    const { data: cfg } = await sb.from('configuracoes')
      .select('valor').eq('chave', 'validade_avaliacao_meses').maybeSingle();
    const meses = parseInt(cfg ? cfg.valor : '6', 10) || 6;
    alvo.innerHTML =
      '<div class="cartao"><h3>&#9200; Vencimentos ' +
      '<small class="sub">&middot; validade de ' + meses + ' meses por aplicacao</small></h3>' +
      (venc.length
        ? venc.map(x =>
            '<div class="linha-doc"><div><b>' + escaparHtml(x.nome) + '</b>' +
            '<small>' + x.protocolo.toUpperCase() + ' &middot; ' + x.rotulo + '</small></div>' +
            '<span class="selo ' + (x.dias < 0 ? 'selo-bad' : 'selo-warn') + '">' +
            (x.dias < 0 ? 'Vencida ha ' + (-x.dias) + ' dia(s)' : 'Vence em ' + x.dias + ' dia(s)') +
            '</span></div>').join('')
        : '<p class="sub">Nenhuma avaliacao vencendo nos proximos 30 dias. Tudo em dia.</p>') +
      '</div>';
  },

  // ═══════════════════ PORTAGE ═══════════════════

  P_AREAS: ['Socializacao', 'Linguagem', 'Cognicao', 'Autocuidados', 'Desenvolvimento Motor'],
  P_FAIXAS: ['0-1 ano', '1-2 anos', '2-3 anos', '3-4 anos', '4-5 anos', '5-6 anos'],
  P_VAL: [['S', 'Sim', 1], ['AV', 'As vezes', 0.5], ['N', 'Nao', 0], ['NA', 'NA', null]],

  async carregarItensPortage() {
    if (this.itensPortage) return;
    const { data } = await sb.from('portage_itens').select('*').order('area').order('faixa').order('ordem');
    this.itensPortage = data || [];
  },

  async abrirAplicacaoPortage() {
    await this.carregarItensPortage();
    const av = this.avaliacao;
    const { data: resps } = await sb.from('portage_respostas')
      .select('item_id, valor').eq('avaliacao_id', av.id);
    this._pResp = {};
    (resps || []).forEach(r => { this._pResp[r.item_id] = r.valor; });
    this._pArea = this._pArea || this.P_AREAS[0];
    this._pFaixa = this._pFaixa === undefined ? 0 : this._pFaixa;
    this.desenharPortage();
  },

  desenharPortage() {
    const alvo = document.getElementById('aval-corpo');
    if (!alvo) return;
    if (this.celular()) { this.el = alvo; this.telaCelular(); return; }
    const av = this.avaliacao;
    const respondidos = Object.keys(this._pResp).length;
    const itens = this.itensPortage.filter(i => i.area === this._pArea && i.faixa === this._pFaixa);

    alvo.innerHTML =
      '<div class="cartao"><div style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:8px; align-items:center">' +
      '<h3 style="margin:0">Portage &middot; ' + escaparHtml(av.pacientes ? av.pacientes.nome : '') + '</h3>' +
      '<div class="pac-selos"><span class="selo selo-neutro">' + respondidos + '/' + this.itensPortage.length + ' respondidos</span>' +
      '<button class="btn btn-primario" onclick="MODULOS.avaliacoes.concluirPortage()">Concluir aplicacao</button></div></div>' +
      '<p class="sub" style="margin:6px 0 10px">Sim = 1 &middot; As vezes = 0,5 &middot; Nao = 0 &middot; NA fora da conta. Aplique as faixas proximas da idade da crianca; salva sozinho.</p>' +
      '<div class="filtro-chips" style="margin-bottom:6px">' + this.P_AREAS.map(a =>
        '<button class="fchip' + (a === this._pArea ? ' ativo' : '') + '" ' +
        'onclick="MODULOS.avaliacoes._pArea = \'' + a + '\'; MODULOS.avaliacoes.desenharPortage()">' + a + '</button>').join('') + '</div>' +
      '<div class="filtro-chips" style="margin-bottom:10px">' + this.P_FAIXAS.map((f, i) => {
        const doF = this.itensPortage.filter(x => x.area === this._pArea && x.faixa === i);
        if (!doF.length) return '';
        const resp = doF.filter(x => this._pResp[x.id]).length;
        return '<button class="fchip' + (i === this._pFaixa ? ' ativo' : '') + '" ' +
          'onclick="MODULOS.avaliacoes._pFaixa = ' + i + '; MODULOS.avaliacoes.desenharPortage()">' + f +
          ' <span class="fchip-n">' + resp + '/' + doF.length + '</span></button>';
      }).join('') + '</div>' +
      itens.map(it =>
        '<div class="linha-doc" style="align-items:center"><div style="flex:1"><small style="color:var(--ink-muted)">' +
        String(it.ordem).padStart(2, '0') + '</small> ' + escaparHtml(it.texto) + '</div>' +
        '<div style="display:flex; gap:5px; flex:none">' +
        this.P_VAL.map(([sig, rot]) =>
          '<button class="niv-btn' + (this._pResp[it.id] === sig ? ' ativo' : '') + (sig === 'S' ? ' correto' : '') + '" ' +
          'style="min-width:' + (sig === 'AV' ? '64px' : '44px') + '" ' +
          'onclick="MODULOS.avaliacoes.marcarPortage(' + it.id + ', \'' + sig + '\', this)">' + rot + '</button>').join('') +
        '</div></div>').join('');
  },

  async marcarPortage(itemId, valor, botao) {
    const anterior = this._pResp[itemId];
    this._pResp[itemId] = valor;
    botao.parentElement.querySelectorAll('.niv-btn').forEach(b => b.classList.remove('ativo'));
    botao.classList.add('ativo');
    const { error } = await sb.from('portage_respostas').upsert({
      avaliacao_id: this.avaliacao.id, item_id: itemId, valor: valor
    }, { onConflict: 'avaliacao_id,item_id' });
    if (error) { this._pResp[itemId] = anterior; alert(error.message); this.desenharPortage(); }
  },

  async concluirPortage() {
    const n = Object.keys(this._pResp).length;
    if (!await popConfirmar('Concluir a aplicacao com ' + n + ' item(ns) respondido(s)? Itens em branco contam como nao alcancados nas faixas aplicadas.')) return;
    { const { error: _e } = await sb.from('avaliacoes').update({ status: 'concluida', concluido_em: new Date().toISOString() })
      .eq('id', this.avaliacao.id); if (_e) popAviso('Nao foi possivel gravar (avaliacoes): ' + _e.message); }
    this.fecharJanela();
    this.docPortage(this.avaliacao.paciente_id);
  },

  // % por faixa: pontos / itens da faixa (faixa entra se tiver ao menos 1 resposta)
  calcPortage(mapa) {
    const PTS = { S: 1, AV: 0.5, N: 0, NA: 0 };
    return this.P_AREAS.map(area => {
      const faixas = [];
      for (let f = 0; f < 6; f++) {
        const itens = this.itensPortage.filter(i => i.area === area && i.faixa === f);
        if (!itens.length) { faixas.push(null); continue; }
        const aplicada = itens.some(i => mapa[i.id] !== undefined);
        if (!aplicada) { faixas.push(null); continue; }
        const pts = itens.reduce((s, i) => s + (PTS[mapa[i.id]] || 0), 0);
        faixas.push({ pts, n: itens.length, pct: Math.round(pts * 100 / itens.length) });
      }
      const idade = faixas.reduce((s, x) => s + (x ? x.pts / x.n : 0), 0);
      const soma = faixas.reduce((s, x) => s + (x ? x.pts : 0), 0);
      const tot = faixas.reduce((s, x) => s + (x ? x.n : 0), 0);
      return { area, faixas, idade,
        total: tot ? Math.round(soma * 100 / tot) : null };
    });
  },

  fmtIdade(anos) {
    const m = Math.round(anos * 12);
    return Math.floor(m / 12) + 'a ' + (m % 12) + 'm';
  },

  async docPortage(pacienteId) {
    await this.carregarItensPortage();
    const ov = this.abrirDocOverlay();
    const [rAvs, rPac] = await Promise.all([
      sb.from('avaliacoes').select('id, concluido_em, avaliador:profiles!avaliacoes_avaliador_id_fkey(nome)')
        .eq('paciente_id', pacienteId).eq('protocolo', 'portage').eq('status', 'concluida')
        .order('concluido_em'),
      sb.from('pacientes').select('nome, data_nascimento').eq('id', pacienteId).single()
    ]);
    const avs = (rAvs.data || []).slice(0, 4);
    const pac = rPac.data;
    if (!avs.length || !pac) { ov.remove(); return; }
    const { data: resps } = await sb.from('portage_respostas')
      .select('avaliacao_id, item_id, valor').in('avaliacao_id', avs.map(a => a.id));
    const porAv = {};
    (resps || []).forEach(r => { (porAv[r.avaliacao_id] = porAv[r.avaliacao_id] || {})[r.item_id] = r.valor; });

    const calc = avs.map(av => ({ av, areas: this.calcPortage(porAv[av.id] || {}) }));
    const fmtD = d => new Date(d).toLocaleDateString('pt-BR');
    const ult = calc[calc.length - 1];
    const idadeGlobal = ult.areas.reduce((s, a) => s + a.idade, 0) / this.P_AREAS.length;

    const tabela = '<table class="deq-freq"><tr><th style="text-align:left; padding-left:10px">&Aacute;rea</th>' +
      this.P_FAIXAS.map(f => '<th>' + f.split(' ')[0] + '</th>').join('') +
      '<th>Total</th><th>Idade desenv.</th></tr>' +
      ult.areas.map(a =>
        '<tr><td style="text-align:left; padding:6px 10px; width:auto">' + a.area + '</td>' +
        a.faixas.map(x => '<td style="width:auto">' + (x === null ? '&mdash;' : x.pct + '%') + '</td>').join('') +
        '<td style="width:auto"><b>' + (a.total === null ? '&mdash;' : a.total + '%') + '</b></td>' +
        '<td style="width:auto"><b>' + this.fmtIdade(a.idade) + '</b></td></tr>').join('') +
      '</table>';

    const barras = '<div style="display:grid; gap:14px; padding:4px 6px">' +
      this.P_AREAS.map(area => {
        const linhas = calc.map((c, i) => {
          const a = c.areas.find(x => x.area === area);
          if (!a || a.total === null) return '';
          return '<div style="display:flex; align-items:center; gap:10px; margin-top:4px">' +
            '<small style="width:36px; font-weight:800; color:' + this.COR_AV[i % 6] + '">AV' + (i + 1) + '</small>' +
            '<div style="flex:1; height:10px; background:#EFF4F8; border-radius:6px; overflow:hidden">' +
            '<i style="display:block; height:100%; width:' + a.total + '%; background:' + this.COR_AV[i % 6] + '; border-radius:6px"></i></div>' +
            '<b style="width:96px; text-align:right; font-size:11px; white-space:nowrap">' + a.total + '% &middot; ' + this.fmtIdade(a.idade) + '</b></div>';
        }).join('');
        return linhas ? '<div><div style="font-size:11.5px; font-weight:800; color:var(--eq-azul-escuro)">' + area + '</div>' + linhas + '</div>' : '';
      }).join('') + '</div>';

    const ordenadas = ult.areas.filter(a => a.total !== null).sort((a, b) => b.total - a.total);
    let analise = 'Na aplica&ccedil;&atilde;o mais recente (' + fmtD(ult.av.concluido_em) + '), a idade de desenvolvimento global estimada &eacute; de <b>' +
      this.fmtIdade(idadeGlobal) + '</b>. ';
    if (ordenadas.length) {
      analise += 'A &aacute;rea mais desenvolvida &eacute; ' + ordenadas[0].area + ' (' + this.fmtIdade(ordenadas[0].idade) +
        '), e a de maior necessidade de est&iacute;mulo &eacute; ' + ordenadas[ordenadas.length - 1].area +
        ' (' + this.fmtIdade(ordenadas[ordenadas.length - 1].idade) + '). ';
    }
    if (calc.length > 1) {
      const g0 = calc[0].areas.reduce((s, a) => s + a.idade, 0) / this.P_AREAS.length;
      const dif = Math.round((idadeGlobal - g0) * 12);
      analise += 'Entre a AV1 e a AV' + calc.length + ', a idade de desenvolvimento global ' +
        (dif > 0 ? 'avan&ccedil;ou <b>' + dif + ' mes(es)</b>.' : dif < 0 ? 'recuou ' + (-dif) + ' mes(es).' : 'manteve-se estavel.');
    }

    window._docPortal = { paciente_id: pacienteId, tipo: 'avaliacao', titulo: 'Portage - Consolidado' };
    document.getElementById('doc-eq-corpo').innerHTML =
      '<div class="pagina-cabecalho nao-imprime">' +
      '  <div><button class="btn-voltar" onclick="document.getElementById(\'doc-eq-overlay\').remove()">&larr; Fechar</button>' +
      '  <h2>Portage &middot; documento oficial</h2></div>' +
      '  <button class="btn btn-primario" onclick="window.print()">&#128424; Imprimir / PDF</button>' +
      portalBtn() +
      '</div>' +
      '<div class="doc-eq">' +
      this.cabecalhoDoc('GUIA PORTAGE', 'Avalia&ccedil;&atilde;o do desenvolvimento &middot; 5 &aacute;reas por faixa et&aacute;ria') +
      '<div class="deq-caixa deq-dados" style="grid-template-columns:1fr 1fr 1fr; margin-top:8px">' +
      '  <div><small>Paciente</small><b>' + escaparHtml(pac.nome) + '</b></div>' +
      '  <div><small>Nascimento</small><b>' + (pac.data_nascimento ? pac.data_nascimento.split('-').reverse().join('/') : '-') + '</b></div>' +
      '  <div style="border-bottom:none"><small>Idade de desenvolvimento global</small><b>' + this.fmtIdade(idadeGlobal) + '</b></div>' +
      '</div>' +
      '<h2 style="margin-top:12px"><span class="ponto deq-azul"></span>Aplica&ccedil;&otilde;es</h2>' +
      '<div class="deq-caixa deq-dados" style="grid-template-columns:repeat(' + calc.length + ', 1fr)">' +
      calc.map((c, i) =>
        '<div' + (i === calc.length - 1 ? ' style="border-bottom:none"' : '') + '><small style="color:' + this.COR_AV[i % 6] + '">AV' + (i + 1) + '</small>' +
        '<b>' + fmtD(c.av.concluido_em) + '<br><span style="font-size:10px; font-weight:600">' +
        escaparHtml(c.av.avaliador ? c.av.avaliador.nome.split(' ')[0] : '-') + '</span></b></div>').join('') +
      '</div>' +
      '<h2 style="margin-top:14px"><span class="ponto deq-teal"></span>% de acertos por faixa et&aacute;ria (AV' + calc.length + ')</h2>' +
      tabela +
      '<div class="deq-caixa" style="margin-top:8px"><p class="sub" style="font-size:10.5px; margin-bottom:2px">% de acertos por faixa et&aacute;ria e &aacute;rea &middot; AV' + calc.length + '</p>' +
      this.gBarras(this.P_FAIXAS.map(f => f.replace(' anos', 'a').replace(' ano', 'a')), this.P_AREAS.map((area, i) => ({
        nome: area, cor: this.COR_AREA[i],
        valores: ult.areas.find(a => a.area === area).faixas.map(x => x === null ? null : x.pct)
      })), { altura: 250 }) +
      '<p class="sub" style="font-size:10.5px; margin:10px 0 2px">Idade de desenvolvimento por &aacute;rea (meses)</p>' +
      this.gBarras(this.P_AREAS, calc.map((c, i) => ({
        nome: 'AV' + (i + 1), cor: this.COR_AV[i % 6],
        valores: this.P_AREAS.map(area => Math.round(c.areas.find(a => a.area === area).idade * 12))
      })), { max: 72, unidade: 'm', legenda: true }) +
      '</div>' +
      '<h2 style="margin-top:14px"><span class="ponto deq-amarelo"></span>Comparativo entre aplica&ccedil;&otilde;es</h2>' +
      '<div class="deq-caixa">' + barras +
      (calc.length > 1
        ? '<div style="margin-top:10px">' + this.gBarras(this.P_AREAS, calc.map((c, i) => ({
            nome: 'AV' + (i + 1), cor: this.COR_AV[i % 6],
            valores: this.P_AREAS.map(area => { const a = c.areas.find(x => x.area === area); return a.total === null ? null : a.total; })
          }))) + '</div>'
        : '') +
      '</div>' +
      '<h2 style="margin-top:14px"><span class="ponto deq-rosa"></span>An&aacute;lise</h2>' +
      '<div class="deq-caixa deq-texto">' + analise +
      '<br><small style="color:var(--eq-cinza)">Regra: Sim = 1 &middot; As vezes = 0,5 &middot; Nao/NA/em branco = 0; % da faixa = pontos &divide; itens da faixa; idade de desenvolvimento = soma das fra&ccedil;&otilde;es das faixas aplicadas. Texto de apoio gerado automaticamente; a leitura cl&iacute;nica cabe &agrave; equipe.</small></div>' +
      this.rodapeDoc() +
      '</div>';
  }
};
