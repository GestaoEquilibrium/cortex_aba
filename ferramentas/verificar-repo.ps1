# ============================================================================
# CORTEX aba — verificação do repositório
# ----------------------------------------------------------------------------
# Confere o que costuma quebrar em silêncio quando um patch é aplicado:
# versões desencontradas, módulo faltando numa página, regra de estilo perdida,
# item de menu apontando para arquivo inexistente.
#
# Nasceu de três erros reais seguidos, todos da mesma família: um sprint montado
# a partir da base errada apagou correções antigas, e nada acusou.
#
# Rode ANTES de publicar:
#     powershell -ExecutionPolicy Bypass -File ferramentas\verificar-repo.ps1
# ============================================================================
$ErrorActionPreference = 'Stop'

$Repo = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path (Join-Path $Repo 'shared'))) {
    $Repo = 'D:\NOVO CORTEX ABA\cortex_app_inicial\cortex_aba_app'
}

$problemas = 0
$avisos    = 0

function Falha($msg)  { Write-Host "  [FALHA]  $msg" -ForegroundColor Red;    $script:problemas++ }
function Aviso($msg)  { Write-Host "  [AVISO]  $msg" -ForegroundColor Yellow; $script:avisos++ }
function Certo($msg)  { Write-Host "  [OK]     $msg" -ForegroundColor Green }

$paginas = Get-ChildItem -Path $Repo -Recurse -Filter *.html |
           Where-Object { $_.FullName -notlike '*_backups_*' }

Write-Host ""
Write-Host "CORTEX aba — verificação do repositório" -ForegroundColor Cyan
Write-Host ("$($paginas.Count) páginas em " + $Repo) -ForegroundColor DarkGray
Write-Host ""

# ── 1. Uma versão por arquivo ────────────────────────────────────────────────
# Página carregando a versão antiga de um módulo é o erro mais difícil de ver:
# a tela abre, só se comporta como na semana passada.
Write-Host "1. Versões dos arquivos compartilhados" -ForegroundColor Cyan
$versoes = @{}
foreach ($p in $paginas) {
    $txt = Get-Content $p.FullName -Raw
    foreach ($m in [regex]::Matches($txt, '([\w\-]+\.(?:js|css))\?v=(\d+)')) {
        $arq = $m.Groups[1].Value; $v = $m.Groups[2].Value
        if (-not $versoes.ContainsKey($arq)) { $versoes[$arq] = @{} }
        if (-not $versoes[$arq].ContainsKey($v)) { $versoes[$arq][$v] = @() }
        $versoes[$arq][$v] += $p.Name
    }
}
$divergentes = 0
foreach ($arq in ($versoes.Keys | Sort-Object)) {
    $vs = $versoes[$arq].Keys
    if ($vs.Count -gt 1) {
        $divergentes++
        $detalhe = ($vs | Sort-Object | ForEach-Object {
            "v=$_ em " + (($versoes[$arq][$_] | Select-Object -First 3) -join ', ')
        }) -join '  |  '
        Falha "$arq com versões diferentes: $detalhe"
    }
}
if ($divergentes -eq 0) { Certo "todas as páginas na mesma versão de cada arquivo" }

# ── 2. Service worker alinhado ───────────────────────────────────────────────
# Se a lista do sw.js apontar versão antiga, o cache serve o arquivo velho e a
# mudança simplesmente não aparece — sem erro nenhum.
Write-Host ""
Write-Host "2. Service worker" -ForegroundColor Cyan
$swPath = Join-Path $Repo 'sw.js'
if (-not (Test-Path $swPath)) {
    Falha "sw.js não encontrado"
} else {
    $sw = Get-Content $swPath -Raw
    $desalinhados = 0
    foreach ($m in [regex]::Matches($sw, "'([\w/\-\.]+)\?v=(\d+)'")) {
        $caminho = $m.Groups[1].Value; $v = $m.Groups[2].Value
        $nome = ($caminho -split '/')[-1]
        if ($versoes.ContainsKey($nome)) {
            $usada = ($versoes[$nome].Keys | Sort-Object)[0]
            if ($v -ne $usada) {
                Falha "sw.js aponta $nome v=$v mas as páginas usam v=$usada — o cache serviria o antigo"
                $desalinhados++
            }
        }
    }
    if ($desalinhados -eq 0) { Certo "lista de pré-carregamento alinhada com as páginas" }

    if ($sw -match "const VERSAO = '([^']+)'") {
        Certo ("versão do cache: " + $Matches[1])
    } else { Falha "sw.js sem constante VERSAO" }
}

# ── 3. Módulos obrigatórios ──────────────────────────────────────────────────
Write-Host ""
Write-Host "3. Módulos em cada página" -ForegroundColor Cyan
$semGuard = @(); $semErros = @(); $semPwa = @(); $semAvisos = @()
foreach ($p in $paginas) {
    $txt = Get-Content $p.FullName -Raw
    $publica = $p.Name -in @('index.html','anamnese.html','offline.html','trocar-senha.html')
    $portal  = $p.FullName -like '*\portal\*'

    if ($txt -match 'supabase_client\.js') {
        if ($txt -notmatch 'erros\.js')  { $semErros += $p.Name }
        if ($p.Name -ne 'offline.html' -and $txt -notmatch 'pwa\.js') { $semPwa += $p.Name }
    }
    if ($txt -match 'sidebar\.js' -and $txt -notmatch 'avisos\.js') { $semAvisos += $p.Name }
    if (-not $publica -and -not $portal -and $txt -match 'app-shell' -and $txt -notmatch 'auth_guard\.js') {
        $semGuard += $p.Name
    }
}
if ($semGuard.Count)  { Falha ("página sem proteção de acesso: " + ($semGuard -join ', ')) }
                 else { Certo "todas as páginas internas com proteção de acesso" }
