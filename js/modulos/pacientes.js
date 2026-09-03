// ============================================================================
// CORTEX aba - js/modulos/pacientes.js
// Sprint 2: lista de pacientes + nova admissao (encaminhamento PDF +
// criacao automatica do acesso da familia via Edge Function criar-acesso).
// ============================================================================

window.MODULOS = window.MODULOS || {};

window.MODULOS.pacientes = {

  PODE_ADMITIR: ['direcao', 'coordenador', 'callcenter', 'suporte'],

  el: null,
  sessao: null,

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
      '  <input type="search" id="pac-busca" placeholder="Buscar por nome do paciente ou responsavel..." ' +
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
      .select('id, nome, data_nascimento, nivel, status, responsavel_nome, responsavel_telefone')
      .order('nome');

    if (error) {
      document.getElementById('pac-lista').innerHTML =
        '<div class="cartao"><div class="mensagem-erro visivel">Erro ao carregar pacientes: ' +
        escaparHtml(error.message) + '</div></div>';
      return;
    }

    this.dados = data || [];
    this.filtrar();
  },

  filtrar() {
    const termo = (document.getElementById('pac-busca')?.value || '').toLowerCase();
    const status = document.getElementById('pac-status')?.value || '';

    const filtrados = this.dados.filter(p =>
      (!termo || p.nome.toLowerCase().includes(termo) ||
        (p.responsavel_nome || '').toLowerCase().includes(termo)) &&
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
             escaparHtml(p.responsavel_nome || '-') + '</span>' +
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

  // ─────────────────────────── DETALHE (basico) ───────────────────────────

  async telaDetalhe(id) {
    const { data: p, error } = await sb
      .from('pacientes').select('*').eq('id', id).single();

    if (error || !p) { this.telaLista(); return; }

    const { data: enc } = await sb
      .from('encaminhamentos')
      .select('id, medico, sessoes_semanais, arquivo_path, criado_em')
      .eq('paciente_id', id)
      .order('criado_em', { ascending: false });

    this.el.innerHTML =
      '<div class="pagina-cabecalho">' +
      '  <div>' +
      '    <button class="btn-voltar" onclick="MODULOS.pacientes.telaLista()">&larr; Pacientes</button>' +
      '    <h2>' + escaparHtml(p.nome) + '</h2>' +
      '    <p class="sub">' + calcularIdade(p.data_nascimento) + ' &middot; ' +
           new Date(p.data_nascimento + 'T12:00:00').toLocaleDateString('pt-BR') + '</p>' +
      '  </div>' +
      '  <div class="pac-selos">' + this.seloNivel(p.nivel) + this.seloStatus(p.status) + '</div>' +
      '</div>' +

      '<div class="cartao faixa-azul">' +
      '  <h3>Responsavel</h3>' +
      '  <div class="grade-info">' +
      '    <div><small>Nome</small><b>' + escaparHtml(p.responsavel_nome || '-') + '</b></div>' +
      '    <div><small>Telefone</small><b>' + escaparHtml(p.responsavel_telefone || '-') + '</b></div>' +
      '    <div><small>E-mail / login do portal</small><b>' + escaparHtml(p.responsavel_email || '-') + '</b></div>' +
      '    <div><small>Convenio</small><b>' + escaparHtml(p.convenio || '-') +
           (p.carteirinha ? ' &middot; ' + escaparHtml(p.carteirinha) : '') + '</b></div>' +
      '  </div>' +
      '</div>' +

      '<div class="cartao faixa-ambar">' +
      '  <h3>Encaminhamento medico</h3>' +
      '  <div id="pac-encaminhamentos">' +
      ((enc && enc.length)
        ? enc.map(e =>
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
      '  </div>' +
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
    this.el.innerHTML =
      '<div class="pagina-cabecalho">' +
      '  <div>' +
      '    <button class="btn-voltar" onclick="MODULOS.pacientes.telaLista()">&larr; Pacientes</button>' +
      '    <h2>Nova admissao</h2>' +
      '    <p class="sub">Cadastro do paciente, encaminhamento medico e criacao do acesso da familia.</p>' +
      '  </div>' +
      '</div>' +

      '<form onsubmit="MODULOS.pacientes.salvar(event)">' +

      '<div class="cartao faixa-azul">' +
      '  <h3>Paciente</h3>' +
      '  <div class="grade-form">' +
      '    <div class="campo c2"><label>Nome completo *</label><input id="f-nome" required></div>' +
      '    <div class="campo"><label>Data de nascimento *</label><input type="date" id="f-nasc" required></div>' +
      '    <div class="campo"><label>Convenio</label><input id="f-convenio" placeholder="Unimed, particular..."></div>' +
      '    <div class="campo"><label>Carteirinha</label><input id="f-carteirinha"></div>' +
      '  </div>' +
      '</div>' +

      '<div class="cartao faixa-azul">' +
      '  <h3>Responsavel legal</h3>' +
      '  <div class="grade-form">' +
      '    <div class="campo c2"><label>Nome do responsavel *</label><input id="f-resp-nome" required></div>' +
      '    <div class="campo"><label>Telefone / WhatsApp *</label><input id="f-resp-tel" required placeholder="(34) 9...."></div>' +
      '    <div class="campo"><label>E-mail (vira o login do portal)</label>' +
      '      <input type="email" id="f-resp-email" placeholder="Se vazio, o sistema gera um login">' +
      '    </div>' +
      '  </div>' +
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

      '<div class="mensagem-erro" id="f-erro"></div>' +
      '<div class="barra-acoes">' +
      '  <button type="button" class="btn btn-fantasma" onclick="MODULOS.pacientes.telaLista()">Cancelar</button>' +
      '  <button type="submit" class="btn btn-primario" id="f-salvar">Admitir paciente</button>' +
      '</div>' +
      '</form>';
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
      const nome = document.getElementById('f-nome').value.trim();
      const nasc = document.getElementById('f-nasc').value;
      const respNome = document.getElementById('f-resp-nome').value.trim();
      const respTel = document.getElementById('f-resp-tel').value.trim();
      let respEmail = document.getElementById('f-resp-email').value.trim().toLowerCase();
      const medico = document.getElementById('f-medico').value.trim();
      const sessoes = parseInt(document.getElementById('f-sessoes').value, 10) || null;
      const arquivo = document.getElementById('f-pdf').files[0] || null;

      if (arquivo && arquivo.type !== 'application/pdf') {
        throw new Error('O encaminhamento deve ser um arquivo PDF.');
      }

      const loginGerado = !respEmail;
      if (loginGerado) respEmail = this.gerarLogin();

      // 1. Cria o paciente
      passo('Salvando paciente...');
      const { data: pac, error: e1 } = await sb.from('pacientes').insert({
        nome: nome,
        data_nascimento: nasc,
        convenio: document.getElementById('f-convenio').value.trim() || null,
        carteirinha: document.getElementById('f-carteirinha').value.trim() || null,
        responsavel_nome: respNome,
        responsavel_telefone: respTel,
        responsavel_email: respEmail,
        criado_por: this.sessao.user.id
      }).select('id').single();
      if (e1) throw new Error('Paciente: ' + e1.message);

      // 2. Sobe o PDF do encaminhamento
      let caminhoPdf = null;
      if (arquivo) {
        passo('Enviando PDF...');
        caminhoPdf = 'pacientes/' + pac.id + '/encaminhamento_' + Date.now() + '.pdf';
        const { error: e2 } = await sb.storage
          .from('documentos')
          .upload(caminhoPdf, arquivo, { contentType: 'application/pdf' });
        if (e2) throw new Error('PDF: ' + e2.message);
      }

      // 3. Registra o encaminhamento
      passo('Registrando encaminhamento...');
      const { error: e3 } = await sb.from('encaminhamentos').insert({
        paciente_id: pac.id,
        medico: medico || null,
        sessoes_semanais: sessoes,
        arquivo_path: caminhoPdf,
        criado_por: this.sessao.user.id
      });
      if (e3) throw new Error('Encaminhamento: ' + e3.message);

      // 4. Cria o acesso da familia (Edge Function com service role)
      passo('Criando acesso da familia...');
      const senha = this.gerarSenha();
      const { data: sess } = await sb.auth.getSession();
      const resp = await fetch(CORTEX_CONFIG.SUPABASE_URL + '/functions/v1/criar-acesso', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + sess.session.access_token
        },
        body: JSON.stringify({
          email: respEmail, senha: senha, nome: respNome, perfil: 'familia'
        })
      });
      const corpo = await resp.json();
      if (!resp.ok) throw new Error('Acesso da familia: ' + (corpo.erro || 'falha desconhecida'));

      // 5. Vincula usuario-familia ao paciente
      passo('Vinculando familia...');
      const { error: e5 } = await sb.from('familia_pacientes').insert({
        usuario_id: corpo.usuario_id,
        paciente_id: pac.id
      });
      if (e5) throw new Error('Vinculo: ' + e5.message);

      // 6. Tela de sucesso com credenciais para enviar no WhatsApp
      this.telaSucesso(nome, respNome, respTel, respEmail, senha, loginGerado);

    } catch (e) {
      erro.textContent = e.message;
      erro.classList.add('visivel');
      botao.disabled = false;
      botao.textContent = 'Admitir paciente';
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }
  },

  telaSucesso(paciente, respNome, respTel, login, senha, loginGerado) {
    const urlPortal = window.location.origin + window.location.pathname.replace('app.html', 'index.html');
    const mensagem =
      'Ola, ' + respNome + '! Aqui e da Equilibrium Terapia Infantil.\n\n' +
      'O cadastro de ' + paciente + ' foi realizado com sucesso. ' +
      'Para iniciarmos, precisamos que preencha a Anamnese Global no nosso portal:\n\n' +
      'Acesso: ' + urlPortal + '\n' +
      'Login: ' + login + '\n' +
      'Senha: ' + senha + '\n\n' +
      'Qualquer duvida, estamos a disposicao!';

    this.el.innerHTML =
      '<div class="pagina-cabecalho"><div>' +
      '  <h2>Admissao concluida</h2>' +
      '  <p class="sub">' + escaparHtml(paciente) + ' cadastrado(a) e acesso da familia criado.</p>' +
      '</div></div>' +

      '<div class="cartao faixa-verde">' +
      '  <h3>Credenciais do portal da familia</h3>' +
      '  <div class="grade-info">' +
      '    <div><small>Login' + (loginGerado ? ' (gerado pelo sistema)' : '') + '</small><b>' + escaparHtml(login) + '</b></div>' +
      '    <div><small>Senha temporaria</small><b>' + escaparHtml(senha) + '</b></div>' +
      '    <div><small>WhatsApp do responsavel</small><b>' + escaparHtml(respTel) + '</b></div>' +
      '  </div>' +
      '  <p class="sub" style="margin-top:10px">Anote ou copie agora: a senha nao sera exibida novamente.</p>' +
      '</div>' +

      '<div class="cartao">' +
      '  <h3>Mensagem pronta para o WhatsApp</h3>' +
      '  <textarea id="msg-whats" rows="9" readonly style="width:100%; font: inherit; padding: 12px; ' +
      '    border: 1.5px solid var(--line); border-radius: var(--raio-sm); background: var(--surface-alt); ' +
      '    color: var(--ink);">' + escaparHtml(mensagem) + '</textarea>' +
      '  <div class="barra-acoes" style="margin-top:12px">' +
      '    <button class="btn btn-fantasma" onclick="MODULOS.pacientes.copiarMensagem()">Copiar mensagem</button>' +
      '    <button class="btn btn-primario" onclick="MODULOS.pacientes.telaLista()">Concluir</button>' +
      '  </div>' +
      '</div>';
  },

  async copiarMensagem() {
    const t = document.getElementById('msg-whats');
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
