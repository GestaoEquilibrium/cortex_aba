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

    async function chamar(acao, tipo, registroId) {
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
            body: JSON.stringify({ acao: acao, tipo: tipo, registro_id: registroId })
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

    return { criar, redefinir, remover, mostrarSenha };
})();
