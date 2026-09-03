// ============================================================================
// CORTEX aba - js/modulos/anamnese.js
// Anamnese Global no portal da familia: assistente por secoes, salvar e
// continuar depois, conclusao com calculo automatico do nivel (via RPC).
// Tambem fornece a leitura interna usada no prontuario.
// ============================================================================

window.MODULOS = window.MODULOS || {};

window.MODULOS.anamnese = {

  SECOES: [
    { id: 'GERAL', rotulo: 'Sobre a crianca' },
    { id: 'ABA',   rotulo: 'Comportamento e aprendizagem' },
    { id: 'TO',    rotulo: 'Rotina e vida diaria' },
    { id: 'PSM',   rotulo: 'Movimento' },
    { id: 'FONO',  rotulo: 'Fala e audicao' },
    { id: 'PSP',   rotulo: 'Escola' }
  ],

  questoes: [],
  respostas: {},
  anamneseId: null,
  pacienteId: null,
  pacienteNome: '',
  secaoAtual: 0,

  render(el, sessao) {
    // Aba do menu da familia: escolhe o filho (ou abre direto se for um so)
    el.innerHTML = '<div class="cartao"><p class="sub">Carregando...</p></div>';
    sb.from('familia_pacientes')
      .select('paciente_id, pacientes(id, nome)')
      .eq('usuario_id', sessao.user.id)
      .then(({ data }) => {
        if (!data || data.length === 0) {
          el.innerHTML = '<div class="cartao"><p class="sub">Nenhuma crianca vinculada.</p></div>';
          return;
        }
        if (data.length === 1) { this.abrir(data[0].paciente_id); return; }
        el.innerHTML = '<div class="cartao"><h3>Escolha a crianca</h3>' +
          data.map(v => '<div class="linha-doc"><b>' + escaparHtml(v.pacientes.nome) + '</b>' +
            '<button class="btn btn-fantasma" onclick="MODULOS.anamnese.abrir(\'' +
            v.paciente_id + '\')">Abrir anamnese</button></div>').join('') + '</div>';
      });
  },

  async abrir(pacienteId) {
    this.pacienteId = pacienteId;
    const el = document.getElementById('pagina');
    el.innerHTML = '<div class="cartao"><p class="sub">Carregando a anamnese...</p></div>';

    const { data: pac } = await sb.from('pacientes').select('nome').eq('id', pacienteId).single();
    this.pacienteNome = pac ? pac.nome : '';

    // Catalogo de questoes
    const { data: qs, error: eq } = await sb
      .from('anamnese_questoes')
      .select('*')
      .order('ordem');
    if (eq || !qs || qs.length === 0) {
      el.innerHTML = '<div class="cartao"><div class="mensagem-erro visivel">' +
        'Nao foi possivel carregar o questionario. Tente novamente.</div></div>';
      return;
    }
    this.questoes = qs;

    // Anamnese do paciente (cria se nao existir)
    let { data: an } = await sb.from('anamneses')
      .select('*').eq('paciente_id', pacienteId).maybeSingle();

    if (!an) {
      const { data: nova, error: en } = await sb.from('anamneses')
        .insert({ paciente_id: pacienteId, status: 'em_andamento',
                  preenchido_por: window.CORTEX_SESSAO.user.id })
        .select('*').single();
      if (en) {
        el.innerHTML = '<div class="cartao"><div class="mensagem-erro visivel">Erro: ' +
          escaparHtml(en.message) + '</div></div>';
        return;
      }
      an = nova;
    }

    if (an.status === 'concluida') { this.telaConcluida(); return; }

    this.anamneseId = an.id;
    this.secaoAtual = Math.min(an.secao_atual || 0, this.SECOES.length - 1);

    // Respostas ja salvas
    this.respostas = {};
    const { data: resps } = await sb.from('anamnese_respostas')
      .select('questao_id, resposta').eq('anamnese_id', an.id);
    (resps || []).forEach(r => { this.respostas[r.questao_id] = r.resposta; });

    this.telaSecao();
  },

  telaSecao() {
    const el = document.getElementById('pagina');
    const sec = this.SECOES[this.secaoAtual];
    const qs = this.questoes.filter(q => q.secao === sec.id);

    const passos = this.SECOES.map((s, i) =>
      '<div class="passo' + (i < this.secaoAtual ? ' feito' : i === this.secaoAtual ? ' atual' : '') + '">' +
      '<span>' + (i + 1) + '</span>' + s.rotulo + '</div>').join('');

    let html =
      '<div class="pagina-cabecalho"><div>' +
      '  <h2>Anamnese Global</h2>' +
      '  <p class="sub">' + escaparHtml(this.pacienteNome) +
      ' &middot; Etapa ' + (this.secaoAtual + 1) + ' de ' + this.SECOES.length +
      ' &middot; Suas respostas sao salvas a cada etapa.</p>' +
      '</div></div>' +
      '<div class="passos">' + passos + '</div>' +
      '<form onsubmit="MODULOS.anamnese.avancar(event)">';

    let sub = null;
    qs.forEach(q => {
      if (q.subsecao !== sub) {
        if (sub !== null) html += '</div>';
        sub = q.subsecao;
        html += '<div class="cartao">' +
          (sub ? '<h3>' + escaparHtml(sub) + '</h3>' : '');
      } else if (qs.indexOf(q) === 0) {
        html += '<div class="cartao">';
      }
      html += this.htmlQuestao(q);
    });
    if (qs.length) html += '</div>';

    html +=
      '<div class="mensagem-erro" id="an-erro"></div>' +
      '<div class="barra-acoes">' +
      (this.secaoAtual > 0
        ? '<button type="button" class="btn btn-fantasma" onclick="MODULOS.anamnese.voltar()">&larr; Anterior</button>'
        : '<button type="button" class="btn btn-fantasma" onclick="abrirModulo(\'portal\')">Sair e continuar depois</button>') +
      '  <button type="submit" class="btn btn-primario" id="an-avancar">' +
      (this.secaoAtual === this.SECOES.length - 1 ? 'Concluir anamnese' : 'Salvar e continuar &rarr;') +
      '</button>' +
      '</div></form>';

    el.innerHTML = html;
    window.scrollTo({ top: 0 });
  },

  htmlQuestao(q) {
    const v = this.respostas[q.id] || '';
    let campo = '';

    if (q.tipo === 'sim_nao') {
      campo = '<div class="segmento" data-q="' + q.id + '">' +
        ['Sim', 'Nao'].map(op =>
          '<button type="button" class="seg' + (v === op ? ' ativo' : '') + '" ' +
          'onclick="MODULOS.anamnese.marcarSeg(this, ' + q.id + ', \'' + op + '\')">' +
          (op === 'Nao' ? 'N&atilde;o' : op) + '</button>').join('') + '</div>';
    } else if (q.tipo === 'opcao') {
      const lista = (q.opcoes && q.opcoes.lista) || [];
      campo = '<div class="segmento" data-q="' + q.id + '">' +
        lista.map(op =>
          '<button type="button" class="seg' + (v === op ? ' ativo' : '') + '" ' +
          'onclick="MODULOS.anamnese.marcarSeg(this, ' + q.id + ', \'' + op.replace(/'/g, "\\'") + '\')">' +
          escaparHtml(op) + '</button>').join('') + '</div>';
    } else if (q.tipo === 'multi') {
      const lista = (q.opcoes && q.opcoes.lista) || [];
      const marcadas = v ? v.split('||') : [];
      campo = '<div class="multi" data-q="' + q.id + '" data-exclusiva="' +
        ((q.opcoes && q.opcoes.exclusiva) || '') + '">' +
        lista.map(op =>
          '<label class="check"><input type="checkbox" value="' + escaparHtml(op) + '"' +
          (marcadas.includes(op) ? ' checked' : '') +
          ' onchange="MODULOS.anamnese.marcarMulti(this, ' + q.id + ')"> ' +
          escaparHtml(op) + '</label>').join('') + '</div>';
    } else if (q.tipo === 'texto_longo') {
      campo = '<textarea rows="2" data-q="' + q.id + '" ' +
        'oninput="MODULOS.anamnese.respostas[' + q.id + '] = this.value">' +
        escaparHtml(v) + '</textarea>';
    } else if (q.tipo === 'numero') {
      campo = '<input type="number" step="any" data-q="' + q.id + '" value="' + escaparHtml(v) + '" ' +
        'oninput="MODULOS.anamnese.respostas[' + q.id + '] = this.value">';
    } else if (q.tipo === 'data') {
      campo = '<input type="date" data-q="' + q.id + '" value="' + escaparHtml(v) + '" ' +
        'oninput="MODULOS.anamnese.respostas[' + q.id + '] = this.value">';
    } else {
      campo = '<input data-q="' + q.id + '" value="' + escaparHtml(v) + '" ' +
        'oninput="MODULOS.anamnese.respostas[' + q.id + '] = this.value">';
    }

    return '<div class="campo questao"><label>' + escaparHtml(q.pergunta) + '</label>' + campo + '</div>';
  },

  marcarSeg(botao, qId, valor) {
    this.respostas[qId] = valor;
    botao.parentElement.querySelectorAll('.seg').forEach(b => b.classList.remove('ativo'));
    botao.classList.add('ativo');
  },

  marcarMulti(check, qId) {
    const caixa = check.closest('.multi');
    const exclusiva = caixa.dataset.exclusiva;
    if (exclusiva && check.value === exclusiva && check.checked) {
      caixa.querySelectorAll('input').forEach(i => { if (i !== check) i.checked = false; });
    } else if (exclusiva && check.checked) {
      caixa.querySelectorAll('input').forEach(i => { if (i.value === exclusiva) i.checked = false; });
    }
    const marcadas = Array.from(caixa.querySelectorAll('input:checked')).map(i => i.value);
    this.respostas[qId] = marcadas.join('||');
  },

  async salvarSecao() {
    const sec = this.SECOES[this.secaoAtual];
    const qs = this.questoes.filter(q => q.secao === sec.id);
    const linhas = qs
      .filter(q => (this.respostas[q.id] || '') !== '')
      .map(q => ({ anamnese_id: this.anamneseId, questao_id: q.id, resposta: this.respostas[q.id] }));

    if (linhas.length) {
      const { error } = await sb.from('anamnese_respostas')
        .upsert(linhas, { onConflict: 'anamnese_id,questao_id' });
      if (error) throw new Error(error.message);
    }

    await sb.from('anamneses')
      .update({ secao_atual: this.secaoAtual })
      .eq('id', this.anamneseId);
  },

  async voltar() {
    try { await this.salvarSecao(); } catch (e) {}
    this.secaoAtual--;
    this.telaSecao();
  },

  async avancar(ev) {
    ev.preventDefault();
    const botao = document.getElementById('an-avancar');
    const erro = document.getElementById('an-erro');
    erro.classList.remove('visivel');

    // As 18 questoes de nivel sao obrigatorias na secao ABA
    const sec = this.SECOES[this.secaoAtual];
    if (sec.id === 'ABA') {
      const faltam = this.questoes.filter(q =>
        q.secao === 'ABA' && q.conta_nivel && !(this.respostas[q.id] || ''));
      if (faltam.length) {
        erro.textContent = 'Responda todas as perguntas Sim/Nao desta etapa (' +
          faltam.length + ' em branco).';
        erro.classList.add('visivel');
        erro.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
    }

    botao.disabled = true;
    botao.textContent = 'Salvando...';

    try {
      await this.salvarSecao();

      if (this.secaoAtual === this.SECOES.length - 1) {
        const { error } = await sb.rpc('concluir_anamnese', { p_anamnese_id: this.anamneseId });
        if (error) throw new Error(error.message);
        this.telaConcluida();
        return;
      }

      this.secaoAtual++;
      await sb.from('anamneses').update({ secao_atual: this.secaoAtual }).eq('id', this.anamneseId);
      this.telaSecao();
    } catch (e) {
      erro.textContent = e.message;
      erro.classList.add('visivel');
      botao.disabled = false;
      botao.textContent = 'Salvar e continuar';
    }
  },

  telaConcluida() {
    document.getElementById('pagina').innerHTML =
      '<section class="heroi portal"><div>' +
      '  <h1>Anamnese recebida!</h1>' +
      '  <div class="sub">Obrigado por dedicar esse tempo. Cada resposta ajuda a montar o melhor plano para ' +
      escaparHtml(this.pacienteNome.split(' ')[0]) + '.</div>' +
      '</div></section>' +
      '<div class="cartao faixa-verde">' +
      '  <h3>Proximos passos</h3>' +
      '  <p class="sub" style="line-height:1.7">A coordenacao da Equilibrium vai analisar as informacoes, ' +
      'definir o formato de acompanhamento mais indicado e entrar em contato para o agendamento das sessoes. ' +
      'Qualquer duvida, fale com a recepcao.</p>' +
      '</div>' +
      '<div class="barra-acoes">' +
      '  <button class="btn btn-primario" onclick="abrirModulo(\'portal\')">Voltar ao inicio</button>' +
      '</div>';
  },

  // ─────────────── Leitura interna (aba Anamnese do prontuario) ───────────────

  async htmlResumoInterno(pacienteId) {
    const { data: an } = await sb.from('anamneses')
      .select('*').eq('paciente_id', pacienteId).maybeSingle();

    if (!an) {
      return '<div class="cartao"><div class="vazio"><div class="simbolo-vazio">&#9998;</div>' +
        '<strong>Anamnese ainda nao iniciada</strong>' +
        'A familia recebera a pendencia no portal.</div></div>';
    }

    const { data: qs } = await sb.from('anamnese_questoes').select('*').order('ordem');
    const { data: resps } = await sb.from('anamnese_respostas')
      .select('questao_id, resposta').eq('anamnese_id', an.id);
    const mapa = {};
    (resps || []).forEach(r => { mapa[r.questao_id] = r.resposta; });

    const status = an.status === 'concluida'
      ? '<span class="selo selo-ok">Concluida em ' +
        new Date(an.concluido_em).toLocaleDateString('pt-BR') + '</span>'
      : '<span class="selo selo-warn">Em andamento</span>';

    let nivelHtml = '';
    if (an.status === 'concluida') {
      const doNivel = (qs || []).filter(q => q.conta_nivel);
      const nao = doNivel.filter(q => (mapa[q.id] || '') === 'Nao').length;
      const pct = doNivel.length ? Math.round(nao * 100 / doNivel.length) : 0;
      nivelHtml =
        '<div class="grade-visao" style="margin-top:12px">' +
        '<div class="caixa-info"><small>Respostas "Nao" (18 questoes)</small><b>' +
        nao + ' de ' + doNivel.length + ' (' + pct + '%)</b></div>' +
        '<div class="caixa-info"><small>Criterio 60%</small><b>' +
        (pct > 60 ? 'Acima - indica ABA 1' : 'Dentro - indica ABA 2 (se idade >= 8)') + '</b></div>' +
        '</div>';
    }

    const secoes = this.SECOES.map(s => {
      const lista = (qs || []).filter(q => q.secao === s.id);
      const linhas = lista.map(q => {
        const r = mapa[q.id];
        return '<div class="linha-resp"><span>' + escaparHtml(q.pergunta) + '</span>' +
          '<b>' + (r ? escaparHtml(r.split('||').join(', ')) : '&mdash;') + '</b></div>';
      }).join('');
      return '<details class="bloco-secao"><summary>' + s.rotulo + '</summary>' + linhas + '</details>';
    }).join('');

    return '<div class="cartao">' +
      '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px">' +
      '<h3 style="margin:0">Anamnese Global</h3>' + status + '</div>' +
      nivelHtml + '</div>' +
      '<div class="cartao">' + secoes + '</div>';
  }
};
