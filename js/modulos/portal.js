// ============================================================================
// CORTEX aba - js/modulos/portal.js
// Inicio do portal da familia: filhos vinculados e pendencias (anamnese).
// ============================================================================

window.MODULOS = window.MODULOS || {};

window.MODULOS.portal = {

  async render(el, sessao) {
    const nome = sessao.profile.nome.split(' ')[0];

    el.innerHTML =
      '<section class="heroi portal">' +
      '  <div>' +
      '    <h1>Ola, ' + escaparHtml(nome) + '!</h1>' +
      '    <div class="sub">Este e o espaco da familia na Equilibrium Terapia Infantil.</div>' +
      '  </div>' +
      '</section>' +
      '<div id="portal-conteudo"><div class="cartao"><p class="sub">Carregando...</p></div></div>';

    const alvo = document.getElementById('portal-conteudo');

    // Filhos vinculados a este responsavel
    const { data: vinculos, error } = await sb
      .from('familia_pacientes')
      .select('paciente_id, pacientes(id, nome, data_nascimento, status)')
      .eq('usuario_id', sessao.user.id);

    if (error || !vinculos || vinculos.length === 0) {
      alvo.innerHTML =
        '<div class="cartao"><div class="vazio">' +
        '<div class="simbolo-vazio">&#9825;</div>' +
        '<strong>Nenhuma crianca vinculada ainda</strong>' +
        'Se isso parecer um engano, fale com a recepcao da clinica.' +
        '</div></div>';
      return;
    }

    let html = '';
    for (const v of vinculos) {
      const p = v.pacientes;
      if (!p) continue;

      const { data: an } = await sb
        .from('anamneses')
        .select('id, status')
        .eq('paciente_id', p.id)
        .maybeSingle();

      const statusAn = an ? an.status : 'pendente';
      let pendencia;
      if (statusAn === 'concluida') {
        pendencia =
          '<div class="linha-doc"><div><b>Anamnese Global</b>' +
          '<small>Recebida! A coordenacao esta analisando as informacoes.</small></div>' +
          '<span class="selo selo-ok">Concluida</span></div>';
      } else {
        const rotulo = statusAn === 'em_andamento' ? 'Continuar preenchimento' : 'Preencher agora';
        pendencia =
          '<div class="linha-doc"><div><b>Anamnese Global</b>' +
          '<small>Questionario essencial para iniciarmos o acompanhamento de ' +
          escaparHtml(p.nome.split(' ')[0]) + '.</small></div>' +
          '<button class="btn btn-primario" onclick="MODULOS.anamnese.abrir(\'' + p.id + '\')">' +
          rotulo + '</button></div>';
      }

      html +=
        '<div class="cartao faixa-azul">' +
        '  <div class="pac-topo" style="margin-bottom:14px">' +
        '    <div class="avatar-paciente">' + escaparHtml(this.iniciais(p.nome)) + '</div>' +
        '    <div class="pac-quem"><strong>' + escaparHtml(p.nome) + '</strong>' +
        '    <span>' + calcularIdade(p.data_nascimento) + '</span></div>' +
        '  </div>' +
        pendencia +
        '</div>';
    }

    alvo.innerHTML = html;
  },

  iniciais(nome) {
    const p = nome.trim().split(/\s+/);
    return ((p[0] ? p[0][0] : '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
  }
};
