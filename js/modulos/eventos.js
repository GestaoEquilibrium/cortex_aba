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
  // "08/10/2026 as 17:42" (toLocaleString().slice cortava o minuto quando o navegador poe virgula)
  dataHora(iso) { if (!iso) return ''; const d = new Date(iso); return d.toLocaleDateString('pt-BR') + ' as ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); },

  async render(el) {
    this.el = el;
    el.innerHTML =
      '<div class="pagina-cabecalho">' +
      '  <div><h2>Supervisao e ATAs</h2>' +
      '  <p class="sub">Agenda de supervisoes e reunioes da equipe e as ATAs de cada uma.</p></div>' +
      '  <div class="ev-acoes-topo">' +
      (this.podeE() ? '<button class="btn btn-fantasma" onclick="MODULOS.eventos.modalEvento()">+ Agendar</button>' : '') +
      (this.podeLavrar() ? '<button class="btn btn-primario" onclick="MODULOS.eventos.novaAta()">+ Nova ATA</button>' : '') +
      '  </div>' +
      '</div>' +
      '<div class="abas ev-abas" id="ev-abas"></div>' +
      '<div id="ev-lista"><div class="cartao"><p class="sub">Carregando...</p></div></div>' +
      '<div id="dem-lista"></div>';
    // patch 43: aba guardada no aparelho (Agenda | ATAs)
    try { this.aba = localStorage.getItem('cortex_ev_aba') === 'atas' ? 'atas' : 'agenda'; } catch (e) { this.aba = 'agenda'; }
    this.atas = null;
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
    if (!alvo) return;
    this.desenharAbas();
    const dem = document.getElementById('dem-lista');
    if (this.aba === 'atas') { if (dem) dem.style.display = 'none'; this.abaAtas(); return; }
    if (dem) dem.style.display = '';
    const hoje = hojeLocal();
    const eu = window.CORTEX_SESSAO.user.id;
    const fut = this.lista.filter(e => e.data >= hoje);
    const pas = this.lista.filter(e => e.data < hoje).reverse();

    // patch 43: colunas fixas (pre-supervisao | ATA | editar), mesma posicao em todas as linhas
    const linha = e => {
      const quem = this.quemPreenche(e);
      const nomeQuem = quem === eu ? 'voce' : this.primeiro(this.perfis && this.perfis[quem] ? this.perfis[quem].nome : '');
      return '<div class="ev-linha"><div class="ev-info"><b>' + this.tipoIc(e.tipo) + ' ' + this.tipoRot(e.tipo) + ' &middot; ' + escaparHtml(e.titulo) + '</b>' +
        '<small>' + (e.data === hoje ? '<span class="ev-hoje">HOJE</span>' : '') + this.fmtData(e.data) + (e.hora ? ' as ' + e.hora.slice(0, 5) : '') +
        ' &middot; ' + (e.profissional ? escaparHtml(e.profissional.nome) : 'Equipe toda') +
        (e.paciente ? ' &middot; ' + escaparHtml(e.paciente.nome.split(' ').slice(0, 2).join(' ')) : '') +
        (e.ata ? ' &middot; ATA lavrada por ' + escaparHtml((e.ata.lavrada_por || '').split(' ').slice(0, 2).join(' '))
               : (nomeQuem ? ' &middot; ATA: ' + escaparHtml(nomeQuem) + ' preenche' : '')) +
        (e.origem === 'ata' ? ' &middot; sem agendar' : '') + '</small></div>' +
        '<div class="ev-cel ev-pre">' + this.chipPre(e) + '</div>' +
        '<div class="ev-cel ev-ata">' + this.celAta(e) + '</div>' +
        '<div class="ev-cel ev-ed">' + (this.podeE() ? '<button class="btn-chip" onclick="MODULOS.eventos.modalEvento(\'' + e.id + '\')">Editar</button>' : '') + '</div></div>';
    };

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
    if (!p && (e.ata || e.origem === 'ata')) return '';   // patch 43: ATA ja lavrada (ou sem agendar) dispensa o selo de pendencia
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
      (p.enviada_em ? ' &middot; enviada em ' + this.dataHora(p.enviada_em) : '') +
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
      (p && p.enviada_em ? '<small class="sub">Enviada em ' + this.dataHora(p.enviada_em) + ' &middot; a data de envio nao muda ao editar</small>' : '') + '</div>';
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
      '  <p class="sub">' + (p.status === 'enviada' ? 'Enviada em ' + (p.enviada_em ? this.dataHora(p.enviada_em) : '-') : 'Rascunho') +
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
      '  <div class="campo"><label>Tipo</label><select id="ev-tipo" onchange="MODULOS.eventos.evQuemDesenhar()">' +
      '    <option value="supervisao"' + (!e || e.tipo === 'supervisao' ? ' selected' : '') + '>Supervisao</option>' +
      '    <option value="reuniao"' + (e && e.tipo === 'reuniao' ? ' selected' : '') + '>Reuniao de equipe</option>' +
      '    <option value="reuniao_pais"' + (e && e.tipo === 'reuniao_pais' ? ' selected' : '') + '>Reuniao com pais</option>' +
      '  </select></div>' +
      '  <div class="campo c2"><label>Assunto *</label>' +
      '    <input id="ev-titulo" placeholder="Ex.: Supervisao dos programas do Miguel" value="' +
           escaparHtml(e ? e.titulo : '') + '"></div>' +
      '  <div class="campo"><label>Data *</label>' +
      '    <input type="date" id="ev-data" value="' + (e ? e.data : hojeLocal()) + '" onchange="MODULOS.eventos.evQuemDesenhar()"></div>' +
      '  <div class="campo"><label>Hora</label>' +
      '    <input type="time" id="ev-hora" step="300" value="' + (e && e.hora ? e.hora.slice(0, 5) : '') + '" onchange="MODULOS.eventos.evQuemDesenhar()"></div>' +
      '  <div class="campo"><label>Com quem</label><select id="ev-prof" onchange="MODULOS.eventos.evQuemDesenhar()">' +
      '    <option value="">Equipe toda</option>' +
      this.equipe.map(m => '<option value="' + m.id + '"' +
        (e && e.profissional_id === m.id ? ' selected' : '') + '>' + escaparHtml(m.nome) + '</option>').join('') +
      '  </select></div>' +
      '  <div class="campo c2"><label>Crianca <small class="sub">(opcional; na supervisao, a aplicadora preenche a estrutura de pre-supervisao desta crianca)</small></label><select id="ev-pac">' +
      '    <option value="">Sem crianca especifica</option>' +
      (this.pacientes || []).map(p => '<option value="' + p.id + '"' + (e && e.paciente_id === p.id ? ' selected' : '') + '>' + escaparHtml(p.nome) + '</option>').join('') +
      '  </select></div>' +
      // patch 43: quem preenche a ATA (na hora marcada ela abre sozinha para essa pessoa)
      '  <div class="campo c3"><label>Quem preenche a ATA</label><div class="segmento" id="ev-quem"></div>' +
      '    <select id="ev-quem-outra" style="display:none; margin-top:8px; max-width:340px" onchange="MODULOS.eventos.evQuemDesenhar()"></select>' +
      '    <span class="ev-quem-dica" id="ev-quem-dica"></span></div>' +
      '</div>' +
      '<div class="mensagem-erro" id="ev-erro"></div>' +
      '<div class="barra-acoes">' +
      (e ? '<button class="btn btn-fantasma" style="margin-right:auto" onclick="MODULOS.eventos.excluir(\'' + e.id + '\')">Excluir</button>' : '') +
      '  <button class="btn btn-fantasma" onclick="fecharModal()">Cancelar</button>' +
      '  <button class="btn btn-primario" onclick="MODULOS.eventos.salvar(' + (e ? '\'' + e.id + '\'' : 'null') + ')">Salvar</button>' +
      '</div>');
    this._quem = this.evQuemInicial(e);
    this.evQuemDesenhar();
  },

  // ─── "Quem preenche a ATA" (patch 43). Padrao: a participante na supervisao; nas reunioes, quem agendou ───
  evQuemInicial(e) {
    const eu = window.CORTEX_SESSAO.user.id;
    if (e && e.ata_por) {
      if (e.ata_por === e.profissional_id) return { modo: 'part' };
      if (e.ata_por === eu) return { modo: 'eu' };
      return { modo: 'outra', outra: e.ata_por };
    }
    if (e) {   // agendado antes do patch 43: mostra a regra padrao
      if (e.tipo === 'supervisao' && e.profissional_id) return { modo: 'part' };
      if (e.criado_por && e.criado_por !== eu) return { modo: 'outra', outra: e.criado_por };
    }
    return { modo: 'auto' };
  },
  evQuemModo() {
    const Q = this._quem || { modo: 'auto' };
    const tipo = document.getElementById('ev-tipo')?.value, prof = document.getElementById('ev-prof')?.value;
    if (Q.modo === 'auto') return tipo === 'supervisao' && prof ? 'part' : 'eu';
    if (Q.modo === 'part' && !prof) return 'eu';
    return Q.modo;
  },
  evQuemEscolher(m) { this._quem = Object.assign(this._quem || {}, { modo: m }); this.evQuemDesenhar(); },
  evQuemId() {
    const eu = window.CORTEX_SESSAO.user.id, m = this.evQuemModo();
    if (m === 'part') return document.getElementById('ev-prof').value || eu;
    if (m === 'outra') return document.getElementById('ev-quem-outra').value || eu;
    return eu;
  },
  evQuemDesenhar() {
    const seg = document.getElementById('ev-quem'); if (!seg) return;
    const eu = window.CORTEX_SESSAO.user.id;
    const profId = document.getElementById('ev-prof').value;
    const prof = (this.equipe || []).find(m => m.id === profId);
    const m = this.evQuemModo();
    const ehCoord = window.CORTEX_SESSAO.profile.perfil === 'coordenador';
    seg.innerHTML = (prof ? '<button type="button" class="seg' + (m === 'part' ? ' ativo' : '') + '" onclick="MODULOS.eventos.evQuemEscolher(\'part\')">' + escaparHtml(this.primeiro(prof.nome)) + ' (participante)</button>' : '') +
      '<button type="button" class="seg' + (m === 'eu' ? ' ativo' : '') + '" onclick="MODULOS.eventos.evQuemEscolher(\'eu\')">Eu' + (ehCoord ? ' (coordenacao)' : '') + '</button>' +
      '<button type="button" class="seg' + (m === 'outra' ? ' ativo' : '') + '" onclick="MODULOS.eventos.evQuemEscolher(\'outra\')">Outra pessoa...</button>';
    // "outra pessoa": coordenacao e direcao (quem lavra ATA de qualquer evento)
    const out = document.getElementById('ev-quem-outra');
    const atual = out.value || (this._quem && this._quem.outra) || '';
    const gest = (this.equipe || []).filter(x => ['direcao', 'coordenador'].includes(x.perfil) && x.id !== eu);
    if (atual && !gest.some(x => x.id === atual) && this.perfis && this.perfis[atual]) gest.push(this.perfis[atual]);
    out.innerHTML = gest.map(x => '<option value="' + x.id + '"' + (x.id === atual ? ' selected' : '') + '>' + escaparHtml(x.nome) + '</option>').join('') || '<option value="">Ninguem da coordenacao cadastrado</option>';
    out.style.display = m === 'outra' ? '' : 'none';
    const quemId = this.evQuemId();
    const nome = quemId === eu ? 'voce' : this.primeiro(((this.equipe || []).find(x => x.id === quemId) || (this.perfis || {})[quemId] || {}).nome || '');
    const data = document.getElementById('ev-data').value, hora = document.getElementById('ev-hora').value;
    const quando = !data ? 'No dia' : (data === hojeLocal() ? 'Hoje' : 'No dia ' + this.fmtData(data).slice(0, 5)) + (hora ? ' as ' + hora : '');
    document.getElementById('ev-quem-dica').innerHTML = quando + ', a ATA abre sozinha para <b>' + escaparHtml(nome) + '</b> preencher' +
      (hora ? '' : ' (sem hora: abre quando entrar no sistema)') + '. Se estiver numa ficha ou documento, abre assim que fechar.';
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
      paciente_id: document.getElementById('ev-pac').value || null,
      ata_por: this.evQuemId()
    };
    if (!dados.titulo || !dados.data) {
      erro.textContent = 'Preencha assunto e data.'; erro.classList.add('visivel'); return;
    }
    const gravar = d => id ? sb.from('eventos').update(d).eq('id', id) : sb.from('eventos').insert(Object.assign({ criado_por: window.CORTEX_SESSAO.user.id }, d));
    let resp = await gravar(dados);
    // sem o SQL do patch 43 (coluna ata_por): grava o resto e avisa
    if (resp.error && /ata_por/i.test(resp.error.message)) {
      delete dados.ata_por; resp = await gravar(dados);
      if (!resp.error) popAviso('Evento salvo. Para escolher quem preenche a ATA, falta rodar o SQL do patch 43 no Supabase.');
    }
    if (resp.error) { erro.textContent = resp.error.message; erro.classList.add('visivel'); return; }
    this._hojeCache = null;
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

  // ─────────────── ATA (patch 43 · opcao B escolhida por Wess em 09/10/2026) ───────────────
  // Painel pela direita com a estrutura de pre-supervisao ao lado. Abre SOZINHO na hora da supervisao
  // para quem preenche (eventos.ata_por; sem ele: a participante na supervisao, senao quem agendou).
  // "Depois" fecha e a ATA fica no sino ate ser salva; o que foi escrito fica guardado no aparelho.
  // "+ Nova ATA": ATA sem agendar e sem estrutura (vira um evento ja com a ATA, pela fn_ata_avulsa).
  // E a unica janela que abre sozinha no sistema (o resto continua no sino, regra do patch 31).

  ehGestao() { return ['direcao', 'coordenador', 'suporte'].includes(window.CORTEX_SESSAO.profile.perfil); },
  podeLavrar() { return perm('eventos') !== '' && (this.ehGestao() || ehEquipe()); },
  quemPreenche(e) {
    if (!e) return null;
    if (e.ata_por) return e.ata_por;
    if (e.tipo === 'supervisao' && e.profissional_id) return e.profissional_id;
    return e.criado_por || null;
  },
  hhmm(d) { d = d || new Date(); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); },
  diaMais(n) { const d = new Date(hojeLocal() + 'T12:00:00'); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); },
  diasDesde(data) { return Math.round((new Date(hojeLocal() + 'T12:00:00') - new Date(data + 'T12:00:00')) / 86400000); },
  // lavrada | futura | hoje (antes do horario) | agora (ja comecou, sem ATA) | atrasada (o dia ja passou)
  sitAta(e) {
    if (e.ata) return 'lavrada';
    const hoje = hojeLocal();
    if (e.data > hoje) return 'futura';
    if (e.data < hoje) return 'atrasada';
    return (!e.hora || e.hora.slice(0, 5) <= this.hhmm()) ? 'agora' : 'hoje';
  },
  TIPOS: { supervisao: ['&#128204;', 'Supervisao'], reuniao: ['&#128101;', 'Reuniao'], reuniao_pais: ['&#128106;', 'Reuniao com pais'] },
  tipoRot(t) { return (this.TIPOS[t] || this.TIPOS.reuniao)[1]; },
  tipoIc(t) { return (this.TIPOS[t] || this.TIPOS.reuniao)[0]; },
  primeiro(n) { return String(n || '').trim().split(' ')[0]; },
  _nomes: {},
  async nomeDe(id) {
    if (!id) return '';
    if (this.perfis && this.perfis[id]) return this.perfis[id].nome;
    if (this._nomes[id] !== undefined) return this._nomes[id];
    const { data } = await sb.from('profiles').select('nome').eq('id', id).maybeSingle();
    return (this._nomes[id] = data ? data.nome : '');
  },
  SEL_EV: '*, profissional:profiles!eventos_profissional_id_fkey(nome), paciente:pacientes!eventos_paciente_id_fkey(id, nome, data_nascimento)',

  // celula da ATA na lista da agenda (selo + botao, sempre na mesma coluna)
  celAta(e) {
    const s = this.sitAta(e), pode = this.podeAta(e);
    const bt = pode ? '<button class="btn-chip cheio" onclick="MODULOS.eventos.abrirAta(\'' + e.id + '\')">&#9998; Preencher ATA</button>' : '<span></span>';
    if (s === 'lavrada') return '<span class="selo selo-ok">ATA lavrada</span><span class="ev-bts"><button class="btn-chip cheio" onclick="MODULOS.eventos.docAta(\'' + e.id + '\')">Ver ATA</button>' +
      (pode ? '<button class="btn-chip" onclick="MODULOS.eventos.abrirAta(\'' + e.id + '\')">Editar ATA</button>' : '') + '</span>';
    const h = e.hora ? ' as ' + e.hora.slice(0, 5) : '';
    const tip = ' title="Na hora marcada a ATA abre sozinha para quem preenche"';
    if (s === 'futura') return '<span class="selo selo-neutro"' + tip + '>abre sozinha ' + this.fmtData(e.data).slice(0, 5) + h + '</span><span></span>';
    if (s === 'hoje') return '<span class="selo selo-warn"' + tip + '>abre sozinha' + h + '</span>' + bt;
    if (s === 'agora') return '<span class="selo selo-warn">a preencher</span>' + bt;
    const n = this.diasDesde(e.data);
    return '<span class="selo selo-bad">ATA pendente ha ' + n + ' dia' + (n > 1 ? 's' : '') + '</span>' + bt;
  },

  // ── Abas Agenda | ATAs ──
  desenharAbas() {
    const ab = document.getElementById('ev-abas'); if (!ab) return;
    const eu = window.CORTEX_SESSAO.user.id;
    const pend = (this.lista || []).filter(e => !e.ata && ['agora', 'atrasada'].includes(this.sitAta(e)) && (this.ehGestao() || this.quemPreenche(e) === eu)).length;
    ab.innerHTML = '<button type="button" class="aba' + (this.aba !== 'atas' ? ' ativa' : '') + '" onclick="MODULOS.eventos.irAba(\'agenda\')">Agenda</button>' +
      '<button type="button" class="aba' + (this.aba === 'atas' ? ' ativa' : '') + '" onclick="MODULOS.eventos.irAba(\'atas\')">ATAs' +
      (pend ? ' <span class="selo selo-bad" style="margin-left:4px" title="ATAs a preencher ou atrasadas">' + pend + '</span>' : '') + '</button>';
  },
  irAba(a, sit) {
    this.aba = a === 'atas' ? 'atas' : 'agenda';
    try { localStorage.setItem('cortex_ev_aba', this.aba); } catch (e) {}
    if (sit !== undefined) this._atasF = Object.assign(this._atasF || {}, { sit: sit });
    if (this.aba === 'atas') this.atas = null;   // sempre busca de novo ao entrar
    this.desenhar();
  },
  async abaAtas() {
    const alvo = document.getElementById('ev-lista'); if (!alvo) return;
    const F = this._atasF = Object.assign({ busca: '', tipo: '', per: '3', sit: '' }, this._atasF || {});
    const op = (lista, v) => lista.map(([k, r]) => '<option value="' + k + '"' + (k === v ? ' selected' : '') + '>' + r + '</option>').join('');
    alvo.innerHTML = '<div class="toolbar atas-filtros">' +
      '<input type="search" id="atas-busca" placeholder="Buscar por crianca, assunto ou texto da ATA" value="' + escaparHtml(F.busca) + '" oninput="MODULOS.eventos.atasFiltrar()">' +
      '<select id="atas-tipo" onchange="MODULOS.eventos.atasFiltrar()">' + op([['', 'Todos os tipos'], ['supervisao', 'Supervisao'], ['reuniao', 'Reuniao de equipe'], ['reuniao_pais', 'Reuniao com pais']], F.tipo) + '</select>' +
      '<select id="atas-per" onchange="MODULOS.eventos.atasFiltrar(true)">' + op([['3', 'Ultimos 3 meses'], ['6', 'Ultimos 6 meses'], ['12', 'Ultimos 12 meses'], ['tudo', 'Todo o periodo']], F.per) + '</select>' +
      '<select id="atas-sit" onchange="MODULOS.eventos.atasFiltrar()">' + op([['', 'Todas as situacoes'], ['pend', 'A preencher ou atrasadas'], ['lavrada', 'Lavradas']], F.sit) + '</select></div>' +
      '<div class="cartao" id="atas-lista"><p class="sub">Carregando ATAs...</p></div>';
    if (!this.atas || this._atasPer !== F.per) await this.carregarAtas();
    this.atasDesenharLista();
  },
  async atasFiltrar(recarregar) {
    const F = this._atasF || {};
    F.busca = document.getElementById('atas-busca')?.value || '';
    F.tipo = document.getElementById('atas-tipo')?.value || '';
    F.sit = document.getElementById('atas-sit')?.value || '';
    F.per = document.getElementById('atas-per')?.value || '3';
    if (recarregar || F.per !== this._atasPer) {
      const l = document.getElementById('atas-lista'); if (l) l.innerHTML = '<p class="sub">Carregando ATAs...</p>';
      await this.carregarAtas();
    }
    this.atasDesenharLista();
  },
  // sem o limite de 30 dias da agenda: periodo escolhido (padrao 3 meses), so o que ja aconteceu
  async carregarAtas() {
    const F = this._atasF || {}; const per = F.per || '3';
    let q = sb.from('eventos').select(this.SEL_EV).lte('data', hojeLocal()).order('data', { ascending: false }).order('hora', { ascending: false });
    if (per !== 'tudo') {
      const d = new Date(hojeLocal() + 'T12:00:00'); d.setMonth(d.getMonth() - parseInt(per, 10));
      q = q.gte('data', d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'));
    }
    const { data, error } = await q;
    this._atasErro = error ? error.message : '';
    let l = data || [];
    l = await ESCOPO.apls(l, 'profissional_id', true);
    if (ehEquipe()) { const eu = window.CORTEX_SESSAO.user.id; l = l.filter(e => !e.profissional_id || e.profissional_id === eu || this.quemPreenche(e) === eu); }
    this.atas = l; this._atasPer = per;
  },
  atasDesenharLista() {
    const alvo = document.getElementById('atas-lista'); if (!alvo) return;
    const F = this._atasF || {}, b = (F.busca || '').toLowerCase().trim();
    const texto = e => [e.titulo, e.paciente && e.paciente.nome, e.profissional && e.profissional.nome].concat(e.ata ? [e.ata.presentes, e.ata.pauta, e.ata.deliberacoes, e.ata.encaminhamentos, e.ata.lavrada_por] : [])
      .filter(Boolean).join(' ').toLowerCase();
    const l = (this.atas || []).filter(e => (!F.tipo || e.tipo === F.tipo) && (!F.sit || (F.sit === 'lavrada' ? !!e.ata : !e.ata)) && (!b || texto(e).includes(b)));
    if (!l.length) {
      alvo.innerHTML = this._atasErro ? '<p class="sub">Nao consegui buscar as ATAs: ' + escaparHtml(this._atasErro) + '</p>'
        : '<div class="vazio"><div class="simbolo-vazio">&#128221;</div><strong>Nenhuma ATA</strong>' +
          (b || F.tipo || F.sit ? 'Nenhuma ATA com esse filtro.' : 'Use + Nova ATA para registrar uma supervisao ou reuniao.') + '</div>';
      return;
    }
    alvo.innerHTML = '<div class="atas-linha atas-cab"><div>Data</div><div>Tipo</div><div>Assunto</div><div>Participacao</div><div>Lavrada por</div><div>Situacao</div><div></div></div>' +
      l.map(e => this.linhaAta(e)).join('');
  },
  linhaAta(e) {
    const s = this.sitAta(e), pode = this.podeAta(e);
    const sit = s === 'lavrada' ? '<span class="selo selo-ok">lavrada</span>' : s === 'atrasada' ? '<span class="selo selo-bad">atrasada</span>'
      : s === 'hoje' ? '<span class="selo selo-neutro">abre as ' + e.hora.slice(0, 5) + '</span>' : '<span class="selo selo-warn">a preencher</span>';
    const ac = s === 'lavrada'
      ? '<button class="btn-chip cheio" onclick="MODULOS.eventos.docAta(\'' + e.id + '\')">Ver</button>' + (pode ? '<button class="btn-chip" onclick="MODULOS.eventos.abrirAta(\'' + e.id + '\')">Editar</button>' : '')
      : (pode ? '<button class="btn-chip cheio" onclick="MODULOS.eventos.abrirAta(\'' + e.id + '\')">&#9998; Preencher</button>' : '');
    const sub = [e.paciente ? escaparHtml(e.paciente.nome) : (!e.profissional_id ? 'Equipe toda' : ''), e.origem === 'ata' ? 'sem agendar' : ''].filter(Boolean).join(' &middot; ');
    return '<div class="atas-linha"><div><b>' + this.fmtData(e.data) + '</b><small>' + (e.hora ? e.hora.slice(0, 5) : '') + '</small></div>' +
      '<div>' + this.tipoIc(e.tipo) + ' ' + this.tipoRot(e.tipo) + '</div>' +
      '<div><b>' + escaparHtml(e.titulo) + '</b>' + (sub ? '<small>' + sub + '</small>' : '') + '</div>' +
      '<div><span class="atas-rot">Participacao: </span>' + (e.profissional ? escaparHtml(e.profissional.nome) : 'Equipe toda') + '</div>' +
      '<div><span class="atas-rot">Lavrada por: </span>' + (e.ata ? escaparHtml(e.ata.lavrada_por || '') : '&mdash;') + '</div>' +
      '<div>' + sit + '</div><div class="atas-acoes">' + ac + '</div></div>';
  },

  // ── Painel da ATA ──
  async abrirAta(id, auto) {
    if (document.getElementById('ata-painel')) return;
    const { data: e, error } = await sb.from('eventos').select(this.SEL_EV).eq('id', id).maybeSingle();
    if (error || !e) { if (!auto) popAviso('Nao encontrei esta supervisao ou reuniao' + (error ? ': ' + error.message : '.')); return; }
    if (!this.podeAta(e)) { if (!auto) popAviso('A ATA deste evento e lavrada pela coordenacao ou pela aplicadora que participa dele.'); return; }
    if (auto && e.ata) return;   // alguem ja lavrou
    let pre = null;
    if (e.tipo === 'supervisao') {
      const { data: ps } = await sb.from('pre_supervisoes').select('*, aplicador:profiles!pre_supervisoes_aplicador_id_fkey(nome)').eq('evento_id', id);
      const l = ps || [];
      pre = l.find(p => p.status === 'enviada') || l[0] || null;
    }
    const criador = await this.nomeDe(e.criado_por);
    await this.montarPainel({ modo: 'evento', e: e, pre: pre, auto: !!auto, criador: criador });
  },
  async novaAta() {
    if (!this.podeLavrar()) { popAviso('Seu perfil nao lavra ATA.'); return; }
    if (document.getElementById('ata-painel')) return;
    await this.montarPainel({ modo: 'nova' });
  },
  presentesSugeridos(e, criador) {
    const l = [];
    const add = n => { n = (n || '').trim(); if (n && !l.includes(n)) l.push(n); };
    add(criador);
    if (e && e.profissional) add(e.profissional.nome);
    add(window.CORTEX_SESSAO.profile.nome);
    return l.join(', ');
  },
  // a pauta ja nasce da estrutura de pre-supervisao (texto do documento: com acentos)
  pautaDaEstrutura(p) {
    if (!p) return '';
    const um = t => String(t || '').replace(/\s*\n+\s*/g, '; ').trim();
    const l = [];
    if (p.programas) l.push('Programas atuais: ' + um(p.programas));
    if (p.evolucao) l.push('Evolução observada: ' + um(p.evolucao));
    if (p.comportamentos) l.push('Comportamentos interferentes: ' + um(p.comportamentos));
    if (p.dificuldades) l.push('Dificuldades da aplicadora: ' + um(p.dificuldades));
    return l.map((x, i) => (i + 1) + '. ' + x).join('\n');
  },
  htmlEstr(p) {
    if (!p) return '<h4>Estrutura de pre-supervisao</h4><div class="ata-estr-vazia">A aplicadora nao enviou a estrutura desta supervisao. Escreva a pauta direto na ATA.</div>';
    const quando = p.enviada_em ? this.dataHora(p.enviada_em) : 'ainda nao enviada';
    return '<h4>Estrutura ' + (p.status === 'enviada' ? 'enviada' : 'em rascunho') + ' por ' + escaparHtml(this.primeiro(p.aplicador ? p.aplicador.nome : '')) + '</h4>' +
      '<p class="ata-estr-sub">' + quando + ' &middot; so leitura</p>' +
      this.PRE_CAMPOS.filter(([k]) => p[k]).map(([k, rot]) => '<div class="ata-bloco"><b>' + rot.replace(/^\d+\)\s*/, '').replace(/\s*\(se houver\)/, '') + '</b>' +
        escaparHtml(p[k]).replace(/\n/g, '<br>') + '</div>').join('') +
      '<button type="button" class="btn-chip ata-usar" onclick="MODULOS.eventos.ataUsarEstrutura()">&#8595; Usar de novo na pauta</button>';
  },
  async montarPainel(o) {
    const sess = window.CORTEX_SESSAO, eu = sess.user.id, meuNome = sess.profile.nome;
    const nova = o.modo === 'nova', e = o.e || {}, a = e.ata || {};
    const hoje = hojeLocal();
    o.chave = 'cortex_ata_rasc_' + (nova ? 'nova' : e.id) + '_' + eu;
    let r = null; try { r = JSON.parse(localStorage.getItem(o.chave) || 'null'); } catch (x) { r = null; }
    if (r && a.lavrada_em && r.ts && r.ts < Date.parse(a.lavrada_em)) r = null;   // rascunho mais velho que a ATA gravada
    o.rasc = r;
    this._painel = o;

    // ATA nova: lista de criancas e da equipe
    if (nova) {
      let pacs = this.pacientes;
      if (!pacs) {
        const { data } = await sb.from('pacientes').select('id, nome, data_nascimento, aplicador_id').neq('status', 'encerrado').order('nome');
        pacs = data || [];
        if (ehEquipe()) { const meus = await meusPacientesIds(true); pacs = pacs.filter(p => meus.has(p.id)); }
        else pacs = await ESCOPO.pacs(pacs, 'id');
      }
      o.pacs = pacs;
      if (!ehEquipe()) {
        let eq = this.equipe;
        if (!eq) { const { data } = await sb.from('profiles').select('id, nome, perfil, coordenador_id').eq('ativo', true).neq('perfil', 'familia').order('nome'); eq = data || []; }
        o.equipe = eq;
      }
    }
    const val = (k, padrao) => r && r[k] !== undefined ? r[k] : padrao;
    const presentes = val('presentes', a.presentes || (nova ? meuNome : this.presentesSugeridos(e, o.criador)));
    const daEstr = !r && !a.pauta && !!o.pre;
    const pauta = val('pauta', a.pauta || this.pautaDaEstrutura(o.pre));
    const s = nova ? '' : this.sitAta(e);
    const rotTipo = t => t === 'supervisao' ? 'supervisao' : t === 'reuniao_pais' ? 'reuniao com pais' : 'reuniao';
    const titulo = nova ? 'Nova ATA' : 'ATA da ' + rotTipo(e.tipo) + ' &middot; ' + escaparHtml(e.paciente ? e.paciente.nome.split(' ').slice(0, 2).join(' ') : e.titulo);
    const selo = nova ? '<span class="selo selo-neutro">sem agendar</span>'
      : s === 'lavrada' ? '<span class="selo selo-ok">lavrada por ' + escaparHtml(this.primeiro(a.lavrada_por)) + '</span>'
      : s === 'atrasada' ? '<span class="selo selo-bad">atrasada</span>'
      : s === 'hoje' ? '<span class="selo selo-neutro">marcada para ' + e.hora.slice(0, 5) + '</span>'
      : '<span class="selo selo-warn">' + (e.hora ? 'comecou as ' + e.hora.slice(0, 5) : 'hoje') + '</span>';
    const caixa = (rot, v) => '<div class="caixa-info"><small>' + rot + '</small><b>' + v + '</b></div>';
    let topo = '';
    if (nova) topo = this.htmlNovaTopo(o, r);
    else {
      topo = (o.auto ? '<div class="ata-faixa"><span class="ic">&#128338;</span>A ' + rotTipo(e.tipo) + ' comecou' + (e.hora ? ' as ' + e.hora.slice(0, 5) : '') + '. Preencha a ATA durante ou logo depois.</div>' : '') +
        (a.lavrada_por && a.lavrada_por !== meuNome ? '<p class="sub" style="margin:0 0 10px">Lavrada por <b>' + escaparHtml(a.lavrada_por) + '</b> em ' + new Date(a.lavrada_em).toLocaleDateString('pt-BR') + '. Ao salvar, voce passa a constar como quem lavrou e o historico guarda as versoes.</p>' : '') +
        '<div class="ata-dados">' +
        caixa('Quando', (e.data === hoje ? 'Hoje, ' + this.fmtData(e.data).slice(0, 5) : this.fmtData(e.data)) + (e.hora ? ' as ' + e.hora.slice(0, 5) : '')) +
        caixa('Crianca', e.paciente ? escaparHtml(e.paciente.nome.split(' ').slice(0, 2).join(' ')) + (e.paciente.data_nascimento ? ' &middot; ' + this.idadeCurta(e.paciente.data_nascimento, e.data).replace(' anos e ', 'a ').replace(' meses', 'm') : '') : '&mdash;') +
        caixa('Com quem', e.profissional ? escaparHtml(e.profissional.nome) : 'Equipe toda') +
        caixa(e.origem === 'ata' ? 'Registro' : 'Agendada por', e.origem === 'ata' ? 'Sem agendar' : escaparHtml(o.criador || '') || '&mdash;') +
        '</div>';
    }
    const comEstr = !nova && e.tipo === 'supervisao';
    const fundo = document.createElement('div');
    fundo.id = 'ata-fundo'; fundo.className = 'ata-fundo';
    fundo.onclick = () => this.ataDepois();
    const g = document.createElement('aside');
    g.id = 'ata-painel'; g.className = 'ata-painel' + (comEstr ? '' : ' sem-estr');
    g.setAttribute('role', 'dialog'); g.setAttribute('aria-label', 'ATA');
    g.innerHTML = '<div class="ata-topo"><h3>&#9998; ' + titulo + '</h3>' + selo + '<button type="button" class="modal-fechar" title="Depois" onclick="MODULOS.eventos.ataDepois()">&times;</button></div>' +
      '<div class="ata-meio"><div class="ata-estr" id="ata-estr">' + (comEstr ? this.htmlEstr(o.pre) : '') + '</div>' +
      '<div class="ata-form">' + topo +
      '<div class="campo"><label>Presentes *</label><input id="ata-pres" placeholder="Nomes separados por virgula" value="' + escaparHtml(presentes) + '"></div>' +
      '<div class="campo"><label>Pauta / temas tratados *' + (daEstr ? '<span class="ata-origem" id="ata-origem">&#128203; veio da estrutura</span>' : '') + '</label>' +
      '<textarea id="ata-pauta" rows="' + Math.min(10, Math.max(5, String(pauta).split('\n').length * 2)) + '">' + escaparHtml(pauta) + '</textarea></div>' +
      '<div class="campo"><label>Deliberacoes e orientacoes</label><textarea id="ata-delib" rows="5" placeholder="O que foi decidido ou orientado...">' + escaparHtml(val('delib', a.deliberacoes || '')) + '</textarea></div>' +
      '<div class="campo"><label>Encaminhamentos (responsavel e prazo)</label><textarea id="ata-enc" rows="3" placeholder="Ex.: Ajustar o programa de imitacao - Bianca - ate 16/10">' + escaparHtml(val('enc', a.encaminhamentos || '')) + '</textarea></div>' +
      '<div class="mensagem-erro" id="ata-erro"></div></div></div>' +
      '<div class="ata-pe"><span class="sub" id="ata-rasc">' + (r ? '&#10003; rascunho de ' + escaparHtml(r.hora || '') + ' recuperado' : 'O que voce escrever fica guardado neste aparelho ate salvar.') + '</span>' +
      (r ? '<button type="button" class="btn-chip" onclick="MODULOS.eventos.ataDescartar()">Descartar rascunho</button>' : '') +
      '<button type="button" class="btn btn-fantasma" onclick="MODULOS.eventos.ataDepois()">' + (nova ? 'Cancelar' : 'Depois') + '</button>' +
      '<button type="button" class="btn btn-primario" id="ata-salvar" onclick="MODULOS.eventos.ataSalvar()">Salvar ATA</button></div>';
    document.body.appendChild(fundo);
    document.body.appendChild(g);
    requestAnimationFrame(() => { fundo.classList.add('aberta'); g.classList.add('aberta'); });
    // rascunho automatico (neste aparelho)
    g.addEventListener('input', () => { clearTimeout(this._rascT); this._rascT = setTimeout(() => this.ataGuardar(), 500); });
    this._esc = ev => { if (ev.key === 'Escape' && !document.getElementById('pop-fundo')) this.ataDepois(); };
    document.addEventListener('keydown', this._esc);
    if (nova) this.ataNovaEstr();
    setTimeout(() => { const pa = document.getElementById('ata-pauta'); const f = nova ? document.getElementById('ata-n-tit') : (pa && !pa.value.trim() ? pa : document.getElementById(o.auto ? 'ata-delib' : 'ata-pres')); if (f && window.innerWidth > 720) f.focus(); }, 260);
  },
  htmlNovaTopo(o, r) {
    const n = (r && r.nova) || {};
    const tipo = n.tipo || 'supervisao', hoje = hojeLocal();
    const agora = new Date(); agora.setMinutes(Math.floor(agora.getMinutes() / 5) * 5);
    const eu = window.CORTEX_SESSAO;
    return '<div class="grade-form ata-nova">' +
      '<div class="campo c3"><label>Tipo</label><div class="segmento" id="ata-n-tipo">' +
      [['supervisao', 'Supervisao'], ['reuniao', 'Reuniao de equipe'], ['reuniao_pais', 'Reuniao com pais']].map(([k, rot]) =>
        '<button type="button" class="seg' + (k === tipo ? ' ativo' : '') + '" data-v="' + k + '" onclick="MODULOS.eventos.ataNovaTipo(\'' + k + '\')">' + rot + '</button>').join('') + '</div></div>' +
      '<div class="campo"><label>Data *</label><input type="date" id="ata-n-data" max="' + hoje + '" value="' + (n.data || hoje) + '"></div>' +
      '<div class="campo"><label>Hora</label><input type="time" id="ata-n-hora" step="300" value="' + (n.hora !== undefined ? n.hora : this.hhmm(agora)) + '"></div>' +
      '<div class="campo"><label>Crianca <small class="sub">(opcional)</small></label><select id="ata-n-pac" onchange="MODULOS.eventos.ataNovaPac()"><option value="">Sem crianca especifica</option>' +
      (o.pacs || []).map(p => '<option value="' + p.id + '"' + (p.id === n.pac ? ' selected' : '') + '>' + escaparHtml(p.nome) + '</option>').join('') + '</select></div>' +
      '<div class="campo c2"><label>Assunto</label><input id="ata-n-tit" placeholder="Ex.: Supervisao da Alice" value="' + escaparHtml(n.tit || '') + '"' + (n.titMexeu ? ' data-mexeu="1"' : '') + ' oninput="this.dataset.mexeu = this.value ? 1 : \'\'"></div>' +
      '<div class="campo"><label>Participante</label>' + (ehEquipe()
        ? '<input value="' + escaparHtml(eu.profile.nome) + ' (voce)" readonly>'
        : '<select id="ata-n-prof"><option value="">Equipe toda</option>' + (o.equipe || []).map(m => '<option value="' + m.id + '"' + (m.id === n.prof ? ' selected' : '') + '>' + escaparHtml(m.nome) + '</option>').join('') + '</select>') + '</div>' +
      '</div><div class="ata-sep"></div>';
  },
  ataNovaTipo(k) {
    document.querySelectorAll('#ata-n-tipo .seg').forEach(b => b.classList.toggle('ativo', b.dataset.v === k));
    this.ataNovaTitulo(); this.ataNovaEstr(); this.ataGuardar();
  },
  ataNovaPac() { this.ataNovaTitulo(); this.ataNovaEstr(); this.ataGuardar(); },
  ataNovaTipoAtual() { const b = document.querySelector('#ata-n-tipo .seg.ativo'); return b ? b.dataset.v : 'supervisao'; },
  ataNovaTitulo() {
    const t = document.getElementById('ata-n-tit'); if (!t || t.dataset.mexeu === '1') return;
    const pacId = document.getElementById('ata-n-pac')?.value;
    const pac = (this._painel && this._painel.pacs || []).find(p => p.id === pacId);
    const nome = pac ? this.primeiro(pac.nome) : '';
    const tipo = this.ataNovaTipoAtual();
    t.value = tipo === 'supervisao' ? 'Supervisao' + (nome ? ' - ' + nome : '') : tipo === 'reuniao_pais' ? 'Reuniao com a familia' + (nome ? ' - ' + nome : '') : 'Reuniao de equipe';
  },
  // ATA nova de supervisao com crianca: mostra a estrutura avulsa mais recente dela (sem evento), se houver
  async ataNovaEstr() {
    const o = this._painel; const g = document.getElementById('ata-painel'); if (!o || !g) return;
    const pacId = document.getElementById('ata-n-pac')?.value;
    let pre = null;
    if (pacId && this.ataNovaTipoAtual() === 'supervisao') {
      const { data } = await sb.from('pre_supervisoes').select('*, aplicador:profiles!pre_supervisoes_aplicador_id_fkey(nome)')
        .eq('paciente_id', pacId).is('evento_id', null).gte('data', this.diaMais(-10)).lte('data', this.diaMais(3)).order('data', { ascending: false }).limit(1);
      pre = (data || []).find(p => p.paciente_id === pacId && !p.evento_id) || null;
    }
    o.pre = pre;
    g.classList.toggle('sem-estr', !pre);
    document.getElementById('ata-estr').innerHTML = pre ? this.htmlEstr(pre) : '';
    const pa = document.getElementById('ata-pauta');
    if (pre && pa && !pa.value.trim()) pa.value = this.pautaDaEstrutura(pre);
  },
  async ataUsarEstrutura() {
    const o = this._painel; const pa = document.getElementById('ata-pauta'); if (!o || !o.pre || !pa) return;
    const novo = this.pautaDaEstrutura(o.pre);
    if (pa.value.trim() && pa.value.trim() !== novo && !await popConfirmar('Trocar o texto da pauta pelo que veio da estrutura?')) return;
    pa.value = novo; this.ataGuardar();
  },
  ataGuardar() {
    const o = this._painel; if (!o || !document.getElementById('ata-painel')) return;
    const v = id => document.getElementById(id) ? document.getElementById(id).value : undefined;
    const r = { presentes: v('ata-pres'), pauta: v('ata-pauta'), delib: v('ata-delib'), enc: v('ata-enc'), ts: Date.now(), hora: this.hhmm() };
    if (o.modo === 'nova') {
      const t = document.getElementById('ata-n-tit');
      r.nova = { tipo: this.ataNovaTipoAtual(), data: v('ata-n-data'), hora: v('ata-n-hora'), pac: v('ata-n-pac'), tit: v('ata-n-tit'), titMexeu: !!(t && t.dataset.mexeu === '1'), prof: v('ata-n-prof') };
    }
    try { localStorage.setItem(o.chave, JSON.stringify(r)); } catch (x) { return; }
    const el = document.getElementById('ata-rasc'); if (el) el.innerHTML = '&#10003; rascunho salvo ' + r.hora;
  },
  async ataDescartar() {
    const o = this._painel; if (!o) return;
    if (!await popConfirmar('Apagar o rascunho desta ATA? O que nao foi salvo se perde.')) return;
    try { localStorage.removeItem(o.chave); } catch (x) {}
    const modo = o.modo, id = o.e && o.e.id;
    this.fecharPainel();
    if (modo === 'nova') this.novaAta(); else this.abrirAta(id);
  },
  fecharPainel() {
    clearTimeout(this._rascT);
    document.removeEventListener('keydown', this._esc || (() => {}));
    const f = document.getElementById('ata-fundo'), g = document.getElementById('ata-painel');
    if (f) f.classList.remove('aberta'); if (g) g.classList.remove('aberta');
    setTimeout(() => { f?.remove(); g?.remove(); }, 180);
    this._painel = null;
  },
  // "Depois": fecha; o rascunho fica no aparelho e a ATA continua no sino ate ser salva
  ataDepois() {
    if (this._painel && document.getElementById('ata-painel')) {
      const v = id => (document.getElementById(id)?.value || '').trim();
      if (v('ata-delib') || v('ata-enc') || this._painel.rasc) this.ataGuardar();
    }
    this.fecharPainel();
    try { MODULOS.avisos && MODULOS.avisos.carregar(); } catch (x) {}
  },
  ataNovaDados() {
    const v = id => (document.getElementById(id)?.value || '').trim();
    const tipo = this.ataNovaTipoAtual(), data = v('ata-n-data');
    if (!data) return { erro: 'Escolha a data.' };
    if (data > hojeLocal()) return { erro: 'A ATA e de algo que ja aconteceu: a data nao pode ser futura.' };
    if (!v('ata-n-tit')) this.ataNovaTitulo();
    return {
      tipo: tipo, data: data, hora: v('ata-n-hora') || null, paciente_id: v('ata-n-pac') || null,
      titulo: v('ata-n-tit') || (tipo === 'supervisao' ? 'Supervisao' : tipo === 'reuniao_pais' ? 'Reuniao com pais' : 'Reuniao de equipe'),
      profissional_id: ehEquipe() ? window.CORTEX_SESSAO.user.id : (v('ata-n-prof') || null)
    };
  },
  async ataSalvar() {
    const o = this._painel; if (!o) return;
    const erro = document.getElementById('ata-erro'); erro.classList.remove('visivel');
    const falha = msg => { erro.textContent = msg; erro.classList.add('visivel'); const b = document.getElementById('ata-salvar'); if (b) { b.disabled = false; b.textContent = 'Salvar ATA'; } };
    const v = id => (document.getElementById(id)?.value || '').trim();
    const sess = window.CORTEX_SESSAO, eu = sess.user.id;
    const anterior = (o.e && o.e.ata) || null;
    const ata = {
      presentes: v('ata-pres'), pauta: v('ata-pauta'), deliberacoes: v('ata-delib'), encaminhamentos: v('ata-enc'),
      lavrada_por: sess.profile.nome, lavrada_por_id: eu, lavrada_perfil: ehEquipe() ? 'aplicador' : 'coordenacao',
      lavrada_em: new Date().toISOString(),
      // historico: quem mexeu e quando (a primeira lavratura fica guardada)
      historico: ((anterior && anterior.historico) || []).concat(anterior && anterior.lavrada_por
        ? [{ por: anterior.lavrada_por, perfil: anterior.lavrada_perfil || 'coordenacao', em: anterior.lavrada_em }] : []).slice(-20)
    };
    if (!ata.presentes || !ata.pauta) { falha('Preencha presentes e pauta.'); return; }
    let ev = null;
    if (o.modo === 'nova') { ev = this.ataNovaDados(); if (ev.erro) { falha(ev.erro); return; } }
    const b = document.getElementById('ata-salvar'); b.disabled = true; b.textContent = 'Salvando...';
    let id = o.e && o.e.id;
    const titulo = ev ? ev.titulo : o.e.titulo, data = ev ? ev.data : o.e.data;
    if (ev) {
      const r = await sb.rpc('fn_ata_avulsa', { p_evento: ev, p_ata: ata });
      if (r.error) {
        const semSql = /fn_ata_avulsa|PGRST202|Could not find the function/i.test((r.error.message || '') + ' ' + (r.error.code || ''));
        if (!(semSql && this.ehGestao())) { falha(semSql ? 'Falta rodar o SQL do patch 43 no Supabase (funcao fn_ata_avulsa).' : r.error.message); return; }
        // gestao sem o SQL novo: cria o evento e lavra pela funcao antiga
        const ins = await sb.from('eventos').insert(Object.assign({ criado_por: eu }, ev)).select('id').single();
        if (ins.error) { falha(ins.error.message); return; }
        id = ins.data.id;
        const l = await sb.rpc('fn_lavrar_ata', { p_evento: id, p_ata: ata });
        if (l.error) { falha(l.error.message); return; }
      } else id = r.data;
    } else {
      const { error } = await sb.rpc('fn_lavrar_ata', { p_evento: id, p_ata: ata });
      if (error) { falha(error.message); return; }
    }
    try { localStorage.removeItem(o.chave); } catch (x) {}
    this.fecharPainel();
    if (ehEquipe()) {
      try {
        const coords = await this.coordsResponsaveis();
        if (coords.length) await sb.from('notificacoes').insert(coords.map(c => ({ destinatario_id: c, titulo: 'ATA de supervisao lavrada',
          corpo: sess.profile.nome.split(' ')[0] + ' lavrou a ATA de "' + (titulo || '') + '" (' + this.fmtData(data) + ').' })));
      } catch (x) { /* aviso e opcional */ }
    }
    if (document.getElementById('ev-lista')) { await this.carregar(); this.atas = null; this.desenhar(); }
    if (this._hojeCache) this._hojeCache.lista = this._hojeCache.lista.filter(x => x.id !== id);
    try { MODULOS.avisos && MODULOS.avisos.carregar(); } catch (x) {}
    this.docAta(id);
  },

  async docAta(id) {
    let e = (this.lista || []).concat(this.atas || []).find(x => x.id === id && x.ata);
    if (!e) { const r = await sb.from('eventos').select(this.SEL_EV).eq('id', id).maybeSingle(); e = r.data; }
    if (!e || !e.ata) { popAviso('ATA nao encontrada.'); return; }
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
           (e.hora ? ' &agrave;s ' + e.hora.slice(0, 5) : '') + '</b></div>' +
      '  <div><small>Participa&ccedil;&atilde;o</small><b>' + (e.profissional ? escaparHtml(e.profissional.nome) : 'Equipe') + '</b></div>' +
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

  // ATAs da crianca na pasta dela (aba Documentos)
  async blocoAtasPaciente(pacienteId) {
    const alvo = document.getElementById('pac-atas'); if (!alvo) return;
    if (perm('eventos') === '') { alvo.innerHTML = ''; return; }
    const { data, error } = await sb.from('eventos').select('id, tipo, titulo, data, hora, ata, origem, paciente_id, profissional:profiles!eventos_profissional_id_fkey(nome)')
      .eq('paciente_id', pacienteId).not('ata', 'is', null).order('data', { ascending: false });
    const l = (data || []).filter(e => e.ata && e.paciente_id === pacienteId);
    if (error || !l.length) { alvo.innerHTML = ''; return; }
    alvo.innerHTML = '<div class="cartao"><h3>ATAs de supervisao e reunioes <span class="selo selo-neutro">' + l.length + '</span></h3>' +
      l.map(e => '<div class="linha-doc"><div><b>' + escaparHtml(e.titulo) + '</b><small>' + this.fmtData(e.data) + (e.hora ? ' as ' + e.hora.slice(0, 5) : '') + ' &middot; ' + this.tipoRot(e.tipo) +
        (e.profissional ? ' &middot; ' + escaparHtml(e.profissional.nome) : '') + ' &middot; lavrada por ' + escaparHtml(e.ata.lavrada_por || '') + '</small></div>' +
        '<button class="btn-chip cheio" onclick="MODULOS.eventos.docAta(\'' + e.id + '\')">Ver ATA</button></div>').join('') + '</div>';
  },

  // ── Vigia: na hora da supervisao a ATA abre sozinha para quem preenche (uma vez por dia) ──
  // Nao interrompe: espera fechar ficha, documento, janela ou a gaveta de avisos, e quem estiver digitando.
  iniciarVigia() {
    if (!window.CORTEX_SESSAO || !this.podeLavrar()) return;
    clearInterval(this._vigia);
    if (!this._teclaOuvida) {
      this._teclaOuvida = true;
      window.addEventListener('keydown', () => { this._ultTecla = Date.now(); }, { passive: true, capture: true });
    }
    setTimeout(() => this.vigiar().catch(() => null), 5000);
    this._vigia = setInterval(() => this.vigiar().catch(() => null), 30000);
  },
  async vigiar() {
    if (document.hidden) return;
    const hoje = hojeLocal(), eu = window.CORTEX_SESSAO.user.id;
    const C = this._hojeCache;
    if (!C || C.dia !== hoje || Date.now() - C.em > 5 * 60000) {
      const { data, error } = await sb.from('eventos').select('*').eq('data', hoje).is('ata', null);
      if (error) return;
      this._hojeCache = { dia: hoje, em: Date.now(), lista: (data || []).filter(e => e.data === hoje && !e.ata && this.quemPreenche(e) === eu) };
    }
    let vistos = {}; try { vistos = JSON.parse(localStorage.getItem('cortex_ata_auto') || '{}'); } catch (x) { vistos = {}; }
    const agora = this.hhmm();
    const alvo = this._hojeCache.lista.find(e => vistos[e.id] !== hoje && (!e.hora || e.hora.slice(0, 5) <= agora));
    if (!alvo) return;
    if (document.querySelector('.folha-overlay, #modal-fundo, #pop-fundo, #ata-painel, #avisos-gaveta, .trava-overlay, body.travado')) return;
    const ativo = document.activeElement;
    if (ativo && /^(INPUT|TEXTAREA|SELECT)$/.test(ativo.tagName) && Date.now() - (this._ultTecla || 0) < 20000) return;
    Object.keys(vistos).forEach(k => { if (vistos[k] !== hoje) delete vistos[k]; });
    vistos[alvo.id] = hoje;
    try { localStorage.setItem('cortex_ata_auto', JSON.stringify(vistos)); } catch (x) {}
    this._hojeCache.lista = this._hojeCache.lista.filter(x => x.id !== alvo.id);
    await this.abrirAta(alvo.id, true);
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

    // patch 43: ATAs sem preencher. Quem preenche ve cada uma (hoje depois do horario, ou atrasada);
    // a gestao ve o total das atrasadas da equipe (ultimos 30 dias)
    let ataMinhas = [], ataEquipe = [];
    try {
      const { data: sem } = await sb.from('eventos').select('*').gte('data', dia(-30)).lte('data', hoje).is('ata', null).order('data').order('hora');
      const gestao = this.ehGestao();
      (sem || []).filter(e => !e.ata).forEach(e => {
        const s = this.sitAta(e);
        if (s !== 'agora' && s !== 'atrasada') return;
        if (this.quemPreenche(e) === eu) {
          let rasc = false; try { rasc = !!localStorage.getItem('cortex_ata_rasc_' + e.id + '_' + eu); } catch (x) {}
          ataMinhas.push(Object.assign({}, e, { atrasada: s === 'atrasada', rasc: rasc }));
        } else if (gestao && s === 'atrasada') ataEquipe.push(e);
      });
      if (gestao) ataEquipe = await ESCOPO.apls(ataEquipe, 'profissional_id', true);
    } catch (x) { /* aviso e opcional */ }
    return { hoje, amanha, meus, preFalta, venc, minhasDem, parabens, ataMinhas, ataEquipe };
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
