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

  // ─────────────── patch 66: crianca com mais de uma anamnese no banco ───────────────
  // Abrir a anamnese duas vezes ao mesmo tempo (toque duplo, duas abas) criava duas linhas. Com duas, o
  // maybeSingle() dava erro, a tela entendia "nao existe" e criava mais uma a cada abertura - e o prontuario
  // mostrava "Anamnese ainda nao iniciada". Agora lista todas, escolhe a principal e junta as respostas.
  async anamnesesDe(pacienteId) {
    const { data, error } = await sb.from('anamneses').select('*').eq('paciente_id', pacienteId).order('criado_em', { ascending: true });
    if (error) throw new Error(error.message);
    const todas = data || [];
    const quando = a => String(a.concluido_em || a.criado_em || '');
    const conc = todas.filter(a => a.status === 'concluida').sort((a, b) => quando(b).localeCompare(quando(a)));
    const resto = todas.filter(a => a.status !== 'concluida').sort((a, b) => (b.secao_atual || 0) - (a.secao_atual || 0) || String(b.criado_em || '').localeCompare(String(a.criado_em || '')));
    return { principal: conc[0] || resto[0] || null, todas };
  },
  // respostas de todas as linhas da crianca: vale a da principal; o que faltar vem da mais recente das outras
  async respostasDe(info) {
    if (!info.principal) return {};
    const { data } = await sb.from('anamnese_respostas').select('anamnese_id, questao_id, resposta').in('anamnese_id', info.todas.map(a => a.id));
    const ordem = [info.principal.id].concat(info.todas.filter(a => a.id !== info.principal.id)
      .sort((a, b) => String(b.criado_em || '').localeCompare(String(a.criado_em || ''))).map(a => a.id));
    const mapa = {};
    ordem.forEach(id => (data || []).forEach(r => {
      if (r.anamnese_id === id && mapa[r.questao_id] === undefined && r.resposta !== null && r.resposta !== '') mapa[r.questao_id] = r.resposta;
    }));
    return mapa;
  },
  // o link de cadastro da familia cria a crianca de novo: a anamnese pode estar no OUTRO cadastro com o mesmo nome
  async outroCadastro(pacienteId) {
    try {
      const { data: p } = await sb.from('pacientes').select('nome').eq('id', pacienteId).single();
      if (!p || !p.nome || p.nome.trim().length < 5) return null;
      const { data: mesmos } = await sb.from('pacientes').select('id, nome, status').ilike('nome', p.nome.trim().replace(/[%_]/g, '')).neq('id', pacienteId).limit(5);
      if (!mesmos || !mesmos.length) return null;
      const { data: ans } = await sb.from('anamneses').select('paciente_id, status').in('paciente_id', mesmos.map(m => m.id));
      if (!ans || !ans.length) return null;
      const a = ans.find(x => x.status === 'concluida') || ans[0];
      return { paciente: mesmos.find(m => m.id === a.paciente_id), status: a.status };
    } catch (e) { return null; }
  },

  async abrir(pacienteId) {
    // patch 66: toque duplo no botao abria duas vezes ao mesmo tempo e criava duas anamneses
    if (this._abrindo) return;
    this._abrindo = true;
    try { await this.abrirAgora(pacienteId); } finally { this._abrindo = false; }
  },

  async abrirAgora(pacienteId) {
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

    // Anamnese do paciente (cria so se nao existir nenhuma; com mais de uma, segue na principal)
    let info;
    try { info = await this.anamnesesDe(pacienteId); }
    catch (e) {
      el.innerHTML = '<div class="cartao"><div class="mensagem-erro visivel">Erro: ' + escaparHtml(e.message) + '</div></div>';
      return;
    }
    let an = info.principal;

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
      // se outra aba criou junto, fica a principal das duas
      try { info = await this.anamnesesDe(pacienteId); } catch (e) { info = { principal: nova, todas: [nova] }; }
      an = info.principal || nova;
    }

    if (an.status === 'concluida') { this.telaConcluida(); return; }

    this.anamneseId = an.id;
    this.secaoAtual = Math.min(an.secao_atual || 0, this.SECOES.length - 1);

    // Respostas ja salvas (de todas as linhas da crianca: ao salvar a etapa, elas passam para a principal)
    this.respostas = await this.respostasDe(info);

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
      { const { error: _e } = await sb.from('anamneses').update({ secao_atual: this.secaoAtual }).eq('id', this.anamneseId); if (_e) popAviso('Nao foi possivel gravar (anamneses): ' + _e.message); }
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
    let info;
    try { info = await this.anamnesesDe(pacienteId); }
    catch (e) { return '<div class="cartao"><div class="mensagem-erro visivel">Nao consegui ler a anamnese: ' + escaparHtml(e.message) + '</div></div>'; }
    const an = info.principal;

    if (!an) {
      const outro = await this.outroCadastro(pacienteId);
      if (outro && outro.paciente) {
        return '<div class="cartao faixa-ambar"><h3>A anamnese foi respondida em outro cadastro</h3>' +
          '<p class="sub" style="margin:6px 0 10px">Existe outro cadastro com o mesmo nome (<b>' + escaparHtml(outro.paciente.nome) + '</b>' +
          (outro.paciente.status ? ', situacao ' + escaparHtml(String(outro.paciente.status)) : '') + ') com a anamnese ' +
          (outro.status === 'concluida' ? '<b>concluida</b>' : 'em andamento') + '. Normalmente e o cadastro que a familia fez pelo link. ' +
          'Confira e, se for a mesma crianca, avise o suporte para juntar os dois.</p>' +
          '<button class="btn btn-primario" onclick="MODULOS.pacientes.telaDetalhe(\'' + outro.paciente.id + '\', \'anamnese\')">Abrir o outro cadastro</button></div>';
      }
      return '<div class="cartao"><div class="vazio"><div class="simbolo-vazio">&#9998;</div>' +
        '<strong>Anamnese ainda nao iniciada</strong>' +
        'A familia recebera a pendencia no portal.</div></div>';
    }

    const { data: qs } = await sb.from('anamnese_questoes').select('*').order('ordem');
    const mapa = await this.respostasDe(info);

    const status = an.status === 'concluida'
      ? '<span class="selo selo-ok">Concluida em ' +
        new Date(an.concluido_em).toLocaleDateString('pt-BR') + '</span>'
      : '<span class="selo selo-warn">Em andamento</span>';

    let nivelHtml = '';
    if (an.status === 'concluida') {
      const doNivel = (qs || []).filter(q => q.conta_nivel);
      const nao = doNivel.filter(q => (mapa[q.id] || '') === 'Nao').length;
      const pct = doNivel.length ? Math.round(nao * 100 / doNivel.length) : 0;

      const { data: pacN } = await sb.from('pacientes')
        .select('nivel, data_nascimento').eq('id', pacienteId).single();
      const idade = pacN
        ? Math.floor((Date.now() - new Date(pacN.data_nascimento + 'T12:00:00')) / 31557600000)
        : null;
      const menor8 = idade !== null && idade < 8;
      const acima60 = pct > 60;

      let motivo;
      if (menor8 && acima60) motivo = 'Idade menor que 8 anos e mais de 60% de "Nao"';
      else if (menor8) motivo = 'Idade menor que 8 anos (' + idade + ' anos)';
      else if (acima60) motivo = 'Mais de 60% de respostas "Nao"';
      else motivo = 'Idade >= 8 anos e "Nao" dentro do limite de 60%';

      nivelHtml =
        '<div class="grade-visao" style="margin-top:12px">' +
        '<div class="caixa-info"><small>Nivel definido</small><b>' +
        (pacN && pacN.nivel === 'aba1' ? 'ABA 1' : pacN && pacN.nivel === 'aba2' ? 'ABA 2' : '-') +
        '</b></div>' +
        '<div class="caixa-info"><small>Respostas "Nao" (18 questoes)</small><b>' +
        nao + ' de ' + doNivel.length + ' (' + pct + '%)</b></div>' +
        '<div class="caixa-info larga"><small>Motivo</small><b>' + motivo + '</b></div>' +
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
      (info.todas.length > 1 ? '<p class="sub" style="margin:-4px 0 8px">Esta crianca tem ' + info.todas.length + ' preenchimentos da anamnese no banco; as respostas foram juntadas aqui.</p>' : '') +
      nivelHtml + '</div>' +
      '<div class="cartao">' + secoes + '</div>';
  },

  // ─────────────── Documento oficial da anamnese ───────────────

  async docAnamnese(pacienteId) {
    if (!this.questoes || !this.questoes.length) {
      const { data: qs } = await sb.from('anamnese_questoes').select('*').order('ordem');
      this.questoes = qs || [];
    }
    document.getElementById('doc-eq-overlay')?.remove();
    const ov = document.createElement('div');
    ov.id = 'doc-eq-overlay';
    ov.className = 'folha-overlay';
    ov.innerHTML = '<div class="folha-pagina" id="doc-eq-corpo" style="max-width:900px"><p class="sub">Montando...</p></div>';
    document.body.appendChild(ov);

    let info = { principal: null, todas: [] };
    const [rInfo, rPac] = await Promise.all([
      this.anamnesesDe(pacienteId).catch(() => info),
      sb.from('pacientes').select('nome, data_nascimento').eq('id', pacienteId).single()
    ]);
    info = rInfo;
    const an = info.principal, pac = rPac.data;
    if (!an || !pac) { ov.remove(); return; }
    const mapa = await this.respostasDe(info);

    const CORES_SEC = ['azul', 'teal', 'amarelo', 'rosa', 'azul', 'teal'];
    const corpo = this.SECOES.map((sec, si) => {
      const qs = (this.questoes || []).filter(q => q.secao === sec.id && mapa[q.id] !== undefined && mapa[q.id] !== null && mapa[q.id] !== '');
      if (!qs.length) return '';
      return '<h2 style="margin-top:14px"><span class="ponto deq-' + CORES_SEC[si % 6] + '"></span>' +
        escaparHtml(sec.rotulo) + '</h2>' +
        '<div class="deq-caixa" style="display:grid; gap:6px">' +
        qs.map(q => {
          let r = mapa[q.id];
          if (r === 'S') r = 'Sim'; else if (r === 'N') r = 'Nao'; else if (r === 'NA') r = 'Nao se aplica';
          return '<div style="font-size:11px; border-bottom:1px dashed var(--eq-linha); padding-bottom:4px">' +
            '<span style="color:var(--eq-cinza)">' + escaparHtml(q.pergunta) + '</span><br>' +
            '<b>' + escaparHtml(String(r)) + '</b></div>';
        }).join('') + '</div>';
    }).join('');

    window._docPortal = { paciente_id: pacienteId, tipo: 'anamnese', titulo: 'Anamnese Global' };
    document.getElementById('doc-eq-corpo').innerHTML =
      '<div class="pagina-cabecalho nao-imprime">' +
      '  <div><button class="btn-voltar" onclick="document.getElementById(\'doc-eq-overlay\').remove()">&larr; Fechar</button>' +
      '  <h2>Anamnese &middot; documento oficial</h2></div>' +
      '  <button class="btn btn-primario" onclick="window.print()">&#128424; Imprimir / PDF</button>' +
      (typeof portalBtn === 'function' ? portalBtn() : '') +
      '</div>' +
      '<div class="doc-eq">' +
      '<div class="deq-cab">' +
      '  <img src="icones/equilibrium.png" alt="Equilibrium">' +
      '  <div class="deq-cab-t"><h1>ANAMNESE GLOBAL</h1>' +
      '  <p>Equilibrium Terapia Infantil &middot; respondida pela familia no portal</p></div>' +
      '</div>' +
      '<div class="deq-caixa deq-dados" style="grid-template-columns:1fr 1fr 1fr; margin-top:8px">' +
      '  <div><small>Paciente</small><b>' + escaparHtml(pac.nome) + '</b></div>' +
      '  <div><small>Nascimento</small><b>' + (pac.data_nascimento ? pac.data_nascimento.split('-').reverse().join('/') : '-') + '</b></div>' +
      '  <div style="border-bottom:none"><small>Situacao</small><b>' +
      (an.status === 'concluida' ? 'Concluida' : 'Em preenchimento') + '</b></div>' +
      '</div>' + corpo +
      '<div class="deq-rodape">' +
      '  <span>Equilibrium Terapia Infantil &middot; Uberl&acirc;ndia/MG</span>' +
      '  <span class="pontos"><i style="background:var(--eq-teal)"></i><i style="background:var(--eq-amarelo)"></i>' +
      '<i style="background:var(--eq-rosa)"></i><i style="background:var(--eq-azul)"></i></span>' +
      '  <span>Gerado pelo CORTEX aba &middot; ' + new Date().toLocaleDateString('pt-BR') + '</span>' +
      '</div>' +
      '</div>';
  }
};
