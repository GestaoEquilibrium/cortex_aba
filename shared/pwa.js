// ============================================================================
// CORTEX aba — PWA
// ----------------------------------------------------------------------------
// Registra o service worker, avisa quando há versão nova e oferece a instalação
// como aplicativo.
//
// O aviso de versão nova existe porque o pior cenário de um app instalado é a
// equipe usar uma versão antiga achando que está tudo certo. Aqui, quando sai
// atualização, aparece uma faixa pedindo para recarregar.
// ============================================================================

window.EqPWA = (function () {
    'use strict';

    let promptInstalar = null;
    let registro = null;

    function raiz() {
        const pastas = ['pacientes','sessao','portal','agenda','programas','avaliacoes','graficos',
                        'comportamento','tarefas','relatorios','equipe','configuracoes','auditoria',
                        'indicadores','supervisao','admissao'];
        const partes = window.location.pathname.split('/').filter(Boolean);
        let subir = 0;
        partes.forEach(p => { if (pastas.includes(p)) subir++; });
        return '../'.repeat(subir);
    }

    function faixa(texto, rotulo, aoClicar, cor) {
        if (document.getElementById('eqFaixaPwa')) return;
        const f = document.createElement('div');
        f.id = 'eqFaixaPwa';
        f.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:16px;z-index:300;' +
            'background:' + (cor || 'var(--acao,#0F766E)') + ';color:#fff;border-radius:12px;' +
            'padding:12px 16px;display:flex;align-items:center;gap:14px;max-width:calc(100% - 32px);' +
            'box-shadow:0 10px 28px rgba(15,23,42,.28);font-size:13px;font-weight:600';
        f.innerHTML = `<span style="flex:1">${texto}</span>
            <button style="border:none;background:rgba(255,255,255,.22);color:#fff;border-radius:8px;
                    padding:8px 14px;font:inherit;font-size:12.5px;font-weight:700;cursor:pointer;
                    white-space:nowrap">${rotulo}</button>
            <button aria-label="fechar" style="border:none;background:transparent;color:rgba(255,255,255,.8);
                    font-size:18px;line-height:1;cursor:pointer;padding:0 2px">×</button>`;
        document.body.appendChild(f);
        const [bt, fechar] = f.querySelectorAll('button');
        bt.addEventListener('click', () => { aoClicar(); f.remove(); });
        fechar.addEventListener('click', () => f.remove());
    }

    async function registrar() {
        if (!('serviceWorker' in navigator)) return;
        // exige HTTPS; em localhost o navegador libera
        if (location.protocol !== 'https:' && location.hostname !== 'localhost') return;

        try {
            registro = await navigator.serviceWorker.register(raiz() + 'sw.js');

            // versão nova esperando para entrar
            registro.addEventListener('updatefound', function () {
                const novo = registro.installing;
                if (!novo) return;
                novo.addEventListener('statechange', function () {
                    if (novo.state === 'installed' && navigator.serviceWorker.controller) {
                        faixa('Uma versão nova do sistema está disponível.', 'Atualizar', function () {
                            novo.postMessage('atualizar');
                            location.reload();
                        }, 'var(--st-warn,#D97706)');
                    }
                });
            });

            // procura atualização a cada 30 minutos de uso
            setInterval(() => { try { registro.update(); } catch (e) {} }, 30 * 60 * 1000);

        } catch (e) {
            console.warn('CORTEX aba: service worker não registrado', e);
        }
    }

    // instalação como aplicativo
    window.addEventListener('beforeinstallprompt', function (e) {
        e.preventDefault();
        promptInstalar = e;
        // só oferece na tela de sessão: é a que roda no tablet, na sala
        const naSessao = location.pathname.indexOf('sessao') !== -1;
        const jaRecusou = (function () {
            try { return localStorage.getItem('eqaba_instalar_recusado') === '1'; }
            catch (er) { return false; }
        })();
        if (naSessao && !jaRecusou) {
            setTimeout(function () {
                faixa('Instale o CORTEX aba no aparelho para abrir mais rápido e funcionar sem internet.',
                      'Instalar', instalar);
                const f = document.getElementById('eqFaixaPwa');
                if (f) f.querySelectorAll('button')[1].addEventListener('click', function () {
                    try { localStorage.setItem('eqaba_instalar_recusado','1'); } catch (er) {}
                });
            }, 2500);
        }
    });

    async function instalar() {
        if (!promptInstalar) return false;
        promptInstalar.prompt();
        const escolha = await promptInstalar.userChoice;
        promptInstalar = null;
        return escolha.outcome === 'accepted';
    }

    function podeInstalar() { return !!promptInstalar; }

    function instalado() {
        return window.matchMedia('(display-mode: standalone)').matches
            || window.navigator.standalone === true;
    }

    // avisa quando a conexão cai e quando volta
    window.addEventListener('offline', function () {
        faixa('Sem internet. Você pode continuar registrando — nada se perde.',
              'Entendi', function () {}, 'var(--st-warn,#D97706)');
    });
    window.addEventListener('online', function () {
        const f = document.getElementById('eqFaixaPwa');
        if (f) f.remove();
        if (window.EqFila) EqFila.sincronizar();
    });

    registrar();

    return { instalar, podeInstalar, instalado };
})();
