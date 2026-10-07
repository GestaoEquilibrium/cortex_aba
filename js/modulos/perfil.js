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

    document.getElementById('meu-perfil-corpo').style.maxWidth = '560px';
    document.getElementById('meu-perfil-corpo').innerHTML =
      '<div class="pagina-cabecalho">' +
      '  <div><button class="btn-voltar" onclick="document.getElementById(\'meu-perfil-overlay\').remove()">&larr; Fechar</button>' +
      '  <h2>Meu perfil</h2>' +
      '  <p class="sub">Seus dados pessoais e sua foto. O que for da conta (e-mail, perfil de acesso) fica com a coordenacao.</p></div>' +
      '</div>' +
      this.abasPerfil('dados') +

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

  // abas de Meu perfil: Dados e Aparencia para todos; Trava de acesso so para direcao/suporte
  abasPerfil(ativa) {
    const gestaoTrava = ['direcao', 'suporte'].includes(window.CORTEX_SESSAO.profile.perfil_real || window.CORTEX_SESSAO.profile.perfil);
    const aba = (id, rot, fn) => '<button type="button" class="aba' + (ativa === id ? ' ativa' : '') + '"' +
      (ativa === id ? '' : ' onclick="MODULOS.perfil.' + fn + '()"') + '>' + rot + '</button>';
    return '<div class="abas" style="margin-bottom:12px">' + aba('dados', 'Dados', 'abrir') + aba('aparencia', 'Aparencia', 'abrirAparencia') +
      (gestaoTrava ? aba('trava', '&#128274; Trava de acesso', 'abrirTrava') : '') + '</div>';
  },

  // ── Aparencia (patch 35): cada pessoa escolhe a cor do sistema e o modo claro/escuro ──
  // Ideia B (Wess, 07/10/2026): 12 cores + cor livre e "Sistema todo na cor" ligado por padrao.
  async abrirAparencia() {
    const corpo = document.getElementById('meu-perfil-corpo'); if (!corpo) return;
    corpo.style.maxWidth = '640px';
    corpo.innerHTML = '<div class="pagina-cabecalho"><div>' +
      '<button class="btn-voltar" onclick="document.getElementById(\'meu-perfil-overlay\').remove()">&larr; Fechar</button><h2>Meu perfil</h2>' +
      '<p class="sub">A cor e o modo valem so para voce, em qualquer aparelho em que voce entrar.</p></div></div>' +
      this.abasPerfil('aparencia') + '<div id="mp-aparencia"></div>';
    this.desenharAparencia();
  },
  desenharAparencia(msg) {
    const alvo = document.getElementById('mp-aparencia'); if (!alvo) return;
    if (!window.CORES) { alvo.innerHTML = '<div class="cartao"><p class="sub">Recarregue a pagina para escolher a cor.</p></div>'; return; }
    const at = CORES.atual();
    const livre = /^#/.test(at.cor);
    const tons = id => { const pal = CORES.resolver(id); return pal ? CORES.gerar(pal.h, pal.c).claro : { forte: '#B45309', vivo: '#F59E0B' }; };
    const op = p => {
      const c = tons(p.id), sel = at.cor === p.id;
      return '<button type="button" class="mp-cor-op' + (sel ? ' sel' : '') + '" style="--op-a:' + c.forte + '; --op-b:' + c.vivo + '" ' +
        'onclick="MODULOS.perfil.escolherCor(\'' + p.id + '\')" aria-pressed="' + sel + '"><i></i><span>' + p.nome + (p.padrao ? ' <small>padrao</small>' : '') + '</span></button>';
    };
    const cLivre = livre ? tons(at.cor) : null;
    const modo = typeof modoEscolhido === 'function' ? modoEscolhido() : 'auto';
    const bm = (id, rot) => '<button type="button" class="' + (modo === id ? 'ativo' : '') + '" onclick="MODULOS.perfil.escolherModo(\'' + id + '\')">' + rot + '</button>';
    alvo.innerHTML =
      '<div class="cartao"><h3>Cor do sistema</h3>' +
      '<p class="sub" style="margin-bottom:12px">Muda botoes, menu, abas e destaques. As cores de situacao (em dia, atencao, falta) continuam as mesmas para todo mundo.</p>' +
      '<div class="mp-cores c7">' + CORES.PALETAS.map(op).join('') +
      '<label class="mp-cor-op livre' + (livre ? ' sel' : '') + '"' + (cLivre ? ' style="--op-a:' + cLivre.forte + '; --op-b:' + cLivre.vivo + '"' : '') + ' title="Escolher qualquer cor">' +
      '<i></i><span>Cor livre</span>' +
      '<input type="color" value="' + (livre ? at.cor.toLowerCase() : '#2f6fed') + '" oninput="MODULOS.perfil.provarLivre(this.value)" onchange="MODULOS.perfil.escolherCor(this.value)"></label>' +
      '</div>' +
      '<label class="mp-tudo"><input type="checkbox" id="mp-tudo"' + (at.tudo ? ' checked' : '') + ' onchange="MODULOS.perfil.escolherCor(CORES.atual().cor)">' +
      '<span><b>Sistema todo na cor</b><small>O menu lateral, o fundo e os cabecalhos tambem ganham o tom da cor. Desligado, so os destaques mudam.</small></span></label>' +
      '<div class="mp-previa"><small>Previa</small>' +
      '<button type="button" class="btn btn-primario" tabindex="-1">Salvar</button>' +
      '<button type="button" class="btn btn-fantasma" tabindex="-1">Cancelar</button>' +
      '<span class="toggle-visao" style="display:inline-flex"><button type="button" class="ativo" tabindex="-1">Dia</button><button type="button" tabindex="-1">Semana</button></span>' +
      '<span class="selo selo-ok">em dia</span><span class="selo selo-warn">atencao</span><span class="selo selo-bad">falta</span></div>' +
      '</div>' +
      '<div class="cartao"><h3>Modo</h3><p class="sub" style="margin-bottom:10px">Automatico segue o celular ou o computador (escurece a noite, se ele estiver assim).</p>' +
      '<div class="toggle-visao mp-modo">' + bm('claro', '&#9728; Claro') + bm('escuro', '&#9790; Escuro') + bm('auto', 'Automatico') + '</div></div>' +
      (msg ? '<div class="mensagem-erro visivel" style="background:var(--st-warn-bg); color:#92400E; border-color:#FDE68A">' + escaparHtml(msg) + '</div>' : '');
  },
  // cor livre: mostra ao vivo enquanto arrasta; grava quando solta
  provarLivre(hex) {
    const t = document.getElementById('mp-tudo');
    CORES.aplicar(hex, t ? t.checked : true);
  },
  async escolherCor(cor) {
    const t = document.getElementById('mp-tudo');
    const r = await CORES.escolher(cor, t ? t.checked : true);
    this.desenharAparencia(r.ok ? '' : 'A cor ficou neste aparelho, mas nao consegui guardar no seu perfil: ' + r.erro);
  },
  escolherModo(m) {
    definirModo(m);
    this.desenharAparencia();
  },

  // ── Trava de acesso (patch 31): direcao/suporte escolhem quem fica travado e a palavra ──
  async abrirTrava() {
    const corpo = document.getElementById('meu-perfil-corpo'); if (!corpo) return;
    corpo.style.maxWidth = '920px';
    corpo.innerHTML = '<div class="pagina-cabecalho"><div><button class="btn-voltar" onclick="document.getElementById(\'meu-perfil-overlay\').remove()">&larr; Fechar</button><h2>Meu perfil</h2></div></div>' +
      this.abasPerfil('trava') +
      '<div id="mp-trava"><p class="sub">Carregando...</p></div>';
    await this.desenharTrava();
  },
  async desenharTrava() {
    const alvo = document.getElementById('mp-trava'); if (!alvo) return;
    const eu = window.CORTEX_SESSAO.user.id;
    const [rP, rT] = await Promise.all([
      sb.from('profiles').select('id, nome, perfil').eq('ativo', true).neq('perfil', 'familia').order('nome'),
      sb.from('travas_acesso').select('*, quem:profiles!travas_acesso_usuario_id_fkey(nome, perfil)').order('criada_em', { ascending: false })
    ]);
    if (rT.error) { alvo.innerHTML = '<div class="cartao"><div class="mensagem-erro visivel">' + escaparHtml(rT.error.message) + ' (rodou o SQL da trava?)</div></div>'; return; }
    const pessoas = (rP.data || []).filter(p => p.id !== eu);
    const travas = rT.data || [];
    const comTrava = new Set(travas.map(t => t.usuario_id));
    const fmt = d => d ? new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
    const situacao = t => {
      if (!t.ativa) return '<span class="selo selo-neutro">desativada</span>';
      if (t.modo === 'uma_vez' && t.desbloqueada_em) return '<span class="selo selo-ok">desbloqueada ' + fmt(t.desbloqueada_em) + '</span>';
      if (t.modo === 'sempre' && t.desbloqueada_em) return '<span class="selo selo-ok">a cada entrada &middot; ultima ' + fmt(t.desbloqueada_em) + ' (' + (t.desbloqueios || 0) + 'x)</span>';
      return t.vista_em ? '<span class="selo selo-warn">viu o cadeado ' + fmt(t.vista_em) + ', nao desbloqueou</span>' : '<span class="selo selo-neutro">aguardando &middot; ainda nao abriu o sistema</span>';
    };
    alvo.innerHTML =
      '<div class="cartao"><h3>Travar uma pessoa</h3>' +
      '<p class="sub" style="margin-bottom:10px">Na proxima vez que a pessoa abrir o sistema, aparece uma tela com cadeado pedindo a palavra. Sem a palavra certa, nada funciona. A palavra fica so no banco (quem usa o sistema nao consegue ve-la) e voce acompanha abaixo quem viu o cadeado, quantas tentativas fez e quando desbloqueou.</p>' +
      '<div class="grade-form">' +
      '  <div class="campo c2"><label>Pessoa</label><select id="tr-quem"><option value="">Escolha...</option>' + pessoas.map(p => '<option value="' + p.id + '">' + escaparHtml(p.nome) + ' - ' + (ROTULOS_PERFIL[p.perfil] || p.perfil) + (comTrava.has(p.id) ? ' (ja tem trava)' : '') + '</option>').join('') + '</select></div>' +
      '  <div class="campo"><label>Palavra</label><input id="tr-palavra" autocomplete="off" placeholder="Ex.: equilibrio2026"></div>' +
      '  <div class="campo c3"><label>Mensagem na tela (opcional)</label><input id="tr-msg" placeholder="Para continuar, informe a senha do banco de dados fornecida pela direcao."></div>' +
      '  <div class="campo c3"><label>Quando pedir</label><div style="display:flex; gap:14px; flex-wrap:wrap; font-size:12.5px">' +
      '    <label class="check"><input type="radio" name="tr-modo" value="uma_vez" checked> Uma vez (depois que acertar, libera ate eu rearmar)</label>' +
      '    <label class="check"><input type="radio" name="tr-modo" value="sempre"> A cada entrada no sistema</label></div></div>' +
      '</div><div class="mensagem-erro" id="tr-erro"></div>' +
      '<div class="barra-acoes"><button class="btn btn-primario" id="tr-salvar" onclick="MODULOS.perfil.salvarTrava()">&#128274; Ativar trava</button></div></div>' +
      '<div class="cartao"><h3>Travas</h3>' +
      (travas.length ? '<table class="tabela-presenca" style="width:100%; font-size:12.5px"><thead><tr><th>Pessoa</th><th>Palavra</th><th>Situacao</th><th>Tentativas erradas</th><th></th></tr></thead><tbody>' +
        travas.map(t => '<tr>' +
          '<td style="white-space:nowrap"><b>' + escaparHtml(t.quem ? t.quem.nome.split(' ').slice(0, 2).join(' ') : t.usuario_id) + '</b><br><small class="sub">' + (t.quem ? (ROTULOS_PERFIL[t.quem.perfil] || t.quem.perfil) : '') + ' &middot; criada ' + fmt(t.criada_em) + '</small></td>' +
          '<td><code>' + escaparHtml(t.palavra) + '</code></td>' +
          '<td>' + situacao(t) + '</td>' +
          '<td>' + (t.tentativas || 0) + (t.ultima_tentativa ? '<br><small class="sub">ultima ' + fmt(t.ultima_tentativa) + '</small>' : '') + '</td>' +
          '<td style="white-space:nowrap; text-align:right">' +
          (t.ativa ? '<button class="btn-chip" title="Volta a pedir a palavra na proxima entrada" onclick="MODULOS.perfil.rearmarTrava(\'' + t.usuario_id + '\')">Rearmar</button> ' : '') +
          '<button class="btn-chip" onclick="MODULOS.perfil.alternarTrava(\'' + t.usuario_id + '\', ' + (t.ativa ? 'false' : 'true') + ')">' + (t.ativa ? 'Desativar' : 'Ativar') + '</button> ' +
          '<button class="btn-chip" style="color:var(--st-bad)" onclick="MODULOS.perfil.removerTrava(\'' + t.usuario_id + '\')">Remover</button></td></tr>').join('') +
        '</tbody></table>' : '<p class="sub">Nenhuma trava criada.</p>') + '</div>';
  },
  async salvarTrava() {
    const erro = document.getElementById('tr-erro'); erro.classList.remove('visivel');
    const quem = document.getElementById('tr-quem').value, palavra = document.getElementById('tr-palavra').value.trim();
    const msg = document.getElementById('tr-msg').value.trim() || null;
    const modo = (document.querySelector('input[name="tr-modo"]:checked') || {}).value || 'uma_vez';
    if (!quem || !palavra) { erro.textContent = 'Escolha a pessoa e a palavra.'; erro.classList.add('visivel'); return; }
    const b = document.getElementById('tr-salvar'); b.disabled = true; b.textContent = 'Salvando...';
    const { error } = await sb.from('travas_acesso').upsert({ usuario_id: quem, palavra, mensagem: msg, modo, ativa: true, tentativas: 0, ultima_tentativa: null, desbloqueada_em: null, vista_em: null, criada_por: window.CORTEX_SESSAO.user.id, atualizada_em: new Date().toISOString() }, { onConflict: 'usuario_id' });
    if (error) { erro.textContent = error.message; erro.classList.add('visivel'); b.disabled = false; b.textContent = '\u{1F512} Ativar trava'; return; }
    await this.desenharTrava();
  },
  async rearmarTrava(id) {
    const { error } = await sb.from('travas_acesso').update({ ativa: true, desbloqueada_em: null, vista_em: null, tentativas: 0, ultima_tentativa: null, atualizada_em: new Date().toISOString() }).eq('usuario_id', id);
    if (error) popAviso(error.message); await this.desenharTrava();
  },
  async alternarTrava(id, ativa) {
    const { error } = await sb.from('travas_acesso').update({ ativa, atualizada_em: new Date().toISOString() }).eq('usuario_id', id);
    if (error) popAviso(error.message); await this.desenharTrava();
  },
  async removerTrava(id) {
    if (!await popConfirmar('Remover esta trava? A pessoa entra normalmente.')) return;
    const { error } = await sb.from('travas_acesso').delete().eq('usuario_id', id);
    if (error) popAviso(error.message); await this.desenharTrava();
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
