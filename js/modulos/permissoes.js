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
    ['callcenter', 'Recepcao']
  ],

  CHAVES: [
    { chave: 'inicio', rotulo: 'Inicio (painel da equipe)',
      dica: 'V ou E: acessa o painel com KPIs e notificacoes.' },
    { chave: 'pacientes', rotulo: 'Pacientes',
      dica: 'V: consulta lista e prontuario. E: tambem admite, edita dados e foto.' },
    { chave: 'pacientes_designar', rotulo: 'Designar profissional',
      dica: 'E: pode designar o aplicador/terapeuta responsavel.' },
    { chave: 'agenda', rotulo: 'Agenda (dia/semana/mes)',
      dica: 'V: visualiza. E: check-in, iniciar, finalizar, falta e WhatsApp.' },
    { chave: 'agenda_grade', rotulo: 'Grade fixa e salas',
      dica: 'E: cria/edita horarios recorrentes e salas.' },
    { chave: 'presenca', rotulo: 'Lista de Presenca',
      dica: 'V: gera e imprime as folhas semanais.' },
    { chave: 'avaliacoes', rotulo: 'Avaliacoes (QADI-R)',
      dica: 'V: consulta resultados. E: aplica e conclui avaliacoes.' },
    { chave: 'pei', rotulo: 'PEI e Devolutiva',
      dica: 'V: consulta. E: elabora PEI e relatorio de devolutiva.' }
  ],

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

    const corpo = this.CHAVES.map(l =>
      '<tr><td><b>' + l.rotulo + '</b><br><small style="color:var(--ink-soft)">' +
      l.dica + '</small></td>' +
      this.PERFIS.map(([perfil]) => {
        const v = this.matriz[l.chave + '|' + perfil] || '';
        const classe = v === 'E' ? 'perm-e' : v === 'V' ? 'perm-v' : 'perm-n';
        const texto = v === 'E' ? 'E' : v === 'V' ? 'V' : '&mdash;';
        return '<td class="centro"><button type="button" class="perm ' + classe +
          (editavel ? ' perm-clic' : '') + '" ' +
          (editavel ? 'onclick="MODULOS.permissoes.alternar(\'' + l.chave + '\', \'' + perfil + '\', this)"' : 'disabled') +
          '>' + texto + '</button></td>';
      }).join('') + '</tr>').join('');

    document.getElementById('perm-corpo').innerHTML =
      '<div class="cartao" style="overflow-x:auto">' +
      '  <div style="display:flex; gap:14px; margin-bottom:12px; flex-wrap:wrap; align-items:center">' +
      '    <span class="selo selo-ok"><b>E</b>&nbsp;Ve e edita/executa</span>' +
      '    <span class="selo selo-roxo"><b>V</b>&nbsp;Somente ve</span>' +
      '    <span class="selo selo-neutro">&mdash;&nbsp;Sem acesso</span>' +
      '    <span class="selo selo-warn">Suporte: sempre E em tudo</span>' +
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

  async alternar(chave, perfil, botao) {
    const atual = this.matriz[chave + '|' + perfil] || '';
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
      alert('Erro ao salvar: ' + e.message);
    }
    this.desenhar();
  }
};
