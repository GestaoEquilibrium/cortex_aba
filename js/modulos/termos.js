// ============================================================================
// CORTEX aba - js/modulos/termos.js
// Termos digitais: a clinica publica termos (consentimento, uso de imagem,
// LGPD...) e a familia le e aceita pelo portal, "assinando" com o nome
// completo. Aqui dentro: gestao dos modelos + painel de quem aceitou.
// ============================================================================

window.MODULOS = window.MODULOS || {};

window.MODULOS.termos = {

  el: null,
  lista: [],

  podeE() { return perm('termos') === 'E'; },

  async render(el) {
    this.el = el;
    el.innerHTML =
      '<div class="pagina-cabecalho">' +
      '  <div><h2>Termos digitais</h2>' +
      '  <p class="sub">Consentimentos e autorizacoes aceitos pela familia no portal.</p></div>' +
      (this.podeE()
        ? '<button class="btn btn-primario" onclick="MODULOS.termos.modalTermo()">+ Novo termo</button>'
        : '') +
      '</div>' +
      '<div id="tm-lista"><div class="cartao"><p class="sub">Carregando...</p></div></div>';

    await this.carregar();
    this.desenhar();
  },

  async carregar() {
    const [{ data: termos }, { data: aceites }, { data: pacs }] = await Promise.all([
      sb.from('termos').select('*').order('criado_em'),
      sb.from('termo_aceites').select('termo_id, paciente_id, nome_confirmado, aceito_em'),
      sb.from('pacientes').select('id, nome').neq('status', 'encerrado').order('nome')
    ]);
    this.lista = termos || [];
    this.aceites = aceites || [];
    this.pacientes = pacs || [];
  },

  desenhar() {
    const alvo = document.getElementById('tm-lista');
    if (this.lista.length === 0) {
      alvo.innerHTML = '<div class="cartao"><div class="vazio">' +
        '<div class="simbolo-vazio">&#128196;</div><strong>Nenhum termo criado</strong>' +
        'Crie o primeiro (ex.: Termo de consentimento, Autorizacao de uso de imagem).</div></div>';
      return;
    }

    alvo.innerHTML = this.lista.map(t => {
      const doTermo = this.aceites.filter(a => a.termo_id === t.id);
      const aceitos = new Set(doTermo.map(a => a.paciente_id));
      const pendentes = t.ativo
        ? this.pacientes.filter(p => !aceitos.has(p.id))
        : [];

      return '<div class="cartao' + (t.ativo ? '' : '" style="opacity:.65') + '">' +
        '<div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px">' +
        '<div><h3 style="margin:0">' + escaparHtml(t.titulo) + '</h3>' +
        '<p class="sub">' + doTermo.length + ' aceite(s)' +
        (t.ativo ? ' &middot; ' + pendentes.length + ' pendente(s)' : ' &middot; termo inativo') + '</p></div>' +
        '<div class="pac-selos">' +
        (t.ativo ? '<span class="selo selo-ok">No portal</span>' : '<span class="selo selo-neutro">Inativo</span>') +
        '<button class="btn-chip" onclick="MODULOS.termos.verAceites(\'' + t.id + '\')">Aceites</button>' +
        (this.podeE() ? '<button class="btn-chip" onclick="MODULOS.termos.modalTermo(\'' + t.id + '\')">Editar</button>' : '') +
        '</div></div>' +
        (t.ativo && pendentes.length
          ? '<p class="sub" style="margin-top:8px"><b>Aguardando:</b> ' +
            escaparHtml(pendentes.slice(0, 8).map(p => p.nome.split(' ')[0]).join(', ')) +
            (pendentes.length > 8 ? ' e mais ' + (pendentes.length - 8) : '') + '</p>'
          : '') +
        '</div>';
    }).join('');
  },

  modalTermo(id) {
    const t = id ? this.lista.find(x => x.id === id) : null;
    abrirModal(t ? 'Editar termo' : 'Novo termo',
      '<div class="grade-form">' +
      '  <div class="campo c2"><label>Titulo *</label>' +
      '    <input id="tm-titulo" value="' + escaparHtml(t ? t.titulo : '') + '"></div>' +
      '  <div class="campo"><label>Situacao</label><select id="tm-ativo">' +
      '    <option value="true"' + (!t || t.ativo ? ' selected' : '') + '>Ativo (aparece no portal)</option>' +
      '    <option value="false"' + (t && !t.ativo ? ' selected' : '') + '>Inativo</option>' +
      '  </select></div>' +
      '  <div class="campo c3"><label>Texto do termo *</label>' +
      '    <textarea id="tm-texto" rows="12" style="resize:vertical">' +
      escaparHtml(t ? t.texto : '') + '</textarea></div>' +
      '</div>' +
      '<p class="sub">Atencao: alterar o texto de um termo ja aceito nao invalida os aceites antigos ' +
      '(cada aceite guarda a data). Para mudancas relevantes, crie um termo novo e inative o antigo.</p>' +
      '<div class="mensagem-erro" id="tm-erro"></div>' +
      '<div class="barra-acoes">' +
      '  <button class="btn btn-fantasma" onclick="fecharModal()">Cancelar</button>' +
      '  <button class="btn btn-primario" onclick="MODULOS.termos.salvar(' +
      (t ? '\'' + t.id + '\'' : 'null') + ')">Salvar</button>' +
      '</div>', true);
  },

  async salvar(id) {
    const erro = document.getElementById('tm-erro');
    erro.classList.remove('visivel');
    const dados = {
      titulo: document.getElementById('tm-titulo').value.trim(),
      texto: document.getElementById('tm-texto').value.trim(),
      ativo: document.getElementById('tm-ativo').value === 'true'
    };
    if (!dados.titulo || !dados.texto) {
      erro.textContent = 'Preencha titulo e texto.';
      erro.classList.add('visivel');
      return;
    }
    const q = id
      ? sb.from('termos').update(dados).eq('id', id)
      : sb.from('termos').insert(dados);
    const { error } = await q;
    if (error) { erro.textContent = error.message; erro.classList.add('visivel'); return; }
    fecharModal();
    await this.carregar();
    this.desenhar();
  },

  verAceites(termoId) {
    const t = this.lista.find(x => x.id === termoId);
    const doTermo = this.aceites.filter(a => a.termo_id === termoId)
      .sort((a, b) => new Date(b.aceito_em) - new Date(a.aceito_em));
    const nomePac = id => {
      const p = this.pacientes.find(x => x.id === id);
      return p ? p.nome : 'Paciente';
    };
    abrirModal('Aceites &middot; ' + escaparHtml(t.titulo),
      (doTermo.length === 0
        ? '<p class="sub">Ninguem aceitou ainda.</p>'
        : doTermo.map(a =>
            '<div class="linha-doc"><div><b>' + escaparHtml(nomePac(a.paciente_id)) + '</b>' +
            '<small>Assinado por ' + escaparHtml(a.nome_confirmado || '-') + ' em ' +
            new Date(a.aceito_em).toLocaleString('pt-BR') + '</small></div>' +
            '<button class="btn-chip" onclick="MODULOS.termos.imprimirAceite(\'' + termoId + '\', \'' +
            a.paciente_id + '\')">&#128424; Imprimir</button>' +
            '<span class="selo selo-ok">Aceito</span></div>').join('')), true);
  },

  // ─────────────── Impressao do termo aceito (aceite digital) ───────────────

  imprimirAceite(termoId, pacienteId) {
    const termo = this.lista.find(x => x.id === termoId);
    const aceite = this.aceites.find(a => a.termo_id === termoId && a.paciente_id === pacienteId);
    const pac = this.pacientes.find(p => p.id === pacienteId);
    if (!termo || !aceite) return;

    document.getElementById('doc-eq-overlay')?.remove();
    const ov = document.createElement('div');
    ov.id = 'doc-eq-overlay';
    ov.className = 'folha-overlay';
    ov.innerHTML = '<div class="folha-pagina" style="max-width:860px">' +
      '<div class="pagina-cabecalho nao-imprime">' +
      '  <div><button class="btn-voltar" onclick="document.getElementById(\'doc-eq-overlay\').remove()">&larr; Fechar</button>' +
      '  <h2>Termo aceito</h2></div>' +
      '  <button class="btn btn-primario" onclick="window.print()">&#128424; Imprimir / PDF</button>' +
      '</div>' +
      '<div class="doc-eq">' +
      '<div class="deq-cab">' +
      '  <img src="icones/equilibrium.png" alt="Equilibrium">' +
      '  <div class="deq-cab-t"><h1>' + escaparHtml(termo.titulo).toUpperCase() + '</h1>' +
      '  <p>Equilibrium Terapia Infantil &middot; Documento aceito digitalmente pelo portal da familia</p></div>' +
      '</div>' +
      '<div class="deq-caixa deq-dados" style="grid-template-columns:1fr 1fr; margin-top:8px">' +
      '  <div><small>Paciente</small><b>' + escaparHtml(pac ? pac.nome : '-') + '</b></div>' +
      '  <div><small>Data do aceite</small><b>' + new Date(aceite.aceito_em).toLocaleString('pt-BR') + '</b></div>' +
      '</div>' +
      '<h2 style="margin-top:14px"><span class="ponto deq-azul"></span>Texto do termo</h2>' +
      '<div class="deq-caixa deq-texto">' +
      escaparHtml(termo.texto || '').replace(/\n/g, '<br>') + '</div>' +
      '<div class="deq-caixa" style="margin-top:14px; background:#F0FDF4; border-color:#86EFAC">' +
      '  <b style="color:#15803D">&#10003; ACEITO DIGITALMENTE</b><br>' +
      '  <span style="font-size:12px">Aceito por <b>' + escaparHtml(aceite.nome_confirmado) + '</b> em <b>' +
      new Date(aceite.aceito_em).toLocaleString('pt-BR') + '</b>, mediante confirmacao do nome completo no portal da familia ' +
      'do CORTEX aba, com registro de data e hora. Este aceite fica guardado no sistema e vale como concordancia da familia.</span>' +
      '</div>' +
      '<div class="deq-rodape">' +
      '  <span>Equilibrium Terapia Infantil &middot; Uberl&acirc;ndia/MG</span>' +
      '  <span class="pontos"><i style="background:var(--eq-teal)"></i><i style="background:var(--eq-amarelo)"></i>' +
      '<i style="background:var(--eq-rosa)"></i><i style="background:var(--eq-azul)"></i></span>' +
      '  <span>Gerado pelo CORTEX aba &middot; ' + new Date().toLocaleDateString('pt-BR') + '</span>' +
      '</div>' +
      '</div></div>';
    document.body.appendChild(ov);
  }
};
