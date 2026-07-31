// ============================================================================
// CORTEX aba — Service Worker
// ----------------------------------------------------------------------------
// Faz o sistema abrir sem internet. A sala de atendimento é justamente onde o
// wi-fi falha, e o aplicador não pode ficar olhando para uma tela em branco.
//
// A ESTRATÉGIA IMPORTA MAIS QUE O CACHE:
//
//   HTML  → rede primeiro, cache como reserva.
//           O sistema muda toda semana. Se o HTML viesse do cache, a equipe
//           ficaria presa numa versão antiga sem saber — o pior tipo de erro,
//           porque parece que está tudo funcionando.
//
//   CSS e JS → cache primeiro, com revalidação em segundo plano.
//           Podem vir do cache com segurança porque carregam ?v=N no endereço:
//           versão nova é um endereço novo, e o cache antigo simplesmente não
//           é usado.
//
//   Supabase → nunca passa por aqui. Dado de paciente não fica em cache do
//           navegador, e resposta de API guardada mostraria informação velha
//           como se fosse atual.
// ============================================================================

const VERSAO = 'cortex-aba-v7';
const CACHE_ESTATICO = VERSAO + '-estatico';
const CACHE_PAGINAS  = VERSAO + '-paginas';

// O essencial para a tela abrir offline.
// Inclui as páginas que o aplicador usa no tablet: sem elas no cache, a primeira
// visita nunca fica guardada — o service worker só assume o controle depois que
// a página já carregou.
const ESSENCIAL = [
    'offline.html',
    'index.html',
    'dashboard.html',
    'sessao/sessao.html',
    'agenda/agenda.html',
    'styles/base.css?v=4',
    'styles/components.css?v=7',
    'shared/supabase_client.js?v=2',
    'shared/erros.js?v=16',
    'shared/tema.js?v=2',
    'shared/confirm_modal.js?v=3',
    'shared/fila_offline.js?v=8',
    'shared/sidebar.js?v=17',
    'shared/auth_guard.js?v=12',
    'shared/pwa.js?v=15',
    'favicon.svg'
];

// Um a um, de propósito: `addAll` é atômico e um único arquivo faltando derruba
// TODO o pré-carregamento, em silêncio. Já aconteceu aqui num teste.
async function precarregar() {
    const cache = await caches.open(CACHE_ESTATICO);
    const resultados = await Promise.allSettled(
        ESSENCIAL.map(async function (url) {
            const resp = await fetch(new Request(url, { cache: 'reload' }));
            if (!resp.ok) throw new Error(url + ' → ' + resp.status);
            await cache.put(url, resp);
        })
    );
    const falhas = resultados.filter(r => r.status === 'rejected');
    if (falhas.length) {
        console.warn('SW: ' + falhas.length + ' arquivo(s) não pré-carregado(s):',
                     falhas.map(f => String(f.reason)));
    }
}

self.addEventListener('install', function (evento) {
    evento.waitUntil(precarregar().then(() => self.skipWaiting()));
});

self.addEventListener('activate', function (evento) {
    evento.waitUntil(
        caches.keys().then(nomes => Promise.all(
            nomes.filter(n => !n.startsWith(VERSAO)).map(n => caches.delete(n))
        )).then(() => self.clients.claim())
    );
});

function ehSupabase(url) {
    return url.hostname.indexOf('supabase.co') !== -1
        || url.hostname.indexOf('supabase.in') !== -1;
}

function ehEstatico(url) {
    return /\.(css|js|svg|png|ico|webmanifest|woff2?)$/i.test(url.pathname);
}

self.addEventListener('fetch', function (evento) {
    const req = evento.request;
    if (req.method !== 'GET') return;

    const url = new URL(req.url);

    // API e autenticação: passa direto, sempre. Nada de dado de paciente em cache.
    if (ehSupabase(url)) return;

    // fontes e bibliotecas de fora: rede, com cache de reserva
    if (url.origin !== self.location.origin) {
        evento.respondWith(
            fetch(req).then(resp => {
                if (resp.ok) {
                    const copia = resp.clone();
                    caches.open(CACHE_ESTATICO).then(c => c.put(req, copia));
                }
                return resp;
            }).catch(() => caches.match(req))
        );
        return;
    }

    // páginas: rede primeiro
    if (req.mode === 'navigate' || req.destination === 'document') {
        evento.respondWith(
            fetch(req).then(resp => {
                const copia = resp.clone();
                caches.open(CACHE_PAGINAS).then(c => c.put(req, copia));
                return resp;
            }).catch(() =>
                caches.match(req)
                    .then(c => c || caches.match(req, { ignoreSearch: true }))
                    .then(c => c || caches.match('offline.html'))
                    .then(c => c || new Response(
                        '<meta charset="utf-8"><p style="font-family:sans-serif;padding:24px">' +
                        'Sem internet e esta página não está guardada no aparelho.</p>',
                        { headers: { 'Content-Type': 'text/html; charset=utf-8' } }))
            )
        );
        return;
    }

    // css e js: cache primeiro, revalidando por trás
    if (ehEstatico(url)) {
        evento.respondWith(
            caches.match(req).then(cacheado => {
                const rede = fetch(req).then(resp => {
                    if (resp.ok) {
                        const copia = resp.clone();
                        caches.open(CACHE_ESTATICO).then(c => c.put(req, copia));
                    }
                    return resp;
                }).catch(() => cacheado);
                return cacheado || rede;
            })
        );
    }
});

// permite à página forçar a troca de versão sem esperar
self.addEventListener('message', function (evento) {
    if (evento.data === 'atualizar') self.skipWaiting();
});