if ($semErros.Count)  { Aviso ("sem registro de erro: " + ($semErros -join ', ')) }
                 else { Certo "todas registram erro" }
if ($semAvisos.Count) { Aviso ("com menu mas sem avisos: " + ($semAvisos -join ', ')) }
if ($semPwa.Count)    { Aviso ("sem service worker: " + ($semPwa -join ', ')) }

# ── 4. Regras de estilo que já se perderam antes ─────────────────────────────
# Cada linha aqui corresponde a um problema que já aconteceu. Se sumir de novo,
# é porque alguém partiu de uma versão antiga do arquivo.
Write-Host ""
Write-Host "4. Regras de estilo que já se perderam" -ForegroundColor Cyan
$cssPath = Join-Path $Repo 'styles\components.css'
if (-not (Test-Path $cssPath)) {
    Falha "components.css não encontrado"
} else {
    $css = Get-Content $cssPath -Raw
    $regras = @(
        @{ t = 'transform-origin: left bottom';    d = 'marca não escorrega sobre o sino' }
        @{ t = 'flex-direction: column; gap: 7px'; d = 'cartão do usuário empilhado ao recolher' }
        @{ t = 'sidebar-bt { flex: 0 0 auto; }';   d = 'botões do topo não espremem' }
        @{ t = 'scrollbar-width: none';            d = 'menu sem barra de rolagem' }
        @{ t = 'sidebar-grupo-itens';              d = 'grupos recolhíveis' }
        @{ t = 'min-height: 0';                    d = 'menu encolhe sem cortar itens' }
    )
    foreach ($r in $regras) {
        if ($css -match [regex]::Escape($r.t)) { Certo $r.d }
        else { Falha ("regra perdida — " + $r.d + "  (" + $r.t + ")") }
    }

    # a lista de seletores do menu recolhido precisa estar inteira
    if ($css -match '\.sidebar\.recolhida \.sidebar-marca,\s*\r?\n\s*\.sidebar\.recolhida \.sidebar-grupo,') {
        Certo "lista de seletores do menu recolhido está inteira"
    } else {
        Falha "a lista de seletores do menu recolhido foi quebrada — a marca vai vazar"
    }
}

# ── 5. Itens do menu apontam para arquivos existentes ────────────────────────
Write-Host ""
Write-Host "5. Destinos do menu" -ForegroundColor Cyan
$sbPath = Join-Path $Repo 'shared\sidebar.js'
if (-not (Test-Path $sbPath)) {
    Falha "sidebar.js não encontrado"
} else {
    $sb = Get-Content $sbPath -Raw
    $quebrados = @()
    foreach ($m in [regex]::Matches($sb, "href:'([\w/\-\.]+\.html)'")) {
        $alvo = Join-Path $Repo ($m.Groups[1].Value -replace '/', '\')
        if (-not (Test-Path $alvo)) { $quebrados += $m.Groups[1].Value }
    }
    if ($quebrados.Count) { Falha ("menu aponta para arquivo inexistente: " + ($quebrados -join ', ')) }
    else { Certo "todos os itens do menu levam a páginas existentes" }
}

# ── 6. Migrations em sequência ───────────────────────────────────────────────
Write-Host ""
Write-Host "6. Banco de dados" -ForegroundColor Cyan
$dbDir = Join-Path $Repo 'database'
if (-not (Test-Path $dbDir)) {
    Aviso "pasta database/ não encontrada"
} else {
    $migs = Get-ChildItem $dbDir -Filter *.sql |
            Where-Object { $_.Name -match '^\d{2}_' -and $_.Name -notmatch '^(98|99)_' } |
            Sort-Object Name
    $esperado = 1; $furos = @()
    foreach ($m in $migs) {
        $num = [int]($m.Name.Substring(0,2))
        while ($esperado -lt $num) { $furos += ('{0:D2}' -f $esperado); $esperado++ }
        $esperado++
    }
    if ($furos.Count) { Aviso ("faltam migrations: " + ($furos -join ', ')) }
    else { Certo ("$($migs.Count) migrations em sequência, até " + $migs[-1].Name) }

    if (Test-Path (Join-Path $dbDir '98_testes.sql')) { Certo "arquivo de testes presente" }
    else { Aviso "sem 98_testes.sql" }
}

# ── Resultado ────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
if ($problemas -eq 0 -and $avisos -eq 0) {
    Write-Host "  Tudo certo. Pode publicar." -ForegroundColor Green
} elseif ($problemas -eq 0) {
    Write-Host "  $avisos aviso(s), nenhuma falha. Pode publicar." -ForegroundColor Yellow
} else {
    Write-Host "  $problemas falha(s) e $avisos aviso(s)." -ForegroundColor Red
    Write-Host "  Nao publique antes de resolver as falhas." -ForegroundColor Red
}
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if ($problemas -gt 0) { exit 1 }
