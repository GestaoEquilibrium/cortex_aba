// ============================================================================
// CORTEX aba - js/modulos/pacientes.js
// Sprint 2.1: cadastro completo do paciente (CPF validado, endereco com CEP,
// escola/turno) + multiplos responsaveis, cada um podendo ter acesso ao portal.
// ============================================================================

window.MODULOS = window.MODULOS || {};

window.MODULOS.pacientes = {

  PODE_ADMITIR: ['direcao', 'coordenador', 'callcenter', 'suporte'],
  PARENTESCOS: ['Mae', 'Pai', 'Avo', 'Ava', 'Tio(a)', 'Madrasta', 'Padrasto', 'Irmao(a)', 'Cuidador(a)', 'Outro'],

  el: null,
  sessao: null,
  respSeq: 0,

  async render(el, sessao) {
    this.el = el;
    this.sessao = sessao;
    await this.telaLista();
  },

  // ───────────────────────────── LISTA ─────────────────────────────

  async telaLista() {
    const podeAdmitir = perm('pacientes') === 'E';

    this.el.innerHTML =
      '<div class="pagina-cabecalho">' +
      '  <div><h2>Pacientes</h2><p class="sub" id="pac-contagem">Carregando...</p></div>' +
      (podeAdmitir
        ? '<button class="btn btn-primario" onclick="MODULOS.pacientes.telaNova()">+ Nova admissao</button>'
        : '') +
      '</div>' +
      '<div class="toolbar">' +
      '  <input type="search" id="pac-busca" placeholder="Buscar por paciente ou responsavel..." ' +
      '         oninput="MODULOS.pacientes.filtrar()">' +
      '  <select id="pac-status" onchange="MODULOS.pacientes.filtrar()">' +
      '    <option value="">Todos os status</option>' +
      '    <option value="triagem">Triagem</option>' +
      '    <option value="avaliacao">Avaliacao</option>' +
      '    <option value="ativo">Ativo</option>' +
      '    <option value="encerrado">Encerrado</option>' +
      '  </select>' +
      '</div>' +
      '<div id="pac-lista"></div>';

    const { data, error } = await sb
      .from('pacientes')
      .select('id, nome, data_nascimento, nivel, status, responsaveis(nome, principal)')
      .order('nome');

    if (error) {
      document.getElementById('pac-lista').innerHTML =
        '<div class="cartao"><div class="mensagem-erro visivel">Erro ao carregar pacientes: ' +
        escaparHtml(error.message) + '</div></div>';
      return;
    }

    this.dados = (data || []).map(p => {
      const principal = (p.responsaveis || []).find(r => r.principal) || (p.responsaveis || [])[0];
      p._resp = principal ? principal.nome : '';
      p._todosResp = (p.responsaveis || []).map(r => r.nome).join(' ');
      return p;
    });
    this.filtrar();
  },

  filtrar() {
    const termo = (document.getElementById('pac-busca')?.value || '').toLowerCase();
    const status = document.getElementById('pac-status')?.value || '';

    const filtrados = this.dados.filter(p =>
      (!termo || p.nome.toLowerCase().includes(termo) ||
        p._todosResp.toLowerCase().includes(termo)) &&
      (!status || p.status === status));

    document.getElementById('pac-contagem').textContent =
      filtrados.length + ' de ' + this.dados.length + ' paciente(s)';

    const alvo = document.getElementById('pac-lista');

    if (filtrados.length === 0) {
      alvo.innerHTML =
        '<div class="cartao"><div class="vazio">' +
        '<div class="simbolo-vazio">&#9825;</div>' +
        '<strong>Nenhum paciente encontrado</strong>' +
        (this.dados.length === 0
          ? 'Comece pela primeira admissao no botao acima.'
          : 'Ajuste a busca ou o filtro de status.') +
        '</div></div>';
      return;
    }

    alvo.innerHTML = '<div class="grade-pacientes">' + filtrados.map(p =>
      '<div class="cartao cartao-paciente" onclick="MODULOS.pacientes.telaDetalhe(\'' + p.id + '\')">' +
      '  <div class="pac-topo">' +
      '    <div class="avatar-paciente">' + escaparHtml(this.iniciais(p.nome)) + '</div>' +
      '    <div class="pac-quem">' +
      '      <strong>' + escaparHtml(p.nome) + '</strong>' +
      '      <span>' + calcularIdade(p.data_nascimento) + ' &middot; Resp.: ' +
             escaparHtml(p._resp || '-') + '</span>' +
      '    </div>' +
      '  </div>' +
      '  <div class="pac-selos">' + this.seloNivel(p.nivel) + this.seloStatus(p.status) + '</div>' +
      '</div>').join('') + '</div>';
  },

  iniciais(nome) {
    const p = nome.trim().split(/\s+/);
    return ((p[0] ? p[0][0] : '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
  },

  seloNivel(nivel) {
    if (nivel === 'aba1') return '<span class="selo selo-roxo">ABA 1</span>';
    if (nivel === 'aba2') return '<span class="selo selo-roxo">ABA 2</span>';
    return '<span class="selo selo-neutro">Nivel a definir</span>';
  },

  seloStatus(status) {
    const mapa = {
      triagem:   ['selo-warn',   'Triagem'],
      avaliacao: ['selo-roxo',   'Avaliacao'],
      ativo:     ['selo-ok',     'Ativo'],
      encerrado: ['selo-neutro', 'Encerrado']
    };
    const s = mapa[status] || ['selo-neutro', status];
    return '<span class="selo ' + s[0] + '">' + s[1] + '</span>';
  },

  // ─────────────────────────── PRONTUARIO ───────────────────────────

  ABAS: [
    { id: 'visao',      rotulo: 'Visao geral' },
    { id: 'anamnese',   rotulo: 'Anamnese',   sprint: 'Sprint 3' },
    { id: 'plano',      rotulo: 'Plano' },
    { id: 'avaliacao',  rotulo: 'Avaliacao',  sprint: 'Sprint 7' },
    { id: 'pei',        rotulo: 'PEI',        sprint: 'Sprint 8' },
    { id: 'programas',  rotulo: 'Programas',  sprint: 'Sprint 10' },
    { id: 'evolucoes',  rotulo: 'Evolucoes',  sprint: 'Sprint 10' },
    { id: 'relatorios', rotulo: 'Relatorios', sprint: 'Sprint 11' },
    { id: 'documentos', rotulo: 'Documentos' }
  ],

  paciente: null,

  async telaDetalhe(id, abaInicial) {
    const { data: p, error } = await sb
      .from('pacientes')
      .select('*, responsaveis(*), encaminhamentos(id, medico, sessoes_semanais, arquivo_path, criado_em), aplicador:profiles!pacientes_aplicador_id_fkey(id, nome, perfil)')
      .eq('id', id).single();

    if (error || !p) { this.telaLista(); return; }
    this.paciente = p;

    const podeAdmitir = perm('pacientes') === 'E';
    const sexo = p.sexo === 'M' ? 'Masculino' : p.sexo === 'F' ? 'Feminino' : '-';

    let foto = '';
    if (p.foto_path) {
      const { data: urlFoto } = await sb.storage.from('documentos').createSignedUrl(p.foto_path, 3600);
      if (urlFoto) foto = urlFoto.signedUrl;
    }

    this.el.innerHTML =
      '<button class="btn-voltar" onclick="MODULOS.pacientes.telaLista()">&larr; Voltar a lista de pacientes</button>' +

      '<div class="capa">' +
      '  <div class="capa-linha">' +
      (foto
        ? '<img class="capa-avatar foto" src="' + foto + '" alt="">'
        : '<div class="capa-avatar">' + escaparHtml(this.iniciais(p.nome)) + '</div>') +
      '    <div class="capa-info">' +
      '      <h2>' + escaparHtml(p.nome) + '</h2>' +
      '      <div class="capa-meta">' +
      '        <div><span>Idade</span><b>' + calcularIdade(p.data_nascimento) + '</b></div>' +
      '        <div><span>Sexo</span><b>' + sexo + '</b></div>' +
      '        <div><span>Nascimento</span><b>' +
               new Date(p.data_nascimento + 'T12:00:00').toLocaleDateString('pt-BR') + '</b></div>' +
      (p.convenio ? '<div><span>Convenio</span><b>' + escaparHtml(p.convenio) + '</b></div>' : '') +
      '<div><span>Profissional</span><b>' +
      (p.aplicador ? escaparHtml(p.aplicador.nome) : '<span style="color:var(--ink-soft)">Nao designado</span>') +
      '</b></div>' +
      '      </div>' +
      '      <div class="capa-acoes">' +
               this.seloNivel(p.nivel) + this.seloStatus(p.status) +
      (podeAdmitir
        ? '<button class="btn-chip" onclick="MODULOS.pacientes.telaEditar()">&#9998; Editar dados</button>' +
          '<button class="btn-chip" onclick="MODULOS.pacientes.modalFoto()">&#128247; ' +
          (p.foto_path ? 'Alterar foto' : 'Adicionar foto') + '</button>'
        : '') +
      (perm('pacientes_designar') === 'E'
        ? '<button class="btn-chip" onclick="MODULOS.pacientes.modalAplicador()">&#128100; ' +
          (p.aplicador ? 'Alterar profissional' : 'Designar profissional') + '</button>'
        : '') +
      '        <button class="btn-chip" onclick="MODULOS.pacientes.abrirAba(\'documentos\')">&#128196; Documentos</button>' +
      '      </div>' +
      '    </div>' +
      '  </div>' +
      '</div>' +

      '<div class="abas" id="pac-abas">' +
      this.ABAS.map(a =>
        '<button class="aba" data-aba="' + a.id + '" onclick="MODULOS.pacientes.abrirAba(\'' + a.id + '\')">' +
        a.rotulo + '</button>').join('') +
      '</div>' +

      '<div id="pac-aba-conteudo"></div>';

    this.abrirAba(abaInicial || 'visao');
  },

  abrirAba(id) {
    document.querySelectorAll('#pac-abas .aba').forEach(b =>
      b.classList.toggle('ativa', b.dataset.aba === id));

    const alvo = document.getElementById('pac-aba-conteudo');
    const p = this.paciente;
    const aba = this.ABAS.find(a => a.id === id);

    if (id === 'visao') { alvo.innerHTML = this.htmlVisaoGeral(p); return; }
    if (id === 'documentos') { alvo.innerHTML = this.htmlDocumentos(p); return; }
    if (id === 'plano') {
      alvo.innerHTML = '<div class="cartao"><p class="sub">Carregando planos...</p></div>';
      MODULOS.plano.htmlDoPaciente(p.id).then(html => {
        alvo.innerHTML = html || '<div class="cartao"><p class="sub">Nenhum plano.</p></div>';
      });
      return;
    }
    if (id === 'pei') {
      alvo.innerHTML = '<div class="cartao"><p class="sub">Carregando PEIs...</p></div>';
      MODULOS.pei.htmlDoPaciente(p.id).then(html => { alvo.innerHTML = html; });
      return;
    }
    if (id === 'avaliacao') {
      alvo.innerHTML = '<div class="cartao"><p class="sub">Carregando avaliacoes...</p></div>';
      MODULOS.avaliacoes.htmlDoPaciente(p.id).then(html => { alvo.innerHTML = html; });
      return;
    }
    if (id === 'anamnese') {
      alvo.innerHTML = '<div class="cartao"><p class="sub">Carregando anamnese...</p></div>';
      MODULOS.anamnese.htmlResumoInterno(p.id).then(html => { alvo.innerHTML = html; });
      return;
    }

    alvo.innerHTML =
      '<div class="cartao"><div class="vazio">' +
      '<div class="simbolo-vazio">&#9881;</div>' +
      '<strong>' + aba.rotulo + ' em construcao</strong>' +
      'Este espaco sera ativado no ' + (aba.sprint || 'proximo sprint') + '.' +
      '</div></div>';
  },

  htmlVisaoGeral(p) {
    const endereco = [p.endereco, p.numero, p.complemento, p.bairro]
      .filter(Boolean).join(', ');
    const cidade = (p.cidade && p.uf) ? p.cidade + '/' + p.uf : (p.cidade || p.uf || '-');
    const resps = (p.responsaveis || []).sort((a, b) => (b.principal ? 1 : 0) - (a.principal ? 1 : 0));
    const principal = resps[0];

    return '<div class="cartao">' +
      '<h3>Visao geral</h3>' +
      '<div class="grade-visao">' +
      this.caixa('Telefone', principal ? principal.telefone : null) +
      this.caixa('E-mail', principal ? principal.email : null) +
      this.caixa('CPF do paciente', p.cpf ? formatarCPF(p.cpf) : null) +
      this.caixa('CPF do responsavel', (principal && principal.cpf) ? formatarCPF(principal.cpf) : null) +
      this.caixa('Endereco', endereco || null, true) +
      this.caixa('Cidade', cidade) +
      this.caixa('CEP', p.cep) +
      this.caixa('Convenio', p.convenio ? p.convenio + (p.carteirinha ? ' - ' + p.carteirinha : '') : null) +
      this.caixa('Escola', p.escola ? p.escola + (p.turno_escolar ? ' - ' + p.turno_escolar : '') : null) +
      this.caixa('Responsavel', principal ?
        principal.nome + (principal.parentesco ? ' (' + principal.parentesco + ')' : '') : null, true) +
      (p.observacoes ? this.caixa('Observacoes', p.observacoes, true) : '') +
      '</div>' +
      '</div>' +

      '<div class="cartao">' +
      '<h3>Responsaveis e acompanhantes</h3>' +
      (resps.length ? resps.map(r =>
        '<div class="linha-doc">' +
        '  <div><b>' + escaparHtml(r.nome) + '</b>' +
        '  <small>' + escaparHtml(r.parentesco || '-') +
             (r.telefone ? ' &middot; ' + escaparHtml(r.telefone) : '') +
             (r.cpf ? ' &middot; CPF ' + formatarCPF(r.cpf) : '') + '</small></div>' +
        '  <div class="pac-selos">' +
        (r.principal ? '<span class="selo selo-roxo">Principal</span>' : '') +
        (r.responsavel_legal ? '<span class="selo selo-ok">Resp. legal</span>' : '') +
        (r.autorizado_buscar ? '<span class="selo selo-neutro">Busca</span>' : '') +
        (r.usuario_id ? '<span class="selo selo-ok">Portal</span>' : '<span class="selo selo-neutro">Sem portal</span>') +
        '  </div>' +
        '</div>').join('')
      : '<p class="sub">Nenhum responsavel cadastrado.</p>') +
      '</div>';
  },

  caixa(rotulo, valor, larga) {
    return '<div class="caixa-info' + (larga ? ' larga' : '') + '">' +
      '<small>' + rotulo + '</small>' +
      '<b>' + (valor ? escaparHtml(valor) : '&mdash;') + '</b></div>';
  },

  htmlDocumentos(p) {
    const encs = (p.encaminhamentos || []).sort((a, b) => b.criado_em.localeCompare(a.criado_em));
    return '<div class="cartao faixa-ambar">' +
      '<h3>Encaminhamentos medicos</h3>' +
      (encs.length ? encs.map(e =>
        '<div class="linha-doc">' +
        '  <div><b>' + escaparHtml(e.medico || 'Medico nao informado') + '</b>' +
        '  <small>' + (e.sessoes_semanais ? e.sessoes_semanais + ' sessoes/semana &middot; ' : '') +
           new Date(e.criado_em).toLocaleDateString('pt-BR') + '</small></div>' +
        (e.arquivo_path
          ? '<button class="btn btn-fantasma" onclick="MODULOS.pacientes.abrirPdf(\'' +
            e.arquivo_path + '\')">Ver PDF</button>'
          : '<span class="selo selo-neutro">Sem arquivo</span>') +
        '</div>').join('')
      : '<p class="sub">Nenhum encaminhamento registrado.</p>') +
      '</div>' +
      '<div class="cartao">' +
      '<h3>Termos e outros documentos</h3>' +
      '<p class="sub">Termo de Responsabilidade Parental e Autorizacao de Uso de Imagem entram com o portal da familia (Sprint 3).</p>' +
      '</div>';
  },

  async abrirPdf(caminho) {
    const { data, error } = await sb.storage
      .from('documentos')
      .createSignedUrl(caminho, 300);
    if (error || !data) { alert('Nao foi possivel abrir o arquivo.'); return; }
    abrirModalPdf('Encaminhamento medico', data.signedUrl);
  },

  async modalAplicador() {
    const { data: equipe, error } = await sb
      .from('profiles')
      .select('id, nome, perfil')
      .in('perfil', ['aplicador', 'terapeuta'])
      .eq('ativo', true)
      .order('nome');

    if (error) { alert('Erro ao carregar a equipe: ' + error.message); return; }
    if (!equipe || equipe.length === 0) {
      abrirModal('Designar profissional',
        '<p class="sub">Nenhum aplicador ou terapeuta cadastrado ainda. ' +
        'Crie os acessos da equipe em Usuarios e Acessos.</p>' +
        '<div class="barra-acoes"><button class="btn btn-primario" onclick="fecharModal()">Ok</button></div>');
      return;
    }

    const atual = this.paciente.aplicador_id || '';
    abrirModal('Designar profissional para ' + escaparHtml(this.paciente.nome),
      '<div class="campo"><label>Aplicador ou terapeuta responsavel</label>' +
      '<select id="ap-select">' +
      '<option value="">Nenhum (remover designacao)</option>' +
      equipe.map(m =>
        '<option value="' + m.id + '"' + (m.id === atual ? ' selected' : '') + '>' +
        escaparHtml(m.nome) + ' (' + (ROTULOS_PERFIL[m.perfil] || m.perfil) + ')</option>').join('') +
      '</select></div>' +
      '<p class="sub">O profissional designado recebe uma notificacao no Inicio dele.</p>' +
      '<div class="mensagem-erro" id="ap-erro"></div>' +
      '<div class="barra-acoes">' +
      '  <button type="button" class="btn btn-fantasma" onclick="fecharModal()">Cancelar</button>' +
      '  <button type="button" class="btn btn-primario" id="ap-salvar" ' +
      '    onclick="MODULOS.pacientes.salvarAplicador()">Salvar</button>' +
      '</div>');
  },

  async salvarAplicador() {
    const novoId = document.getElementById('ap-select').value || null;
    const erro = document.getElementById('ap-erro');
    const botao = document.getElementById('ap-salvar');
    erro.classList.remove('visivel');
    botao.disabled = true;
    botao.textContent = 'Salvando...';

    try {
      const { error } = await sb.from('pacientes')
        .update({ aplicador_id: novoId }).eq('id', this.paciente.id);
      if (error) throw new Error(error.message);

      if (novoId && novoId !== this.paciente.aplicador_id) {
        await sb.from('notificacoes').insert({
          destinatario_id: novoId,
          titulo: 'Voce foi designado(a): ' + this.paciente.nome,
          corpo: 'A coordenacao designou voce como profissional responsavel. ' +
                 'Consulte o prontuario para conhecer o caso.'
        });
      }

      fecharModal();
      this.telaDetalhe(this.paciente.id);
    } catch (e) {
      erro.textContent = e.message;
      erro.classList.add('visivel');
      botao.disabled = false;
      botao.textContent = 'Salvar';
    }
  },

  modalFoto() {
    abrirModal('Foto de ' + escaparHtml(this.paciente.nome),
      '<div class="campo"><label>Escolha a imagem (JPG ou PNG)</label>' +
      '<input type="file" id="foto-arquivo" accept="image/jpeg,image/png"></div>' +
      '<div class="mensagem-erro" id="foto-erro"></div>' +
      '<div class="barra-acoes">' +
      '  <button type="button" class="btn btn-fantasma" onclick="fecharModal()">Cancelar</button>' +
      '  <button type="button" class="btn btn-primario" id="foto-salvar" ' +
      '    onclick="MODULOS.pacientes.salvarFoto()">Salvar foto</button>' +
      '</div>');
  },

  async salvarFoto() {
    const arquivo = document.getElementById('foto-arquivo').files[0];
    const erro = document.getElementById('foto-erro');
    const botao = document.getElementById('foto-salvar');
    erro.classList.remove('visivel');

    if (!arquivo) { erro.textContent = 'Escolha uma imagem.'; erro.classList.add('visivel'); return; }
    if (arquivo.size > 8 * 1024 * 1024) {
      erro.textContent = 'Imagem muito grande (max. 8 MB).'; erro.classList.add('visivel'); return;
    }

    botao.disabled = true;
    botao.textContent = 'Enviando...';
    try {
      const ext = arquivo.type === 'image/png' ? 'png' : 'jpg';
      const caminho = 'pacientes/' + this.paciente.id + '/foto_' + Date.now() + '.' + ext;
      const { error: e1 } = await sb.storage.from('documentos')
        .upload(caminho, arquivo, { contentType: arquivo.type });
      if (e1) throw new Error(e1.message);

      const { error: e2 } = await sb.from('pacientes')
        .update({ foto_path: caminho }).eq('id', this.paciente.id);
      if (e2) throw new Error(e2.message);

      fecharModal();
      this.telaDetalhe(this.paciente.id);
    } catch (e) {
      erro.textContent = e.message;
      erro.classList.add('visivel');
      botao.disabled = false;
      botao.textContent = 'Salvar foto';
    }
  },

  // ─────────────────────────── EDITAR DADOS ───────────────────────────

  telaEditar() {
    const p = this.paciente;
    abrirModal('Editar dados de ' + escaparHtml(p.nome),
      '<form onsubmit="MODULOS.pacientes.salvarEdicao(event)">' +
      '<div class="grade-form">' +
      '  <div class="campo c2"><label>Nome completo *</label><input id="e-nome" required value="' + escaparHtml(p.nome) + '"></div>' +
      '  <div class="campo"><label>Data de nascimento *</label><input type="date" id="e-nasc" required value="' + p.data_nascimento + '"></div>' +
      '  <div class="campo"><label>CPF</label><input id="e-cpf" value="' + (p.cpf ? formatarCPF(p.cpf) : '') + '" onblur="MODULOS.pacientes.checarCpf(this)"></div>' +
      '  <div class="campo"><label>Sexo *</label><select id="e-sexo" required>' +
      '    <option value="M"' + (p.sexo === 'M' ? ' selected' : '') + '>Masculino</option>' +
      '    <option value="F"' + (p.sexo === 'F' ? ' selected' : '') + '>Feminino</option></select></div>' +
      '  <div class="campo"><label>Convenio</label><input id="e-convenio" value="' + escaparHtml(p.convenio || '') + '"></div>' +
      '  <div class="campo"><label>Carteirinha</label><input id="e-carteirinha" value="' + escaparHtml(p.carteirinha || '') + '"></div>' +
      '  <div class="campo"><label>Escola</label><input id="e-escola" value="' + escaparHtml(p.escola || '') + '"></div>' +
      '  <div class="campo"><label>Turno escolar</label><select id="e-turno">' +
      ['', 'Manha', 'Tarde', 'Integral', 'Nao estuda'].map(t =>
        '<option value="' + t + '"' + ((p.turno_escolar || '') === t ? ' selected' : '') + '>' +
        (t || 'Nao informado') + '</option>').join('') +
      '  </select></div>' +
      '  <div class="campo"><label>CEP</label><input id="e-cep" value="' + escaparHtml(p.cep || '') + '"></div>' +
      '  <div class="campo c2"><label>Rua / Avenida</label><input id="e-endereco" value="' + escaparHtml(p.endereco || '') + '"></div>' +
      '  <div class="campo"><label>Numero</label><input id="e-numero" value="' + escaparHtml(p.numero || '') + '"></div>' +
      '  <div class="campo"><label>Complemento</label><input id="e-complemento" value="' + escaparHtml(p.complemento || '') + '"></div>' +
      '  <div class="campo"><label>Bairro</label><input id="e-bairro" value="' + escaparHtml(p.bairro || '') + '"></div>' +
      '  <div class="campo"><label>Cidade</label><input id="e-cidade" value="' + escaparHtml(p.cidade || '') + '"></div>' +
      '  <div class="campo"><label>UF</label><input id="e-uf" maxlength="2" value="' + escaparHtml(p.uf || '') + '"></div>' +
      '  <div class="campo c3"><label>Observacoes</label><textarea id="e-obs" rows="2">' + escaparHtml(p.observacoes || '') + '</textarea></div>' +
      '</div>' +
      '<div class="mensagem-erro" id="e-erro"></div>' +
      '<div class="barra-acoes">' +
      '  <button type="button" class="btn btn-fantasma" onclick="fecharModal()">Cancelar</button>' +
      '  <button type="submit" class="btn btn-primario" id="e-salvar">Salvar</button>' +
      '</div>' +
      '</form>', true);
  },

  async salvarEdicao(ev) {
    ev.preventDefault();
    const botao = document.getElementById('e-salvar');
    const erro = document.getElementById('e-erro');
    erro.classList.remove('visivel');
    botao.disabled = true;
    botao.textContent = 'Salvando...';

    try {
      const cpf = document.getElementById('e-cpf').value.replace(/\D/g, '');
      if (cpf && !validarCPF(cpf)) throw new Error('CPF invalido.');

      const { error } = await sb.from('pacientes').update({
        nome: document.getElementById('e-nome').value.trim(),
        data_nascimento: document.getElementById('e-nasc').value,
        cpf: cpf || null,
        sexo: document.getElementById('e-sexo').value,
        convenio: document.getElementById('e-convenio').value.trim() || null,
        carteirinha: document.getElementById('e-carteirinha').value.trim() || null,
        escola: document.getElementById('e-escola').value.trim() || null,
        turno_escolar: document.getElementById('e-turno').value || null,
        cep: document.getElementById('e-cep').value.trim() || null,
        endereco: document.getElementById('e-endereco').value.trim() || null,
        numero: document.getElementById('e-numero').value.trim() || null,
        complemento: document.getElementById('e-complemento').value.trim() || null,
        bairro: document.getElementById('e-bairro').value.trim() || null,
        cidade: document.getElementById('e-cidade').value.trim() || null,
        uf: document.getElementById('e-uf').value.trim().toUpperCase() || null,
        observacoes: document.getElementById('e-obs').value.trim() || null
      }).eq('id', this.paciente.id);
      if (error) throw new Error(error.message);

      fecharModal();
      this.telaDetalhe(this.paciente.id);
    } catch (e) {
      erro.textContent = e.message;
      erro.classList.add('visivel');
      botao.disabled = false;
      botao.textContent = 'Salvar';
    }
  },

  // ─────────────────────────── NOVA ADMISSAO ───────────────────────────

  telaNova() {
    this.respSeq = 0;

    this.el.innerHTML =
      '<div class="pagina-cabecalho">' +
      '  <div>' +
      '    <button class="btn-voltar" onclick="MODULOS.pacientes.telaLista()">&larr; Pacientes</button>' +
      '    <h2>Nova admissao</h2>' +
      '    <p class="sub">Cadastro completo do paciente, responsaveis, encaminhamento e acessos do portal.</p>' +
      '  </div>' +
      '</div>' +

      '<form onsubmit="MODULOS.pacientes.salvar(event)">' +

      '<div class="cartao faixa-azul">' +
      '  <h3>Paciente</h3>' +
      '  <div class="grade-form">' +
      '    <div class="campo c2"><label>Nome completo *</label><input id="f-nome" required></div>' +
      '    <div class="campo"><label>Data de nascimento *</label><input type="date" id="f-nasc" required></div>' +
      '    <div class="campo"><label>CPF do paciente</label>' +
      '      <input id="f-cpf" inputmode="numeric" placeholder="000.000.000-00" ' +
      '        onblur="MODULOS.pacientes.checarCpf(this)"></div>' +
      '    <div class="campo"><label>Sexo *</label>' +
      '      <select id="f-sexo" required><option value="">Selecione</option>' +
      '        <option value="M">Masculino</option><option value="F">Feminino</option></select></div>' +
      '    <div class="campo"><label>Convenio</label><input id="f-convenio" placeholder="Unimed, particular..."></div>' +
      '    <div class="campo"><label>Carteirinha</label><input id="f-carteirinha"></div>' +
      '    <div class="campo"><label>Escola</label><input id="f-escola"></div>' +
      '    <div class="campo"><label>Turno escolar</label>' +
      '      <select id="f-turno"><option value="">Nao informado</option>' +
      '        <option>Manha</option><option>Tarde</option><option>Integral</option>' +
      '        <option>Nao estuda</option></select></div>' +
      '  </div>' +
      '</div>' +

      '<div class="cartao faixa-azul">' +
      '  <h3>Endereco</h3>' +
      '  <div class="grade-form">' +
      '    <div class="campo"><label>CEP</label>' +
      '      <input id="f-cep" inputmode="numeric" placeholder="38400-000" ' +
      '        onblur="MODULOS.pacientes.buscarCep(this.value)"></div>' +
      '    <div class="campo c2"><label>Rua / Avenida</label><input id="f-endereco"></div>' +
      '    <div class="campo"><label>Numero</label><input id="f-numero"></div>' +
      '    <div class="campo"><label>Complemento</label><input id="f-complemento"></div>' +
      '    <div class="campo"><label>Bairro</label><input id="f-bairro"></div>' +
      '    <div class="campo c2"><label>Cidade</label><input id="f-cidade" value="Uberlandia"></div>' +
      '    <div class="campo"><label>UF</label><input id="f-uf" maxlength="2" value="MG"></div>' +
      '  </div>' +
      '</div>' +

      '<div class="cartao faixa-roxo">' +
      '  <h3>Responsaveis e acompanhantes</h3>' +
      '  <p class="sub" style="margin-bottom:12px">Cadastre todos que acompanharao a crianca. ' +
      '     Marque quem deve receber acesso ao portal da familia.</p>' +
      '  <div id="lista-resp"></div>' +
      '  <button type="button" class="btn btn-fantasma" onclick="MODULOS.pacientes.addResp()">+ Adicionar responsavel</button>' +
      '</div>' +

      '<div class="cartao faixa-ambar">' +
      '  <h3>Encaminhamento medico</h3>' +
      '  <div class="grade-form">' +
      '    <div class="campo c2"><label>Medico responsavel</label><input id="f-medico"></div>' +
      '    <div class="campo"><label>Sessoes por semana</label>' +
      '      <input type="number" id="f-sessoes" min="1" max="15" placeholder="Ex.: 5"></div>' +
      '    <div class="campo c3"><label>Arquivo do encaminhamento (PDF)</label>' +
      '      <input type="file" id="f-pdf" accept="application/pdf"></div>' +
      '  </div>' +
      '</div>' +

      '<div class="cartao">' +
      '  <div class="campo" style="margin-bottom:0"><label>Observacoes gerais</label>' +
      '  <textarea id="f-obs" rows="3" style="resize: vertical;"></textarea></div>' +
      '</div>' +

      '<div class="mensagem-erro" id="f-erro"></div>' +
      '<div class="barra-acoes">' +
      '  <button type="button" class="btn btn-fantasma" onclick="MODULOS.pacientes.telaLista()">Cancelar</button>' +
      '  <button type="submit" class="btn btn-primario" id="f-salvar">Admitir paciente</button>' +
      '</div>' +
      '</form>';

    this.addResp(true);
  },

  addResp(primeiro) {
    const n = ++this.respSeq;
    const opcoes = this.PARENTESCOS.map(p => '<option>' + p + '</option>').join('');
    const bloco = document.createElement('div');
    bloco.className = 'bloco-resp';
    bloco.id = 'resp-' + n;
    bloco.innerHTML =
      '<div class="bloco-resp-topo">' +
      '  <strong>Responsavel' + (primeiro ? ' principal' : '') + '</strong>' +
      (primeiro ? '' :
        '<button type="button" class="btn-remover" onclick="document.getElementById(\'resp-' + n + '\').remove()">Remover</button>') +
      '</div>' +
      '<div class="grade-form">' +
      '  <div class="campo c2"><label>Nome completo *</label><input class="r-nome" required></div>' +
      '  <div class="campo"><label>Parentesco *</label><select class="r-parentesco" required>' +
      '    <option value="">Selecione</option>' + opcoes + '</select></div>' +
      '  <div class="campo"><label>CPF</label><input class="r-cpf" inputmode="numeric" ' +
      '    placeholder="000.000.000-00" onblur="MODULOS.pacientes.checarCpf(this)"></div>' +
      '  <div class="campo"><label>Telefone / WhatsApp' + (primeiro ? ' *' : '') + '</label>' +
      '    <input class="r-tel" ' + (primeiro ? 'required ' : '') + 'placeholder="(34) 9....."></div>' +
      '  <div class="campo"><label>E-mail</label><input type="email" class="r-email" ' +
      '    placeholder="Vira o login do portal"></div>' +
      '</div>' +
      '<div class="linha-checks">' +
      '  <label class="check"><input type="checkbox" class="r-legal"' + (primeiro ? ' checked' : '') + '> Responsavel legal</label>' +
      '  <label class="check"><input type="checkbox" class="r-buscar" checked> Autorizado a buscar</label>' +
      '  <label class="check"><input type="checkbox" class="r-portal"' + (primeiro ? ' checked' : '') + '> Criar acesso ao portal</label>' +
      '</div>';
    document.getElementById('lista-resp').appendChild(bloco);
  },

  checarCpf(campo) {
    const v = campo.value.replace(/\D/g, '');
    if (!v) { campo.style.borderColor = ''; return; }
    if (validarCPF(v)) {
      campo.value = formatarCPF(v);
      campo.style.borderColor = 'var(--st-ok)';
    } else {
      campo.style.borderColor = 'var(--st-bad)';
    }
  },

  async buscarCep(cep) {
    cep = (cep || '').replace(/\D/g, '');
    if (cep.length !== 8) return;
    try {
      const r = await fetch('https://viacep.com.br/ws/' + cep + '/json/');
      const d = await r.json();
      if (d.erro) return;
      if (d.logradouro) document.getElementById('f-endereco').value = d.logradouro;
      if (d.bairro) document.getElementById('f-bairro').value = d.bairro;
      if (d.localidade) document.getElementById('f-cidade').value = d.localidade;
      if (d.uf) document.getElementById('f-uf').value = d.uf;
    } catch (e) { /* sem internet na API: preenchimento manual */ }
  },

  coletarResponsaveis() {
    const blocos = Array.from(document.querySelectorAll('.bloco-resp'));
    const lista = [];
    for (const b of blocos) {
      const nome = b.querySelector('.r-nome').value.trim();
      if (!nome) continue;
      const cpf = b.querySelector('.r-cpf').value.replace(/\D/g, '');
      if (cpf && !validarCPF(cpf)) {
        throw new Error('CPF invalido para o responsavel "' + nome + '".');
      }
      lista.push({
        nome: nome,
        parentesco: b.querySelector('.r-parentesco').value || null,
        cpf: cpf || null,
        telefone: b.querySelector('.r-tel').value.trim() || null,
        email: b.querySelector('.r-email').value.trim().toLowerCase() || null,
        responsavel_legal: b.querySelector('.r-legal').checked,
        autorizado_buscar: b.querySelector('.r-buscar').checked,
        portal: b.querySelector('.r-portal').checked
      });
    }
    if (lista.length === 0) throw new Error('Cadastre ao menos um responsavel.');
    if (!lista.some(r => r.responsavel_legal)) {
      throw new Error('Marque ao menos um responsavel legal.');
    }
    if (!lista.some(r => r.portal)) {
      throw new Error('Ao menos um responsavel precisa de acesso ao portal (para a Anamnese Global).');
    }
    return lista;
  },

  gerarSenha() {
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
    let s = '';
    const a = new Uint32Array(8);
    crypto.getRandomValues(a);
    for (let i = 0; i < 8; i++) s += chars[a[i] % chars.length];
    return s;
  },

  gerarLogin() {
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    return 'fam' + String(100000 + (a[0] % 900000)) + '@equilibrium.app';
  },

  async salvar(ev) {
    ev.preventDefault();
    const botao = document.getElementById('f-salvar');
    const erro = document.getElementById('f-erro');
    erro.classList.remove('visivel');
    botao.disabled = true;
    const passo = t => { botao.textContent = t; };

    try {
      const cpfPaciente = document.getElementById('f-cpf').value.replace(/\D/g, '');
      if (cpfPaciente && !validarCPF(cpfPaciente)) {
        throw new Error('CPF do paciente invalido.');
      }

      const responsaveis = this.coletarResponsaveis();

      const arquivo = document.getElementById('f-pdf').files[0] || null;
      if (arquivo && arquivo.type !== 'application/pdf') {
        throw new Error('O encaminhamento deve ser um arquivo PDF.');
      }

      // 1. Paciente
      passo('Salvando paciente...');
      const { data: pac, error: e1 } = await sb.from('pacientes').insert({
        nome: document.getElementById('f-nome').value.trim(),
        data_nascimento: document.getElementById('f-nasc').value,
        cpf: cpfPaciente || null,
        sexo: document.getElementById('f-sexo').value,
        convenio: document.getElementById('f-convenio').value.trim() || null,
        carteirinha: document.getElementById('f-carteirinha').value.trim() || null,
        escola: document.getElementById('f-escola').value.trim() || null,
        turno_escolar: document.getElementById('f-turno').value || null,
        cep: document.getElementById('f-cep').value.trim() || null,
        endereco: document.getElementById('f-endereco').value.trim() || null,
        numero: document.getElementById('f-numero').value.trim() || null,
        complemento: document.getElementById('f-complemento').value.trim() || null,
        bairro: document.getElementById('f-bairro').value.trim() || null,
        cidade: document.getElementById('f-cidade').value.trim() || null,
        uf: document.getElementById('f-uf').value.trim().toUpperCase() || null,
        observacoes: document.getElementById('f-obs').value.trim() || null,
        criado_por: this.sessao.user.id
      }).select('id, nome').single();
      if (e1) throw new Error('Paciente: ' + e1.message);

      // 2. PDF do encaminhamento
      let caminhoPdf = null;
      if (arquivo) {
        passo('Enviando PDF...');
        caminhoPdf = 'pacientes/' + pac.id + '/encaminhamento_' + Date.now() + '.pdf';
        const { error: e2 } = await sb.storage
          .from('documentos')
          .upload(caminhoPdf, arquivo, { contentType: 'application/pdf' });
        if (e2) throw new Error('PDF: ' + e2.message);
      }

      // 3. Encaminhamento
      passo('Registrando encaminhamento...');
      const medico = document.getElementById('f-medico').value.trim();
      const sessoes = parseInt(document.getElementById('f-sessoes').value, 10) || null;
      if (medico || sessoes || caminhoPdf) {
        const { error: e3 } = await sb.from('encaminhamentos').insert({
          paciente_id: pac.id,
          medico: medico || null,
          sessoes_semanais: sessoes,
          arquivo_path: caminhoPdf,
          criado_por: this.sessao.user.id
        });
        if (e3) throw new Error('Encaminhamento: ' + e3.message);
      }

      // 4. Responsaveis (+ acessos do portal quando marcados)
      const credenciais = [];
      const { data: sess } = await sb.auth.getSession();

      for (let i = 0; i < responsaveis.length; i++) {
        const r = responsaveis[i];
        passo('Responsavel ' + (i + 1) + ' de ' + responsaveis.length + '...');

        let usuarioId = null;
        if (r.portal) {
          const loginGerado = !r.email;
          const login = r.email || this.gerarLogin();
          const senha = this.gerarSenha();

          const resp = await fetch(CORTEX_CONFIG.SUPABASE_URL + '/functions/v1/criar-acesso', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + sess.session.access_token
            },
            body: JSON.stringify({ email: login, senha: senha, nome: r.nome, perfil: 'familia' })
          });
          const corpo = await resp.json();
          if (!resp.ok) throw new Error('Acesso de ' + r.nome + ': ' + (corpo.erro || 'falha'));

          usuarioId = corpo.usuario_id;

          const { error: e5 } = await sb.from('familia_pacientes').insert({
            usuario_id: usuarioId, paciente_id: pac.id, parentesco: r.parentesco
          });
          if (e5) throw new Error('Vinculo de ' + r.nome + ': ' + e5.message);

          credenciais.push({ nome: r.nome, telefone: r.telefone, login: login, senha: senha, gerado: loginGerado });
        }

        const { error: e4 } = await sb.from('responsaveis').insert({
          paciente_id: pac.id,
          nome: r.nome,
          parentesco: r.parentesco,
          cpf: r.cpf,
          telefone: r.telefone,
          email: r.email,
          responsavel_legal: r.responsavel_legal,
          autorizado_buscar: r.autorizado_buscar,
          principal: i === 0,
          usuario_id: usuarioId
        });
        if (e4) throw new Error('Responsavel ' + r.nome + ': ' + e4.message);
      }

      this.telaSucesso(pac.nome, credenciais);

    } catch (e) {
      erro.textContent = e.message;
      erro.classList.add('visivel');
      botao.disabled = false;
      botao.textContent = 'Admitir paciente';
      erro.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  },

  telaSucesso(paciente, credenciais) {
    const urlPortal = window.location.origin + window.location.pathname.replace('app.html', 'index.html');

    const blocos = credenciais.map((c, i) => {
      const mensagem =
        'Ola, ' + c.nome + '! Aqui e da Equilibrium Terapia Infantil.\n\n' +
        'O cadastro de ' + paciente + ' foi realizado com sucesso. ' +
        'Para iniciarmos, precisamos que preencha a Anamnese Global no nosso portal:\n\n' +
        'Acesso: ' + urlPortal + '\n' +
        'Login: ' + c.login + '\n' +
        'Senha: ' + c.senha + '\n\n' +
        'Qualquer duvida, estamos a disposicao!';

      return '<div class="cartao faixa-verde">' +
        '  <h3>' + escaparHtml(c.nome) + '</h3>' +
        '  <div class="grade-info">' +
        '    <div><small>Login' + (c.gerado ? ' (gerado pelo sistema)' : '') + '</small><b>' + escaparHtml(c.login) + '</b></div>' +
        '    <div><small>Senha temporaria</small><b>' + escaparHtml(c.senha) + '</b></div>' +
        '    <div><small>WhatsApp</small><b>' + escaparHtml(c.telefone || '-') + '</b></div>' +
        '  </div>' +
        '  <textarea id="msg-' + i + '" rows="9" readonly style="width:100%; margin-top:12px; font: inherit; ' +
        '    padding: 12px; border: 1.5px solid var(--line); border-radius: var(--raio-sm); ' +
        '    background: var(--surface-alt); color: var(--ink);">' + escaparHtml(mensagem) + '</textarea>' +
        '  <div class="barra-acoes" style="margin-top:10px">' +
        '    <button class="btn btn-fantasma" onclick="MODULOS.pacientes.copiar(\'msg-' + i + '\')">Copiar mensagem</button>' +
        '  </div>' +
        '</div>';
    }).join('');

    this.el.innerHTML =
      '<div class="pagina-cabecalho"><div>' +
      '  <h2>Admissao concluida</h2>' +
      '  <p class="sub">' + escaparHtml(paciente) + ' cadastrado(a). ' +
         credenciais.length + ' acesso(s) do portal criado(s). ' +
         'Anote ou copie as senhas agora: elas nao serao exibidas novamente.</p>' +
      '</div></div>' +
      blocos +
      '<div class="barra-acoes">' +
      '  <button class="btn btn-primario" onclick="MODULOS.pacientes.telaLista()">Concluir</button>' +
      '</div>';
  },

  async copiar(id) {
    const t = document.getElementById(id);
    try {
      await navigator.clipboard.writeText(t.value);
      alert('Mensagem copiada!');
    } catch (e) {
      t.select();
      document.execCommand('copy');
      alert('Mensagem copiada!');
    }
  }
};
