// ============================================================================
// CORTEX aba — Registro de erros
// ----------------------------------------------------------------------------
// Captura o que quebra no navegador e guarda no banco, para a coordenação ver
// depois. Sem isto, "deu erro na sala" vira adivinhação.
//
// Três cuidados que valem mais que a captura em si:
//
//   1. NUNCA atrapalha a pessoa. Se o registro falhar, falha calado. Um erro ao
//      registrar erro não pode virar um segundo problema no meio do atendimento.
//
//   2. LIMPA o que pode carregar dado de paciente. Mensagem de erro às vezes traz
//      trecho do que estava sendo gravado — nome, texto de evolução. Isso não pode
//      ir para uma tabela que a coordenação inteira consulta.
//
//   3. NÃO REPETE. Um erro dentro de um loop geraria centenas de linhas iguais.
// ============================================================================

window.EqErros = (function () {
    'use strict';

    const JA_REGISTRADOS = new Set();
    const MAX_POR_SESSAO = 20;
    let quantidade = 0;

    // Cortes conservadores: na dúvida, some com o trecho.
    function limpar(texto) {
        if (!texto) return '';
        let t = String(texto);

        // endereços com token, chave ou id de paciente
        t = t.replace(/([?&](t|token|key|apikey|id|paciente|access_token)=)[^&\s"']+/gi, '$1***');
        // corpos JSON inteiros: podem trazer nome, telefone, texto de evolução
        t = t.replace(/\{[^{}]{40,}\}/g, '{...}');
        // e-mails
        t = t.replace(/[\w.+-]+@[\w.-]+\.\w+/g, '***@***');
        // token JWT: três blocos separados por ponto. Os pontos quebram a busca
        // por sequência longa, então precisa de regra própria
        t = t.replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.?[A-Za-z0-9_-]*/g, '***token***');
        // outras sequências longas que parecem chave
        t = t.replace(/\b[A-Za-z0-9_-]{40,}\b/g, '***');

        return t.slice(0, 500);
    }

    function pagina() {
        return window.location.pathname.split('/').slice(-2).join('/');
    }

    function navegador() {
        const ua = navigator.userAgent || '';
        const m = ua.match(/(Chrome|Firefox|Safari|Edg|SamsungBrowser)\/([\d.]+)/);
        const plataforma = /Android/i.test(ua) ? 'Android'
                         : /iPhone|iPad/i.test(ua) ? 'iOS'
                         : /Windows/i.test(ua) ? 'Windows'
                         : /Mac/i.test(ua) ? 'Mac' : 'outro';
        return plataforma + (m ? ' · ' + m[1] + ' ' + m[2].split('.')[0] : '');
    }

    async function registrar(mensagem, origem, pilha) {
        try {
            if (quantidade >= MAX_POR_SESSAO) return;
            const msg = limpar(mensagem);
            if (!msg) return;

            const chave = msg.slice(0, 120) + '|' + (origem || '');
            if (JA_REGISTRADOS.has(chave)) return;
            JA_REGISTRADOS.add(chave);
            quantidade++;

            if (!window.eqClient) return;

            await eqClient.from('erros_sistema').insert({
                profissional_id: (window.EqSessao && EqSessao.profissional)
                    ? EqSessao.profissional.id : null,
                pagina: pagina(),
                mensagem: msg,
                origem: limpar(origem).slice(0, 200) || null,
                pilha: pilha ? limpar(pilha).split('\n').slice(0, 4).join('\n') : null,
                navegador: navegador()
            });
        } catch (e) {
            // silêncio de propósito: registrar erro não pode virar erro
        }
    }

    // erro solto de JavaScript
    window.addEventListener('error', function (e) {
        if (!e) return;
        // falha ao carregar imagem ou arquivo entra com o endereço
        if (e.target && e.target !== window && e.target.tagName) {
            registrar('Falha ao carregar ' + e.target.tagName.toLowerCase(),
                      e.target.src || e.target.href, null);
            return;
        }
        registrar(e.message, (e.filename || '') + ':' + (e.lineno || ''),
                  e.error && e.error.stack);
    }, true);

    // promessa rejeitada sem tratamento — o caso mais comum com Supabase
    window.addEventListener('unhandledrejection', function (e) {
        const r = e.reason;
        registrar(
            (r && (r.message || r.error_description || r.msg)) || String(r),
            'promessa não tratada',
            r && r.stack
        );
    });

    // para as telas chamarem quando pegam um erro e querem deixar registro
    function anotar(contexto, erro) {
        registrar(
            contexto + ': ' + ((erro && erro.message) || String(erro || '')),
            'anotado pela tela',
            erro && erro.stack
        );
    }

    return { registrar, anotar, limpar };
})();
