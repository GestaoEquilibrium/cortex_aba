// ============================================================================
// CORTEX aba - js/modulos/rh.js
// Sprint 13: RH - pasta funcional da equipe.
// - Colaboradores: dados funcionais (cargo, admissao, CPF validado, registro
//   profissional, contato), situacao (ativo/desligado)
// - Documentos digitalizados (contrato, certificados) abertos em modal
// - Vinculo com o acesso ao sistema (Usuarios e Acessos)
// ============================================================================

window.MODULOS = window.MODULOS || {};

window.MODULOS.rh = {

  CARGOS: ['Coordenador(a)', 'Terapeuta', 'Aplicador(a)', 'Recepcao',
           'Call Center', 'Administrativo', 'Servicos Gerais', 'Outro'],

  el: null,
  lista: [],
  perfis: [],

  podeE() { return perm('rh') === 'E'; },

  async render(el) {
    this.el = el;

    el.innerHTML =
      '<div class="pagina-cabecalho">' +
      '  <div><h2>RH</h2><p class="sub" id="rh-sub">Carregando...</p></div>' +
      (this.podeE()
        ? '<button class="btn btn-primario" onclick="MODULOS.rh.modalFicha()">+ Novo colaborador</button>'
        : '') +
      '</div>' +
      '<div class="toolbar">' +
      '  <input type="search" id="rh-busca" placeholder="Buscar por nome..." oninput="MODULOS.rh.desenhar()">' +
      '  <select id="rh-cargo" onchange="MODULOS.rh.desenhar()">' +
      '    <option value="">Todos os cargos</option>' +
      this.CARGOS.map(c => '<option>' + c + '</option>').join('') +
      '  </select>' +
      '  <select id="rh-situacao" onchange="MODULOS.rh.desenhar()">' +
      '    <option value="ativos">Ativos</option>' +
      '    <option value="desligados">Desligados</option>' +
      '    <option value="">Todos</option>' +
      '  </select>' +
      '</div>' +
      '<div id="rh-lista"></div>';

    await this.carregar();
    this.desenhar();
  },

  async carregar() {
    const [{ data: cols }, { data: profs }] = await Promise.all([
      sb.from('colaboradores')
        .select('*, docs:colaborador_docs(id), acesso:profiles!colaboradores_usuario_id_fkey(id, nome, perfil, ativo)')
        .order('nome'),
      sb.from('profiles').select('id, nome, perfil, ativo')
        .neq('perfil', 'familia').order('nome')
    ]);
    this.lista = cols || [];
    this.perfis = profs || [];
  },

  desenhar() {
    const termo = (document.getElementById('rh-busca')?.value || '').toLowerCase();
    const cargo = document.getElementById('rh-cargo')?.value || '';
    const sit = document.getElementById('rh-situacao')?.value ?? 'ativos';

    const filtrados = this.lista.filter(c =>
      (!termo || c.nome.toLowerCase().includes(termo)) &&
      (!cargo || c.cargo === cargo) &&
      (sit === '' || (sit === 'ativos' ? !c.data_desligamento : !!c.data_desligamento)));

    document.getElementById('rh-sub').textContent =
      filtrados.length + ' de ' + this.lista.length + ' colaborador(es)';

    const alvo = document.getElementById('rh-lista');
    if (filtrados.length === 0) {
      alvo.innerHTML = '<div class="cartao"><div class="vazio">' +
        '<div class="simbolo-vazio">&#128101;</div><strong>Ninguem por aqui</strong>' +
        (this.lista.length === 0 ? 'Cadastre o primeiro colaborador.' : 'Ajuste a busca ou os filtros.') +
        '</div></div>';
      return;
    }

    alvo.innerHTML = '<div class="cartao">' + filtrados.map(c =>
      '<div class="linha-doc">' +
      '<div><b>' + escaparHtml(c.nome) + '</b>' +
      '<small>' + escaparHtml(c.cargo || '-') +
      (c.data_admissao ? ' &middot; desde ' +
        new Date(c.data_admissao + 'T12:00:00').toLocaleDateString('pt-BR') : '') +
      ((c.docs || []).length ? ' &middot; ' + c.docs.length + ' doc(s)' : '') +
      '</small></div>' +
      '<div class="pac-selos">' +
      (c.data_desligamento
        ? '<span class="selo selo-neutro">Desligado</span>'
        : '<span class="selo selo-ok">Ativo</span>') +
      (c.acesso
        ? '<span class="selo selo-roxo" title="' + escaparHtml(c.acesso.nome) + '">Com acesso</span>'
        : '<span class="selo selo-neutro">Sem acesso</span>') +
      '<button class="btn-chip" onclick="MODULOS.rh.modalFicha(\'' + c.id + '\')">Ficha</button>' +
      '</div></div>').join('') + '</div>';
  },

  // ─────────────── FICHA ───────────────

  modalFicha(id) {
    const c = id ? this.lista.find(x => x.id === id) : null;
    const podeE = this.podeE();
    const ro = podeE ? '' : ' disabled';

    abrirModal(c ? 'Ficha: ' + escaparHtml(c.nome) : 'Novo colaborador',
      '<div class="grade-form">' +
      '  <div class="campo c2"><label>Nome completo *</label>' +
      '    <input id="rf-nome" value="' + escaparHtml(c ? c.nome : '') + '"' + ro + '></div>' +
      '  <div class="campo"><label>Cargo *</label><select id="rf-cargo"' + ro + '>' +
      this.CARGOS.map(x => '<option' + (c && c.cargo === x ? ' selected' : '') + '>' + x + '</option>').join('') +
      '  </select></div>' +
      '  <div class="campo"><label>CPF</label>' +
      '    <input id="rf-cpf" inputmode="numeric" value="' + (c && c.cpf ? formatarCPF(c.cpf) : '') + '"' + ro +
      '      onblur="MODULOS.pacientes.checarCpf(this)"></div>' +
      '  <div class="campo"><label>Registro profissional</label>' +
      '    <input id="rf-registro" placeholder="CRP, CREFITO..." value="' + escaparHtml(c ? c.registro_profissional || '' : '') + '"' + ro + '></div>' +
      '  <div class="campo"><label>Telefone</label>' +
      '    <input id="rf-tel" value="' + escaparHtml(c ? c.telefone || '' : '') + '"' + ro + '></div>' +
      '  <div class="campo"><label>E-mail</label>' +
      '    <input id="rf-email" value="' + escaparHtml(c ? c.email || '' : '') + '"' + ro + '></div>' +
      '  <div class="campo"><label>Admissao</label>' +
      '    <input type="date" id="rf-admissao" value="' + (c ? c.data_admissao || '' : '') + '"' + ro + '></div>' +
      '  <div class="campo"><label>Desligamento</label>' +
      '    <input type="date" id="rf-deslig" value="' + (c ? c.data_desligamento || '' : '') + '"' + ro + '></div>' +
      '  <div class="campo c2"><label>Acesso ao sistema (vinculo)</label>' +
      '    <select id="rf-usuario"' + ro + '>' +
      '      <option value="">Sem vinculo</option>' +
      this.perfis.map(p => '<option value="' + p.id + '"' +
        (c && c.usuario_id === p.id ? ' selected' : '') + '>' +
        escaparHtml(p.nome) + ' (' + (ROTULOS_PERFIL[p.perfil] || p.perfil) + ')</option>').join('') +
      '    </select></div>' +
      '  <div class="campo c3"><label>Observacoes</label>' +
      '    <textarea id="rf-obs" rows="2"' + ro + '>' + escaparHtml(c ? c.observacoes || '' : '') + '</textarea></div>' +
      '</div>' +

      (c ? this.htmlDocs(c) : '<p class="sub">Salve a ficha para anexar documentos.</p>') +

      '<div class="mensagem-erro" id="rf-erro"></div>' +
      '<div class="barra-acoes">' +
      '  <button class="btn btn-fantasma" onclick="fecharModal()">Fechar</button>' +
      (podeE
        ? '<button class="btn btn-primario" id="rf-salvar" onclick="MODULOS.rh.salvar(' +
          (c ? '\'' + c.id + '\'' : 'null') + ')">Salvar</button>'
        : '') +
      '</div>', true);
  },

  htmlDocs(c) {
    const docs = c._docsCompletos || null;
    return '<div style="margin-top:14px; padding-top:14px; border-top:1px solid var(--line)">' +
      '<b style="font-size:12.5px">Documentos</b>' +
      '<div id="rf-docs">' +
      (docs === null
        ? '<p class="sub">Carregando... <button class="btn-chip" onclick="MODULOS.rh.carregarDocs(\'' +
          c.id + '\')">Listar documentos</button></p>'
        : '') +
      '</div>' +
      (this.podeE()
        ? '<div class="grade-form" style="margin-top:8px">' +
          '  <div class="campo c2"><label>Anexar (PDF ou imagem)</label>' +
          '    <input type="file" id="rf-arquivo" accept="application/pdf,image/jpeg,image/png"></div>' +
          '  <div class="campo"><label>Descricao</label><input id="rf-arq-desc" placeholder="Contrato, certificado..."></div>' +
          '  <div class="campo" style="display:flex; align-items:flex-end">' +
          '    <button class="btn btn-fantasma" onclick="MODULOS.rh.enviarDoc(\'' + c.id + '\')">Enviar</button></div>' +
          '</div>'
        : '') +
      '</div>';
  },

  async carregarDocs(colabId) {
    const { data } = await sb.from('colaborador_docs')
      .select('*').eq('colaborador_id', colabId).order('criado_em', { ascending: false });
    const docs = data || [];
    const c = this.lista.find(x => x.id === colabId);
    if (c) c._docsCompletos = docs;

    const alvo = document.getElementById('rf-docs');
    if (!alvo) return;
    alvo.innerHTML = docs.length ? docs.map(d =>
      '<div class="linha-doc"><div><b>' + escaparHtml(d.descricao || 'Documento') + '</b>' +
      '<small>' + new Date(d.criado_em).toLocaleDateString('pt-BR') + '</small></div>' +
      '<button class="btn-chip" onclick="MODULOS.rh.abrirDoc(\'' + d.arquivo_path + '\', \'' +
      escaparHtml(d.descricao || 'Documento').replace(/'/g, '') + '\')">Ver</button>' +
      '</div>').join('')
      : '<p class="sub">Nenhum documento anexado.</p>';
  },

  async abrirDoc(caminho, titulo) {
    const { data, error } = await sb.storage.from('documentos').createSignedUrl(caminho, 300);
    if (error || !data) { alert('Nao foi possivel abrir.'); return; }
    if (caminho.endsWith('.pdf')) abrirModalPdf(titulo, data.signedUrl);
    else abrirModal(titulo, '<img src="' + data.signedUrl + '" style="max-width:100%; border-radius:12px">', true);
  },

  async enviarDoc(colabId) {
    const arquivo = document.getElementById('rf-arquivo').files[0];
    if (!arquivo) { alert('Escolha um arquivo.'); return; }
    if (arquivo.size > 15 * 1024 * 1024) { alert('Arquivo muito grande (max. 15 MB).'); return; }

    const ext = arquivo.type === 'application/pdf' ? 'pdf'
      : arquivo.type === 'image/png' ? 'png' : 'jpg';
    const caminho = 'rh/' + colabId + '/doc_' + Date.now() + '.' + ext;

    const { error: e1 } = await sb.storage.from('documentos')
      .upload(caminho, arquivo, { contentType: arquivo.type });
    if (e1) { alert('Falha no envio: ' + e1.message); return; }

    const { error: e2 } = await sb.from('colaborador_docs').insert({
      colaborador_id: colabId,
      descricao: document.getElementById('rf-arq-desc').value.trim() || null,
      arquivo_path: caminho,
      enviado_por: window.CORTEX_SESSAO.user.id
    });
    if (e2) { alert('Falha ao registrar: ' + e2.message); return; }

    document.getElementById('rf-arquivo').value = '';
    document.getElementById('rf-arq-desc').value = '';
    this.carregarDocs(colabId);
  },

  async salvar(id) {
    const erro = document.getElementById('rf-erro');
    const botao = document.getElementById('rf-salvar');
    erro.classList.remove('visivel');

    const cpf = document.getElementById('rf-cpf').value.replace(/\D/g, '');
    if (cpf && !validarCPF(cpf)) {
      erro.textContent = 'CPF invalido.';
      erro.classList.add('visivel');
      return;
    }

    const dados = {
      nome: document.getElementById('rf-nome').value.trim(),
      cargo: document.getElementById('rf-cargo').value,
      cpf: cpf || null,
      registro_profissional: document.getElementById('rf-registro').value.trim() || null,
      telefone: document.getElementById('rf-tel').value.trim() || null,
      email: document.getElementById('rf-email').value.trim().toLowerCase() || null,
      data_admissao: document.getElementById('rf-admissao').value || null,
      data_desligamento: document.getElementById('rf-deslig').value || null,
      usuario_id: document.getElementById('rf-usuario').value || null,
      observacoes: document.getElementById('rf-obs').value.trim() || null
    };

    if (!dados.nome) {
      erro.textContent = 'Informe o nome.';
      erro.classList.add('visivel');
      return;
    }

    botao.disabled = true;
    botao.textContent = 'Salvando...';

    const q = id
      ? sb.from('colaboradores').update(dados).eq('id', id)
      : sb.from('colaboradores').insert(dados);
    const { error } = await q;

    if (error) {
      erro.textContent = error.message;
      erro.classList.add('visivel');
      botao.disabled = false;
      botao.textContent = 'Salvar';
      return;
    }

    fecharModal();
    await this.carregar();
    this.desenhar();
  }
};
