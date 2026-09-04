// ============================================================================
// CORTEX aba - js/modulos/auditoria.js
// Auditoria total: tudo que e criado, alterado ou apagado no sistema fica
// registrado pelo BANCO (gatilhos) - quem fez, quando, onde, qual paciente.
// O botao "Ver" abre o antes/depois campo a campo.
// ============================================================================

window.MODULOS = window.MODULOS || {};

window.MODULOS.auditoria = {

  ROTULOS_TABELA: {
    pacientes: 'Pacientes', responsaveis: 'Responsaveis',
    encaminhamentos: 'Encaminhamentos', familia_pacientes: 'Vinculos de familia',
    anamneses: 'Anamneses', anamnese_respostas: 'Respostas de anamnese',
    avaliacoes: 'Avaliacoes', avaliacao_respostas: 'Respostas de avaliacao',
    peis: 'PEI', pei_metas: 'Metas do PEI', relatorios_devolutiva: 'Devolutivas',
    planos_terapeuticos: 'Planos terapeuticos',
    salas: 'Salas', grade_horarios: 'Grade de horarios', sessoes: 'Sessoes',
    programas: 'Biblioteca de programas', paciente_programas: 'Programas do paciente',
    alvos: 'Alvos', registros_tentativas: 'Tentativas',
    alvo_sessao_registros: 'Retratos de alvo', evolucoes: 'Evolucoes',
    relatorios_mensais: 'Relatorios mensais', faltas_alertas: 'Alertas de falta',
    colaboradores: 'RH - colaboradores', colaborador_docs: 'RH - documentos',
    permissoes: 'Permissoes', profiles: 'Usuarios'
  },

  ROTULOS_ACAO: { INSERT: 'Criou', UPDATE: 'Alterou', DELETE: 'Apagou' },
  CORES_ACAO: { INSERT: 'selo-ok', UPDATE: 'selo-warn', DELETE: 'selo-bad' },

  CAMPOS_OCULTOS: ['id', 'criado_em', 'atualizado_em'],

  el: null,
  registros: [],

  async render(el) {
    this.el = el;
    const hoje = new Date().toISOString().slice(0, 10);
    const seteAtras = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

    el.innerHTML =
      '<div class="pagina-cabecalho">' +
      '  <div><h2>Auditoria</h2>' +
      '  <p class="sub" id="aud-sub">Tudo que foi feito no sistema, registrado pelo banco.</p></div>' +
      '</div>' +
      '<div class="toolbar" style="flex-wrap:wrap">' +
      '  <input type="date" id="aud-de" value="' + seteAtras + '" onchange="MODULOS.auditoria.carregar()">' +
      '  <input type="date" id="aud-ate" value="' + hoje + '" onchange="MODULOS.auditoria.carregar()">' +
      '  <select id="aud-tabela" onchange="MODULOS.auditoria.carregar()">' +
      '    <option value="">Todos os modulos</option>' +
      Object.entries(this.ROTULOS_TABELA).map(([t, r]) =>
        '<option value="' + t + '">' + r + '</option>').join('') +
      '  </select>' +
      '  <select id="aud-acao" onchange="MODULOS.auditoria.carregar()">' +
      '    <option value="">Todas as acoes</option>' +
      '    <option value="INSERT">Criou</option>' +
      '    <option value="UPDATE">Alterou</option>' +
      '    <option value="DELETE">Apagou</option>' +
      '  </select>' +
      '  <input type="search" id="aud-busca" placeholder="Filtrar por pessoa ou paciente..." ' +
      '    oninput="MODULOS.auditoria.desenhar()">' +
      '</div>' +
      '<div id="aud-lista"><div class="cartao"><p class="sub">Carregando...</p></div></div>';

    await this.carregar();
  },

  async carregar() {
    const de = document.getElementById('aud-de').value;
    const ate = document.getElementById('aud-ate').value;
    const tabela = document.getElementById('aud-tabela').value;
    const acao = document.getElementById('aud-acao').value;

    let q = sb.from('auditoria')
      .select('*')
      .gte('criado_em', de + 'T00:00:00')
      .lte('criado_em', ate + 'T23:59:59')
      .order('criado_em', { ascending: false })
      .limit(400);
    if (tabela) q = q.eq('tabela', tabela);
    if (acao) q = q.eq('acao', acao);

    const { data, error } = await q;
    if (error) {
      document.getElementById('aud-lista').innerHTML =
        '<div class="cartao"><div class="mensagem-erro visivel">' + escaparHtml(error.message) + '</div></div>';
      return;
    }
    this.registros = data || [];

    // Nomes dos pacientes envolvidos
    const idsPac = [...new Set(this.registros.map(r => r.paciente_id).filter(Boolean))];
    this._pacientes = {};
    if (idsPac.length) {
      const { data: pacs } = await sb.from('pacientes').select('id, nome').in('id', idsPac);
      (pacs || []).forEach(p => { this._pacientes[p.id] = p.nome; });
    }

    this.desenhar();
  },

  desenhar() {
    const termo = (document.getElementById('aud-busca')?.value || '').toLowerCase();
    const lista = this.registros.filter(r => {
      if (!termo) return true;
      const pac = r.paciente_id ? (this._pacientes[r.paciente_id] || '') : '';
      return (r.usuario_nome || '').toLowerCase().includes(termo) ||
             pac.toLowerCase().includes(termo);
    });

    document.getElementById('aud-sub').textContent =
      lista.length + ' registro(s) no periodo' + (lista.length === 400 ? ' (limite de 400 - refine o filtro)' : '');

    const alvo = document.getElementById('aud-lista');
    if (lista.length === 0) {
      alvo.innerHTML = '<div class="cartao"><div class="vazio">' +
        '<div class="simbolo-vazio">&#128220;</div><strong>Nada no periodo</strong>' +
        'Ajuste as datas ou os filtros.</div></div>';
      return;
    }

    // Agrupado por dia
    const porDia = {};
    lista.forEach(r => {
      const dia = r.criado_em.slice(0, 10);
      (porDia[dia] = porDia[dia] || []).push(r);
    });

    alvo.innerHTML = Object.entries(porDia).map(([dia, regs]) =>
      '<div class="cartao"><h3>' +
      new Date(dia + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' }) +
      ' <span class="selo selo-neutro">' + regs.length + '</span></h3>' +
      regs.map(r => {
        const pac = r.paciente_id ? this._pacientes[r.paciente_id] : null;
        return '<div class="linha-doc"><div><b>' +
          escaparHtml(r.usuario_nome || 'Sistema/SQL') + ' ' +
          '<span class="selo ' + (this.CORES_ACAO[r.acao] || 'selo-neutro') + '">' +
          (this.ROTULOS_ACAO[r.acao] || r.acao) + '</span> ' +
          escaparHtml(this.ROTULOS_TABELA[r.tabela] || r.tabela) + '</b>' +
          '<small>' + new Date(r.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) +
          (pac ? ' &middot; paciente: ' + escaparHtml(pac) : '') + '</small></div>' +
          '<button class="btn-chip" onclick="MODULOS.auditoria.ver(\'' + r.id + '\')">Ver</button>' +
          '</div>';
      }).join('') +
      '</div>').join('');
  },

  // ─────────────── DIFF (o "exatamente o que foi feito") ───────────────

  formatarValor(v) {
    if (v === null || v === undefined || v === '') return '<i style="opacity:.5">vazio</i>';
    if (typeof v === 'boolean') return v ? 'Sim' : 'Nao';
    if (typeof v === 'object') return escaparHtml(JSON.stringify(v));
    const s = String(v);
    return escaparHtml(s.length > 300 ? s.slice(0, 300) + '...' : s);
  },

  ver(id) {
    const r = this.registros.find(x => x.id === id);
    if (!r) return;
    const antes = r.dados_antes || {};
    const depois = r.dados_depois || {};
    const pac = r.paciente_id ? this._pacientes[r.paciente_id] : null;

    let corpo = '';
    if (r.acao === 'UPDATE') {
      const chaves = [...new Set([...Object.keys(antes), ...Object.keys(depois)])]
        .filter(k => !this.CAMPOS_OCULTOS.includes(k))
        .filter(k => JSON.stringify(antes[k]) !== JSON.stringify(depois[k]));
      corpo = chaves.length === 0
        ? '<p class="sub">Nenhum campo relevante mudou (apenas carimbos internos).</p>'
        : chaves.map(k =>
            '<div class="aud-campo"><b>' + escaparHtml(k) + '</b>' +
            '<div class="aud-antes">' + this.formatarValor(antes[k]) + '</div>' +
            '<div class="aud-seta">&darr;</div>' +
            '<div class="aud-depois">' + this.formatarValor(depois[k]) + '</div></div>').join('');
    } else {
      const dados = r.acao === 'DELETE' ? antes : depois;
      corpo = Object.entries(dados)
        .filter(([k, v]) => !this.CAMPOS_OCULTOS.includes(k) && v !== null && v !== '')
        .map(([k, v]) =>
          '<div class="aud-campo"><b>' + escaparHtml(k) + '</b>' +
          '<div class="' + (r.acao === 'DELETE' ? 'aud-antes' : 'aud-depois') + '">' +
          this.formatarValor(v) + '</div></div>').join('') ||
        '<p class="sub">Sem dados registrados.</p>';
    }

    abrirModal(
      (this.ROTULOS_ACAO[r.acao] || r.acao) + ' &middot; ' +
      (this.ROTULOS_TABELA[r.tabela] || r.tabela),
      '<div class="grade-info" style="margin-bottom:12px">' +
      '  <div><small>Quem</small><b>' + escaparHtml(r.usuario_nome || 'Sistema/SQL') + '</b></div>' +
      '  <div><small>Quando</small><b>' + new Date(r.criado_em).toLocaleString('pt-BR') + '</b></div>' +
      (pac ? '<div><small>Paciente</small><b>' + escaparHtml(pac) + '</b></div>' : '') +
      '</div>' + corpo, true);
  }
};
