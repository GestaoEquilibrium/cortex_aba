// ============================================================================
// CORTEX aba - js/modulos/diagnostico.js
// Sprint 15: Diagnostico + Backup (exclusivo do suporte).
// - Saude: conexao, tempo real e numeros gerais do banco
// - Pendencias operacionais: sessoes penduradas, planos vencidos,
//   anamneses paradas, relatorios esquecidos, pacientes sem designacao
// - Backup: exporta as tabelas principais em um unico arquivo JSON
// ============================================================================

window.MODULOS = window.MODULOS || {};

window.MODULOS.diagnostico = {

  TABELAS_BACKUP: [
    'profiles', 'pacientes', 'responsaveis', 'encaminhamentos', 'familia_pacientes',
    'anamneses', 'anamnese_respostas', 'avaliacoes', 'avaliacao_respostas',
    'peis', 'pei_metas', 'relatorios_devolutiva', 'planos_terapeuticos',
    'salas', 'grade_horarios', 'sessoes',
    'programas', 'paciente_programas', 'alvos', 'registros_tentativas',
    'alvo_sessao_registros', 'evolucoes', 'relatorios_mensais',
    'faltas_alertas', 'colaboradores', 'colaborador_docs',
    'permissoes', 'mensagens_suporte'
  ],

  el: null,

  async render(el) {
    this.el = el;
    el.innerHTML =
      '<div class="pagina-cabecalho">' +
      '  <div><h2>Diagnostico</h2>' +
      '  <p class="sub">Saude do sistema, pendencias operacionais e backup dos dados.</p></div>' +
      '  <button class="btn btn-primario" onclick="MODULOS.diagnostico.gerarBackup(this)">&#128190; Gerar backup</button>' +
      '</div>' +
      '<div id="dg-saude" class="cartao"><h3>Saude</h3><p class="sub">Verificando...</p></div>' +
      '<div id="dg-numeros" class="cartao"><h3>Numeros</h3><p class="sub">Contando...</p></div>' +
      '<div id="dg-pendencias" class="cartao"><h3>Pendencias operacionais</h3><p class="sub">Analisando...</p></div>' +
      '<div class="cartao"><h3>Sobre o backup</h3>' +
      '<p class="sub" style="line-height:1.7">O backup exporta as tabelas principais em um arquivo JSON ' +
      'unico (dados clinicos, agenda, intervencao, RH e configuracoes). Guarde-o em local seguro. ' +
      'Arquivos digitalizados (documentos, fotos) ficam no storage do Supabase e nao entram no arquivo; ' +
      'o proprio Supabase mantem a redundancia deles. Recomendacao: gere um backup por semana.</p></div>';

    this.checarSaude();
    this.contarNumeros();
    this.checarPendencias();
  },

  // ─────────────── SAUDE ───────────────

  async checarSaude() {
    const alvo = document.getElementById('dg-saude');
    const itens = [];

    // Conexao + sessao
    const t0 = performance.now();
    const { error: e1 } = await sb.from('profiles').select('id', { head: true, count: 'exact' });
    const ms = Math.round(performance.now() - t0);
    itens.push(e1
      ? ['Conexao com o banco', 'bad', 'Falhou: ' + e1.message]
      : ['Conexao com o banco', 'ok', 'Respondendo em ' + ms + ' ms']);

    // Tempo real
    const rt = await new Promise(resolve => {
      let resolvido = false;
      const canal = sb.channel('diag-' + Date.now());
      const timer = setTimeout(() => { if (!resolvido) { resolvido = true; sb.removeChannel(canal); resolve(false); } }, 5000);
      canal.subscribe(status => {
        if (status === 'SUBSCRIBED' && !resolvido) {
          resolvido = true; clearTimeout(timer); sb.removeChannel(canal); resolve(true);
        }
      });
    });
    itens.push(rt
      ? ['Tempo real (TV, agenda, chat)', 'ok', 'Canal conectado']
      : ['Tempo real (TV, agenda, chat)', 'warn', 'Nao conectou em 5s - TV e chat podem depender do recarregamento']);

    // Storage
    const { error: e3 } = await sb.storage.from('documentos').list('', { limit: 1 });
    itens.push(e3
      ? ['Storage de documentos', 'warn', e3.message]
      : ['Storage de documentos', 'ok', 'Bucket acessivel']);

    alvo.innerHTML = '<h3>Saude</h3>' + itens.map(([nome, nivel, obs]) =>
      '<div class="linha-doc"><div><b>' + nome + '</b><small>' + escaparHtml(obs) + '</small></div>' +
      '<span class="selo ' + (nivel === 'ok' ? 'selo-ok">OK' : nivel === 'warn' ? 'selo-warn">Atencao' : 'selo-bad">Falha') +
      '</span></div>').join('');
  },

  // ─────────────── NUMEROS ───────────────

  async contarNumeros() {
    const alvo = document.getElementById('dg-numeros');
    const grupos = [
      ['Pacientes', 'pacientes'], ['Responsaveis', 'responsaveis'],
      ['Usuarios', 'profiles'], ['Sessoes', 'sessoes'],
      ['Tentativas registradas', 'registros_tentativas'], ['Evolucoes', 'evolucoes'],
      ['Planos terapeuticos', 'planos_terapeuticos'], ['Relatorios mensais', 'relatorios_mensais'],
      ['Colaboradores', 'colaboradores'], ['Mensagens de chat', 'mensagens_suporte']
    ];

    const caixas = [];
    for (const [rotulo, tabela] of grupos) {
      const { count, error } = await sb.from(tabela).select('*', { head: true, count: 'exact' });
      caixas.push('<div class="caixa-info"><small>' + rotulo + '</small><b>' +
        (error ? '?' : (count ?? 0)) + '</b></div>');
    }
    alvo.innerHTML = '<h3>Numeros</h3><div class="grade-visao">' + caixas.join('') + '</div>';
  },

  // ─────────────── PENDENCIAS ───────────────

  async checarPendencias() {
    const alvo = document.getElementById('dg-pendencias');
    const hoje = new Date().toISOString().slice(0, 10);
    const seteDias = new Date(Date.now() - 7 * 86400000).toISOString();
    const pend = [];

    // Sessoes penduradas (checkin/em_atendimento de dias anteriores)
    const { data: presas } = await sb.from('sessoes')
      .select('id, data, pacientes(nome)')
      .in('status', ['checkin', 'em_atendimento'])
      .lt('data', hoje).limit(20);
    if (presas && presas.length) {
      pend.push(['Sessoes sem fechamento de dias anteriores (' + presas.length + ')',
        presas.map(s => s.pacientes.nome + ' em ' +
          new Date(s.data + 'T12:00:00').toLocaleDateString('pt-BR')).join('; '),
        'Encerre pela agenda (Folha de aplicacao > Encerrar) ou marque falta.']);
    }

    // Planos vencidos
    const { data: vencidos } = await sb.from('planos_terapeuticos')
      .select('id, vigencia_fim, pacientes(nome)')
      .eq('status', 'ativo').lt('vigencia_fim', hoje).limit(20);
    if (vencidos && vencidos.length) {
      pend.push(['Planos terapeuticos vencidos (' + vencidos.length + ')',
        vencidos.map(p => p.pacientes.nome).join('; '),
        'Renove pela aba Plano do prontuario.']);
    }

    // Anamneses paradas ha mais de 7 dias
    const { data: paradas } = await sb.from('anamneses')
      .select('id, criado_em, pacientes(nome)')
      .eq('status', 'em_andamento').lt('criado_em', seteDias).limit(20);
    if (paradas && paradas.length) {
      pend.push(['Anamneses paradas ha mais de 7 dias (' + paradas.length + ')',
        paradas.map(a => a.pacientes.nome).join('; '),
        'Vale um contato com a familia para concluir o preenchimento.']);
    }

    // Relatorios rascunho de meses anteriores
    const mesAtual = hoje.slice(0, 7) + '-01';
    const { data: rasc } = await sb.from('relatorios_mensais')
      .select('id, mes, pacientes(nome)')
      .eq('status', 'rascunho').lt('mes', mesAtual).limit(20);
    if (rasc && rasc.length) {
      pend.push(['Relatorios mensais em rascunho de meses passados (' + rasc.length + ')',
        rasc.map(r => r.pacientes.nome + ' (' + r.mes.slice(0, 7) + ')').join('; '),
        'Finalize e libere no portal, ou o mes fica sem devolutiva.']);
    }

    // Pacientes ativos sem profissional designado
    const { data: semProf } = await sb.from('pacientes')
      .select('id, nome').eq('status', 'ativo').is('aplicador_id', null).limit(20);
    if (semProf && semProf.length) {
      pend.push(['Pacientes ativos sem profissional designado (' + semProf.length + ')',
        semProf.map(p => p.nome).join('; '),
        'Designe pela capa do prontuario.']);
    }

    alvo.innerHTML = '<h3>Pendencias operacionais</h3>' +
      (pend.length === 0
        ? '<p class="sub">Nenhuma pendencia encontrada. Operacao em dia. &#127881;</p>'
        : pend.map(([titulo, quem, acao]) =>
            '<div class="linha-doc" style="align-items:flex-start"><div>' +
            '<b>' + titulo + '</b>' +
            '<small style="display:block; margin:3px 0">' + escaparHtml(quem) + '</small>' +
            '<small style="color:var(--acao); font-weight:700">' + acao + '</small>' +
            '</div><span class="selo selo-warn">Atencao</span></div>').join(''));
  },

  // ─────────────── BACKUP ───────────────

  async gerarBackup(botao) {
    botao.disabled = true;
    const rotuloOriginal = botao.innerHTML;

    try {
      const backup = {
        sistema: 'CORTEX aba',
        gerado_em: new Date().toISOString(),
        gerado_por: window.CORTEX_SESSAO.profile.nome,
        tabelas: {}
      };

      for (let t = 0; t < this.TABELAS_BACKUP.length; t++) {
        const tabela = this.TABELAS_BACKUP[t];
        botao.innerHTML = 'Exportando ' + (t + 1) + '/' + this.TABELAS_BACKUP.length + '...';

        const linhas = [];
        let de = 0;
        const pagina = 1000;
        while (true) {
          const { data, error } = await sb.from(tabela)
            .select('*').range(de, de + pagina - 1);
          if (error) { linhas.push({ _erro: error.message }); break; }
          linhas.push(...(data || []));
          if (!data || data.length < pagina) break;
          de += pagina;
          if (de > 100000) break; // trava de seguranca
        }
        backup.tabelas[tabela] = linhas;
      }

      const conteudo = JSON.stringify(backup);
      const blob = new Blob([conteudo], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'cortex_backup_' + new Date().toISOString().slice(0, 10) + '.json';
      a.click();
      URL.revokeObjectURL(a.href);

      const total = Object.values(backup.tabelas).reduce((s, l) => s + l.length, 0);
      abrirModal('Backup gerado',
        '<div class="grade-info">' +
        '<div><small>Tabelas</small><b>' + this.TABELAS_BACKUP.length + '</b></div>' +
        '<div><small>Registros</small><b>' + total + '</b></div>' +
        '<div><small>Tamanho</small><b>' + (conteudo.length / 1024 / 1024).toFixed(2) + ' MB</b></div>' +
        '</div>' +
        '<p class="sub" style="margin-top:12px">O arquivo foi baixado. Guarde em local seguro ' +
        '(nuvem pessoal ou HD externo) e fora do computador da recepcao.</p>' +
        '<div class="barra-acoes"><button class="btn btn-primario" onclick="fecharModal()">Concluir</button></div>');
    } catch (e) {
      alert('Falha no backup: ' + e.message);
    }

    botao.disabled = false;
    botao.innerHTML = rotuloOriginal;
  }
};
