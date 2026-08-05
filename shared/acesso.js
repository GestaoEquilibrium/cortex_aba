// ============================================================================
// CORTEX aba — Gestão de acessos
// ----------------------------------------------------------------------------
// Conversa com a Edge Function `criar-acesso`. O navegador nunca toca na chave
// administrativa: ele só manda o pedido com o próprio token, e o servidor
// verifica se quem pediu pode.
//
// Uso:
//   const r = await EqAcesso.criar('profissional', id);
//   if (r.senha) EqAcesso.mostrarSenha(r.email, r.senha);
// ============================================================================

window.EqAcesso = (function () {
    'use strict';

    async function chamar(acao, tipo, registroId, extra) {
        const { data: { session } } = await eqClient.auth.getSession();
        if (!session) throw new Error('Sessão expirada. Entre novamente.');

        const url = SUPABASE_CONFIG.url + '/functions/v1/criar-acesso';
        const resposta = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + session.access_token,
                'apikey': SUPABASE_CONFIG.anonKey
            },
            body: JSON.stringify(Object.assign(
                { acao: acao, tipo: tipo, registro_id: registroId }, extra || {}))
        });

        let dados = {};
        try { dados = await resposta.json(); } catch (e) {}

        if (!resposta.ok) {
            if (resposta.status === 404) {
                throw new Error('A função de acesso ainda não foi publicada no Supabase. ' +
                                'Veja o passo a passo no leia-me do sprint 19.');
            }
            throw new Error(dados.erro || 'Falha ao falar com o servidor (' + resposta.status + ').');
        }
        return dados;
    }

    const criar     = (tipo, id) => chamar('criar', tipo, id);
    const redefinir = (tipo, id) => chamar('redefinir', tipo, id);
    const remover   = (tipo, id) => chamar('remover', tipo, id);

    // Alterar e-mail e definir senha mexem no cadastro e na conta de acesso ao
    // mesmo tempo. Mudar só de um lado deixa a pessoa sem conseguir entrar, e
    // depois ninguém entende por quê.
    const alterarEmail  = (tipo, id, novoEmail) =>
        chamar('alterar_email', tipo, id, { novo_email: novoEmail });
    const definirSenha  = (tipo, id, novaSenha) =>
        chamar('definir_senha', tipo, id, { nova_senha: novaSenha });


    // Caixa para digitar um valor. Existe porque `prompt()` do navegador destoa
    // do resto do sistema e é bloqueado em alguns aparelhos.
    function pedirTexto(opcoes) {
        return new Promise(function (resolve) {
            const o = opcoes || {};
            const fundo = document.createElement('div');
            fundo.style.cssText = 'position:fixed;inset:0;background:rgba(11,26,41,.55);' +
                'backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;' +
                'z-index:9999;padding:18px';
            fundo.innerHTML =
                '<div style="background:var(--surface,#fff);border-radius:18px;padding:24px;' +
                'max-width:420px;width:100%;box-shadow:0 20px 50px rgba(11,26,41,.3)">' +
                '<h3 style="font-size:17px;font-weight:800;margin-bottom:6px">' + (o.titulo || '') + '</h3>' +
                (o.texto ? '<p style="font-size:13px;color:var(--ink-muted,#64748B);line-height:1.55;' +
                           'margin-bottom:14px">' + o.texto + '</p>' : '') +
                '<input id="eqPedirCampo" type="' + (o.tipo || 'text') + '" ' +
                'value="' + String(o.valor || '').replace(/"/g, '&quot;') + '" ' +
                'placeholder="' + (o.exemplo || '') + '" ' +
                'style="width:100%;padding:11px 13px;border:1px solid var(--line,#E2E8F0);' +
                'border-radius:11px;font:inherit;font-size:14px;margin-bottom:6px">' +
                '<div id="eqPedirErro" style="font-size:12px;color:#DC2626;display:none;' +
                'margin-bottom:8px"></div>' +
                '<div style="display:flex;gap:9px;margin-top:12px">' +
                '<button id="eqPedirNao" style="flex:1;padding:11px;border-radius:11px;border:none;' +
                'font:inherit;font-size:13.5px;font-weight:700;cursor:pointer;' +
                'background:var(--surface-alt,#F1F5F9);color:var(--ink,#0F172A)">Cancelar</button>' +
                '<button id="eqPedirSim" style="flex:1;padding:11px;border-radius:11px;border:none;' +
                'font:inherit;font-size:13.5px;font-weight:700;cursor:pointer;' +
                'background:var(--acao,#0F766E);color:#fff">' + (o.confirmar || 'Salvar') + '</button>' +
                '</div></div>';
            document.body.appendChild(fundo);

            const campo = fundo.querySelector('#eqPedirCampo');
            const erro  = fundo.querySelector('#eqPedirErro');
            campo.focus(); campo.select();

            function fechar(v) { fundo.remove(); resolve(v); }
            function confirmar() {
                const v = campo.value.trim();
                const problema = o.validar ? o.validar(v) : null;
                if (problema) {
                    erro.textContent = problema; erro.style.display = 'block';
                    campo.style.borderColor = '#DC2626'; return;
                }
                fechar(v);
            }
            fundo.querySelector('#eqPedirSim').addEventListener('click', confirmar);
            fundo.querySelector('#eqPedirNao').addEventListener('click', function () { fechar(null); });
            campo.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') confirmar();
                if (e.key === 'Escape') fechar(null);
            });
            fundo.addEventListener('click', function (e) { if (e.target === fundo) fechar(null); });
        });
    }

    // Mostra a senha uma vez, com botão de copiar. Ela não fica salva em lugar nenhum.
    function mostrarSenha(email, senha, titulo) {
        const fundo = document.createElement('div');
        fundo.style.cssText = 'position:fixed;inset:0;z-index:210;background:rgba(12,27,42,.55);' +
            'backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:20px';
        fundo.innerHTML = `
            <div style="background:var(--surface,#fff);color:var(--ink,#0C1B2A);border-radius:14px;
                        padding:24px;max-width:430px;width:100%;box-shadow:0 18px 40px rgba(15,23,42,.25)">
                <h3 style="font-size:16px;font-weight:800;margin-bottom:6px">${titulo || 'Acesso criado'}</h3>
                <p style="font-size:12.5px;color:var(--ink-muted,#5C7284);line-height:1.5;margin-bottom:14px">
                    Anote ou copie agora. Por segurança, esta senha não fica guardada e não dá para vê-la de novo —
                    se perder, é só redefinir.
                </p>
                <div style="background:var(--surface-alt,#F7FBF9);border:1px solid var(--line,#DCE7E3);
                            border-radius:10px;padding:13px;margin-bottom:14px">
                    <div style="font-size:10.5px;text-transform:uppercase;letter-spacing:.08em;
                                color:var(--ink-soft,#8DA2AF);font-weight:700">E-mail</div>
                    <div style="font-size:13.5px;margin-bottom:9px;word-break:break-all">${email}</div>
                    <div style="font-size:10.5px;text-transform:uppercase;letter-spacing:.08em;
                                color:var(--ink-soft,#8DA2AF);font-weight:700">Senha temporária</div>
                    <div style="font-size:19px;font-weight:800;letter-spacing:.06em;
                                font-family:ui-monospace,Menlo,monospace" id="eqSenhaTexto">${senha}</div>
                </div>
                <p style="font-size:11.5px;color:var(--st-warn,#D97706);margin-bottom:14px">
                    No primeiro acesso, o sistema pede para trocar a senha.
                </p>
                <div style="display:flex;gap:8px">
                    <button id="eqCopiar" style="flex:1;border:none;border-radius:9px;padding:11px;
                            font:inherit;font-size:13px;font-weight:700;cursor:pointer;
                            background:var(--acao-soft,#E1F1EE);color:var(--acao,#0F766E)">Copiar</button>
                    <button id="eqFechar" style="flex:1;border:none;border-radius:9px;padding:11px;
                            font:inherit;font-size:13px;font-weight:700;cursor:pointer;
                            background:var(--acao,#0F766E);color:#fff">Fechar</button>
                </div>
            </div>`;
        document.body.appendChild(fundo);

        fundo.querySelector('#eqCopiar').addEventListener('click', function () {
            const texto = 'E-mail: ' + email + '\nSenha: ' + senha;
            navigator.clipboard.writeText(texto).then(() => { this.textContent = 'Copiado'; })
                .catch(() => { this.textContent = 'Copie manualmente'; });
        });
        fundo.querySelector('#eqFechar').addEventListener('click', () => fundo.remove());
    }

    return { criar, redefinir, remover, alterarEmail, definirSenha, mostrarSenha, pedirTexto };
})();
