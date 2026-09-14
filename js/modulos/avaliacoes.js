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
      '  <p class="sub">Visao da coordenacao. As aplicacoes acontecem na pasta de cada paciente (aba Avaliacao do prontuario).</p></div>' +
      '</div>' +
      '<div id="av-lista"><div class="cartao"><p class="sub">Carregando...</p></div></div>' +
      '<div id="av-venc"></div>';
    this.quadroVencimentos();

    const { data, error } = await sb
      .from('avaliacoes')
      .select('id, protocolo, status, iniciado_em, concluido_em, pacientes(id, nome), avaliador:profiles!avaliacoes_avaliador_id_fkey(nome)')
      .order('iniciado_em', { ascending: false })
      .limit(60);

    const alvo = document.getElementById('av-lista');
    if (error) {
      alvo.innerHTML = '<div class="cartao"><div class="mensagem-erro visivel">' +
        escaparHtml(error.message) + '</div></div>';
      return;
    }

    await Promise.all([this.carregarQuestoes(), this.carregarItensSS()]);
    const lista = data || [];
    const abertas = lista.filter(x => x.status !== 'concluida');
    const concluidas = lista.filter(x => x.status === 'concluida');
    const nomeProt = x => x.protocolo === 'ss' ? 'Socially Savvy' : 'QADI-R';
    const diasAberta = x => Math.floor((Date.now() - new Date(x.iniciado_em)) / 86400000);

    alvo.innerHTML =
      '<div class="grade-visao" style="margin-bottom:14px">' +
      '  <div class="caixa-info"><small>Em andamento</small><b>' + abertas.length + '</b></div>' +
      '  <div class="caixa-info"><small>Concluidas (60 recentes)</small><b>' + concluidas.length + '</b></div>' +
      '  <div class="caixa-info"><small>QADI-R &middot; catalogo</small><b>' + this.questoes.length + ' questoes</b></div>' +
      '  <div class="caixa-info"><small>Socially Savvy &middot; catalogo</small><b>' + this.itensSS.length + ' itens</b></div>' +
      '</div>' +

      '<div class="cartao faixa-ambar"><h3>Em andamento <span class="selo selo-neutro">' + abertas.length + '</span></h3>' +
      (abertas.length ? abertas.map(x =>
        '<div class="linha-doc"><div><b>' + escaparHtml(x.pacientes ? x.pacientes.nome : '?') +
        ' &middot; ' + nomeProt(x) + '</b>' +
        '<small>' + (x.avaliador ? escaparHtml(x.avaliador.nome) + ' &middot; ' : '') +
        'iniciada em ' + new Date(x.iniciado_em).toLocaleDateString('pt-BR') +
        (diasAberta(x) >= 7 ? ' &middot; <b style="color:var(--acao)">' + diasAberta(x) + ' dias aberta</b>' : '') +
        '</small></div>' +
        '<div class="pac-selos">' +
        '<button class="btn-chip cheio" onclick="MODULOS.avaliacoes.abrirJanela(\'' + x.id + '\')">Abrir</button>' +
        '<button class="btn-chip" title="Cancela e apaga esta aplicacao aberta por engano. As respostas ja registradas vao junto." ' +
        'onclick="MODULOS.avaliacoes.cancelarAvaliacao(\'' + x.id + '\', \'' +
        escaparHtml((x.pacientes ? x.pacientes.nome : '') + ' - ' + nomeProt(x)) + '\')">Cancelar</button>' +
        '</div></div>').join('')
      : '<p class="sub">Nenhuma aplicacao em aberto.</p>') +
      '</div>' +

      '<div class="cartao"><h3>Concluidas recentes</h3>' +
      (concluidas.length ? concluidas.map(x =>
        '<div class="linha-doc"><div><b>' + escaparHtml(x.pacientes ? x.pacientes.nome : '?') +
        ' &middot; ' + nomeProt(x) + '</b>' +
        '<small>' + (x.avaliador ? escaparHtml(x.avaliador.nome) + ' &middot; ' : '') +
        'concluida em ' + new Date(x.concluido_em).toLocaleDateString('pt-BR') + '</small></div>' +
        '<button class="btn-chip" onclick="MODULOS.avaliacoes.abrirJanela(\'' + x.id + '\', true)">Resultado</button>' +
        '</div>').join('')
      : '<p class="sub">Nenhuma avaliacao concluida.</p>') +
      '</div>' +

      '<div class="cartao"><h3>Protocolos</h3>' +
      '<div class="linha-doc"><div><b>QADI-R</b><small>' + this.questoes.length +
      ' questoes por faixa etaria e area &middot; aplicado pela coordenacao e terapeutas</small></div>' +
      '<button class="btn-chip" onclick="MODULOS.avaliacoes.verCatalogo(\'qadi\')">Ver itens</button></div>' +
      '<div class="linha-doc"><div><b>Socially Savvy</b><small>' + this.itensSS.length +
      ' itens em 7 areas, escala 0-3 &middot; aplicadores tambem aplicam</small></div>' +
      '<button class="btn-chip" onclick="MODULOS.avaliacoes.verCatalogo(\'ss\')">Ver itens</button></div>' +
      '<div class="linha-doc"><div><b>IPO</b><small>Aguardando criterios para entrar no sistema</small></div>' +
      '<span class="selo selo-neutro">Em breve</span></div>' +
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

  async cancelarAvaliacao(id, rotulo) {
    if (!confirm('Cancelar e apagar a aplicacao "' + rotulo + '"?\n' +
      'As respostas ja registradas serao apagadas junto. Esta acao nao tem volta.')) return;
    const { error } = await sb.from('avaliacoes').delete().eq('id', id);
    if (error) { alert('Nao foi possivel cancelar: ' + error.message); return; }
    this.telaLista();
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

  telaAplicacao() {
    const av = this.avaliacao;

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
    await sb.from('avaliacoes').update({ oral: valor }).eq('id', this.avaliacao.id);
  },

  _obsTimer: null,
  salvarObs() {
    clearTimeout(this._obsTimer);
    this._obsTimer = setTimeout(async () => {
      const v = document.getElementById('av-obs').value;
      this.avaliacao.observacoes = v;
      await sb.from('avaliacoes').update({ observacoes: v }).eq('id', this.avaliacao.id);
    }, 600);
  },

  async concluir() {
    const respondidas = Object.keys(this.respostas).length;
    if (respondidas === 0) { alert('Nenhuma resposta registrada ainda.'); return; }
    if (!confirm('Concluir a avaliacao com ' + respondidas + ' resposta(s)? ' +
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
  async htmlResultado(avaliacaoId) {
    await this.carregarQuestoes();

    const { data: av } = await sb.from('avaliacoes')
      .select('*, paciente_id, pacientes(nome, data_nascimento), avaliador:profiles!avaliacoes_avaliador_id_fkey(nome)')
      .eq('id', avaliacaoId).single();
    if (!av) return '<div class="cartao"><p class="sub">Avaliacao nao encontrada.</p></div>';
    if (av.protocolo === 'ss') return this.htmlResultadoSS(av);

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
          '<button class="btn btn-fantasma" onclick="MODULOS.pei.abrirDevolutiva(\'' + av.id + '\')">Relatorio de devolutiva</button>' +
          '<span class="sub">O PEI e elaborado na aba PEI do prontuario do paciente.</span>' +
          '</div>'
        : '') +
      '</div>';
  },

  // Lista de avaliacoes de um paciente (aba do prontuario)
  async htmlDoPaciente(pacienteId) {
    this._pacAtualId = pacienteId;
    const { data } = await sb.from('avaliacoes')
      .select('id, protocolo, status, iniciado_em, concluido_em')
      .eq('paciente_id', pacienteId)
      .order('iniciado_em', { ascending: false });

    const podeQadi = perm('avaliacoes') === 'E';
    const podeSS = podeQadi || perm('evolucao') === 'E';
    let acoes = '';
    if (podeQadi || podeSS) {
      acoes = '<div class="aba-acoes">' +
        (podeQadi
          ? '<button class="btn btn-primario" title="Inicia uma aplicacao QADI-R deste paciente, em janela por cima do prontuario." ' +
            'onclick="MODULOS.avaliacoes.iniciarDoProntuario(\'' + pacienteId + '\', \'qadi\')">+ QADI-R</button>' : '') +
        (podeSS
          ? '<button class="btn ' + (podeQadi ? 'btn-fantasma' : 'btn-primario') + '" ' +
            'title="Inicia uma aplicacao Socially Savvy deste paciente, em janela por cima do prontuario." ' +
            'onclick="MODULOS.avaliacoes.iniciarDoProntuario(\'' + pacienteId + '\', \'ss\')">+ Socially Savvy</button>' : '') +
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
          '<div class="linha-doc"><div><b>' + (x.protocolo === 'ss' ? 'Socially Savvy' : 'QADI-R') + '</b>' +
          '<small>Iniciada em ' + new Date(x.iniciado_em).toLocaleDateString('pt-BR') + '</small></div>' +
          '<button class="btn-chip cheio" onclick="MODULOS.avaliacoes.abrirJanela(\'' + x.id + '\')">Continuar</button>' +
          '</div>').join('') + '</div>';
    }

    const concluidas = data.filter(x => x.status === 'concluida');
    let html = acoes;
    if (concluidas.length) {
      const temSS = concluidas.some(x => x.protocolo === 'ss');
      const nSS = concluidas.filter(x => x.protocolo === 'ss').length;
      html += '<div class="cartao"><h3>Concluidas <span class="selo selo-neutro">' + concluidas.length + '</span></h3>' +
        '<p class="sub" style="margin-bottom:8px">Os resultados vivem nos documentos oficiais: gere e imprima ou envie ao portal.</p>' +
        (temSS
          ? '<div class="linha-doc"><div><b>Socially Savvy &middot; consolidado</b>' +
            '<small>' + nSS + ' aplicacao(oes) (AV1' + (nSS > 1 ? '-AV' + Math.min(nSS, 9) : '') + ') com datas, areas e graficos</small></div>' +
            '<button class="btn btn-primario" onclick="MODULOS.avaliacoes.docSS(\'' + pacienteId + '\')">&#128196; Ver documento</button>' +
            '</div>'
          : '') +
        concluidas.filter(a => a.protocolo !== 'ss').map(a =>
          '<div class="linha-doc"><div><b>QADI-R</b>' +
          '<small>Concluida em ' + new Date(a.concluido_em).toLocaleDateString('pt-BR') + '</small></div>' +
          '<div class="pac-selos">' +
          '<button class="btn btn-primario" onclick="MODULOS.avaliacoes.docQADI(\'' + a.id + '\')">&#128196; Ver documento</button>' +
          (perm('pei') === 'E'
            ? '<button class="btn-chip" onclick="MODULOS.pei.abrirDevolutiva(\'' + a.id + '\')">Devolutiva</button>' : '') +
          '</div></div>').join('') +
        '</div>';
    }
    return html;
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

  async docSS(pacienteId) {
    await this.carregarItensSS();
    const ov = this.abrirDocOverlay();

    const [rAvs, rPac] = await Promise.all([
      sb.from('avaliacoes').select('id, concluido_em, contexto, duracao_min, avaliador:profiles!avaliacoes_avaliador_id_fkey(nome)')
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

    // % por area em cada AV + total
    const dados = avs.map(av => {
      const porArea = this.SS_AREAS.map(area => {
        const itens = this.itensSS.filter(i => i.area === area);
        const r = itens.reduce((s, i) => s + (mapa[av.id + '|' + i.id] || 0), 0);
        return { area, pct: itens.length ? Math.round(r * 100 / (itens.length * 3)) : 0, r, max: itens.length * 3 };
      });
      const totR = porArea.reduce((s, x) => s + x.r, 0);
      const totM = porArea.reduce((s, x) => s + x.max, 0);
      return { av, porArea, total: totM ? Math.round(totR * 100 / totM) : 0 };
    });

    const fmtD = d => new Date(d).toLocaleDateString('pt-BR');

    // Grafico 1: barras horizontais por area, uma cor por AV (estilo GRAFICO-1 da pasta)
    const grafAreas = '<div style="display:grid; gap:10px">' +
      this.SS_AREAS.map(area =>
        '<div><div style="font-size:11px; font-weight:800; color:var(--eq-azul-escuro); margin-bottom:3px">' + area + '</div>' +
        dados.map((d, i) => {
          const x = d.porArea.find(p => p.area === area);
          return '<div style="display:flex; align-items:center; gap:8px; margin-top:2px">' +
            '<small style="width:34px; font-weight:800; color:' + this.COR_AV[i % 6] + '">AV' + (i + 1) + '</small>' +
            '<div style="flex:1; height:9px; background:#EFF4F8; border-radius:5px; overflow:hidden">' +
            '<i style="display:block; height:100%; width:' + x.pct + '%; background:' + this.COR_AV[i % 6] + '; border-radius:5px"></i></div>' +
            '<b style="width:40px; text-align:right; font-size:11px">' + x.pct + '%</b></div>';
        }).join('') + '</div>').join('') + '</div>';

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
      '<p style="font-size:10px; color:var(--eq-cinza); margin-top:10px">Pontua&ccedil;&atilde;o 0&ndash;3 por item; percentual = pontos obtidos sobre o m&aacute;ximo da &aacute;rea. O PEI derivado desta avalia&ccedil;&atilde;o &eacute; elaborado na aba PEI e possui documento pr&oacute;prio.</p>' +
      this.rodapeDoc() +
      '</div>';
  },

  async docQADI(avaliacaoId) {
    await this.carregarQuestoes();
    const ov = this.abrirDocOverlay();

    const { data: av } = await sb.from('avaliacoes')
      .select('*, paciente_id, pacientes(nome, data_nascimento), avaliador:profiles!avaliacoes_avaliador_id_fkey(nome)')
      .eq('id', avaliacaoId).single();
    if (!av) { ov.remove(); return; }
    const { data: resps } = await sb.from('avaliacao_respostas')
      .select('questao_id, resposta').eq('avaliacao_id', avaliacaoId);
    const mapa = {};
    (resps || []).forEach(r => { mapa[r.questao_id] = r.resposta; });

    const faixas = this.FAIXAS.filter(f => this.questoes.some(q => q.faixa === f && mapa[q.id]));
    const linhas = this.AREAS.map(area => {
      let gs = 0, gv = 0;
      const cels = faixas.map(f => {
        const qs = this.questoes.filter(q => q.faixa === f && q.area === area);
        const sim = qs.filter(q => mapa[q.id] === 'S').length;
        const val = qs.filter(q => ['S', 'N'].includes(mapa[q.id])).length;
        gs += sim; gv += val;
        return val ? Math.round(sim * 100 / val) + '%' : '&mdash;';
      });
      return { area, cels, geral: gv ? Math.round(gs * 100 / gv) : null };
    });

    window._docPortal = { paciente_id: av.paciente_id, tipo: 'avaliacao', titulo: 'QADI-R' };
    document.getElementById('doc-eq-corpo').innerHTML =
      '<div class="pagina-cabecalho nao-imprime">' +
      '  <div><button class="btn-voltar" onclick="document.getElementById(\'doc-eq-overlay\').remove()">&larr; Fechar</button>' +
      '  <h2>QADI-R &middot; documento oficial</h2></div>' +
      '  <button class="btn btn-primario" onclick="window.print()">&#128424; Imprimir / PDF</button>' +
      portalBtn() +
      '</div>' +
      '<div class="doc-eq">' +
      this.cabecalhoDoc('QADI-R', 'Question&aacute;rio de Avalia&ccedil;&atilde;o do Desenvolvimento Infantil') +
      '<div class="deq-caixa deq-dados" style="grid-template-columns:repeat(4, 1fr); margin-top:8px">' +
      '  <div><small>Paciente</small><b>' + escaparHtml(av.pacientes.nome) + '</b></div>' +
      '  <div><small>Avaliador</small><b>' + escaparHtml(av.avaliador ? av.avaliador.nome : '-') + '</b></div>' +
      '  <div><small>Conclu&iacute;da em</small><b>' + new Date(av.concluido_em).toLocaleDateString('pt-BR') + '</b></div>' +
      '  <div style="border-bottom:none"><small>Comunica&ccedil;&atilde;o</small><b>' +
           (av.oral === true ? 'Oral' : av.oral === false ? 'N&atilde;o oral' : '-') + '</b></div>' +
      '</div>' +
      '<h2 style="margin-top:12px"><span class="ponto deq-azul"></span>Resultado por &aacute;rea e faixa</h2>' +
      '<p style="font-size:10.5px; color:var(--eq-cinza); margin:2px 0 6px">Percentual de SIM sobre respostas v&aacute;lidas (NA exclu&iacute;do). Faixas aplicadas: ' +
      faixas.join(' &middot; ') + '.</p>' +
      '<table class="deq-freq"><tr><th style="text-align:left; padding-left:10px">&Aacute;rea</th>' +
      faixas.map(f => '<th>' + f.replace(' anos', '').replace(' ano', '').replace(' a ', '&ndash;') + 'a</th>').join('') +
      '<th>Geral</th></tr>' +
      linhas.map(l =>
        '<tr><td style="text-align:left; padding:6px 10px; width:auto">' + l.area + '</td>' +
        l.cels.map(c => '<td style="width:auto">' + c + '</td>').join('') +
        '<td style="width:auto"><b>' + (l.geral === null ? '&mdash;' : l.geral + '%') + '</b></td></tr>').join('') +
      '</table>' +
      '<h2 style="margin-top:14px"><span class="ponto deq-teal"></span>Perfil geral</h2>' +
      '<div class="deq-caixa" style="display:grid; gap:8px">' +
      linhas.map(l =>
        '<div style="display:flex; align-items:center; gap:8px">' +
        '<small style="width:170px; font-weight:700">' + l.area + '</small>' +
        '<div style="flex:1; height:9px; background:#EFF4F8; border-radius:5px; overflow:hidden">' +
        '<i style="display:block; height:100%; width:' + (l.geral || 0) + '%; background:var(--eq-azul); border-radius:5px"></i></div>' +
        '<b style="width:44px; text-align:right; font-size:11px">' + (l.geral === null ? '&mdash;' : l.geral + '%') + '</b></div>').join('') +
      '</div>' +
      (av.observacoes
        ? '<h2 style="margin-top:14px"><span class="ponto deq-amarelo"></span>Observa&ccedil;&otilde;es</h2>' +
          '<div class="deq-caixa deq-texto">' + escaparHtml(av.observacoes) + '</div>' : '') +
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
    const total = this.itensSS.length;
    const feitas = Object.keys(this.respSS).length;

    let corpo = '';
    this.SS_AREAS.forEach(area => {
      const itens = this.itensSS.filter(i => i.area === area);
      if (!itens.length) return;
      const feitasArea = itens.filter(i => this.respSS[i.id] !== undefined).length;
      corpo += '<div class="cartao"><h3>' + area +
        ' <span class="selo selo-neutro" id="ss-cont-' + this.slugSS(area) + '">' +
        feitasArea + '/' + itens.length + '</span></h3>' +
        itens.map(i =>
          '<div class="campo questao"><label><b style="color:var(--ink-muted); margin-right:6px">' +
          i.codigo + '</b>' + escaparHtml(i.texto) + '</label>' +
          '<div class="segmento">' +
          [0, 1, 2, 3].map(v =>
            '<button type="button" class="seg' + (this.respSS[i.id] === v ? ' ativo' : '') + '" ' +
            'title="' + this.SS_ESCALA[v][1] + '" ' +
            'onclick="MODULOS.avaliacoes.responderSS(this, ' + i.id + ', ' + v + ')">' + v + '</button>'
          ).join('') +
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
      '</div></div>' +
      corpo +
      '<div class="cartao"><div class="campo" style="margin:0"><label>Observacoes</label>' +
      '<textarea id="av-obs" rows="3" oninput="MODULOS.avaliacoes.salvarObs()" ' +
      'style="resize:vertical">' + escaparHtml(av.observacoes || '') + '</textarea></div></div>';
  },

  slugSS(t) { return t.toLowerCase().replace(/[^a-z]/g, ''); },

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
      alert('Falha ao salvar: ' + error.message);
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
      await sb.from('avaliacoes').update(dados).eq('id', this.avaliacao.id);
    }, 600);
  },

  async concluirSS() {
    const total = this.itensSS.length;
    const feitas = Object.keys(this.respSS).length;
    if (feitas < total) {
      alert('Faltam ' + (total - feitas) + ' item(ns) para pontuar. O Socially Savvy e concluido com os ' +
        total + ' itens respondidos.');
      return;
    }
    if (!confirm('Concluir a Avaliacao ' + this.numSS + ' do Socially Savvy? Depois ela fica somente leitura.')) return;

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

    const porArea = this.SS_AREAS.map(area => {
      const itens = this.itensSS.filter(i => i.area === area);
      const realizados = itens.reduce((s, i) => s + (mapa[i.id] || 0), 0);
      const esperados = itens.length * 3;
      return { area, realizados, esperados,
               pct: esperados ? Math.round(realizados * 100 / esperados) : 0 };
    });
    const totR = porArea.reduce((s, x) => s + x.realizados, 0);
    const totE = porArea.reduce((s, x) => s + x.esperados, 0);

    let tabela = '<table class="tabela-presenca"><thead><tr>' +
      '<th>Area de desenvolvimento social</th><th class="centro">Realizados</th>' +
      '<th class="centro">Esperados</th><th class="centro">%</th></tr></thead><tbody>' +
      porArea.map(x =>
        '<tr><td>' + x.area + '</td><td class="centro">' + x.realizados + '</td>' +
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
      .select('id, concluido_em').eq('paciente_id', av.paciente_id)
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
        this.SS_AREAS.map(area => {
          const itens = this.itensSS.filter(i => i.area === area);
          return '<tr><td>' + area + '</td>' +
            todas.map(t => {
              const m = porAv[t.id] || {};
              const r = itens.reduce((s, i) => s + (m[i.id] || 0), 0);
              return '<td class="centro">' + Math.round(r * 100 / (itens.length * 3)) + '%</td>';
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
      tabela + grafico +
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
  }
};
