// ============================================================================
// CORTEX aba - js/modulos/permissoes.js
// Matriz de acessos: o que cada perfil ve (V) e edita/executa (E).
// Documenta o comportamento real do sistema; a garantia tecnica esta nas
// politicas RLS do banco. Edicao dinamica de permissoes vira em sprint futuro.
// ============================================================================

window.MODULOS = window.MODULOS || {};

window.MODULOS.permissoes = {

  PERFIS: [
    ['direcao', 'Direcao'],
    ['coordenador', 'Coordenador'],
    ['terapeuta', 'Terapeuta'],
    ['aplicador', 'Aplicador'],
    ['callcenter', 'Recepcao'],
    ['suporte', 'Suporte'],
    ['familia', 'Familia']
  ],

  // V = ve | E = ve e edita/executa | vazio = sem acesso
  LINHAS: [
    { grupo: 'Pacientes' },
    { f: 'Consultar lista e prontuario', p: { direcao: 'V', coordenador: 'V', terapeuta: 'V', aplicador: 'V', callcenter: 'V', suporte: 'V' } },
    { f: 'Nova admissao e edicao de dados', p: { direcao: 'E', coordenador: 'E', callcenter: 'E', suporte: 'E' } },
    { f: 'Foto do paciente', p: { direcao: 'E', coordenador: 'E', callcenter: 'E', suporte: 'E' } },
    { f: 'Designar profissional responsavel', p: { direcao: 'E', coordenador: 'E', suporte: 'E' } },
    { f: 'Criar acessos do portal (familias)', p: { direcao: 'E', coordenador: 'E', callcenter: 'E', suporte: 'E' } },

    { grupo: 'Anamnese Global' },
    { f: 'Preencher (portal)', p: { familia: 'E', direcao: 'E', coordenador: 'E', callcenter: 'E', suporte: 'E' } },
    { f: 'Leitura interna e criterio do nivel', p: { direcao: 'V', coordenador: 'V', terapeuta: 'V', aplicador: 'V', callcenter: 'V', suporte: 'V' } },

    { grupo: 'Agenda' },
    { f: 'Ver grade semanal', p: { direcao: 'V', coordenador: 'V', terapeuta: 'V', aplicador: 'V', callcenter: 'V', suporte: 'V' } },
    { f: 'Gerir horarios e salas', p: { direcao: 'E', coordenador: 'E', suporte: 'E' } },
    { f: 'Sessoes do dia: mudar status', p: { direcao: 'E', coordenador: 'E', terapeuta: 'E', aplicador: 'E', callcenter: 'E', suporte: 'E' } },

    { grupo: 'Recepcao' },
    { f: 'Check-in / finalizar (janela da sessao)', p: { direcao: 'E', coordenador: 'E', terapeuta: 'E', aplicador: 'E', callcenter: 'E', suporte: 'E' } },
    { f: 'Enviar confirmacao WhatsApp', p: { direcao: 'E', coordenador: 'E', callcenter: 'E', suporte: 'E' } },
    { f: 'Lista de Presenca (imprimir)', p: { direcao: 'V', coordenador: 'V', callcenter: 'V', suporte: 'V' } },
    { f: 'Tela da TV (painel do dia)', p: { direcao: 'V', coordenador: 'V', terapeuta: 'V', aplicador: 'V', callcenter: 'V', suporte: 'V' } },

    { grupo: 'Avaliacoes' },
    { f: 'Aplicar QADI-R', p: { direcao: 'E', coordenador: 'E', terapeuta: 'E', suporte: 'E' } },
    { f: 'Consultar resultados', p: { direcao: 'V', coordenador: 'V', terapeuta: 'V', aplicador: 'V', suporte: 'V' } },

    { grupo: 'PEI e Relatorios' },
    { f: 'Elaborar PEI e devolutiva', p: { direcao: 'E', coordenador: 'E', terapeuta: 'E', suporte: 'E' } },
    { f: 'Consultar PEI', p: { direcao: 'V', coordenador: 'V', terapeuta: 'V', aplicador: 'V', suporte: 'V' } },

    { grupo: 'Portal da Familia' },
    { f: 'Inicio do portal e pendencias', p: { familia: 'E' } },

    { grupo: 'Sistema' },
    { f: 'Notificacoes (proprias do perfil)', p: { direcao: 'E', coordenador: 'E', terapeuta: 'E', aplicador: 'E', callcenter: 'E', suporte: 'E', familia: 'E' } },
    { f: 'Matriz de permissoes (esta tela)', p: { direcao: 'V', suporte: 'V' } }
  ],

  render(el) {
    const cab = this.PERFIS.map(([, rotulo]) =>
      '<th class="centro">' + rotulo + '</th>').join('');

    let corpo = '';
    this.LINHAS.forEach(l => {
      if (l.grupo) {
        corpo += '<tr class="perm-grupo"><td colspan="' + (this.PERFIS.length + 1) + '">' +
          l.grupo + '</td></tr>';
        return;
      }
      corpo += '<tr><td>' + l.f + '</td>' +
        this.PERFIS.map(([chave]) => {
          const v = (l.p || {})[chave];
          if (v === 'E') return '<td class="centro"><span class="perm perm-e" title="Ve e edita">E</span></td>';
          if (v === 'V') return '<td class="centro"><span class="perm perm-v" title="Somente ve">V</span></td>';
          return '<td class="centro"><span class="perm perm-n">&mdash;</span></td>';
        }).join('') + '</tr>';
    });

    el.innerHTML =
      '<div class="pagina-cabecalho">' +
      '  <div><h2>Permissoes por perfil</h2>' +
      '  <p class="sub">O que cada acesso ve e edita no CORTEX aba. ' +
      'A garantia tecnica esta nas politicas do banco (RLS); esta matriz documenta o comportamento.</p></div>' +
      '</div>' +
      '<div class="cartao" style="overflow-x:auto">' +
      '  <div style="display:flex; gap:14px; margin-bottom:12px; flex-wrap:wrap">' +
      '    <span class="selo selo-ok"><b>E</b>&nbsp;Ve e edita/executa</span>' +
      '    <span class="selo selo-roxo"><b>V</b>&nbsp;Somente ve</span>' +
      '    <span class="selo selo-neutro">&mdash;&nbsp;Sem acesso</span>' +
      '  </div>' +
      '  <table class="tabela-presenca tabela-perm">' +
      '    <thead><tr><th>Funcionalidade</th>' + cab + '</tr></thead>' +
      '    <tbody>' + corpo + '</tbody>' +
      '  </table>' +
      '</div>' +
      '<div class="cartao"><h3>Proximos passos deste modulo</h3>' +
      '<p class="sub" style="line-height:1.7">Em um sprint futuro, esta tela ganha edicao: o suporte ' +
      'podera ligar e desligar acessos por perfil, com as mudancas refletindo no menu e nas ' +
      'politicas do banco. Por enquanto, mudancas de permissao sao feitas via atualizacao do sistema.</p></div>';
  }
};
