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

  podeE() { return ['direcao', 'coordenador'].includes(window.CORTEX_SESSAO.profile.perfil); },

  async render(el) {
    this.el = el;
    el.innerHTML =
      '<div class="pagina-cabecalho">' +
      '  <div><h2>Supervisao e reunioes</h2>' +
      '  <p class="sub">Agenda da equipe. Quem participa recebe o aviso ao abrir o sistema no dia e na vespera.</p></div>' +
      (this.podeE()
        ? '<button class="btn btn-primario" onclick="MODULOS.eventos.modalEvento()">+ Agendar</button>' : '') +
      '</div>' +
      '<div id="ev-lista"><div class="cartao"><p class="sub">Carregando...</p></div></div>';
    await this.carregar();
    this.desenhar();
  },

  async carregar() {
    const corte = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const [rE, rP] = await Promise.all([
      sb.from('eventos').select('*, profissional:profiles!eventos_profissional_id_fkey(nome)')
        .gte('data', corte).order('data').order('hora'),
      sb.from('profiles').select('id, nome').eq('ativo', true).neq('perfil', 'familia').order('nome')
    ]);
    this.lista = rE.data || [];
    this.equipe = rP.data || [];
  },

  desenhar() {
    const alvo = document.getElementById('ev-lista');
    const hoje = new Date().toISOString().slice(0, 10);
    const fut = this.lista.filter(e => e.data >= hoje);
    const pas = this.lista.filter(e => e.data < hoje).reverse();

    const linha = e =>
      '<div class="linha-doc"><div><b>' +
      (e.tipo === 'supervisao' ? '&#128204; Supervisao' : '&#128101; Reuniao') +
      ' &middot; ' + escaparHtml(e.titulo) + '</b>' +
      '<small>' + e.data.split('-').reverse().join('/') + (e.hora ? ' as ' + e.hora.slice(0, 5) : '') +
      ' &middot; ' + (e.profissional ? escaparHtml(e.profissional.nome) : 'Equipe toda') +
      (e.ata ? ' &middot; ATA registrada' : '') + '</small></div>' +
      '<div class="pac-selos">' +
      (e.ata ? '<button class="btn-chip cheio" onclick="MODULOS.eventos.docAta(\'' + e.id + '\')">Ver ATA</button>' : '') +
      (this.podeE()
        ? '<button class="btn-chip" onclick="MODULOS.eventos.modalAta(\'' + e.id + '\')">' + (e.ata ? 'Editar ATA' : 'Lavrar ATA') + '</button>' +
          '<button class="btn-chip" onclick="MODULOS.eventos.modalEvento(\'' + e.id + '\')">Editar</button>'
        : '') +
      '</div></div>';

    alvo.innerHTML =
      '<div class="cartao"><h3>Proximos <span class="selo selo-neutro">' + fut.length + '</span></h3>' +
      (fut.length ? fut.map(linha).join('') : '<p class="sub">Nada agendado. Use + Agendar.</p>') + '</div>' +
      (pas.length
        ? '<div class="cartao"><h3>Ultimos 30 dias</h3>' + pas.map(linha).join('') + '</div>' : '');
  },

  // ─────────────── Agendar / editar ───────────────

  modalEvento(id) {
    const e = id ? this.lista.find(x => x.id === id) : null;
    abrirModal(e ? 'Editar' : 'Agendar supervisao ou reuniao',
      '<div class="grade-form">' +
      '  <div class="campo"><label>Tipo</label><select id="ev-tipo">' +
      '    <option value="supervisao"' + (!e || e.tipo === 'supervisao' ? ' selected' : '') + '>Supervisao</option>' +
      '    <option value="reuniao"' + (e && e.tipo === 'reuniao' ? ' selected' : '') + '>Reuniao</option>' +
      '  </select></div>' +
      '  <div class="campo c2"><label>Assunto *</label>' +
      '    <input id="ev-titulo" placeholder="Ex.: Supervisao dos programas do Miguel" value="' +
           escaparHtml(e ? e.titulo : '') + '"></div>' +
      '  <div class="campo"><label>Data *</label>' +
      '    <input type="date" id="ev-data" value="' + (e ? e.data : new Date().toISOString().slice(0, 10)) + '"></div>' +
      '  <div class="campo"><label>Hora</label>' +
      '    <input type="time" id="ev-hora" step="300" value="' + (e && e.hora ? e.hora.slice(0, 5) : '') + '"></div>' +
      '  <div class="campo"><label>Com quem</label><select id="ev-prof">' +
      '    <option value="">Equipe toda</option>' +
      this.equipe.map(m => '<option value="' + m.id + '"' +
        (e && e.profissional_id === m.id ? ' selected' : '') + '>' + escaparHtml(m.nome) + '</option>').join('') +
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
      profissional_id: document.getElementById('ev-prof').value || null
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
    if (!confirm('Excluir este evento?')) return;
    await sb.from('eventos').delete().eq('id', id);
    fecharModal();
    await this.carregar();
    this.desenhar();
  },

  // ─────────────── ATA ───────────────

  modalAta(id) {
    const e = this.lista.find(x => x.id === id);
    if (!e) return;
    const a = e.ata || {};
    abrirModal('ATA &middot; ' + escaparHtml(e.titulo),
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
    const ata = {
      presentes: document.getElementById('ata-pres').value.trim(),
      pauta: document.getElementById('ata-pauta').value.trim(),
      deliberacoes: document.getElementById('ata-delib').value.trim(),
      encaminhamentos: document.getElementById('ata-enc').value.trim(),
      lavrada_por: window.CORTEX_SESSAO.profile.nome,
      lavrada_em: new Date().toISOString()
    };
    if (!ata.presentes || !ata.pauta) {
      erro.textContent = 'Preencha presentes e pauta.'; erro.classList.add('visivel'); return;
    }
    const { error } = await sb.from('eventos').update({ ata: ata }).eq('id', id);
    if (error) { erro.textContent = error.message; erro.classList.add('visivel'); return; }
    fecharModal();
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
      '  <div class="deq-ass"><span></span>Respons&aacute;vel pela supervis&atilde;o</div>' +
      '  <div class="deq-ass"><span></span>' + escaparHtml(a.lavrada_por || '') + '<br>Lavrou a ATA em ' +
           new Date(a.lavrada_em).toLocaleDateString('pt-BR') + '</div>' +
      '</div>' +
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

  async popupAvisos() {
    const eu = window.CORTEX_SESSAO.user.id;
    const perfil = window.CORTEX_SESSAO.profile.perfil;
    const hoje = new Date().toISOString().slice(0, 10);
    const amanha = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

    const { data: evs } = await sb.from('eventos')
      .select('tipo, titulo, data, hora, profissional_id')
      .in('data', [hoje, amanha]).order('data').order('hora');
    const meus = (evs || []).filter(e => !e.profissional_id || e.profissional_id === eu);

    let venc = [];
    if (['direcao', 'coordenador'].includes(perfil)) {
      venc = await this.avaliacoesVencendo();
    }
    if (!meus.length && !venc.length) return;

    let html = '';
    if (meus.length) {
      html += '<p class="sub" style="margin-bottom:6px"><b>Supervisoes e reunioes:</b></p>' +
        meus.map(e =>
          '<div class="linha-doc"><span><b>' + (e.tipo === 'supervisao' ? '&#128204;' : '&#128101;') + ' ' +
          escaparHtml(e.titulo) + '</b><small>' +
          (e.data === hoje ? 'HOJE' : 'Amanha') + (e.hora ? ' as ' + e.hora.slice(0, 5) : '') +
          '</small></span></div>').join('');
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
      sb.from('pacientes').select('id, nome').eq('status', 'ativo')
    ]);
    const meses = parseInt(rCfg.data ? rCfg.data.valor : '6', 10) || 6;
    const nomes = {};
    (rPac.data || []).forEach(p => { nomes[p.id] = p.nome; });

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
        saida.push({ nome: nomes[pac], protocolo: proto, dias: dias,
          rotulo: 'ultima em ' + new Date(quando).toLocaleDateString('pt-BR') +
            ' &middot; validade ' + meses + ' meses' });
      }
    });
    return saida.sort((a, b) => a.dias - b.dias);
  }
};
