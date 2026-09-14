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
    document.getElementById('plano-elab-overlay')?.remove();
    const ov = document.createElement('div');
    ov.id = 'plano-elab-overlay';
    ov.className = 'folha-overlay';
    ov.innerHTML = '<div class="folha-pagina" id="plano-elab-corpo" style="max-width:960px">' +
      '<p class="sub">Preparando o plano...</p></div>';
    document.body.appendChild(ov);
    const el = document.getElementById('plano-elab-corpo');

    const [{ data: pac }, { data: equipe }, { data: enc }, { data: resps }, { data: avs }] = await Promise.all([
      sb.from('pacientes').select('id, nome, data_nascimento, nivel, convenio, carteirinha, aplicador_id').eq('id', pacienteId).single(),
      sb.from('profiles').select('id, nome, perfil').eq('ativo', true).eq('responsavel_tecnico', true).order('nome'),
      sb.from('encaminhamentos').select('sessoes_semanais, medico').eq('paciente_id', pacienteId)
        .order('criado_em', { ascending: false }).limit(1),
      sb.from('responsaveis').select('nome, principal').eq('paciente_id', pacienteId)
        .order('principal', { ascending: false }).limit(1),
      sb.from('avaliacoes').select('concluido_em').eq('paciente_id', pacienteId)
        .eq('status', 'concluida').order('concluido_em', { ascending: false }).limit(1)
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

    const fmt = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '&mdash;';
    const medico = enc && enc[0] ? enc[0].medico : null;
    const resp = resps && resps[0] ? resps[0].nome : null;
    const dataAv = avs && avs[0] && avs[0].concluido_em
      ? new Date(avs[0].concluido_em).toLocaleDateString('pt-BR') : '&mdash;';
    this._nivelSel = (base && base.nivel_suporte) || null;

    const caixaTxt = (id, valor, dica, linhas) =>
      '<div class="deq-caixa deq-edit"><textarea id="pl-' + id + '" rows="' + (linhas || 4) + '" ' +
      'placeholder="' + dica + '...">' + escaparHtml(valor || '') + '</textarea></div>';

    const espec = ['Fonoaudiologia', 'Musicoterapia', 'Psicomotricidade', 'Psicopedagogia',
      'Psicoterapia ABA', 'Psicoterapia Convencional', 'Terapia Ocupacional', 'Outras'];

    el.innerHTML =
      '<div class="pagina-cabecalho">' +
      '  <div>' +
      '    <button class="btn-voltar" onclick="MODULOS.plano.fecharConstrutor()">&larr; Fechar</button>' +
      '    <h2>' + (renovarDeId ? 'Renovacao do Plano Terapeutico' : 'Elaboracao do Plano Terapeutico') + '</h2>' +
      '    <p class="sub">Preencha direto no documento. Os dados do beneficiario vem do cadastro; o que estiver errado ali, corrija pelo prontuario.</p>' +
      '  </div>' +
      '  <button class="btn btn-primario" onclick="MODULOS.plano.salvar()">Salvar plano</button>' +
      '</div>' +

      '<div class="doc-eq" style="max-width:900px; margin:0 auto; border:1px solid var(--line); box-shadow:0 10px 34px rgba(21,13,32,.08)">' +

      '<div class="deq-cab">' +
      '  <img src="icones/equilibrium.png" alt="Equilibrium">' +
      '  <div class="deq-cab-t"><h1>PLANO TERAP&Ecirc;UTICO</h1>' +
      '  <p>Equilibrium Terapia Infantil &middot; Uberl&acirc;ndia/MG</p></div>' +
      '  <span class="deq-pilula">' + (renovarDeId ? 'RENOVA&Ccedil;&Atilde;O' : 'ELABORA&Ccedil;&Atilde;O') + '</span>' +
      '</div>' +

      '<h2><span class="ponto deq-teal"></span>Dados do Benefici&aacute;rio <small>&middot; autom&aacute;ticos</small></h2>' +
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
      '  <div class="deq-cid" style="display:flex; align-items:center; gap:8px"><small>CID11</small>' +
      '  <input id="pl-cid11" class="deq-input" placeholder="Ex.: 6A02.0" value="' +
           escaparHtml(base ? base.cid11 || '' : '') + '"></div>' +
      '</div>' +

      '<h2><span class="ponto"></span>N&iacute;vel de Suporte <small>&middot; toque para marcar</small></h2>' +
      '<div class="deq-caixa deq-niveis" id="pl-niveis">' +
      [1, 2, 3].map(n => '<div class="deq-nivel-btn' + (this._nivelSel === n ? ' marcado' : '') + '" ' +
        'onclick="MODULOS.plano.marcarNivel(' + n + ')" id="pl-nv-' + n + '">N&iacute;vel ' + n + '</div>').join('') +
      '</div>' +

      '<h2><span class="ponto deq-rosa"></span>Diagn&oacute;stico Cl&iacute;nico</h2>' +
      caixaTxt('diagnostico', base ? base.diagnostico : '', 'Diagnostico clinico do beneficiario', 3) +

      '<h2><span class="ponto deq-teal"></span>Resultado da Avalia&ccedil;&atilde;o</h2>' +
      caixaTxt('resultado', base ? base.resultado_avaliacao : '',
        'Sintese do resultado da avaliacao (QADI-R): areas de defasagem, potencialidades, perfil de intervencao', 4) +

      '<h2><span class="ponto deq-amarelo"></span>Plano de Cuidado</h2>' +
      caixaTxt('cuidado', (base && base.plano_cuidado) ||
        (freqSugerida ? 'Psicoterapia ABA em regime de ' + freqSugerida +
          ' sessoes semanais, com Plano de Ensino Individualizado (PEI), coleta de dados por tentativas em todas as sessoes e orientacao parental.' : ''),
        'Regime de atendimento, abordagem, supervisao e orientacao familiar', 4) +

      '<div class="deq-reaval" style="gap:16px; flex-wrap:wrap">' +
      '  <span><small>Vig&ecirc;ncia - in&iacute;cio</small><br>' +
      '  <input type="date" id="pl-inicio" class="deq-input" value="' +
           ((base && renovarDeId ? '' : '') || hoje.toISOString().slice(0, 10)) + '"></span>' +
      '  <span><small>Data prevista para reavalia&ccedil;&atilde;o</small><br>' +
      '  <input type="date" id="pl-fim" class="deq-input" value="' + fim.toISOString().slice(0, 10) + '"></span>' +
      '  <span><small>Sess&otilde;es por semana</small><br>' +
      '  <input type="number" id="pl-freq" class="deq-input" min="1" max="15" style="width:80px" value="' + freqSugerida + '"></span>' +
      '  <span style="flex:1; min-width:220px"><small>Respons&aacute;vel t&eacute;cnico (assina o documento)</small><br>' +
      '  <select id="pl-prof" class="deq-input" style="width:100%">' +
      ((equipe || []).length === 0
        ? '<option value="">Nenhum responsavel tecnico marcado - defina em Usuarios e Acessos</option>' : '') +
      (equipe || []).map(m => '<option value="' + m.id + '"' +
        ((base ? base.profissional_id : pac.aplicador_id) === m.id ? ' selected' : '') + '>' +
        escaparHtml(m.nome) + '</option>').join('') +
      '  </select></span>' +
      '</div>' +
      '</div>' +

      '<div class="cartao" style="max-width:900px; margin:16px auto 0">' +
      '<h3>Conteudo clinico interno <span class="selo selo-neutro">nao sai no documento</span></h3>' +
      '<p class="sub" style="margin-bottom:10px">Apoio da equipe: queixa, objetivos e procedimentos detalhados.</p>' +
      '<div class="grade-form">' +
      '  <div class="campo c3"><label>Queixa principal / demanda</label>' +
      '    <textarea id="pl-queixa" rows="2" style="resize:vertical">' + escaparHtml(base ? base.queixa || '' : '') + '</textarea></div>' +
      '  <div class="campo c3"><label>Objetivo geral</label>' +
      '    <textarea id="pl-objetivo_geral" rows="2" style="resize:vertical">' + escaparHtml(base ? base.objetivo_geral || '' : '') + '</textarea></div>' +
      '  <div class="campo c3"><label>Objetivos especificos</label>' +
      '    <textarea id="pl-objetivos" rows="4" style="resize:vertical">' + escaparHtml(base ? base.objetivos_especificos || '' : '') + '</textarea></div>' +
      '  <div class="campo c3"><label>Procedimentos e tecnicas</label>' +
      '    <textarea id="pl-procedimentos" rows="3" style="resize:vertical">' + escaparHtml(base ? base.procedimentos || '' : '') + '</textarea></div>' +
      '</div></div>' +

      '<div class="mensagem-erro" id="pl-erro" style="max-width:900px; margin:10px auto 0"></div>' +
      '<div class="barra-acoes" style="max-width:900px; margin:12px auto 0">' +
      '  <button class="btn btn-fantasma" onclick="MODULOS.plano.fecharConstrutor()">Cancelar</button>' +
      '  <button class="btn btn-primario" onclick="MODULOS.plano.salvar()">Salvar plano</button>' +
      '</div>';
  },

  fecharConstrutor() {
    document.getElementById('plano-elab-overlay')?.remove();
    const alvo = document.getElementById('pac-aba-conteudo');
    if (alvo && this._ctx && MODULOS.pacientes.paciente) {
      MODULOS.pacientes.abrirAba('plano');
    }
  },

  marcarNivel(n) {
    this._nivelSel = (this._nivelSel === n) ? null : n;
    [1, 2, 3].forEach(x => {
      const el = document.getElementById('pl-nv-' + x);
      if (el) {
        el.classList.toggle('marcado', this._nivelSel === x);
        el.innerHTML = (this._nivelSel === x ? '&#10003; ' : '') + 'N&iacute;vel ' + x;
      }
    });
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
      nivel_suporte: this._nivelSel || null,
      resultado_avaliacao: document.getElementById('pl-resultado').value.trim() || null,
      plano_cuidado: document.getElementById('pl-cuidado').value.trim() || null,
      frequencia_semanal: parseInt(document.getElementById('pl-freq').value, 10) || null,
      vigencia_inicio: document.getElementById('pl-inicio').value || null,
      vigencia_fim: document.getElementById('pl-fim').value || null,
      profissional_id: document.getElementById('pl-prof').value || null,
      criado_por: window.CORTEX_SESSAO.user.id
    };

    if (!dados.profissional_id) {
      erro.textContent = 'Nenhum responsavel tecnico disponivel. A coordenacao marca quem assina em Usuarios e Acessos.';
      erro.classList.add('visivel');
      (document.getElementById('plano-elab-corpo') || document.body).scrollIntoView({ block: 'end', behavior: 'smooth' });
      return;
    }
    if (!dados.diagnostico || !dados.plano_cuidado) {
      erro.textContent = 'Preencha ao menos o Diagnostico Clinico e o Plano de Cuidado.';
      erro.classList.add('visivel');
      (document.getElementById('plano-elab-corpo') || document.body).scrollIntoView({ block: 'end', behavior: 'smooth' });
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

      this.fecharConstrutor();
      this.docPT(novo.id);
    } catch (e) {
      erro.textContent = e.message;
      erro.classList.add('visivel');
      (document.getElementById('plano-elab-corpo') || document.body).scrollIntoView({ block: 'end', behavior: 'smooth' });
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

    window._docPortal = { paciente_id: pl.paciente_id, tipo: 'pt', titulo: 'Plano Terapeutico' };
    document.getElementById('doc-eq-corpo').innerHTML =
      '<div class="pagina-cabecalho nao-imprime">' +
      '  <div><button class="btn-voltar" onclick="document.getElementById(\'doc-eq-overlay\').remove()">&larr; Fechar</button>' +
      '  <h2>Plano Terapeutico &middot; documento oficial</h2></div>' +
      '  <button class="btn btn-primario" onclick="window.print()">&#128424; Imprimir / PDF</button>' +
      portalBtn() +
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
      '<br>Respons&aacute;vel T&eacute;cnico / N&ordm; do Registro de Classe</div>' +

      '<div class="deq-rodape">' +
      '  <span>Equilibrium Terapia Infantil &middot; Uberl&acirc;ndia/MG</span>' +
      '  <span class="pontos"><i style="background:var(--eq-teal)"></i><i style="background:var(--eq-amarelo)"></i>' +
      '<i style="background:var(--eq-rosa)"></i><i style="background:var(--eq-azul)"></i></span>' +
      '  <span>Documento gerado pelo CORTEX aba &middot; ' + new Date().toLocaleDateString('pt-BR') + '</span>' +
      '</div>' +
      '</div>';
  }
};
