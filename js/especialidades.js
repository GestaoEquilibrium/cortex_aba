// ============================================================================
// CORTEX aba - js/especialidades.js (patch 39)
// Especialidade de cada profissional: ABA, Fonoaudiologia, Terapia Ocupacional, Psicologia,
// Pedagogia e Psicomotricidade. Opcao B (Wess, 08/10/2026): cada profissional atende UMA
// especialidade e a sessao herda a de quem atende (sessoes.aplicador_id -> profiles.especialidade).
// Sem especialidade gravada = ABA (todo mundo que ja estava no sistema).
// ============================================================================

window.ESPEC = {
  // nome: tela | sigla: selo na agenda | doc: como sai nos documentos | plano: caixinha do Plano Terapeutico
  // conselho / exemplo: registro de classe | titulo: linha da assinatura
  LISTA: {
    aba:      { nome: 'ABA', longo: 'Terapia ABA', sigla: 'ABA', doc: 'Psicoterapia ABA', plano: 'Psicoterapia ABA', conselho: '', exemplo: 'Ex.: CRP 04/12345 (se houver)', titulo: 'Aplicador(a) / N&ordm; do Registro de Classe' },
    fono:     { nome: 'Fonoaudiologia', longo: 'Fonoaudiologia', sigla: 'FONO', doc: 'Fonoaudiologia', plano: 'Fonoaudiologia', conselho: 'CRFa', exemplo: 'Ex.: CRFa 6-12345', titulo: 'Fonoaudi&oacute;loga(o)' },
    to:       { nome: 'Terapia Ocupacional', longo: 'Terapia Ocupacional', sigla: 'TO', doc: 'Terapia Ocupacional', plano: 'Terapia Ocupacional', conselho: 'CREFITO', exemplo: 'Ex.: CREFITO-4 12345-TO', titulo: 'Terapeuta Ocupacional' },
    psico:    { nome: 'Psicologia', longo: 'Psicologia', sigla: 'PSICO', doc: 'Psicologia', plano: 'Psicoterapia Convencional', conselho: 'CRP', exemplo: 'Ex.: CRP 04/12345', titulo: 'Psic&oacute;loga(o)' },
    pedago:   { nome: 'Pedagogia', longo: 'Pedagogia', sigla: 'PED', doc: 'Pedagogia', plano: 'Psicopedagogia', conselho: '', exemplo: 'Registro (se houver)', titulo: 'Pedagoga(o)' },
    psicomot: { nome: 'Psicomotricidade', longo: 'Psicomotricidade', sigla: 'PSICOMOT', doc: 'Psicomotricidade', plano: 'Psicomotricidade', conselho: '', exemplo: 'Registro (se houver)', titulo: 'Psicomotricista' }
  },
  ORDEM: ['aba', 'fono', 'to', 'psico', 'pedago', 'psicomot'],

  _mapa: {},       // id do profissional -> chave da especialidade (so quem tem gravado)
  _registro: {},   // id -> registro de classe (para a assinatura dos documentos)
  colunaOk: false, // false = o SQL do patch 39 ainda nao rodou (tudo segue como ABA)

  // carrega uma vez no login; sem a coluna no banco, nada quebra (tudo e ABA)
  async carregar() {
    let r = await sb.from('profiles').select('id, especialidade, registro_classe').neq('perfil', 'familia');
    this.colunaOk = !r.error;
    if (r.error) r = await sb.from('profiles').select('id, registro_classe').neq('perfil', 'familia');
    this._mapa = {}; this._registro = {};
    (r.data || []).forEach(p => {
      if (this.colunaOk && p.especialidade && this.LISTA[p.especialidade]) this._mapa[p.id] = p.especialidade;
      if (p.registro_classe) this._registro[p.id] = p.registro_classe;
    });
  },
  definir(id, chave) { if (chave && chave !== 'aba') this._mapa[id] = chave; else delete this._mapa[id]; },

  de(profId) { return (profId && this._mapa[profId]) || 'aba'; },
  info(chave) { return this.LISTA[chave] || this.LISTA.aba; },
  ehAba(profId) { return this.de(profId) === 'aba'; },
  minha() { const s = window.CORTEX_SESSAO; return s ? this.de(s.user.id) : 'aba'; },
  registro(profId) { return this._registro[profId] || ''; },
  // especialidades presentes numa lista de profissionais (ids ou objetos com id), na ordem padrao
  usadas(lista) {
    const tem = new Set((lista || []).map(x => this.de(typeof x === 'string' ? x : x && x.id)));
    return this.ORDEM.filter(k => tem.has(k));
  },
  // ha mais de uma especialidade na equipe? (sem isso, selos e filtros ficam escondidos)
  variasNa(lista) { return this.usadas(lista).length > 1; },

  // rotulo do perfil na tela: fono, TO etc. aparecem pela especialidade (nao como "Terapeuta ABA")
  rotuloPerfil(perfil, id) {
    const k = this.de(id);
    if (k !== 'aba' && ['terapeuta', 'aplicador'].includes(perfil)) return this.info(k).nome;
    return (typeof ROTULOS_PERFIL !== 'undefined' && ROTULOS_PERFIL[perfil]) || perfil;
  },
  // texto de apoio do cadastro (opcao B: tudo o que a pessoa atende sai na especialidade dela)
  dicaCadastro(chave, nome) {
    const n = (nome || '').trim().split(/\s+/)[0] || 'a pessoa';
    return 'Tudo o que ' + escaparHtml(n) + ' atender sai como <b>' + this.info(chave).nome + '</b>: agenda, guia do convenio, avaliacoes e documentos.';
  },

  selo(chave, extra) {
    const i = this.info(chave);
    return '<span class="esp' + (extra ? ' ' + extra : '') + '" data-t="' + (this.LISTA[chave] ? chave : 'aba') + '" title="' + i.nome + '">' + i.sigla + '</span>';
  },
  seloDe(profId, extra) { return this.selo(this.de(profId), extra); },
  opcoes(sel) {
    return this.ORDEM.map(k => '<option value="' + k + '"' + (k === (sel || 'aba') ? ' selected' : '') + '>' + this.LISTA[k].nome + '</option>').join('');
  },

  // filtro "Terapia" da agenda (vale para todas as visoes; guardado no aparelho)
  filtro() { try { const v = localStorage.getItem('cortex_terapia') || ''; return this.LISTA[v] ? v : ''; } catch (e) { return ''; } },
  definirFiltro(v) { try { if (v) localStorage.setItem('cortex_terapia', v); else localStorage.removeItem('cortex_terapia'); } catch (e) {} }
};
