// ============================================================================
// CORTEX aba — Documentos do paciente
// ----------------------------------------------------------------------------
// Bucket `documentos` é privado, como o de fotos. Laudo de criança não pode ficar
// acessível por link solto: cada abertura gera um link temporário de 5 minutos.
//
// Diferente das fotos, aqui o arquivo NÃO é reduzido — laudo tem que manter a
// qualidade original para leitura.
// ============================================================================

window.EqDocumentos = (function () {
    'use strict';

    const BUCKET = 'documentos';
    const VALIDADE = 300;                  // 5 minutos
    const MAX_BYTES = 15 * 1024 * 1024;    // 15 MB
    const TIPOS_OK = ['application/pdf','image/jpeg','image/png','image/webp'];

    const ROTULOS = {
        laudo:'Laudo', relatorio_escolar:'Relatório escolar', encaminhamento:'Encaminhamento',
        guia:'Guia / autorização', exame:'Exame', receita:'Receita', outro:'Outro'
    };

    function extensaoDe(nome, mime) {
        const porNome = (nome || '').split('.').pop().toLowerCase();
        if (porNome && porNome.length <= 5) return porNome;
        if (mime === 'application/pdf') return 'pdf';
        if (mime === 'image/png') return 'png';
        if (mime === 'image/webp') return 'webp';
        return 'jpg';
    }

    function tamanhoLegivel(bytes) {
        if (!bytes) return '';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1048576) return Math.round(bytes / 1024) + ' KB';
        return (bytes / 1048576).toFixed(1) + ' MB';
    }

    async function enviar(arquivo, pacienteId) {
        if (!arquivo) throw new Error('Nenhum arquivo escolhido.');
        if (TIPOS_OK.indexOf(arquivo.type) === -1) {
            throw new Error('Aceita apenas PDF, JPG, PNG ou WEBP.');
        }
        if (arquivo.size > MAX_BYTES) {
            throw new Error('Arquivo maior que 15 MB. Reduza antes de enviar.');
        }

        const carimbo = Date.now();
        const ext = extensaoDe(arquivo.name, arquivo.type);
        const caminho = pacienteId + '/' + carimbo + '.' + ext;

        const { error } = await eqClient.storage.from(BUCKET)
            .upload(caminho, arquivo, { contentType: arquivo.type, upsert: false });
        if (error) throw error;

        return { caminho: caminho, mime: arquivo.type, tamanho: arquivo.size };
    }

    async function abrir(caminho) {
        const { data, error } = await eqClient.storage.from(BUCKET)
            .createSignedUrl(caminho, VALIDADE);
        if (error) throw error;
        return data.signedUrl;
    }

    async function remover(caminho) {
        const { error } = await eqClient.storage.from(BUCKET).remove([caminho]);
        if (error) throw error;
    }

    function rotulo(tipo) { return ROTULOS[tipo] || tipo; }

    return { enviar, abrir, remover, rotulo, tamanhoLegivel, ROTULOS };
})();
