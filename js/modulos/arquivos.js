// ============================================================================
// CORTEX aba - js/modulos/arquivos.js
// Patch 69: aba Arquivos. Documentos pequenos (ate 10 MB) em pastas e subpastas.
// Duas telas, a pessoa escolhe no botao do topo (decisao do Wess, 27/10):
//   - "arvore": arvore de pastas a esquerda + lista de arquivos (padrao no computador)
//   - "cartoes": pastas e arquivos em cartoes (padrao no celular)
// Pasta trancada para perfis / equipes / pessoas aparece com cadeado e avisa ao tocar.
// Pasta com senha pede a senha TODA vez que a pessoa entra (ao sair, o banco fecha).
// Criar pasta, enviar, renomear, apagar e trancar: gestao (matriz de Permissoes:
// arquivos.editar e arquivos.trancar). Apagar manda para a Lixeira; apagar de vez
// so a direcao. Quem pode o que e conferido de novo no banco (SQL do patch 69).
// ============================================================================

window.MODULOS = window.MODULOS || {};

window.MODULOS.arquivos = {

  LIMITE: 10 * 1024 * 1024,
  PERFIS: [['direcao', 'Direcao'], ['coordenador', 'Coordenacao'], ['terapeuta', 'Terapeuta'], ['aplicador', 'Aplicador'], ['callcenter', 'Call center'], ['recepcao', 'Recepcao']],
  IC: {
    pasta: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',
    pastaCheia: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',
    cad: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
    grupo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3"/><path d="M3.5 19c.6-3 2.8-4.5 5.5-4.5s4.9 1.5 5.5 4.5"/><circle cx="17" cy="9" r="2.4"/><path d="M15.5 14.6c2.3.1 4.2 1.5 4.8 4.4"/></svg>',
    seta: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
    subir: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4"/><path d="M7 9l5-5 5 5"/><path d="M5 20h14"/></svg>',
    baixar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M5 21h14"/></svg>',
    tres: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>',
    busca: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
    arq: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h9l4 4v14H6z"/><path d="M14.5 3v4.5H19"/></svg>',
    arvore: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h6"/><path d="M7 5v14h4"/><path d="M7 12h4"/><rect x="13" y="9.5" width="7" height="5" rx="1.2"/><rect x="13" y="16.5" width="7" height="5" rx="1.2"/><rect x="11" y="2.5" width="9" height="5" rx="1.2"/></svg>',
    cartoes: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.6"/></svg>',
    lixo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/></svg>'
  },
  TIPOS: {
    pdf: ['#DC2626', 'PDF'], doc: ['#2563EB', 'DOC'], docx: ['#2563EB', 'DOC'], odt: ['#2563EB', 'DOC'], rtf: ['#2563EB', 'DOC'], txt: ['#64748B', 'TXT'],
    xls: ['#16A34A', 'XLS'], xlsx: ['#16A34A', 'XLS'], csv: ['#16A34A', 'CSV'], ods: ['#16A34A', 'XLS'],
    ppt: ['#EA580C', 'PPT'], pptx: ['#EA580C', 'PPT'], odp: ['#EA580C', 'PPT'],
    png: ['#7C3AED', 'IMG'], jpg: ['#7C3AED', 'IMG'], jpeg: ['#7C3AED', 'IMG'], gif: ['#7C3AED', 'IMG'], webp: ['#7C3AED', 'IMG'], heic: ['#7C3AED', 'IMG'],
    zip: ['#475569', 'ZIP'], rar: ['#475569', 'ZIP'], mp3: ['#DB2777', 'AUD'], mp4: ['#0891B2', 'VID'], mov: ['#0891B2', 'VID']
  },

  _visao: null,        // 'arvore' | 'cartoes'
  _atual: null,        // pasta aberta (null = raiz)
  _abertas: [],        // pastas com senha abertas no caminho atual (o banco fecha ao sair)
  _expandidas: null,   // nos abertos na arvore
  _busca: '',

  // ─────── quem pode o que (o banco confere de novo) ───────
  perfil() { const p = window.CORTEX_SESSAO.profile; return p.perfil_real || p.perfil; },
  pode(acao) {
    const pf = this.perfil();
    if (pf === 'familia') return false;
    if (CORTEX_PERM_TUDO || pf === 'suporte') return true;
    if (acao === 'apagar_de_vez') return pf === 'direcao';
    if (acao !== 'ver' && CORTEX_PERMS['arquivos.' + acao] !== undefined) return CORTEX_PERMS['arquivos.' + acao] === 'E';
    if (CORTEX_PERMS.arquivos !== undefined) return acao === 'ver' ? !!CORTEX_PERMS.arquivos : CORTEX_PERMS.arquivos === 'E';
    return acao === 'ver' ? true : ['direcao', 'coordenador'].includes(pf);
  },
  livre() { return ['direcao', 'suporte'].includes(this.perfil()); },
  cel() { return window.matchMedia('(max-width: 720px)').matches; },
  semAcento(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); },

  // ─────────────── TELA ───────────────
  async render(el) {
    this.el = el;
    if (!this._visao) {
      let g = null; try { g = localStorage.getItem('cortex_arq_visao'); } catch (e) {}
      this._visao = g === 'arvore' || g === 'cartoes' ? g : (this.cel() ? 'cartoes' : 'arvore');
    }
    this._atual = null; this._abertas = []; this._busca = ''; this._expandidas = new Set();
    el.innerHTML =
      '<div class="pagina-cabecalho arq-cab"><div><h2>Arquivos</h2><p class="sub">Documentos da clinica em pastas. Pastas com cadeado so abrem para quem pode.</p></div>' +
      '<div class="arq-acoes">' +
      (this.pode('editar') ? '<button type="button" class="btn btn-fantasma" onclick="MODULOS.arquivos.novaPasta()">' + this.IC.pasta + 'Nova pasta</button>' +
        '<button type="button" class="btn btn-primario" id="arq-enviar" onclick="document.getElementById(\'arq-input\').click()">' + this.IC.subir + 'Enviar arquivo</button>' +
        '<input type="file" id="arq-input" multiple hidden onchange="MODULOS.arquivos.enviar(this.files); this.value=\'\'">' : '') +
      '</div></div>' +
      '<div class="arq-barra">' +
      '  <label class="rmc-busca arq-busca">' + this.IC.busca + '<input id="arq-busca" placeholder="' + (this.cel() ? 'Procurar' : 'Procurar arquivo ou pasta') + '" autocomplete="off" oninput="MODULOS.arquivos.buscar(this.value)">' +
      '    <button type="button" class="rmc-limpar" title="Limpar" onclick="MODULOS.arquivos.buscar(\'\'); document.getElementById(\'arq-busca\').value=\'\'">&times;</button></label>' +
      '  <div class="arq-barra-dir">' +
      (this.pode('editar') ? '<button type="button" class="btn-chip arq-lixeira-btn" title="Lixeira" onclick="MODULOS.arquivos.lixeira()">' + this.IC.lixo + '<span>Lixeira</span></button>' : '') +
      '    <div class="arq-visao" role="group" aria-label="Como mostrar">' +
      '      <button type="button" data-v="arvore" title="Arvore e lista" onclick="MODULOS.arquivos.trocarVisao(\'arvore\')">' + this.IC.arvore + '</button>' +
      '      <button type="button" data-v="cartoes" title="Cartoes" onclick="MODULOS.arquivos.trocarVisao(\'cartoes\')">' + this.IC.cartoes + '</button>' +
      '    </div></div></div>' +
      '<div id="arq-corpo"><div class="cartao"><p class="sub">Carregando...</p></div></div>';
    this.marcarVisao();
    this.ligarSoltar(el);
    try {
      // entrar na aba comeca com tudo trancado (senha e pedida de novo)
      await sb.rpc('fn_arq_fechar', { p_pasta: null });
      await this.carregarBase();
    } catch (e) {
      const semSql = /arq_pastas|fn_arq|does not exist|schema cache/i.test(e.message || '');
      document.getElementById('arq-corpo').innerHTML = '<div class="cartao"><div class="vazio"><strong>' + (semSql ? 'Falta rodar o SQL do patch 69 no banco' : 'Nao consegui carregar') + '</strong>' + (semSql ? '' : escaparHtml(e.message)) + '</div></div>';
      return;
    }
    await this.irPara(null);
  },

  marcarVisao() { document.querySelectorAll('.arq-visao button').forEach(b => b.classList.toggle('ativo', b.dataset.v === this._visao)); },
  trocarVisao(v) {
    this._visao = v; try { localStorage.setItem('cortex_arq_visao', v); } catch (e) {}
    this.marcarVisao(); this.desenhar();
  },

  // ─────────────── DADOS ───────────────
  async carregarBase() {
    const eu = window.CORTEX_SESSAO.user.id;
    const [rProf, rEm] = await Promise.all([
      sb.from('profiles').select('id, nome, perfil, ativo, coordenador_id'),
      sb.from('equipe_membros').select('coordenador_id, aplicador_id')
    ]);
    const profs = (rProf.data || []).filter(p => p.perfil !== 'familia');
    this._nomes = Object.fromEntries(profs.map(p => [p.id, p.nome]));
    this._pessoas = profs.filter(p => p.ativo !== false).sort((a, b) => a.nome.localeCompare(b.nome));
    this._coords = this._pessoas.filter(p => p.perfil === 'coordenador');
    const eu_ = profs.find(p => p.id === eu) || {};
    const times = new Set();
    if (this.perfil() === 'coordenador') times.add(eu);
    if (eu_.coordenador_id) times.add(eu_.coordenador_id);
    (rEm.data || []).forEach(x => { if (x.aplicador_id === eu) times.add(x.coordenador_id); });
    this._meusTimes = times;
    await this.carregarPastas();
  },
  async carregarPastas() {
    const { data, error } = await sb.from('arq_pastas').select('id, pai_id, nome, restrita, perfis, equipes, pessoas, tem_senha, criado_em, apagada_em, apagada_por').order('nome');
    if (error) throw error;
    this._pastas = data || [];
    this._porId = Object.fromEntries(this._pastas.map(p => [p.id, p]));
  },
  filhas(id) { return this._pastas.filter(p => (p.pai_id || null) === (id || null) && !p.apagada_em).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { numeric: true })); },
  caminho(id) { const l = []; let p = id && this._porId[id]; let n = 0; while (p && n++ < 60) { l.unshift(p); p = p.pai_id && this._porId[p.pai_id]; } return l; },
  viva(id) { return this.caminho(id).every(p => !p.apagada_em) && (!id || !!this._porId[id]); },
  // como a pasta aparece para quem esta usando (o banco e quem decide de verdade)
  estado(p) {
    if (!p) return 'sim';
    const eu = window.CORTEX_SESSAO.user.id;
    if (p.restrita && !this.livre() && !((p.perfis || []).includes(this.perfil()) || (p.pessoas || []).includes(eu) || (p.equipes || []).some(t => this._meusTimes.has(t)))) return 'restrita';
    if (p.tem_senha && !this._abertas.includes(p.id)) return 'senha';
    return 'sim';
  },
  quemPode(p) {
    const partes = [];
    (p.perfis || []).forEach(x => { const r = this.PERFIS.find(y => y[0] === x); partes.push(r ? r[1] : x); });
    (p.equipes || []).forEach(x => partes.push('Equipe ' + String(this._nomes[x] || '?').split(' ')[0]));
    (p.pessoas || []).forEach(x => partes.push(String(this._nomes[x] || '?').split(' ').slice(0, 2).join(' ')));
    return partes.join(', ') || 'direcao';
  },

  // ─────────────── NAVEGAR ───────────────
  async irPara(id) {
    const destino = id || null;
    const cadeia = this.caminho(destino).map(p => p.id);
    // saiu de uma pasta com senha: o banco fecha (na proxima vez pede de novo)
    const sair = this._abertas.filter(x => !cadeia.includes(x));
    if (sair.length) {
      this._abertas = this._abertas.filter(x => cadeia.includes(x));
      await Promise.all(sair.map(x => sb.rpc('fn_arq_fechar', { p_pasta: x })));
    }
    if (destino) {
      const { data: r, error } = await sb.rpc('fn_arq_abrir', { p_pasta: destino, p_senha: null });
      if (error) { popAviso('Nao consegui abrir a pasta: ' + error.message); return; }
      if (r && r.erro === 'restrita') { this.avisoRestrita(this._porId[r.pasta] || { nome: r.nome }); return; }
      if (r && (r.erro === 'senha' || r.erro === 'bloqueada')) {
        const ok = await this.pedirSenha(r.pasta, r.nome, r.erro === 'bloqueada');
        if (!ok) return;
        return this.irPara(destino);
      }
    }
    this._atual = destino;
    this.caminho(destino).forEach(p => this._expandidas.add(p.id));
    await this.carregarConteudo();
    this.desenhar();
  },
  async carregarConteudo() {
    await this.carregarPastas();
    const id = this._atual;
    let q = sb.from('arq_arquivos').select('id, pasta_id, nome, caminho, tipo, tamanho, enviado_por, criado_em, apagado_em').is('apagado_em', null).order('nome');
    q = id ? q.eq('pasta_id', id) : q.is('pasta_id', null);
    const filhas = this.filhas(id).filter(p => this.estado(p) === 'sim');
    const [rA, rC] = await Promise.all([
      q,
      filhas.length ? sb.from('arq_arquivos').select('pasta_id').is('apagado_em', null).in('pasta_id', filhas.map(p => p.id)) : Promise.resolve({ data: [] })
    ]);
    if (rA.error) { popAviso('Nao consegui ler os arquivos: ' + rA.error.message); }
    this._arqs = (rA.data || []).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { numeric: true }));
    this._qtd = {};
    (rC.data || []).forEach(a => { this._qtd[a.pasta_id] = (this._qtd[a.pasta_id] || 0) + 1; });
  },

  avisoRestrita(p) {
    popAviso('A pasta "' + (p.nome || '') + '" e restrita.' + (p.perfis || p.equipes || p.pessoas ? '\n\nSo abre para: ' + this.quemPode(p) + '.' : '') + '\n\nSe precisar dela, fale com a coordenacao.', 'Pasta restrita');
  },
  pedirSenha(pastaId, nome, bloqueada) {
    return new Promise(resolve => {
      const fundo = popBase('Pasta com senha',
        '<div class="arq-pede"><span class="arq-pede-ic">' + this.IC.cad + '</span><b>' + escaparHtml(nome || '') + '</b>' +
        '<p class="sub" id="arq-pede-msg">' + (bloqueada ? 'Muitas tentativas erradas. Espere alguns minutos e tente de novo.' : 'Esta pasta pede senha toda vez que abre.') + '</p>' +
        '<input type="password" id="arq-pede-senha" class="arq-senha" placeholder="Senha da pasta" autocomplete="off">' +
        '<div class="barra-acoes"><button type="button" class="btn btn-fantasma" id="arq-pede-nao">Cancelar</button><button type="button" class="btn btn-primario" id="arq-pede-ok">Abrir</button></div></div>', 'aviso');
      const inp = fundo.querySelector('#arq-pede-senha'), msg = fundo.querySelector('#arq-pede-msg'), bt = fundo.querySelector('#arq-pede-ok');
      const fim = v => { fundo.remove(); resolve(v); };
      const tentar = async () => {
        if (!inp.value) { inp.focus(); return; }
        bt.disabled = true; bt.textContent = 'Conferindo...';
        const { data: r, error } = await sb.rpc('fn_arq_abrir', { p_pasta: pastaId, p_senha: inp.value });
        bt.disabled = false; bt.textContent = 'Abrir';
        if (error) { msg.textContent = 'Nao consegui conferir: ' + error.message; return; }
        if (r && r.ok) { if (!this._abertas.includes(pastaId)) this._abertas.push(pastaId); fim(true); return; }
        if (r && r.erro === 'senha' && r.pasta !== pastaId) { fim(true); return; }   // senha de outra pasta acima: o irPara pede
        msg.classList.add('arq-pede-erro');
        msg.textContent = r && r.erro === 'bloqueada' ? 'Muitas tentativas erradas. Espere alguns minutos e tente de novo.'
          : r && r.erro === 'senha_errada' ? 'Senha errada.' + (r.restam != null ? (r.restam ? ' Mais ' + r.restam + ' tentativa(s) antes de travar.' : ' A proxima errada trava por 10 minutos.') : '')
          : r && r.erro === 'restrita' ? 'Esta pasta e restrita.' : 'Nao consegui abrir.';
        inp.value = ''; inp.focus();
      };
      fundo.querySelector('#arq-pede-nao').onclick = () => fim(false);
      bt.onclick = tentar;
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') tentar(); if (e.key === 'Escape') fim(false); });
      setTimeout(() => inp.focus(), 30);
    });
  },

  // ─────────────── DESENHO ───────────────
  desenhar() {
    const corpo = document.getElementById('arq-corpo'); if (!corpo || !this._pastas) return;
    if (this._busca.trim()) { this.desenharBusca(corpo); return; }
    corpo.innerHTML = this._visao === 'arvore' ? this.htmlArvore() : this.htmlCartoes();
  },
  tipoDe(nome) { const ext = String(nome || '').split('.').pop().toLowerCase(); return this.TIPOS[ext] || ['#64748B', (ext.length <= 4 ? ext : 'arq').toUpperCase() || 'ARQ']; },
  tam(n) { if (n == null) return ''; if (n < 1024) return n + ' B'; if (n < 1024 * 1024) return Math.round(n / 1024) + ' KB'; return (n / 1048576).toFixed(1).replace('.', ',') + ' MB'; },
  data(d) { return d ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : ''; },
  selo(p) {
    const e = this.estado(p);
    if (!p.restrita && !p.tem_senha) return '';
    const senha = p.tem_senha && (e === 'senha' || !p.restrita);
    const ic = !senha && (p.equipes || []).length && !(p.perfis || []).length ? this.IC.grupo : this.IC.cad;
    const cls = senha ? 'senha' : ((p.equipes || []).length && !(p.perfis || []).length ? 'equipe' : 'perfil');
    const rot = senha ? 'Senha' : cls === 'equipe' ? 'Equipe' : 'Restrita';
    return '<span class="arq-trava ' + cls + '" title="' + escaparHtml(p.restrita ? 'So: ' + this.quemPode(p) : 'Pede senha') + (p.restrita && p.tem_senha ? ' + senha' : '') + '">' + ic + '<span>' + rot + '</span></span>';
  },
  subPasta(p) {
    const e = this.estado(p);
    if (e === 'restrita') return 'Restrita';
    if (e === 'senha') return 'Pede senha';
    const nP = this.filhas(p.id).length, nA = this._qtd[p.id] || 0;
    const t = [];
    if (nP) t.push(nP + (nP === 1 ? ' pasta' : ' pastas'));
    if (nA || !nP) t.push(nA + (nA === 1 ? ' arquivo' : ' arquivos'));
    return t.join(' &middot; ');
  },
  htmlTrilha() {
    const cad = this.caminho(this._atual);
    const atual = cad[cad.length - 1];
    const podeT = atual && this.pode('trancar'), podeE = atual && this.pode('editar');
    return '<div class="arq-trilha"><nav class="arq-trilha-nav">' +
      (cad.length ? '<a onclick="MODULOS.arquivos.irPara(null)">Arquivos</a>' : '<b>Arquivos</b>') +
      cad.map((p, i) => this.IC.seta + (i === cad.length - 1 ? '<b>' + escaparHtml(p.nome) + '</b>' : '<a onclick="MODULOS.arquivos.irPara(\'' + p.id + '\')">' + escaparHtml(p.nome) + '</a>')).join('') +
      (atual ? this.selo(atual) : '') + '</nav>' +
      '<span class="arq-trilha-dir">' +
      (podeT ? '<button type="button" class="btn-chip arq-btn-ic" onclick="MODULOS.arquivos.trancar(\'' + atual.id + '\')">' + this.IC.cad + '<span>' + (atual.restrita || atual.tem_senha ? 'Cadeado' : 'Trancar') + '</span></button>' : '') +
      (podeE ? '<button type="button" class="btn-chip arq-btn-ic" title="Mais" onclick="MODULOS.arquivos.menu(event, \'pasta\', \'' + atual.id + '\')">' + this.IC.tres + '</button>' : '') +
      '</span></div>';
  },
  htmlVazio() {
    const sem = !this.filhas(this._atual).length && !this._arqs.length;
    if (!sem) return '';
    return '<div class="vazio arq-vazio"><strong>' + (this._atual ? 'Pasta vazia' : 'Nenhuma pasta ainda') + '</strong>' +
      (this.pode('editar') ? 'Crie uma pasta ou envie arquivos (ate 10 MB cada).' : 'Quando a coordenacao colocar documentos aqui, eles aparecem nesta tela.') + '</div>';
  },
  htmlSoltar() {
    if (!this.pode('editar') || this.cel()) return '';
    const atual = this._porId[this._atual];
    return '<div class="arq-solte">' + this.IC.subir + ' Arraste arquivos aqui para enviar para <b>' + escaparHtml(atual ? atual.nome : 'Arquivos') + '</b> &middot; ate 10 MB cada</div>';
  },
  acoesArq(a) {
    return '<button type="button" class="btn-chip arq-btn-ic" title="Baixar" onclick="event.stopPropagation(); MODULOS.arquivos.baixar(\'' + a.id + '\')">' + this.IC.baixar + '</button>' +
      (this.pode('editar') ? '<button type="button" class="btn-chip arq-btn-ic" title="Mais" onclick="event.stopPropagation(); MODULOS.arquivos.menu(event, \'arquivo\', \'' + a.id + '\')">' + this.IC.tres + '</button>' : '');
  },
  acoesPasta(p) {
    return this.pode('editar') ? '<button type="button" class="btn-chip arq-btn-ic" title="Mais" onclick="event.stopPropagation(); MODULOS.arquivos.menu(event, \'pasta\', \'' + p.id + '\')">' + this.IC.tres + '</button>' : '';
  },

  // ─────── A · arvore + lista ───────
  htmlArvore() {
    const no = (p, nivel) => {
      const e = this.estado(p), filhas = e === 'sim' ? this.filhas(p.id) : [];
      const aberto = this._expandidas.has(p.id) && filhas.length;
      const ativo = p.id === this._atual;
      return '<div class="arq-no' + (ativo ? ' ativo' : '') + (e !== 'sim' ? ' trancada' : '') + '" style="--n:' + nivel + '" onclick="MODULOS.arquivos.irPara(\'' + p.id + '\')">' +
        '<span class="arq-no-seta' + (aberto ? ' aberta' : '') + '"' + (filhas.length ? ' onclick="event.stopPropagation(); MODULOS.arquivos.expandir(\'' + p.id + '\')"' : '') + '>' + (filhas.length ? this.IC.seta : '') + '</span>' +
        '<span class="arq-no-ic">' + this.IC.pastaCheia + '</span><span class="arq-no-nome" title="' + escaparHtml(p.nome) + '">' + escaparHtml(p.nome) + '</span>' +
        (p.restrita || p.tem_senha ? '<span class="arq-no-cad ' + (p.tem_senha && !p.restrita ? 'senha' : (p.equipes || []).length && !(p.perfis || []).length ? 'equipe' : '') + '">' + ((p.equipes || []).length && !(p.perfis || []).length && !p.tem_senha ? this.IC.grupo : this.IC.cad) + '</span>' : '') +
        '</div>' + (aberto ? filhas.map(f => no(f, nivel + 1)).join('') : '');
    };
    const raiz = this.filhas(null);
    const arvore = '<aside class="arq-arvore cartao">' +
      '<div class="arq-no raiz' + (!this._atual ? ' ativo' : '') + '" style="--n:0" onclick="MODULOS.arquivos.irPara(null)"><span class="arq-no-seta"></span><span class="arq-no-ic">' + this.IC.pasta + '</span><span class="arq-no-nome">Arquivos</span></div>' +
      raiz.map(p => no(p, 1)).join('') + '</aside>';
    const linhaP = p => '<div class="arq-linha pasta' + (this.estado(p) !== 'sim' ? ' trancada' : '') + '" onclick="MODULOS.arquivos.irPara(\'' + p.id + '\')">' +
      '<span class="arq-l-ic">' + this.IC.pastaCheia + '</span><span class="arq-l-nome"><b>' + escaparHtml(p.nome) + '</b>' + this.selo(p) + '</span>' +
      '<span class="arq-l-sub">' + this.subPasta(p) + '</span><span class="arq-l-quem"></span><span class="arq-l-em"></span><span class="arq-l-ac">' + this.acoesPasta(p) + '</span></div>';
    const linhaA = a => { const t = this.tipoDe(a.nome);
      return '<div class="arq-linha" onclick="MODULOS.arquivos.abrirArquivo(\'' + a.id + '\')">' +
        '<span class="arq-l-ic"><span class="arq-tipo" style="--t:' + t[0] + '">' + t[1] + '</span></span><span class="arq-l-nome" title="' + escaparHtml(a.nome) + '">' + escaparHtml(a.nome) + '</span>' +
        '<span class="arq-l-sub">' + this.tam(a.tamanho) + '</span><span class="arq-l-quem">' + escaparHtml(String(this._nomes[a.enviado_por] || '').split(' ').slice(0, 2).join(' ')) + '</span>' +
        '<span class="arq-l-em">' + this.data(a.criado_em) + '</span><span class="arq-l-ac">' + this.acoesArq(a) + '</span></div>'; };
    const filhas = this.filhas(this._atual);
    const lista = '<section class="arq-lista cartao" data-soltar="1">' + this.htmlTrilha() +
      (filhas.length || this._arqs.length ? '<div class="arq-linha arq-cabl"><span></span><span>Nome</span><span>Tamanho</span><span>Enviado por</span><span>Data</span><span></span></div>' : '') +
      filhas.map(linhaP).join('') + this._arqs.map(linhaA).join('') + this.htmlVazio() + this.htmlSoltar() + '</section>';
    return '<div class="arq-a">' + arvore + lista + '</div>';
  },
  expandir(id) { if (this._expandidas.has(id)) this._expandidas.delete(id); else this._expandidas.add(id); this.desenhar(); },

  // ─────── B · cartoes ───────
  htmlCartoes() {
    const card = p => { const e = this.estado(p);
      return '<div class="arq-card' + (e !== 'sim' ? ' trancada' : '') + '" onclick="MODULOS.arquivos.irPara(\'' + p.id + '\')">' +
        '<span class="arq-card-ic">' + this.IC.pastaCheia + (p.restrita || p.tem_senha ? '<i class="arq-card-cad ' + (p.tem_senha && !p.restrita ? 'senha' : (p.equipes || []).length && !(p.perfis || []).length ? 'equipe' : '') + '">' + ((p.equipes || []).length && !(p.perfis || []).length && !p.tem_senha ? this.IC.grupo : this.IC.cad) + '</i>' : '') + '</span>' +
        '<b title="' + escaparHtml(p.nome) + '">' + escaparHtml(p.nome) + '</b><small>' + this.subPasta(p) + '</small>' +
        (p.restrita ? '<em class="arq-card-quem">So: ' + escaparHtml(this.quemPode(p)) + '</em>' : p.tem_senha ? '<em class="arq-card-quem">Com senha</em>' : '') +
        '<span class="arq-card-mais">' + this.acoesPasta(p) + '</span></div>'; };
    const arq = a => { const t = this.tipoDe(a.nome);
      return '<div class="arq-arq" onclick="MODULOS.arquivos.abrirArquivo(\'' + a.id + '\')">' +
        '<span class="arq-arq-ic" style="--t:' + t[0] + '">' + this.IC.arq + '<i>' + t[1] + '</i></span>' +
        '<b title="' + escaparHtml(a.nome) + '">' + escaparHtml(a.nome) + '</b><small>' + this.tam(a.tamanho) + ' &middot; ' + this.data(a.criado_em) + '</small>' +
        '<span class="arq-card-mais">' + this.acoesArq(a) + '</span></div>'; };
    const filhas = this.filhas(this._atual);
    return '<section class="arq-b" data-soltar="1">' + this.htmlTrilha() +
      (filhas.length ? '<h4 class="arq-tit">Pastas</h4><div class="arq-grade">' + filhas.map(card).join('') + '</div>' : '') +
      (this._arqs.length ? '<h4 class="arq-tit">Arquivos</h4><div class="arq-grade arqs">' + this._arqs.map(arq).join('') + '</div>' : '') +
      this.htmlVazio() + this.htmlSoltar() + '</section>';
  },

  // ─────── busca (arquivos e pastas onde a pessoa entra) ───────
  buscar(v) {
    this._busca = v || '';
    clearTimeout(this._tBusca);
    this._tBusca = setTimeout(() => this.desenhar(), 220);
  },
  async desenharBusca(corpo) {
    const q = this._busca.trim(), qs = this.semAcento(q);
    corpo.innerHTML = '<div class="cartao"><p class="sub">Procurando...</p></div>';
    const { data } = await sb.from('arq_arquivos').select('id, pasta_id, nome, caminho, tamanho, criado_em, enviado_por').is('apagado_em', null).ilike('nome', '%' + q.replace(/[%_]/g, '') + '%').order('nome').limit(60);
    if (this._busca.trim() !== q) return;
    const arqs = (data || []).filter(a => this.viva(a.pasta_id));
    (this._arqsBusca = {}); arqs.forEach(a => { this._arqsBusca[a.id] = a; });
    const pastas = this._pastas.filter(p => this.viva(p.id) && this.semAcento(p.nome).includes(qs)).slice(0, 30);
    const onde = id => { const c = this.caminho(id); return c.length ? c.map(p => escaparHtml(p.nome)).join(' / ') : 'Arquivos'; };
    if (!arqs.length && !pastas.length) { corpo.innerHTML = '<div class="cartao"><div class="vazio"><strong>Nada com "' + escaparHtml(q) + '"</strong>Pastas restritas ou com senha so entram na busca depois de abertas.</div></div>'; return; }
    corpo.innerHTML = '<section class="cartao arq-lista arq-busca-res">' +
      pastas.map(p => '<div class="arq-linha pasta" onclick="MODULOS.arquivos.abrirDaBusca(\'pasta\', \'' + p.id + '\')"><span class="arq-l-ic">' + this.IC.pastaCheia + '</span><span class="arq-l-nome"><b>' + escaparHtml(p.nome) + '</b>' + this.selo(p) + '</span><span class="arq-l-onde">' + onde(p.pai_id) + '</span></div>').join('') +
      arqs.map(a => { const t = this.tipoDe(a.nome); return '<div class="arq-linha" onclick="MODULOS.arquivos.abrirDaBusca(\'arquivo\', \'' + a.id + '\')"><span class="arq-l-ic"><span class="arq-tipo" style="--t:' + t[0] + '">' + t[1] + '</span></span><span class="arq-l-nome">' + escaparHtml(a.nome) + '</span><span class="arq-l-onde">' + onde(a.pasta_id) + ' &middot; ' + this.tam(a.tamanho) + '</span></div>'; }).join('') +
      '</section>';
  },
  async abrirDaBusca(tipo, id) {
    const limpar = () => { this._busca = ''; const i = document.getElementById('arq-busca'); if (i) i.value = ''; };
    if (tipo === 'pasta') { limpar(); return this.irPara(id); }
    const a = (this._arqsBusca || {})[id]; if (!a) return;
    limpar();
    await this.irPara(a.pasta_id);
    this.abrirArquivo(a.id, a);
  },

  // ─────────────── ARQUIVO: abrir e baixar ───────────────
  achar(id) { return (this._arqs || []).find(a => a.id === id) || (this._arqsBusca || {})[id]; },
  async url(a, baixar) {
    const { data, error } = await sb.storage.from('arquivos').createSignedUrl(a.caminho, 300, baixar ? { download: a.nome } : undefined);
    if (error || !data) { popAviso('Nao consegui abrir o arquivo' + (error ? ': ' + error.message : '.')); return null; }
    return data.signedUrl;
  },
  async abrirArquivo(id, obj) {
    const a = obj || this.achar(id); if (!a) return;
    const ext = String(a.nome).split('.').pop().toLowerCase();
    if (ext === 'pdf') { const u = await this.url(a); if (u) abrirModalPdf(escaparHtml(a.nome), u); return; }
    if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) {
      const u = await this.url(a); if (!u) return;
      abrirModal(escaparHtml(a.nome), '<div class="arq-img"><img src="' + u + '" alt=""></div><div class="barra-acoes"><button type="button" class="btn btn-primario" onclick="MODULOS.arquivos.baixar(\'' + a.id + '\')">' + this.IC.baixar + ' Baixar</button></div>', true);
      return;
    }
    this.baixar(a.id);
  },
  async baixar(id) {
    const a = this.achar(id); if (!a) return;
    const u = await this.url(a, true); if (!u) return;
    const l = document.createElement('a'); l.href = u; l.download = a.nome; document.body.appendChild(l); l.click(); l.remove();
  },

  // ─────────────── MENU "..." ───────────────
  menu(ev, tipo, id) {
    ev.stopPropagation();
    document.getElementById('arq-menu')?.remove();
    const p = tipo === 'pasta' ? this._porId[id] : null;
    const itens = tipo === 'pasta'
      ? (id === this._atual ? [] : [['Abrir', "MODULOS.arquivos.irPara('" + id + "')"]]).concat([['Renomear', "MODULOS.arquivos.renomear('pasta', '" + id + "')"]])
        .concat(this.pode('trancar') ? [[p && (p.restrita || p.tem_senha) ? 'Cadeado' : 'Trancar', "MODULOS.arquivos.trancar('" + id + "')"]] : [])
        .concat([['Apagar', "MODULOS.arquivos.apagar('pasta', '" + id + "')", 'perigo']])
      : [['Abrir', "MODULOS.arquivos.abrirArquivo('" + id + "')"], ['Baixar', "MODULOS.arquivos.baixar('" + id + "')"], ['Renomear', "MODULOS.arquivos.renomear('arquivo', '" + id + "')"], ['Apagar', "MODULOS.arquivos.apagar('arquivo', '" + id + "')", 'perigo']];
    const m = document.createElement('div');
    m.id = 'arq-menu'; m.className = 'arq-menu';
    m.innerHTML = itens.map(([r, a, c]) => '<button type="button" class="' + (c || '') + '" onclick="document.getElementById(\'arq-menu\').remove(); ' + a + '">' + r + '</button>').join('');
    document.body.appendChild(m);
    const b = ev.currentTarget.getBoundingClientRect();
    const w = m.offsetWidth, h = m.offsetHeight;
    m.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, b.right - w)) + 'px';
    m.style.top = (b.bottom + h + 8 > window.innerHeight ? Math.max(8, b.top - h - 4) : b.bottom + 4) + 'px';
    const fechar = e => { if (!m.contains(e.target)) { m.remove(); document.removeEventListener('pointerdown', fechar, true); } };
    setTimeout(() => document.addEventListener('pointerdown', fechar, true), 0);
  },

  // ─────────────── CRIAR, RENOMEAR, APAGAR ───────────────
  pedirNome(titulo, valor, rotulo) {
    return new Promise(resolve => {
      const fundo = popBase(titulo, '<div class="campo"><label>' + rotulo + '</label><input type="text" id="arq-nome" maxlength="150" value="' + escaparHtml(valor || '').replace(/"/g, '&quot;') + '"></div>' +
        '<div class="barra-acoes"><button type="button" class="btn btn-fantasma" id="arq-nome-nao">Cancelar</button><button type="button" class="btn btn-primario" id="arq-nome-ok">Salvar</button></div>', 'aviso');
      const inp = fundo.querySelector('#arq-nome');
      const fim = v => { fundo.remove(); resolve(v); };
      const ok = () => { const v = inp.value.trim(); if (!v) { inp.focus(); return; } fim(v); };
      fundo.querySelector('#arq-nome-nao').onclick = () => fim(null);
      fundo.querySelector('#arq-nome-ok').onclick = ok;
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') ok(); if (e.key === 'Escape') fim(null); });
      setTimeout(() => { inp.focus(); const ponto = inp.value.lastIndexOf('.'); inp.setSelectionRange(0, ponto > 0 ? ponto : inp.value.length); }, 30);
    });
  },
  async novaPasta() {
    const nome = await this.pedirNome('Nova pasta', '', 'Nome da pasta' + (this._atual ? ' (dentro de ' + escaparHtml(this._porId[this._atual].nome) + ')' : ''));
    if (!nome) return;
    const { error } = await sb.from('arq_pastas').insert({ pai_id: this._atual, nome });
    if (error) { popAviso('Nao consegui criar a pasta: ' + error.message); return; }
    if (this._atual) this._expandidas.add(this._atual);
    await this.carregarConteudo(); this.desenhar();
  },
  async renomear(tipo, id) {
    const obj = tipo === 'pasta' ? this._porId[id] : this.achar(id); if (!obj) return;
    const nome = await this.pedirNome('Renomear ' + (tipo === 'pasta' ? 'pasta' : 'arquivo'), obj.nome, 'Novo nome');
    if (!nome || nome === obj.nome) return;
    const { data, error } = await sb.from(tipo === 'pasta' ? 'arq_pastas' : 'arq_arquivos').update({ nome }).eq('id', id).select('id');
    if (error || !data || !data.length) { popAviso('Nao consegui renomear' + (error ? ': ' + error.message : ' (abra a pasta antes, se ela for trancada).')); return; }
    await this.carregarConteudo(); this.desenhar();
  },
  async apagar(tipo, id) {
    const obj = tipo === 'pasta' ? this._porId[id] : this.achar(id); if (!obj) return;
    const msg = tipo === 'pasta'
      ? 'Apagar a pasta "' + obj.nome + '" e tudo que esta dentro dela?\n\nEla vai para a Lixeira: a gestao consegue restaurar.'
      : 'Apagar o arquivo "' + obj.nome + '"?\n\nEle vai para a Lixeira: a gestao consegue restaurar.';
    if (!await popConfirmar(msg, { titulo: 'Apagar', ok: 'Apagar' })) return;
    const { data, error } = await sb.from(tipo === 'pasta' ? 'arq_pastas' : 'arq_arquivos').update(tipo === 'pasta' ? { apagada_em: new Date().toISOString() } : { apagado_em: new Date().toISOString() }).eq('id', id).select('id');
    if (error || !data || !data.length) { popAviso('Nao consegui apagar' + (error ? ': ' + error.message : ' (abra a pasta antes, se ela for trancada).')); return; }
    if (tipo === 'pasta' && this.caminho(this._atual).some(p => p.id === id)) return this.irPara(obj.pai_id || null);
    await this.carregarConteudo(); this.desenhar();
  },

  // ─────────────── ENVIAR ───────────────
  ligarSoltar(el) {
    if (!this.pode('editar') || el._arqSoltar) return;   // #pagina e o mesmo em todas as abas: liga uma vez so
    el._arqSoltar = true;
    let n = 0;
    const alvo = e => e.target.closest && e.target.closest('[data-soltar]');
    const temArq = e => e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files');
    el.addEventListener('dragenter', e => { if (!temArq(e) || !alvo(e)) return; e.preventDefault(); n++; alvo(e).classList.add('arq-soltando'); });
    el.addEventListener('dragover', e => { if (temArq(e) && alvo(e)) e.preventDefault(); });
    el.addEventListener('dragleave', e => { if (!alvo(e)) return; n = Math.max(0, n - 1); if (!n) document.querySelectorAll('.arq-soltando').forEach(x => x.classList.remove('arq-soltando')); });
    el.addEventListener('drop', e => {
      if (!temArq(e) || !alvo(e)) return;
      e.preventDefault(); n = 0; document.querySelectorAll('.arq-soltando').forEach(x => x.classList.remove('arq-soltando'));
      this.enviar(e.dataTransfer.files);
    });
  },
  limpo(nome) { return String(nome || 'arquivo').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^_+|_+$/g, '').slice(-80) || 'arquivo'; },
  async enviar(lista) {
    const arqs = Array.from(lista || []);
    if (!arqs.length || this._enviando) return;
    if (this._busca.trim()) { popAviso('Limpe a busca e abra a pasta onde o arquivo vai ficar.'); return; }
    const grandes = arqs.filter(f => f.size > this.LIMITE);
    const ok = arqs.filter(f => f.size <= this.LIMITE && f.size > 0);
    if (!ok.length) { popAviso(grandes.length ? 'Arquivo grande demais: o limite e 10 MB por arquivo.' : 'Arquivo vazio.'); return; }
    this._enviando = true;
    const bt = document.getElementById('arq-enviar'); const rot = bt ? bt.innerHTML : '';
    const pasta = this._atual;
    const nomes = new Set((this._arqs || []).map(a => a.nome.toLowerCase()));
    const falhas = [];
    try {
      for (let i = 0; i < ok.length; i++) {
        const f = ok[i];
        if (bt) bt.textContent = 'Enviando ' + (i + 1) + ' de ' + ok.length + '...';
        let nome = f.name; let k = 2;
        const ponto = nome.lastIndexOf('.'), base = ponto > 0 ? nome.slice(0, ponto) : nome, ext = ponto > 0 ? nome.slice(ponto) : '';
        while (nomes.has(nome.toLowerCase())) nome = base + ' (' + (k++) + ')' + ext;
        const caminho = (pasta || 'raiz') + '/' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7) + '-' + this.limpo(nome);
        const up = await sb.storage.from('arquivos').upload(caminho, f, { contentType: f.type || 'application/octet-stream', upsert: false });
        if (up.error) { falhas.push(f.name + ' (' + up.error.message + ')'); continue; }
        const { error } = await sb.from('arq_arquivos').insert({ pasta_id: pasta, nome, caminho, tipo: f.type || null, tamanho: f.size });
        if (error) { falhas.push(f.name + ' (' + error.message + ')'); try { await sb.storage.from('arquivos').remove([caminho]); } catch (e) {} continue; }
        nomes.add(nome.toLowerCase());
      }
    } finally {
      this._enviando = false;
      if (bt) bt.innerHTML = rot;
    }
    if (this._atual === pasta) { await this.carregarConteudo(); this.desenhar(); }
    const avisos = [];
    if (grandes.length) avisos.push('Ficou de fora por passar de 10 MB: ' + grandes.map(f => f.name).join(', ') + '.');
    if (falhas.length) avisos.push('Nao consegui enviar: ' + falhas.join('; ') + '.');
    if (avisos.length) popAviso(avisos.join('\n\n'));
  },

  // ─────────────── TRANCAR ───────────────
  trancar(id) {
    const p = this._porId[id]; if (!p) return;
    const sel = { restrita: !!p.restrita, perfis: new Set(p.perfis || []), equipes: new Set(p.equipes || []), pessoas: new Set(p.pessoas || []), senha: p.tem_senha ? 'manter' : 'nao' };
    this._tr = { p, sel };
    abrirModal((p.restrita || p.tem_senha ? 'Cadeado da pasta' : 'Trancar pasta'), '<div id="arq-tr"></div>');
    this.desenharTrancar();
  },
  desenharTrancar() {
    const T = this._tr, alvo = document.getElementById('arq-tr'); if (!T || !alvo) return;
    const s = T.sel;
    const chip = (grupo, v, rot) => '<button type="button" class="rmc-chip' + (s[grupo].has(v) ? ' ativo' : '') + '" onclick="MODULOS.arquivos.trMarcar(\'' + grupo + '\', \'' + v + '\')">' + escaparHtml(rot) + '</button>';
    const sugest = (this._buscaPes || '').trim() ? this._pessoas.filter(x => !s.pessoas.has(x.id) && this.semAcento(x.nome).includes(this.semAcento(this._buscaPes))).slice(0, 6) : [];
    alvo.innerHTML =
      '<p class="sub" style="margin-top:0">Pasta <b>' + escaparHtml(T.p.nome) + '</b>. As subpastas seguem a mesma regra.</p>' +
      '<div class="arq-tr-sec"><small>Quem pode abrir</small><div class="toggle-visao arq-tr-modo">' +
      '<button type="button" class="' + (!s.restrita ? 'ativo' : '') + '" onclick="MODULOS.arquivos.trModo(false)">Todos</button>' +
      '<button type="button" class="' + (s.restrita ? 'ativo' : '') + '" onclick="MODULOS.arquivos.trModo(true)">So quem eu escolher</button></div></div>' +
      (s.restrita ?
        '<div class="arq-tr-sec"><small>Perfis</small><div class="rmc-chips arq-chips">' + this.PERFIS.map(([v, r]) => chip('perfis', v, r)).join('') + '</div></div>' +
        (this._coords.length ? '<div class="arq-tr-sec"><small>Equipes</small><div class="rmc-chips arq-chips">' + this._coords.map(c => chip('equipes', c.id, 'Equipe ' + c.nome.split(' ')[0])).join('') + '</div></div>' : '') +
        '<div class="arq-tr-sec"><small>Pessoas</small><div class="arq-pessoas">' +
        Array.from(s.pessoas).map(pid => '<span class="arq-pes">' + escaparHtml(String(this._nomes[pid] || '?').split(' ').slice(0, 2).join(' ')) + ' <b onclick="MODULOS.arquivos.trMarcar(\'pessoas\', \'' + pid + '\')">&times;</b></span>').join('') +
        '<input id="arq-tr-pes" placeholder="+ adicionar pessoa" autocomplete="off" value="' + escaparHtml(this._buscaPes || '').replace(/"/g, '&quot;') + '" oninput="MODULOS.arquivos._buscaPes = this.value; MODULOS.arquivos.desenharTrancar(); setTimeout(() => { const i = document.getElementById(\'arq-tr-pes\'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 0)"></div>' +
        (sugest.length ? '<div class="arq-sugest">' + sugest.map(x => '<button type="button" onclick="MODULOS.arquivos._buscaPes=\'\'; MODULOS.arquivos.trMarcar(\'pessoas\', \'' + x.id + '\')">' + escaparHtml(x.nome) + '</button>').join('') + '</div>' : '') + '</div>'
        : '') +
      '<div class="arq-tr-sec arq-tr-senha">' +
      (T.p.tem_senha
        ? '<div><b>Esta pasta pede senha</b><small>A senha vale para todos, inclusive a direcao.</small></div>' +
          '<div class="toggle-visao arq-tr-senha-modo"><button type="button" class="' + (s.senha === 'manter' ? 'ativo' : '') + '" onclick="MODULOS.arquivos.trSenha(\'manter\')">Manter</button>' +
          '<button type="button" class="' + (s.senha === 'definir' ? 'ativo' : '') + '" onclick="MODULOS.arquivos.trSenha(\'definir\')">Trocar</button>' +
          '<button type="button" class="' + (s.senha === 'tirar' ? 'ativo' : '') + '" onclick="MODULOS.arquivos.trSenha(\'tirar\')">Tirar</button></div>'
        : '<label class="arq-sw"><input type="checkbox"' + (s.senha === 'definir' ? ' checked' : '') + ' onchange="MODULOS.arquivos.trSenha(this.checked ? \'definir\' : \'nao\')"><i></i></label>' +
          '<div><b>Pedir senha para abrir</b><small>Pede toda vez que alguem entrar na pasta, inclusive a direcao.</small></div>') +
      (s.senha === 'definir' ? '<input type="password" id="arq-tr-senha" class="arq-senha" placeholder="Senha (pelo menos 4 caracteres)" autocomplete="new-password">' : '') +
      '</div>' +
      (s.restrita ? '<p class="sub" style="font-size:12px">Direcao e suporte sempre entram (para nada ficar perdido). A senha, se tiver, vale para todos.</p>' : '') +
      '<div id="arq-tr-erro" class="mensagem-erro"></div>' +
      '<div class="barra-acoes"><button type="button" class="btn btn-fantasma" onclick="fecharModal()">Cancelar</button><button type="button" class="btn btn-primario" id="arq-tr-ok" onclick="MODULOS.arquivos.salvarTrancar()">Salvar</button></div>';
  },
  trModo(v) { this._tr.sel.restrita = v; this.desenharTrancar(); },
  trMarcar(grupo, v) { const s = this._tr.sel[grupo]; if (s.has(v)) s.delete(v); else s.add(v); this.desenharTrancar(); },
  trSenha(v) {
    const inp = document.getElementById('arq-tr-senha'); const guardada = inp ? inp.value : '';
    this._tr.sel.senha = v; this.desenharTrancar();
    const novo = document.getElementById('arq-tr-senha'); if (novo) { novo.value = guardada; novo.focus(); }
  },
  async salvarTrancar() {
    const T = this._tr; if (!T) return;
    const s = T.sel, erro = document.getElementById('arq-tr-erro');
    const mostrar = m => { erro.textContent = m; erro.classList.add('visivel'); };
    const senha = (document.getElementById('arq-tr-senha') || {}).value || '';
    if (s.restrita && !s.perfis.size && !s.equipes.size && !s.pessoas.size) { mostrar('Escolha pelo menos um perfil, equipe ou pessoa (ou marque Todos).'); return; }
    if (s.senha === 'definir' && senha.length < 4) { mostrar('A senha precisa de pelo menos 4 caracteres.'); return; }
    const eu = window.CORTEX_SESSAO.user.id;
    if (s.restrita && !this.livre() && !(s.perfis.has(this.perfil()) || s.pessoas.has(eu) || Array.from(s.equipes).some(t => this._meusTimes.has(t)))) {
      if (!await popConfirmar('Do jeito que esta, voce mesma nao vai conseguir abrir esta pasta depois. Salvar assim?', { titulo: 'Atencao', ok: 'Salvar assim' })) return;
    }
    const bt = document.getElementById('arq-tr-ok'); bt.disabled = true; bt.textContent = 'Salvando...';
    const { data: r, error } = await sb.rpc('fn_arq_trancar', {
      p_pasta: T.p.id, p_restrita: s.restrita, p_perfis: Array.from(s.perfis), p_equipes: Array.from(s.equipes), p_pessoas: Array.from(s.pessoas),
      p_senha_acao: s.senha === 'definir' ? 'definir' : s.senha === 'tirar' ? 'tirar' : 'manter', p_senha: s.senha === 'definir' ? senha : null
    });
    bt.disabled = false; bt.textContent = 'Salvar';
    if (error || (r && r.erro)) { mostrar('Nao consegui salvar: ' + (error ? error.message : r.erro)); return; }
    if (s.senha === 'definir' && !this._abertas.includes(T.p.id) && this.caminho(this._atual).some(p => p.id === T.p.id)) this._abertas.push(T.p.id);
    if (s.senha === 'tirar') this._abertas = this._abertas.filter(x => x !== T.p.id);
    fecharModal(); this._tr = null; this._buscaPes = '';
    await this.carregarConteudo(); this.desenhar();
  },

  // ─────────────── LIXEIRA ───────────────
  async lixeira() {
    abrirModal('Lixeira', '<div id="arq-lixo"><p class="sub">Carregando...</p></div>', true);
    await this.carregarPastas();
    const { data } = await sb.from('arq_arquivos').select('id, pasta_id, nome, caminho, tamanho, apagado_em, apagado_por').not('apagado_em', 'is', null).order('apagado_em', { ascending: false }).limit(200);
    this._lixoArqs = (data || []).filter(a => this.viva(a.pasta_id));
    this.desenharLixeira();
  },
  desenharLixeira() {
    const alvo = document.getElementById('arq-lixo'); if (!alvo) return;
    const pastas = this._pastas.filter(p => p.apagada_em && this.viva(p.pai_id)).sort((a, b) => String(b.apagada_em).localeCompare(String(a.apagada_em)));
    const arqs = this._lixoArqs || [];
    const quando = (d, q) => 'apagado em ' + new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) + (q && this._nomes[q] ? ' por ' + escaparHtml(this._nomes[q].split(' ').slice(0, 2).join(' ')) : '');
    const onde = id => { const c = this.caminho(id); return c.length ? c.map(p => escaparHtml(p.nome)).join(' / ') : 'Arquivos'; };
    const deVez = this.pode('apagar_de_vez');
    const linha = (tipo, o, ic) => '<div class="arq-lixo-l"><span class="arq-l-ic">' + ic + '</span><div><b>' + escaparHtml(o.nome) + '</b><small>' + onde(tipo === 'pasta' ? o.pai_id : o.pasta_id) + ' &middot; ' + quando(tipo === 'pasta' ? o.apagada_em : o.apagado_em, tipo === 'pasta' ? o.apagada_por : o.apagado_por) + '</small></div>' +
      '<span class="arq-lixo-ac"><button type="button" class="btn-chip" onclick="MODULOS.arquivos.restaurar(\'' + tipo + '\', \'' + o.id + '\')">Restaurar</button>' +
      (deVez ? '<button type="button" class="btn-chip btn-lixeira" title="Apagar de vez" onclick="MODULOS.arquivos.apagarDeVez(\'' + tipo + '\', \'' + o.id + '\')">' + this.IC.lixo + '</button>' : '') + '</span></div>';
    alvo.innerHTML = (!pastas.length && !arqs.length) ? '<div class="vazio"><strong>Lixeira vazia</strong>O que for apagado na aba Arquivos fica aqui para restaurar.</div>' :
      '<p class="sub" style="margin-top:0">Pasta apagada leva junto o que estava dentro; restaurar traz tudo de volta.' + (deVez ? ' Apagar de vez nao tem volta.' : ' Apagar de vez: so a direcao.') + '</p>' +
      pastas.map(p => linha('pasta', p, '<span class="arq-pasta-ic">' + this.IC.pastaCheia + '</span>')).join('') +
      arqs.map(a => { const t = this.tipoDe(a.nome); return linha('arquivo', a, '<span class="arq-tipo" style="--t:' + t[0] + '">' + t[1] + '</span>'); }).join('');
  },
  async restaurar(tipo, id) {
    const { data, error } = await sb.from(tipo === 'pasta' ? 'arq_pastas' : 'arq_arquivos').update(tipo === 'pasta' ? { apagada_em: null } : { apagado_em: null }).eq('id', id).select('id');
    if (error || !data || !data.length) { popAviso('Nao consegui restaurar' + (error ? ': ' + error.message : '.')); return; }
    await this.carregarPastas();
    this._lixoArqs = (this._lixoArqs || []).filter(a => a.id !== id);
    this.desenharLixeira();
    await this.carregarConteudo(); this.desenhar();
  },
  async apagarDeVez(tipo, id) {
    const o = tipo === 'pasta' ? this._porId[id] : (this._lixoArqs || []).find(a => a.id === id); if (!o) return;
    if (!await popConfirmar('Apagar de vez "' + o.nome + '"' + (tipo === 'pasta' ? ' e tudo que esta dentro' : '') + '?\n\nNao tem como recuperar depois.', { titulo: 'Apagar de vez', ok: 'Apagar de vez' })) return;
    const { data: caminhos, error } = await sb.rpc('fn_arq_apagar_de_vez', { p_tipo: tipo, p_id: id });
    if (error) { popAviso('Nao consegui apagar: ' + error.message); return; }
    if (caminhos && caminhos.length) { try { await sb.storage.from('arquivos').remove(caminhos); } catch (e) { /* o registro ja saiu */ } }
    await this.carregarPastas();
    this._lixoArqs = (this._lixoArqs || []).filter(a => a.id !== id);
    this.desenharLixeira();
  }
};
