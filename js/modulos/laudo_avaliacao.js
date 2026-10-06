// ============================================================================
// CORTEX aba - js/modulos/laudo_avaliacao.js
// Relatorio de Avaliacao do Desenvolvimento e Comportamento Infantil
// (avaliacao inicial e reavaliacao) no modelo da clinica: identificacao,
// demanda, procedimento (texto fixo por protocolo), analise clinica (rascunho
// dos dados + evolucoes), grafico AV anterior x atual, uma secao por area (texto fixo
// da area + UM paragrafo qualitativo no molde da clinica), conclusao (rascunho + paragrafos fixos).
// Mesma tela do mensal: formulario a esquerda, folha A4 a direita, gerar e travar.
// ============================================================================

window.MODULOS = window.MODULOS || {};

window.MODULOS.laudo_avaliacao = {

  el() { return document.getElementById('pagina'); },
  podeGerir() { return perm('avaliacoes.relatorio') === 'E' || ['direcao', 'coordenador', 'suporte'].includes(window.CORTEX_SESSAO.profile.perfil); },
  ASSINATURA_PADRAO: { nome: 'Wessilon Marques de Sousa', titulo: 'Neuropsic\u00f3logo e Analista do Comportamento \u00b7 CRP 04/53832' },
  NOME_PROT: { qadi: 'Question\u00e1rio estruturado (QUEST)', ss: 'Socially Savvy Checklist', portage: 'Invent\u00e1rio Portage' },

  // \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 TEXTOS FIXOS (paragrafos dos modelos da clinica) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  PROCEDIMENTO: {
    qadi: 'Foi utilizado question\u00e1rio estruturado com base em ferramentas padronizadas de avalia\u00e7\u00e3o do desenvolvimento infantil: VB-MAPP, Invent\u00e1rio Portage, Bayley Scales of Infant and Toddler Development \u2013 Third Edition (Bayley-III) e Vineland Adaptive Behavior Scales \u2013 Second Edition (Vineland-II), e organizado por faixas et\u00e1rias e dom\u00ednios do neurodesenvolvimento: Linguagem Receptiva, Linguagem Expressiva, Cogni\u00e7\u00e3o, Motricidade Grossa, Motricidade Fina e Socializa\u00e7\u00e3o.',
    ss: 'A avalia\u00e7\u00e3o foi realizada em ambiente cl\u00ednico, ao longo de {N} sess\u00f5es de 45 minutos cada, e pautada tanto no protocolo Socially Savvy: An Assessment and Curriculum Guide for Young Children, quanto na observa\u00e7\u00e3o do comportamento da crian\u00e7a, utilizando-se de atividades l\u00fadicas que promovessem intera\u00e7\u00e3o entre os envolvidos.',
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
    'Participacao Conjunta': 'Refere-se \u00e0 habilidade de coordenar a aten\u00e7\u00e3o entre dois parceiros comunicativos sociais em rela\u00e7\u00e3o a um terceiro referencial externo, como um objeto ou atividade, engajando, assim, em uma mesma atividade com o outro, possibilitando o compartilhamento de experi\u00eancias.',
    'Brincadeira Social': 'Refere-se \u00e0 habilidade de engajar em comportamentos de conversa\u00e7\u00e3o e coopera\u00e7\u00e3o com os seus pares e outros de maneira funcional e apropriada para o contexto. \u00c9 uma habilidade avaliada de forma mais complexa, a fim de perceber se a intera\u00e7\u00e3o com o outro sugere ser aversiva e se a crian\u00e7a busca isolamento ao inv\u00e9s de contato social.',
    'Autorregulacao': 'Refere-se \u00e0s habilidades relacionadas \u00e0 demonstra\u00e7\u00e3o de flexibilidade e capacidade de regular as rea\u00e7\u00f5es comportamentais em respostas a mudan\u00e7as inesperadas, cometendo erros ou recebendo corre\u00e7\u00f5es.',
    'Social/Emocional': 'Refere-se \u00e0s habilidades relacionadas a identificar e responder adequadamente a diferentes emo\u00e7\u00f5es em si mesmo e nos outros.',
    'Linguagem Social': 'Refere-se \u00e0 habilidade de escutar, falar, ler e escrever. S\u00e3o quatro habilidades que nos permitem agir socialmente no uso da l\u00edngua. Ou seja, essas s\u00e3o habilidades lingu\u00edsticas que as pessoas desenvolvem ao se relacionarem e comunicarem umas com as outras.',
    'Comportamento de Sala de Aula/Grupo': 'Refere-se \u00e0s habilidades de participar de atividades de grupo, seguir instru\u00e7\u00f5es coletivas, esperar a vez e permanecer nas propostas em contexto compartilhado.',
    'Linguagem Nao-Verbal': 'Refere-se \u00e0s habilidades relacionadas \u00e0 leitura e ao uso da comunica\u00e7\u00e3o n\u00e3o verbal como parte das intera\u00e7\u00f5es sociais.',
    // Portage
    'Socializacao': 'Avalia a forma como a crian\u00e7a se relaciona com adultos e pares: contato visual, resposta \u00e0 intera\u00e7\u00e3o, imita\u00e7\u00e3o, brincadeira compartilhada, express\u00e3o de sentimentos e respeito a regras.',
    'Linguagem': 'Avalia a compreens\u00e3o e a express\u00e3o da linguagem: rea\u00e7\u00e3o a sons, compreens\u00e3o de instru\u00e7\u00f5es, vocaliza\u00e7\u00f5es, nomea\u00e7\u00e3o, frases e relato de eventos.',
    'Cognicao': 'Avalia os processos de aten\u00e7\u00e3o, mem\u00f3ria, associa\u00e7\u00e3o, discrimina\u00e7\u00e3o, reconhecimento de padr\u00f5es e resolu\u00e7\u00e3o de problemas.',
    'Autocuidados': 'Avalia a autonomia em atividades de vida di\u00e1ria: alimenta\u00e7\u00e3o, vestir-se, higiene e uso do banheiro.',
    'Desenvolvimento Motor': 'Avalia as habilidades motoras amplas e finas: equil\u00edbrio, deslocamento, coordena\u00e7\u00e3o, manipula\u00e7\u00e3o de objetos e grafomotricidade.'
  },
  CONCLUSAO_FIXA: 'Diante disso, recomenda-se a continuidade do acompanhamento psicoterap\u00eautico fundamentado na An\u00e1lise do Comportamento Aplicada (ABA), com foco no desenvolvimento das habilidades deficit\u00e1rias.\n\nDestaca-se, ainda, a import\u00e2ncia do envolvimento ativo dos respons\u00e1veis no processo terap\u00eautico, como componente essencial para a efetividade da interven\u00e7\u00e3o e promo\u00e7\u00e3o do desenvolvimento global da crian\u00e7a.',

  // \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 PERFIL POR AREA (qualquer protocolo) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  async perfil(av) {
    const A = MODULOS.avaliacoes;
    if (av.protocolo === 'ss') {
      await A.carregarItensSS();
      const { data: resps } = await sb.from('ss_respostas').select('item_id, pontos').eq('avaliacao_id', av.id);
      const mapa = {}; (resps || []).forEach(r => { mapa[r.item_id] = r.pontos; });
      const areas = A.ssAreasDe(av).map(area => {
        const itens = A.itensSS.filter(i => i.area === area);
        const p = A.ssPontuar(itens, mapa);
        const tx = i => (i.texto || '').toLowerCase().replace(/\.$/, '');
        const n = v => itens.filter(i => mapa[i.id] === v).length;
        return { area, pct: p.pct, niveis: { n3: n(3), n2: n(2), n1: n(1), n0: n(0), tot: n(0) + n(1) + n(2) + n(3) },
          itensPont: itens.filter(i => mapa[i.id] !== undefined && mapa[i.id] >= 0).map(i => ({ texto: i.texto || '', p: mapa[i.id] })),
          presentes: itens.filter(i => (mapa[i.id] || 0) >= 2).map(tx),
          fortes: itens.filter(i => mapa[i.id] === 3).map(tx), medios: itens.filter(i => mapa[i.id] === 2).map(tx),
          ausentes: itens.filter(i => mapa[i.id] !== undefined && mapa[i.id] >= 0 && mapa[i.id] <= 1).map(tx) };
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
      const porFaixa = (lista, desc) => lista.slice().sort((x, y) => (desc ? (y.faixa || 0) - (x.faixa || 0) : (x.faixa || 0) - (y.faixa || 0)) || (x.ordem || 0) - (y.ordem || 0));
      const areas = calc.map(a => ({ area: a.area, pct: a.total === null ? null : a.total, idade: a.idade,
        presentes: porFaixa(A.itensPortage.filter(i => i.area === a.area && mapa[i.id] === 'S'), true).map(tx),
        medios: porFaixa(A.itensPortage.filter(i => i.area === a.area && mapa[i.id] === 'AV')).map(tx),
        ausentes: porFaixa(A.itensPortage.filter(i => i.area === a.area && mapa[i.id] === 'N')).map(tx) }));
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
      const fx = q => A.FAIXAS.indexOf(q.faixa), ord = q => q.ordem || 0;
      const presentes = qs.filter(q => mapa[q.id] === 'S').sort((x, y) => fx(y) - fx(x) || ord(x) - ord(y)).map(tx).filter(Boolean);   // as mais avancadas primeiro
      const ausentes = qs.filter(q => mapa[q.id] === 'N').sort((x, y) => fx(x) - fx(y) || ord(x) - ord(y)).map(tx).filter(Boolean);    // as mais basicas primeiro (proximas metas)
      return { area, adq, esp: qs.length, pct: qs.length ? Math.round(adq * 100 / qs.length) : null, faltam: ausentes.slice(0, 3), presentes, ausentes };
    });
    const tAdq = areas.reduce((s, x) => s + x.adq, 0), tEsp = areas.reduce((s, x) => s + x.esp, 0);
    return { areas, total: tEsp ? Math.round(tAdq * 100 / tEsp) : null, faixas };
  },

  // \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 DADOS (um ou varios protocolos) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
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
    // Anamnese respondida pela familia: respostas em texto das secoes "Sobre a crianca" e "Comportamento" viram as queixas da demanda
    let queixas = [];
    try {
      const { data: an } = await sb.from('anamneses').select('id').eq('paciente_id', pac.id).order('criado_em', { ascending: false }).limit(1);
      if (an && an[0]) {
        const [rQ, rR] = await Promise.all([
          sb.from('anamnese_questoes').select('id, pergunta, tipo, secao, ordem').in('tipo', ['texto', 'texto_longo']).order('ordem'),
          sb.from('anamnese_respostas').select('questao_id, resposta').eq('anamnese_id', an[0].id)
        ]);
        const resp = {}; (rR.data || []).forEach(r => { resp[r.questao_id] = r.resposta; });
        const chave = /queixa|preocup|dificul|motivo|comport|desafio|problema|incomod|birra|agress|frustra|comunica|fala|intera|social|rotina|sono|alimenta/i;
        queixas = (rQ.data || []).filter(q => ['GERAL', 'ABA'].includes(q.secao) && chave.test(q.pergunta || '') && (resp[q.id] || '').trim().length >= 8)
          .map(q => ({ pergunta: q.pergunta, resposta: String(resp[q.id]).trim() }));
      }
    } catch (e) { queixas = []; }
    const protocolos = [];
    for (const a of avs) {
      const { data: rAnt } = await sb.from('avaliacoes').select('id, protocolo, concluido_em, areas_excluidas').eq('paciente_id', pac.id).eq('protocolo', a.protocolo)
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
      evolucoes: rEvo.data || [],
      queixas
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

  // \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 RASCUNHOS \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  // CID-11 / CID-10 mais comuns na clinica -> nome por extenso
  CID_NOME: {
    '6A02': 'Transtorno do Espectro Autista (TEA)', 'F84': 'Transtorno do Espectro Autista (TEA)', 'F84.0': 'Transtorno do Espectro Autista (TEA)', 'F84.5': 'S\u00edndrome de Asperger (TEA)',
    '6A05': 'Transtorno do D\u00e9ficit de Aten\u00e7\u00e3o e Hiperatividade (TDAH)', 'F90': 'Transtorno do D\u00e9ficit de Aten\u00e7\u00e3o e Hiperatividade (TDAH)', 'F90.0': 'Transtorno do D\u00e9ficit de Aten\u00e7\u00e3o e Hiperatividade (TDAH)',
    '6A00': 'Transtorno do Desenvolvimento Intelectual', 'F70': 'Defici\u00eancia Intelectual', 'F71': 'Defici\u00eancia Intelectual',
    '6A01': 'Transtorno do Desenvolvimento da Fala ou da Linguagem', 'F80': 'Transtorno do Desenvolvimento da Fala ou da Linguagem',
    '6A03': 'Transtorno do Desenvolvimento da Aprendizagem', 'F81': 'Transtorno do Desenvolvimento da Aprendizagem',
    '6A04': 'Transtorno do Desenvolvimento da Coordena\u00e7\u00e3o Motora', 'F82': 'Transtorno do Desenvolvimento da Coordena\u00e7\u00e3o Motora',
    '6A06': 'Transtorno de Movimentos Estereotipados', 'R62': 'Atraso do Desenvolvimento', 'R62.0': 'Atraso do Desenvolvimento', 'F88': 'Atraso Global do Desenvolvimento',
    'Q90': 'S\u00edndrome de Down', 'LD40': 'S\u00edndrome de Down', '6C51': 'Transtorno de Oposi\u00e7\u00e3o Desafiante', 'F91.3': 'Transtorno de Oposi\u00e7\u00e3o Desafiante'
  },
  diagnosticoTxt(cid) {
    if (!cid) return '';
    const cods = String(cid).split(/[,;\/]+| e /).map(c => c.trim()).filter(Boolean);
    const nomes = cods.map(c => { const k = c.toUpperCase().replace(/\s/g, ''); const n = this.CID_NOME[k] || this.CID_NOME[k.split('.')[0]] || this.CID_NOME[k.slice(0, 4)]; return n ? n + ' (CID ' + c + ')' : 'CID ' + c; });
    return nomes.join(' e ');
  },
  rascunhoDemanda(d) {
    const p = d.pac, primeiro = p.nome.split(' ')[0];
    const ela = p.sexo === 'F';
    const sexo = ela ? 'Paciente do sexo feminino, com ' : 'Paciente do sexo masculino, com ';
    const enc = ela ? 'encaminhada' : 'encaminhado';
    const diag = this.diagnosticoTxt(p.cid);
    let t = sexo + this.idadeTxt(p.data_nascimento, d.av.concluido_em) + ', ' + enc + (d.medico ? ' por ' + d.medico : ' pelo m\u00e9dico(a)') +
      ' para avalia\u00e7\u00e3o do desenvolvimento e comportamento infantil e planejamento da interven\u00e7\u00e3o terap\u00eautica fundamentada na An\u00e1lise do Comportamento Aplicada (ABA)' +
      (diag ? ', em virtude do diagn\u00f3stico de ' + diag : '') + (p.motivo_encaminhamento ? ', com foco em ' + p.motivo_encaminhamento : '') + '.';
    // queixas dos pais (anamnese)
    const q = (d.queixas || []).slice(0, 4).map(x => this.limparFrase(x.resposta, primeiro)).filter(Boolean);
    if (q.length) {
      t += '\n\nNa anamnese, os respons\u00e1veis relataram como principais queixas: ' +
        q.map((x, i) => (i === q.length - 1 && q.length > 1 ? 'e ' : '') + x.replace(/\.$/, '')).join(q.length > 2 ? '; ' : ' ') + '.';
    } else if (!p.motivo_encaminhamento) {
      t += '\n\nAs principais queixas relatadas pela fam\u00edlia envolvem [descrever, conforme a anamnese].';
    }
    return t;
  },
  // normaliza uma frase de registro para entrar em texto corrido: sem "hoje", sem data, minuscula no inicio (menos nome proprio), sem ponto final duplicado
  limparFrase(f, nome) {
    let t = String(f || '').replace(/\s+/g, ' ').trim();
    t = t.replace(/^(hoje|na sess\u00e3o de hoje|na sessao de hoje|nesta sess\u00e3o|nesta sessao|no atendimento de hoje|neste atendimento|na sess\u00e3o|na sessao|no dia \d{1,2}\/\d{1,2}(\/\d{2,4})?|\d{1,2}\/\d{1,2}(\/\d{2,4})?)[,:\s-]+/i, '');
    t = t.replace(/^(o|a) paciente /i, nome ? nome + ' ' : '').replace(/^(o|a) (crian\u00e7a|crianca) /i, nome ? nome + ' ' : '');
    if (nome) t = t.replace(new RegExp('^(o|a) ' + nome + '\\b', 'i'), nome);
    if (!t) return '';
    if (!(nome && t.startsWith(nome))) t = t.charAt(0).toLowerCase() + t.slice(1);
    return t.replace(/[.;,\s]+$/, '');
  },
  // Analise: texto corrido, analitico e observacional, montado a partir das evolucoes do periodo (sem citar que e um compilado)
  TEMAS_ANALISE: [
    ['regulacao', /chor|birra|frustr|recus|negou|gritou|agress|bateu|jogou|fugiu|resist|dificuldade|n\u00e3o aceitou|nao aceitou|irritad|nervos|ansios|estereotip|auto-?les|desregul|se jogou|mordeu|cuspiu/i],
    ['social', /pares|colega|outra crian|outro paciente|outras crian|dividiu|revez|esperou a vez|grupo|dupla|amig|cumpriment|compartilh/i],
    ['transicoes', /transi|combinado|regra|esperar|aguard|cron[o\u00f4]metro|aceitou o n[a\u00e3]o|encerrar|finaliz|trocar de atividade|rotina|timer/i],
    ['comunicacao', /pediu|falou|verbaliz|nomeou|palavra|frase|comunic|pecs|apontou|respondeu|conversou|mand|ecoic|tato\b|intraverbal/i],
    ['adaptacao', /adapt|tranquil|chegou bem|entrou bem|engaj|particip|colabor|v[i\u00ed]nculo|feliz|animad|sorri|acolh|receptiv|disposi/i],
    ['interesses', /gost|brincou de|escolheu|interess|prefer|jogo|desenh|massinha|slime|carrinho|bola|quebra|livro|m\u00fasica|musica|pintur|bloco|constru/i]
  ],
  frasesEvolucoes(d) {
    const nome = d.pac.nome.split(' ')[0];
    const out = [];
    (d.evolucoes || []).slice(-25).forEach(e => {
      const txt = String(e.texto || '').replace(/Programas aplicados:[^\n]*\n?/ig, '').replace(/Motivo dos nao aplicados:[^\n]*/ig, '').replace(/Destina[^\n]*:[^\n]*/ig, '');
      txt.split(/(?<=[.!?])\s+|\n+/).map(f => f.trim()).filter(f => f.length >= 25 && f.length <= 230 && !/^(programas?|tentativas?|estimul|n[i\u00ed]vel|obs\.?:)/i.test(f))
        .forEach(f => { const l = this.limparFrase(f, nome); if (l && !out.some(o => o.frase === l)) out.push({ frase: l, tema: /sem resist|tranquil|sem dificuldade|sem chor|sem birra|calm[oa]\b/i.test(f) ? 'adaptacao' : (this.TEMAS_ANALISE.find(([t, re]) => re.test(f)) || ['outro'])[0] }); });
    });
    return out;
  },
  // \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 REDACAO (molde dos relatorios da clinica: Alice = QUEST/Portage, Joao Vitor = Socially Savvy) \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
  // Regras: por area sai UM paragrafo qualitativo (o % ja esta no titulo); QUEST/Portage cita as habilidades em frase corrida
  // (infinitivo); Socially Savvy descreve por temas, sem transcrever os itens; a Analise e a Conclusao nascem dos dados da
  // propria avaliacao (areas que subiram, maiores preocupacoes, habilidades presentes/ausentes) + o que a equipe registrou.

  junta(arr) { arr = (arr || []).filter(Boolean); return arr.length <= 1 ? (arr[0] || '') : arr.length === 2 ? arr[0] + ' e ' + arr[1] : arr.slice(0, -1).join(', ') + ' e ' + arr[arr.length - 1]; },
  cap(s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); },

  // areas de todos os protocolos do relatorio, com o % anterior e a diferenca quando e reavaliacao
  areasRel(d) {
    const out = [];
    d.protocolos.forEach(pr => pr.atual.areas.filter(a => a.pct !== null).forEach(a => {
      const b = pr.anterior ? pr.anterior.areas.find(x => x.area === a.area) : null;
      const ant = b && b.pct !== null ? b.pct : null;
      out.push({ pr, a, nome: this.nomeAreaDoc(a.area), pct: a.pct, ant, delta: ant === null ? null : a.pct - ant });
    }));
    return out;
  },
  // habilidades presentes / ausentes de uma area em frase corrida (QUEST e Portage: itens no infinitivo; SS: temas)
  capacidades(pr, a, n, b) {
    if (pr.av.protocolo === 'ss') return this.junta(this.temasSS(a).fortes.slice(0, n || 3));
    // reavaliacao: o que era ausente e passou a presente vem primeiro (ganho concreto)
    if (b && b.ausentes && b.ausentes.length) {
      const norm = x => this.limparItem(x);
      const antes = new Set(b.ausentes.map(norm));
      const novas = (a.presentes || []).filter(x => antes.has(norm(x)));
      if (novas.length) return this.listaHab(novas.concat((a.presentes || []).filter(x => !antes.has(norm(x)))), n || 3);
    }
    return this.listaHab(a.presentes, n || 3);
  },
  dificuldades(pr, a, n) {
    if (pr.av.protocolo === 'ss') return this.junta(this.temasSS(a).fracos.slice(0, n || 2));
    return this.listaHab(a.ausentes, n || 3);
  },

  // \u2500\u2500\u2500 IV. Analise: narrativa clinica a partir dos dados (e das evolucoes do periodo, quando houver)
  rascunhoAnalise(d) {
    const primeiro = d.pac.nome.split(' ')[0];
    const ela = d.pac.sexo === 'F';
    const S = ela ? 'ela' : 'ele';
    const junta = arr => this.junta(arr), cap = s => this.cap(s);
    const areas = this.areasRel(d);
    if (!areas.length) return '';
    const reav = areas.some(x => x.ant !== null);
    const porPct = areas.slice().sort((x, y) => y.pct - x.pct);
    const fortes = porPct.filter(x => x.pct >= 70);
    const fracas = porPct.slice().reverse().filter(x => x.pct < 60);
    const frases = this.frasesEvolucoes(d);
    const semNome = f => f.replace(new RegExp('^' + primeiro + '\\s+'), '');
    const por = t => frases.filter(f => f.tema === t).slice(-2).map(f => f.frase.replace(new RegExp('^' + primeiro + '\\b'), S));
    const ad = frases.filter(f => f.tema === 'adaptacao').slice(-2).map(f => semNome(f.frase));
    const soc = por('social'), reg = por('regulacao'), tra = por('transicoes');
    const P = [];
    this._preocNome = null;
    const antArea = x => x.pr.anterior ? x.pr.anterior.areas.find(y => y.area === x.a.area) : null;
    if (reav) {
      const ganhos = areas.filter(x => x.delta !== null && x.delta >= 10).sort((x, y) => y.delta - x.delta);
      const preoc0 = areas.filter(x => x.ant !== null).sort((x, y) => x.ant - y.ant)[0];
      // a area de maior preocupacao tem paragrafo proprio: as capacidades do 1o paragrafo vem de outra area
      const top = ganhos.find(x => !preoc0 || x.nome !== preoc0.nome) || (ganhos.length ? null : porPct.find(x => !preoc0 || x.nome !== preoc0.nome)) || ganhos[0] || porPct[0];
      const caps = top && (!preoc0 || top.nome !== preoc0.nome) ? this.capacidades(top.pr, top.a, 3, antArea(top)) : '';
      P.push('Durante o processo de reavalia\u00e7\u00e3o, foi poss\u00edvel observar que ' + primeiro +
        (ganhos.length
          ? ' apresentou ' + (ganhos.length > 1 ? 'diversas evolu\u00e7\u00f5es' : 'evolu\u00e7\u00e3o') + ', com \u00eanfase principal nas habilidades de ' + junta(ganhos.slice(0, 3).map(x => x.nome))
          : ' manteve o repert\u00f3rio constru\u00eddo no per\u00edodo anterior, com desempenho mais est\u00e1vel em ' + junta(porPct.slice(0, 2).map(x => x.nome))) +
        (caps ? ', demonstrando capacidade de ' + caps : '') + '.' +
        (ad.length ? ' ' + cap(S) + ' ' + junta(ad) + '.' : ''));
      const preoc = preoc0;
      if (preoc) {
        const capsP = this.capacidades(preoc.pr, preoc.a, 3, antArea(preoc));
        const difs = this.dificuldades(preoc.pr, preoc.a, 2);
        const evol = preoc.delta >= 15 ? 'forte' : preoc.delta >= 5 ? 'gradual' : 'nenhuma';
        P.push('A \u00e1rea de ' + preoc.nome + ' era uma das maiores preocupa\u00e7\u00f5es na avalia\u00e7\u00e3o anterior (' + preoc.ant + '%). Com base nos dados da avalia\u00e7\u00e3o atual, ' +
          (evol === 'forte' ? 'nota-se que ' + primeiro + ' apresenta evolu\u00e7\u00e3o significativa nesta habilidade' + (capsP ? ', demonstrando capacidade de ' + capsP : '') + (difs ? ', embora habilidades como ' + difs + ' ainda demandem estimula\u00e7\u00e3o direcionada' : '')
            : evol === 'gradual' ? 'nota-se evolu\u00e7\u00e3o gradual nesta habilidade' + (capsP ? ', com capacidade de ' + capsP : '') + (difs ? ', embora habilidades como ' + difs + ' ainda demandem estimula\u00e7\u00e3o direcionada' : '')
            : 'o quadro se mant\u00e9m semelhante: ' + primeiro + (capsP ? ' demonstra capacidade de ' + capsP : ' mant\u00e9m o repert\u00f3rio j\u00e1 observado') + (difs ? ', mas habilidades como ' + difs + ' ainda demandam estimula\u00e7\u00e3o direcionada' : '')) + '.');
        this._preocNome = preoc.nome;
      }
    } else {
      const top = porPct[0];
      const caps = this.capacidades(top.pr, top.a, 3);
      P.push('Durante o processo de avalia\u00e7\u00e3o, ' + primeiro +
        (ad.length ? ' ' + junta(ad) + '.' : ' foi ' + (ela ? 'observada' : 'observado') + ' em sess\u00f5es individuais, em atividades l\u00fadicas e estruturadas, com aten\u00e7\u00e3o ao v\u00ednculo com a terapeuta, ao engajamento nas propostas e \u00e0 forma como responde \u00e0s demandas do ambiente.') +
        ' ' + (fortes.length ? 'O melhor desempenho foi observado em ' + junta(fortes.slice(0, 2).map(x => x.nome)) : 'O desempenho mais consistente foi observado em ' + top.nome) +
        (caps ? ', com boa capacidade para ' + caps : '') + '.');
    }
    if (soc.length) P.push(primeiro + ' tamb\u00e9m foi ' + (ela ? 'inserida' : 'inserido') + ' em contextos de intera\u00e7\u00e3o com outros pacientes: ' + junta(soc) + '.');
    const manejo = reg.length ? ' Nos momentos de maior exig\u00eancia, ' + junta(reg) + '; esses epis\u00f3dios t\u00eam sido manejados pela equipe com antecipa\u00e7\u00e3o, acolhimento e refor\u00e7o positivo.' : '';
    const restantes = fracas.filter(x => x.nome !== this._preocNome);   // a area ja discutida acima nao repete
    this._preocNome = null;
    if (restantes.length) {
      const baixa = restantes[0];
      const difs = this.dificuldades(baixa.pr, baixa.a, 3);
      P.push('Por outro lado, as maiores dificuldades concentram-se em ' + junta(restantes.slice(0, 2).map(x => x.nome)) +
        (difs ? ', em que ainda n\u00e3o foram observadas habilidades como ' + difs : '') + ', que passam a compor as metas priorit\u00e1rias da interven\u00e7\u00e3o.' +
        manejo + (tra.length ? ' ' + cap(junta(tra)) + '.' : ''));
    } else if (manejo) P.push(manejo.trim());
    const total = Math.round(areas.reduce((s, x) => s + x.pct, 0) / areas.length);
    P.push('De modo geral, a observa\u00e7\u00e3o cl\u00ednica aponta para uma crian\u00e7a com ' +
      (total >= 70 ? 'repert\u00f3rio amplo e bem estabelecido na maior parte das \u00e1reas avaliadas'
        : total >= 40 ? 'repert\u00f3rio em constru\u00e7\u00e3o, que avan\u00e7a de forma consistente quando o ambiente \u00e9 estruturado e as expectativas s\u00e3o claras'
        : 'repert\u00f3rio inicial, que demanda alta estrutura\u00e7\u00e3o e apoio do adulto para sustentar as respostas esperadas') +
      (fracas.length ? ', sendo ' + fracas[0].nome + ' o principal foco de estimula\u00e7\u00e3o no pr\u00f3ximo per\u00edodo.' : '.'));
    return P.join('\n\n');
  },
  rascunhoComparativo(d, pr) {
    pr = pr || d.protocolos[0];
    if (!pr.anterior) return '';
    const antTxt = pr.anterior.areas.map(a => a.pct + '% em ' + a.area.toLowerCase()).join(', ');
    const atuTxt = pr.atual.areas.map(a => a.pct + '%').join(', ');
    const dif = a => { const b = pr.anterior.areas.find(x => x.area === a.area); return b && a.pct !== null && b.pct !== null ? a.pct - b.pct : null; };
    const nome = a => this.nomeAreaDoc(a.area);
    const sobe = pr.atual.areas.filter(a => dif(a) !== null && dif(a) >= 5).sort((x, y) => dif(y) - dif(x)).map(nome);
    const estavel = pr.atual.areas.filter(a => dif(a) !== null && Math.abs(dif(a)) < 5).map(nome);
    const desce = pr.atual.areas.filter(a => dif(a) !== null && dif(a) <= -5).map(nome);
    return 'Na avalia\u00e7\u00e3o anterior (' + new Date(pr.anteriorAv.concluido_em).toLocaleDateString('pt-BR') + '), ' + d.pac.nome.split(' ')[0] + ' obteve ' + antTxt + '. Na avalia\u00e7\u00e3o atual, os resultados foram, respectivamente, ' + atuTxt + '. ' +
      (sobe.length ? 'Observam-se avan\u00e7os em ' + this.junta(sobe) + (estavel.length ? ', com manuten\u00e7\u00e3o do desempenho em ' + this.junta(estavel) : '') + '. ' : (estavel.length ? 'O desempenho se manteve est\u00e1vel em ' + this.junta(estavel) + '. ' : '')) +
      (desce.length ? 'Os percentuais inferiores em ' + this.junta(desce) + ' n\u00e3o devem ser interpretados isoladamente como regress\u00e3o, uma vez que a faixa et\u00e1ria atual contempla habilidades mais complexas e exige maior autonomia, coordena\u00e7\u00e3o, planejamento, generaliza\u00e7\u00e3o e flexibilidade.' : '');
  },
  // \u2500\u2500\u2500 Paragrafo de cada area (um so; o % fica no titulo)
  rascunhoArea(d, a, pr) {
    pr = pr || d.protocolos[0];
    const primeiro = d.pac.nome.split(' ')[0];
    const ela = d.pac.sexo === 'F';
    if (a.pct === null) return 'Esta \u00e1rea n\u00e3o foi avaliada nesta aplica\u00e7\u00e3o.';
    const b = pr.anterior ? pr.anterior.areas.find(x => x.area === a.area) : null;
    let t = pr.av.protocolo === 'ss' ? this.paragrafoSS(a, ela, primeiro, b) : this.paragrafoMarcos(a, ela, primeiro);
    if (a.idade !== undefined && t) t += ' A idade de desenvolvimento estimada nesta \u00e1rea \u00e9 de ' + MODULOS.avaliacoes.fmtIdade(a.idade) + '.';
    return t.trim();
  },
  // Socially Savvy: descricao qualitativa por area (0 = nao possui, 1 = poucas vezes, 2 = tem mas inconsistente, 3 = consistente),
  // no tom dos relatorios da clinica e sem transcrever os itens do protocolo.
  SS_DESC: {
    'Participacao Conjunta': {
      forte: 'responde de forma consistente \u00e0s tentativas de intera\u00e7\u00e3o, orienta-se para o parceiro, acompanha o que lhe \u00e9 mostrado ou apontado e compartilha o interesse por objetos e eventos, alternando o olhar entre a pessoa e o item de interesse',
      parcial: 'respostas de orienta\u00e7\u00e3o ao outro e de acompanhamento do olhar e do apontar',
      foco: 'a iniciativa de compartilhar interesses (mostrar, apontar e comentar) e a manuten\u00e7\u00e3o do engajamento em atividades conjuntas por per\u00edodos mais longos' },
    'Brincadeira Social': {
      forte: 'brinca junto com os pares, aceita a entrada do outro na brincadeira, reveza materiais e turnos e sustenta jogos com regras e faz de conta de forma colaborativa',
      parcial: 'brincadeira ao lado dos pares e trocas breves de materiais',
      foco: 'o revezamento, a brincadeira cooperativa com regras e o faz de conta compartilhado com outras crian\u00e7as' },
    'Autorregulacao': {
      forte: 'tolera esperas e negativas, aceita transi\u00e7\u00f5es e mudan\u00e7as de rotina, segue combinados e utiliza estrat\u00e9gias adequadas para se acalmar e pedir ajuda diante de dificuldades',
      parcial: 'aceita\u00e7\u00e3o de combinados e de transi\u00e7\u00f5es quando antecipadas pelo adulto',
      foco: 'a toler\u00e2ncia \u00e0 frustra\u00e7\u00e3o diante de erros, perdas e da impossibilidade de acesso imediato ao que deseja, al\u00e9m da flexibilidade frente a mudan\u00e7as n\u00e3o antecipadas' },
    'Social/Emocional': {
      forte: 'reconhece e nomeia emo\u00e7\u00f5es em si e nos outros, expressa o que sente de forma adequada ao contexto e responde com empatia \u00e0s emo\u00e7\u00f5es das pessoas ao redor',
      parcial: 'identifica\u00e7\u00e3o de emo\u00e7\u00f5es b\u00e1sicas e resposta ao afeto do outro',
      foco: 'o reconhecimento e a nomea\u00e7\u00e3o das pr\u00f3prias emo\u00e7\u00f5es, a express\u00e3o adequada de sentimentos e a resposta emp\u00e1tica ao outro' },
    'Linguagem Social': {
      forte: 'cumprimenta, inicia e mant\u00e9m conversas, responde a perguntas, comenta e se mant\u00e9m no t\u00f3pico, adequando a comunica\u00e7\u00e3o ao interlocutor e ao contexto',
      parcial: 'respostas a cumprimentos e a perguntas diretas',
      foco: 'a iniciativa de conversar, a manuten\u00e7\u00e3o do t\u00f3pico por mais trocas e a espontaneidade da comunica\u00e7\u00e3o em diferentes contextos' },
    'Comportamento de Sala de Aula/Grupo': {
      forte: 'acompanha instru\u00e7\u00f5es dirigidas ao grupo, aguarda a vez, permanece na atividade pelo tempo esperado e participa de propostas coletivas, realizando transi\u00e7\u00f5es com autonomia',
      parcial: 'perman\u00eancia em atividades de grupo e resposta a instru\u00e7\u00f5es coletivas com apoio',
      foco: 'a aten\u00e7\u00e3o a instru\u00e7\u00f5es dirigidas ao grupo, a espera pela vez e a participa\u00e7\u00e3o sustentada em atividades coletivas' },
    'Linguagem Nao-Verbal': {
      forte: 'utiliza gestos, express\u00f5es faciais, orienta\u00e7\u00e3o corporal e tom de voz de forma coerente com o que comunica, e compreende os sinais n\u00e3o verbais dos outros',
      parcial: 'uso de gestos e express\u00f5es faciais em situa\u00e7\u00f5es familiares',
      foco: 'o uso e a leitura de sinais n\u00e3o verbais (gestos, express\u00f5es, dist\u00e2ncia e tom de voz) nas intera\u00e7\u00f5es' }
  },
  // nome da area como sai no documento (com acentos, no padrao dos relatorios antigos)
  AREA_DOC: { 'Participacao Conjunta': 'Aten\u00e7\u00e3o Compartilhada', 'Autorregulacao': 'Autorregula\u00e7\u00e3o', 'Linguagem Nao-Verbal': 'Linguagem Social N\u00e3o-Verbal',
    'Socializacao': 'Socializa\u00e7\u00e3o', 'Cognicao': 'Cogni\u00e7\u00e3o', 'Cogni\u00e7\u00e3o': 'Cogni\u00e7\u00e3o' },
  nomeAreaDoc(area) { return this.AREA_DOC[area] || area; },
  // \u2500\u2500 habilidade no infinitivo: "Responde ao nome?" -> "responder ao nome"
  VERBOS_INF: { faz: 'fazer', diz: 'dizer', traz: 'trazer', produz: 'produzir', conduz: 'conduzir', reduz: 'reduzir', sobe: 'subir', pede: 'pedir', mede: 'medir',
    segue: 'seguir', consegue: 'conseguir', persegue: 'perseguir', ouve: 'ouvir', dorme: 'dormir', veste: 'vestir', despe: 'despir', abre: 'abrir', cobre: 'cobrir', descobre: 'descobrir',
    sente: 'sentir', prefere: 'preferir', repete: 'repetir', compete: 'competir', permite: 'permitir', cumpre: 'cumprir', diverte: 'divertir', serve: 'servir', sorri: 'sorrir',
    reflete: 'refletir', sugere: 'sugerir', refere: 'referir', transfere: 'transferir', confere: 'conferir', adere: 'aderir', interfere: 'interferir', mente: 'mentir', consente: 'consentir',
    dirige: 'dirigir', corrige: 'corrigir', exige: 'exigir', reage: 'reagir', age: 'agir', interage: 'interagir', finge: 'fingir', atinge: 'atingir', restringe: 'restringir', surge: 'surgir', emerge: 'emergir', diverge: 'divergir', insiste: 'insistir', desiste: 'desistir', assiste: 'assistir', resiste: 'resistir', persiste: 'persistir', existe: 'existir',
    divide: 'dividir', decide: 'decidir', coincide: 'coincidir', discute: 'discutir', reparte: 'repartir', parte: 'partir', invade: 'invadir', agride: 'agredir', impede: 'impedir', despede: 'despedir',
    tem: 'ter', mant\u00e9m: 'manter', cont\u00e9m: 'conter', obt\u00e9m: 'obter', det\u00e9m: 'deter', ret\u00e9m: 'reter', entret\u00e9m: 'entreter', vem: 'vir', vai: 'ir', \u00e9: 'ser', est\u00e1: 'estar', d\u00e1: 'dar', p\u00f5e: 'p\u00f4r', comp\u00f5e: 'compor', prop\u00f5e: 'propor', disp\u00f5e: 'dispor', l\u00ea: 'ler', v\u00ea: 'ver', sabe: 'saber', pode: 'poder', quer: 'querer', constr\u00f3i: 'construir', destr\u00f3i: 'destruir',
    cai: 'cair', sai: 'sair', atrai: 'atrair', distrai: 'distrair', possui: 'possuir', atribui: 'atribuir', contribui: 'contribuir', substitui: 'substituir', inclui: 'incluir', exclui: 'excluir', conclui: 'concluir', distingue: 'distinguir', extingue: 'extinguir',
    nomeia: 'nomear', passeia: 'passear', chateia: 'chatear', bloqueia: 'bloquear', manuseia: 'manusear', odeia: 'odiar', anseia: 'ansiar', incendeia: 'incendiar', remedeia: 'remediar', penteia: 'pentear', folheia: 'folhear', delineia: 'delinear',
    joga: 'jogar', chega: 'chegar', pega: 'pegar', entrega: 'entregar', carrega: 'carregar', brinca: 'brincar', busca: 'buscar', fica: 'ficar', indica: 'indicar', explica: 'explicar', comunica: 'comunicar', come\u00e7a: 'come\u00e7ar', abra\u00e7a: 'abra\u00e7ar', alcan\u00e7a: 'alcan\u00e7ar', avan\u00e7a: 'avan\u00e7ar', dan\u00e7a: 'dan\u00e7ar', tra\u00e7a: 'tra\u00e7ar', la\u00e7a: 'la\u00e7ar', cal\u00e7a: 'cal\u00e7ar' },
  infinitivo(frase) {
    let t = String(frase || '').trim().replace(/[?.!]+$/, '').replace(/\s+/g, ' ');
    t = t.replace(/^(a crian\u00e7a|a crianca|o paciente|a paciente|ele|ela)\s+/i, '');
    t = t.replace(/^(\u00e9 capaz de|consegue|costuma|sabe|tende a|j\u00e1 consegue|j\u00e1)\s+/i, '');
    if (!t) return '';
    const m = t.match(/^([^\s]+?)(-se|-lhe|-o|-a)?(\s|$)/i);
    if (!m) return t.toLowerCase();
    const v = m[1].toLowerCase(), cl = (m[2] || '').toLowerCase(), resto = t.slice(m[0].length);
    let inf = this.VERBOS_INF[v];
    if (!inf) {
      if (/[a-z\u00e7]a$/.test(v)) inf = v + 'r';
      else if (/\u00e9m$/.test(v)) inf = v.replace(/\u00e9m$/, 'er');
      else if (/\u00f5e$/.test(v)) inf = v.replace(/\u00f5e$/, 'or');
      else if (/ai$/.test(v)) inf = v + 'r';
      else if (/ui$/.test(v)) inf = v + 'r';
      else if (/uz$/.test(v)) inf = v + 'ir';
      else if (/z$/.test(v)) inf = v + 'er';
      else if (/e$/.test(v)) inf = v + 'r';
      else if (/i$/.test(v)) inf = v + 'r';
      else return t.charAt(0).toLowerCase() + t.slice(1);
    }
    let r = resto.trim();
    // "sobe e desce escadas" -> "subir e descer escadas"
    const m2 = r.match(/^(e|ou)\s+([^\s]+?)(-se)?(\s|$)/i);
    if (m2 && !/^(e|ou)\s+(o|a|os|as|um|uma|de|do|da|em|no|na|com|sem|para|por|que|se)\b/i.test(r)) {
      const inf2 = this.infinitivo(m2[2] + (m2[3] || '') + ' x').replace(/ x$/, '');
      if (inf2 && /r(-se)?$/.test(inf2)) r = m2[1] + ' ' + inf2 + r.slice(m2[0].length - (m2[4] ? 1 : 0)).replace(/^\s*/, ' ').replace(/\s+$/, '');
    }
    return (inf + cl + (r ? ' ' + r : '')).replace(/\s+/g, ' ').trim();
  },
  // limpa o texto de um item do protocolo para entrar em frase corrida (sem exemplos entre parenteses, sem "?")
  limparItem(t) {
    let s = String(t || '').replace(/\s+/g, ' ').trim();
    s = s.replace(/\s*\((ex\.?:?|por exemplo|p\.? ?ex\.?|como)[^)]*\)/gi, '');
    s = s.replace(/\s*\([^)]{22,}\)/g, '');
    s = s.replace(/[?.!;:]+$/, '').replace(/\s*[-\u2013]\s*$/, '').trim();
    s = s.replace(/^(a crian[\u00e7c]a|o paciente|a paciente|ele|ela)\s+/i, '');
    return s ? s.charAt(0).toLowerCase() + s.slice(1) : '';
  },
  // lista curta e legivel: ate "max" habilidades, no infinitivo (ou como estao, quando conjugado = true), juntas com virgula + "e"
  listaHab(arr, max, conjugado) {
    let itens = (arr || []).map(x => this.limparItem(x)).filter(Boolean).map(x => conjugado ? x : this.infinitivo(x)).filter(Boolean)
      .filter((x, i, l) => l.indexOf(x) === i);
    const curtos = itens.filter(x => x.length <= 80);
    itens = (curtos.length >= Math.min(max || 5, itens.length) ? curtos : itens).slice(0, max || 5);
    return this.junta(itens);
  },

  // QUEST / Portage (molde da Alice): abertura propria de cada area + habilidades presentes + conector + dificuldades.
  // {P} = presentes (infinitivo), {Pc} = presentes como estao no protocolo (3a pessoa), {A} = ausentes, {M} = inconsistentes (Portage)
  ABERTURAS: {
    'Linguagem Receptiva': { alta: 'A crian\u00e7a demonstra boa capacidade para {P}.', media: 'A crian\u00e7a demonstra capacidade para {P}.', baixa: 'A crian\u00e7a apresenta habilidades iniciais de compreens\u00e3o, como {P}.', dif: 'Por outro lado, apresenta dificuldades em {A}.' },
    'Linguagem Expressiva': { alta: 'A crian\u00e7a comunica-se com boa funcionalidade, sendo capaz de {P}.', media: 'A crian\u00e7a apresenta habilidades como {P}.', baixa: 'A crian\u00e7a apresenta habilidades iniciais como {P}.', dif: 'Suas limita\u00e7\u00f5es concentram-se no uso mais complexo da linguagem, como {A}.', difAlta: 'Por outro lado, ainda apresenta dificuldades em {A}.' },
    'Cogni\u00e7\u00e3o': { alta: 'No dom\u00ednio cognitivo, a crian\u00e7a \u00e9 capaz de {P}.', media: 'No dom\u00ednio cognitivo, a crian\u00e7a \u00e9 capaz de {P}.', baixa: 'No dom\u00ednio cognitivo, a crian\u00e7a apresenta habilidades iniciais, sendo capaz de {P}.', dif: 'Em contrapartida, demonstra dificuldades em {A}.' },
    'Motricidade Grossa': { alta: 'A crian\u00e7a apresenta bom desenvolvimento nas etapas fundamentais de mobilidade, conseguindo {P}.', media: 'A crian\u00e7a apresenta desenvolvimento adequado nas etapas fundamentais de mobilidade, conseguindo {P}.', baixa: 'A crian\u00e7a apresenta habilidades motoras amplas iniciais, conseguindo {P}.', dif: 'As principais dificuldades recaem sobre {A}.' },
    'Motricidade Fina': { alta: 'O desempenho motor fino revela boa capacidade funcional para {P}.', media: 'O desempenho motor fino revela capacidade funcional para {P}.', baixa: 'O desempenho motor fino revela habilidades iniciais para {P}.', dif: 'Por outro lado, a crian\u00e7a encontra barreiras em {A}.' },
    'Socializa\u00e7\u00e3o': { alta: 'No aspecto social, a crian\u00e7a {Pc}.', media: 'No aspecto social, a crian\u00e7a {Pc}.', baixa: 'No aspecto social, a crian\u00e7a j\u00e1 {Pc}.', dif: 'Contudo, enfrenta desafios para {A}.', conjugado: true },
    // Portage
    'Socializacao': { alta: 'No aspecto social, a crian\u00e7a {Pc}.', media: 'No aspecto social, a crian\u00e7a {Pc}.', baixa: 'No aspecto social, a crian\u00e7a j\u00e1 {Pc}.', dif: 'Contudo, enfrenta desafios para {A}.', conjugado: true },
    'Linguagem': { alta: 'No campo da linguagem, a crian\u00e7a \u00e9 capaz de {P}.', media: 'No campo da linguagem, a crian\u00e7a j\u00e1 consegue {P}.', baixa: 'No campo da linguagem, a crian\u00e7a apresenta habilidades iniciais como {P}.', dif: 'Por outro lado, apresenta dificuldades em {A}.' },
    'Cognicao': { alta: 'No dom\u00ednio cognitivo, a crian\u00e7a \u00e9 capaz de {P}.', media: 'No dom\u00ednio cognitivo, a crian\u00e7a \u00e9 capaz de {P}.', baixa: 'No dom\u00ednio cognitivo, a crian\u00e7a apresenta habilidades iniciais, sendo capaz de {P}.', dif: 'Em contrapartida, demonstra dificuldades em {A}.' },
    'Autocuidados': { alta: 'Em autocuidados, a crian\u00e7a realiza com autonomia tarefas como {P}.', media: 'Em autocuidados, a crian\u00e7a j\u00e1 consegue {P}.', baixa: 'Em autocuidados, a crian\u00e7a apresenta habilidades iniciais, como {P}.', dif: 'Ainda depende do apoio do adulto para {A}.' },
    'Desenvolvimento Motor': { alta: 'No desenvolvimento motor, a crian\u00e7a consegue {P}.', media: 'No desenvolvimento motor, a crian\u00e7a consegue {P}.', baixa: 'No desenvolvimento motor, a crian\u00e7a apresenta habilidades iniciais, conseguindo {P}.', dif: 'As principais dificuldades recaem sobre {A}.' },
    padrao: { alta: 'Nesta \u00e1rea, a crian\u00e7a demonstra boa capacidade para {P}.', media: 'Nesta \u00e1rea, a crian\u00e7a j\u00e1 demonstra {P}.', baixa: 'Nesta \u00e1rea, a crian\u00e7a apresenta habilidades iniciais, como {P}.', dif: 'Por outro lado, apresenta dificuldades em {A}.' }
  },
  paragrafoMarcos(a, ela, primeiro) {
    const R = this.ABERTURAS[a.area] || this.ABERTURAS.padrao;
    const banda = a.pct >= 70 ? 'alta' : a.pct >= 40 ? 'media' : 'baixa';
    const nPres = (a.presentes || []).length, nAus = (a.ausentes || []).length;
    const pres = this.listaHab(a.presentes, 6, R.conjugado), aus = this.listaHab(a.ausentes, 6), med = this.listaHab(a.medios, 3);
    if (!nPres && !nAus) return '';
    if (!nPres) {
      return 'A crian\u00e7a ainda n\u00e3o apresenta os marcos avaliados nesta \u00e1rea' + (med ? ', embora j\u00e1 demonstre, de forma inconsistente, ' + med : '') +
        '. As dificuldades concentram-se em ' + aus + (nAus > 6 ? ', entre outras' : '') + ', habilidades que passam a compor as metas priorit\u00e1rias do PEI.';
    }
    let t = (R[banda] || R.media).replace('{Pc}', pres).replace('{P}', pres);
    if (med) t = t.replace(/\.$/, '') + ', al\u00e9m de j\u00e1 apresentar, de forma ainda inconsistente, ' + med + '.';
    if (nAus) t += ' ' + ((banda === 'alta' && R.difAlta) || R.dif).replace('{A}', aus);
    else t += ' N\u00e3o foram observadas dificuldades nos marcos avaliados para a faixa et\u00e1ria, restando ampliar a generaliza\u00e7\u00e3o dessas habilidades para diferentes contextos e parceiros.';
    return t;
  },

  // Socially Savvy (molde do Joao Vitor): descricao por temas a partir da pontuacao 0-3, sem transcrever os itens.
  // [regex do item, capacidade (infinitivo), tema (substantivo)]
  SS_TEMAS: {
    'Participacao Conjunta': [
      [/\bnome\b/i, 'responder ao ser chamado pelo nome', 'resposta ao nome'],
      [/altern/i, 'alternar o olhar entre o objeto e a pessoa', 'altern\u00e2ncia do olhar entre o objeto e o parceiro'],
      [/imit/i, 'imitar a\u00e7\u00f5es do outro', 'imita\u00e7\u00e3o de a\u00e7\u00f5es'],
      [/aponta|olha para|olhar|segue|dire[\u00e7c]/i, 'acompanhar o olhar e o apontar do outro', 'acompanhamento do olhar e do apontar do parceiro'],
      [/mostra|compartilh|inicia|espont|chama/i, 'compartilhar interesses por meio do olhar, de gestos e da iniciativa de mostrar', 'compartilhamento espont\u00e2neo de interesses'],
      [/entrega|d[\u00e1a] |pedid|solicit/i, 'responder \u00e0s solicita\u00e7\u00f5es do adulto', 'resposta \u00e0s solicita\u00e7\u00f5es do parceiro'],
      [/mant|sustent|perman|engaj|continu|dura/i, 'manter o engajamento em atividades conjuntas', 'manuten\u00e7\u00e3o do engajamento em atividades compartilhadas']
    ],
    'Brincadeira Social': [
      [/ao lado|paralel|pr[\u00f3o]xim/i, 'brincar pr\u00f3ximo aos pares', 'brincadeira ao lado dos pares'],
      [/faz de conta|simb[\u00f3o]lic|imagin|papel|personag/i, 'sustentar brincadeiras de faz de conta com os pares', 'brincadeira simb\u00f3lica compartilhada'],
      [/\bvez\b|revez|turno/i, 'revezar turnos e materiais', 'revezamento de turnos e materiais'],
      [/entrada|convid|junt|incl|aceita/i, 'aceitar e convidar o outro para a brincadeira', 'inclus\u00e3o do outro na brincadeira'],
      [/regra|cooper|conjunt|jogo/i, 'participar de jogos com regras e brincadeiras cooperativas', 'organiza\u00e7\u00e3o conjunta da brincadeira e os jogos com regras'],
      [/ideia|propost|segue|sugest|mudan|flex/i, 'acompanhar diferentes propostas de brincadeira', 'flexibilidade para seguir as propostas do outro'],
      [/inicia|respond|aproxim|interag/i, 'iniciar e responder \u00e0s intera\u00e7\u00f5es dos pares', 'iniciativa de intera\u00e7\u00e3o com os pares']
    ],
    'Autorregulacao': [
      [/perd|derrot|ganh|compet/i, 'tolerar perder em jogos', 'toler\u00e2ncia \u00e0 frustra\u00e7\u00e3o diante de derrotas'],
      [/pausa|acalm|calm|regul/i, 'solicitar pausas e utilizar estrat\u00e9gias para se acalmar', 'uso de estrat\u00e9gias para se acalmar'],
      [/ajuda/i, 'pedir ajuda diante de dificuldades', 'solicita\u00e7\u00e3o de ajuda'],
      [/transi|mudan|rotina|imprevist|inesper/i, 'lidar com transi\u00e7\u00f5es e mudan\u00e7as de rotina', 'flexibilidade diante de mudan\u00e7as e transi\u00e7\u00f5es'],
      [/erro|engan|tentativa|corre[\u00e7c]/i, 'lidar com os pr\u00f3prios erros e com corre\u00e7\u00f5es', 'toler\u00e2ncia aos pr\u00f3prios erros e \u00e0s corre\u00e7\u00f5es'],
      [/\bn[\u00e3a]o\b|negativ|limite|proib/i, 'aceitar negativas', 'aceita\u00e7\u00e3o de negativas e limites'],
      [/esper|aguard/i, 'esperar a sua vez', 'espera pela vez'],
      [/combinad|regra|instru/i, 'seguir combinados', 'seguimento de combinados']
    ],
    'Social/Emocional': [
      [/identific|nomei|reconhec|rotul|diz como/i, 'identificar e nomear emo\u00e7\u00f5es em si e nos outros', 'identifica\u00e7\u00e3o e nomea\u00e7\u00e3o de emo\u00e7\u00f5es'],
      [/empat|confort|consol|ajud|preocup|responde/i, 'responder \u00e0s emo\u00e7\u00f5es do outro', 'resposta emp\u00e1tica \u00e0s emo\u00e7\u00f5es do outro'],
      [/express|demonstr|mostra/i, 'expressar o que sente de forma adequada', 'express\u00e3o adequada dos pr\u00f3prios sentimentos'],
      [/causa|por que|motivo|situa/i, 'relacionar as emo\u00e7\u00f5es \u00e0s situa\u00e7\u00f5es que as provocam', 'compreens\u00e3o das causas das emo\u00e7\u00f5es'],
      [/perspect|interess|pensa|prefer|gosta/i, 'demonstrar interesse pelo outro', 'considera\u00e7\u00e3o da perspectiva do outro']
    ],
    'Linguagem Social': [
      [/cumpriment|\boi\b|tchau|desped/i, 'cumprimentar e se despedir', 'cumprimentos e despedidas'],
      [/por favor|obrigad|desculp|polid|educad/i, 'usar express\u00f5es de polidez', 'uso de express\u00f5es de polidez'],
      [/pergunt|questiona/i, 'fazer e responder perguntas', 'formula\u00e7\u00e3o de perguntas'],
      [/troca|t[\u00f3o]pico|mant|continu|assunto|conversa/i, 'manter trocas comunicativas no mesmo t\u00f3pico', 'manuten\u00e7\u00e3o e condu\u00e7\u00e3o do t\u00f3pico da conversa'],
      [/inicia|come[\u00e7c]a|puxa/i, 'iniciar intera\u00e7\u00f5es verbais', 'iniciativa de conversar'],
      [/coment|informa|conta|relata|compartilha/i, 'comentar e compartilhar informa\u00e7\u00f5es', 'compartilhamento de informa\u00e7\u00f5es'],
      [/respond/i, 'responder a perguntas', 'resposta a perguntas'],
      [/ajust|adequ|interlocutor|contexto|volume/i, 'ajustar a comunica\u00e7\u00e3o ao interlocutor', 'ajuste da comunica\u00e7\u00e3o ao interlocutor e ao contexto']
    ],
    'Comportamento de Sala de Aula/Grupo': [
      [/instru|comando|orienta/i, 'seguir instru\u00e7\u00f5es dirigidas ao grupo', 'seguimento de instru\u00e7\u00f5es coletivas'],
      [/roda|c[\u00edi]rculo|sentad|lugar/i, 'permanecer no lugar nas atividades em roda', 'perman\u00eancia nas atividades em roda'],
      [/m[\u00e3a]o|\bvez\b|esper/i, 'esperar a vez para participar', 'espera da vez em grupo'],
      [/transi|fila|desloc/i, 'realizar transi\u00e7\u00f5es junto com o grupo', 'transi\u00e7\u00f5es em grupo'],
      [/rotina|hor[\u00e1a]rio|cronograma/i, 'acompanhar as rotinas da sala', 'acompanhamento das rotinas coletivas'],
      [/tarefa|atividade|aten[\u00e7c]|professor|olha/i, 'manter a aten\u00e7\u00e3o nas atividades propostas ao grupo', 'aten\u00e7\u00e3o sustentada em atividades coletivas']
    ],
    'Linguagem Nao-Verbal': [
      [/contato visual|olhos|olha|olhar/i, 'manter contato visual ao falar e ao ouvir', 'contato visual ao falar e ao ser ouvido'],
      [/corpo|orient|vira|posicion/i, 'direcionar o corpo ao parceiro', 'direcionamento do corpo e do olhar para o parceiro social'],
      [/express[\u00e3a]o|facial|rosto/i, 'ler e usar express\u00f5es faciais', 'leitura e uso de express\u00f5es faciais'],
      [/espa[\u00e7c]o|dist[\u00e2a]ncia|pr[\u00f3o]xim/i, 'respeitar o espa\u00e7o pessoal do outro', 'respeito ao espa\u00e7o pessoal'],
      [/tom|volume|voz|entona/i, 'adequar o tom e o volume da voz', 'adequa\u00e7\u00e3o do tom e do volume da voz'],
      [/gest|acena|cabe[\u00e7c]a|aponta|sinal/i, 'usar gestos convencionais', 'uso e leitura de gestos']
    ]
  },
  // temas fortes (itens em 3) e fracos (itens em 0-1; se nao houver, os em 2) de uma area do SS
  temasSS(a) {
    const regras = this.SS_TEMAS[a.area] || [];
    const cont = regras.map(() => ({ n3: 0, n2: 0, n01: 0 }));
    (a.itensPont || []).forEach(it => {
      const i = regras.findIndex(r => r[0].test(it.texto)); if (i < 0) return;
      const c = cont[i]; if (it.p === 3) c.n3++; else if (it.p === 2) c.n2++; else c.n01++;
    });
    const lin = regras.map((r, i) => ({ r, c: cont[i] }));
    const fortes = lin.filter(x => x.c.n3 > 0 && x.c.n3 >= x.c.n2 + x.c.n01).sort((x, y) => y.c.n3 - x.c.n3).map(x => x.r[1]);
    let fracos = lin.filter(x => x.c.n01 > 0 && x.c.n01 >= x.c.n3).sort((x, y) => y.c.n01 - x.c.n01).map(x => x.r[2]);
    if (!fracos.length) fracos = lin.filter(x => x.c.n2 > 0 && x.c.n2 >= x.c.n3).sort((x, y) => y.c.n2 - x.c.n2).map(x => x.r[2]);
    return { fortes, fracos };
  },
  // "em atencao compartilhada", "na brincadeira social"...
  emArea(area) {
    const m = { 'Participacao Conjunta': 'em aten\u00e7\u00e3o compartilhada', 'Brincadeira Social': 'na brincadeira social', 'Autorregulacao': 'em autorregula\u00e7\u00e3o',
      'Social/Emocional': 'no repert\u00f3rio social e emocional', 'Linguagem Social': 'em linguagem social', 'Comportamento de Sala de Aula/Grupo': 'no comportamento em grupo', 'Linguagem Nao-Verbal': 'na comunica\u00e7\u00e3o n\u00e3o verbal' };
    return m[area] || 'em ' + this.nomeAreaDoc(area).toLowerCase();
  },
  // "ao/\u00e0/aos/\u00e0s" antes de um tema (habilidades relacionadas ao compartilhamento..., \u00e0 resposta ao nome...)
  aTema(t) {
    const w = String(t || '').split(' ')[0];
    const plural = /s$/.test(w) && !/\u00e3o$/.test(w);
    const fem = plural ? /(\u00f5es|as|ades|\u00e2ncias|\u00eancias|agens)$/.test(w) : /(\u00e3o|\u00e2ncia|\u00eancia|dade|eza|a|agem)$/.test(w);
    return (plural ? (fem ? '\u00e0s ' : 'aos ') : (fem ? '\u00e0 ' : 'ao ')) + t;
  },
  paragrafoSS(a, ela, primeiro, b) {
    const D = this.SS_DESC[a.area] || {};
    const T = this.temasSS(a);
    const fortes = this.junta(T.fortes.slice(0, 3));
    const fracosLista = T.fracos.slice(0, 2);
    // "situacoes que envolvem {fracos}" / "habilidades relacionadas {fracosRel}"
    const fracos = this.junta(fracosLista) || D.foco || 'as habilidades de maior complexidade social';
    const fracosRel = fracosLista.length ? this.junta(fracosLista.map(t => this.aTema(t)))
      : (D.foco || 'as habilidades de maior complexidade social').replace(/^a /, '\u00e0 ').replace(/^o /, 'ao ').replace(/^as /, '\u00e0s ').replace(/ e a /g, ' e \u00e0 ').replace(/ e o /g, ' e ao ');
    const em = this.emArea(a.area);
    const subiu = b && b.pct !== null && a.pct - b.pct >= 10;
    if (subiu && a.pct >= 60) {
      return primeiro + ' apresentou evolu\u00e7\u00e3o significativa ' + em + (fortes ? ', demonstrando, de forma mais consistente, capacidade de ' + fortes : '') +
        '. Algumas situa\u00e7\u00f5es que exigem ' + fracos + ' ainda se mostram menos consistentes, mas o desempenho geral indica um repert\u00f3rio ' + (a.pct >= 85 ? 'bem estabelecido' : 'em consolida\u00e7\u00e3o') + '.';
    }
    if (a.pct >= 85) {
      return primeiro + ' apresentou um desempenho consistente ' + em + (fortes ? ', demonstrando boa capacidade de ' + fortes : '') +
        '. De modo geral, apresentou bom repert\u00f3rio nessa \u00e1rea' +
        (T.fracos.length ? ', embora algumas habilidades relacionadas ' + fracosRel + ' ainda possam ocorrer de forma menos consistente.' : ', com respostas consistentes em todas as habilidades avaliadas.');
    }
    if (a.pct >= 60) {
      return primeiro + ' apresentou bom desempenho ' + em + (fortes ? ', demonstrando, de maneira consistente, capacidade de ' + fortes : '') +
        '. Observa-se que, em situa\u00e7\u00f5es que envolvem ' + fracos + ', a habilidade ainda pode apresentar alguma varia\u00e7\u00e3o, embora o repert\u00f3rio geral esteja bem desenvolvido.';
    }
    if (a.pct >= 35) {
      return primeiro + ' apresentou desempenho parcial ' + em + (T.fortes.length ? ': j\u00e1 demonstra capacidade de ' + fortes + ', ainda que com pouca regularidade' : ', com respostas ainda pouco regulares') +
        '. Habilidades relacionadas ' + fracosRel + ' ainda n\u00e3o foram observadas de forma consistente, o que indica esta \u00e1rea como foco priorit\u00e1rio da interven\u00e7\u00e3o.';
    }
    return primeiro + ' apresentou repert\u00f3rio inicial ' + em + (T.fortes.length ? ', com respostas emergentes em ' + fortes + ', geralmente com apoio do adulto' : ', sem respostas consistentes nas habilidades avaliadas') +
      '. Habilidades relacionadas ' + fracosRel + ' ainda n\u00e3o foram observadas e passam a compor as metas priorit\u00e1rias do PEI.';
  },

  // \u2500\u2500\u2500 V. Conclusao (molde da clinica); os dois paragrafos fixos entram depois
  rascunhoConclusao(d) {
    const primeiro = d.pac.nome.split(' ')[0];
    const junta = arr => this.junta(arr);
    const areas = this.areasRel(d);
    if (!areas.length) return '';
    const porPct = areas.slice().sort((x, y) => y.pct - x.pct);
    const total = Math.round(areas.reduce((s, x) => s + x.pct, 0) / areas.length);
    const baixas = porPct.slice().reverse().filter(x => x.pct < 50).map(x => x.nome);
    const piores = porPct.slice(-2).reverse().map(x => x.nome);
    const reav = areas.some(x => x.ant !== null);
    const ganhos = areas.filter(x => x.delta !== null && x.delta >= 10).sort((x, y) => y.delta - x.delta).map(x => x.nome);
    let t = 'A partir das observa\u00e7\u00f5es realizadas, conclui-se que ' + primeiro + ' apresenta ';
    let dific = false;
    if (total < 50 || baixas.length >= Math.ceil(areas.length / 2)) {
      dific = true;
      t += 'dificuldades significativas nas habilidades avaliadas, com maior \u00eanfase em ' + junta((baixas.length ? baixas : piores).slice(0, 4)) + '.';
    } else if (total >= 75) {
      t += 'habilidades importantes em processo de desenvolvimento, constituindo uma base s\u00f3lida para sua evolu\u00e7\u00e3o. Ressalta-se a import\u00e2ncia da estimula\u00e7\u00e3o das \u00e1reas ' + junta(piores) + ', visando a consolida\u00e7\u00e3o e generaliza\u00e7\u00e3o de tais habilidades.';
    } else {
      t += 'desenvolvimento heterog\u00eaneo entre as \u00e1reas avaliadas, com melhor desempenho em ' + junta(porPct.slice(0, 2).map(x => x.nome)) + ' e maior necessidade de estimula\u00e7\u00e3o em ' + junta((baixas.length ? baixas : piores).slice(0, 3)) + '.';
    }
    if (ganhos.length) t += (dific ? ' Apesar disso, nota-se' : ' Nota-se, ainda,') + ' evolu\u00e7\u00e3o desde a \u00faltima avalia\u00e7\u00e3o realizada, principalmente nas habilidades de ' + junta(ganhos.slice(0, 3)) + '.';
    else if (reav) t += ' Em rela\u00e7\u00e3o \u00e0 avalia\u00e7\u00e3o anterior, o repert\u00f3rio se manteve est\u00e1vel, sem evolu\u00e7\u00f5es expressivas nas \u00e1reas avaliadas.';
    return t;
  },

  // todos os textos automaticos de uma vez (usado ao criar o relatorio e ao regerar)
  rascunhos(d) {
    const r = { demanda: this.rascunhoDemanda(d), analise: this.rascunhoAnalise(d), conclusao: this.rascunhoConclusao(d), areas: {} };
    r.comparativo = d.protocolos.some(pr => pr.anterior)
      ? d.protocolos.filter(pr => pr.anterior).map(pr => (d.completo ? this.NOME_PROT[pr.av.protocolo] + ': ' : '') + this.rascunhoComparativo(d, pr)).join('\n\n') : null;
    d.protocolos.forEach(pr => pr.atual.areas.forEach(a => { r.areas[this.chaveArea(pr, a.area)] = this.rascunhoArea(d, a, pr); }));
    return r;
  },

  // \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 EDITOR \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
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

    const auto = {}, novos = this.rascunhos(d);
    if (!rel.demanda) auto.demanda = novos.demanda;
    if (!rel.analise) auto.analise = novos.analise;
    if (!rel.comparativo && novos.comparativo) auto.comparativo = novos.comparativo;
    if (!rel.areas || !Object.keys(rel.areas).length) auto.areas = novos.areas;
    if (!rel.conclusao) auto.conclusao = novos.conclusao;
    if (!rel.assinatura_nome) { auto.assinatura_nome = this.ASSINATURA_PADRAO.nome; auto.assinatura_titulo = this.ASSINATURA_PADRAO.titulo; }
    if (rel.status === 'rascunho' && Object.keys(auto).length) {
      { const { error: _e } = await sb.from('relatorios_avaliacao').update(auto).eq('id', rel.id); if (_e) popAviso('Nao foi possivel gravar (relatorios_avaliacao): ' + _e.message); }
      Object.assign(rel, auto);
    }
    if (rel.incluir_anexos === null || rel.incluir_anexos === undefined) rel.incluir_anexos = d.completo;
    if (rel.mostrar_frequencia === null || rel.mostrar_frequencia === undefined) rel.mostrar_frequencia = !!d.freq;
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
      (editavel ? '<button class="btn btn-fantasma" title="Descarta o que esta escrito na demanda, analise, comparativo, areas e conclusao e escreve de novo a partir dos dados" onclick="MODULOS.laudo_avaliacao.regerarTextos()">&#8635; Regerar textos</button>' : '') +
      (editavel ? '<button class="btn btn-primario" onclick="MODULOS.laudo_avaliacao.gerarTravar()">&#128274; Gerar e travar</button>' : '') +
      (travado && typeof podeReabrirRelatorio === 'function' && podeReabrirRelatorio() ? '<button class="btn btn-fantasma" title="So coordenacao/direcao: volta o relatorio para rascunho para corrigir" onclick="MODULOS.laudo_avaliacao.reabrir()">&#128275; Reabrir para editar</button>' : '') +
      '  <button class="btn btn-fantasma" onclick="MODULOS.laudo_avaliacao.doc()">&#128196; ' + (travado ? 'Documento' : 'Folha / Imprimir') + '</button>' +
      (travado ? pdfAssinadoBtn() : '') + '</div></div>' +
      '<div class="rm-split"><div class="rm-form">' +
      '  <div class="cartao faixa-azul"><h3>Vem do sistema</h3><div class="grade-visao">' +
      d.protocolos.map(pr =>
      '    <div class="caixa-info"><small>' + escaparHtml(this.NOME_PROT[pr.av.protocolo] || pr.av.protocolo) + '</small><b>' + (pr.atual.total === null ? '-' : pr.atual.total + '%') +
      ' <small class="sub">' + new Date(pr.av.concluido_em).toLocaleDateString('pt-BR') + ' &middot; ' + pr.nSessoes + ' sess.' + (pr.anterior ? ' &middot; ant. ' + pr.anterior.total + '%' : '') + '</small></b></div>').join('') + '</div>' +
      '  <label class="check" style="display:flex; gap:6px; align-items:center; font-size:12.5px; margin-top:8px"><input type="checkbox" id="la-anexos"' + (rel.incluir_anexos ? ' checked' : '') + (editavel ? '' : ' disabled') + ' onchange="MODULOS.laudo_avaliacao.salvarAuto()"> Incluir anexos consolidados (tabelas e graficos de cada protocolo)</label>' +
      '  <label class="check" style="display:flex; gap:6px; align-items:center; font-size:12.5px; margin-top:6px"><input type="checkbox" id="la-freq"' + (rel.mostrar_frequencia ? ' checked' : '') + (editavel ? '' : ' disabled') + ' onchange="MODULOS.laudo_avaliacao.salvarAuto()"> Mostrar a frequ&ecirc;ncia semanal na identifica&ccedil;&atilde;o' + (d.freq ? ' (' + escaparHtml(String(d.freq)) + ' sess&otilde;es/semana)' : ' <small class="sub">(sem frequ&ecirc;ncia cadastrada no Plano)</small>') + '</label>' +
      (faltas.length ? '<div class="mensagem-erro visivel" style="margin-top:8px">Faltam no cadastro: ' + faltas.join(', ') + '. O relatorio sai sem esses dados ate preencher em Editar dados / Plano.</div>' : '') +
      '  <div class="campo" style="margin-top:8px"><label>Assinatura</label><select id="la-ass"' + (editavel ? '' : ' disabled') + ' onchange="MODULOS.laudo_avaliacao.salvarAuto()">' +
      this._assinaturas.map(a => '<option value="' + escaparHtml(a.nome) + '"' + (a.nome === rel.assinatura_nome ? ' selected' : '') + '>' + escaparHtml(a.nome) + ' \u2014 ' + escaparHtml(a.titulo) + '</option>').join('') + '</select></div></div>' +
      '  <div class="cartao">' +
      campo('demanda', 'II. Descricao da demanda', rel.demanda, 3) +
      (editavel
        ? '<div class="campo" style="margin-bottom:10px"><label>III. Procedimento <small class="sub">(texto padrao da clinica; altere se precisar)</small> ' +
          '<button type="button" class="btn-chip" style="margin-left:6px" onclick="MODULOS.laudo_avaliacao.restaurarProcedimento()">&#8634; Texto padrao</button></label>' +
          '<textarea id="la-procedimento" rows="5" style="resize:vertical" oninput="MODULOS.laudo_avaliacao.salvarAuto()">' + escaparHtml((rel.procedimento || '').trim() || this.procedimentoPadrao(d)) + '</textarea></div>'
        : (rel.procedimento ? '<div style="margin-bottom:10px"><b style="font-size:11.5px; text-transform:uppercase; letter-spacing:.04em">III. Procedimento (alterado)</b><p style="font-size:13px; line-height:1.7; white-space:pre-wrap; margin-top:3px">' + escaparHtml(rel.procedimento) + '</p></div>' : '')) +
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
  procedimentoPadrao(d) {
    return d.protocolos.map(pr => { const t = this.PROCEDIMENTO[pr.av.protocolo] || ''; return t.includes('{N}') ? t.replace('{N}', pr.nSessoes) : t + this.APLICACAO.replace('{N}', pr.nSessoes); }).join('\n\n');
  },
  restaurarProcedimento() {
    const el = document.getElementById('la-procedimento'); if (!el) return;
    el.value = this.procedimentoPadrao(this._d); this.salvarAuto();
  },
  colher() {
    const rel = this._rel, d = this._d;
    const v = id => document.getElementById('la-' + id)?.value.trim() || null;
    const areas = {};
    d.protocolos.forEach(pr => pr.atual.areas.forEach(a => { const k = this.chaveArea(pr, a.area); areas[k] = v('area-' + k.replace(/[^a-z0-9]/gi, '_')) || (rel.areas || {})[k] || ''; }));
    const ass = document.getElementById('la-ass');
    const a = ass ? this._assinaturas.find(x => x.nome === ass.value) : null;
    const anx = document.getElementById('la-anexos');
    const procEl = document.getElementById('la-procedimento');
    const procedimento = procEl ? (procEl.value.trim() === this.procedimentoPadrao(d).trim() ? null : procEl.value.trim() || null) : rel.procedimento;
    return { demanda: v('demanda') ?? rel.demanda, procedimento, analise: v('analise') ?? rel.analise, comparativo: v('comparativo') ?? rel.comparativo,
      areas, conclusao: v('conclusao') ?? rel.conclusao, incluir_anexos: anx ? anx.checked : rel.incluir_anexos,
      mostrar_frequencia: document.getElementById('la-freq') ? document.getElementById('la-freq').checked : rel.mostrar_frequencia,
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
  async reabrir() {
    if (!podeReabrirRelatorio()) return;
    if (!await popConfirmar('Reabrir este relatorio de avaliacao para edicao?\n\nEle volta a rascunho. O que ja foi enviado ao portal ou assinado continua como estava; depois de corrigir, gere e trave de novo (e reenvie/reassine se precisar).', { titulo: 'Reabrir relatorio', ok: 'Reabrir' })) return;
    const { data, error } = await sb.rpc('fn_reabrir_relatorio', { p_tabela: 'relatorios_avaliacao', p_id: this._rel.id });
    if (error || (data && data.erro)) { popAviso('Nao consegui reabrir: ' + (error ? error.message : data.erro)); return; }
    this.abrirEditor(this._rel.avaliacoes_ids && this._rel.avaliacoes_ids.length ? this._rel.avaliacoes_ids : this._rel.avaliacao_id);
  },
  // Regerar os textos automaticos deste relatorio (rascunho): o que a equipe escreveu nesses campos e substituido
  async regerarTextos() {
    const rel = this._rel, d = this._d; if (!rel || !d || rel.status !== 'rascunho') return;
    const ok = await popConfirmar('Regerar os textos automaticos deste relatorio?\n\nDemanda, analise, comparativo, areas e conclusao voltam a ser escritos pelo sistema a partir dos dados atuais. O que foi digitado nesses campos se perde; procedimento, assinatura e opcoes continuam.', { titulo: 'Regerar textos', ok: 'Regerar' });
    if (!ok) return;
    clearTimeout(this._timer);
    const auto = this.rascunhos(d);
    const { error } = await sb.from('relatorios_avaliacao').update(auto).eq('id', rel.id);
    if (error) { popAviso('Nao foi possivel regerar: ' + error.message); return; }
    this.abrirEditor(rel.avaliacoes_ids && rel.avaliacoes_ids.length ? rel.avaliacoes_ids : rel.avaliacao_id);
  },

  // Regerar TODOS os relatorios de avaliacao (direcao/suporte): rascunhos recebem os textos novos;
  // os ja gerados sao reabertos, reescritos e travados de novo com a folha nova (mesma data de geracao).
  podeRegerarTodos() { const p = window.CORTEX_SESSAO.profile; return ['direcao', 'suporte'].includes(p.perfil_real || p.perfil); },
  async regerarTodos() {
    if (!this.podeRegerarTodos()) return;
    const { data: rels, error } = await sb.from('relatorios_avaliacao').select('id, avaliacao_id, avaliacoes_ids, tipo, status, paciente_id, incluir_anexos, gerado_em, gerado_por, pacientes(nome)').order('criado_em');
    if (error) { popAviso('Nao foi possivel listar os relatorios: ' + error.message); return; }
    const lista = rels || [];
    if (!lista.length) { popAviso('Nenhum relatorio de avaliacao para regerar.'); return; }
    const nGer = lista.filter(r => r.status !== 'rascunho').length;
    const ok = await popConfirmar('Regerar os textos automaticos de ' + lista.length + ' relatorio(s) de avaliacao (' + nGer + ' ja gerado(s))?\n\n' +
      'Demanda, analise, comparativo, areas e conclusao de TODOS sao reescritos pelo sistema; o que a equipe digitou nesses campos se perde. ' +
      'Os gerados sao reabertos e travados de novo com a folha nova. Procedimento, assinatura e opcoes continuam.', { titulo: 'Regerar todos', ok: 'Regerar ' + lista.length });
    if (!ok) return;
    abrirModal('Regerando relatorios', '<div id="rg-prog" style="font-size:13px; line-height:1.7"></div><p class="sub" style="margin-top:8px">Nao feche esta janela.</p>');
    const prog = document.getElementById('rg-prog');
    const log = (m, cor) => { if (prog) prog.innerHTML += '<div style="color:' + (cor || 'inherit') + '">' + m + '</div>'; };
    let feitos = 0, erros = 0;
    for (const r of lista) {
      const nome = escaparHtml((r.pacientes && r.pacientes.nome) || '') + ' &middot; ' + (r.tipo === 'completo' ? 'completo' : 'protocolo');
      try {
        const ids = r.avaliacoes_ids && r.avaliacoes_ids.length ? r.avaliacoes_ids : [r.avaliacao_id];
        const d = await this.dados(ids);
        if (!d) throw new Error('avaliacoes nao encontradas');
        const auto = this.rascunhos(d);
        if (r.status === 'rascunho') {
          const { error: e1 } = await sb.from('relatorios_avaliacao').update(auto).eq('id', r.id);
          if (e1) throw new Error(e1.message);
        } else {
          // reabre, reescreve, monta a folha nova e trava de novo
          const { data: ra, error: eR } = await sb.rpc('fn_reabrir_relatorio', { p_tabela: 'relatorios_avaliacao', p_id: r.id });
          if (eR || (ra && ra.erro)) throw new Error(eR ? eR.message : ra.erro);
          const { data: relCompleto } = await sb.from('relatorios_avaliacao').select('*').eq('id', r.id).single();
          const rel = Object.assign({}, relCompleto || r, auto);
          this._anexos = {};
          if (rel.incluir_anexos) for (const pr of d.protocolos) this._anexos[pr.av.protocolo] = await this.capturarAnexo(pr.av.protocolo, d.pac.id);
          const html = this.html(rel, d);
          const { error: e2 } = await sb.from('relatorios_avaliacao').update(Object.assign({}, auto, { html_snapshot: html, status: 'gerado', gerado_em: r.gerado_em || new Date().toISOString(), gerado_por: r.gerado_por || window.CORTEX_SESSAO.user.id })).eq('id', r.id);
          if (e2) throw new Error(e2.message);
        }
        feitos++; log('&#10003; ' + nome + (r.status === 'rascunho' ? ' (rascunho)' : ' (gerado - folha refeita)'));
      } catch (e) { erros++; log('&#10007; ' + nome + ': ' + escaparHtml(e.message), 'var(--st-bad, #B91C1C)'); }
    }
    log('<b style="display:block; margin-top:8px">Pronto: ' + feitos + ' regerado(s)' + (erros ? ', ' + erros + ' com erro' : '') + '.</b>');
    if (prog) prog.insertAdjacentHTML('afterend', '<div class="barra-acoes"><button class="btn btn-primario" onclick="fecharModal()">Fechar</button></div>');
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

  // \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 FOLHA \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  html(rel, d) {
    const A = MODULOS.avaliacoes;
    const fmt = x => x ? new Date(x).toLocaleDateString('pt-BR') : '-';
    const txt = v => escaparHtml(v || '').replace(/\n/g, '<br>');
    const dataAss = rel.gerado_em ? new Date(rel.gerado_em) : new Date(d.av.concluido_em);
    const extenso = dataAss.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
    const proc = (rel.procedimento || '').trim() || this.procedimentoPadrao(d);
    const blocoProt = pr => {
      const cats = pr.atual.areas.map(a => a.area);
      const series = [];
      if (pr.anterior) series.push({ nome: 'AV anterior (' + fmt(pr.anteriorAv.concluido_em) + ')', cor: '#1468B2', valores: cats.map(c => { const x = pr.anterior.areas.find(a => a.area === c); return x ? x.pct : null; }) });
      series.push({ nome: (pr.anterior ? 'AV atual (' : 'AV1 (') + fmt(pr.av.concluido_em) + ')', cor: pr.anterior ? '#E07A2F' : '#1468B2', valores: pr.atual.areas.map(a => a.pct) });
      const grafico = A && A.gBarras ? A.gBarras(cats, series, { legenda: true }) : '';
      return (d.completo ? '<h2 style="margin-top:10px"><span class="ponto deq-teal"></span>' + escaparHtml(this.NOME_PROT[pr.av.protocolo] || pr.av.protocolo) + ' <small>&middot; ' + fmt(pr.av.concluido_em) + '</small></h2>' : '') +
        '<div class="deq-caixa" style="margin-top:6px">' + grafico + '</div>' +
        pr.atual.areas.map(a =>
          '<div class="deq-caixa deq-texto" style="margin-top:6px"><b>' + escaparHtml(this.nomeAreaDoc(a.area)) + (a.pct === null ? '' : ' &ndash; ' + a.pct + '%') + '</b><br>' +
          '<span style="color:var(--eq-cinza)">' + escaparHtml(this.AREA_TEXTO[a.area] || '') + '</span><br>' + txt((rel.areas || {})[this.chaveArea(pr, a.area)]) + '</div>').join('');
    };
    const anexos = rel.incluir_anexos && this._anexos ? d.protocolos.map(pr => this._anexos[pr.av.protocolo] || '').filter(Boolean) : [];
    const sec = (n, t) => '<h2><span class="ponto deq-azul"></span>' + n + ' ' + t + '</h2>';
    return '<div class="doc-eq">' +
      '<div class="deq-cab"><img src="icones/equilibrium.png" alt="Equilibrium">' +
      '  <div class="deq-cab-t"><h1>RELAT&Oacute;RIO &middot; AVALIA&Ccedil;&Atilde;O DO DESENVOLVIMENTO E COMPORTAMENTO INFANTIL</h1><p>Equilibrium Terapia Infantil &middot; Psicoterapia ABA</p></div>' +
      '  <span class="deq-pilula">' + (d.protocolos.some(pr => pr.anterior) ? 'REAVALIA&Ccedil;&Atilde;O' : 'AVALIA&Ccedil;&Atilde;O') + (d.completo ? ' COMPLETA' : '') + '</span></div>' +
      sec('I.', 'Identifica&ccedil;&atilde;o') +
      '<div class="deq-caixa deq-dados" style="grid-template-columns:2fr 1.2fr 1.6fr 1fr' + (rel.mostrar_frequencia ? ' 1fr' : '') + '">' +
      '  <div style="border-bottom:none"><small>Nome</small><b>' + escaparHtml(d.pac.nome) + '</b></div>' +
      '  <div style="border-bottom:none"><small>Data de nascimento</small><b>' + fmt(d.pac.data_nascimento + 'T12:00:00') + ' (' + this.idadeTxt(d.pac.data_nascimento, d.av.concluido_em) + ')</b></div>' +
      '  <div style="border-bottom:none"><small>Psic&oacute;logo respons&aacute;vel</small><b>' + escaparHtml(rel.assinatura_nome || this.ASSINATURA_PADRAO.nome) + '</b></div>' +
      '  <div style="border-bottom:none"><small>Especialidade</small><b>Psicoterapia ABA</b></div>' +
      (rel.mostrar_frequencia ? '  <div style="border-bottom:none"><small>Frequ&ecirc;ncia</small><b>' + (d.freq ? escaparHtml(String(d.freq)) + ' sess&otilde;es semanais' : '&mdash;') + '</b></div>' : '') + '</div>' +
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
  // relatorio ja gerado para este conjunto de avaliacoes?
  geradoPara(ids, tipo) {
    const rels = (MODULOS.avaliacoes && MODULOS.avaliacoes._relAv) || [];
    return rels.find(r => r.tipo === tipo && r.status !== 'rascunho' &&
      (r.avaliacoes_ids || [r.avaliacao_id]).length === ids.length && ids.every(id => (r.avaliacoes_ids || [r.avaliacao_id]).includes(id)));
  },
  // abre direto o documento travado (snapshot), sem passar pela tela de edicao
  async abrirDocumento(ids) {
    ids = Array.isArray(ids) ? ids : [ids];
    const d = await this.dados(ids); if (!d) return;
    const tipo = d.completo ? 'completo' : 'protocolo';
    const { data: rel } = await sb.from('relatorios_avaliacao').select('*').eq('paciente_id', d.pac.id).eq('tipo', tipo)
      .contains('avaliacoes_ids', ids).neq('status', 'rascunho').order('criado_em', { ascending: false }).limit(1).maybeSingle();
    if (!rel) { this.abrirEditor(ids); return; }
    this._rel = rel; this._d = d; this._anexos = {};
    this.doc();
  },

  btnCompleto(concluidas) {
    const porProt = {};
    concluidas.filter(a => ['qadi', 'ss', 'portage'].includes(a.protocolo) && a.origem !== 'importado').forEach(a => {
      if (!porProt[a.protocolo] || String(a.concluido_em) > String(porProt[a.protocolo].concluido_em)) porProt[a.protocolo] = a;
    });
    const ids = Object.values(porProt).map(a => a.id);
    if (ids.length < 2) return '';
    const lista = '[' + ids.map(id => "'" + id + "'").join(',') + ']';
    const g = this.geradoPara(ids, 'completo');
    return g
      ? '<button class="btn btn-primario" onclick="MODULOS.laudo_avaliacao.abrirDocumento(' + lista + ')">&#128196; Documento &middot; relat&oacute;rio completo <span class="selo selo-ok" style="margin-left:6px">gerado</span></button>'
      : '<button class="btn btn-primario" onclick="MODULOS.laudo_avaliacao.abrirEditor(' + lista + ')">&#128203; Relat&oacute;rio completo (' + ids.length + ' protocolos)</button>';
  },

  // botao para a aba Avaliacao: ultima aplicacao concluida do protocolo
  btn(concluidas, protocolo) {
    if (perm('avaliacoes.relatorio') === '') return '';
    const lista = concluidas.filter(a => a.protocolo === protocolo)
      .sort((a, b) => String(b.concluido_em || '').localeCompare(String(a.concluido_em || '')));
    if (!lista.length) return '';
    const g = this.geradoPara([lista[0].id], 'protocolo');
    return g
      ? '<button class="btn-chip" title="Relatorio gerado e travado - abrir o documento" onclick="MODULOS.laudo_avaliacao.abrirDocumento(\'' + lista[0].id + '\')">&#128196; Documento</button>'
      : '<button class="btn-chip" title="Escrever e gerar o relatorio de avaliacao (modelo da clinica)" ' +
        'onclick="MODULOS.laudo_avaliacao.abrirEditor(\'' + lista[0].id + '\')">&#128203; Relat&oacute;rio</button>';
  }
};
