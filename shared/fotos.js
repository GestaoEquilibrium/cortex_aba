// ============================================================================
// CORTEX aba — Fotos (pacientes e profissionais)
// ----------------------------------------------------------------------------
// O bucket `fotos` é PRIVADO. Nada de URL pública: cada exibição usa um link
// assinado com validade curta, gerado na hora. Foto de criança não fica
// acessível por link solto.
//
// Uso:
//   const caminho = await EqFotos.enviar(arquivo, 'pacientes', pacienteId);
//   const url     = await EqFotos.link(caminho);
// ============================================================================

window.EqFotos = (function () {
    'use strict';

    const BUCKET = 'fotos';
    const VALIDADE = 60 * 60;          // 1 hora
    const MAX_BYTES = 3 * 1024 * 1024; // 3 MB
    const LADO = 512;                  // reduz antes de enviar
    const cache = {};                  // caminho → { url, expira }

    // Redimensiona e comprime no navegador: foto de celular tem 5 MB e não
    // faz sentido guardar isso para um avatar de 60px.
    function redimensionar(arquivo) {
        return new Promise(function (resolve, reject) {
            const leitor = new FileReader();
            leitor.onerror = () => reject(new Error('Não foi possível ler o arquivo.'));
            leitor.onload = function () {
                const img = new Image();
                img.onerror = () => reject(new Error('Arquivo não é uma imagem válida.'));
                img.onload = function () {
                    const lado = Math.min(img.width, img.height);
                    const cx = (img.width - lado) / 2, cy = (img.height - lado) / 2;
                    const tela = document.createElement('canvas');
                    tela.width = tela.height = LADO;
                    const ctx = tela.getContext('2d');
                    ctx.drawImage(img, cx, cy, lado, lado, 0, 0, LADO, LADO);
                    tela.toBlob(b => b ? resolve(b) : reject(new Error('Falha ao converter a imagem.')),
                                'image/jpeg', 0.85);
                };
                img.src = leitor.result;
            };
            leitor.readAsDataURL(arquivo);
        });
    }

    async function enviar(arquivo, tipo, id) {
        if (!arquivo) throw new Error('Nenhum arquivo escolhido.');
        if (!/^image\/(jpeg|png|webp)$/.test(arquivo.type))
            throw new Error('Use uma imagem JPG, PNG ou WEBP.');
        if (arquivo.size > MAX_BYTES * 4)
            throw new Error('Imagem muito grande. Use uma foto menor que 12 MB.');

        const blob = await redimensionar(arquivo);
        const caminho = tipo + '/' + id + '.jpg';

        const { error } = await eqClient.storage.from(BUCKET)
            .upload(caminho, blob, { upsert: true, contentType: 'image/jpeg' });
        if (error) throw error;

        delete cache[caminho];
        return caminho;
    }

    async function link(caminho) {
        if (!caminho) return null;
        const agora = Date.now();
        if (cache[caminho] && cache[caminho].expira > agora) return cache[caminho].url;
        try {
            const { data, error } = await eqClient.storage.from(BUCKET)
                .createSignedUrl(caminho, VALIDADE);
            if (error) throw error;
            cache[caminho] = { url: data.signedUrl, expira: agora + (VALIDADE - 120) * 1000 };
            return data.signedUrl;
        } catch (e) {
            console.warn('CORTEX aba: não foi possível gerar link da foto', e);
            return null;
        }
    }

    // Vários caminhos de uma vez (listas e cards)
    async function links(caminhos) {
        const unicos = [...new Set((caminhos || []).filter(Boolean))];
        const mapa = {};
        await Promise.all(unicos.map(async c => { mapa[c] = await link(c); }));
        return mapa;
    }

    async function remover(caminho) {
        if (!caminho) return;
        const { error } = await eqClient.storage.from(BUCKET).remove([caminho]);
        if (error) throw error;
        delete cache[caminho];
    }

    function iniciais(nome) {
        const p = (nome || '').trim().split(/\s+/);
        if (!p[0]) return '?';
        return (p[0][0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
    }

    return { enviar, link, links, remover, iniciais };
})();
