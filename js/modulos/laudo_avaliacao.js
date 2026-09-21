// ============================================================================
// CORTEX aba - js/modulos/laudo_avaliacao.js
// Relatorio de Avaliacao do Desenvolvimento e Comportamento Infantil
// (avaliacao inicial e reavaliacao) no modelo da clinica: identificacao,
// demanda, procedimento (texto fixo por protocolo), analise clinica (rascunho
// das evolucoes), grafico AV anterior x atual, uma secao por area (texto fixo
// da area + desempenho da crianca), conclusao (rascunho + paragrafos fixos).
// Mesma tela do mensal: formulario a esquerda, folha A4 a direita, gerar e travar.
// ============================================================================

window.MODULOS = window.MODULOS || {};

window.MODULOS.laudo_avaliacao = {

  el() { return document.getElementById('pagina'); },
  podeGerir() { return perm('avaliacoes.relatorio') === 'E' || ['direcao', 'coordenador', 'suporte'].includes(window.CORTEX_SESSAO.profile.perfil); },
  ASSINATURA_PADRAO: { nome: 'Wessilon Marques de Sousa', titulo: 'Neuropsic\u00f3logo e Analista do Comportamento \u00b7 CRP 04/53832' },
  NOME_PROT: { qadi: 'Question\u00e1rio estruturado (QUEST)', ss: 'Socially Savvy Checklist', portage: 'Invent\u00e1rio Portage' },

  // ─────────────── TEXTOS FIXOS (paragrafos dos modelos da clinica) ───────────────
  PROCEDIMENTO: {
    qadi: 'Foi utilizado question\u00e1rio estruturado com base em ferramentas padronizadas de avalia\u00e7\u00e3o do desenvolvimento infantil: VB-MAPP, Invent\u00e1rio Portage, Bayley Scales of Infant and Toddler Development \u2013 Third Edition (Bayley-III) e Vineland Adaptive Behavior Scales \u2013 Second Edition (Vineland-II), e organizado por faixas et\u00e1rias e dom\u00ednios do neurodesenvolvimento: Linguagem Receptiva, Linguagem Expressiva, Cogni\u00e7\u00e3o, Motricidade Grossa, Motricidade Fina e Socializa\u00e7\u00e3o.',
    ss: 'Foi utilizado o protocolo Socially Savvy Checklist, que avalia o repert\u00f3rio social da crian\u00e7a em sete \u00e1reas: Participa\u00e7\u00e3o Conjunta, Brincadeira Social, Autorregula\u00e7\u00e3o, Social/Emocional, Linguagem Social, Comportamento de Sala de Aula/Grupo e Linguagem N\u00e3o-Verbal, por meio de itens pontuados de 0 a 3 conforme a frequ\u00eancia e a qualidade da habilidade observada.',
    portage: 'Foi utilizado o Invent\u00e1rio Portage Operacionalizado, que avalia o desenvolvimento da crian\u00e7a de 0 a 6 anos em cinco \u00e1reas: Socializa\u00e7\u00e3o, Linguagem, Cogni\u00e7\u00e3o, Autocuidados e Desenvolvimento Motor, organizadas por faixas et\u00e1rias, permitindo estimar a idade de desenvolvimento em cada \u00e1rea.'
  },
  APLICACAO: ' Sua aplica\u00e7\u00e3o ocorreu ao longo de {N} sess\u00f5es de 45 minutos, por meio de observa\u00e7\u00e3o cl\u00ednica e intera\u00e7\u00e3o direta entre terapeuta e paciente.',
  AREA_TEXTO: {
    'Linguagem Receptiva': 'Esta \u00e1rea avalia a capacidade da crian\u00e7a de compreender a linguagem falada. Engloba desde a rea\u00e7\u00e3o a sons e o reconhecimento de palavras familiares at\u00e9 a compreens\u00e3o de instru\u00e7\u00f5es simples, perguntas complexas e no\u00e7\u00f5es temporais. A linguagem receptiva \u00e9 a base para uma comunica\u00e7\u00e3o eficaz, refletindo o quanto a crian\u00e7a \u00e9 capaz de processar e interpretar informa\u00e7\u00f5es verbais oriundas do ambiente.',
    'Linguagem Expressiva': 'Refere-se \u00e0 habilidade da crian\u00e7a de se comunicar verbalmente ou por meio de outros recursos expressivos. Abrange desde vocaliza\u00e7\u00f5es e balbucios iniciais at\u00e9 a imita\u00e7\u00e3o de sons, uso de gestos com intencionalidade comunicativa, nomea\u00e7\u00e3o de objetos e pessoas, formula\u00e7\u00e3o de frases simples e relato de eventos. Esta \u00e1rea demonstra a capacidade da crian\u00e7a de se expressar de maneira compreens\u00edvel para os outros.',
    'Cogni\u00e7\u00e3o': 'Esta \u00e1rea investiga os processos mentais relacionados ao pensamento, aten\u00e7\u00e3o, mem\u00f3ria, aprendizagem e resolu\u00e7\u00e3o de problemas. As habilidades avaliadas incluem explora\u00e7\u00e3o do ambiente, aten\u00e7\u00e3o sustentada, associa\u00e7\u00e3o e identifica\u00e7\u00e3o de imagens/objetos, discrimina\u00e7\u00e3o de caracter\u00edsticas, reconhecimento de padr\u00f5es e compreens\u00e3o de rela\u00e7\u00f5es de causa e efeito. Trata-se de uma \u00e1rea fundamental para o desenvolvimento intelectual e para a constru\u00e7\u00e3o de estrat\u00e9gias de intera\u00e7\u00e3o com o meio.',
    'Motricidade Grossa': 'Avalia o desenvolvimento dos grandes grupos musculares envolvidos em movimentos amplos e coordenados. Inclui habilidades como rolar, sentar, engatinhar, andar (com e sem apoio), correr, saltar, chutar bola e subir/descer escadas. O dom\u00ednio da motricidade grossa est\u00e1 diretamente relacionado \u00e0 autonomia da crian\u00e7a, permitindo maior explora\u00e7\u00e3o e intera\u00e7\u00e3o com o ambiente f\u00edsico.',
    'Motricidade Fina': 'Diz respeito \u00e0 coordena\u00e7\u00e3o dos pequenos m\u00fasculos, especialmente das m\u00e3os e dos dedos, necess\u00e1ria para tarefas que exigem precis\u00e3o. S\u00e3o investigadas habilidades como segurar e manipular objetos, empilhar blocos, encaixar pe\u00e7as, rabiscar, desenhar, recortar, utilizar instrumentos como l\u00e1pis e apontador, e manusear objetos pequenos. Essa \u00e1rea \u00e9 essencial n\u00e3o s\u00f3 para brincadeiras que envolvam destreza manual e para o processo de escrita, mas tamb\u00e9m para o desempenho independente em atividades de vida di\u00e1ria, como usar talheres, abotoar roupas, amarrar os sapatos e pentear o cabelo.',
    'Socializa\u00e7\u00e3o': 'Explora a forma como a crian\u00e7a se relaciona com os outros e desenvolve habilidades sociais e emocionais. S\u00e3o observados comportamentos como estabelecimento de contato visual, sorriso em resposta \u00e0 intera\u00e7\u00e3o, interesse por outras crian\u00e7as, imita\u00e7\u00e3o de gestos e express\u00f5es, compartilhamento de brinquedos, participa\u00e7\u00e3o em brincadeiras cooperativas, express\u00e3o de sentimentos, compreens\u00e3o e respeito \u00e0s regras, demonstra\u00e7\u00e3o de empatia e capacidade de solicitar ajuda ou pedir desculpas. Essa \u00e1rea \u00e9 fundamental para a forma\u00e7\u00e3o de v\u00ednculos, adapta\u00e7\u00e3o a contextos sociais e desenvolvimento da intelig\u00eancia emocional.',
    // Socially Savvy
    'Participacao Conjunta': 'Avalia a capacidade de dividir o foco de aten\u00e7\u00e3o com o outro, acompanhar propostas compartilhadas e manter o engajamento em intera\u00e7\u00f5es sociais e comunicativas.',
    'Brincadeira Social': 'Avalia a participa\u00e7\u00e3o em brincadeiras e atividades com pares de forma colaborativa, incluindo jogos, constru\u00e7\u00e3o, atividades manuais e situa\u00e7\u00f5es que envolvem compartilhamento de materiais e regras.',
    'Autorregulacao': 'Avalia o repert\u00f3rio para lidar com demandas, transi\u00e7\u00f5es e combinados, a toler\u00e2ncia \u00e0 frustra\u00e7\u00e3o diante de erros, perdas e da impossibilidade de acesso imediato a itens e atividades preferidas.',
    'Social/Emocional': 'Avalia a identifica\u00e7\u00e3o e a resposta a aspectos emocionais em contextos sociais, incluindo o reconhecimento, a nomea\u00e7\u00e3o e a express\u00e3o adequada das pr\u00f3prias emo\u00e7\u00f5es.',
    'Linguagem Social': 'Avalia o repert\u00f3rio comunicativo funcional nas intera\u00e7\u00f5es: responder, iniciar e manter trocas sociais, com espontaneidade, manuten\u00e7\u00e3o de t\u00f3picos e adequa\u00e7\u00e3o da comunica\u00e7\u00e3o a diferentes contextos.',
    'Comportamento de Sala de Aula/Grupo': 'Avalia a participa\u00e7\u00e3o em atividades de grupo, o seguimento de instru\u00e7\u00f5es coletivas, a espera da vez e a perman\u00eancia nas propostas em contexto compartilhado.',
    'Linguagem Nao-Verbal': 'Avalia o uso de recursos n\u00e3o verbais, como gestos, express\u00f5es faciais, orienta\u00e7\u00e3o corporal e sinais sociais, que sustentam a qualidade das intera\u00e7\u00f5es e o desenvolvimento de habilidades sociais mais complexas.',
    // Portage
    'Socializacao': 'Avalia a forma como a crian\u00e7a se relaciona com adultos e pares: contato visual, resposta \u00e0 intera\u00e7\u00e3o, imita\u00e7\u00e3o, brincadeira compartilhada, express\u00e3o de sentimentos e respeito a regras.',
    'Linguagem': 'Avalia a compreens\u00e3o e a express\u00e3o da linguagem: rea\u00e7\u00e3o a sons, compreens\u00e3o de instru\u00e7\u00f5es, vocaliza\u00e7\u00f5es, nomea\u00e7\u00e3o, frases e relato de eventos.',
    'Cognicao': 'Avalia os processos de aten\u00e7\u00e3o, mem\u00f3ria, associa\u00e7\u00e3o, discrimina\u00e7\u00e3o, reconhecimento de padr\u00f5es e resolu\u00e7\u00e3o de problemas.',
    'Autocuidados': 'Avalia a autonomia em atividades de vida di\u00e1ria: alimenta\u00e7\u00e3o, vestir-se, higiene e uso do banheiro.',
    'Desenvolvimento Motor': 'Avalia as habilidades motoras amplas e finas: equil\u00edbrio, deslocamento, coordena\u00e7\u00e3o, manipula\u00e7\u00e3o de objetos e grafomotricidade.'
  },
  CONCLUSAO_FIXA: 'Diante disso, recomenda-se a continuidade do acompanhamento psicoterap\u00eautico fundamentado na An\u00e1lise do Comportamento Aplicada (ABA), com foco no desenvolvimento das habilidades deficit\u00e1rias.\n\nDestaca-se, ainda, a import\u00e2ncia do envolvimento ativo dos respons\u00e1veis no processo terap\u00eautico, como componente essencial para a efetividade da interven\u00e7\u00e3o e promo\u00e7\u00e3o do desenvolvimento global da crian\u00e7a.',

  // ─────────────── PERFIL POR AREA (qualquer protocolo) ───────────────
  async perfil(av) {
    const A = MODULOS.avaliacoes;
    if (av.protocolo === 'ss') {
      await A.carregarItensSS();
      const { data: resps } = await sb.from('ss_respostas').select('item_id, pontos').eq('avaliacao_id', av.id);
      const mapa = {}; (resps || []).forEach(r => { mapa[r.item_id] = r.pontos; });
      const areas = A.SS_AREAS.map(area => {
        const itens = A.itensSS.filter(i => i.area === area);
        const r = itens.reduce((s, i) => s + (mapa[i.id] || 0), 0), max = itens.length * 3;
        const tx = i => (i.texto || '').toLowerCase().replace(/\.$/, '');
        return { area, pct: max ? Math.round(r * 100 / max) : null,
          presentes: itens.filter(i => (mapa[i.id] || 0) >= 2).map(tx),
          ausentes: itens.filter(i => mapa[i.id] !== undefined && mapa[i.id] <= 1).map(tx) };
      });
      const tot = areas.filter(a => a.pct !== null);
      return { areas, total: tot.length ? Math.round(tot.reduce((s, a) => s + a.pct, 0) / tot.length) : null, faixas: [] };
    }
    if (av.protocolo === 'portage') {
      await A.carregarItensPortage();
      const { data: resps } = await sb.from('portage_respostas').select('item_id, valor').eq('avaliacao_id', av.id);
      const mapa = {}; (resps || []).forEach(r => { mapa[r.item_id] = r.valor; });
      const calc = A.calcPortage(mapa);
      const tx = i => (i.texto || '').toLowerCase().replace(/\.$/, '');
      const areas = calc.map(a => ({ area: a.area, pct: a.total === null ? null : a.total, idade: a.idade,
        presentes: A.itensPortage.filter(i => i.area === a.area && mapa[i.id] === 'S').map(tx),
        ausentes: A.itensPortage.filter(i => i.area === a.area && mapa[i.id] === 'N').map(tx) }));
      const tot = areas.filter(a => a.pct !== null);
      return { areas, total: tot.length ? Math.round(tot.reduce((s, a) => s + a.pct, 0) / tot.length) : null, faixas: [] };
    }
    await A.carregarQuestoes();
    const { data: resps } = await sb.from('avaliacao_respostas').select('questao_id, resposta').eq('avaliacao_id', av.id);
    const mapa = {}; (resps || []).forEach(r => { mapa[r.questao_id] = r.resposta; });
    const faixas = A.FAIXAS.filter(f => A.questoes.some(q => q.faixa === f && mapa[q.id]));
    const areas = A.AREAS.map(area => {
      const qs = A.questoes.filter(q => faixas.includes(q.faixa) && q.area === area);
      const adq = qs.filter(q => mapa[q.id] === 'S').length;
      const tx = q => (q.pergunta || '').toLowerCase().replace(/\?$/, '').replace(/\.$/, '');
      const presentes = qs.filter(q => mapa[q.id] === 'S').map(tx).filter(Boolean);
      const ausentes = qs.filter(q => mapa[q.id] === 'N').map(tx).filter(Boolean);
      return { area, adq, esp: qs.length, pct: qs.length ? Math.round(adq * 100 / qs.length) : null, faltam: ausentes.slice(0, 3), presentes, ausentes };
    });
    const tAdq = areas.reduce((s, x) => s + x.adq, 0), tEsp = areas.reduce((s, x) => s + x.esp, 0);
    return { areas, total: tEsp ? Math.round(tAdq * 100 / tEsp) : null, faixas };
  },

  // ─────────────── DADOS (um ou varios protocolos) ───────────────
  // ids = lista de avaliacoes concluidas; a mais recente e a "principal" (datas, demanda, evolucoes)
  async dados(ids) {
    ids = Array.isArray(ids) ? ids : [ids];
    const { data: avs } = await sb.from('avaliacoes')
      .select('*, pacientes(id, nome, data_nascimento, sexo, cid, motivo_encaminhamento, nivel), avaliador:profiles!avaliacoes_avaliador_id_fkey(nome)')
      .in('id', ids).order('concluido_em', { ascending: false });
    if (!avs || !avs.length) return null;
    const av = avs[0], pac = av.pacientes;
    const inicio = avs.map(a => String(a.iniciado_em || a.concluido_em).slice(0, 10)).sort()[0];
    const [rEnc, rPlano, rSes, rEvo] = await Promise.all([
      sb.from('encaminhamentos').select('medico, sessoes_semanais').eq('paciente_id', pac.id).order('criado_em', { ascending: false }).limit(1),
      sb.from('planos_terapeuticos').select('frequencia_semanal').eq('paciente_id', pac.id).eq('status', 'ativo').limit(1),
      sb.from('sessoes').select('id, data').eq('paciente_id', pac.id).eq('status', 'concluida')
        .gte('data', inicio).lte('data', String(av.concluido_em).slice(0, 10)),
      sb.from('evolucoes').select('texto, criado_em').eq('paciente_id', pac.id)
        .gte('criado_em', new Date(new Date(av.concluido_em).getTime() - 60 * 86400000).toISOString()).lte('criado_em', av.concluido_em)
        .order('criado_em').limit(40)
    ]);
    const protocolos = [];
    for (const a of avs) {
      const { data: rAnt } = await sb.from('avaliacoes').select('id, protocolo, concluido_em').eq('paciente_id', pac.id).eq('protocolo', a.protocolo)
        .eq('status', 'concluida').lt('concluido_em', a.concluido_em).order('concluido_em', { ascending: false }).limit(1);
      const anteriorAv = rAnt && rAnt[0];
      const { data: rS } = await sb.from('sessoes').select('data').eq('paciente_id', pac.id).eq('status', 'concluida')
        .gte('data', String(a.iniciado_em || a.concluido_em).slice(0, 10)).lte('data', String(a.concluido_em).slice(0, 10));
      protocolos.push({ av: a, atual: await this.perfil(a), anteriorAv, anterior: anteriorAv ? await this.perfil(anteriorAv) : null,
        nSessoes: [...new Set((rS || []).map(x => x.data))].length || 1 });
    }
    const p0 = protocolos[0];
    return {
      av, pac, protocolos, completo: protocolos.length > 1,
      atual: p0.atual, anterior: p0.anterior, anteriorAv: p0.anteriorAv, nSessoes: p0.nSessoes,
      medico: rEnc.data && rEnc.data[0] ? rEnc.data[0].medico : null,
      freq: (rPlano.data && rPlano.data[0] && rPlano.data[0].frequencia_semanal) || (rEnc.data && rEnc.data[0] && rEnc.data[0].sessoes_semanais) || null,
      evolucoes: rEvo.data || []
    };
  },

  // captura o documento consolidado de um protocolo (tabelas/graficos) como anexo, sem mostrar a janela
  async capturarAnexo(protocolo, pacienteId) {
    const A = MODULOS.avaliacoes;
    const fn = { qadi: 'docQADI', ss: 'docSS', portage: 'docPortage' }[protocolo];
    if (!A || !A[fn]) return '';
    document.body.classList.add('capturando-doc');
    try {
      await A[fn](pacienteId);
      const ov = document.getElementById('doc-eq-overlay');
      const doc = ov ? ov.querySelector('.doc-eq') : null;
      const html = doc ? doc.outerHTML : '';
      if (ov) ov.remove();
      return html;
    } catch (e) { document.getElementById('doc-eq-overlay')?.remove(); return ''; }
    finally { document.body.classList.remove('capturando-doc'); }
  },

  idadeTxt(dn, ref) {
    const a = new Date(dn + 'T12:00:00'), b = new Date(ref);
    let m = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
    if (b.getDate() < a.getDate()) m--;
    return Math.floor(m / 12) + ' anos e ' + (m % 12) + ' meses';
  },
  primeiraFrase(t) { const m = String(t || '').replace(/Programas aplicados:[^\n]*\n?/i, '').replace(/Motivo dos nao aplicados:[^\n]*/i, '').trim().match(/^[^.!?\n]{15,220}[.!?]?/); return m ? m[0].trim() : ''; },

  // ─────────────── RASCUNHOS ───────────────
  rascunhoDemanda(d) {
    const p = d.pac, primeiro = p.nome.split(' ')[0];
    const sexo = p.sexo === 'F' ? 'Paciente do sexo feminino, com ' : 'Paciente do sexo masculino, com ';
    const enc = p.sexo === 'F' ? 'encaminhada' : 'encaminhado';
    return sexo + this.idadeTxt(p.data_nascimento, d.av.concluido_em) + ', ' + enc + (d.medico ? ' por ' + d.medico : ' pelo m\u00e9dico(a)') +
      ' para avalia\u00e7\u00e3o do desenvolvimento e comportamento infantil e planejamento da interven\u00e7\u00e3o terap\u00eautica fundamentada na An\u00e1lise do Comportamento Aplicada (ABA)' +
      (p.cid ? ', em virtude do diagn\u00f3stico ' + p.cid : '') + (p.motivo_encaminhamento ? ', com foco atual em ' + p.motivo_encaminhamento : '') + '.';
  },
  rascunhoAnalise(d) {
    const primeiro = d.pac.nome.split(' ')[0];
    const frases = d.evolucoes.map(e => this.primeiraFrase(e.texto)).filter(Boolean);
    if (!frases.length) return 'Durante o processo de avalia\u00e7\u00e3o, ' + primeiro + ' ' + (d.pac.sexo === 'F' ? 'foi observada' : 'foi observado') + ' em sess\u00f5es individuais, com registro do v\u00ednculo terap\u00eautico, do engajamento nas atividades, da intera\u00e7\u00e3o com pares e dos comportamentos interferentes.';
    const uniq = [...new Set(frases)].slice(-8);
    return 'Durante o processo de avalia\u00e7\u00e3o, foi poss\u00edvel observar o desenvolvimento de ' + primeiro + ' ao longo das sess\u00f5es realizadas. Registros da equipe no per\u00edodo: ' +
      uniq.map(f => '\u201c' + f + '\u201d').join('; ') + '.\n\nCom base no conjunto de observa\u00e7\u00f5es, ' + primeiro + ' vem apresentando adapta\u00e7\u00e3o \u00e0 rotina terap\u00eautica e fortalecimento do v\u00ednculo com a equipe.';
  },
  rascunhoComparativo(d, pr) {
    pr = pr || d.protocolos[0];
    if (!pr.anterior) return '';
    const antTxt = pr.anterior.areas.map(a => a.pct + '% em ' + a.area.toLowerCase()).join(', ');
    const atuTxt = pr.atual.areas.map(a => a.pct + '%').join(', ');
    const sobe = pr.atual.areas.filter(a => { const b = pr.anterior.areas.find(x => x.area === a.area); return b && a.pct !== null && b.pct !== null && a.pct > b.pct; }).map(a => a.area);
    const desce = pr.atual.areas.filter(a => { const b = pr.anterior.areas.find(x => x.area === a.area); return b && a.pct !== null && b.pct !== null && a.pct < b.pct; }).map(a => a.area);
    return 'Na avalia\u00e7\u00e3o anterior (' + new Date(pr.anteriorAv.concluido_em).toLocaleDateString('pt-BR') + '), ' + d.pac.nome.split(' ')[0] + ' obteve ' + antTxt + '. Na avalia\u00e7\u00e3o atual, os resultados foram, respectivamente, ' + atuTxt + '. ' +
      (sobe.length ? 'Observam-se avan\u00e7os em ' + sobe.join(', ') + '. ' : '') +
      (desce.length ? 'Os percentuais inferiores em ' + desce.join(', ') + ' n\u00e3o devem ser interpretados isoladamente como regress\u00e3o, uma vez que a faixa et\u00e1ria atual contempla habilidades mais complexas e exige maior autonomia, coordena\u00e7\u00e3o, planejamento, generaliza\u00e7\u00e3o e flexibilidade.' : '');
  },
  rascunhoArea(d, a, pr) {
    pr = pr || d.protocolos[0];
    const primeiro = d.pac.nome.split(' ')[0];
    const b = pr.anterior ? pr.anterior.areas.find(x => x.area === a.area) : null;
    if (a.pct === null) return 'Esta \u00e1rea n\u00e3o foi avaliada nesta aplica\u00e7\u00e3o.';
    let t = '';
    if (b && b.pct !== null) t += primeiro + ' obteve ' + a.pct + '% nesta \u00e1rea, em compara\u00e7\u00e3o a ' + b.pct + '% na avalia\u00e7\u00e3o anterior' + (a.pct > b.pct ? ', evidenciando avan\u00e7o. ' : a.pct < b.pct ? '; a diferen\u00e7a deve ser lida \u00e0 luz da mudan\u00e7a da faixa et\u00e1ria de refer\u00eancia. ' : ', mantendo o desempenho. ');
    else t += primeiro + ' obteve ' + a.pct + '% nesta \u00e1rea' + (a.pct >= 90 ? ', atingindo desempenho compat\u00edvel com os marcos esperados para a faixa et\u00e1ria. ' : a.pct >= 70 ? ', com habilidades majoritariamente estabelecidas. ' : ', o que a caracteriza como prioridade de interven\u00e7\u00e3o. ');
    if (a.idade !== undefined) t += ' Idade de desenvolvimento estimada: ' + MODULOS.avaliacoes.fmtIdade(a.idade) + '.';
    // 2o paragrafo: o resultado de cada habilidade avaliada na area
    const lista = arr => arr.join('; ');
    const p2 = [];
    if (a.presentes && a.presentes.length) p2.push('Habilidades presentes: ' + lista(a.presentes) + '.');
    if (a.ausentes && a.ausentes.length) p2.push('Habilidades ainda n\u00e3o observadas, que devem compor as pr\u00f3ximas metas de ensino: ' + lista(a.ausentes) + '.');
    if (!a.presentes && !a.ausentes && a.faltam && a.faltam.length) p2.push('Ainda n\u00e3o apresenta dom\u00ednio de: ' + lista(a.faltam) + '.');
    return (t.trim() + (p2.length ? '\n\n' + p2.join(' ') : '')).trim();
  },
  rascunhoConclusao(d) {
    const primeiro = d.pac.nome.split(' ')[0];
    const ok = d.protocolos.flatMap(pr => pr.atual.areas.filter(a => a.pct !== null)).sort((x, y) => y.pct - x.pct);
    const fortes = ok.filter(a => a.pct >= 80).map(a => a.area), fracas = ok.filter(a => a.pct < 70).map(a => a.area);
    return 'Com base nos dados obtidos, conclui-se que ' + d.pac.nome + ' apresenta ' +
      (fortes.length ? 'desenvolvimento compat\u00edvel com os marcos esperados em ' + fortes.join(', ') : 'habilidades em desenvolvimento nas \u00e1reas avaliadas') +
      (fracas.length ? ', observando-se defasagens mais expressivas em ' + fracas.join(', ') + ', que se configuram como priorit\u00e1rias para a interven\u00e7\u00e3o.' : '.') +
      (d.anterior ? ' Em compara\u00e7\u00e3o \u00e0 avalia\u00e7\u00e3o anterior, ' + primeiro + ' apresentou evolu\u00e7\u00e3o em parte das \u00e1reas avaliadas.' : '');
  },

  // ─────────────── EDITOR ───────────────
  chaveArea(pr, area) { return pr.av.protocolo + '|' + area; },

  async abrirEditor(avaliacaoId) {
    try { await this._abrirEditor(avaliacaoId); }
    catch (e) { this.el().innerHTML = '<div class="cartao"><div class="mensagem-erro visivel">Nao consegui montar o relatorio: ' + escaparHtml(e.message) + '</div></div>'; }
  },

  async _abrirEditor(avaliacaoId) {
    const el = this.el();
    el.innerHTML = '<div class="cartao"><p class="sub">Preparando o relatorio...</p></div>';
    const ids = Array.isArray(avaliacaoId) ? avaliacaoId : [avaliacaoId];
    const d = await this.dados(ids);
    if (!d) { el.innerHTML = '<div class="cartao"><p class="sub">Avaliacao nao encontrada.</p></div>'; return; }
    const tipo = d.completo ? 'completo' : 'protocolo';
    const idsOrd = d.protocolos.map(pr => pr.av.id);

    let { data: rel } = await sb.from('relatorios_avaliacao').select('*').eq('paciente_id', d.pac.id).eq('tipo', tipo)
      .contains('avaliacoes_ids', idsOrd).order('criado_em', { ascending: false }).limit(1).maybeSingle();
    if (rel && (rel.avaliacoes_ids || []).length !== idsOrd.length) rel = null;
    if (!rel && this.podeGerir()) {
      const { data: novo, error } = await sb.from('relatorios_avaliacao')
        .insert({ avaliacao_id: d.av.id, avaliacoes_ids: idsOrd, tipo, paciente_id: d.pac.id, elaborado_por: window.CORTEX_SESSAO.user.id }).select('*').single();
      if (error) { el.innerHTML = '<div class="cartao"><div class="mensagem-erro visivel">' + escaparHtml(error.message) + '</div></div>'; return; }
      rel = novo;
    }
    if (!rel) { el.innerHTML = '<div class="cartao"><p class="sub">Relatorio nao encontrado.</p></div>'; return; }

    const auto = {};
    if (!rel.demanda) auto.demanda = this.rascunhoDemanda(d);
    if (!rel.analise) auto.analise = this.rascunhoAnalise(d);
    if (!rel.comparativo && d.protocolos.some(pr => pr.anterior)) auto.comparativo = d.protocolos.filter(pr => pr.anterior).map(pr => (d.completo ? this.NOME_PROT[pr.av.protocolo] + ': ' : '') + this.rascunhoComparativo(d, pr)).join('\n\n');
    if (!rel.areas || !Object.keys(rel.areas).length) { auto.areas = {}; d.protocolos.forEach(pr => pr.atual.areas.forEach(a => { auto.areas[this.chaveArea(pr, a.area)] = this.rascunhoArea(d, a, pr); })); }
    if (!rel.conclusao) auto.conclusao = this.rascunhoConclusao(d);
    if (!rel.assinatura_nome) { auto.assinatura_nome = this.ASSINATURA_PADRAO.nome; auto.assinatura_titulo = this.ASSINATURA_PADRAO.titulo; }
    if (rel.status === 'rascunho' && Object.keys(auto).length) {
      { const { error: _e } = await sb.from('relatorios_avaliacao').update(auto).eq('id', rel.id); if (_e) popAviso('Nao foi possivel gravar (relatorios_avaliacao): ' + _e.message); }
      Object.assign(rel, auto);
    }
    if (rel.incluir_anexos === null || rel.incluir_anexos === undefined) rel.incluir_anexos = d.completo;
    this._rel = rel; this._d = d;
    // anexos consolidados (tabelas/graficos de cada protocolo), capturados uma vez
    this._anexos = {};
    if (rel.status === 'rascunho') {
      for (const pr of d.protocolos) this._anexos[pr.av.protocolo] = await this.capturarAnexo(pr.av.protocolo, d.pac.id);
    }
    const { data: ass } = await sb.from('profiles').select('nome, perfil').in('perfil', ['direcao', 'coordenador']).eq('ativo', true).order('nome');
    this._assinaturas = [this.ASSINATURA_PADRAO].concat((ass || []).filter(p => p.nome !== this.ASSINATURA_PADRAO.nome)
      .map(p => ({ nome: p.nome, titulo: p.perfil === 'direcao' ? 'Dire\u00e7\u00e3o cl\u00ednica' : 'Coordena\u00e7\u00e3o ABA' })));

    const travado = rel.status !== 'rascunho';
    const editavel = this.podeGerir() && !travado;
    window._docPortal = { paciente_id: d.pac.id, tipo: 'relatorio_avaliacao', titulo: 'Relatorio de Avaliacao' + (d.completo ? ' completo' : '') };
    const campo = (id, rot, valor, linhas) => editavel
      ? '<div class="campo" style="margin-bottom:10px"><label>' + rot + '</label><textarea id="la-' + id + '" rows="' + (linhas || 4) + '" style="resize:vertical" oninput="MODULOS.laudo_avaliacao.salvarAuto()">' + escaparHtml(valor || '') + '</textarea></div>'
      : '<div style="margin-bottom:10px"><b style="font-size:11.5px; text-transform:uppercase; letter-spacing:.04em">' + rot + '</b><p style="font-size:13px; line-height:1.7; white-space:pre-wrap; margin-top:3px">' + escaparHtml(valor || '') + '</p></div>';
    const faltas = [];
    if (!d.pac.cid) faltas.push('CID-11');
    if (!d.medico) faltas.push('m\u00e9dico requisitante (encaminhamento)');
    if (!d.freq) faltas.push('frequ\u00eancia semanal (Plano)');

    el.innerHTML =
      '<div class="pagina-cabecalho nao-imprime">' +
      '  <div><button class="btn-voltar" onclick="MODULOS.pacientes.telaDetalhe(\'' + d.pac.id + '\', \'avaliacao\')">&larr; Prontuario</button>' +
      '    <h2>Relatorio de Avaliacao ' + (d.completo ? 'completo &middot; ' + d.protocolos.map(pr => escaparHtml(this.NOME_PROT[pr.av.protocolo] || pr.av.protocolo)).join(' + ') : '&middot; ' + escaparHtml(this.NOME_PROT[d.av.protocolo] || d.av.protocolo)) + (d.protocolos.some(pr => pr.anterior) ? ' &middot; reavaliacao' : ' &middot; avaliacao inicial') + '</h2>' +
      '    <p class="sub">' + escaparHtml(d.pac.nome) + ' &middot; concluida em ' + new Date(d.av.concluido_em).toLocaleDateString('pt-BR') +
      (editavel ? ' &middot; rascunho salvo automaticamente' : ' &middot; gerado em ' + (rel.gerado_em ? new Date(rel.gerado_em).toLocaleString('pt-BR') : '-') + ' (travado)') + '</p></div>' +
      '  <div style="display:flex; gap:8px; flex-wrap:wrap">' +
      (editavel ? '<button class="btn btn-primario" onclick="MODULOS.laudo_avaliacao.gerarTravar()">&#128274; Gerar e travar</button>' : '') +
      '  <button class="btn btn-fantasma" onclick="MODULOS.laudo_avaliacao.doc()">&#128196; ' + (travado ? 'Documento' : 'Folha / Imprimir') + '</button>' +
      (travado ? pdfAssinadoBtn() : '') + '</div></div>' +
      '<div class="rm-split"><div class="rm-form">' +
      '  <div class="cartao faixa-azul"><h3>Vem do sistema</h3><div class="grade-visao">' +
      d.protocolos.map(pr =>
      '    <div class="caixa-info"><small>' + escaparHtml(this.NOME_PROT[pr.av.protocolo] || pr.av.protocolo) + '</small><b>' + (pr.atual.total === null ? '-' : pr.atual.total + '%') +
      ' <small class="sub">' + new Date(pr.av.concluido_em).toLocaleDateString('pt-BR') + ' &middot; ' + pr.nSessoes + ' sess.' + (pr.anterior ? ' &middot; ant. ' + pr.anterior.total + '%' : '') + '</small></b></div>').join('') + '</div>' +
      '  <label class="check" style="display:flex; gap:6px; align-items:center; font-size:12.5px; margin-top:8px"><input type="checkbox" id="la-anexos"' + (rel.incluir_anexos ? ' checked' : '') + (editavel ? '' : ' disabled') + ' onchange="MODULOS.laudo_avaliacao.salvarAuto()"> Incluir anexos consolidados (tabelas e graficos de cada protocolo)</label>' +
      (faltas.length ? '<div class="mensagem-erro visivel" style="margin-top:8px">Faltam no cadastro: ' + faltas.join(', ') + '. O relatorio sai sem esses dados ate preencher em Editar dados / Plano.</div>' : '') +
      '  <div class="campo" style="margin-top:8px"><label>Assinatura</label><select id="la-ass"' + (editavel ? '' : ' disabled') + ' onchange="MODULOS.laudo_avaliacao.salvarAuto()">' +
      this._assinaturas.map(a => '<option value="' + escaparHtml(a.nome) + '"' + (a.nome === rel.assinatura_nome ? ' selected' : '') + '>' + escaparHtml(a.nome) + ' \u2014 ' + escaparHtml(a.titulo) + '</option>').join('') + '</select></div></div>' +
      '  <div class="cartao">' +
      campo('demanda', 'II. Descricao da demanda', rel.demanda, 3) +
      campo('analise', 'IV. Analise clinica (vinculo, engajamento, pares, comportamentos)', rel.analise, 7) +
      (d.protocolos.some(pr => pr.anterior) ? campo('comparativo', 'Analise comparativa das avaliacoes', rel.comparativo, 5) : '') +
      d.protocolos.map(pr => (d.completo ? '<h4 style="margin:12px 0 6px; color:var(--acao)">' + escaparHtml(this.NOME_PROT[pr.av.protocolo] || pr.av.protocolo) + '</h4>' : '') +
        pr.atual.areas.map(a => campo('area-' + this.chaveArea(pr, a.area).replace(/[^a-z0-9]/gi, '_'), a.area + (a.pct === null ? '' : ' \u2013 ' + a.pct + '%') + ' <small class="sub">(o paragrafo descritivo da area entra sozinho)</small>', (rel.areas || {})[this.chaveArea(pr, a.area)], 3)).join('')).join('') +
      campo('conclusao', 'V. Conclusao <small class="sub">(os dois paragrafos finais entram sozinhos)</small>', rel.conclusao, 4) +
      '  </div></div>' +
      '<div class="rm-previa"><div class="folha-mini" id="la-previa"></div></div></div>';
    this.atualizarPrevia();
  },

  _timer: null,
  colher() {
    const rel = this._rel, d = this._d;
    const v = id => document.getElementById('la-' + id)?.value.trim() || null;
    const areas = {};
    d.protocolos.forEach(pr => pr.atual.areas.forEach(a => { const k = this.chaveArea(pr, a.area); areas[k] = v('area-' + k.replace(/[^a-z0-9]/gi, '_')) || (rel.areas || {})[k] || ''; }));
    const ass = document.getElementById('la-ass');
    const a = ass ? this._assinaturas.find(x => x.nome === ass.value) : null;
    const anx = document.getElementById('la-anexos');
    return { demanda: v('demanda') ?? rel.demanda, analise: v('analise') ?? rel.analise, comparativo: v('comparativo') ?? rel.comparativo,
      areas, conclusao: v('conclusao') ?? rel.conclusao, incluir_anexos: anx ? anx.checked : rel.incluir_anexos,
      assinatura_nome: a ? a.nome : rel.assinatura_nome, assinatura_titulo: a ? a.titulo : rel.assinatura_titulo };
  },
  salvarAuto() {
    clearTimeout(this._timer);
    this._timer = setTimeout(async () => {
      const c = this.colher(); Object.assign(this._rel, c); this.atualizarPrevia();
      if (this._rel.status === 'rascunho') await sb.from('relatorios_avaliacao').update(c).eq('id', this._rel.id);
    }, 500);
  },
  atualizarPrevia() {
    const alvo = document.getElementById('la-previa');
    if (alvo) alvo.innerHTML = this.html(this._rel, this._d);
  },
  async gerarTravar() {
    clearTimeout(this._timer);
    const c = this.colher();
    if (!c.analise || !c.conclusao) { popAviso('Preencha a Analise e a Conclusao antes de gerar.'); return; }
    if (!await popConfirmar('Gerar o relatorio de avaliacao?\n\nDepois de gerado ele fica travado: so impressao e envio ao portal.', { titulo: 'Gerar e travar', ok: 'Gerar e travar' })) return;
    Object.assign(this._rel, c);
    const html = this.html(this._rel, this._d);
    const { error } = await sb.from('relatorios_avaliacao').update(Object.assign({}, c, { html_snapshot: html, status: 'gerado', gerado_em: new Date().toISOString(), gerado_por: window.CORTEX_SESSAO.user.id })).eq('id', this._rel.id);
    if (error) { popAviso('Nao consegui gerar: ' + error.message); return; }
    this.abrirEditor(this._rel.avaliacoes_ids && this._rel.avaliacoes_ids.length ? this._rel.avaliacoes_ids : this._rel.avaliacao_id);
  },

  // ─────────────── FOLHA ───────────────
  html(rel, d) {
    const A = MODULOS.avaliacoes;
    const fmt = x => x ? new Date(x).toLocaleDateString('pt-BR') : '-';
    const txt = v => escaparHtml(v || '').replace(/\n/g, '<br>');
    const dataAss = rel.gerado_em ? new Date(rel.gerado_em) : new Date(d.av.concluido_em);
    const extenso = dataAss.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
    const proc = d.protocolos.map(pr => (this.PROCEDIMENTO[pr.av.protocolo] || '') + this.APLICACAO.replace('{N}', pr.nSessoes)).join('\n\n');
    const blocoProt = pr => {
      const cats = pr.atual.areas.map(a => a.area);
      const series = [];
      if (pr.anterior) series.push({ nome: 'AV anterior (' + fmt(pr.anteriorAv.concluido_em) + ')', cor: '#1468B2', valores: cats.map(c => { const x = pr.anterior.areas.find(a => a.area === c); return x ? x.pct : null; }) });
      series.push({ nome: (pr.anterior ? 'AV atual (' : 'AV1 (') + fmt(pr.av.concluido_em) + ')', cor: pr.anterior ? '#E07A2F' : '#1468B2', valores: pr.atual.areas.map(a => a.pct) });
      const grafico = A && A.gBarras ? A.gBarras(cats, series, { legenda: true }) : '';
      return (d.completo ? '<h2 style="margin-top:10px"><span class="ponto deq-teal"></span>' + escaparHtml(this.NOME_PROT[pr.av.protocolo] || pr.av.protocolo) + ' <small>&middot; ' + fmt(pr.av.concluido_em) + '</small></h2>' : '') +
        '<div class="deq-caixa" style="margin-top:6px">' + grafico + '</div>' +
        pr.atual.areas.map(a =>
          '<div class="deq-caixa deq-texto" style="margin-top:6px"><b>' + escaparHtml(a.area) + (a.pct === null ? '' : ' &ndash; ' + a.pct + '%') + '</b><br>' +
          '<span style="color:var(--eq-cinza)">' + escaparHtml(this.AREA_TEXTO[a.area] || '') + '</span><br>' + txt((rel.areas || {})[this.chaveArea(pr, a.area)]) + '</div>').join('');
    };
    const anexos = rel.incluir_anexos && this._anexos ? d.protocolos.map(pr => this._anexos[pr.av.protocolo] || '').filter(Boolean) : [];
    const sec = (n, t) => '<h2><span class="ponto deq-azul"></span>' + n + ' ' + t + '</h2>';
    return '<div class="doc-eq">' +
      '<div class="deq-cab"><img src="icones/equilibrium.png" alt="Equilibrium">' +
      '  <div class="deq-cab-t"><h1>RELAT&Oacute;RIO &middot; AVALIA&Ccedil;&Atilde;O DO DESENVOLVIMENTO E COMPORTAMENTO INFANTIL</h1><p>Equilibrium Terapia Infantil &middot; Psicoterapia ABA</p></div>' +
      '  <span class="deq-pilula">' + (d.protocolos.some(pr => pr.anterior) ? 'REAVALIA&Ccedil;&Atilde;O' : 'AVALIA&Ccedil;&Atilde;O') + (d.completo ? ' COMPLETA' : '') + '</span></div>' +
      sec('I.', 'Identifica&ccedil;&atilde;o') +
      '<div class="deq-caixa deq-dados" style="grid-template-columns:2fr 1.2fr 1.6fr 1fr 1fr">' +
      '  <div style="border-bottom:none"><small>Nome</small><b>' + escaparHtml(d.pac.nome) + '</b></div>' +
      '  <div style="border-bottom:none"><small>Data de nascimento</small><b>' + fmt(d.pac.data_nascimento + 'T12:00:00') + ' (' + this.idadeTxt(d.pac.data_nascimento, d.av.concluido_em) + ')</b></div>' +
      '  <div style="border-bottom:none"><small>Psic&oacute;logo respons&aacute;vel</small><b>' + escaparHtml(rel.assinatura_nome || this.ASSINATURA_PADRAO.nome) + '</b></div>' +
      '  <div style="border-bottom:none"><small>Especialidade</small><b>Psicoterapia ABA</b></div>' +
      '  <div style="border-bottom:none"><small>Frequ&ecirc;ncia</small><b>' + (d.freq ? escaparHtml(String(d.freq)) + ' sess&otilde;es semanais' : '&mdash;') + '</b></div></div>' +
      sec('II.', 'Descri&ccedil;&atilde;o da demanda') + '<div class="deq-caixa deq-texto">' + txt(rel.demanda) + '</div>' +
      sec('III.', 'Procedimento') + '<div class="deq-caixa deq-texto">' + txt(proc) + '</div>' +
      sec('IV.', 'An&aacute;lise') + '<div class="deq-caixa deq-texto">' + txt(rel.analise) + '</div>' +
      (rel.comparativo ? '<div class="deq-caixa deq-texto" style="margin-top:6px"><b>An&aacute;lise comparativa das avalia&ccedil;&otilde;es:</b><br>' + txt(rel.comparativo) + '</div>' : '') +
      d.protocolos.map(blocoProt).join('') +
      sec('V.', 'Conclus&atilde;o') + '<div class="deq-caixa deq-texto">' + txt(rel.conclusao) + '<br><br>' + txt(this.CONCLUSAO_FIXA) + '</div>' +
      '<div class="deq-local">Uberl&acirc;ndia, ' + extenso + '.</div>' +
      blocoAssinatura(rel.assinatura_nome || this.ASSINATURA_PADRAO.nome, escaparHtml(rel.assinatura_titulo || this.ASSINATURA_PADRAO.titulo)) +
      '<div class="deq-rodape"><span>Equilibrium Terapia Infantil &middot; Uberl&acirc;ndia/MG</span>' +
      '<span class="pontos"><i style="background:var(--eq-teal)"></i><i style="background:var(--eq-amarelo)"></i><i style="background:var(--eq-rosa)"></i><i style="background:var(--eq-azul)"></i></span>' +
      '<span>Documento gerado pelo CORTEX aba &middot; ' + fmt(dataAss) + '</span></div></div>' +
      anexos.map((h, i) => '<div class="deq-quebra"></div><p class="sub" style="text-align:center; font-size:10px; margin:4px 0">ANEXO ' + (i + 1) + ' &middot; documento consolidado do protocolo</p>' + h).join('');
  },

  async doc() {
    const rel = this._rel; if (!rel) return;
    const ov = document.createElement('div');
    ov.id = 'doc-eq-overlay'; ov.className = 'folha-overlay';
    document.body.appendChild(ov);
    const corpo = rel.status !== 'rascunho' && rel.html_snapshot ? rel.html_snapshot : (Object.assign(rel, this.colher()), this.html(rel, this._d));
    window._docPortal = { paciente_id: this._d.pac.id, tipo: 'relatorio_avaliacao', titulo: 'Relatorio de Avaliacao' };
    ov.innerHTML = '<div class="folha-pagina" id="doc-eq-corpo" style="max-width:900px">' +
      '<div class="pagina-cabecalho nao-imprime"><div><button class="btn-voltar" onclick="document.getElementById(\'doc-eq-overlay\').remove()">&larr; Fechar</button>' +
      '<h2>Relatorio de avaliacao &middot; documento oficial ' + (rel.status === 'rascunho' ? '<span class="selo selo-warn">rascunho</span>' : '<span class="selo selo-ok">gerado</span>') + '</h2></div>' +
      '<button class="btn btn-primario" onclick="window.print()">&#128424; Imprimir / PDF</button>' + portalBtn() + '</div>' + corpo + '</div>';
  },

  // botao "Relatorio completo": ultima aplicacao concluida de cada protocolo, unidas
  btnCompleto(concluidas) {
    const porProt = {};
    concluidas.filter(a => ['qadi', 'ss', 'portage'].includes(a.protocolo) && a.origem !== 'importado').forEach(a => {
      if (!porProt[a.protocolo] || String(a.concluido_em) > String(porProt[a.protocolo].concluido_em)) porProt[a.protocolo] = a;
    });
    const ids = Object.values(porProt).map(a => a.id);
    if (ids.length < 2) return '';
    return '<button class="btn btn-primario" onclick="MODULOS.laudo_avaliacao.abrirEditor([' + ids.map(id => "'" + id + "'").join(',') + '])">&#128203; Relat&oacute;rio completo (' + ids.length + ' protocolos)</button>';
  },

  // botao para a aba Avaliacao: ultima aplicacao concluida do protocolo
  btn(concluidas, protocolo) {
    if (perm('avaliacoes.relatorio') === '') return '';
    const lista = concluidas.filter(a => a.protocolo === protocolo)
      .sort((a, b) => String(b.concluido_em || '').localeCompare(String(a.concluido_em || '')));
    if (!lista.length) return '';
    return '<button class="btn-chip" title="Relatorio de avaliacao do desenvolvimento (modelo da clinica)" ' +
      'onclick="MODULOS.laudo_avaliacao.abrirEditor(\'' + lista[0].id + '\')">&#128203; Relat&oacute;rio</button>';
  }
};
