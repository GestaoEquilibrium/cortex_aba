// ============================================================================
// CORTEX aba - js/modulos/mensais.js
// Patch 61: Relatorios mensais num lugar so. Digita o nome e aparecem os
// relatorios da crianca; "Minha equipe" / "Ver tudo" (coordenacao) ou um botao
// por equipe (direcao e suporte), separado por equipe (coordenadora) e por
// aplicador. Cada crianca numa linha com os ultimos 6 meses (opcao A do Wess).
// Aplicadora e terapeuta veem so as criancas delas.
// Abrir/elaborar usa o editor de sempre (MODULOS.relatorios.abrirEditor).
// Patch 67: botao "PDFs assinados" baixa um ZIP com os PDFs assinados do mes
// das criancas que estao na tela (abrirLote / baixarLote).
// ============================================================================

window.MODULOS = window.MODULOS || {};

window.MODULOS.mensais = {

  MESES_A: 6,            // quantos meses aparecem lado a lado
  _busca: '',
  _visao: null,          // coordenacao: 'equipe' | 'tudo'; direcao/suporte: 'tudo' | id da coordenadora | 'sem'
  _fimA: null,           // ultimo mes da janela (AAAA-MM); as setas andam de 6 em 6
  _d: null,              // dados carregados

  perfil() { const p = window.CORTEX_SESSAO.profile; return p.perfil; },
  ehCoord() { return this.perfil() === 'coordenador'; },
  ehGestao() { return ['direcao', 'suporte'].includes(this.perfil()); },
  podeElaborar() { return perm('relatorios.mensal') === 'E'; },
  semAcento(s) { return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); },
  primeiro(nome) { return String(nome || '').split(' ')[0]; },
  iniciais(nome) { return String(nome || '?').split(' ').filter(Boolean).slice(0, 2).map(x => x[0]).join('').toUpperCase(); },

  // ─────── meses ───────
  somaMes(mes, n) { const [a, m] = mes.split('-').map(Number); const d = new Date(a, m - 1 + n, 1); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); },
  nomeMes(mes, curto) {
    const n = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'][Number(mes.slice(5, 7)) - 1];
    if (curto) return n.charAt(0).toUpperCase() + n.slice(1, 3);
    return n.charAt(0).toUpperCase() + n.slice(1) + ' de ' + mes.slice(0, 4);
  },
  ST: {
    liberado: { cls: 'portal', rot: 'No portal' },
    gerado: { cls: 'gerado', rot: 'Gerado' },
    rascunho: { cls: 'rasc', rot: 'Rascunho' },
    falta: { cls: 'falta', rot: 'Nao feito' }
  },

  // ─────────────── TELA ───────────────
  async render(el) {
    this.el = el;
    if (!this._visao) {
      let guardada = null; try { guardada = localStorage.getItem('cortex_rmc_visao'); } catch (e) {}
      this._visao = this.ehCoord() ? (guardada === 'tudo' ? 'tudo' : 'equipe') : 'tudo';
    }
    if (!this._fimA) this._fimA = mesLocal();
    el.innerHTML =
      '<div class="pagina-cabecalho">' +
      '  <div><h2>Relatorios mensais</h2><p class="sub">' + (typeof ehEquipe === 'function' && ehEquipe() ? 'Os relatorios mensais das suas criancas, mes a mes.' : 'Digite o nome da crianca ou veja por equipe e aplicador.') + '</p></div>' +
      '  <div id="rmc-visao"></div>' +
      '</div>' +
      '<div class="rmc-barra">' +
      '  <label class="rmc-busca"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' +
      '    <input id="rmc-busca" placeholder="Nome da crianca" autocomplete="off" value="' + escaparHtml(this._busca) + '" oninput="MODULOS.mensais.buscar(this.value)">' +
      '    <button type="button" class="rmc-limpar" title="Limpar" onclick="MODULOS.mensais.buscar(\'\'); document.getElementById(\'rmc-busca\').value=\'\'; document.getElementById(\'rmc-busca\').focus()">&times;</button></label>' +
      '  <div id="rmc-ferr"></div>' +
      '</div>' +
      '<div id="rmc-corpo"><div class="cartao"><p class="sub">Carregando...</p></div></div>';
    try { await this.carregar(); }
    catch (e) { document.getElementById('rmc-corpo').innerHTML = '<div class="cartao"><div class="mensagem-erro visivel">Nao consegui carregar: ' + escaparHtml(e.message) + '</div></div>'; return; }
    this.desenhar();
    if (window.matchMedia('(min-width: 721px)').matches) document.getElementById('rmc-busca')?.focus();
  },

  // ─────────────── DADOS ───────────────
  async todas(montar) {
    const lista = [];
    for (let de = 0; de < 20000; de += 1000) {
      const { data, error } = await montar().range(de, de + 999);
      if (error) throw error;
      lista.push(...(data || []));
      if (!data || data.length < 1000) break;
    }
    return lista;
  },
  async carregar() {
    const qPac = cols => sb.from('pacientes').select(cols).order('nome');
    let rPac = await qPac('id, nome, status, aplicador_id, coordenador_id, admitido_em');
    if (rPac.error && /admitido_em/.test(rPac.error.message)) rPac = await qPac('id, nome, status, aplicador_id, coordenador_id');
    if (rPac.error) throw rPac.error;
    const [rProf, rEm, rels] = await Promise.all([
      sb.from('profiles').select('id, nome, perfil, coordenador_id, ativo'),
      sb.from('equipe_membros').select('coordenador_id, aplicador_id'),
      this.todas(() => sb.from('relatorios_mensais').select('id, paciente_id, mes, status, liberado_em, gerado_em').order('mes', { ascending: false }))
    ]);
    const profs = rProf.data || [];
    const nomes = Object.fromEntries(profs.map(p => [p.id, p.nome]));
    const coords = profs.filter(p => p.perfil === 'coordenador' && p.ativo !== false).sort((a, b) => a.nome.localeCompare(b.nome));
    const ehCoordId = new Set(coords.map(c => c.id));
    // aplicador -> equipe (coordenadora): o vinculo do perfil; senao o vinculo extra (equipe_membros)
    const timeApl = {};
    profs.forEach(p => { if (p.coordenador_id && ehCoordId.has(p.coordenador_id)) timeApl[p.id] = p.coordenador_id; });
    (rEm.data || []).forEach(x => { if (!timeApl[x.aplicador_id] && ehCoordId.has(x.coordenador_id)) timeApl[x.aplicador_id] = x.coordenador_id; });
    const pacs = (rPac.data || []).map(p => Object.assign({}, p, {
      time: (p.coordenador_id && ehCoordId.has(p.coordenador_id)) ? p.coordenador_id : (timeApl[p.aplicador_id] || 'sem'),
      chave: this.semAcento(p.nome)
    }));
    // relatorios por crianca e mes
    const rel = {};
    rels.forEach(r => { const m = String(r.mes).slice(0, 7); (rel[r.paciente_id] = rel[r.paciente_id] || {})[m] = r; });
    // quem a pessoa ve
    let meus = null, minhaEquipe = null;
    if (typeof ehEquipe === 'function' && ehEquipe()) meus = await meusPacientesIds();
    if (this.ehCoord()) minhaEquipe = (await ESCOPO.carregar()).pacientes;
    this._d = { pacs, rel, nomes, coords, meus, minhaEquipe };
  },

  // criancas que entram na tela agora (escopo + busca)
  visiveis() {
    const d = this._d; const q = this.semAcento(this._busca.trim());
    let lista = d.pacs;
    if (d.meus) lista = lista.filter(p => d.meus.has(p.id));
    else if (this.ehCoord() && this._visao === 'equipe') lista = lista.filter(p => d.minhaEquipe.has(p.id));
    else if (this.ehGestao() && this._visao !== 'tudo') lista = lista.filter(p => p.time === this._visao);
    if (q) lista = lista.filter(p => q.split(/\s+/).every(t => p.chave.includes(t)));
    else lista = lista.filter(p => p.status !== 'encerrado');
    return lista;
  },
  // [{ id, nome, apls: [{ id, nome, pacs: [] }] }]
  agrupar(lista) {
    const d = this._d;
    const porTime = {};
    const umaEquipe = this.ehCoord() && this._visao === 'equipe';
    lista.forEach(p => {
      const t = umaEquipe ? 'minha' : (d.meus ? 'meus' : p.time);
      const g = porTime[t] = porTime[t] || {};
      const a = p.aplicador_id || 'sem';
      (g[a] = g[a] || []).push(p);
    });
    const nomeTime = t => t === 'minha' ? 'Minha equipe' : t === 'meus' ? 'Minhas criancas' : t === 'sem' ? 'Sem equipe definida' : 'Equipe ' + this.primeiro(d.nomes[t]);
    const subTime = t => t === 'minha' ? escaparHtml(window.CORTEX_SESSAO.profile.nome) : t === 'meus' || t === 'sem' ? '' : 'Coordenacao: ' + escaparHtml(d.nomes[t] || '');
    const ordem = Object.keys(porTime).sort((a, b) => (a === 'sem') - (b === 'sem') || nomeTime(a).localeCompare(nomeTime(b)));
    return ordem.map(t => ({
      id: t, nome: nomeTime(t), sub: subTime(t),
      apls: Object.keys(porTime[t]).sort((a, b) => (a === 'sem') - (b === 'sem') || String(d.nomes[a] || '').localeCompare(String(d.nomes[b] || '')))
        .map(a => ({ id: a, nome: a === 'sem' ? 'Sem aplicador definido' : (d.nomes[a] || 'Aplicador'), pacs: porTime[t][a].sort((x, y) => x.nome.localeCompare(y.nome)) }))
    }));
  },
  stDe(p, mes) {
    const r = (this._d.rel[p.id] || {})[mes];
    if (r) return Object.assign({ r }, this.ST[r.status] || this.ST.rascunho);
    if (p.admitido_em && String(p.admitido_em).slice(0, 7) > mes) return { cls: 'antes', rot: 'Antes da admissao' };
    return Object.assign({ futuro: mes > mesLocal(), atual: mes === mesLocal() }, this.ST.falta);
  },

  // ─────────────── DESENHO ───────────────
  buscar(v) {
    this._busca = v || '';
    clearTimeout(this._tBusca);
    this._tBusca = setTimeout(() => this.desenhar(), 120);
  },
  mudarVisao(v) {
    this._visao = v;
    if (this.ehCoord()) { try { localStorage.setItem('cortex_rmc_visao', v); } catch (e) {} }
    this.desenhar();
  },
  htmlVisao() {
    const d = this._d;
    if (d.meus) return '';
    if (this.ehCoord()) {
      return '<div class="toggle-visao rmc-toggle">' +
        '<button type="button" class="' + (this._visao === 'equipe' ? 'ativo' : '') + '" onclick="MODULOS.mensais.mudarVisao(\'equipe\')">Minha equipe</button>' +
        '<button type="button" class="' + (this._visao === 'tudo' ? 'ativo' : '') + '" onclick="MODULOS.mensais.mudarVisao(\'tudo\')">Ver tudo</button></div>';
    }
    if (!this.ehGestao()) return '';
    const times = d.coords.filter(c => d.pacs.some(p => p.time === c.id));
    const temSem = d.pacs.some(p => p.time === 'sem' && p.status !== 'encerrado');
    const chip = (v, rot) => '<button type="button" class="rmc-chip' + (this._visao === v ? ' ativo' : '') + '" onclick="MODULOS.mensais.mudarVisao(\'' + v + '\')">' + rot + '</button>';
    return '<div class="rmc-chips">' + chip('tudo', 'Ver tudo') + times.map(c => chip(c.id, 'Equipe ' + escaparHtml(this.primeiro(c.nome)))).join('') + (temSem ? chip('sem', 'Sem equipe') : '') + '</div>';
  },
  desenhar() {
    if (!this._d) return;
    const v = document.getElementById('rmc-visao'); if (v) v.innerHTML = this.htmlVisao();
    const lista = this.visiveis();
    const corpo = document.getElementById('rmc-corpo'); if (!corpo) return;
    document.getElementById('rmc-ferr').innerHTML = this.htmlFerrA();
    if (!lista.length) {
      const fora = this._busca.trim() && ((this.ehCoord() && this._visao === 'equipe') || (this.ehGestao() && this._visao !== 'tudo'));
      corpo.innerHTML = '<div class="cartao"><div class="vazio"><strong>' + (this._busca.trim() ? 'Nenhuma crianca com "' + escaparHtml(this._busca.trim()) + '"' : 'Nenhuma crianca aqui') + '</strong>' +
        (fora ? '<button class="btn btn-fantasma" style="margin-top:10px" onclick="MODULOS.mensais.mudarVisao(\'tudo\')">Procurar em todas as equipes</button>' : '') + '</div></div>';
      return;
    }
    corpo.innerHTML = this.htmlA(lista);
  },

  // ─────── linhas com os meses lado a lado ───────
  mesesA() { const l = []; for (let i = this.MESES_A - 1; i >= 0; i--) l.push(this.somaMes(this._fimA, -i)); return l; },
  moverA(n) { const novo = this.somaMes(this._fimA, n); if (novo > mesLocal()) return; this._fimA = novo; this.desenhar(); },
  htmlFerrA() {
    const ms = this.mesesA();
    return '<div class="rmc-legenda">' +
      ['liberado', 'gerado', 'rascunho', 'falta'].map(k => '<span><i class="rmc-bola ' + this.ST[k].cls + '"></i>' + this.ST[k].rot + '</span>').join('') +
      '</div>' +
      '<div class="rmc-dir"><div class="rmc-janela"><button type="button" class="btn-chip" onclick="MODULOS.mensais.moverA(-' + this.MESES_A + ')" title="Meses anteriores">&lsaquo;</button>' +
      '<b>' + this.nomeMes(ms[0], true) + '/' + ms[0].slice(2, 4) + ' a ' + this.nomeMes(ms[ms.length - 1], true) + '/' + ms[ms.length - 1].slice(2, 4) + '</b>' +
      '<button type="button" class="btn-chip" onclick="MODULOS.mensais.moverA(' + this.MESES_A + ')" title="Proximos meses"' + (this._fimA >= mesLocal() ? ' disabled' : '') + '>&rsaquo;</button></div>' +
      '<button type="button" class="btn btn-fantasma rmc-btn-lote" onclick="MODULOS.mensais.abrirLote()" title="Baixa de uma vez os PDFs assinados do mes, das criancas que estao na tela">' + this.ICO_BAIXAR + 'PDFs assinados</button></div>';
  },
  htmlA(lista) {
    const ms = this.mesesA();
    const cab = '<div class="rmc-linha rmc-cab"><span></span>' + ms.map(m => '<span class="' + (m === mesLocal() ? 'atual' : '') + '">' + this.nomeMes(m, true) + '<small>' + m.slice(2, 4) + '</small></span>').join('') + '</div>';
    return this.agrupar(lista).map(t =>
      '<section class="cartao rmc-time">' +
      '<header class="rmc-time-cab"><div><h3>' + escaparHtml(t.nome) + '</h3>' + (t.sub ? '<small>' + t.sub + '</small>' : '') + '</div>' +
      '<span class="selo selo-neutro">' + t.apls.reduce((n, a) => n + a.pacs.length, 0) + ' crianca(s)</span></header>' +
      t.apls.map(a =>
        '<div class="rmc-apl">' +
        '<div class="rmc-apl-cab"><span class="rmc-av ' + corAvatar(a.nome) + '">' + (a.id === 'sem' ? '?' : this.iniciais(a.nome)) + '</span><b>' + escaparHtml(a.nome) + '</b><small>' + a.pacs.length + '</small></div>' +
        cab +
        a.pacs.map(p => '<div class="rmc-linha">' +
          '<span class="rmc-nome"><a onclick="MODULOS.mensais.prontuario(\'' + p.id + '\')" title="Abrir o prontuario">' + escaparHtml(p.nome) + '</a>' + (p.status === 'encerrado' ? ' <small class="selo selo-neutro">encerrado</small>' : '') + '</span>' +
          ms.map(m => this.chipMes(p, m)).join('') + '</div>').join('') +
        '</div>').join('') +
      '</section>').join('');
  },
  chipMes(p, m) {
    const s = this.stDe(p, m);
    if (s.cls === 'antes' || s.futuro) return '<span class="rmc-mes vazio" title="' + s.rot + '"></span>';
    const pode = s.r || this.podeElaborar();
    const tit = this.nomeMes(m) + ': ' + (s.r ? s.rot : (s.atual ? 'ainda nao feito' : 'nao feito')) + (pode ? (s.r ? ' (abrir)' : ' (elaborar)') : '');
    return '<button type="button" class="rmc-mes ' + s.cls + (s.atual ? ' atual' : '') + '" title="' + tit + '"' + (pode ? ' onclick="MODULOS.mensais.abrir(\'' + p.id + '\', \'' + m + '\')"' : ' disabled') + '>' +
      '<span class="rmc-mes-m">' + this.nomeMes(m, true) + '</span>' + (s.r ? '<span class="rmc-mes-s">' + s.rot + '</span>' : '<span class="rmc-mes-s">' + (this.podeElaborar() ? '+ elaborar' : '&mdash;') + '</span>') + '</button>';
  },

  // ─────────────── ACOES ───────────────
  async abrir(pacienteId, mes) {
    const p = this._d && this._d.pacs.find(x => x.id === pacienteId);
    const existe = this._d && (this._d.rel[pacienteId] || {})[mes];
    if (!existe) {
      if (!this.podeElaborar()) return;
      if (!await popConfirmar('Elaborar o relatorio de ' + this.nomeMes(mes) + (p ? ' de ' + this.primeiro(p.nome) : '') + '?\n\nO rascunho ja sai com os textos prontos a partir dos dados do mes.',
        { titulo: 'Novo relatorio mensal', ok: 'Elaborar' })) return;
    }
    MODULOS.relatorios._origem = 'mensais';
    MODULOS.relatorios.abrirEditor(pacienteId, mes);
  },
  prontuario(pacienteId) { MODULOS.pacientes.telaDetalhe(pacienteId, 'relatorios'); },

  // ─────────────── PDFs ASSINADOS DE UMA VEZ (patch 67) ───────────────
  // Coordenacao (22/10): "na aba de relatorios mensais, teria como colocar um botaozinho pra baixar os PDFs assinados
  // todos de uma vez?". Um ZIP com o PDF assinado (ICP-Brasil) do relatorio mensal de cada crianca que esta na tela
  // agora (visao + busca), do mes escolhido, em pastas por equipe e aplicador (como na tela) ou tudo junto.
  // Se o mesmo relatorio foi assinado mais de uma vez, vai so o mais recente.
  ICO_BAIXAR: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M5 21h14"/></svg>',
  MESES_TXT: ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'],
  _lote: null,

  // mes do PDF: o titulo e "Relatorio Mensal Setembro de 2026" (editor). Titulo sem mes (o "Documento oficial" ate o
  // patch 66 gravava so "Relatorio Mensal"): o relatorio da crianca gerado por ultimo antes da assinatura.
  mesDoPdf(doc) {
    const t = this.semAcento(doc.titulo);
    const m = t.match(/(janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s+(?:de\s+)?(\d{4})/);
    if (m) return m[2] + '-' + String(this.MESES_TXT.indexOf(m[1]) + 1).padStart(2, '0');
    const quando = String(doc.criado_em || '');
    let melhor = null;
    Object.entries(this._d.rel[doc.paciente_id] || {}).forEach(([mes, r]) => {
      const g = String(r.gerado_em || '');
      if (g && g <= quando && (!melhor || g > melhor.g)) melhor = { mes, g };
    });
    return melhor ? melhor.mes : null;
  },
  async assinadosDe(ids) {
    const docs = [];
    for (let i = 0; i < ids.length; i += 150) {
      const { data, error } = await sb.from('documentos_assinados').select('id, paciente_id, tipo, titulo, arquivo_path, criado_em')
        .eq('tipo', 'relatorio_mensal').in('paciente_id', ids.slice(i, i + 150));
      if (error) throw error;
      docs.push(...(data || []));
    }
    // um por crianca e mes: o mais recente
    const porChave = {};
    docs.filter(d => d.arquivo_path).forEach(d => {
      const mes = this.mesDoPdf(d); if (!mes) return;
      const k = d.paciente_id + '|' + mes;
      if (!porChave[k] || String(d.criado_em) > String(porChave[k].criado_em)) porChave[k] = Object.assign({ mes }, d);
    });
    return Object.values(porChave);
  },

  async abrirLote() {
    if (!this._d) return;
    const lista = this.visiveis();
    if (!lista.length) { popAviso('Nenhuma crianca na tela. Mude a busca ou a equipe e tente de novo.'); return; }
    const ms = this.mesesA().filter(m => m <= mesLocal());
    this._lote = { lista, ms, mes: null, pastas: true, docs: null };
    abrirModal('Baixar PDFs assinados', '<div id="rmc-lote"><p class="sub">Procurando os PDFs assinados...</p></div>');
    try { this._lote.docs = await this.assinadosDe(lista.map(p => p.id)); }
    catch (e) {
      const alvo = document.getElementById('rmc-lote');
      if (alvo) alvo.innerHTML = '<div class="mensagem-erro visivel">Nao consegui buscar os PDFs: ' + escaparHtml(e.message) + '</div>';
      return;
    }
    // mes que abre: o mais recente da janela com PDF; senao o mes passado
    const comPdf = ms.filter(m => this._lote.docs.some(d => d.mes === m));
    const passado = this.somaMes(mesLocal(), -1);
    this._lote.mes = comPdf.length ? comPdf[comPdf.length - 1] : (ms.includes(passado) ? passado : ms[ms.length - 1]);
    this.desenharLote();
  },
  rotuloVisao() {
    const d = this._d;
    if (d.meus) return 'suas criancas';
    if (this.ehCoord()) return this._visao === 'equipe' ? 'sua equipe' : 'todas as equipes';
    if (this._visao === 'tudo') return 'todas as equipes';
    return this._visao === 'sem' ? 'criancas sem equipe' : 'Equipe ' + this.primeiro(d.nomes[this._visao]);
  },
  desenharLote() {
    const L = this._lote, alvo = document.getElementById('rmc-lote'); if (!L || !alvo) return;
    const docs = L.docs.filter(d => d.mes === L.mes);
    const tem = new Set(docs.map(d => d.paciente_id));
    const sem = L.lista.filter(p => !tem.has(p.id) && this.stDe(p, L.mes).cls !== 'antes');
    const busca = this._busca.trim();
    const chip = m => { const n = L.docs.filter(d => d.mes === m).length;
      return '<button type="button" class="rmc-chip' + (L.mes === m ? ' ativo' : '') + '" onclick="MODULOS.mensais.loteMes(\'' + m + '\')">' + this.nomeMes(m, true) + '/' + m.slice(2, 4) + (n ? ' <small>' + n + '</small>' : '') + '</button>'; };
    alvo.innerHTML =
      '<p class="sub" style="margin-top:0">Vai um ZIP com o PDF assinado do relatorio mensal de cada crianca que esta na tela agora: <b>' + escaparHtml(this.rotuloVisao()) + '</b>' +
      (busca ? ', busca "' + escaparHtml(busca) + '"' : '') + ' (' + L.lista.length + ' crianca' + (L.lista.length === 1 ? '' : 's') + ').</p>' +
      '<div class="rmc-lote-sec"><small>Mes</small><div class="rmc-chips rmc-lote-meses">' + L.ms.map(chip).join('') + '</div></div>' +
      '<div class="rmc-lote-sec"><small>Arquivos</small><div class="toggle-visao rmc-toggle">' +
      '<button type="button" class="' + (L.pastas ? 'ativo' : '') + '" onclick="MODULOS.mensais.lotePastas(true)">Pastas por equipe e aplicador</button>' +
      '<button type="button" class="' + (!L.pastas ? 'ativo' : '') + '" onclick="MODULOS.mensais.lotePastas(false)">Tudo numa pasta</button></div></div>' +
      '<div class="rmc-lote-res' + (docs.length ? '' : ' vazio') + '"><b>' + (docs.length ? docs.length + ' PDF' + (docs.length === 1 ? '' : 's') + ' assinado' + (docs.length === 1 ? '' : 's') : 'Nenhum PDF assinado') + '</b> em ' + this.nomeMes(L.mes) +
      (sem.length ? '<details><summary>' + sem.length + ' crianca' + (sem.length === 1 ? '' : 's') + ' sem PDF assinado neste mes</summary><ul>' +
        sem.map(p => { const s = this.stDe(p, L.mes); return '<li>' + escaparHtml(p.nome) + ' <small>' + (s.r ? s.rot.toLowerCase() + ', sem assinar' : 'relatorio nao feito') + '</small></li>'; }).join('') + '</ul></details>' : '') + '</div>' +
      '<div class="barra-acoes"><button type="button" class="btn btn-fantasma" onclick="fecharModal()">Cancelar</button>' +
      '<button type="button" class="btn btn-primario" id="rmc-lote-ir" onclick="MODULOS.mensais.baixarLote(this)"' + (docs.length ? '' : ' disabled') + '>' + this.ICO_BAIXAR + 'Baixar ZIP</button></div>';
  },
  loteMes(m) { if (this._lote) { this._lote.mes = m; this.desenharLote(); } },
  lotePastas(v) { if (this._lote) { this._lote.pastas = v; this.desenharLote(); } },
  nomeArq(s) { return String(s || '').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 90) || 'sem nome'; },

  async baixarLote(botao) {
    const L = this._lote; if (!L || L.baixando) return;
    const docs = L.docs.filter(d => d.mes === L.mes);
    if (!docs.length) return;
    L.baixando = true;
    const rotulo = botao.innerHTML; botao.disabled = true;
    const passo = t => { botao.textContent = t; };
    try {
      passo('Preparando...');
      if (!window.JSZip) await carregarScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
      const zip = new window.JSZip();
      // pasta de cada crianca, na mesma ordem e agrupamento da tela
      const pastaDe = {};
      this.agrupar(L.lista).forEach(t => t.apls.forEach(a => a.pacs.forEach(p => {
        pastaDe[p.id] = L.pastas ? this.nomeArq(t.nome) + '/' + this.nomeArq(a.nome) + '/' : '';
      })));
      const nomeDe = Object.fromEntries(L.lista.map(p => [p.id, p.nome]));
      const usados = new Set();
      const mesTxt = this.nomeMes(L.mes).replace(' de ', ' ');
      let feitos = 0; const falhas = [];
      const fila = docs.slice();
      const trabalhar = async () => {
        while (fila.length) {
          const d = fila.shift();
          const { data: blob, error } = await sb.storage.from('documentos').download(d.arquivo_path);
          if (error || !blob) falhas.push(nomeDe[d.paciente_id] || d.titulo || 'PDF');
          else {
            let nome = (pastaDe[d.paciente_id] || '') + this.nomeArq(nomeDe[d.paciente_id]) + ' - Relatorio mensal ' + mesTxt;
            let n = 2; const base = nome; while (usados.has(nome)) nome = base + ' (' + (n++) + ')';
            usados.add(nome);
            zip.file(nome + '.pdf', blob);
          }
          feitos++; passo('Baixando ' + feitos + ' de ' + docs.length + '...');
        }
      };
      await Promise.all([trabalhar(), trabalhar(), trabalhar(), trabalhar()]);
      if (falhas.length === docs.length) throw new Error('nenhum arquivo veio do armazenamento.');
      passo('Montando o ZIP...');
      const arq = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
      const url = URL.createObjectURL(arq);
      const a = document.createElement('a'); a.href = url;
      a.download = this.nomeArq('Relatorios mensais assinados - ' + mesTxt + (this.rotuloVisao().startsWith('Equipe') ? ' - ' + this.rotuloVisao() : '')) + '.zip';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      fecharModal();
      if (falhas.length) popAviso('O ZIP saiu com ' + (docs.length - falhas.length) + ' de ' + docs.length + ' PDFs. Nao consegui baixar: ' + falhas.join(', ') + '.\n\nAbra o prontuario da crianca e confira em Documentos.');
    } catch (e) {
      popAviso('Nao consegui montar o ZIP: ' + e.message);
      botao.disabled = false; botao.innerHTML = rotulo;
    } finally { L.baixando = false; }
  }
};
