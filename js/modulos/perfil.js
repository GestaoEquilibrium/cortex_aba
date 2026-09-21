// ============================================================================
// CORTEX aba - js/modulos/perfil.js
// Meu perfil: janela suspensa aberta pela foto/nome da sidebar para o proprio
// usuario completar dados pessoais e trocar a foto (reusa MODULOS.foto).
// ============================================================================

window.MODULOS = window.MODULOS || {};

window.MODULOS.perfil = {

  _p: null,

  async abrir() {
    document.getElementById('meu-perfil-overlay')?.remove();
    const ov = document.createElement('div');
    ov.id = 'meu-perfil-overlay';
    ov.className = 'folha-overlay';
    ov.innerHTML = '<div class="folha-pagina" style="max-width:560px" id="meu-perfil-corpo">' +
      '<p class="sub">Carregando...</p></div>';
    document.body.appendChild(ov);

    const eu = window.CORTEX_SESSAO.user.id;
    const { data: p } = await sb.from('profiles')
      .select('id, nome, email, perfil, foto_path, assinatura_path, telefone, data_nascimento, registro_classe, formacao, endereco')
      .eq('id', eu).single();
    if (!p) { ov.remove(); return; }
    this._p = p;

    let fotoUrl = null;
    let assUrl = null;
    if (p.assinatura_path) { const { data: a } = await sb.storage.from('documentos').createSignedUrl(p.assinatura_path, 3600); assUrl = a ? a.signedUrl : null; }
    if (p.foto_path) {
      const { data } = await sb.storage.from('documentos').createSignedUrl(p.foto_path, 3600);
      fotoUrl = data ? data.signedUrl : null;
    }

    document.getElementById('meu-perfil-corpo').innerHTML =
      '<div class="pagina-cabecalho">' +
      '  <div><button class="btn-voltar" onclick="document.getElementById(\'meu-perfil-overlay\').remove()">&larr; Fechar</button>' +
      '  <h2>Meu perfil</h2>' +
      '  <p class="sub">Seus dados pessoais e sua foto. O que for da conta (e-mail, perfil de acesso) fica com a coordenacao.</p></div>' +
      '</div>' +

      '<div class="cartao" style="display:flex; gap:16px; align-items:center">' +
      '  <div class="avatar" id="mp-avatar" style="width:84px; height:84px; font-size:26px; flex:none">' +
      (fotoUrl
        ? '<img src="' + fotoUrl + '" style="width:100%; height:100%; object-fit:cover; border-radius:inherit">'
        : iniciais(p.nome)) +
      '  </div>' +
      '  <div>' +
      '    <b style="font-size:15px">' + escaparHtml(p.nome) + '</b><br>' +
      '    <span class="sub">' + escaparHtml(p.email || '') + ' &middot; ' +
           (ROTULOS_PERFIL[p.perfil] || p.perfil) + '</span><br>' +
      '    <button class="btn-chip" style="margin-top:8px" onclick="document.getElementById(\'mp-arquivo\').click()">Trocar foto</button>' +
      '    <input type="file" id="mp-arquivo" accept="image/*" style="display:none" ' +
      '      onchange="MODULOS.perfil.trocarFoto(this)">' +
      '    <span class="sub" id="mp-foto-msg" style="margin-left:8px"></span>' +
      '  </div>' +
      '</div>' +

      '<div class="cartao"><h3>Assinatura digital</h3>' +
      '<p class="sub" style="margin-bottom:8px">Imagem da sua assinatura (PNG com fundo transparente, ou foto da assinatura em papel branco). Entra automaticamente nos documentos em que seu nome for escolhido como assinante.</p>' +
      '<div style="display:flex; gap:14px; align-items:center; flex-wrap:wrap">' +
      '  <div class="ass-previa" id="mp-ass-previa">' + (assUrl ? '<img src="' + assUrl + '" alt="">' : '<span class="sub">sem assinatura</span>') + '</div>' +
      '  <div><button class="btn-chip" onclick="document.getElementById(\'mp-ass-arq\').click()">' + (assUrl ? 'Trocar assinatura' : 'Enviar assinatura') + '</button>' +
      (assUrl ? ' <button class="btn-chip" onclick="MODULOS.perfil.removerAssinatura()">Remover</button>' : '') +
      '  <input type="file" id="mp-ass-arq" accept="image/png,image/jpeg" style="display:none" onchange="MODULOS.perfil.trocarAssinatura(this)">' +
      '  <div class="sub" id="mp-ass-msg" style="margin-top:6px"></div></div></div></div>' +
      '<div class="cartao"><div class="grade-form">' +
      '  <div class="campo c2"><label>Nome completo</label>' +
      '    <input id="mp-nome" value="' + escaparHtml(p.nome || '') + '"></div>' +
      '  <div class="campo"><label>Data de nascimento</label>' +
      '    <input type="date" id="mp-nasc" value="' + (p.data_nascimento || '') + '"></div>' +
      '  <div class="campo"><label>Telefone</label>' +
      '    <input id="mp-tel" placeholder="(34) 9...." value="' + escaparHtml(p.telefone || '') + '"></div>' +
      '  <div class="campo"><label>Registro de classe</label>' +
      '    <input id="mp-reg" placeholder="Ex.: CRP 04/12345" value="' + escaparHtml(p.registro_classe || '') + '"></div>' +
      '  <div class="campo"><label>Formacao</label>' +
      '    <input id="mp-form" placeholder="Ex.: Psicologia" value="' + escaparHtml(p.formacao || '') + '"></div>' +
      '  <div class="campo c3"><label>Endereco</label>' +
      '    <input id="mp-end" value="' + escaparHtml(p.endereco || '') + '"></div>' +
      '</div>' +
      '<div class="mensagem-erro" id="mp-erro"></div>' +
      '<div class="barra-acoes">' +
      '  <button class="btn btn-fantasma" onclick="document.getElementById(\'meu-perfil-overlay\').remove()">Cancelar</button>' +
      '  <button class="btn btn-primario" id="mp-salvar" onclick="MODULOS.perfil.salvar()">Salvar</button>' +
      '</div></div>';
  },

  async trocarAssinatura(input) {
    const arquivo = input.files[0]; if (!arquivo) return;
    const msg = document.getElementById('mp-ass-msg');
    if (arquivo.size > 3 * 1024 * 1024) { msg.textContent = 'Ate 3 MB.'; return; }
    msg.textContent = 'Enviando...';
    const eu = window.CORTEX_SESSAO.user.id;
    const ext = /png/i.test(arquivo.type) ? 'png' : 'jpg';
    const caminho = 'perfil/' + eu + '/assinatura_' + Date.now() + '.' + ext;
    const { error } = await sb.storage.from('documentos').upload(caminho, arquivo, { contentType: arquivo.type });
    if (error) { msg.textContent = 'Falha: ' + error.message; return; }
    const { error: e2 } = await sb.from('profiles').update({ assinatura_path: caminho }).eq('id', eu);
    if (e2) { msg.textContent = 'Falha: ' + e2.message; return; }
    msg.textContent = 'Assinatura salva.';
    await carregarAssinaturas();
    this.abrir();
  },
  async removerAssinatura() {
    if (!await popConfirmar('Remover sua assinatura digital dos documentos?')) return;
    const eu = window.CORTEX_SESSAO.user.id;
    const { error } = await sb.from('profiles').update({ assinatura_path: null }).eq('id', eu);
    if (error) { popAviso('Erro: ' + error.message); return; }
    await carregarAssinaturas();
    this.abrir();
  },

  async trocarFoto(input) {
    const arquivo = input.files && input.files[0];
    const msg = document.getElementById('mp-foto-msg');
    if (!arquivo) return;

    const ajustada = await MODULOS.foto.ajustar(arquivo);
    input.value = '';
    if (!ajustada) { msg.textContent = 'JPG ou PNG, ate 8 MB.'; return; }

    msg.textContent = 'Enviando...';
    const eu = window.CORTEX_SESSAO.user.id;
    const caminho = 'perfil/' + eu + '/foto_' + Date.now() + '.jpg';

    const { error } = await sb.storage.from('documentos')
      .upload(caminho, ajustada, { contentType: 'image/jpeg' });
    if (error) { msg.textContent = 'Falha: ' + error.message; return; }

    const { error: e2 } = await sb.from('profiles')
      .update({ foto_path: caminho }).eq('id', eu);
    if (e2) { msg.textContent = 'Falha: ' + e2.message; return; }

    this._p.foto_path = caminho;
    window.CORTEX_SESSAO.profile.foto_path = caminho;
    msg.textContent = 'Foto atualizada!';

    const { data } = await sb.storage.from('documentos').createSignedUrl(caminho, 3600);
    if (data) {
      const img = '<img src="' + data.signedUrl +
        '" style="width:100%; height:100%; object-fit:cover; border-radius:inherit">';
      document.getElementById('mp-avatar').innerHTML = img;
      document.getElementById('avatar').innerHTML = img;
    }
  },

  async salvar() {
    const erro = document.getElementById('mp-erro');
    const botao = document.getElementById('mp-salvar');
    erro.classList.remove('visivel');

    const dados = {
      nome: document.getElementById('mp-nome').value.trim(),
      data_nascimento: document.getElementById('mp-nasc').value || null,
      telefone: document.getElementById('mp-tel').value.trim() || null,
      registro_classe: document.getElementById('mp-reg').value.trim() || null,
      formacao: document.getElementById('mp-form').value.trim() || null,
      endereco: document.getElementById('mp-end').value.trim() || null
    };
    if (!dados.nome) {
      erro.textContent = 'O nome nao pode ficar vazio.';
      erro.classList.add('visivel');
      return;
    }

    botao.disabled = true;
    botao.textContent = 'Salvando...';
    const { error } = await sb.from('profiles')
      .update(dados).eq('id', window.CORTEX_SESSAO.user.id);
    if (error) {
      erro.textContent = error.message;
      erro.classList.add('visivel');
      botao.disabled = false;
      botao.textContent = 'Salvar';
      return;
    }

    window.CORTEX_SESSAO.profile.nome = dados.nome;
    document.getElementById('usuario-nome').textContent = dados.nome;
    document.getElementById('meu-perfil-overlay').remove();
  }
};
