// ============================================================================
// CORTEX aba — Modal de confirmação compartilhado
// ----------------------------------------------------------------------------
// Obrigatório em TODA ação destrutiva ou que muda o fluxo do atendimento.
// Mesmo padrão do CORTEX (fundo desfocado), lendo as cores do tema ativo.
//
// Uso:
//   const ok = await EqConfirm.mostrar({
//       titulo: 'Marcar falta sem aviso?',
//       texto:  'Isso conta no indicador de absenteísmo do paciente.',
//       confirmar: 'Marcar falta',
//       tipo: 'perigo'          // 'perigo' | 'alerta' | 'padrao'
//   });
//   if (!ok) return;
// ============================================================================

window.EqConfirm = (function () {
    'use strict';

    let estilosInjetados = false;

    function injetarEstilos() {
        if (estilosInjetados) return;
        estilosInjetados = true;
        const css = `
        .eqc-fundo {
            position: fixed; inset: 0; z-index: 200;
            background: rgba(12,27,42,.45); backdrop-filter: blur(4px);
            display: flex; align-items: center; justify-content: center; padding: 20px;
            animation: eqc-entra .16s ease;
        }
        @keyframes eqc-entra { from { opacity: 0 } to { opacity: 1 } }
        .eqc-caixa {
            background: var(--surface, #fff); color: var(--ink, #0C1B2A);
            border-radius: var(--radius-card, 12px); padding: 22px;
            width: 100%; max-width: 420px; box-shadow: 0 18px 40px rgba(15,23,42,.22);
            animation: eqc-sobe .18s cubic-bezier(.4,0,.2,1);
        }
        @keyframes eqc-sobe { from { transform: translateY(8px) } to { transform: none } }
        .eqc-icone {
            width: 40px; height: 40px; border-radius: 12px; margin-bottom: 12px;
            display: flex; align-items: center; justify-content: center;
        }
        .eqc-caixa h3 { font-size: 15.5px; font-weight: 800; margin-bottom: 6px; }
        .eqc-caixa p  { font-size: 13px; color: var(--ink-muted, #5C7284); line-height: 1.5; }
        .eqc-bts { display: flex; gap: 9px; margin-top: 18px; }
        .eqc-bts button {
            flex: 1; border: none; border-radius: 9px; padding: 11px 12px;
            font-family: inherit; font-size: 13px; font-weight: 700; cursor: pointer;
        }
        .eqc-cancelar { background: var(--st-neutro-bg, #F1F5F9); color: var(--ink-muted, #5C7284); }
        .eqc-ok { color: #fff; }`;
        const tag = document.createElement('style');
        tag.textContent = css;
        document.head.appendChild(tag);
    }

    const PALETA = {
        perigo: { cor: 'var(--st-bad, #DC2626)',  fundo: 'var(--st-bad-bg, #FEE2E2)' },
        alerta: { cor: 'var(--st-warn, #D97706)', fundo: 'var(--st-warn-bg, #FEF3C7)' },
        padrao: { cor: 'var(--acao, #0F766E)',    fundo: 'var(--acao-soft, #E1F1EE)' }
    };

    function mostrar(opcoes) {
        injetarEstilos();
        const o = opcoes || {};
        const p = PALETA[o.tipo] || PALETA.padrao;

        return new Promise(function (resolve) {
            const fundo = document.createElement('div');
            fundo.className = 'eqc-fundo';
            fundo.innerHTML = `
                <div class="eqc-caixa" role="alertdialog" aria-modal="true">
                    <div class="eqc-icone" style="background:${p.fundo}">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                             stroke="${p.cor}" stroke-width="2.2" stroke-linecap="round">
                            <path d="M12 8v5M12 17h.01"/><circle cx="12" cy="12" r="9"/>
                        </svg>
                    </div>
                    <h3>${o.titulo || 'Confirmar ação'}</h3>
                    <p>${o.texto || 'Deseja continuar?'}</p>
                    <div class="eqc-bts">
                        <button type="button" class="eqc-cancelar">${o.cancelar || 'Cancelar'}</button>
                        <button type="button" class="eqc-ok" style="background:${p.cor}">${o.confirmar || 'Confirmar'}</button>
                    </div>
                </div>`;

            function fechar(valor) {
                document.removeEventListener('keydown', aoTeclar);
                fundo.remove();
                resolve(valor);
            }
            function aoTeclar(ev) { if (ev.key === 'Escape') fechar(false); }

            fundo.querySelector('.eqc-cancelar').addEventListener('click', () => fechar(false));
            fundo.querySelector('.eqc-ok').addEventListener('click', () => fechar(true));
            fundo.addEventListener('click', ev => { if (ev.target === fundo) fechar(false); });
            document.addEventListener('keydown', aoTeclar);

            document.body.appendChild(fundo);
            fundo.querySelector('.eqc-ok').focus();
        });
    }

    return { mostrar };
})();
