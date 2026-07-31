// ============================================================================
// EQ ABA — Fila offline
// ----------------------------------------------------------------------------
// Sala de atendimento raramente tem wi-fi bom e o aplicador está de mãos ocupadas.
// Se a gravação falhar, o registro fica guardado no aparelho e sobe sozinho quando
// a rede volta. O toque na tela nunca espera a resposta do servidor.
//
// Uso:
//   EqFila.gravar('registros_tentativa', linha);   // devolve na hora
//   EqFila.pendentes();                            // quantos aguardam
// ============================================================================

window.EqFila = (function () {
    'use strict';

    const CHAVE = 'eqaba_fila';
    let enviando = false;
    const ouvintes = [];

    function ler() {
        try { return JSON.parse(localStorage.getItem(CHAVE) || '[]'); }
        catch (e) { return []; }
    }
    function escrever(fila) {
        try { localStorage.setItem(CHAVE, JSON.stringify(fila)); } catch (e) {}
        ouvintes.forEach(f => { try { f(fila.length); } catch (e) {} });
    }

    function pendentes() { return ler().length; }
    function aoMudar(fn) { ouvintes.push(fn); }

    // Grava direto; se falhar, guarda para depois. Nunca lança erro para a tela.
    async function gravar(tabela, linha) {
        try {
            const { error } = await eqClient.from(tabela).insert(linha);
            if (error) throw error;
            return { ok: true, offline: false };
        } catch (e) {
            console.warn('EQ ABA: gravação adiada para a fila', e);
            const fila = ler();
            fila.push({ tabela: tabela, linha: linha, quando: Date.now() });
            escrever(fila);
            return { ok: true, offline: true };
        }
    }

    async function sincronizar() {
        if (enviando) return;
        const fila = ler();
        if (!fila.length || !window.eqClient) return;
        enviando = true;
        const restantes = [];
        for (const item of fila) {
            try {
                const { error } = await eqClient.from(item.tabela).insert(item.linha);
                // 23505 = duplicidade: já subiu antes, pode descartar
                if (error && error.code !== '23505') throw error;
            } catch (e) {
                restantes.push(item);
            }
        }
        escrever(restantes);
        enviando = false;
        return { enviados: fila.length - restantes.length, restantes: restantes.length };
    }

    window.addEventListener('online', sincronizar);
    setInterval(sincronizar, 30000);
    setTimeout(sincronizar, 2000);

    return { gravar, sincronizar, pendentes, aoMudar };
})();
