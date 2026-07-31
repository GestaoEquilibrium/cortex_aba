// ============================================================================
// CORTEX aba — WhatsApp
// ----------------------------------------------------------------------------
// Abre a conversa com o responsável, com a mensagem já escrita. Não é integração
// paga: monta o link wa.me e deixa a pessoa revisar antes de enviar — o que é
// melhor mesmo, porque quem fala com a família é gente, não sistema.
//
// Uso:
//   EqWhats.abrir(telefone, EqWhats.textos.falta({ crianca, data }));
//   EqWhats.botao(telefone, texto, 'Avisar família')   → HTML do botão
// ============================================================================

window.EqWhats = (function () {
    'use strict';

    // Número brasileiro: tira tudo que não é dígito e garante o 55 na frente.
    // Fixo de 8 dígitos e celular sem o 9 continuam funcionando — quem valida é o WhatsApp.
    function normalizar(telefone) {
        let n = String(telefone || '').replace(/\D/g, '');
        if (!n) return null;
        if (n.length <= 11) n = '55' + n;      // sem código do país
        if (n.length < 12) return null;        // curto demais para ser válido
        return n;
    }

    function temNumero(telefone) { return !!normalizar(telefone); }

    function link(telefone, texto) {
        const n = normalizar(telefone);
        if (!n) return null;
        return 'https://wa.me/' + n + (texto ? '?text=' + encodeURIComponent(texto) : '');
    }

    function abrir(telefone, texto) {
        const url = link(telefone, texto);
        if (!url) return false;
        window.open(url, '_blank', 'noopener');
        return true;
    }

    function botao(telefone, texto, rotulo, estilo) {
        const url = link(telefone, texto);
        if (!url) {
            return `<span class="tiny soft" title="Cadastre o telefone do responsável na ficha">
                        sem telefone cadastrado</span>`;
        }
        return `<a class="btn btn-secundario" target="_blank" rel="noopener" href="${url}"
                   style="${estilo || 'padding:6px 12px;font-size:12px'};text-decoration:none;
                          display:inline-flex;align-items:center;gap:6px">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2a10 10 0 0 0-8.6 15l-1.3 4.7 4.8-1.3A10 10 0 1 0 12 2zm5.8 14.2c-.2.7-1.4 1.3-2 1.4-.5.1-1.1.1-1.8-.1-.4-.1-1-.3-1.7-.6-3-1.3-4.9-4.3-5-4.5-.2-.2-1.2-1.6-1.2-3s.7-2.1 1-2.4c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.3 0 .5l-.4.5-.3.3c-.1.1-.2.3 0 .5.1.2.6 1 1.3 1.7.9.8 1.6 1 1.9 1.2.2.1.4 0 .5-.1l.7-.8c.2-.2.3-.2.5-.1l2 .9c.2.1.4.2.4.3.1.2.1.7-.1 1.4z"/>
                    </svg>${rotulo || 'WhatsApp'}</a>`;
    }

    function primeiroNome(nome) { return String(nome || '').trim().split(/\s+/)[0] || ''; }
    function dataBR(iso) { return iso ? iso.slice(0,10).split('-').reverse().join('/') : ''; }

    // Textos base. Todos abrem espaço para a pessoa ajustar antes de enviar —
    // mensagem sobre criança não deve soar automática.
    const textos = {
        confirmacao: function (d) {
            return 'Olá! Aqui é da ' + (d.clinica || 'clínica') + '. ' +
                   'Passando para confirmar o atendimento de ' + primeiroNome(d.crianca) +
                   ' no dia ' + dataBR(d.data) + (d.hora ? ' às ' + d.hora.slice(0,5) : '') + '. ' +
                   'Podemos contar com vocês?';
        },
        falta: function (d) {
            return 'Olá! Aqui é da ' + (d.clinica || 'clínica') + '. ' +
                   'Sentimos falta de ' + primeiroNome(d.crianca) + ' no atendimento de ' +
                   dataBR(d.data) + '. Está tudo bem? ' +
                   'Se precisarem remarcar, é só nos avisar.';
        },
        faltasSeguidas: function (d) {
            return 'Olá! Aqui é da ' + (d.clinica || 'clínica') + '. ' +
                   'Notamos que ' + primeiroNome(d.crianca) + ' faltou nos últimos atendimentos. ' +
                   'Gostaríamos de entender se há alguma dificuldade e ver como podemos ajudar — ' +
                   'a continuidade faz muita diferença no resultado do trabalho.';
        },
        atividade: function (d) {
            return 'Olá! Enviamos uma nova atividade para fazer em casa com ' +
                   primeiroNome(d.crianca) + '. Ela está disponível no portal da família. ' +
                   'Qualquer dúvida, estamos à disposição.';
        },
        relatorio: function (d) {
            return 'Olá! O relatório mensal de ' + primeiroNome(d.crianca) +
                   ' já está disponível no portal da família. ' +
                   'Se quiserem conversar sobre ele, podemos agendar um horário.';
        },
        documento: function (d) {
            return 'Olá! Aqui é da ' + (d.clinica || 'clínica') + '. ' +
                   'Precisamos de um documento atualizado de ' + primeiroNome(d.crianca) +
                   (d.documento ? ' (' + d.documento + ')' : '') + '. ' +
                   'Vocês conseguem nos enviar?';
        },
        guia: function (d) {
            return 'Olá! A guia de ' + primeiroNome(d.crianca) + ' ' +
                   (d.validade ? 'venceu em ' + dataBR(d.validade) : 'está vencida') + '. ' +
                   'Para não interromper os atendimentos, precisamos da renovação junto ao convênio.';
        },
        anamnese: function (d) {
            return 'Olá! Segue o link da anamnese de ' + primeiroNome(d.crianca) +
                   '. É pelo celular mesmo, sem senha, e dá para parar no meio e continuar depois: ' +
                   (d.link || '');
        },
        livre: function (d) {
            return 'Olá! Aqui é da ' + (d.clinica || 'clínica') + '. ';
        }
    };

    return { normalizar, temNumero, link, abrir, botao, textos, primeiroNome, dataBR };
})();
