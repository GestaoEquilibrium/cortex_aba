// ============================================================================
// CORTEX aba - js/modulos/permissoes.js
// Matriz EDITAVEL de acessos: o suporte clica na celula para alternar
// E (ve e edita) -> V (somente ve) -> - (sem acesso). Salva na hora na
// tabela public.permissoes, que alimenta o menu, os botoes e as politicas
// RLS do banco. O suporte sempre tem E em tudo (nao aparece na matriz).
// ============================================================================

window.MODULOS = window.MODULOS || {};

window.MODULOS.permissoes = {

  PERFIS: [
    ['direcao', 'Direcao'],
    ['coordenador', 'Coordenador'],
    ['terapeuta', 'Terapeuta'],
    ['aplicador', 'Aplicador'],
    ['callcenter', 'Call center'],
    ['callcenter', 'Call Center'],
    ['recepcao', 'Recepcao']
  ],

  // Modulo (chave) + subchaves. Subchave em branco HERDA o nivel do modulo.
  CHAVES: [
    { chave: 'inicio', rotulo: 'Inicio (painel)', dica: 'V ou E: acessa o painel com pendencias e avisos.' },
    { chave: 'pacientes', rotulo: 'Pacientes', dica: 'V: consulta lista e prontuario. E: tudo abaixo.', subs: [
      ['pacientes.editar', 'Admitir e editar dados/foto'],
      ['pacientes.responsaveis', 'Editar responsaveis e encaminhamentos'],
      ['pacientes_designar', 'Designar profissionais'],
      ['pacientes.link_cadastro', 'Enviar link de cadastro pela familia'],
      ['pacientes.auditoria', 'Aba Auditoria do prontuario'] ] },
    { chave: 'agenda', rotulo: 'Agenda', dica: 'V: visualiza. E: opera.', subs: [
      ['agenda.geral', 'Ver agenda geral (fora da propria carteira)'],
      ['agenda.status', 'Check-in, iniciar, concluir, falta'],
      ['agenda.cancelar', 'Cancelar e reabrir sessao'],
      ['agenda.criar', 'Criar sessao e encaixe'],
      ['agenda_grade', 'Grade fixa e salas'],
      ['agenda.reservas', 'Por aplicador e reservas de horario'] ] },
    { chave: 'avaliacoes', rotulo: 'Avaliacoes', dica: 'V: consulta resultados. E: aplica.', subs: [
      ['avaliacoes.qadi', 'Aplicar QADI-R'],
      ['avaliacoes.ss', 'Aplicar Socially Savvy'],
      ['avaliacoes.portage', 'Aplicar Portage'],
      ['avaliacoes.cancelar', 'Cancelar aplicacao em andamento'],
      ['avaliacoes.relatorio', 'Gerar relatorio de avaliacao'],
      ['pei', 'Devolutiva e PEI (ver linha PEI)'] ] },
    { chave: 'programas', rotulo: 'Programas', dica: 'V: consulta. E: tudo abaixo.', subs: [
      ['programas.atribuir', 'Atribuir programa a crianca'],
      ['programas.lancar_pei', 'Lancar programa a partir da meta do PEI'],
      ['programas.biblioteca', 'Criar e editar programas da biblioteca'],
      ['programas.apagar', 'Apagar programa da crianca / sessao realizada'],
      ['evolucao', 'Aplicar (ficha) e escrever evolucao'],
      ['comportamentos', 'Registrar comportamentos interferentes'] ] },
    { chave: 'plano', rotulo: 'Plano Terapeutico', dica: 'V: consulta. E: elabora e renova.', subs: [
      ['plano.elaborar', 'Elaborar e renovar plano'] ] },
    { chave: 'pei', rotulo: 'PEI e Devolutiva', dica: 'V: consulta. E: elabora.', subs: [
      ['pei.elaborar', 'Elaborar PEI'],
      ['pei.devolutiva', 'Relatorio de devolutiva'] ] },
    { chave: 'relatorios', rotulo: 'Relatorios da crianca', dica: 'V: ve relatorios. E: elabora.', subs: [
      ['relatorios.sessao', 'Relatorio da sessao e compilados'],
      ['relatorios.mensal', 'Elaborar relatorio mensal'],
      ['relatorios.gerar', 'Gerar e travar'],
      ['relatorios.portal', 'Liberar/enviar documentos ao portal'] ] },
    { chave: 'eventos', rotulo: 'Supervisao e reunioes', dica: 'V: ve. E: cria.', subs: [
      ['eventos.criar', 'Criar supervisoes, reunioes e ATA'],
      ['eventos.demandas', 'Criar demandas e parabens'] ] },
    { chave: 'coordenacao', rotulo: 'Coordenacao', dica: 'V ou E: painel da equipe.', subs: [
      ['coordenacao.geral', 'Escopo Geral (ver fora da propria equipe)'] ] },
    { chave: 'presenca', rotulo: 'Lista de Presenca', dica: 'V: gera e imprime.' },
    { chave: 'faltas', rotulo: 'Gestao de Faltas', dica: 'V: consulta. E: dispara alertas.' },
    { chave: 'guias', rotulo: 'Guias (convenio)', dica: 'E: cadastra autorizacoes.' },
    { chave: 'gerencial', rotulo: 'Relatorios gerenciais', dica: 'E: gera e exporta.', subs: [
      ['gerencial.importar', 'Importar CSV do outro sistema'] ] },
    { chave: 'rh', rotulo: 'RH', dica: 'V: consulta. E: gere.' },
    { chave: 'termos', rotulo: 'Termos digitais', dica: 'V: aceites. E: cria termos.' },
    { chave: 'auditoria', rotulo: 'Auditoria (geral)', dica: 'V: trilha de tudo.' },
    { chave: 'chat', rotulo: 'Chat de suporte', dica: 'E: fala com o suporte.' },
    { chave: 'portal_msg', rotulo: 'Conversa com a familia', dica: 'E: responde mensagens e caderninho.' }
  ],
  ehSub(chave) { return chave.includes('.') || ['pacientes_designar', 'agenda_grade', 'evolucao', 'comportamentos'].includes(chave); },
  aberto: {},

  el: null,
  matriz: {},

  ehSuporte() { return window.CORTEX_SESSAO.profile.perfil === 'suporte'; },

  async render(el) {
    this.el = el;

    el.innerHTML =
      '<div class="pagina-cabecalho">' +
      '  <div><h2>Permissoes por perfil</h2>' +
      '  <p class="sub">' + (this.ehSuporte()
        ? 'Clique numa celula para alternar: E (ve e edita) &rarr; V (somente ve) &rarr; &mdash; (sem acesso). Salva na hora.'
        : 'Somente o suporte tecnico edita esta matriz.') + '</p></div>' +
      '</div>' +
      '<div id="perm-corpo"><div class="cartao"><p class="sub">Carregando...</p></div></div>';

    await this.carregar();
    this.desenhar();
  },

  async carregar() {
    const { data } = await sb.from('permissoes').select('chave, perfil, nivel');
    this.matriz = {};
    (data || []).forEach(r => { this.matriz[r.chave + '|' + r.perfil] = r.nivel; });
  },

  desenhar() {
    const editavel = this.ehSuporte();

    const cab = this.PERFIS.map(([, rotulo]) =>
      '<th class="centro">' + rotulo + '</th>').join('');

    const celula = (chave, perfil, pai) => {
      const proprio = this.matriz[chave + '|' + perfil];
      const herdado = pai ? (this.matriz[pai + '|' + perfil] || '') : '';
      const v = proprio !== undefined ? proprio : herdado;
      const classe = v === 'E' ? 'perm-e' : v === 'V' ? 'perm-v' : 'perm-n';
      const texto = v === 'E' ? 'E' : v === 'V' ? 'V' : '&mdash;';
      return '<td class="centro"><button type="button" class="perm ' + classe + (proprio === undefined && pai ? ' perm-herdado' : '') +
        (editavel ? ' perm-clic' : '') + '" title="' + (proprio === undefined && pai ? 'herdado do modulo - clique para definir' : '') + '" ' +
        (editavel ? 'onclick="MODULOS.permissoes.alternar(\'' + chave + '\', \'' + perfil + '\', this' + (pai ? ', \'' + pai + '\'' : '') + ')"' : 'disabled') +
        '>' + texto + '</button></td>';
    };
    const corpo = this.CHAVES.map(l => {
      const temSubs = l.subs && l.subs.length;
      const ab = !!this.aberto[l.chave];
      return '<tr class="perm-modulo"><td>' +
        (temSubs ? '<button type="button" class="perm-toggle" onclick="MODULOS.permissoes.abrir(\'' + l.chave + '\')">' + (ab ? '&#9662;' : '&#9656;') + '</button> ' : '<span class="perm-toggle vazio"></span> ') +
        '<b>' + l.rotulo + '</b>' + (temSubs ? ' <small class="sub">' + l.subs.length + ' acoes</small>' : '') +
        '<br><small style="color:var(--ink-soft); margin-left:26px">' + l.dica + '</small></td>' +
        this.PERFIS.map(([perfil]) => celula(l.chave, perfil, null)).join('') + '</tr>' +
        (temSubs && ab ? l.subs.map(([sc, rot]) =>
          '<tr class="perm-sub"><td><span style="margin-left:26px">&#8627; ' + rot + '</span></td>' +
          this.PERFIS.map(([perfil]) => celula(sc, perfil, l.chave)).join('') + '</tr>').join('') : '');
    }).join('');

    document.getElementById('perm-corpo').innerHTML =
      '<div class="cartao" style="overflow-x:auto">' +
      '  <div style="display:flex; gap:14px; margin-bottom:12px; flex-wrap:wrap; align-items:center">' +
      '    <span class="selo selo-ok"><b>E</b>&nbsp;Ve e edita/executa</span>' +
      '    <span class="selo selo-roxo"><b>V</b>&nbsp;Somente ve</span>' +
      '    <span class="selo selo-neutro">&mdash;&nbsp;Sem acesso</span>' +
      '    <span class="selo selo-warn">Suporte: sempre E em tudo</span>' +
      '    <span class="selo selo-info">Subchave tracejada = herda do modulo</span>' +
      '  </div>' +
      '  <table class="tabela-presenca tabela-perm">' +
      '    <thead><tr><th>Funcionalidade</th>' + cab + '</tr></thead>' +
      '    <tbody>' + corpo + '</tbody>' +
      '  </table>' +
      '</div>' +
      '<div class="cartao"><h3>Como funciona</h3>' +
      '<p class="sub" style="line-height:1.7">A matriz vale para o menu, os botoes das telas e as ' +
      'politicas de seguranca do banco (RLS). Mudancas passam a valer no proximo carregamento da ' +
      'pagina de cada pessoa (F5 ou novo login). O perfil Familia nao aparece aqui: ele tem o portal ' +
      'proprio, fixo e isolado por vinculo com a crianca.</p></div>';
  },

  abrir(chave) { this.aberto[chave] = !this.aberto[chave]; this.desenhar(); },

  async alternar(chave, perfil, botao, pai) {
    const proprio = this.matriz[chave + '|' + perfil];
    // subchave herdada: o primeiro clique define a partir do valor herdado; ciclo E -> V -> (heranca/nenhum) -> E
    const atual = proprio !== undefined ? proprio : (pai ? (this.matriz[pai + '|' + perfil] || '') : '');
    const proximo = atual === 'E' ? 'V' : atual === 'V' ? '' : 'E';

    botao.disabled = true;
    try {
      if (proximo === '') {
        const { error } = await sb.from('permissoes')
          .delete().eq('chave', chave).eq('perfil', perfil);
        if (error) throw error;
        delete this.matriz[chave + '|' + perfil];
      } else {
        const { error } = await sb.from('permissoes')
          .upsert({ chave: chave, perfil: perfil, nivel: proximo },
                  { onConflict: 'chave,perfil' });
        if (error) throw error;
        this.matriz[chave + '|' + perfil] = proximo;
      }
    } catch (e) {
      popAviso('Erro ao salvar: ' + e.message);
    }
    this.desenhar();
  }
};
