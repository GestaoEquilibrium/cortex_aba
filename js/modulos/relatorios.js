// ============================================================================
// CORTEX aba - js/modulos/relatorios.js
// Sprint 11: Relatorio Mensal (Formulario 07) em linguagem para a familia.
// A equipe elabora com um painel de dados do mes ao lado; ao liberar, o
// relatorio aparece no portal da familia e os responsaveis sao notificados.
// ============================================================================

window.MODULOS = window.MODULOS || {};

window.MODULOS.relatorios = {

  el() { return document.getElementById('pagina'); },
  podeGerir() { return perm('relatorios.mensal') === 'E'; },

  mesRotulo(mes) {
    const d = new Date(mes + '-15T12:00:00');
    const r = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    return r.charAt(0).toUpperCase() + r.slice(1);
  },

  // ─────────────── ABA RELATORIOS DO PRONTUARIO ───────────────

  async htmlDoPacienteBase(pacienteId) {
    this._pacienteId = pacienteId;
    this._origem = null;   // patch 61: aberto pelo prontuario, o "voltar" volta para ele
    const { data } = await sb.from('relatorios_mensais')
      .select('id, mes, status, liberado_em, elaborado:profiles!relatorios_mensais_elaborado_por_fkey(nome)')
      .eq('paciente_id', pacienteId)
      .order('mes', { ascending: false });
    const lista = data || [];

    const mesAtual = mesLocal();

    let html = '';
    if (this.podeGerir()) {
      html += '<div class="cartao faixa-ambar"><h3>Novo relatorio mensal</h3>' +
        '<div class="grade-form">' +
        '<div class="campo"><label>Mes de referencia</label>' +
        '<input type="month" id="rm-mes" value="' + mesAtual + '"></div>' +
        '<div class="campo" style="display:flex; align-items:flex-end">' +
        '<button class="btn btn-primario" onclick="MODULOS.relatorios.abrirEditor(\'' +
        pacienteId + '\', document.getElementById(\'rm-mes\').value)">Elaborar</button></div>' +
        '</div>' +
        '<p class="sub">Se o mes ja tiver relatorio, ele sera aberto para continuar.</p></div>';
    }

    html += '<div class="cartao"><h3>Historico</h3>' +
      (lista.length ? lista.map(r =>
        '<div class="linha-doc"><div><b>' + this.mesRotulo(r.mes.slice(0, 7)) + '</b>' +
        '<small>' + (r.elaborado ? 'Por ' + escaparHtml(r.elaborado.nome) : '') +
        (r.liberado_em ? ' &middot; liberado em ' + new Date(r.liberado_em).toLocaleDateString('pt-BR') : '') +
        '</small></div>' +
        '<div class="pac-selos">' +
        (r.status === 'liberado' ? '<span class="selo selo-ok">No portal</span>'
          : r.status === 'gerado' ? '<span class="selo selo-info">Gerado</span>'
          : '<span class="selo selo-warn">Rascunho</span>') +
        '<button class="btn-chip" onclick="MODULOS.relatorios.abrirEditor(\'' + pacienteId +
        '\', \'' + r.mes.slice(0, 7) + '\')">' +
        (r.status !== 'rascunho' || !this.podeGerir() ? 'Abrir' : 'Continuar') + '</button>' +
        '</div></div>').join('')
      : '<p class="sub">Nenhum relatorio elaborado.</p>') +
      '</div>';

    return html;
  },

  // ─────────────── TEXTOS FIXOS E ASSINATURA PADRAO ───────────────
  ASSINATURA_PADRAO: { nome: 'Wessilon Marques de Sousa', titulo: 'Psic\u00f3logo e Analista do Comportamento \u00b7 CRP 04/53832' },
  NOMES_DIA: ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'],
  COR_PROG: ['#1468B2', '#56C4CF', '#F3B63D', '#E9586A', '#7C6FD0', '#3E9C6E', '#E07A2F', '#0EA5E9'],

  intervaloMes(mes) {
    const inicio = mes + '-01';
    const fimD = new Date(mes + '-01T12:00:00');
    fimD.setMonth(fimD.getMonth() + 1); fimD.setDate(0);
    return { inicio, fim: fimD.toISOString().slice(0, 10) };
  },

  // ─────────────── DADOS DO MES (tudo que o relatorio usa) ───────────────
  async dadosDoMes(pacienteId, mes) {
    const { inicio, fim } = this.intervaloMes(mes);
    const [{ data: sessoes }, rFer] = await Promise.all([
      sb.from('sessoes')
        .select('id, data, hora_inicio, status, motivo_cancelamento, aplicador_id').eq('paciente_id', pacienteId)
        .gte('data', inicio).lte('data', fim).order('data').order('hora_inicio'),
      // patch 36: feriados marcados na agenda (sem o SQL rodado, a consulta falha e o mes sai sem feriados)
      sb.from('feriados').select('data, nome').gte('data', inicio).lte('data', fim)
    ]);
    // patch 39: o relatorio mensal e da ABA - sessoes de fono, TO, psicologia, pedagogia e psicomotricidade
    // nao entram na frequencia nem nos programas
    let lista = (sessoes || []).filter(s => !window.ESPEC || ESPEC.ehAba(s.aplicador_id));
    const feriados = {};
    if (!rFer.error) (rFer.data || []).forEach(f => { feriados[f.data] = f.nome; });
    const ids = lista.map(s => s.id);
    let fotos = [], evolucoes = [], compRegs = [], tents = [];
    if (ids.length) {
      const [rF, rE, rC, rT] = await Promise.all([
        sb.from('programa_sessao_registros')
          .select('sessao_id, paciente_programa_id, pct_corretos, corretos, tentativas, tentativas_sessao, nao_aplicado, motivo_nao_aplicado, paciente_programas(programas(id, nome, area, objetivo, procedimento))')
          .in('sessao_id', ids),
        sb.from('evolucoes').select('sessao_id, texto').in('sessao_id', ids),
        sb.from('comportamento_registros').select('sessao_id, data, descricao, comportamentos(nome)').in('sessao_id', ids),
        // patch 52: estimulos do mes (dao os exemplos do texto: "como vergonha e inveja")
        sb.from('registros_tentativas').select('paciente_programa_id, resposta, estimulo_id, estimulos(nome)').in('sessao_id', ids)
      ]);
      fotos = rF.data || []; evolucoes = rE.data || []; compRegs = rC.data || []; tents = (rT && !rT.error && rT.data) || [];
    }
    // patch 67 (coordenacao, 24/09 do relatorio de setembro): sessao que ja passou e tem lancamento (evolucao ou
    // programa aplicado), mas ficou agendada / check-in / em atendimento porque ninguem encerrou, e presenca.
    // So o relatorio mensal le assim; o status da sessao na agenda nao muda.
    const comLanc = new Set(evolucoes.filter(e => String(e.texto || '').trim()).map(e => e.sessao_id)
      .concat(fotos.filter(f => !f.nao_aplicado).map(f => f.sessao_id)));
    const hoje = typeof hojeLocal === 'function' ? hojeLocal() : new Date().toISOString().slice(0, 10);
    lista = lista.map(s => (['agendada', 'checkin', 'em_atendimento'].includes(s.status) && s.data <= hoje && comLanc.has(s.id))
      ? Object.assign({}, s, { status: 'concluida', status_agenda: s.status }) : s);
    const dataDe = {}; lista.forEach(s => { dataDe[s.id] = s.data; });
    // por programa: serie de % por sessao (ordem cronologica)
    const porProg = {};
    fotos.filter(f => !f.nao_aplicado && f.paciente_programas && f.paciente_programas.programas).forEach(f => {
      const p = f.paciente_programas.programas;
      const e = porProg[p.id] = porProg[p.id] || { nome: p.nome, area: p.area, objetivo: p.objetivo || p.procedimento || '', serie: [] };
      e.serie.push({ data: dataDe[f.sessao_id], pct: f.pct_corretos, corretos: f.corretos, n: f.tentativas_sessao || f.tentativas });
    });
    Object.values(porProg).forEach(e => e.serie.sort((a, b) => a.data.localeCompare(b.data)));
    const progDoPp = {};
    fotos.forEach(f => { if (f.paciente_programas && f.paciente_programas.programas) progDoPp[f.paciente_programa_id] = f.paciente_programas.programas.id; });
    tents.forEach(t => {
      const e = porProg[progDoPp[t.paciente_programa_id]], nome = t.estimulos && t.estimulos.nome;
      if (!e || !nome) return;
      e.estimulos = e.estimulos || {};
      const ch = t.estimulo_id || nome;
      const x = e.estimulos[ch] = e.estimulos[ch] || { nome, n: 0, c: 0 };
      x.n++; if (t.resposta === 'C' || t.resposta === 'I') x.c++;
    });
    const naoAplicados = fotos.filter(f => f.nao_aplicado && f.motivo_nao_aplicado !== 'Falta da crianca').map(f => ({
      nome: f.paciente_programas?.programas?.nome || 'programa', motivo: f.motivo_nao_aplicado, data: dataDe[f.sessao_id] }));
    // patch 62: contagem por DIA com a mesma regra do quadro de frequencia (desmarcacao conta como falta)
    const dias = this.diasFrequencia({ sessoes: lista, feriados }, true);
    const nDias = (...st) => dias.filter(d => st.includes(d.status)).length;
    return {
      sessoes: lista, feriados,
      concluidas: nDias('concluida'),
      faltas: nDias('falta', 'desmarcada'),
      desmarcadas: nDias('desmarcada'),
      canceladas: nDias('cancelada'),
      sessoesRealizadas: lista.filter(s => s.status === 'concluida').length,
      porProg, naoAplicados,
      evolucoes: evolucoes.map(e => ({ data: dataDe[e.sessao_id], texto: e.texto || '' })).sort((a, b) => a.data.localeCompare(b.data)),
      comportamentos: compRegs
    };
  },

  // ─────────────── RASCUNHOS AUTOMATICOS (a equipe edita) ───────────────
  // patch 52 (coordenacao, 14/10: "o progresso esta muito voltado para os programas e nao para a evolucao geral"):
  // os textos seguem o modelo de relatorio da clinica (Wess mandou um relatorio real de julho/2026 como referencia).
  // Nada de nome de programa nem percentual no Progresso, Desafios e Conclusao: cada programa vira uma
  // HABILIDADE (pelo nome, depois pelo objetivo, depois pela area); programas da mesma habilidade se juntam.
  //  - evolucao: melhorou 8 pontos ou mais entre o comeco e o fim do mes, ou terminou o mes com 80% ou mais
  //  - dificuldade: terminou abaixo de 50% sem melhorar
  //  - em consolidacao: o resto
  // As evolucoes diarias entram como apoio (frases que citam a habilidade com sinal de melhora ou de dificuldade,
  // em 2 sessoes ou mais) e os estimulos (patch 51) dao os exemplos ("como vergonha e inveja").
  fmtBR(d) { return d ? d.split('-').reverse().join('/') : ''; },
  primeiraFrase(t) { const m = String(t || '').replace(/Programas aplicados:[^\n]*\n?/i, '').replace(/Motivo dos nao aplicados:[^\n]*/i, '').trim().match(/^[^.!?\n]{15,220}[.!?]?/); return m ? m[0].trim() : ''; },
  norm(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); },

  // {o} = a/o conforme o sexo da crianca (sem sexo: o(a))
  HABILIDADES: [
    { k: 'regulacao', re: /regula|calma|acalm/, hab: 'autorregulação emocional', curto: 'autorregulação',
      dem: 'recorrendo com mais frequência às estratégias de regulação diante de situações de frustração',
      apr: 'passou a utilizar com mais frequência as estratégias de regulação apresentadas, reconhecendo melhor os momentos em que precisa se acalmar',
      dif: 'no uso espontâneo das estratégias de regulação emocional', plano: 'favorecer o uso autônomo das estratégias de regulação em diferentes situações' },
    { k: 'espera', re: /esper|aguard|demora|sua vez|troca de turno|revezamento|controle inibit/, reTxt: /esperar|espera\b|esperou|aguard|sua vez|troca de turno/, hab: 'esperar sua vez durante as atividades', curto: 'espera',
      dem: 'demonstrando maior compreensão e tolerância nos momentos de espera',
      apr: 'passou a aguardar sua vez com maior tolerância e menor necessidade de ajuda',
      dif: 'na tolerância à espera', plano: 'ampliar a tolerância à espera em diferentes contextos e atividades' },
    { k: 'sentar', re: /sentar|sentad|permanencia|permanecer/, reTxt: /sentar|sentad|cadeira|mesa de atividade/, hab: 'permanecer sentad{o} e engajad{o} nas atividades propostas', curto: 'permanecer sentad{o}',
      dem: 'com aumento do tempo de permanência e de engajamento nas atividades',
      apr: 'conseguiu permanecer por mais tempo sentad{o} e engajad{o} nas atividades propostas',
      dif: 'em permanecer sentad{o} até o final das atividades', plano: 'aumentar gradualmente o tempo de permanência e de engajamento nas atividades' },
    { k: 'atencao', re: /atenc|foco|concentr|distra/, hab: 'atenção e foco', curto: 'atenção e foco',
      dem: 'demonstrando maior capacidade de permanecer concentrad{o} em uma única atividade',
      apr: 'apresentou maior capacidade de permanecer concentrad{o} em uma única atividade, reduzindo a ocorrência de distrações diante de estímulos externos',
      dif: 'na manutenção da atenção sustentada, especialmente diante de estímulos externos', plano: 'ampliar o tempo de atenção sustentada em atividades dirigidas' },
    { k: 'emocoes', re: /emoc|sentiment|expressoes facia/, hab: 'reconhecimento de emoções', curto: 'reconhecimento de emoções',
      dem: 'identificando com mais facilidade as emoções trabalhadas',
      apr: 'passou a identificar com mais facilidade as emoções trabalhadas, em figuras e em situações do dia a dia',
      dif: 'no reconhecimento e na diferenciação de algumas emoções', plano: 'ampliar a compreensão, a identificação e a diferenciação das emoções, tanto em si mesm{o} quanto nas outras pessoas' },
    { k: 'flexibilidade', re: /flexib|rigidez|mudanca|variac|tolerar erro/, hab: 'flexibilidade cognitiva', curto: 'flexibilidade',
      dem: 'aceitando melhor variações nas tarefas e tolerando erros e correções com menos frustração',
      apr: 'passou a aceitar melhor variações nas tarefas, tolerando erros e correções com menos frustração',
      dif: 'em aceitar mudanças e variações nas atividades', plano: 'favorecer a aceitação de mudanças e a tolerância a erros e correções' },
    { k: 'historias', re: /historia|contacao|leitura compartilhada|livro|narrativ/, hab: 'atenção e compreensão durante a contação de histórias', curto: 'participação na contação de histórias',
      dem: 'acompanhando as histórias com maior engajamento',
      apr: 'acompanhou as histórias com maior engajamento, respondendo às perguntas sobre a narrativa',
      dif: 'em acompanhar a narrativa até o final', plano: 'ampliar o engajamento e a compreensão durante a leitura compartilhada' },
    { k: 'brincar_social', re: /(brinc|jogo|ludic).*(social|pares|par |grupo|cooperat|compartilh)|(social|pares|grupo|cooperat|compartilh).*(brinc|jogo|ludic)/, hab: 'brincar social', curto: 'participação em atividades compartilhadas',
      dem: 'participando das brincadeiras com outras crianças de forma mais cooperativa e apropriada',
      apr: 'participou de jogos e brincadeiras com outras crianças, acompanhando a dinâmica das atividades e respeitando as regras combinadas',
      dif: 'em concluir jogos e brincadeiras estruturadas com pares de forma cooperativa', plano: 'ampliar a participação cooperativa em jogos e brincadeiras com pares' },
    { k: 'socializacao', re: /social|intera|pares|amig|convivio|cumpriment|saudac|despedi/, hab: 'socialização', curto: 'socialização',
      dem: 'favorecendo o desenvolvimento das interações sociais com outras pessoas',
      apr: 'participou de atividades com outras crianças e adultos, acompanhando melhor a dinâmica das atividades em grupo e ampliando suas interações sociais',
      dif: 'na iniciativa de interação com outras pessoas', plano: 'ampliar as oportunidades de interação com pares e adultos' },
    { k: 'brincar', re: /brinc|jogo|ludic|faz de conta|simbolic/, hab: 'brincar', curto: 'brincar',
      dem: 'ampliando o repertório e o tempo de engajamento nas brincadeiras',
      apr: 'ampliou o repertório de brincadeiras, permanecendo por mais tempo engajad{o} nas atividades lúdicas',
      dif: 'em manter o engajamento nas brincadeiras de forma funcional', plano: 'ampliar o repertório de brincadeiras funcionais e simbólicas' },
    { k: 'comunicacao', re: /comunic|frase|mando|solicit|pedir|pedido|expressar|vocabul/, hab: 'comunicação funcional', curto: 'comunicação',
      dem: 'expressando suas necessidades de forma mais funcional e adequada',
      apr: 'passou a se expressar de forma mais funcional, utilizando palavras e frases para pedir o que deseja',
      dif: 'em se expressar de forma funcional, principalmente nos momentos de frustração', plano: 'ampliar o uso de frases completas e de formas adequadas de comunicação' },
    { k: 'imitacao', re: /imita/, hab: 'imitação', curto: 'imitação',
      dem: 'reproduzindo com mais precisão os modelos apresentados',
      apr: 'passou a reproduzir com mais precisão os modelos apresentados pelo terapeuta',
      dif: 'na imitação de sequências com mais etapas', plano: 'ampliar o repertório de imitação, com sequências progressivamente mais complexas' },
    { k: 'instrucoes', re: /instruc|ouvinte|seguir|comando|ordens/, reTxt: /instruc|comando|ordens simples/, hab: 'seguimento de instruções', curto: 'seguimento de instruções',
      dem: 'respondendo às instruções com maior independência',
      apr: 'passou a responder às instruções com maior independência e menor necessidade de dicas',
      dif: 'no seguimento de instruções sem apoio', plano: 'favorecer o seguimento de instruções com independência em diferentes ambientes' },
    { k: 'nomeacao', re: /nomea|nomear|\btato\b|identificacao de (objetos|figuras)/, hab: 'nomeação', curto: 'nomeação',
      dem: 'nomeando com mais independência os itens trabalhados',
      apr: 'passou a nomear com mais independência os itens trabalhados',
      dif: 'na nomeação de alguns itens', plano: 'ampliar o vocabulário e a nomeação com independência' },
    { k: 'fala', re: /ecoic|vocal|\bfala\b|articul|fonema|silaba/, hab: 'imitação vocal e fala', curto: 'fala',
      dem: 'emitindo os sons e as palavras trabalhadas com mais clareza',
      apr: 'passou a emitir os sons e as palavras trabalhadas com mais clareza',
      dif: 'na emissão de alguns sons e palavras', plano: 'ampliar a imitação vocal e a clareza da fala' },
    { k: 'avd', re: /\bavd\b|higien|vestir|aliment|banheiro|desfralde|escovar|calcar|vida diaria/, hab: 'autonomia nas atividades de vida diária', curto: 'autonomia nas atividades de vida diária',
      dem: 'realizando as etapas das rotinas com menos ajuda',
      apr: 'passou a realizar as etapas das rotinas de autocuidado com menos ajuda',
      dif: 'na realização independente de algumas etapas das rotinas de autocuidado', plano: 'ampliar a independência nas rotinas de autocuidado' },
    { k: 'motor', re: /motor|coordena|grafo|recort|encaix|pinca|tracad/, hab: 'coordenação motora', curto: 'coordenação motora',
      dem: 'executando os movimentos com mais precisão e controle',
      apr: 'passou a executar os movimentos trabalhados com mais precisão e controle',
      dif: 'na precisão de alguns movimentos', plano: 'aprimorar a coordenação motora e o controle dos movimentos' },
    { k: 'academico', re: /academ|letra|numer|cores|formas|parea|categor|alfabet|contagem|pre.?aprendiz|raciocinio/, hab: 'pré-aprendizagem', curto: 'pré-aprendizagem',
      dem: 'respondendo com mais independência às atividades de raciocínio propostas',
      apr: 'passou a responder com mais independência às atividades de raciocínio propostas',
      dif: 'em algumas atividades de raciocínio e pré-aprendizagem', plano: 'consolidar as habilidades de pré-aprendizagem' },
    { k: 'contato', re: /contato visual|olhar/, hab: 'contato visual', curto: 'contato visual',
      dem: 'sustentando o contato visual por mais tempo durante as interações',
      apr: 'passou a sustentar o contato visual por mais tempo durante as interações',
      dif: 'na manutenção do contato visual', plano: 'ampliar o contato visual funcional durante as interações' }
  ],
  AREA_HAB: { mando: 'comunicacao', tato: 'nomeacao', ecoico: 'fala', imitacao: 'imitacao', ouvinte: 'instrucoes', brincar: 'brincar',
              'habilidades sociais': 'socializacao', avd: 'avd', 'coordenacao motora': 'motor', academico: 'academico' },
  NOMES_COMPOSTOS: { primeiro: ['maria', 'ana', 'anna', 'joao', 'jose', 'pedro', 'luiz', 'luis', 'enzo', 'joao'],
    segundo: ['alice', 'beatriz', 'cecilia', 'clara', 'eduarda', 'fernanda', 'flor', 'gabriela', 'helena', 'heloisa', 'isabel', 'isabela', 'isabella', 'julia', 'laura', 'livia', 'luiza', 'luisa', 'sofia', 'sophia', 'valentina', 'vitoria', 'antonio', 'arthur', 'bernardo', 'davi', 'eduardo', 'emanuel', 'felipe', 'gabriel', 'guilherme', 'gustavo', 'henrique', 'lucas', 'luca', 'lucca', 'miguel', 'otavio', 'paulo', 'pedro', 'rafael', 'theo', 'vitor', 'victor', 'gael'] },
  nomeCurto(nome) {
    const p = String(nome || '').trim().split(/\s+/);
    if (p.length > 1 && this.NOMES_COMPOSTOS.primeiro.includes(this.norm(p[0])) && this.NOMES_COMPOSTOS.segundo.includes(this.norm(p[1]))) return p[0] + ' ' + p[1];
    return p[0] || '';
  },
  junta(l) { return l.length <= 1 ? (l[0] || '') : l.slice(0, -1).join(', ') + ' e ' + l[l.length - 1]; },
  estimuloTxt(n) { n = String(n || '').trim(); return /^[A-ZÀ-Ú][a-zà-ú]/.test(n) ? n.charAt(0).toLowerCase() + n.slice(1) : n; },

  habilidadeDe(p) {
    const H = this.HABILIDADES, nome = this.norm(p.nome), obj = this.norm(p.objetivo), area = this.norm(p.area);
    const h = H.find(x => x.re.test(nome)) || H.find(x => x.re.test(obj)) || H.find(x => x.k === this.AREA_HAB[area]);
    if (h) return h;
    const limpo = String(p.nome || '').replace(/\s*[-–—]\s*(n[ií]vel\s*\d+|\d+\s*sp|n\d+)\s*$/i, '').replace(/^(programa|treino|habilidades?)\s+(de|do|da)\s+/i, '').trim();
    const t = limpo.charAt(0).toLowerCase() + limpo.slice(1);
    return { k: 'p:' + p.nome, hab: t, curto: t, dem: 'realizando as atividades com maior independência', apr: 'realizou as atividades de ' + t + ' com maior independência',
      dif: 'em ' + t, plano: 'favorecer a realização dessas atividades com maior independência' };
  },

  // junta programas, estimulos, evolucoes diarias e comportamentos em habilidades com situacao
  analiseMes(d, pac) {
    const sexo = pac && pac.sexo;
    const g = s => String(s || '').replace(/\{o\}/g, sexo === 'F' ? 'a' : sexo === 'M' ? 'o' : 'o(a)');
    const grupos = {};
    const grupo = h => grupos[h.k] = grupos[h.k] || { h, progs: [], est: {}, pos: new Set(), neg: new Set() };
    Object.entries(d.porProg).forEach(([pid, p]) => {
      if (!p.serie.length) return;
      const G = grupo(this.habilidadeDe(p));
      G.progs.push(p);
      Object.values(p.estimulos || {}).forEach(e => { const x = G.est[e.nome] = G.est[e.nome] || { nome: e.nome, n: 0, c: 0 }; x.n += e.n; x.c += e.c; });
    });
    // evolucoes diarias: frase que cita a habilidade + sinal de melhora ou de dificuldade (conta sessoes diferentes)
    const POS = /consegu|evolu|melhor|maior|avanc|independ|aument|ampli|reduz|diminu|engaj|colabor|aceitou|toler|espontane|sem ajuda|sem dica|com facilidade|progress/;
    const NEG = /nao consegu|nao aceit|nao realiz|nao permanec|nao quis|nao particip|dificuldade|resist|recus|chor|birra|agita|dispers|fuga|frustr|agress|pouco engaj|pouca toler|desregul|crise/;
    (d.evolucoes || []).forEach((e, i) => {
      String(e.texto || '').replace(/Programas aplicados:[^\n]*/gi, '').replace(/Motivo dos nao aplicados:[^\n]*/gi, '')
        .split(/[.!?\n;]+/).map(f => this.norm(f)).filter(f => f.length > 12).forEach(f => {
          const sinal = NEG.test(f) ? 'neg' : POS.test(f) ? 'pos' : '';
          if (!sinal) return;
          this.HABILIDADES.forEach(h => { if ((h.reTxt || h.re).test(f)) grupo(h)[sinal].add(e.data || i); });
        });
    });
    // o que veio so das evolucoes vai para a habilidade irma que tem programa (brincar -> brincar social)
    [['brincar', 'brincar_social'], ['brincar_social', 'brincar'], ['atencao', 'sentar'], ['socializacao', 'brincar_social']].forEach(([de, para]) => {
      const a = grupos[de], b = grupos[para];
      if (a && b && !a.progs.length && b.progs.length) { a.pos.forEach(x => b.pos.add(x)); a.neg.forEach(x => b.neg.add(x)); delete grupos[de]; }
    });
    const lista = Object.values(grupos).map(G => {
      let sit = '', forca = 0;
      if (G.progs.length) {
        const datas = [...new Set(G.progs.flatMap(p => p.serie.map(x => x.data)))].sort();
        const media = l => l.length ? l.reduce((s, x) => s + x, 0) / l.length : null;
        const meio = datas[Math.floor(datas.length / 2)];
        const ini = media(G.progs.flatMap(p => p.serie.filter(x => datas.length < 2 || x.data < meio).map(x => x.pct || 0)));
        const fim = media(G.progs.flatMap(p => p.serie.filter(x => datas.length < 2 || x.data >= meio).map(x => x.pct || 0)));
        const ganho = datas.length >= 2 ? fim - ini : 0;
        forca = ganho + fim / 10;
        sit = (ganho >= 8 || fim >= 80) ? 'evolucao' : (fim < 50 && ganho < 8) ? 'dificuldade' : 'consolidacao';
        // a evolucao diaria desempata quando os numeros ficaram no meio
        if (sit === 'consolidacao' && G.pos.size >= 2 && G.pos.size > G.neg.size) sit = 'evolucao';
      } else if (G.pos.size >= 2 && G.pos.size > G.neg.size) { sit = 'evolucao'; forca = G.pos.size; }
      else if (G.neg.size >= 2 && G.neg.size > G.pos.size) { sit = 'dificuldade'; forca = G.neg.size; }
      if (!sit) return null;
      const est = Object.values(G.est).filter(e => e.n >= 2).map(e => Object.assign({ pct: Math.round(e.c * 100 / e.n) }, e));
      return {
        k: G.h.k, sit, forca, hab: g(G.h.hab), curto: g(G.h.curto), dem: g(G.h.dem), apr: g(G.h.apr), dif: g(G.h.dif), plano: g(G.h.plano),
        fortes: est.filter(e => e.pct >= 80).sort((a, b) => b.pct - a.pct).slice(0, 3).map(e => this.estimuloTxt(e.nome)),
        fracos: est.filter(e => e.pct < 50).sort((a, b) => a.pct - b.pct).slice(0, 3).map(e => this.estimuloTxt(e.nome)),
        melhor: est.length >= 2 ? est.slice().sort((a, b) => b.pct - a.pct)[0] : null
      };
    }).filter(Boolean);
    // comportamentos: menos na segunda metade do mes = evolucao; continuaram = desafio
    const comps = d.comportamentos || [];
    const nomesComp = [...new Set(comps.map(c => c.comportamentos && c.comportamentos.nome).filter(Boolean))].map(n => this.estimuloTxt(n));
    const mesIni = (d.sessoes[0] && d.sessoes[0].data) || '';
    const metade = mesIni ? mesIni.slice(0, 8) + '16' : '';
    const c1 = comps.filter(c => (c.data || '') < metade).length, c2 = comps.length - c1;
    return {
      sexo, nome: this.nomeCurto(pac && pac.nome), pac: sexo === 'F' ? 'a paciente' : sexo === 'M' ? 'o paciente' : 'a criança',
      evol: lista.filter(x => x.sit === 'evolucao').sort((a, b) => b.forca - a.forca),
      cons: lista.filter(x => x.sit === 'consolidacao'),
      dif: lista.filter(x => x.sit === 'dificuldade').sort((a, b) => a.forca - b.forca),
      compMenos: comps.length >= 3 && c1 >= 2 && c2 <= c1 / 2, compNomes: nomesComp, nComp: comps.length
    };
  },

  rascunhoObjetivos(d) {
    const progs = Object.values(d.porProg);
    if (!progs.length) return '';
    // como no modelo: "Nome do programa: o que ele trabalha." (um paragrafo por programa)
    return progs.map(p => p.nome.trim() + ': ' + (p.objetivo ? p.objetivo.replace(/\s+/g, ' ').trim().replace(/\.?$/, '.') : '(descrever o objetivo).')).join('\n\n');
  },

  rascunhoProgresso(d, pac) {
    const A = this.analiseMes(d, typeof pac === 'string' ? { nome: pac } : pac);
    const N = A.nome, esp = x => x.fortes.length ? ', especialmente com ' + this.junta(x.fortes) : '';
    const p1 = [], p2 = [];
    if (A.evol.length) {
      const [a, b, ...resto] = A.evol;
      p1.push('Durante o mês, ' + A.pac + ' apresentou evolução nas habilidades de ' + a.hab + esp(a) + ', ' + a.dem + '.');
      if (b) p1.push('Também foi observada evolução nas habilidades de ' + b.hab + esp(b) + ': ' + N + ' ' + b.apr + '.');
      if (resto.length) p2.push('Além disso, foram observados avanços nas habilidades de ' + resto[0].hab + esp(resto[0]) + ', ' + resto[0].dem + '.');
      if (resto.length > 1) p2.push('Houve avanços também nas habilidades de ' + this.junta(resto.slice(1).map(x => x.hab)) + '.');
      if (A.cons.length) p2.push((A.cons.length > 1 ? 'As habilidades de ' : 'A habilidade de ') + this.junta(A.cons.map(x => x.curto)) + (A.cons.length > 1 ? ' seguem' : ' segue') +
        ' em consolidação, com participação consistente de ' + N + ' nas atividades propostas.');
    } else if (A.cons.length || A.dif.length) {
      const l = A.cons.length ? A.cons : A.dif;
      p1.push('Durante o mês, ' + A.pac + ' manteve participação nas atividades propostas, com desempenho em consolidação nas habilidades de ' + this.junta(l.map(x => x.hab)) + '.');
    } else return '';
    if (A.compMenos) (p2.length ? p2 : p1).push('Observou-se ainda redução na frequência de comportamentos interferentes' + (A.compNomes.length ? ' (' + this.junta(A.compNomes) + ')' : '') + ' ao longo do mês.');
    return [p1.join(' '), p2.join(' ')].filter(Boolean).join('\n\n');
  },

  rascunhoDesafios(d, pac) {
    const A = this.analiseMes(d, typeof pac === 'string' ? { nome: pac } : pac);
    const partes = [];
    if (A.dif.length) {
      const l = A.dif.slice(0, 2);
      const como = l[0].fracos.length ? ', como ' + this.junta(l[0].fracos) : '';
      partes.push('Observa-se que ' + A.pac + ' ainda apresenta dificuldades ' + this.junta(l.map(x => x.dif)) + como + '.');
      const m = l[0].melhor && l[0].melhor.pct > 0 && !l[0].fracos.includes(this.estimuloTxt(l[0].melhor.nome)) ? l[0].melhor : null;
      partes.push((l.length > 1 ? 'As habilidades vêm sendo trabalhadas' : 'A habilidade vem sendo trabalhada') + ' ao longo das sessões' +
        (m ? ', apresentando melhores resultados em ' + this.estimuloTxt(m.nome) : '') + '.');
      partes.push('Como plano de intervenção, será dada continuidade ao ensino de ' + this.junta(l.map(x => x.curto)) +
        ', com ajuste dos recursos utilizados e retirada gradual das ajudas, com o objetivo de ' + l[0].plano + '.');
    } else if (A.cons.length) {
      const l = A.cons.slice(0, 3);
      const v = l.length > 1;
      partes.push('Observa-se que ' + (v ? 'as habilidades de ' : 'a habilidade de ') + this.junta(l.map(x => x.curto)) + (v ? ' ainda estão' : ' ainda está') + ' em consolidação e ' +
        (v ? 'necessitam' : 'necessita') + ' de apoio para ser' + (v ? 'em' : '') + ' realizada' + (v ? 's' : '') + ' com independência.');
      partes.push('Como plano de intervenção, será dada continuidade ao ensino ' + (v ? 'dessas habilidades' : 'dessa habilidade') + ', com retirada gradual das ajudas, com o objetivo de ' + l[0].plano + '.');
    } else {
      partes.push('Como plano de intervenção, será dada continuidade aos objetivos em andamento, com foco na manutenção e na generalização das habilidades adquiridas para outros ambientes e pessoas.');
    }
    if (A.nComp && !A.compMenos) partes.push('Foram observados também episódios de comportamentos interferentes' + (A.compNomes.length ? ' (' + this.junta(A.compNomes) + ')' : '') +
      ', manejados com as estratégias previstas no plano, que seguirão sendo acompanhados.');
    if (d.faltas >= 2) partes.push('Houve ' + d.faltas + ' faltas no mês, o que reduziu as oportunidades de treino.');
    return partes.join(' ');
  },

  rascunhoConclusao(d, pac) {
    const A = this.analiseMes(d, typeof pac === 'string' ? { nome: pac } : pac);
    const quem = A.pac + ' ' + A.nome;
    const pend = A.dif.length ? A.dif : [];
    if (A.evol.length) {
      return 'Conclui-se que, de modo geral, ' + quem + ' apresenta evolução gradual nas habilidades trabalhadas ao longo do mês, com avanços nas habilidades de ' + this.junta(A.evol.slice(0, 5).map(x => x.curto)) + '.' +
        (pend.length ? ' Apesar dos progressos, ainda apresenta dificuldades ' + this.junta(pend.slice(0, 2).map(x => x.dif)) + ', que continuarão sendo trabalhadas por meio de estratégias específicas.'
          : A.cons.length ? (A.cons.length > 1 ? ' As habilidades de ' + this.junta(A.cons.map(x => x.curto)) + ' seguem em consolidação e continuarão sendo trabalhadas'
              : ' A habilidade de ' + A.cons[0].curto + ' segue em consolidação e continuará sendo trabalhada') + ' por meio de estratégias específicas.'
          : ' Seguirá em acompanhamento, com foco na manutenção e na generalização das habilidades adquiridas.');
    }
    return 'Conclui-se que, de modo geral, ' + quem + ' manteve participação nas atividades ao longo do mês' +
      (pend.length ? ', ainda apresentando dificuldades ' + this.junta(pend.slice(0, 2).map(x => x.dif)) + ', que continuarão sendo trabalhadas por meio de estratégias específicas.'
        : '. As habilidades em treino continuarão sendo trabalhadas por meio de estratégias específicas.');
  },

  // ─────────────── EDITOR (form a esquerda, folha a direita) ───────────────
  async abrirEditor(pacienteId, mes) {
    const el = this.el();
    el.innerHTML = '<div class="cartao"><p class="sub">Preparando o relatorio...</p></div>';

    const [{ data: pac }, dados, rResp, rAss] = await Promise.all([
      sb.from('pacientes').select('id, nome, data_nascimento, sexo').eq('id', pacienteId).single(),
      this.dadosDoMes(pacienteId, mes),
      sb.from('responsaveis').select('nome, principal').eq('paciente_id', pacienteId).order('principal', { ascending: false }).limit(1),
      sb.from('profiles').select('id, nome, perfil').in('perfil', ['direcao', 'coordenador']).eq('ativo', true).order('nome')
    ]);

    let { data: rel } = await sb.from('relatorios_mensais')
      .select('*').eq('paciente_id', pacienteId).eq('mes', mes + '-01').maybeSingle();
    if (!rel && this.podeGerir()) {
      const { data: novo, error } = await sb.from('relatorios_mensais')
        .insert({ paciente_id: pacienteId, mes: mes + '-01', elaborado_por: window.CORTEX_SESSAO.user.id })
        .select('*').single();
      if (error) { el.innerHTML = '<div class="cartao"><div class="mensagem-erro visivel">' + escaparHtml(error.message) + '</div></div>'; return; }
      rel = novo;
    }
    if (!rel) { el.innerHTML = '<div class="cartao"><p class="sub">Relatorio nao encontrado.</p></div>'; return; }

    // rascunhos automaticos onde estiver vazio
    const auto = {};
    if (!rel.objetivos) auto.objetivos = this.rascunhoObjetivos(dados);
    if (!rel.progresso) auto.progresso = this.rascunhoProgresso(dados, pac);
    if (!rel.desafios) auto.desafios = this.rascunhoDesafios(dados, pac);
    if (!rel.conclusao) auto.conclusao = this.rascunhoConclusao(dados, pac);
    if (rel.status === 'rascunho' && Object.keys(auto).length) {
      { const { error: _e } = await sb.from('relatorios_mensais').update(auto).eq('id', rel.id); if (_e) popAviso('Nao foi possivel gravar (relatorios_mensais): ' + _e.message); }
      Object.assign(rel, auto);
    }
    if (rel.mostrar_canceladas === null || rel.mostrar_canceladas === undefined) rel.mostrar_canceladas = true;
    if (rel.incluir_grafico === null || rel.incluir_grafico === undefined) rel.incluir_grafico = true;
    if (!rel.assinatura_nome) { rel.assinatura_nome = this.ASSINATURA_PADRAO.nome; rel.assinatura_titulo = this.ASSINATURA_PADRAO.titulo; }

    this._rel = rel; this._pac = pac; this._dados = dados;
    this._resp = rResp.data && rResp.data[0] ? rResp.data[0].nome : null;
    this._assinaturas = [{ nome: this.ASSINATURA_PADRAO.nome, titulo: this.ASSINATURA_PADRAO.titulo }]
      .concat((rAss.data || []).filter(p => p.nome !== this.ASSINATURA_PADRAO.nome).map(p => ({ nome: p.nome, titulo: p.perfil === 'direcao' ? 'Dire\u00e7\u00e3o cl\u00ednica' : 'Coordena\u00e7\u00e3o ABA' })))
      .concat([{ nome: 'Equipe ABA', titulo: 'Equilibrium Terapia Infantil' }]);

    const travado = rel.status === 'gerado' || rel.status === 'liberado';
    const editavel = this.podeGerir() && !travado;
    window._docPortal = { paciente_id: pacienteId, tipo: 'relatorio_mensal', titulo: 'Relatorio Mensal ' + this.mesRotulo(mes) };
    const opc = (id, rot, marcado) => '<label class="check" style="display:flex; gap:6px; align-items:center; font-size:12.5px"><input type="checkbox" id="rm-' + id + '"' + (marcado ? ' checked' : '') + (editavel ? '' : ' disabled') + ' onchange="MODULOS.relatorios.salvarAuto()"> ' + rot + '</label>';

    el.innerHTML =
      '<div class="pagina-cabecalho nao-imprime">' +
      '  <div>' + (this._origem === 'mensais'
        ? '<button class="btn-voltar" onclick="abrirModulo(\'mensais\')">&larr; Relatorios mensais</button>'
        : '<button class="btn-voltar" onclick="MODULOS.pacientes.telaDetalhe(\'' + pacienteId + '\', \'relatorios\')">&larr; Prontuario</button>') +
      '    <h2>Relatorio de Evolucao Mensal &middot; ' + this.mesRotulo(mes) + '</h2>' +
      '    <p class="sub">' + escaparHtml(pac.nome) + (editavel ? ' &middot; rascunho salvo automaticamente' : travado ? ' &middot; gerado em ' + (rel.gerado_em ? new Date(rel.gerado_em).toLocaleString('pt-BR') : '-') + ' (travado)' : '') + '</p></div>' +
      '  <div style="display:flex; gap:8px; flex-wrap:wrap">' +
      (editavel && perm('relatorios.gerar') === 'E' ? '<button class="btn btn-primario" onclick="MODULOS.relatorios.gerarTravar()">&#128274; Gerar e travar</button>' : '') +
      (travado && rel.status !== 'liberado' && perm('relatorios.portal') === 'E' ? '<button class="btn btn-fantasma" onclick="MODULOS.relatorios.liberar()">Liberar no portal</button>' : '') +
      (travado && typeof podeReabrirRelatorio === 'function' && podeReabrirRelatorio() ? '<button class="btn btn-fantasma" title="Coordenacao/direcao: libera o relatorio travado para editar de novo" onclick="MODULOS.relatorios.reabrir()">&#128275; Liberar para editar</button>' : '') +
      '  <button class="btn btn-fantasma" onclick="MODULOS.relatorios.docMensal()">&#128196; ' + (travado ? 'Documento' : 'Folha / Imprimir') + '</button>' +
      (travado ? pdfAssinadoBtn() : '') +
      '  </div></div>' +

      '<div class="rm-split">' +
      '<div class="rm-form">' +
      '  <div class="cartao faixa-azul"><h3>Vem do sistema</h3>' +
      '  <div class="grade-visao">' +
      '    <div class="caixa-info"><small>Dias com presenca</small><b>' + dados.concluidas + '</b><small class="sub">' + dados.sessoesRealizadas + ' sessao(oes)</small></div>' +
      '    <div class="caixa-info"><small>Dias com falta</small><b>' + dados.faltas + '</b>' + (dados.desmarcadas ? '<small class="sub">' + dados.desmarcadas + ' desmarcada(s)</small>' : '') + '</div>' +
      (dados.canceladas ? '    <div class="caixa-info"><small>Canceladas (nao contam)</small><b>' + dados.canceladas + '</b><small class="sub">encerramento</small></div>' : '') +
      '    <div class="caixa-info"><small>Programas no mes</small><b>' + Object.keys(dados.porProg).length + '</b></div>' +
      '  </div>' +
      '  <div style="display:flex; gap:14px; flex-wrap:wrap; margin-top:10px">' +
      (dados.canceladas ? opc('canc', 'Mostrar no quadro as canceladas por encerramento', rel.mostrar_canceladas) : '') +
      opc('graf', 'Incluir grafico de evolucao do mes', rel.incluir_grafico) +
      '  </div>' +
      '  <div class="campo" style="margin-top:8px"><label>Assinatura</label>' +
      '  <select id="rm-ass"' + (editavel ? '' : ' disabled') + ' onchange="MODULOS.relatorios.salvarAuto()">' +
      this._assinaturas.map(a => '<option value="' + escaparHtml(a.nome) + '"' + (a.nome === rel.assinatura_nome ? ' selected' : '') + '>' + escaparHtml(a.nome) + ' \u2014 ' + escaparHtml(a.titulo) + '</option>').join('') +
      '  </select></div></div>' +
      '  <div class="cartao">' +
      (editavel ? '<div style="display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:8px"><small class="sub">Os textos saem prontos com os dados do mes; ajuste o que quiser.</small>' +
        '<button type="button" class="btn-chip" title="Escreve de novo os 4 textos com os dados do mes (no modelo novo)" onclick="MODULOS.relatorios.refazerTodos()">&#8635; Refazer todos os textos</button></div>' : '') +
      (editavel
        ? this.campoRel('objetivos', 'Objetivos de ensino <small class="sub">(programas do mes; um paragrafo por programa)</small>', rel.objetivos, 'Um programa por linha', 5) +
          this.campoRel('progresso', 'Progresso *', rel.progresso, 'Progresso da crianca nos objetivos', 6) +
          this.campoRel('desafios', 'Desafios e plano de intervencao', rel.desafios, 'Dificuldades, manejo e proximo periodo', 5) +
          this.campoRel('conclusao', 'Conclusao *', rel.conclusao, 'Sintese do mes', 4)
        : this.blocosLeitura(rel)) +
      '  </div>' +
      '</div>' +
      '<div class="rm-previa"><div class="folha-mini" id="rm-previa"></div></div>' +
      '</div>';
    this.atualizarPrevia();
  },

  campoRel(id, rotulo, valor, dica, linhas) {
    return '<div class="campo" style="margin-bottom:10px"><div style="display:flex; justify-content:space-between; align-items:flex-end; gap:8px"><label for="rm-' + id + '">' + rotulo + '</label>' +
      '<button type="button" class="btn-chip" title="Escreve de novo so este texto com os dados do mes" onclick="MODULOS.relatorios.refazerTexto(\'' + id + '\')">&#8635; Texto automatico</button></div>' +
      '<textarea id="rm-' + id + '" rows="' + linhas + '" oninput="MODULOS.relatorios.salvarAuto()" ' +
      'style="resize:vertical" placeholder="' + dica + '...">' + escaparHtml(valor || '') + '</textarea></div>';
  },

  blocosLeitura(rel) {
    const bloco = (t, v) => v
      ? '<div style="margin-bottom:12px"><b style="font-size:12px; text-transform:uppercase; letter-spacing:.04em">' + t +
        '</b><p style="font-size:13px; line-height:1.8; white-space:pre-wrap; margin-top:4px">' + escaparHtml(v) + '</p></div>' : '';
    return bloco('Objetivos de ensino', rel.objetivos) + bloco('Progresso', rel.progresso) +
      bloco('Desafios e plano de intervencao', rel.desafios) + bloco('Conclusao', rel.conclusao) +
      (rel.texto && !rel.progresso ? '<p style="white-space:pre-wrap">' + escaparHtml(rel.texto) + '</p>' : '');
  },

  // patch 52: refazer o texto automatico (os rascunhos antigos ficaram gravados no estilo anterior)
  RASCUNHO_DE: { objetivos: 'rascunhoObjetivos', progresso: 'rascunhoProgresso', desafios: 'rascunhoDesafios', conclusao: 'rascunhoConclusao' },
  async refazerTexto(id) {
    const ta = document.getElementById('rm-' + id);
    if (!ta || !this._dados) return;
    const novo = this[this.RASCUNHO_DE[id]](this._dados, this._pac) || '';
    if (!novo) { popAviso('Sem dados no mes para escrever esse texto.'); return; }
    if (ta.value.trim() && ta.value.trim() !== novo.trim() &&
        !await popConfirmar('Trocar o texto deste campo pelo texto automatico?\n\nO que esta escrito agora sera substituido.', { titulo: 'Texto automatico', ok: 'Trocar' })) return;
    ta.value = novo;
    this.salvarAuto();
  },
  async refazerTodos() {
    if (!this._dados) return;
    if (!await popConfirmar('Escrever de novo os 4 textos (objetivos, progresso, desafios e conclusao) com os dados do mes?\n\nO que esta escrito agora sera substituido.', { titulo: 'Refazer os textos', ok: 'Refazer' })) return;
    Object.entries(this.RASCUNHO_DE).forEach(([id, f]) => { const ta = document.getElementById('rm-' + id); if (ta) ta.value = this[f](this._dados, this._pac) || ''; });
    this.salvarAuto();
  },

  _timer: null,
  colherCampos() {
    const ass = document.getElementById('rm-ass');
    const a = ass ? this._assinaturas.find(x => x.nome === ass.value) : null;
    return {
      objetivos: document.getElementById('rm-objetivos')?.value.trim() || null,
      progresso: document.getElementById('rm-progresso')?.value.trim() || null,
      desafios: document.getElementById('rm-desafios')?.value.trim() || null,
      conclusao: document.getElementById('rm-conclusao')?.value.trim() || null,
      mostrar_canceladas: document.getElementById('rm-canc') ? document.getElementById('rm-canc').checked : true,
      incluir_grafico: document.getElementById('rm-graf') ? document.getElementById('rm-graf').checked : true,
      assinatura_nome: a ? a.nome : this._rel.assinatura_nome,
      assinatura_titulo: a ? a.titulo : this._rel.assinatura_titulo
    };
  },
  salvarAuto() {
    clearTimeout(this._timer);
    this._timer = setTimeout(async () => {
      const campos = this.colherCampos();
      Object.assign(this._rel, campos);
      this.atualizarPrevia();
      if (this._rel.status === 'rascunho') await sb.from('relatorios_mensais').update(campos).eq('id', this._rel.id);
    }, 500);
  },
  atualizarPrevia() {
    const alvo = document.getElementById('rm-previa');
    if (alvo) alvo.innerHTML = this.htmlMensal(this._rel, this._pac, this._resp, this._dados);
  },

  async gerarTravar() {
    clearTimeout(this._timer);
    const campos = this.colherCampos();
    if (!campos.progresso || !campos.conclusao) { popAviso('Preencha ao menos Progresso e Conclusao antes de gerar.'); return; }
    if (!await popConfirmar('Gerar o relatorio de ' + this.mesRotulo(this._rel.mes.slice(0, 7)) + '?\n\nDepois de gerado ele fica travado: nao pode mais ser editado, so impresso e liberado no portal.',
      { titulo: 'Gerar e travar', ok: 'Gerar e travar' })) return;
    Object.assign(this._rel, campos);
    const html = this.htmlMensal(this._rel, this._pac, this._resp, this._dados);
    const partes = [];
    if (campos.objetivos) partes.push('OBJETIVOS DE ENSINO\n' + campos.objetivos);
    if (campos.progresso) partes.push('PROGRESSO\n' + campos.progresso);
    if (campos.desafios) partes.push('DESAFIOS E PLANO DE INTERVENCAO\n' + campos.desafios);
    if (campos.conclusao) partes.push('CONCLUSAO\n' + campos.conclusao);
    const { error } = await sb.from('relatorios_mensais').update(Object.assign({}, campos, {
      texto: partes.join('\n\n'), html_snapshot: html, status: 'gerado',
      gerado_em: new Date().toISOString(), gerado_por: window.CORTEX_SESSAO.user.id })).eq('id', this._rel.id);
    if (error) { popAviso('Nao consegui gerar: ' + error.message); return; }
    this.abrirEditor(this._rel.paciente_id, this._rel.mes.slice(0, 7));
  },

  async reabrir() {
    if (!podeReabrirRelatorio()) return;
    const noPortal = this._rel.status === 'liberado';
    if (!await popConfirmar('Liberar o relatorio de ' + this.mesRotulo(this._rel.mes.slice(0, 7)) + ' para edicao?\n\nEle volta a rascunho' +
      (noPortal ? ' e a familia continua vendo no portal a versao que ja foi liberada' : '') + '. Depois de corrigir, gere e trave de novo' + (noPortal ? ' e libere outra vez' : '') + '.',
      { titulo: 'Liberar para editar', ok: 'Liberar' })) return;
    const { data, error } = await sb.rpc('fn_reabrir_relatorio', { p_tabela: 'relatorios_mensais', p_id: this._rel.id });
    if (error || (data && data.erro)) { popAviso('Nao consegui liberar: ' + (error ? error.message : data.erro)); return; }
    this.abrirEditor(this._rel.paciente_id, this._rel.mes.slice(0, 7));
  },

  async liberar() {
    if (this._rel.status !== 'gerado') { popAviso('Gere e trave o relatorio antes de liberar no portal.'); return; }
    if (!await popConfirmar('Liberar este relatorio no portal da familia?')) return;
    const { error } = await sb.from('relatorios_mensais')
      .update({ status: 'liberado', liberado_em: new Date().toISOString() }).eq('id', this._rel.id);
    if (error) { popAviso('Erro: ' + error.message); return; }
    try {
      const { data: fams } = await sb.from('familia_pacientes').select('usuario_id, pacientes(nome)').eq('paciente_id', this._rel.paciente_id);
      const nomeCrianca = fams && fams[0] && fams[0].pacientes ? fams[0].pacientes.nome.split(' ')[0] : 'sua crianca';
      if (fams && fams.length) {
        await sb.from('notificacoes').insert(fams.map(f => ({
          destinatario_id: f.usuario_id, titulo: 'Novo relatorio mensal disponivel',
          corpo: 'O relatorio de ' + this.mesRotulo(this._rel.mes.slice(0, 7)) + ' de ' + nomeCrianca + ' ja esta no portal.' })));
      }
    } catch (e) { /* nao trava */ }
    this.abrirEditor(this._rel.paciente_id, this._rel.mes.slice(0, 7));
  },

  // ─────────────── HTML DA FOLHA (usado na previa, no documento e no snapshot) ───────────────
  // Frequencia por DIA (nao por horario): crianca com 2 horarios no mesmo dia conta uma unica presenca ou falta.
  // Regra do dia: alguma concluida -> P; senao alguma falta -> F; senao, se o dia e feriado (marcado na agenda
  // ou sessao cancelada como feriado) -> FERIADO (sempre aparece, nao conta P nem F); senao, desmarcada -> F
  // com "desmarcada" embaixo da data (patch 62); senao (so canceladas por encerramento) -> cancelada.
  // patch 62 (coordenacao, 20/10: "toda falta e desmarcacao deve ir pra porcentagem de falta"; Wess: todo
  // cancelamento conta, inclusive os da clinica): so feriado nao conta, e o encerramento (sessoes depois da alta).
  cancContaFalta(s) {
    const m = s.motivo_cancelamento || '';
    return m !== 'feriado' && m !== 'encerramento';
  },
  diasFrequencia(dados, mostrarCanceladas) {
    const porDia = {};
    const feriados = dados.feriados || {};
    dados.sessoes.forEach(s => {
      if (!['concluida', 'falta', 'cancelada'].includes(s.status)) return;
      const d = porDia[s.data] = porDia[s.data] || { data: s.data, concluida: 0, falta: 0, cancelada: 0, feriado: 0, desmarcada: 0, horarios: [] };
      d[s.status]++; d.horarios.push(String(s.hora_inicio).slice(0, 5));
      if (s.status === 'cancelada') { if (s.motivo_cancelamento === 'feriado') d.feriado++; else if (this.cancContaFalta(s)) d.desmarcada++; }
    });
    return Object.values(porDia).map(d => ({
      data: d.data, horarios: d.horarios,
      status: d.concluida ? 'concluida' : d.falta ? 'falta' : (d.feriado || feriados[d.data]) ? 'feriado' : d.desmarcada ? 'desmarcada' : 'cancelada',
      feriado: feriados[d.data] || ''
    })).filter(d => d.status !== 'cancelada' || mostrarCanceladas).sort((a, b) => a.data.localeCompare(b.data));
  },

  // patch 53: uma LINHA POR SEMANA (antes cada coluna empilhava os seus dias e a linha misturava semanas:
  // 07/09 na segunda ficava ao lado de 01/09 na terca). Dia da semana sem sessao naquela semana = celula vazia.
  htmlFrequencia(dados, mostrarCanceladas) {
    const dias = this.diasFrequencia(dados, mostrarCanceladas);
    const dowDe = d => new Date(d + 'T12:00:00').getDay();
    const segundaDe = d => { const x = new Date(d + 'T12:00:00'); x.setDate(x.getDate() - (x.getDay() + 6) % 7); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
    const cols = [...new Set(dias.map(s => dowDe(s.data)))].sort((a, b) => (a + 6) % 7 - (b + 6) % 7);   // segunda primeiro
    if (!cols.length) return '<p class="sub" style="text-align:center">Sem sess\u00f5es registradas no m\u00eas.</p>';
    const semanas = {};
    dias.forEach(s => { (semanas[segundaDe(s.data)] = semanas[segundaDe(s.data)] || {})[dowDe(s.data)] = s; });
    let presencas = 0, faltas = 0, nFeriados = 0;
    let nDesm = 0;
    dias.forEach(d => { if (d.status === 'concluida') presencas++; if (d.status === 'falta' || d.status === 'desmarcada') faltas++; if (d.status === 'desmarcada') nDesm++; if (d.status === 'feriado') nFeriados++; });
    let html = '<table class="deq-freq deq-freq-dias deq-freq-sem"><tr>' + cols.map(c => '<th>' + this.NOMES_DIA[c] + '</th>').join('') + '</tr>';
    Object.keys(semanas).sort().forEach(k => {
      html += '<tr>' + cols.map(c => {
        const s = semanas[k][c];
        if (!s) return '<td class="vazia"><span>&ndash;</span></td>';
        const d = s.data.slice(8, 10) + '/' + s.data.slice(5, 7);
        if (s.status === 'feriado') {
          return '<td class="deq-fferiado"><span class="deq-fdata">' + d + '</span> <span class="deq-ffer">FERIADO</span>' +
            (s.feriado ? '<small class="deq-fh">' + escaparHtml(s.feriado) + '</small>' : '') + '</td>';
        }
        const comoFalta = s.status === 'falta' || s.status === 'desmarcada';
        const st = s.status === 'concluida' ? '( X ) P (&nbsp;&nbsp;) F' : comoFalta ? '(&nbsp;&nbsp;) P ( X ) F' : '<span class="deq-fv">cancelada</span>';
        const notas = [];
        if (s.status === 'desmarcada') notas.push('desmarcada');
        if (s.horarios.length > 1) notas.push(s.horarios.length + ' hor&aacute;rios');
        return '<td title="' + s.horarios.join(', ') + (s.status === 'desmarcada' ? ' (desmarcada)' : '') + '"><span class="deq-fdata">' + d + '</span> <span class="' + (s.status === 'concluida' ? 'deq-fp' : comoFalta ? 'deq-ff' : '') + '">' + st + '</span>' +
          (notas.length ? '<small class="deq-fh">' + notas.join(' &middot; ') + '</small>' : '') + '</td>';
      }).join('') + '</tr>';
    });
    html += '</table><div class="deq-freq-rodape"><span>P: PRESEN\u00c7A / F: FALTA' + (nDesm ? ' (inclui desmarca\u00e7\u00f5es)' : '') + (nFeriados ? ' \u00b7 FERIADO: n\u00e3o conta' : '') + '</span><span>Presen\u00e7as <b>' + presencas + '</b> \u00b7 Faltas <b>' + faltas + '</b>' +
      (nFeriados ? ' \u00b7 Feriados <b>' + nFeriados + '</b>' : '') +
      ((presencas + faltas) ? ' \u00b7 Assiduidade <b>' + Math.round(presencas * 100 / (presencas + faltas)) + '%</b>' : '') + '</span></div>';
    return html;
  },

  htmlGraficoMes(dados) {
    const progs = Object.values(dados.porProg).filter(p => p.serie.length);
    if (!progs.length || !MODULOS.avaliacoes || !MODULOS.avaliacoes.gLinhas) return '';
    // patch 62: dia desmarcado tambem aparece como F no grafico
    const faltas = this.diasFrequencia(dados, true).filter(d => d.status === 'falta' || d.status === 'desmarcada').map(d => d.data);
    const datas = [...new Set(progs.flatMap(p => p.serie.map(x => x.data)).concat(faltas))].sort();
    const series = progs.map((p, i) => ({
      nome: p.nome.length > 28 ? p.nome.slice(0, 27) + '\u2026' : p.nome, cor: this.COR_PROG[i % this.COR_PROG.length],
      valores: datas.map(d => { const x = p.serie.find(y => y.data === d); return x ? x.pct : null; })
    }));
    const rotulos = datas.map(d => d.slice(8, 10) + '/' + d.slice(5, 7) + (faltas.includes(d) ? ' F' : ''));
    const g = MODULOS.avaliacoes.gLinhas(rotulos, series, { legenda: true, altura: 240 });
    return g + (faltas.length ? '<p class="sub" style="font-size:10px; margin-top:4px"><b style="color:#E11D48">F</b> = dia de falta (' + faltas.map(d => d.slice(8, 10) + '/' + d.slice(5, 7)).join(', ') + ')</p>' : '');
  },

  htmlMensal(rel, pac, resp, dados) {
    const mes = rel.mes.slice(0, 7);
    const fmt = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '-';
    const txt = v => escaparHtml(v || '').replace(/\n/g, '<br>');
    const bloco = (classe, titulo, valor) =>
      '<h2><span class="ponto ' + classe + '"></span>' + titulo + '</h2><div class="deq-caixa deq-texto">' + txt(valor) + '</div>';
    const { fim } = this.intervaloMes(mes);
    const dataAss = rel.gerado_em ? new Date(rel.gerado_em).toLocaleDateString('pt-BR') : fmt(fim);
    return '<div class="doc-eq deq-doc-mensal">' +
      '<div class="deq-cab"><img src="icones/equilibrium.png" alt="Equilibrium">' +
      '  <div class="deq-cab-t"><h1>RELAT&Oacute;RIO DE EVOLU&Ccedil;&Atilde;O MENSAL</h1><p>Equilibrium Terapia Infantil &middot; Psicoterapia ABA</p></div>' +
      '  <span class="deq-pilula">' + this.mesRotulo(mes).toUpperCase() + '</span></div>' +
      '<div class="deq-caixa deq-dados" style="grid-template-columns:2fr 1fr 1.4fr 1fr">' +
      '  <div style="border-bottom:none"><small>Paciente</small><b>' + escaparHtml(pac.nome) + '</b></div>' +
      '  <div style="border-bottom:none"><small>Data de nascimento</small><b>' + fmt(pac.data_nascimento) + '</b></div>' +
      '  <div style="border-bottom:none"><small>Respons&aacute;vel</small><b>' + escaparHtml(resp || '&mdash;') + '</b></div>' +
      '  <div style="border-bottom:none"><small>Especialidade</small><b>Psicoterapia ABA</b></div></div>' +
      '<h2><span class="ponto"></span>Frequ&ecirc;ncia</h2><div class="deq-caixa">' + this.htmlFrequencia(dados, rel.mostrar_canceladas !== false) + '</div>' +
      bloco('deq-amarelo', 'Objetivos de ensino', rel.objetivos) +
      bloco('deq-teal', 'Progresso', rel.progresso) +
      bloco('deq-rosa', 'Desafios e plano de interven&ccedil;&atilde;o', rel.desafios) +
      bloco('deq-amarelo', 'Conclus&atilde;o', rel.conclusao) +
      '<div class="deq-local">Uberl&acirc;ndia-MG, ' + dataAss + '</div>' +
      blocoAssinatura(rel.assinatura_nome || this.ASSINATURA_PADRAO.nome, escaparHtml(rel.assinatura_titulo || this.ASSINATURA_PADRAO.titulo)) +
      (rel.incluir_grafico !== false && Object.keys(dados.porProg).length
        ? '<div class="deq-quebra"></div><h2><span class="ponto deq-teal"></span>Anexo &middot; Evolu&ccedil;&atilde;o dos programas no m&ecirc;s <small>&middot; % de independ&ecirc;ncia por sess&atilde;o</small></h2>' +
          '<div class="deq-caixa">' + this.htmlGraficoMes(dados) + '</div>'
        : '') +
      '<div class="deq-rodape"><span>Equilibrium Terapia Infantil &middot; Uberl&acirc;ndia/MG</span>' +
      '<span class="pontos"><i style="background:var(--eq-teal)"></i><i style="background:var(--eq-amarelo)"></i><i style="background:var(--eq-rosa)"></i><i style="background:var(--eq-azul)"></i></span>' +
      '<span>Documento gerado pelo CORTEX aba &middot; ' + dataAss + '</span></div>' +
      '</div>';
  },

  // ─────────────── PORTAL DA FAMILIA ───────────────

  async htmlPortal(pacienteId, nomeCrianca) {
    const { data } = await sb.from('relatorios_mensais')
      .select('id, mes, texto, liberado_em')
      .eq('paciente_id', pacienteId)
      .eq('status', 'liberado')
      .order('mes', { ascending: false })
      .limit(12);
    const lista = data || [];
    if (lista.length === 0) return '';

    this._portalCache = this._portalCache || {};
    lista.forEach(r => { this._portalCache[r.id] = r; });

    return '<div style="margin-top:12px">' +
      '<b style="font-size:12.5px">Relatorios mensais</b>' +
      lista.map(r =>
        '<div class="linha-doc"><div><b>' + this.mesRotulo(r.mes.slice(0, 7)) + '</b>' +
        '<small>Publicado em ' + new Date(r.liberado_em).toLocaleDateString('pt-BR') + '</small></div>' +
        '<button class="btn btn-fantasma" onclick="MODULOS.relatorios.lerNoPortal(\'' + r.id + '\')">Ler</button>' +
        '</div>').join('') +
      '</div>';
  },

  lerNoPortal(id) {
    const r = (this._portalCache || {})[id];
    if (!r) return;
    abrirModal('Relatorio &middot; ' + this.mesRotulo(r.mes.slice(0, 7)),
      '<div style="font-size:13.5px; line-height:1.85; white-space:pre-wrap">' +
      escaparHtml(r.texto || '') + '</div>', true);
  },

  // ─────────────── DOCUMENTO OFICIAL (identidade Equilibrium) ───────────────

  async docMensal() {
    const rel = this._rel;
    if (!rel) return;
    const ov = document.createElement('div');
    ov.id = 'doc-eq-overlay';
    ov.className = 'folha-overlay';
    ov.innerHTML = '<div class="folha-pagina" id="doc-eq-corpo" style="max-width:900px"><p class="sub">Montando o documento...</p></div>';
    document.body.appendChild(ov);
    // travado: exatamente o que foi gerado; rascunho: monta ao vivo
    let corpo = rel.html_snapshot && rel.status !== 'rascunho' ? rel.html_snapshot : null;
    if (!corpo) {
      if (!this._dados) this._dados = await this.dadosDoMes(rel.paciente_id, rel.mes.slice(0, 7));
      Object.assign(rel, this.colherCampos());
      corpo = this.htmlMensal(rel, this._pac, this._resp, this._dados);
    }
    // patch 67: o titulo leva o mes (o PDF assinado e achado pelo mes na aba Relatorios mensais)
    window._docPortal = { paciente_id: rel.paciente_id, tipo: 'relatorio_mensal', titulo: 'Relatorio Mensal ' + this.mesRotulo(rel.mes.slice(0, 7)) };
    document.getElementById('doc-eq-corpo').innerHTML =
      '<div class="pagina-cabecalho nao-imprime">' +
      '  <div><button class="btn-voltar" onclick="document.getElementById(\'doc-eq-overlay\').remove()">&larr; Fechar</button>' +
      '  <h2>Relatorio mensal &middot; documento oficial' + (rel.status === 'rascunho' ? ' <span class="selo selo-warn">rascunho</span>' : ' <span class="selo selo-ok">gerado</span>') + '</h2></div>' +
      '  <button class="btn btn-primario" onclick="window.print()">&#128424; Imprimir / PDF</button>' + portalBtn() + '</div>' + corpo;
  },

  // ─────────────── Balcao da aba Relatorios ───────────────

  async htmlDoPaciente(pacienteId) {
    this._pacRel = pacienteId;
    const base = await this.htmlDoPacienteBase(pacienteId);
    const barra =
      '<div class="aba-acoes">' +
      '<button class="btn btn-primario" onclick="MODULOS.relatorios.escolherSessao(\'' + pacienteId + '\')">&#128196; Relatorio da sessao</button>' +
      '<button class="btn btn-fantasma" onclick="MODULOS.programas.modalCompilado(\'' + pacienteId + '\')">&#128200; Relatorio do mes (compilado)</button>' +
      '</div>' +
      '<p class="sub" style="margin:-4px 0 10px">Relatorio da sessao junta tudo daquele dia: programas, tentativas, grafico e evolucao. O do mes compila todas as sessoes do periodo.</p>';
    return barra + base;
  },

  async escolherSessao(pacienteId) {
    const { data } = await sb.from('sessoes')
      .select('id, data, hora_inicio, status')
      .eq('paciente_id', pacienteId)
      .not('status', 'in', '("falta","cancelada")')
      .lte('data', hojeLocal())
      .order('data', { ascending: false }).order('hora_inicio', { ascending: false })
      .limit(20);
    const lista = data || [];
    if (!lista.length) { alert('Nenhuma sessao realizada ainda.'); return; }
    abrirModal('Relatorio da sessao',
      '<p class="sub" style="margin-bottom:8px">Escolha a sessao (20 mais recentes):</p>' +
      lista.map(s =>
        '<div class="linha-doc clicavel" onclick="fecharModal(); MODULOS.programas.docEvolucaoDiaria(\'' + s.id + '\', true)">' +
        '<div><b>' + s.data.split('-').reverse().join('/') + '</b>' +
        '<small>' + (s.hora_inicio ? 'as ' + s.hora_inicio.slice(0, 5) : '') +
        (s.status === 'concluida' ? ' &middot; concluida' : ' &middot; ' + s.status.replace('_', ' ')) + '</small></div>' +
        '<span class="selo ' + (s.status === 'concluida' ? 'selo-ok' : 'selo-warn') + '">Abrir</span>' +
        '</div>').join(''));
  }
};
