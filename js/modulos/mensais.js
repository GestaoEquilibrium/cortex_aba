// ============================================================================
// CORTEX aba - js/modulos/mensais.js
// Patch 61: Relatorios mensais num lugar so. Digita o nome e aparecem os
// relatorios da crianca; "Minha equipe" / "Ver tudo" (coordenacao) ou um botao
// por equipe (direcao e suporte), separado por equipe (coordenadora) e por
// aplicador. Cada crianca numa linha com os ultimos 6 meses (opcao A do Wess).
// Aplicadora e terapeuta veem so as criancas delas.
// Abrir/elaborar usa o editor de sempre (MODULOS.relatorios.abrirEditor).
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
      this.todas(() => sb.from('relatorios_mensais').select('id, paciente_id, mes, status, liberado_em').order('mes', { ascending: false }))
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
      '<div class="rmc-janela"><button type="button" class="btn-chip" onclick="MODULOS.mensais.moverA(-' + this.MESES_A + ')" title="Meses anteriores">&lsaquo;</button>' +
      '<b>' + this.nomeMes(ms[0], true) + '/' + ms[0].slice(2, 4) + ' a ' + this.nomeMes(ms[ms.length - 1], true) + '/' + ms[ms.length - 1].slice(2, 4) + '</b>' +
      '<button type="button" class="btn-chip" onclick="MODULOS.mensais.moverA(' + this.MESES_A + ')" title="Proximos meses"' + (this._fimA >= mesLocal() ? ' disabled' : '') + '>&rsaquo;</button></div>';
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
  prontuario(pacienteId) { MODULOS.pacientes.telaDetalhe(pacienteId, 'relatorios'); }
};
