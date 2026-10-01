// ============================================================================
// CORTEX aba - js/modulos/eventos.js
// Supervisao e reunioes: agenda de eventos da equipe, ATA estruturada com
// documento na identidade Equilibrium, e o pop-up de avisos do dia (eventos
// de hoje/amanha + avaliacoes vencendo para a coordenacao).
// ============================================================================

window.MODULOS = window.MODULOS || {};

window.MODULOS.eventos = {

  el: null,
  lista: [],

  // criar/editar eventos: coordenacao/direcao (aplicador e terapeuta nunca, mesmo com E na matriz)
  podeE() { return perm('eventos.criar') === 'E' && !ehEquipe(); },
  // ATA (patch 31): coordenacao/direcao sempre; a aplicadora participante do evento tambem lavra
  // (evento "com ela" ou "equipe toda"). Fica registrado quem lavrou e o historico de quem mexeu.
  podeAta(e) {
    if (this.podeE()) return true;
    if (!ehEquipe() || !e) return false;
    const eu = window.CORTEX_SESSAO.user.id;
    return e.profissional_id === eu || !e.profissional_id;
  },
  podeDemanda() { return perm('eventos.demandas') === 'E'; },

  // ─────────────── Prazo da estrutura de pre-supervisao (patch 31) ───────────────
  // Regra de Wess: a estrutura tem que ser enviada ate UM DIA ANTES da supervisao.
  // Depois disso a aplicadora so le; a coordenacao pode liberar o envio fora do prazo.
  prazoPre(data) {
    if (!data) return '';
    const d = new Date(data + 'T12:00:00'); d.setDate(d.getDate() - 1);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  },
  preTravada(p, dataEvento) {
    const data = (p && p.data) || dataEvento;
    if (!data) return false;
    if (p && p.liberada) return false;
    return hojeLocal() > this.prazoPre(data);
  },
  fmtData(d) { return d ? d.split('-').reverse().join('/') : ''; },

  async render(el) {
    this.el = el;
    el.innerHTML =
      '<div class="pagina-cabecalho">' +
      '  <div><h2>Supervisao e reunioes</h2>' +
      '  <p class="sub">Agenda da equipe. Quem participa recebe o aviso ao abrir o sistema no dia e na vespera.</p></div>' +
      (this.podeE()
        ? '<button class="btn btn-primario" onclick="MODULOS.eventos.modalEvento()">+ Agendar</button>' : '') +
      '</div>' +
      '<div id="ev-lista"><div class="cartao"><p class="sub">Carregando...</p></div></div>' +
      '<div id="dem-lista"></div>';
    this.carregarDemandas();
    await this.carregar();
    this.desenhar();
  },

  async carregar() {
    const corte = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const [rE, rP, rPac, rPre] = await Promise.all([
      sb.from('eventos').select('*, profissional:profiles!eventos_profissional_id_fkey(nome), paciente:pacientes!eventos_paciente_id_fkey(id, nome)')
        .gte('data', corte).order('data').order('hora'),
      sb.from('profiles').select('id, nome, perfil, coordenador_id').eq('ativo', true).neq('perfil', 'familia').order('nome'),
      sb.from('pacientes').select('id, nome, data_nascimento, aplicador_id').neq('status', 'encerrado').order('nome'),
      sb.from('pre_supervisoes').select('id, evento_id, paciente_id, aplicador_id, data, status, enviada_em, editada_em, liberada, aplicador:profiles!pre_supervisoes_aplicador_id_fkey(nome), paciente:pacientes!pre_supervisoes_paciente_id_fkey(nome)')
        .gte('data', corte).order('data', { ascending: false })
    ]);
    this.lista = await ESCOPO.apls(rE.data || [], 'profissional_id', true);
    this.equipe = rP.data || [];
    this.perfis = {}; this.equipe.forEach(p => { this.perfis[p.id] = p; });
    this.pacientes = rPac.data || [];
    this.pres = rPre.error ? [] : (rPre.data || []);
    if (rPre.error) console.warn('pre_supervisoes:', rPre.error.message);
    if (ehEquipe()) { const meus = await meusPacientesIds(true); this.pacientes = this.pacientes.filter(p => meus.has(p.id)); this.pres = this.pres.filter(x => x.aplicador_id === window.CORTEX_SESSAO.user.id); }
    // coordenadora: por padrao so as estruturas das aplicadoras da equipe dela ("Minha equipe"); em "Geral" ve todas
    else this.pres = await ESCOPO.apls(this.pres, 'aplicador_id');
  },
  // coordenadora responsavel (principal) por uma aplicadora
  coordDe(aplicadorId) { const p = this.perfis && this.perfis[aplicadorId]; return p ? p.coordenador_id : null; },
  nomeCurto(id) { const p = this.perfis && this.perfis[id]; if (!p) return ''; const w = p.nome.split(' '); return w.slice(0, /^(de|da|do|das|dos)$/i.test(w[1] || '') ? 3 : 2).join(' '); },

  desenhar() {
    const alvo = document.getElementById('ev-lista');
    const hoje = hojeLocal();
    const fut = this.lista.filter(e => e.data >= hoje);
    const pas = this.lista.filter(e => e.data < hoje).reverse();

    const linha = e =>
      '<div class="linha-doc"><div><b>' +
      (e.tipo === 'supervisao' ? '&#128204; Supervisao' : e.tipo === 'reuniao_pais' ? '&#128106; Reuniao com pais' : '&#128101; Reuniao') +
      ' &middot; ' + escaparHtml(e.titulo) + '</b>' +
      '<small>' + e.data.split('-').reverse().join('/') + (e.hora ? ' as ' + e.hora.slice(0, 5) : '') +
      ' &middot; ' + (e.profissional ? escaparHtml(e.profissional.nome) : 'Equipe toda') +
      (e.paciente ? ' &middot; ' + escaparHtml(e.paciente.nome.split(' ').slice(0, 2).join(' ')) : '') +
      (e.ata ? ' &middot; ATA lavrada por ' + escaparHtml((e.ata.lavrada_por || '').split(' ').slice(0, 2).join(' ')) : '') + '</small></div>' +
      '<div class="pac-selos">' +
      this.chipPre(e) +
      (e.ata ? '<button class="btn-chip cheio" onclick="MODULOS.eventos.docAta(\'' + e.id + '\')">Ver ATA</button>' : '') +
      (this.podeAta(e)
        ? '<button class="btn-chip" onclick="MODULOS.eventos.modalAta(\'' + e.id + '\')">' + (e.ata ? 'Editar ATA' : 'Lavrar ATA') + '</button>' : '') +
      (this.podeE()
        ? '<button class="btn-chip" onclick="MODULOS.eventos.modalEvento(\'' + e.id + '\')">Editar</button>'
        : '') +
      '</div></div>';

    alvo.innerHTML =
      this.htmlPres() +
      '<div class="cartao"><h3>Proximos <span class="selo selo-neutro">' + fut.length + '</span></h3>' +
      (fut.length ? fut.map(linha).join('') : '<p class="sub">Nada agendado. Use + Agendar.</p>') + '</div>' +
      (pas.length
        ? '<div class="cartao"><h3>Ultimos 30 dias</h3>' + pas.map(linha).join('') + '</div>' : '');
  },

  // ─────────────── Pre-supervisao: a aplicadora preenche antes; a coordenacao le na supervisao ───────────────
  PRE_CAMPOS: [
    ['programas', '4) Programas atuais (se houver)', 3],
    ['evolucao', '5) Evolucao observada entre as supervisoes', 4],
    ['comportamentos', '6) Comportamentos interferentes e estrategias de manejo (se houver)', 4],
    ['dificuldades', '7) Dificuldades enfrentadas pelo aplicador (se houver)', 5]
  ],
  preDe(evento) { return (this.pres || []).find(p => p.evento_id === evento.id); },
  chipPre(e) {
    if (e.tipo !== 'supervisao') return '';
    const p = this.preDe(e);
    const eu = window.CORTEX_SESSAO.user.id;
    const minha = e.profissional_id === eu || (!e.profissional_id && ehEquipe());
    const travada = this.preTravada(p, e.data);
    if (p && p.status === 'enviada') return '<button class="btn-chip cheio" title="Estrutura de pre-supervisao enviada por ' + escaparHtml(p.aplicador ? p.aplicador.nome : '') + '" onclick="MODULOS.eventos.docPre(\'' + p.id + '\')">&#128203; Pre-supervisao</button>';
    if (minha && travada) return '<span class="selo selo-bad" title="O prazo de envio (um dia antes da supervisao) terminou. Peca a coordenacao para liberar.">prazo encerrado ' + this.fmtData(this.prazoPre(e.data)) + '</span>' +
      (p ? '<button class="btn-chip" onclick="MODULOS.eventos.docPre(\'' + p.id + '\')">Ver rascunho</button>' : '');
    if (minha) return '<button class="btn-chip" style="border-color:var(--st-warn); color:#92400E" title="Envie ate ' + this.fmtData(this.prazoPre(e.data)) + '" onclick="MODULOS.eventos.modalPre(\'' + (p ? p.id : '') + '\', \'' + e.id + '\')">' + (p ? '&#9998; Continuar pre-supervisao' : '&#9998; Preencher pre-supervisao') + '</button>';
    return '<span class="selo ' + (travada ? 'selo-bad' : 'selo-warn') + '" title="A aplicadora ainda nao enviou a estrutura de pre-supervisao (prazo: ' + this.fmtData(this.prazoPre(e.data)) + ')">pre-supervisao ' + (travada ? 'atrasada' : 'pendente') + '</span>' +
      (travada && this.podeE() && p ? '<button class="btn-chip" onclick="MODULOS.eventos.liberarPre(\'' + p.id + '\')">Liberar envio</button>' : '');
  },
  // selo de situacao de uma estrutura (prazo = um dia antes da supervisao)
  seloPre(p) {
    const prazo = this.prazoPre(p.data);
    if (p.status === 'enviada') return '<span class="selo selo-ok" title="enviada em ' + (p.enviada_em ? new Date(p.enviada_em).toLocaleString('pt-BR') : '') + '">enviada</span>' +
      (p.liberada ? '<span class="selo selo-info" title="A coordenacao liberou a edicao fora do prazo">liberada</span>' : '');
    if (p.liberada) return '<span class="selo selo-info" title="A coordenacao liberou o envio fora do prazo">rascunho &middot; liberada</span>';
    if (hojeLocal() > prazo) return '<span class="selo selo-bad" title="Prazo de envio era ' + this.fmtData(prazo) + '">atrasada</span>';
    return '<span class="selo selo-warn" title="Envie ate ' + this.fmtData(prazo) + '">rascunho &middot; ate ' + this.fmtData(prazo).slice(0, 5) + '</span>';
  },
  htmlPres() {
    const lista = (this.pres || []);
    const fmt = d => this.fmtData(d);
    if (ehEquipe()) {
      return '<div class="cartao faixa-ambar"><h3>Minhas pre-supervisoes ' +
        '<button class="btn-chip" style="margin-left:8px" onclick="MODULOS.eventos.modalPre(\'\', \'\')">+ Nova estrutura</button></h3>' +
        '<p class="sub" style="margin-bottom:6px">Preencha a Estrutura de supervisao e envie <b>ate um dia antes</b> da supervisao. Depois do prazo ela trava; so a coordenacao libera.</p>' +
        (lista.length ? lista.map(p => {
          const travada = this.preTravada(p);
          return '<div class="linha-doc"><div><b>' + escaparHtml(p.paciente ? p.paciente.nome : '?') + '</b><small>supervisao ' + fmt(p.data) + ' &middot; prazo ' + fmt(this.prazoPre(p.data)) +
            (p.enviada_em ? ' &middot; enviada em ' + new Date(p.enviada_em).toLocaleDateString('pt-BR') : '') + '</small></div><div class="pac-selos">' +
            this.seloPre(p) +
            (p.status === 'enviada' || travada ? '<button class="btn-chip" onclick="MODULOS.eventos.docPre(\'' + p.id + '\')">Ver</button>' : '') +
            (!travada ? '<button class="btn-chip" onclick="MODULOS.eventos.modalPre(\'' + p.id + '\', \'' + (p.evento_id || '') + '\')">&#9998; ' + (p.status === 'enviada' ? 'Editar' : 'Continuar') + '</button>' : '') +
            '</div></div>';
        }).join('') : '<p class="sub">Nenhuma estrutura preenchida ainda.</p>') + '</div>';
    }
    if (!lista.length) return '';
    const enviadas = lista.filter(p => p.status === 'enviada');
    const linha = p => '<div class="linha-doc"><div><b>' + escaparHtml(p.paciente ? p.paciente.nome : '?') + '</b><small>supervisao ' + fmt(p.data) + ' &middot; ' + escaparHtml(p.aplicador ? p.aplicador.nome : '') +
      (p.enviada_em ? ' &middot; enviada em ' + new Date(p.enviada_em).toLocaleString('pt-BR').slice(0, 16) : '') +
      (p.editada_em && p.enviada_em && p.editada_em > p.enviada_em ? ' &middot; editada depois' : '') + '</small></div>' +
      '<div class="pac-selos">' + this.seloPre(p) +
      (p.status === 'enviada' ? '<button class="btn-chip cheio" onclick="MODULOS.eventos.docPre(\'' + p.id + '\')">Ver</button>' : '<button class="btn-chip" onclick="MODULOS.eventos.docPre(\'' + p.id + '\')">Ver rascunho</button>') +
      (this.podeE() && this.preTravada(p) ? '<button class="btn-chip" title="Deixa a aplicadora enviar ou editar mesmo depois do prazo" onclick="MODULOS.eventos.liberarPre(\'' + p.id + '\')">Liberar</button>' : '') +
      '</div></div>';
    // "Minha equipe": lista simples. "Geral"/direcao/suporte: separada por coordenadora responsavel (item 4)
    let corpo;
    if (ESCOPO.ativo()) corpo = lista.map(linha).join('');
    else {
      const grupos = {};
      lista.forEach(p => { const c = this.coordDe(p.aplicador_id) || 'sem'; (grupos[c] = grupos[c] || []).push(p); });
      const ordem = Object.keys(grupos).sort((a, b) => (a === 'sem') - (b === 'sem') || this.nomeCurto(a).localeCompare(this.nomeCurto(b)));
      corpo = ordem.map(c => '<h4 style="margin:10px 0 4px; font-size:12.5px">' + (c === 'sem' ? 'Sem coordenadora responsavel' : 'Equipe ' + escaparHtml(this.nomeCurto(c))) +
        ' <span class="selo selo-neutro">' + grupos[c].length + '</span></h4>' + grupos[c].map(linha).join('')).join('');
    }
    return '<div class="cartao faixa-ambar"><h3>Pre-supervisoes recebidas <span class="selo selo-neutro">' + enviadas.length + '</span>' +
      (ESCOPO.ehCoord() ? '<span class="sub" style="font-weight:500; margin-left:8px">' + (ESCOPO.ativo() ? 'minha equipe' : 'todas as equipes') + '</span>' : '') + '</h3>' +
      '<p class="sub" style="margin-bottom:6px">Estruturas preenchidas pelas aplicadoras antes da supervisao (ultimos 30 dias). O prazo de envio e um dia antes da supervisao.</p>' +
      corpo + '</div>';
  },
  // Coordenacao libera o envio/edicao de uma estrutura fora do prazo
  async liberarPre(id) {
    if (!this.podeE()) return;
    if (!await popConfirmar('Liberar o envio desta estrutura fora do prazo? A aplicadora volta a poder preencher e enviar.')) return;
    const { error } = await sb.from('pre_supervisoes').update({ liberada: true, liberada_por: window.CORTEX_SESSAO.user.id, liberada_em: new Date().toISOString() }).eq('id', id);
    if (error) { popAviso('Nao foi possivel liberar: ' + error.message); return; }
    const p = (this.pres || []).find(x => x.id === id);
    if (p) { try { await sb.from('notificacoes').insert({ destinatario_id: p.aplicador_id, titulo: 'Estrutura de supervisao liberada',
      corpo: 'A coordenacao liberou o envio da estrutura de ' + (p.paciente ? p.paciente.nome.split(' ')[0] : 'uma crianca') + ' (supervisao ' + this.fmtData(p.data) + ').' }); } catch (e) { /* opcional */ } }
    await this.carregar(); this.desenhar();
  },
  idadeCurta(dn, ref) {
    if (!dn) return '';
    const a = new Date(dn + 'T12:00:00'), b = ref ? new Date(ref + 'T12:00:00') : new Date();
    let m = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()); if (b.getDate() < a.getDate()) m--;
    return Math.floor(m / 12) + ' anos e ' + (m % 12) + ' meses';
  },
  async programasAtuais(pacienteId) {
    const { data } = await sb.from('paciente_programas').select('programas(nome, area)').eq('paciente_id', pacienteId).eq('status', 'em_intervencao');
    return (data || []).map(x => x.programas ? x.programas.nome + (x.programas.area ? ' (' + x.programas.area + ')' : '') : '').filter(Boolean).join('\n');
  },
  async modalPre(id, eventoId) {
    let p = null;
    if (id) { const r = await sb.from('pre_supervisoes').select('*').eq('id', id).single(); p = r.data; }
    const ev = eventoId ? this.lista.find(x => x.id === eventoId) : null;
    const pacId = (p && p.paciente_id) || (ev && ev.paciente_id) || '';
    // estrutura avulsa (sem evento): sugere a proxima supervisao agendada para mim; senao, amanha (prazo = hoje)
    let data = (p && p.data) || (ev && ev.data);
    if (!data) {
      const eu = window.CORTEX_SESSAO.user.id, hoje = hojeLocal();
      const prox = (this.lista || []).find(x => x.tipo === 'supervisao' && x.data > hoje && (!x.profissional_id || x.profissional_id === eu));
      if (prox) data = prox.data;
      else { const d = new Date(hoje + 'T12:00:00'); d.setDate(d.getDate() + 1); data = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
    }
    const pacs = this.pacientes || [];
    const pac = pacs.find(x => x.id === pacId);
    const v = k => escaparHtml((p && p[k]) || '');
    // prazo: um dia antes da supervisao. Depois disso so leitura (a menos que a coordenacao tenha liberado)
    const travada = ehEquipe() && this.preTravada(p, data);
    if (travada) { if (p) { this.docPre(p.id); } else popAviso('O prazo para enviar a estrutura desta supervisao terminou em ' + this.fmtData(this.prazoPre(data)) + ' (um dia antes). Peca a coordenacao para liberar o envio.'); return; }
    const prazo = this.prazoPre(data);
    const faixaPrazo = '<div class="caixa-info" style="margin-bottom:10px; border-left:4px solid ' + (p && p.liberada ? 'var(--eq-azul, #1468B2)' : 'var(--st-warn)') + '"><small>Prazo de envio</small><b>' +
      (p && p.liberada ? 'Liberada pela coordenacao fora do prazo' : 'ate ' + this.fmtData(prazo) + ' (um dia antes da supervisao)') + '</b>' +
      (p && p.enviada_em ? '<small class="sub">Enviada em ' + new Date(p.enviada_em).toLocaleString('pt-BR').slice(0, 16) + ' &middot; a data de envio nao muda ao editar</small>' : '') + '</div>';
    abrirModal('Estrutura de supervis&atilde;o' + (ev ? ' &middot; ' + escaparHtml(ev.titulo) : ''),
      faixaPrazo +
      '<div class="grade-form">' +
      '  <div class="campo"><label>1) Data da supervisao</label><input type="date" id="ps-data" value="' + data + '"' + (ev ? ' readonly title="Data do evento agendado pela coordenacao"' : ' onchange="MODULOS.eventos.preTrocouData()"') + '></div>' +
      '  <div class="campo c2"><label>2) Nome do aprendiz *</label><select id="ps-pac" onchange="MODULOS.eventos.preTrocouPaciente()">' +
      '    <option value="">Selecione</option>' + pacs.map(x => '<option value="' + x.id + '"' + (x.id === pacId ? ' selected' : '') + '>' + escaparHtml(x.nome) + '</option>').join('') + '</select></div>' +
      '  <div class="campo"><label>3) Idade</label><input id="ps-idade" readonly value="' + (pac ? this.idadeCurta(pac.data_nascimento, data) : '') + '"></div>' +
      this.PRE_CAMPOS.map(([k, rot, linhas]) => '  <div class="campo c2"><label>' + rot + (k === 'programas' ? ' <button type="button" class="btn-chip" style="margin-left:6px" onclick="MODULOS.eventos.prePuxarProgramas()">&#8635; puxar do sistema</button>' : '') + '</label>' +
        '<textarea id="ps-' + k + '" rows="' + linhas + '" style="resize:vertical">' + v(k) + '</textarea></div>').join('') +
      '</div>' +
      '<input type="hidden" id="ps-id" value="' + (p ? p.id : '') + '"><input type="hidden" id="ps-ev" value="' + (eventoId || (p && p.evento_id) || '') + '">' +
      '<div class="mensagem-erro" id="ps-erro"></div>' +
      '<div class="barra-acoes">' +
      '  <button class="btn btn-fantasma" onclick="fecharModal()">Fechar</button>' +
      '  <button class="btn btn-fantasma" onclick="MODULOS.eventos.salvarPre(false)">Salvar rascunho</button>' +
      '  <button class="btn btn-primario" onclick="MODULOS.eventos.salvarPre(true)">Enviar para a coordenacao</button>' +
      '</div>', true, 'evolucao');
    if (!p && pacId) this.prePuxarProgramas();
  },
  preTrocouPaciente() {
    const pac = (this.pacientes || []).find(x => x.id === document.getElementById('ps-pac').value);
    document.getElementById('ps-idade').value = pac ? this.idadeCurta(pac.data_nascimento, document.getElementById('ps-data').value) : '';
    if (pac && !document.getElementById('ps-programas').value.trim()) this.prePuxarProgramas();
  },
  preTrocouData() {
    const data = document.getElementById('ps-data').value;
    if (data && ehEquipe() && hojeLocal() > this.prazoPre(data)) {
      popAviso('Para a supervisao de ' + this.fmtData(data) + ' o prazo de envio (' + this.fmtData(this.prazoPre(data)) + ') ja passou. Escolha outra data ou peca a coordenacao para liberar.');
    }
    this.preTrocouPaciente();
  },
  async prePuxarProgramas() {
    const pacId = document.getElementById('ps-pac').value; if (!pacId) return;
    const t = await this.programasAtuais(pacId);
    const el = document.getElementById('ps-programas');
    if (el) el.value = t || 'Nenhum programa em intervencao no sistema.';
  },
  async salvarPre(enviar) {
    const erro = document.getElementById('ps-erro'); erro.classList.remove('visivel');
    const id = document.getElementById('ps-id').value;
    const dados = { paciente_id: document.getElementById('ps-pac').value || null, data: document.getElementById('ps-data').value,
      evento_id: document.getElementById('ps-ev').value || null, idade: document.getElementById('ps-idade').value || null };
    this.PRE_CAMPOS.forEach(([k]) => { dados[k] = document.getElementById('ps-' + k).value.trim() || null; });
    if (!dados.paciente_id || !dados.data) { erro.textContent = 'Escolha o aprendiz e a data.'; erro.classList.add('visivel'); return; }
    if (enviar && !dados.evolucao) { erro.textContent = 'Preencha ao menos a evolucao observada antes de enviar.'; erro.classList.add('visivel'); return; }
    const anterior = id ? (this.pres || []).find(x => x.id === id) : null;
    if (ehEquipe() && !(anterior && anterior.liberada) && hojeLocal() > this.prazoPre(dados.data)) {
      erro.textContent = 'Prazo encerrado: a estrutura deve ser enviada ate ' + this.fmtData(this.prazoPre(dados.data)) + ' (um dia antes da supervisao). Peca a coordenacao para liberar.';
      erro.classList.add('visivel'); return;
    }
    // ja enviada antes: continua "enviada" e a data de envio original nao muda (so editada_em, pelo banco)
    const jaEnviada = !!(anterior && anterior.status === 'enviada');
    dados.status = enviar || jaEnviada ? 'enviada' : 'rascunho';
    if (enviar && !(anterior && anterior.enviada_em)) dados.enviada_em = new Date().toISOString();
    let r;
    if (id) r = await sb.from('pre_supervisoes').update(dados).eq('id', id);
    else r = await sb.from('pre_supervisoes').insert(Object.assign({ aplicador_id: window.CORTEX_SESSAO.user.id }, dados));
    if (r.error) { erro.textContent = r.error.message; erro.classList.add('visivel'); return; }
    fecharModal();
    if (enviar && !jaEnviada) {
      popAviso('Estrutura enviada. A coordenacao ja consegue ver na supervisao.');
      try {
        const coords = await this.coordsResponsaveis();
        const pac = (this.pacientes || []).find(x => x.id === dados.paciente_id);
        if (coords.length) await sb.from('notificacoes').insert(coords.map(c => ({ destinatario_id: c, titulo: 'Pre-supervisao recebida',
          corpo: window.CORTEX_SESSAO.profile.nome.split(' ')[0] + ' enviou a estrutura de supervisao de ' + (pac ? pac.nome.split(' ')[0] : 'uma crianca') + ' (' + dados.data.split('-').reverse().join('/') + ').' })));
      } catch (e) { /* aviso e opcional */ }
    } else if (jaEnviada) popAviso('Estrutura atualizada. A data de envio original foi mantida.');
    await this.carregar(); this.desenhar();
  },
  // Quem recebe os avisos da aplicadora: a(s) coordenadora(s) responsavel(is) por ela + direcao (nao mais todas as coordenadoras)
  async coordsResponsaveis() {
    const eu = window.CORTEX_SESSAO.user.id;
    const ids = new Set();
    let minha = null;
    try { const { data } = await sb.from('profiles').select('coordenador_id').eq('id', eu).single(); minha = data ? data.coordenador_id : null; } catch (e) { /* sem leitura */ }
    if (minha) ids.add(minha);
    try { const { data } = await sb.from('equipe_membros').select('coordenador_id').eq('aplicador_id', eu); (data || []).forEach(x => ids.add(x.coordenador_id)); } catch (e) { /* sem leitura */ }
    try { const { data } = await sb.from('profiles').select('id, perfil').eq('ativo', true).in('perfil', ['direcao', 'coordenador']);
      (data || []).forEach(p => { if (p.perfil === 'direcao') ids.add(p.id); });
      if (!minha && ids.size === 0) (data || []).forEach(p => ids.add(p.id));   // sem coordenadora definida: avisa todas
    } catch (e) { /* sem leitura */ }
    ids.delete(eu);
    return [...ids];
  },
  async docPre(id) {
    const { data: p } = await sb.from('pre_supervisoes').select('*, aplicador:profiles!pre_supervisoes_aplicador_id_fkey(nome), paciente:pacientes!pre_supervisoes_paciente_id_fkey(nome, data_nascimento)').eq('id', id).single();
    if (!p) return;
    const txt = t => t ? escaparHtml(t).replace(/\n/g, '<br>') : '<span style="color:#94A3B8">&mdash;</span>';
    const bloco = (rot, t) => '<h2 style="margin-top:12px"><span class="ponto deq-azul"></span>' + rot + '</h2><div class="deq-caixa deq-texto">' + txt(t) + '</div>';
    document.getElementById('doc-eq-overlay')?.remove();
    const ov = document.createElement('div');
    ov.id = 'doc-eq-overlay'; ov.className = 'folha-overlay';
    ov.innerHTML = '<div class="folha-pagina" style="max-width:860px">' +
      '<div class="pagina-cabecalho nao-imprime">' +
      '  <div><button class="btn-voltar" onclick="document.getElementById(\'doc-eq-overlay\').remove()">&larr; Fechar</button><h2>Estrutura de supervis&atilde;o</h2>' +
      '  <p class="sub">' + (p.status === 'enviada' ? 'Enviada em ' + (p.enviada_em ? new Date(p.enviada_em).toLocaleString('pt-BR').slice(0, 16) : '-') : 'Rascunho') +
      ' &middot; prazo ' + this.fmtData(this.prazoPre(p.data)) + (p.liberada ? ' &middot; liberada pela coordenacao' : (this.preTravada(p) ? ' &middot; <b style="color:var(--st-bad)">prazo encerrado</b>' : '')) + '</p></div>' +
      '  <div style="display:flex; gap:8px">' + (ehEquipe() && p.aplicador_id === window.CORTEX_SESSAO.user.id && !this.preTravada(p) ? '<button class="btn btn-fantasma" onclick="document.getElementById(\'doc-eq-overlay\').remove(); MODULOS.eventos.modalPre(\'' + p.id + '\', \'' + (p.evento_id || '') + '\')">&#9998; Editar</button>' : '') +
      (this.podeE() && this.preTravada(p) ? '<button class="btn btn-fantasma" onclick="document.getElementById(\'doc-eq-overlay\').remove(); MODULOS.eventos.liberarPre(\'' + p.id + '\')">Liberar envio</button>' : '') +
      '  <button class="btn btn-primario" onclick="window.print()">&#128424; Imprimir / PDF</button></div></div>' +
      '<div class="doc-eq">' +
      '<div class="deq-cab"><img src="icones/equilibrium.png" alt="Equilibrium"><div class="deq-cab-t"><h1>ESTRUTURA DE SUPERVIS&Atilde;O</h1><p>Equilibrium Terapia Infantil &middot; preenchida pelo aplicador antes da supervis&atilde;o</p></div></div>' +
      '<div class="deq-caixa deq-dados" style="grid-template-columns:1.2fr 2fr 1fr 1.4fr; margin-top:8px">' +
      '  <div><small>1) Data da supervis&atilde;o</small><b>' + p.data.split('-').reverse().join('/') + '</b></div>' +
      '  <div><small>2) Nome do aprendiz</small><b>' + escaparHtml(p.paciente ? p.paciente.nome : '') + '</b></div>' +
      '  <div><small>3) Idade</small><b>' + escaparHtml(p.idade || this.idadeCurta(p.paciente && p.paciente.data_nascimento, p.data)) + '</b></div>' +
      '  <div style="border-bottom:none"><small>Aplicador(a)</small><b>' + escaparHtml(p.aplicador ? p.aplicador.nome : '') + '</b></div></div>' +
      this.PRE_CAMPOS.map(([k, rot]) => bloco(rot, p[k])).join('') +
      '<div class="deq-rodape"><span>Equilibrium Terapia Infantil &middot; Uberl&acirc;ndia/MG' + (p.enviada_em ? ' &middot; enviada em ' + new Date(p.enviada_em).toLocaleString('pt-BR') : '') +
      (p.editada_em && p.enviada_em && p.editada_em > p.enviada_em ? ' &middot; editada em ' + new Date(p.editada_em).toLocaleString('pt-BR') : '') + '</span>' +
      '<span class="pontos"><i style="background:var(--eq-teal)"></i><i style="background:var(--eq-amarelo)"></i><i style="background:var(--eq-rosa)"></i><i style="background:var(--eq-azul)"></i></span><span>CORTEX aba</span></div>' +
      '</div></div>';
    document.body.appendChild(ov);
  },

  // ─────────────── Agendar / editar ───────────────

  modalEvento(id) {
    const e = id ? this.lista.find(x => x.id === id) : null;
    abrirModal(e ? 'Editar' : 'Agendar supervisao ou reuniao',
      '<div class="grade-form">' +
      '  <div class="campo"><label>Tipo</label><select id="ev-tipo">' +
      '    <option value="supervisao"' + (!e || e.tipo === 'supervisao' ? ' selected' : '') + '>Supervisao</option>' +
      '    <option value="reuniao"' + (e && e.tipo === 'reuniao' ? ' selected' : '') + '>Reuniao de equipe</option>' +
      '    <option value="reuniao_pais"' + (e && e.tipo === 'reuniao_pais' ? ' selected' : '') + '>Reuniao com pais</option>' +
      '  </select></div>' +
      '  <div class="campo c2"><label>Assunto *</label>' +
      '    <input id="ev-titulo" placeholder="Ex.: Supervisao dos programas do Miguel" value="' +
           escaparHtml(e ? e.titulo : '') + '"></div>' +
      '  <div class="campo"><label>Data *</label>' +
      '    <input type="date" id="ev-data" value="' + (e ? e.data : hojeLocal()) + '"></div>' +
      '  <div class="campo"><label>Hora</label>' +
      '    <input type="time" id="ev-hora" step="300" value="' + (e && e.hora ? e.hora.slice(0, 5) : '') + '"></div>' +
      '  <div class="campo"><label>Com quem</label><select id="ev-prof">' +
      '    <option value="">Equipe toda</option>' +
      this.equipe.map(m => '<option value="' + m.id + '"' +
        (e && e.profissional_id === m.id ? ' selected' : '') + '>' + escaparHtml(m.nome) + '</option>').join('') +
      '  </select></div>' +
      '  <div class="campo c2"><label>Crianca <small class="sub">(opcional; na supervisao, a aplicadora preenche a estrutura de pre-supervisao desta crianca)</small></label><select id="ev-pac">' +
      '    <option value="">Sem crianca especifica</option>' +
      (this.pacientes || []).map(p => '<option value="' + p.id + '"' + (e && e.paciente_id === p.id ? ' selected' : '') + '>' + escaparHtml(p.nome) + '</option>').join('') +
      '  </select></div>' +
      '</div>' +
      '<div class="mensagem-erro" id="ev-erro"></div>' +
      '<div class="barra-acoes">' +
      (e ? '<button class="btn btn-fantasma" style="margin-right:auto" onclick="MODULOS.eventos.excluir(\'' + e.id + '\')">Excluir</button>' : '') +
      '  <button class="btn btn-fantasma" onclick="fecharModal()">Cancelar</button>' +
      '  <button class="btn btn-primario" onclick="MODULOS.eventos.salvar(' + (e ? '\'' + e.id + '\'' : 'null') + ')">Salvar</button>' +
      '</div>');
  },

  async salvar(id) {
    const erro = document.getElementById('ev-erro');
    erro.classList.remove('visivel');
    const dados = {
      tipo: document.getElementById('ev-tipo').value,
      titulo: document.getElementById('ev-titulo').value.trim(),
      data: document.getElementById('ev-data').value,
      hora: document.getElementById('ev-hora').value || null,
      profissional_id: document.getElementById('ev-prof').value || null,
      paciente_id: document.getElementById('ev-pac').value || null
    };
    if (!dados.titulo || !dados.data) {
      erro.textContent = 'Preencha assunto e data.'; erro.classList.add('visivel'); return;
    }
    let resp;
    if (id) resp = await sb.from('eventos').update(dados).eq('id', id);
    else resp = await sb.from('eventos').insert(Object.assign({ criado_por: window.CORTEX_SESSAO.user.id }, dados));
    if (resp.error) { erro.textContent = resp.error.message; erro.classList.add('visivel'); return; }
    fecharModal();
    await this.carregar();
    this.desenhar();
  },

  async excluir(id) {
    if (!await popConfirmar('Excluir este evento?')) return;
    { const { error: _e } = await sb.from('eventos').delete().eq('id', id); if (_e) popAviso('Nao foi possivel gravar (eventos): ' + _e.message); }
    fecharModal();
    await this.carregar();
    this.desenhar();
  },

  // ─────────────── ATA ───────────────

  modalAta(id) {
    const e = this.lista.find(x => x.id === id);
    if (!e) return;
    if (!this.podeAta(e)) { popAviso('A ATA deste evento e lavrada pela coordenacao ou pela aplicadora que participa dele.'); return; }
    const a = e.ata || {};
    const eu = window.CORTEX_SESSAO.profile;
    abrirModal('ATA &middot; ' + escaparHtml(e.titulo),
      (a.lavrada_por ? '<p class="sub" style="margin-bottom:8px">Lavrada por <b>' + escaparHtml(a.lavrada_por) + '</b> em ' + new Date(a.lavrada_em).toLocaleDateString('pt-BR') +
        (a.lavrada_por !== eu.nome ? ' &middot; ao salvar, voce passa a constar como quem lavrou e o historico guarda as versoes' : '') + '</p>' : '') +
      '<div class="campo"><label>Presentes *</label>' +
      '<input id="ata-pres" placeholder="Nomes separados por virgula" value="' + escaparHtml(a.presentes || '') + '"></div>' +
      '<div class="campo"><label>Pauta / temas tratados *</label>' +
      '<textarea id="ata-pauta" rows="3">' + escaparHtml(a.pauta || '') + '</textarea></div>' +
      '<div class="campo"><label>Deliberacoes e orientacoes</label>' +
      '<textarea id="ata-delib" rows="4" placeholder="O que foi decidido/orientado...">' + escaparHtml(a.deliberacoes || '') + '</textarea></div>' +
      '<div class="campo"><label>Encaminhamentos (responsavel e prazo)</label>' +
      '<textarea id="ata-enc" rows="3" placeholder="Ex.: Revisar PEI do Miguel - Karol - ate 20/09">' + escaparHtml(a.encaminhamentos || '') + '</textarea></div>' +
      '<div class="mensagem-erro" id="ata-erro"></div>' +
      '<div class="barra-acoes">' +
      '  <button class="btn btn-fantasma" onclick="fecharModal()">Cancelar</button>' +
      '  <button class="btn btn-primario" onclick="MODULOS.eventos.salvarAta(\'' + id + '\')">Salvar ATA</button>' +
      '</div>', true);
  },

  async salvarAta(id) {
    const erro = document.getElementById('ata-erro');
    const e = this.lista.find(x => x.id === id);
    const anterior = (e && e.ata) || null;
    const perfil = window.CORTEX_SESSAO.profile;
    const ata = {
      presentes: document.getElementById('ata-pres').value.trim(),
      pauta: document.getElementById('ata-pauta').value.trim(),
      deliberacoes: document.getElementById('ata-delib').value.trim(),
      encaminhamentos: document.getElementById('ata-enc').value.trim(),
      lavrada_por: perfil.nome,
      lavrada_por_id: window.CORTEX_SESSAO.user.id,
      lavrada_perfil: ehEquipe() ? 'aplicador' : 'coordenacao',
      lavrada_em: new Date().toISOString(),
      // historico: quem mexeu e quando (a primeira lavratura fica guardada)
      historico: ((anterior && anterior.historico) || []).concat(anterior && anterior.lavrada_por
        ? [{ por: anterior.lavrada_por, perfil: anterior.lavrada_perfil || 'coordenacao', em: anterior.lavrada_em }] : []).slice(-20)
    };
    if (!ata.presentes || !ata.pauta) {
      erro.textContent = 'Preencha presentes e pauta.'; erro.classList.add('visivel'); return;
    }
    // grava pela funcao do banco (confere no servidor se quem lavra e coordenacao ou a aplicadora participante)
    const { error } = await sb.rpc('fn_lavrar_ata', { p_evento: id, p_ata: ata });
    if (error) { erro.textContent = error.message; erro.classList.add('visivel'); return; }
    fecharModal();
    if (ehEquipe()) {
      try {
        const coords = await this.coordsResponsaveis();
        if (coords.length) await sb.from('notificacoes').insert(coords.map(c => ({ destinatario_id: c, titulo: 'ATA de supervisao lavrada',
          corpo: perfil.nome.split(' ')[0] + ' lavrou a ATA de "' + (e ? e.titulo : '') + '" (' + this.fmtData(e ? e.data : '') + ').' })));
      } catch (x) { /* aviso e opcional */ }
    }
    await this.carregar();
    this.desenhar();
    this.docAta(id);
  },

  docAta(id) {
    const e = this.lista.find(x => x.id === id);
    if (!e || !e.ata) return;
    const a = e.ata;
    const secao = (cor, titulo, texto) => texto
      ? '<h2 style="margin-top:14px"><span class="ponto deq-' + cor + '"></span>' + titulo + '</h2>' +
        '<div class="deq-caixa deq-texto">' + escaparHtml(texto).replace(/\n/g, '<br>') + '</div>'
      : '';

    document.getElementById('doc-eq-overlay')?.remove();
    const ov = document.createElement('div');
    ov.id = 'doc-eq-overlay';
    ov.className = 'folha-overlay';
    ov.innerHTML = '<div class="folha-pagina" style="max-width:860px">' +
      '<div class="pagina-cabecalho nao-imprime">' +
      '  <div><button class="btn-voltar" onclick="document.getElementById(\'doc-eq-overlay\').remove()">&larr; Fechar</button>' +
      '  <h2>ATA</h2></div>' +
      '  <button class="btn btn-primario" onclick="window.print()">&#128424; Imprimir / PDF</button>' +
      '</div>' +
      '<div class="doc-eq">' +
      '<div class="deq-cab">' +
      '  <img src="icones/equilibrium.png" alt="Equilibrium">' +
      '  <div class="deq-cab-t"><h1>ATA DE ' + (e.tipo === 'supervisao' ? 'SUPERVIS&Atilde;O' : 'REUNI&Atilde;O') + '</h1>' +
      '  <p>Equilibrium Terapia Infantil &middot; ' + escaparHtml(e.titulo) + '</p></div>' +
      '</div>' +
      '<div class="deq-caixa deq-dados" style="grid-template-columns:1fr 1fr 1fr; margin-top:8px">' +
      '  <div><small>Data</small><b>' + e.data.split('-').reverse().join('/') +
           (e.hora ? ' as ' + e.hora.slice(0, 5) : '') + '</b></div>' +
      '  <div><small>Participacao</small><b>' + (e.profissional ? escaparHtml(e.profissional.nome) : 'Equipe') + '</b></div>' +
      '  <div style="border-bottom:none"><small>Presentes</small><b>' + escaparHtml(a.presentes) + '</b></div>' +
      '</div>' +
      secao('azul', 'Pauta e temas tratados', a.pauta) +
      secao('teal', 'Delibera&ccedil;&otilde;es e orienta&ccedil;&otilde;es', a.deliberacoes) +
      secao('amarelo', 'Encaminhamentos', a.encaminhamentos) +
      '<div class="deq-assinaturas" style="margin-top:26px">' +
      '  <div class="deq-ass"><span></span>Respons&aacute;vel pela supervis&atilde;o (coordena&ccedil;&atilde;o)</div>' +
      '  <div class="deq-ass"><span></span>' + escaparHtml(a.lavrada_por || '') + '<br>' +
           (a.lavrada_perfil === 'aplicador' ? 'Aplicador(a) &middot; lavrou a ATA em ' : 'Lavrou a ATA em ') +
           new Date(a.lavrada_em).toLocaleDateString('pt-BR') + '</div>' +
      '</div>' +
      (a.historico && a.historico.length
        ? '<p style="font-size:10.5px; color:var(--eq-cinza); margin-top:10px">Vers&otilde;es anteriores: ' +
          a.historico.map(h => escaparHtml(h.por || '') + ' (' + (h.em ? new Date(h.em).toLocaleDateString('pt-BR') : '') + ')').join(' &middot; ') + '</p>'
        : '') +
      '<div class="deq-rodape">' +
      '  <span>Equilibrium Terapia Infantil &middot; Uberl&acirc;ndia/MG</span>' +
      '  <span class="pontos"><i style="background:var(--eq-teal)"></i><i style="background:var(--eq-amarelo)"></i>' +
      '<i style="background:var(--eq-rosa)"></i><i style="background:var(--eq-azul)"></i></span>' +
      '  <span>Gerado pelo CORTEX aba</span>' +
      '</div>' +
      '</div></div>';
    document.body.appendChild(ov);
  },

  // ─────────────── Avisos do dia (pop-up do login) ───────────────

  // Dados dos avisos do dia (usados pelo pop-up e pela Central de avisos): eventos de hoje/amanha,
  // estruturas de pre-supervisao que vencem (prazo = um dia antes), avaliacoes vencendo, demandas e parabens.
  async dadosAvisos() {
    const eu = window.CORTEX_SESSAO.user.id;
    const perfil = window.CORTEX_SESSAO.profile.perfil;
    const hoje = hojeLocal();
    const dia = n => { const d = new Date(hoje + 'T12:00:00'); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
    const amanha = dia(1), depois = dia(2);

    const { data: evs } = await sb.from('eventos')
      .select('id, tipo, titulo, data, hora, profissional_id, paciente_id')
      .in('data', [hoje, amanha, depois]).order('data').order('hora');
    const todos = (evs || []).filter(e => !e.profissional_id || e.profissional_id === eu);
    const meus = todos.filter(e => e.data !== depois);
    // aplicadora: supervisoes de hoje a depois de amanha ainda sem a estrutura enviada (prazo: um dia antes)
    let preFalta = [];
    if (ehEquipe() && todos.some(e => e.tipo === 'supervisao')) {
      const ids = todos.filter(e => e.tipo === 'supervisao').map(e => e.id);
      const { data: pr } = await sb.from('pre_supervisoes').select('evento_id, status').in('evento_id', ids).eq('aplicador_id', eu);
      const ok = new Set((pr || []).filter(x => x.status === 'enviada').map(x => x.evento_id));
      preFalta = todos.filter(e => e.tipo === 'supervisao' && !ok.has(e.id)).map(e => Object.assign({}, e, {
        prazo: this.prazoPre(e.data), travada: hoje > this.prazoPre(e.data) }));
    }

    let venc = [];
    if (['direcao', 'coordenador'].includes(perfil)) {
      venc = await this.avaliacoesVencendo();
    } else if (perfil === 'aplicador') {
      venc = (await this.avaliacoesVencendo()).filter(v => v.aplicador_id === eu);
    }
    const { data: dems } = await sb.from('demandas')
      .select('id, tipo, titulo, detalhe, prazo, criador:profiles!demandas_criado_por_fkey(nome)')
      .eq('profissional_id', eu).is('feita_em', null).order('criado_em');
    const minhasDem = (dems || []).filter(d => d.tipo === 'demanda');
    const parabens = (dems || []).filter(d => d.tipo === 'parabens');
    return { hoje, amanha, meus, preFalta, venc, minhasDem, parabens };
  },

  async popupAvisos() {
    const { hoje, meus, preFalta: preLista, venc, minhasDem, parabens } = await this.dadosAvisos();
    const preFalta = meus.filter(e => preLista.some(p => p.id === e.id));

    for (const pb of parabens) {
      abrirModal('&#127881; Parabens!',
        '<div style="text-align:center; padding:6px 4px">' +
        '<div style="font-size:40px">&#127882;&#127881;&#127882;</div>' +
        '<h3 style="margin:8px 0">' + escaparHtml(pb.titulo) + '</h3>' +
        (pb.detalhe ? '<p class="sub">' + escaparHtml(pb.detalhe) + '</p>' : '') +
        '<p class="sub" style="margin-top:8px">&mdash; ' + escaparHtml(pb.criador ? pb.criador.nome : 'Coordenacao') + '</p>' +
        '<button class="btn btn-primario" style="margin-top:10px" ' +
        'onclick="sb.from(\'demandas\').update({ feita_em: new Date().toISOString() }).eq(\'id\', \'' + pb.id + '\').then(() => fecharModal())">Obrigado(a)!</button>' +
        '</div>', false, 'evolucao');
      return; // um festejo por login; demandas ficam para o proximo popup
    }
    if (!meus.length && !venc.length && !minhasDem.length) return;

    let html = '';
    if (minhasDem.length) {
      html += '<p class="sub" style="margin-bottom:6px"><b>Demandas para voce (' + minhasDem.length + '):</b></p>' +
        minhasDem.map(d =>
          '<div class="linha-doc"><div><b>' + escaparHtml(d.titulo) + '</b><small>' +
          (d.detalhe ? escaparHtml(d.detalhe) + ' &middot; ' : '') +
          'de ' + escaparHtml(d.criador ? d.criador.nome.split(' ')[0] : '-') +
          (d.prazo ? ' &middot; ate ' + d.prazo.split('-').reverse().join('/') : '') + '</small></div>' +
          '<button class="btn-chip" onclick="MODULOS.eventos.concluirDemanda(\'' + d.id + '\', this)">Feita &#10003;</button>' +
          '</div>').join('') + '<div style="height:8px"></div>';
    }
    if (meus.length) {
      html += '<p class="sub" style="margin-bottom:6px"><b>Supervisoes e reunioes:</b></p>' +
        meus.map(e =>
          '<div class="linha-doc"><span><b>' + (e.tipo === 'supervisao' ? '&#128204;' : e.tipo === 'reuniao_pais' ? '&#128106;' : '&#128101;') + ' ' +
          escaparHtml(e.titulo) + '</b><small>' +
          (e.data === hoje ? 'HOJE' : 'Amanha') + (e.hora ? ' as ' + e.hora.slice(0, 5) : '') +
          (preFalta.includes(e) ? ' &middot; <b style="color:#92400E">estrutura de pre-supervisao pendente</b>' : '') +
          '</small></span>' +
          (preFalta.includes(e) ? '<button class="btn-chip cheio" onclick="fecharModal(); abrirModulo(\'eventos\'); setTimeout(function(){ MODULOS.eventos.modalPre(\'\', \'' + e.id + '\'); }, 600)">Preencher agora</button>' : '') +
          '</div>').join('');
    }
    if (venc.length) {
      html += '<p class="sub" style="margin:10px 0 6px"><b>Avaliacoes vencendo ou vencidas (' + venc.length + '):</b></p>' +
        venc.slice(0, 8).map(v =>
          '<div class="linha-doc"><span><b>' + escaparHtml(v.nome) + '</b><small>' +
          v.protocolo.toUpperCase() + ' &middot; ' + v.rotulo + '</small></span>' +
          '<span class="selo ' + (v.dias < 0 ? 'selo-bad' : 'selo-warn') + '">' +
          (v.dias < 0 ? 'vencida ha ' + (-v.dias) + 'd' : 'vence em ' + v.dias + 'd') + '</span></div>').join('') +
        (venc.length > 8 ? '<p class="sub">e mais ' + (venc.length - 8) + '... O quadro completo esta em Avaliacoes.</p>' : '');
    }
    abrirModal('Avisos do dia', html, false, 'aviso');
  },

  async avaliacoesVencendo() {
    const [rCfg, rAv, rPac] = await Promise.all([
      sb.from('configuracoes').select('valor').eq('chave', 'validade_avaliacao_meses').maybeSingle(),
      sb.from('avaliacoes').select('paciente_id, protocolo, concluido_em').eq('status', 'concluida'),
      sb.from('pacientes').select('id, nome, aplicador_id').eq('status', 'ativo')
    ]);
    const meses = parseInt(rCfg.data ? rCfg.data.valor : '6', 10) || 6;
    const nomes = {}, aplics = {};
    (rPac.data || []).forEach(p => { nomes[p.id] = p.nome; aplics[p.id] = p.aplicador_id; });

    const ultima = {};
    (rAv.data || []).forEach(a => {
      if (!nomes[a.paciente_id] || !a.concluido_em) return;
      const ch = a.paciente_id + '|' + a.protocolo;
      if (!ultima[ch] || a.concluido_em > ultima[ch]) ultima[ch] = a.concluido_em;
    });

    const saida = [];
    Object.entries(ultima).forEach(([ch, quando]) => {
      const [pac, proto] = ch.split('|');
      const vence = new Date(quando);
      vence.setMonth(vence.getMonth() + meses);
      const dias = Math.floor((vence - Date.now()) / 86400000);
      if (dias <= 30) {
        saida.push({ paciente_id: pac, nome: nomes[pac], protocolo: proto, dias: dias, aplicador_id: aplics[pac],
          rotulo: 'ultima em ' + new Date(quando).toLocaleDateString('pt-BR') +
            ' &middot; validade ' + meses + ' meses' });
      }
    });
    return saida.sort((a, b) => a.dias - b.dias);
  },

  // ─────────────── Demandas e parabens ───────────────

  async carregarDemandas() {
    const alvo = document.getElementById('dem-lista');
    if (!alvo) return;
    const { data } = await sb.from('demandas')
      .select('*, prof:profiles!demandas_profissional_id_fkey(nome), criador:profiles!demandas_criado_por_fkey(nome)')
      .order('criado_em', { ascending: false }).limit(60);
    const lista = data || [];
    const abertas = lista.filter(d => d.tipo === 'demanda' && !d.feita_em);
    const feitas = lista.filter(d => d.tipo === 'demanda' && d.feita_em).slice(0, 10);
    const pbs = lista.filter(d => d.tipo === 'parabens').slice(0, 10);

    alvo.innerHTML =
      '<div class="cartao"><div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px">' +
      '<h3 style="margin:0">Demandas <span class="selo selo-neutro">' + abertas.length + ' aberta(s)</span></h3>' +
      (this.podeDemanda()
        ? '<div class="pac-selos">' +
          '<button class="btn btn-fantasma" onclick="MODULOS.eventos.modalDemanda(\'demanda\')">+ Demanda</button>' +
          '<button class="btn btn-primario" onclick="MODULOS.eventos.modalDemanda(\'parabens\')">&#127881; Parabens pro AT</button>' +
          '</div>' : '') +
      '</div>' +
      (abertas.length
        ? abertas.map(d =>
            '<div class="linha-doc"><div><b>' + escaparHtml(d.titulo) + '</b><small>' +
            escaparHtml(d.prof ? d.prof.nome : '-') +
            (d.prazo ? ' &middot; ate ' + d.prazo.split('-').reverse().join('/') : '') +
            (d.detalhe ? ' &middot; ' + escaparHtml(d.detalhe) : '') + '</small></div>' +
            '<span class="selo selo-warn">Aberta</span></div>').join('')
        : '<p class="sub">Nenhuma demanda aberta.</p>') +
      (feitas.length
        ? '<h3 style="margin-top:12px">Concluidas recentes</h3>' +
          feitas.map(d =>
            '<div class="linha-doc"><div><b>' + escaparHtml(d.titulo) + '</b><small>' +
            escaparHtml(d.prof ? d.prof.nome : '-') + ' &middot; feita em ' +
            new Date(d.feita_em).toLocaleDateString('pt-BR') + '</small></div>' +
            '<span class="selo selo-ok">Feita</span></div>').join('')
        : '') +
      (pbs.length
        ? '<h3 style="margin-top:12px">&#127881; Parabens enviados</h3>' +
          pbs.map(d =>
            '<div class="linha-doc"><div><b>' + escaparHtml(d.titulo) + '</b><small>para ' +
            escaparHtml(d.prof ? d.prof.nome : '-') + (d.feita_em ? ' &middot; visto' : ' &middot; ainda nao visto') +
            '</small></div></div>').join('')
        : '') +
      '</div>';
  },

  modalDemanda(tipo) {
    const pb = tipo === 'parabens';
    abrirModal(pb ? '&#127881; Parabens pro AT' : 'Nova demanda',
      '<div class="grade-form">' +
      '<div class="campo c2"><label>' + (pb ? 'Mensagem de parabens *' : 'O que precisa ser feito *') + '</label>' +
      '<input id="dm-titulo" placeholder="' + (pb ? 'Ex.: Parabens pela conducao da sessao do Miguel!' : 'Ex.: Atualizar as fichas da sala 2') + '"></div>' +
      '<div class="campo c2"><label>Detalhe (opcional)</label><input id="dm-det"></div>' +
      '<div class="campo"><label>Para quem *</label><select id="dm-prof">' +
      this.equipe.map(m => '<option value="' + m.id + '">' + escaparHtml(m.nome) + '</option>').join('') +
      '</select></div>' +
      (pb ? '' : '<div class="campo"><label>Prazo</label><input type="date" id="dm-prazo"></div>') +
      '</div>' +
      '<p class="sub" style="margin-top:6px">' + (pb
        ? 'A pessoa recebe um festejo &#127882; ao abrir o sistema.'
        : 'A pessoa ve a demanda no aviso do login e marca como feita.') + '</p>' +
      '<div class="mensagem-erro" id="dm-erro"></div>' +
      '<div class="barra-acoes">' +
      '<button class="btn btn-fantasma" onclick="fecharModal()">Cancelar</button>' +
      '<button class="btn btn-primario" onclick="MODULOS.eventos.salvarDemanda(\'' + tipo + '\')">' +
      (pb ? 'Enviar &#127881;' : 'Criar demanda') + '</button></div>');
  },

  async salvarDemanda(tipo) {
    const erro = document.getElementById('dm-erro');
    const titulo = document.getElementById('dm-titulo').value.trim();
    if (!titulo) { erro.textContent = 'Escreva a mensagem.'; erro.classList.add('visivel'); return; }
    const prazoEl = document.getElementById('dm-prazo');
    const { error } = await sb.from('demandas').insert({
      tipo: tipo,
      titulo: titulo,
      detalhe: document.getElementById('dm-det').value.trim() || null,
      profissional_id: document.getElementById('dm-prof').value,
      prazo: prazoEl && prazoEl.value ? prazoEl.value : null,
      criado_por: window.CORTEX_SESSAO.user.id
    });
    if (error) { erro.textContent = error.message; erro.classList.add('visivel'); return; }
    fecharModal();
    this.carregarDemandas();
  },

  async concluirDemanda(id, botao) {
    { const { error: _e } = await sb.from('demandas').update({ feita_em: new Date().toISOString() }).eq('id', id); if (_e) popAviso('Nao foi possivel gravar (demandas): ' + _e.message); }
    if (botao) { botao.outerHTML = '<span class="selo selo-ok">Feita &#10003;</span>'; }
  }
};
