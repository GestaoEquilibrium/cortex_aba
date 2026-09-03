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
    const podeAdmitir = this.PODE_ADMITIR.includes(this.sessao.profile.perfil);

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

  // ─────────────────────────── DETALHE ───────────────────────────

  async telaDetalhe(id) {
    const { data: p, error } = await sb
      .from('pacientes')
      .select('*, responsaveis(*), encaminhamentos(id, medico, sessoes_semanais, arquivo_path, criado_em)')
      .eq('id', id).single();

    if (error || !p) { this.telaLista(); return; }

    const endereco = [p.endereco, p.numero, p.complemento, p.bairro,
      (p.cidade && p.uf) ? p.cidade + '/' + p.uf : (p.cidade || p.uf)]
      .filter(Boolean).join(', ');

    const resps = (p.responsaveis || []).sort((a, b) => (b.principal ? 1 : 0) - (a.principal ? 1 : 0));
    const encs = (p.encaminhamentos || []).sort((a, b) => b.criado_em.localeCompare(a.criado_em));

    this.el.innerHTML =
      '<div class="pagina-cabecalho">' +
      '  <div>' +
      '    <button class="btn-voltar" onclick="MODULOS.pacientes.telaLista()">&larr; Pacientes</button>' +
      '    <h2>' + escaparHtml(p.nome) + '</h2>' +
      '    <p class="sub">' + calcularIdade(p.data_nascimento) + ' &middot; nasc. ' +
           new Date(p.data_nascimento + 'T12:00:00').toLocaleDateString('pt-BR') +
           (p.cpf ? ' &middot; CPF ' + formatarCPF(p.cpf) : '') + '</p>' +
      '  </div>' +
      '  <div class="pac-selos">' + this.seloNivel(p.nivel) + this.seloStatus(p.status) + '</div>' +
      '</div>' +

      '<div class="cartao faixa-azul">' +
      '  <h3>Dados do paciente</h3>' +
      '  <div class="grade-info">' +
      '    <div><small>Sexo</small><b>' + (p.sexo === 'M' ? 'Masculino' : p.sexo === 'F' ? 'Feminino' : '-') + '</b></div>' +
      '    <div><small>Convenio</small><b>' + escaparHtml(p.convenio || '-') +
           (p.carteirinha ? ' &middot; ' + escaparHtml(p.carteirinha) : '') + '</b></div>' +
      '    <div><small>Escola</small><b>' + escaparHtml(p.escola || '-') +
           (p.turno_escolar ? ' &middot; ' + escaparHtml(p.turno_escolar) : '') + '</b></div>' +
      '    <div class="c-toda"><small>Endereco</small><b>' + escaparHtml(endereco || '-') +
           (p.cep ? ' &middot; CEP ' + escaparHtml(p.cep) : '') + '</b></div>' +
      (p.observacoes ? '<div class="c-toda"><small>Observacoes</small><b>' + escaparHtml(p.observacoes) + '</b></div>' : '') +
      '  </div>' +
      '</div>' +

      '<div class="cartao faixa-roxo">' +
      '  <h3>Responsaveis e acompanhantes</h3>' +
      (resps.length ? resps.map(r =>
        '<div class="linha-doc">' +
        '  <div>' +
        '    <b>' + escaparHtml(r.nome) + '</b>' +
        '    <small>' + escaparHtml(r.parentesco || '-') +
             (r.telefone ? ' &middot; ' + escaparHtml(r.telefone) : '') +
             (r.cpf ? ' &middot; CPF ' + formatarCPF(r.cpf) : '') + '</small>' +
        '  </div>' +
        '  <div class="pac-selos">' +
        (r.principal ? '<span class="selo selo-roxo">Principal</span>' : '') +
        (r.responsavel_legal ? '<span class="selo selo-ok">Resp. legal</span>' : '') +
        (r.autorizado_buscar ? '<span class="selo selo-neutro">Busca</span>' : '') +
        (r.usuario_id ? '<span class="selo selo-ok">Portal</span>' : '<span class="selo selo-neutro">Sem portal</span>') +
        '  </div>' +
        '</div>').join('')
      : '<p class="sub">Nenhum responsavel cadastrado.</p>') +
      '</div>' +

      '<div class="cartao faixa-ambar">' +
      '  <h3>Encaminhamento medico</h3>' +
      (encs.length ? encs.map(e =>
        '<div class="linha-doc">' +
        '  <div><b>' + escaparHtml(e.medico || 'Medico nao informado') + '</b>' +
        '  <small>' + (e.sessoes_semanais ? e.sessoes_semanais + ' sessoes/semana &middot; ' : '') +
           new Date(e.criado_em).toLocaleDateString('pt-BR') + '</small></div>' +
        (e.arquivo_path
          ? '<button class="btn btn-fantasma" onclick="MODULOS.pacientes.abrirPdf(\'' + e.arquivo_path + '\')">Ver PDF</button>'
          : '<span class="selo selo-neutro">Sem arquivo</span>') +
        '</div>').join('')
      : '<p class="sub">Nenhum encaminhamento registrado.</p>') +
      '</div>' +

      '<div class="cartao">' +
      '  <h3>Proximas etapas</h3>' +
      '  <p class="sub">Anamnese Global (portal da familia), definicao de nivel e agendamento chegam no Sprint 3.</p>' +
      '</div>';
  },

  async abrirPdf(caminho) {
    const { data, error } = await sb.storage
      .from('documentos')
      .createSignedUrl(caminho, 300);
    if (error || !data) { alert('Nao foi possivel abrir o arquivo.'); return; }
    window.open(data.signedUrl, '_blank');
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
