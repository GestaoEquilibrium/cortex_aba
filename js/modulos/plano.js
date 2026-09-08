// ============================================================================
// CORTEX aba - js/modulos/plano.js
// Sprint 9: Plano Terapeutico (Formulario 01) com vigencia, renovacao e
// sinalizacao antecipada a coordenacao quando o prazo se aproxima.
// ============================================================================

window.MODULOS = window.MODULOS || {};

window.MODULOS.plano = {

  el() { return document.getElementById('pagina'); },
  podeGerir() { return perm('plano') === 'E'; },

  // ─────────────── ABA DO PRONTUARIO ───────────────

  async htmlDoPaciente(pacienteId) {
    const { data: planos } = await sb.from('planos_terapeuticos')
      .select('id, status, vigencia_inicio, vigencia_fim, criado_em, profissional:profiles!planos_terapeuticos_profissional_id_fkey(nome)')
      .eq('paciente_id', pacienteId)
      .order('criado_em', { ascending: false });

    const lista = planos || [];
    const ativo = lista.find(p => p.status === 'ativo');

    let alerta = '';
    if (ativo && ativo.vigencia_fim) {
      const dias = Math.ceil(
        (new Date(ativo.vigencia_fim + 'T12:00:00') - Date.now()) / 86400000);
      if (dias < 0) {
        alerta = '<div class="cartao" style="border-color:var(--st-bad)">' +
          '<b style="color:var(--st-bad)">Plano vencido ha ' + Math.abs(dias) + ' dia(s).</b> ' +
          '<span class="sub">Elabore a renovacao para manter o acompanhamento formalizado.</span></div>';
      } else if (dias <= 30) {
        alerta = '<div class="cartao" style="border-color:var(--st-warn)">' +
          '<b style="color:var(--st-warn)">Plano vence em ' + dias + ' dia(s).</b> ' +
          '<span class="sub">Programe a renovacao com a familia e a equipe.</span></div>';
      }
    }

    let html = alerta;
    if (this.podeGerir()) {
      html += '<div class="cartao faixa-ambar"><h3>' +
        (ativo ? 'Renovacao' : 'Novo Plano Terapeutico') + '</h3>' +
        '<p class="sub" style="margin-bottom:10px">' +
        (ativo
          ? 'A renovacao cria um novo plano ja preenchido com o conteudo do atual (que passa a "renovado").'
          : 'Formulario 01: queixa, objetivos, procedimentos e vigencia.') + '</p>' +
        '<button class="btn btn-primario" onclick="MODULOS.plano.abrirConstrutor(\'' +
        pacienteId + '\'' + (ativo ? ', \'' + ativo.id + '\'' : '') + ')">' +
        (ativo ? 'Renovar plano' : 'Elaborar plano') + '</button>' +
        '</div>';
    }

    html += '<div class="cartao"><h3>Historico</h3>' +
      (lista.length ? lista.map(p => {
        const selo = p.status === 'ativo' ? 'selo-ok">Ativo'
          : p.status === 'renovado' ? 'selo-neutro">Renovado'
          : 'selo-neutro">' + p.status;
        return '<div class="linha-doc"><div><b>Plano &middot; ' +
          (p.vigencia_inicio ? new Date(p.vigencia_inicio + 'T12:00:00').toLocaleDateString('pt-BR') : '-') +
          ' a ' + (p.vigencia_fim ? new Date(p.vigencia_fim + 'T12:00:00').toLocaleDateString('pt-BR') : '-') + '</b>' +
          '<small>' + (p.profissional ? 'Responsavel: ' + escaparHtml(p.profissional.nome) : '') + '</small></div>' +
          '<div class="pac-selos"><span class="selo ' + selo + '</span>' +
          '<button class="btn-chip" onclick="MODULOS.plano.abrirVisual(\'' + p.id + '\')">Abrir</button>' +
          '<button class="btn-chip" title="Documento oficial no modelo do convenio, com a identidade da clinica" ' +
          'onclick="MODULOS.plano.docPT(\'' + p.id + '\')">Documento</button>' +
          '</div></div>';
      }).join('') : '<p class="sub">Nenhum plano elaborado ainda.</p>') +
      '</div>';

    return html;
  },

  // ─────────────── CONSTRUTOR ───────────────

  async abrirConstrutor(pacienteId, renovarDeId) {
    const el = this.el();
    el.innerHTML = '<div class="cartao"><p class="sub">Preparando o plano...</p></div>';

    const [{ data: pac }, { data: equipe }, { data: enc }] = await Promise.all([
      sb.from('pacientes').select('id, nome, data_nascimento, nivel, convenio, aplicador_id').eq('id', pacienteId).single(),
      sb.from('profiles').select('id, nome, perfil').eq('atende_pacientes', true).eq('ativo', true).order('nome'),
      sb.from('encaminhamentos').select('sessoes_semanais').eq('paciente_id', pacienteId)
        .order('criado_em', { ascending: false }).limit(1)
    ]);

    let base = null;
    if (renovarDeId) {
      const { data } = await sb.from('planos_terapeuticos').select('*').eq('id', renovarDeId).single();
      base = data;
    }

    const hoje = new Date();
    const fim = new Date(hoje); fim.setMonth(fim.getMonth() + 6);
    const freqSugerida = (base && base.frequencia_semanal) ||
      (enc && enc[0] && enc[0].sessoes_semanais) || '';

    this._ctx = { pacienteId, renovarDeId: renovarDeId || null, paciente: pac };

    const campoTxt = (id, rotulo, valor, linhas) =>
      '<div class="campo c3"><label>' + rotulo + '</label>' +
      '<textarea id="pl-' + id + '" rows="' + (linhas || 3) + '" style="resize:vertical">' +
      escaparHtml(valor || '') + '</textarea></div>';

    el.innerHTML =
      '<div class="pagina-cabecalho">' +
      '  <div>' +
      '    <button class="btn-voltar" onclick="MODULOS.pacientes.telaDetalhe(\'' + pacienteId + '\', \'plano\')">&larr; Prontuario</button>' +
      '    <h2>' + (renovarDeId ? 'Renovacao do Plano' : 'Plano Terapeutico') + ' &middot; ' + escaparHtml(pac.nome) + '</h2>' +
      '    <p class="sub">Formulario 01 &middot; ' + calcularIdade(pac.data_nascimento) +
      (pac.nivel ? ' &middot; ' + (pac.nivel === 'aba1' ? 'ABA 1' : 'ABA 2') : '') + '</p>' +
      '  </div>' +
      '  <button class="btn btn-primario" onclick="MODULOS.plano.salvar()">Salvar plano</button>' +
      '</div>' +

      '<div class="cartao faixa-azul"><h3>Identificacao e vigencia</h3>' +
      '<div class="grade-form">' +
      '  <div class="campo"><label>Diagnostico clinico</label>' +
      '    <input id="pl-diagnostico" value="' + escaparHtml(base ? base.diagnostico || '' : '') + '"></div>' +
      '  <div class="campo"><label>CID11</label>' +
      '    <input id="pl-cid11" placeholder="Ex.: 6A02.0" value="' + escaparHtml(base ? base.cid11 || '' : '') + '"></div>' +
      '  <div class="campo"><label>Nivel de suporte</label><select id="pl-nivel">' +
      '<option value="">-</option>' +
      [1, 2, 3].map(n => '<option value="' + n + '"' +
        (base && base.nivel_suporte === n ? ' selected' : '') + '>Nivel ' + n + '</option>').join('') +
      '  </select></div>' +
      '  <div class="campo"><label>Sessoes por semana</label>' +
      '    <input type="number" id="pl-freq" min="1" max="15" value="' + freqSugerida + '"></div>' +
      '  <div class="campo"><label>Responsavel tecnico</label>' +
      '    <select id="pl-prof">' +
      (equipe || []).map(m => '<option value="' + m.id + '"' +
        ((base ? base.profissional_id : pac.aplicador_id) === m.id ? ' selected' : '') + '>' +
        escaparHtml(m.nome) + '</option>').join('') +
      '    </select></div>' +
      '  <div class="campo"><label>Vigencia - inicio</label>' +
      '    <input type="date" id="pl-inicio" value="' + hoje.toISOString().slice(0, 10) + '"></div>' +
      '  <div class="campo"><label>Vigencia - fim</label>' +
      '    <input type="date" id="pl-fim" value="' + fim.toISOString().slice(0, 10) + '"></div>' +
      '</div></div>' +

      '<div class="cartao faixa-roxo"><h3>Conteudo clinico</h3>' +
      '<div class="grade-form">' +
      campoTxt('queixa', 'Queixa principal / demanda', base ? base.queixa : '', 3) +
      campoTxt('objetivo_geral', 'Objetivo geral', base ? base.objetivo_geral : '', 2) +
      campoTxt('objetivos', 'Objetivos especificos', base ? base.objetivos_especificos : '', 5) +
      campoTxt('procedimentos', 'Procedimentos e tecnicas (DTT, NET, reforcamento...)', base ? base.procedimentos : '', 4) +
      campoTxt('resultado', 'Resultado da avaliacao (sai no documento do convenio)', base ? base.resultado_avaliacao : '', 4) +
      campoTxt('cuidado', 'Plano de cuidado (sai no documento do convenio)', base ? base.plano_cuidado : '', 4) +
      '</div></div>' +

      '<div class="mensagem-erro" id="pl-erro"></div>' +
      '<div class="barra-acoes">' +
      '  <button class="btn btn-fantasma" onclick="MODULOS.pacientes.telaDetalhe(\'' + pacienteId + '\', \'plano\')">Cancelar</button>' +
      '  <button class="btn btn-primario" onclick="MODULOS.plano.salvar()">Salvar plano</button>' +
      '</div>';
  },

  async salvar() {
    const erro = document.getElementById('pl-erro');
    erro.classList.remove('visivel');
    const ctx = this._ctx;

    const dados = {
      paciente_id: ctx.pacienteId,
      diagnostico: document.getElementById('pl-diagnostico').value.trim() || null,
      queixa: document.getElementById('pl-queixa').value.trim() || null,
      objetivo_geral: document.getElementById('pl-objetivo_geral').value.trim() || null,
      objetivos_especificos: document.getElementById('pl-objetivos').value.trim() || null,
      procedimentos: document.getElementById('pl-procedimentos').value.trim() || null,
      cid11: document.getElementById('pl-cid11').value.trim() || null,
      nivel_suporte: parseInt(document.getElementById('pl-nivel').value, 10) || null,
      resultado_avaliacao: document.getElementById('pl-resultado').value.trim() || null,
      plano_cuidado: document.getElementById('pl-cuidado').value.trim() || null,
      frequencia_semanal: parseInt(document.getElementById('pl-freq').value, 10) || null,
      vigencia_inicio: document.getElementById('pl-inicio').value || null,
      vigencia_fim: document.getElementById('pl-fim').value || null,
      profissional_id: document.getElementById('pl-prof').value || null,
      criado_por: window.CORTEX_SESSAO.user.id
    };

    if (!dados.queixa || !dados.objetivo_geral) {
      erro.textContent = 'Preencha ao menos a queixa e o objetivo geral.';
      erro.classList.add('visivel');
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      return;
    }

    try {
      const { data: novo, error: e1 } = await sb.from('planos_terapeuticos')
        .insert(dados).select('id').single();
      if (e1) throw new Error(e1.message);

      if (ctx.renovarDeId) {
        await sb.from('planos_terapeuticos')
          .update({ status: 'renovado' }).eq('id', ctx.renovarDeId);
      }

      this.abrirVisual(novo.id);
    } catch (e) {
      erro.textContent = e.message;
      erro.classList.add('visivel');
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }
  },

  // ─────────────── VISUAL (Formulario 01) ───────────────

  async abrirVisual(planoId) {
    const el = this.el();
    el.innerHTML = '<div class="cartao"><p class="sub">Carregando plano...</p></div>';

    const { data: p } = await sb.from('planos_terapeuticos')
      .select('*, pacientes(id, nome, data_nascimento, nivel, convenio), profissional:profiles!planos_terapeuticos_profissional_id_fkey(nome)')
      .eq('id', planoId).single();
    if (!p) return;

    const bloco = (rotulo, valor) =>
      '<div class="caixa-info larga" style="margin-bottom:10px"><small>' + rotulo + '</small>' +
      '<b style="white-space:pre-wrap; font-weight:600">' + (valor ? escaparHtml(valor) : '&mdash;') + '</b></div>';

    el.innerHTML =
      '<div class="pagina-cabecalho nao-imprime">' +
      '  <div>' +
      '    <button class="btn-voltar" onclick="MODULOS.pacientes.telaDetalhe(\'' + p.pacientes.id + '\', \'plano\')">&larr; Prontuario</button>' +
      '    <h2>Plano Terapeutico</h2>' +
      '  </div>' +
      '  <button class="btn btn-primario" onclick="MODULOS.plano.docPT(\'' + p.id + '\')">&#128196; Documento oficial</button>' +
      '</div>' +

      '<div class="cartao folha-presenca">' +
      '  <div class="folha-titulo">' +
      '    <div><b>PLANO TERAPEUTICO</b>' +
      '    <small>Formulario 01 &middot; Psicoterapia ABA</small></div>' +
      '    <span class="folha-marca">CORTEX aba &middot; Equilibrium Terapia Infantil</span>' +
      '  </div>' +
      '  <div class="grade-visao" style="margin-bottom:14px">' +
      '    <div class="caixa-info larga"><small>Paciente</small><b>' + escaparHtml(p.pacientes.nome) + '</b></div>' +
      '    <div class="caixa-info"><small>Nascimento</small><b>' +
        new Date(p.pacientes.data_nascimento + 'T12:00:00').toLocaleDateString('pt-BR') + '</b></div>' +
      '    <div class="caixa-info"><small>Nivel</small><b>' +
        (p.pacientes.nivel === 'aba1' ? 'ABA 1' : p.pacientes.nivel === 'aba2' ? 'ABA 2' : '-') + '</b></div>' +
      '    <div class="caixa-info"><small>Convenio</small><b>' + escaparHtml(p.pacientes.convenio || '-') + '</b></div>' +
      '    <div class="caixa-info"><small>Diagnostico</small><b>' + escaparHtml(p.diagnostico || '-') + '</b></div>' +
      '    <div class="caixa-info"><small>Sessoes/semana</small><b>' + (p.frequencia_semanal || '-') + '</b></div>' +
      '    <div class="caixa-info"><small>Vigencia</small><b>' +
        (p.vigencia_inicio ? new Date(p.vigencia_inicio + 'T12:00:00').toLocaleDateString('pt-BR') : '-') + ' a ' +
        (p.vigencia_fim ? new Date(p.vigencia_fim + 'T12:00:00').toLocaleDateString('pt-BR') : '-') + '</b></div>' +
      '    <div class="caixa-info"><small>Responsavel tecnico</small><b>' +
        escaparHtml(p.profissional ? p.profissional.nome : '-') + '</b></div>' +
      '  </div>' +
      bloco('Queixa principal / demanda', p.queixa) +
      bloco('Objetivo geral', p.objetivo_geral) +
      bloco('Objetivos especificos', p.objetivos_especificos) +
      bloco('Procedimentos e tecnicas', p.procedimentos) +
      '</div>';
  },

  // ─────────────── SINALIZACAO NO INICIO ───────────────

  async htmlVencimentos() {
    const limite = new Date();
    limite.setDate(limite.getDate() + 30);

    const { data } = await sb.from('planos_terapeuticos')
      .select('id, vigencia_fim, aviso_enviado, pacientes(id, nome)')
      .eq('status', 'ativo')
      .lte('vigencia_fim', limite.toISOString().slice(0, 10))
      .order('vigencia_fim');

    const lista = data || [];
    if (lista.length === 0) return '';

    // Notifica a coordenacao uma unica vez por plano ao entrar na janela
    const semAviso = lista.filter(p => !p.aviso_enviado);
    if (semAviso.length && perm('plano') === 'E') {
      const notifs = [];
      semAviso.forEach(p => {
        const corpo = 'O plano terapeutico de ' + p.pacientes.nome + ' vence em ' +
          new Date(p.vigencia_fim + 'T12:00:00').toLocaleDateString('pt-BR') +
          '. Programe a renovacao.';
        notifs.push({ destinatario_perfil: 'coordenador', titulo: 'Plano vencendo: ' + p.pacientes.nome, corpo });
        notifs.push({ destinatario_perfil: 'direcao', titulo: 'Plano vencendo: ' + p.pacientes.nome, corpo });
      });
      await sb.from('notificacoes').insert(notifs);
      await sb.from('planos_terapeuticos')
        .update({ aviso_enviado: true })
        .in('id', semAviso.map(p => p.id));
    }

    return '<div class="cartao" style="border-color:var(--st-warn)">' +
      '<h3>Planos terapeuticos vencendo</h3>' +
      lista.map(p => {
        const dias = Math.ceil((new Date(p.vigencia_fim + 'T12:00:00') - Date.now()) / 86400000);
        return '<div class="linha-doc">' +
          '<div><b>' + escaparHtml(p.pacientes.nome) + '</b>' +
          '<small>Vigencia ate ' + new Date(p.vigencia_fim + 'T12:00:00').toLocaleDateString('pt-BR') + '</small></div>' +
          '<div class="pac-selos">' +
          (dias < 0
            ? '<span class="selo selo-bad">Vencido ha ' + Math.abs(dias) + 'd</span>'
            : '<span class="selo selo-warn">' + dias + ' dia(s)</span>') +
          '<button class="btn-chip" onclick="abrirModulo(\'pacientes\'); setTimeout(function(){ MODULOS.pacientes.telaDetalhe(\'' +
          p.pacientes.id + '\', \'plano\'); }, 50)">Abrir</button>' +
          '</div></div>';
      }).join('') +
      '</div>';
  },

  // ─────────────── DOCUMENTO OFICIAL (identidade Equilibrium) ───────────────

  async docPT(planoId) {
    const ov = document.createElement('div');
    ov.id = 'doc-eq-overlay';
    ov.className = 'folha-overlay';
    ov.innerHTML = '<div class="folha-pagina" id="doc-eq-corpo" style="max-width:900px">' +
      '<p class="sub">Montando o documento...</p></div>';
    document.body.appendChild(ov);

    const { data: pl } = await sb.from('planos_terapeuticos')
      .select('*, pacientes(nome, data_nascimento, carteirinha, convenio), ' +
              'profissional:profiles!planos_terapeuticos_profissional_id_fkey(nome)')
      .eq('id', planoId).single();
    if (!pl) { ov.remove(); return; }

    const [rResp, rEnc, rAv] = await Promise.all([
      sb.from('responsaveis').select('nome, principal').eq('paciente_id', pl.paciente_id)
        .order('principal', { ascending: false }).limit(1),
      sb.from('encaminhamentos').select('medico').eq('paciente_id', pl.paciente_id)
        .order('criado_em', { ascending: false }).limit(1),
      sb.from('avaliacoes').select('concluido_em').eq('paciente_id', pl.paciente_id)
        .eq('status', 'concluida').order('concluido_em', { ascending: false }).limit(1)
    ]);
    const resp = rResp.data && rResp.data[0] ? rResp.data[0].nome : null;
    const medico = rEnc.data && rEnc.data[0] ? rEnc.data[0].medico : null;
    const dataAv = rAv.data && rAv.data[0] && rAv.data[0].concluido_em
      ? new Date(rAv.data[0].concluido_em).toLocaleDateString('pt-BR')
      : (pl.vigencia_inicio ? new Date(pl.vigencia_inicio + 'T12:00:00').toLocaleDateString('pt-BR') : '-');
    const pac = pl.pacientes;
    const fmt = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '-';

    const espec = ['Fonoaudiologia', 'Musicoterapia', 'Psicomotricidade', 'Psicopedagogia',
      'Psicoterapia ABA', 'Psicoterapia Convencional', 'Terapia Ocupacional', 'Outras: ____________'];

    document.getElementById('doc-eq-corpo').innerHTML =
      '<div class="pagina-cabecalho nao-imprime">' +
      '  <div><button class="btn-voltar" onclick="document.getElementById(\'doc-eq-overlay\').remove()">&larr; Fechar</button>' +
      '  <h2>Plano Terapeutico &middot; documento oficial</h2></div>' +
      '  <button class="btn btn-primario" onclick="window.print()">&#128424; Imprimir / PDF</button>' +
      '</div>' +

      '<div class="doc-eq">' +
      '<div class="deq-cab">' +
      '  <img src="icones/equilibrium.png" alt="Equilibrium">' +
      '  <div class="deq-cab-t"><h1>PLANO TERAP&Ecirc;UTICO</h1>' +
      '  <p>Equilibrium Terapia Infantil &middot; Uberl&acirc;ndia/MG</p></div>' +
      '</div>' +

      '<h2><span class="ponto deq-teal"></span>Dados do Benefici&aacute;rio</h2>' +
      '<div class="deq-caixa deq-dados" style="grid-template-columns:2fr 1fr 1fr">' +
      '  <div style="grid-column:span 2"><small>Benefici&aacute;rio</small><b>' + escaparHtml(pac.nome) + '</b></div>' +
      '  <div><small>Data de Nascimento</small><b>' + fmt(pac.data_nascimento) + '</b></div>' +
      '  <div><small>Carteirinha</small><b>' + escaparHtml(pac.carteirinha || '&mdash;') +
           (pac.convenio ? ' <span style="color:var(--eq-cinza); font-weight:600">(' + escaparHtml(pac.convenio) + ')</span>' : '') + '</b></div>' +
      '  <div style="grid-column:span 2"><small>Respons&aacute;vel</small><b>' + escaparHtml(resp || '&mdash;') + '</b></div>' +
      '  <div style="grid-column:span 2; border-bottom:none"><small>M&eacute;dico Requisitante</small><b>' + escaparHtml(medico || '&mdash;') + '</b></div>' +
      '  <div style="border-bottom:none"><small>Data de Avalia&ccedil;&atilde;o</small><b>' + dataAv + '</b></div>' +
      '</div>' +

      '<h2><span class="ponto deq-amarelo"></span>Especialidade</h2>' +
      '<div class="deq-caixa">' +
      '  <div class="deq-chks">' +
      espec.map(e =>
        '<span class="deq-chk' + (e === 'Psicoterapia ABA' ? ' marcado' : '') + '"><i></i>' + e + '</span>').join('') +
      '  </div>' +
      '  <div class="deq-cid"><small>CID11</small><b>' + escaparHtml(pl.cid11 || pl.diagnostico || '&mdash;') + '</b></div>' +
      '</div>' +

      '<h2><span class="ponto"></span>N&iacute;vel de Suporte</h2>' +
      '<div class="deq-caixa deq-niveis">' +
      [1, 2, 3].map(n => '<div class="' + (pl.nivel_suporte === n ? 'marcado' : '') + '">' +
        (pl.nivel_suporte === n ? '&#10003; ' : '') + 'N&iacute;vel ' + n + '</div>').join('') +
      '</div>' +

      '<h2><span class="ponto deq-rosa"></span>Diagn&oacute;stico Cl&iacute;nico</h2>' +
      '<div class="deq-caixa deq-texto">' + escaparHtml(pl.diagnostico || '') + '</div>' +

      '<h2><span class="ponto deq-teal"></span>Resultado da Avalia&ccedil;&atilde;o</h2>' +
      '<div class="deq-caixa deq-texto">' + escaparHtml(pl.resultado_avaliacao || '') + '</div>' +

      '<h2><span class="ponto deq-amarelo"></span>Plano de Cuidado</h2>' +
      '<div class="deq-caixa deq-texto">' + escaparHtml(pl.plano_cuidado ||
        (pl.frequencia_semanal ? 'Psicoterapia ABA em regime de ' + pl.frequencia_semanal +
         ' sessoes semanais, com Plano de Ensino Individualizado (PEI) e coleta de dados por tentativas.' : '')) + '</div>' +

      '<div class="deq-reaval"><small>Data prevista para reavalia&ccedil;&atilde;o</small>' +
      '<b>' + fmt(pl.vigencia_fim) + '</b></div>' +

      '<div class="deq-assinatura">' + escaparHtml(pl.profissional ? pl.profissional.nome : '') +
      '<br>Profissional / N&ordm; do Registro de Classe</div>' +

      '<div class="deq-rodape">' +
      '  <span>Equilibrium Terapia Infantil &middot; Uberl&acirc;ndia/MG</span>' +
      '  <span class="pontos"><i style="background:var(--eq-teal)"></i><i style="background:var(--eq-amarelo)"></i>' +
      '<i style="background:var(--eq-rosa)"></i><i style="background:var(--eq-azul)"></i></span>' +
      '  <span>Documento gerado pelo CORTEX aba &middot; ' + new Date().toLocaleDateString('pt-BR') + '</span>' +
      '</div>' +
      '</div>';
  }
};
