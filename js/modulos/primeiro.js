// ============================================================================
// CORTEX aba - js/modulos/primeiro.js
// Primeiro acesso da equipe: janela BLOQUEANTE (sem fechar, sem ESC) que
// exige foto de perfil e troca da senha temporaria antes de liberar o
// sistema. Reaberta tambem apos uma redefinicao de senha pelo suporte.
// ============================================================================

window.MODULOS = window.MODULOS || {};

window.MODULOS.primeiro = {

  _fotoOk: false,
  _fotoPath: null,

  precisa(profile) {
    return profile.perfil !== 'familia' && profile.primeiro_acesso === true;
  },

  abrir(profile) {
    this._fotoOk = !!profile.foto_path;
    this._fotoPath = profile.foto_path || null;

    const overlay = document.createElement('div');
    overlay.id = 'primeiro-overlay';
    overlay.className = 'primeiro-overlay';
    overlay.innerHTML =
      '<div class="primeiro-caixa">' +
      '  <h2 style="margin:0 0 4px">Bem-vindo(a), ' + escaparHtml(profile.nome.split(' ')[0]) + '! &#127881;</h2>' +
      '  <p class="sub" style="margin-bottom:16px">Antes de comecar, duas coisas rapidas e obrigatorias:</p>' +

      '  <div class="primeiro-passo">' +
      '    <b>1. Sua foto de perfil</b>' +
      '    <div style="display:flex; align-items:center; gap:12px; margin-top:8px">' +
      '      <div class="avatar" id="pa-preview" style="width:56px; height:56px; font-size:18px; flex:none">' +
             escaparHtml((profile.nome || '?').slice(0, 1).toUpperCase()) + '</div>' +
      '      <div style="flex:1">' +
      '        <input type="file" id="pa-foto" accept="image/jpeg,image/png" ' +
      '          onchange="MODULOS.primeiro.enviarFoto(this)">' +
      '        <small class="sub" id="pa-foto-msg">' +
             (this._fotoOk ? 'Foto ja cadastrada. Pode trocar se quiser.' : 'JPG ou PNG, ate 8 MB.') + '</small>' +
      '      </div>' +
      '    </div>' +
      '  </div>' +

      '  <div class="primeiro-passo">' +
      '    <b>2. Sua nova senha</b>' +
      '    <div class="grade-form" style="margin-top:8px">' +
      '      <div class="campo"><label>Nova senha (minimo 8)</label>' +
      '        <input type="password" id="pa-senha1" autocomplete="new-password"></div>' +
      '      <div class="campo"><label>Repita a nova senha</label>' +
      '        <input type="password" id="pa-senha2" autocomplete="new-password"></div>' +
      '    </div>' +
      '  </div>' +

      '  <div class="mensagem-erro" id="pa-erro"></div>' +
      '  <div class="barra-acoes">' +
      '    <button class="btn btn-primario" id="pa-concluir" ' +
      '      onclick="MODULOS.primeiro.concluir()">Concluir e entrar</button>' +
      '  </div>' +
      '</div>';

    document.body.appendChild(overlay);
  },

  async enviarFoto(input) {
    const arquivo = input.files[0];
    const msg = document.getElementById('pa-foto-msg');
    if (!arquivo) return;
    if (arquivo.size > 8 * 1024 * 1024) {
      msg.textContent = 'Arquivo muito grande (max. 8 MB).';
      input.value = '';
      return;
    }

    msg.textContent = 'Enviando...';
    const eu = window.CORTEX_SESSAO.user.id;
    const ext = arquivo.type === 'image/png' ? 'png' : 'jpg';
    const caminho = 'perfil/' + eu + '/foto_' + Date.now() + '.' + ext;

    const { error } = await sb.storage.from('documentos')
      .upload(caminho, arquivo, { contentType: arquivo.type });
    if (error) {
      msg.textContent = 'Falha no envio: ' + error.message;
      return;
    }

    this._fotoOk = true;
    this._fotoPath = caminho;
    msg.textContent = 'Foto recebida!';

    const { data } = await sb.storage.from('documentos').createSignedUrl(caminho, 600);
    if (data) {
      document.getElementById('pa-preview').innerHTML =
        '<img src="' + data.signedUrl + '" style="width:100%; height:100%; object-fit:cover; border-radius:inherit">';
    }
  },

  async concluir() {
    const erro = document.getElementById('pa-erro');
    const botao = document.getElementById('pa-concluir');
    erro.classList.remove('visivel');

    const s1 = document.getElementById('pa-senha1').value;
    const s2 = document.getElementById('pa-senha2').value;

    if (!this._fotoOk) {
      erro.textContent = 'Anexe a sua foto de perfil (passo 1).';
      erro.classList.add('visivel');
      return;
    }
    if (s1.length < 8) {
      erro.textContent = 'A nova senha precisa de pelo menos 8 caracteres.';
      erro.classList.add('visivel');
      return;
    }
    if (s1 !== s2) {
      erro.textContent = 'As senhas nao conferem.';
      erro.classList.add('visivel');
      return;
    }

    botao.disabled = true;
    botao.textContent = 'Salvando...';

    try {
      const { error: e1 } = await sb.auth.updateUser({ password: s1 });
      if (e1) throw new Error('Senha: ' + e1.message);

      const { error: e2 } = await sb.from('profiles').update({
        foto_path: this._fotoPath,
        primeiro_acesso: false
      }).eq('id', window.CORTEX_SESSAO.user.id);
      if (e2) throw new Error('Perfil: ' + e2.message);

      window.location.reload();
    } catch (e) {
      erro.textContent = e.message;
      erro.classList.add('visivel');
      botao.disabled = false;
      botao.textContent = 'Concluir e entrar';
    }
  }
};
