// ============================================================================
// CORTEX aba - js/modulos/admin.js
// Usuarios e Acessos: criar acessos da equipe pelo proprio sistema,
// redefinir senha (equipe e familias), ativar/inativar e mudar perfil.
// Exclusivo de direcao e suporte. Usa a Edge Function criar-acesso (v2).
// ============================================================================

window.MODULOS = window.MODULOS || {};

window.MODULOS.admin = {

  PERFIS_EQUIPE: ['direcao', 'coordenador', 'terapeuta', 'aplicador', 'callcenter', 'recepcao', 'suporte'],

  el: null,
  sessao: null,
  equipe: [],
  familias: [],

  async render(el, sessao) {
    this.el = el;
    this.sessao = sessao;

    el.innerHTML =
      '<div class="pagina-cabecalho">' +
      '  <div><h2>Usuarios e Acessos</h2>' +
      '  <p class="sub">Crie e gerencie os acessos da equipe e das familias.</p></div>' +
      '  <button class="btn btn-primario" onclick="MODULOS.admin.modalNovo()">+ Novo acesso da equipe</button>' +
      '</div>' +
      '<div id="adm-corpo"><div class="cartao"><p class="sub">Carregando...</p></div></div>';

    await this.carregar();
    this.desenhar();
  },

  async carregar() {
    const { data } = await sb.from('profiles')
      .select('id, nome, email, perfil, ativo, criado_em')
      .order('nome');
    const todos = data || [];
    this.equipe = todos.filter(p => p.perfil !== 'familia');
    this.familias = todos.filter(p => p.perfil === 'familia');

    // Vinculos das familias (para mostrar de qual crianca e o acesso)
    const { data: vinc } = await sb.from('familia_pacientes')
      .select('usuario_id, pacientes(nome)');
    this._vinculos = {};
    (vinc || []).forEach(v => {
      if (!v.pacientes) return;
      (this._vinculos[v.usuario_id] = this._vinculos[v.usuario_id] || [])
        .push(v.pacientes.nome.split(' ')[0]);
    });
  },

  desenhar() {
    const eu = this.sessao.user.id;

    const linhaEquipe = p =>
      '<div class="linha-doc">' +
      '<div><b>' + escaparHtml(p.nome) + (p.id === eu ? ' (voce)' : '') + '</b>' +
      '<small>' + escaparHtml(p.email || 'e-mail nao registrado') + '</small></div>' +
      '<div class="pac-selos">' +
      '<span class="selo selo-roxo">' + (ROTULOS_PERFIL[p.perfil] || p.perfil) + '</span>' +
      (p.ativo ? '<span class="selo selo-ok">Ativo</span>' : '<span class="selo selo-bad">Inativo</span>') +
      '<button class="btn-chip" onclick="MODULOS.admin.modalUsuario(\'' + p.id + '\')">Gerenciar</button>' +
      '</div></div>';

    const linhaFamilia = p => {
      const criancas = (this._vinculos[p.id] || []).join(', ');
      return '<div class="linha-doc">' +
        '<div><b>' + escaparHtml(p.nome) + '</b>' +
        '<small>' + escaparHtml(p.email || '-') +
        (criancas ? ' &middot; responsavel por ' + escaparHtml(criancas) : '') + '</small></div>' +
        '<div class="pac-selos">' +
        (p.ativo ? '<span class="selo selo-ok">Ativo</span>' : '<span class="selo selo-bad">Inativo</span>') +
        '<button class="btn-chip" onclick="MODULOS.admin.modalUsuario(\'' + p.id + '\')">Gerenciar</button>' +
        '</div></div>';
    };

    document.getElementById('adm-corpo').innerHTML =
      '<div class="cartao faixa-roxo"><h3>Equipe (' + this.equipe.length + ')</h3>' +
      (this.equipe.map(linhaEquipe).join('') || '<p class="sub">Ninguem ainda.</p>') +
      '</div>' +
      '<div class="cartao faixa-azul"><h3>Familias (' + this.familias.length + ')</h3>' +
      (this.familias.map(linhaFamilia).join('') || '<p class="sub">Nenhum acesso de familia.</p>') +
      '</div>';
  },

  // ─────────────── NOVO ACESSO DA EQUIPE ───────────────

  modalNovo() {
    abrirModal('Novo acesso da equipe',
      '<div class="grade-form">' +
      '  <div class="campo c2"><label>Nome completo *</label><input id="nv-nome"></div>' +
      '  <div class="campo"><label>Perfil *</label><select id="nv-perfil">' +
      this.PERFIS_EQUIPE.map(p =>
        '<option value="' + p + '">' + (ROTULOS_PERFIL[p] || p) + '</option>').join('') +
      '  </select></div>' +
      '  <div class="campo c3"><label>E-mail (login) *</label>' +
      '    <input type="email" id="nv-email" placeholder="nome@equilibrium.com.br"></div>' +
      '</div>' +
      '<p class="sub">A senha e gerada automaticamente e exibida uma unica vez apos a criacao.</p>' +
      '<div class="mensagem-erro" id="nv-erro"></div>' +
      '<div class="barra-acoes">' +
      '  <button class="btn btn-fantasma" onclick="fecharModal()">Cancelar</button>' +
      '  <button class="btn btn-primario" id="nv-salvar" onclick="MODULOS.admin.criarAcesso()">Criar acesso</button>' +
      '</div>');
  },

  gerarSenha() {
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
    let s = '';
    const a = new Uint32Array(10);
    crypto.getRandomValues(a);
    for (let i = 0; i < 10; i++) s += chars[a[i] % chars.length];
    return s;
  },

  async criarAcesso() {
    const nome = document.getElementById('nv-nome').value.trim();
    const email = document.getElementById('nv-email').value.trim().toLowerCase();
    const perfil = document.getElementById('nv-perfil').value;
    const erro = document.getElementById('nv-erro');
    const botao = document.getElementById('nv-salvar');
    erro.classList.remove('visivel');

    if (!nome || !email) {
      erro.textContent = 'Preencha nome e e-mail.';
      erro.classList.add('visivel');
      return;
    }

    botao.disabled = true;
    botao.textContent = 'Criando...';

    try {
      const senha = this.gerarSenha();
      const { data: sess } = await sb.auth.getSession();
      const resp = await fetch(CORTEX_CONFIG.SUPABASE_URL + '/functions/v1/criar-acesso', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + sess.session.access_token
        },
        body: JSON.stringify({ acao: 'criar', email: email, senha: senha, nome: nome, perfil: perfil })
      });
      const corpo = await resp.json();
      if (!resp.ok) throw new Error(corpo.erro || 'Falha ao criar o acesso.');

      abrirModal('Acesso criado: ' + escaparHtml(nome),
        '<div class="grade-info">' +
        '  <div><small>Login</small><b>' + escaparHtml(email) + '</b></div>' +
        '  <div><small>Senha temporaria</small><b>' + escaparHtml(senha) + '</b></div>' +
        '  <div><small>Perfil</small><b>' + (ROTULOS_PERFIL[perfil] || perfil) + '</b></div>' +
        '</div>' +
        '<p class="sub" style="margin-top:12px">Anote ou copie agora: a senha nao sera exibida novamente.</p>' +
        '<div class="barra-acoes">' +
        '  <button class="btn btn-primario" onclick="fecharModal(); MODULOS.admin.render(MODULOS.admin.el, MODULOS.admin.sessao)">Concluir</button>' +
        '</div>');
    } catch (e) {
      erro.textContent = e.message;
      erro.classList.add('visivel');
      botao.disabled = false;
      botao.textContent = 'Criar acesso';
    }
  },

  // ─────────────── GERENCIAR USUARIO ───────────────

  modalUsuario(id) {
    const p = this.equipe.find(x => x.id === id) || this.familias.find(x => x.id === id);
    if (!p) return;
    const eu = p.id === this.sessao.user.id;
    const ehFamilia = p.perfil === 'familia';

    abrirModal('Gerenciar: ' + escaparHtml(p.nome),
      '<div class="grade-info" style="margin-bottom:14px">' +
      '  <div><small>Login</small><b>' + escaparHtml(p.email || '-') + '</b></div>' +
      '  <div><small>Perfil</small><b>' + (ROTULOS_PERFIL[p.perfil] || p.perfil) + '</b></div>' +
      '  <div><small>Situacao</small><b>' + (p.ativo ? 'Ativo' : 'Inativo') + '</b></div>' +
      '</div>' +

      (!ehFamilia && !eu
        ? '<div class="campo"><label>Mudar perfil</label>' +
          '<select id="ger-perfil">' +
          this.PERFIS_EQUIPE.map(x =>
            '<option value="' + x + '"' + (x === p.perfil ? ' selected' : '') + '>' +
            (ROTULOS_PERFIL[x] || x) + '</option>').join('') +
          '</select></div>'
        : '') +
      (eu ? '<p class="sub">Voce nao pode mudar o proprio perfil nem se inativar.</p>' : '') +

      '<div class="mensagem-erro" id="ger-erro"></div>' +
      '<div class="barra-acoes" style="flex-wrap:wrap">' +
      '  <button class="btn btn-fantasma" onclick="MODULOS.admin.redefinirSenha(\'' + p.id + '\', \'' +
           escaparHtml(p.nome).replace(/'/g, '') + '\')">Redefinir senha</button>' +
      (!eu
        ? '<button class="btn btn-fantasma" style="color:' + (p.ativo ? 'var(--st-bad); border-color:var(--st-bad)' : 'var(--st-ok); border-color:var(--st-ok)') + '" ' +
          'onclick="MODULOS.admin.alternarAtivo(\'' + p.id + '\', ' + (!p.ativo) + ')">' +
          (p.ativo ? 'Inativar acesso' : 'Reativar acesso') + '</button>'
        : '') +
      (!ehFamilia && !eu
        ? '<button class="btn btn-primario" onclick="MODULOS.admin.salvarPerfil(\'' + p.id + '\')">Salvar perfil</button>'
        : '') +
      '</div>');
  },

  async salvarPerfil(id) {
    const novo = document.getElementById('ger-perfil').value;
    const erro = document.getElementById('ger-erro');
    const { error } = await sb.from('profiles').update({ perfil: novo }).eq('id', id);
    if (error) {
      erro.textContent = error.message;
      erro.classList.add('visivel');
      return;
    }
    fecharModal();
    await this.carregar();
    this.desenhar();
  },

  async alternarAtivo(id, ativo) {
    if (!ativo && !confirm('Inativar este acesso? A pessoa nao conseguira mais entrar no sistema.')) return;
    const { error } = await sb.from('profiles').update({ ativo: ativo }).eq('id', id);
    if (error) { alert('Erro: ' + error.message); return; }
    fecharModal();
    await this.carregar();
    this.desenhar();
  },

  async redefinirSenha(id, nome) {
    if (!confirm('Gerar uma nova senha para ' + nome + '? A senha atual deixa de funcionar.')) return;

    const senha = this.gerarSenha();
    try {
      const { data: sess } = await sb.auth.getSession();
      const resp = await fetch(CORTEX_CONFIG.SUPABASE_URL + '/functions/v1/criar-acesso', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + sess.session.access_token
        },
        body: JSON.stringify({ acao: 'redefinir', usuario_id: id, senha: senha })
      });
      const corpo = await resp.json();
      if (!resp.ok) throw new Error(corpo.erro || 'Falha ao redefinir.');

      abrirModal('Nova senha de ' + escaparHtml(nome),
        '<div class="grade-info"><div><small>Senha temporaria</small><b style="font-size:16px">' +
        escaparHtml(senha) + '</b></div></div>' +
        '<p class="sub" style="margin-top:12px">Envie com seguranca. Ela nao sera exibida novamente.</p>' +
        '<div class="barra-acoes"><button class="btn btn-primario" onclick="fecharModal()">Concluir</button></div>');
    } catch (e) {
      alert('Erro: ' + e.message);
    }
  }
};
