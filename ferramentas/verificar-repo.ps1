# ============================================================================
# CORTEX aba - verificacao do repositorio
# ----------------------------------------------------------------------------
# Confere o que costuma quebrar em silencio quando um patch e aplicado:
# versoes desencontradas, modulo faltando numa pagina, regra de estilo perdida,
# item de menu apontando para arquivo inexistente.
#
# Nasceu de tres erros reais seguidos, todos da mesma familia: um sprint montado
# a partir da base errada apagou correcoes antigas, e nada acusou.
#
# Rode ANTES de publicar:
#     powershell -ExecutionPolicy Bypass -File ferramentas\verificar-repo.ps1
#
# Sem acentos no codigo de proposito: PowerShell 5.1 le .ps1 como ANSI quando o
# arquivo nao tem BOM, e acento vira lixo que pode quebrar a analise.
# ============================================================================
$ErrorActionPreference = 'Stop'

$Repo = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path (Join-Path $Repo 'shared'))) {
    $Repo = 'D:\NOVO CORTEX ABA\cortex_app_inicial\cortex_aba_app'
}

$problemas = 0
$avisos    = 0

function Falha($msg) { Write-Host "  [FALHA]  $msg" -ForegroundColor Red;    $script:problemas++ }
function Aviso($msg) { Write-Host "  [AVISO]  $msg" -ForegroundColor Yellow; $script:avisos++ }
function Certo($msg) { Write-Host "  [OK]     $msg" -ForegroundColor Green }

$paginas = Get-ChildItem -Path $Repo -Recurse -Filter *.html |
           Where-Object { $_.FullName -notlike '*_backups_*' }

Write-Host ''
Write-Host 'CORTEX aba - verificacao do repositorio' -ForegroundColor Cyan
Write-Host ("$($paginas.Count) paginas em " + $Repo) -ForegroundColor DarkGray
Write-Host ''

# --- 1. Uma versao por arquivo ----------------------------------------------
Write-Host '1. Versoes dos arquivos compartilhados' -ForegroundColor Cyan
$versoes = @{}
$padraoVersao = [regex]'([\w\-]+\.(?:js|css))\?v=(\d+)'
foreach ($p in $paginas) {
    $txt = Get-Content $p.FullName -Raw
    foreach ($m in $padraoVersao.Matches($txt)) {
        $arq = $m.Groups[1].Value
        $v   = $m.Groups[2].Value
        if (-not $versoes.ContainsKey($arq)) { $versoes[$arq] = @{} }
        if (-not $versoes[$arq].ContainsKey($v)) { $versoes[$arq][$v] = @() }
        $versoes[$arq][$v] += $p.Name
    }
}
$divergentes = 0
foreach ($arq in ($versoes.Keys | Sort-Object)) {
    $chavesArq = @($versoes[$arq].Keys)
    if ($chavesArq.Count -gt 1) {
        $divergentes = $divergentes + 1
        $partes = @()
        foreach ($v in ($chavesArq | Sort-Object { [int]$_ })) {
            $onde = ($versoes[$arq][$v] | Select-Object -First 3) -join ', '
            $partes += "v=$v em $onde"
        }
        Falha ("$arq com versoes diferentes: " + ($partes -join '  |  '))
    }
}
if ($divergentes -eq 0) { Certo 'todas as paginas na mesma versao de cada arquivo' }

# --- 2. Service worker alinhado ---------------------------------------------
Write-Host ''
Write-Host '2. Service worker' -ForegroundColor Cyan
$swPath = Join-Path $Repo 'sw.js'
if (-not (Test-Path $swPath)) {
    Falha 'sw.js nao encontrado'
} else {
    $sw = Get-Content $swPath -Raw
    $desalinhados = 0
    $padraoSw = [regex]"'([\w/\-\.]+)\?v=(\d+)'"
    foreach ($m in $padraoSw.Matches($sw)) {
        $caminho = $m.Groups[1].Value
        $v       = $m.Groups[2].Value
        $nome    = ($caminho -split '/')[-1]
        if ($versoes.ContainsKey($nome)) {
            # @() e obrigatorio: com uma chave so, o PowerShell devolve texto em vez
            # de lista, e [0] passa a pegar o primeiro CARACTERE - "1" de "16".
            $chaves = @($versoes[$nome].Keys | Sort-Object { [int]$_ })
            $usada  = $chaves[0]
            if ($v -ne $usada) {
                Falha "sw.js aponta $nome v=$v mas as paginas usam v=$usada - o cache serviria o antigo"
                $desalinhados = $desalinhados + 1
            }
        }
    }
    if ($desalinhados -eq 0) { Certo 'lista de pre-carregamento alinhada com as paginas' }

    $padraoVer = [regex]'const VERSAO = .([a-z0-9\-]+).'
    $mv = $padraoVer.Match($sw)
    if ($mv.Success) { Certo ('versao do cache: ' + $mv.Groups[1].Value) }
    else { Falha 'sw.js sem constante VERSAO' }
}

# --- 3. Modulos obrigatorios ------------------------------------------------
Write-Host ''
Write-Host '3. Modulos em cada pagina' -ForegroundColor Cyan
$semGuard  = @()
$semErros  = @()
$semPwa    = @()
$semAvisos = @()
$publicas  = @('index.html','anamnese.html','offline.html','trocar-senha.html')
foreach ($p in $paginas) {
    $txt = Get-Content $p.FullName -Raw
    $ehPublica = $publicas -contains $p.Name
    $ehPortal  = $p.FullName -like '*portal*'

    if ($txt -match 'supabase_client') {
        if ($txt -notmatch 'erros\.js') { $semErros += $p.Name }
        if ($p.Name -ne 'offline.html' -and $txt -notmatch 'pwa\.js') { $semPwa += $p.Name }
    }
    if ($txt -match 'sidebar\.js' -and $txt -notmatch 'avisos\.js') { $semAvisos += $p.Name }
    if ((-not $ehPublica) -and (-not $ehPortal) -and $txt -match 'app-shell' -and $txt -notmatch 'auth_guard') {
        $semGuard += $p.Name
    }
}
if ($semGuard.Count -gt 0) { Falha ('pagina sem protecao de acesso: ' + ($semGuard -join ', ')) }
else { Certo 'todas as paginas internas com protecao de acesso' }
if ($semErros.Count -gt 0)  { Aviso ('sem registro de erro: ' + ($semErros -join ', ')) }
else { Certo 'todas registram erro' }
if ($semAvisos.Count -gt 0) { Aviso ('com menu mas sem avisos: ' + ($semAvisos -join ', ')) }
if ($semPwa.Count -gt 0)    { Aviso ('sem service worker: ' + ($semPwa -join ', ')) }

# --- 4. Regras de estilo que ja se perderam ---------------------------------
Write-Host ''
Write-Host '4. Regras de estilo que ja se perderam' -ForegroundColor Cyan
$cssPath = Join-Path $Repo 'styles\components.css'
if (-not (Test-Path $cssPath)) {
    Falha 'components.css nao encontrado'
} else {
    $css = Get-Content $cssPath -Raw
    $regras = @(
        @{ t = 'transform-origin: left bottom';    d = 'marca nao escorrega sobre o sino' },
        @{ t = 'flex-direction: column; gap: 7px'; d = 'cartao do usuario empilhado ao recolher' },
        @{ t = 'sidebar-bt { flex: 0 0 auto; }';   d = 'botoes do topo nao espremem' },
        @{ t = 'scrollbar-width: none';            d = 'menu sem barra de rolagem' },
        @{ t = 'sidebar-grupo-itens';              d = 'grupos recolhiveis' },
        @{ t = 'min-height: 0';                    d = 'menu encolhe sem cortar itens' }
    )
    foreach ($r in $regras) {
        if ($css.Contains($r.t)) { Certo $r.d }
        else { Falha ('regra perdida - ' + $r.d + '  (' + $r.t + ')') }
    }

    $padraoLista = [regex]'\.sidebar\.recolhida \.sidebar-marca,\s*\r?\n\s*\.sidebar\.recolhida \.sidebar-grupo,'
    if ($padraoLista.IsMatch($css)) {
        Certo 'lista de seletores do menu recolhido esta inteira'
    } else {
        Falha 'a lista de seletores do menu recolhido foi quebrada - a marca vai vazar'
    }
}

# --- 5. Destinos do menu ----------------------------------------------------
Write-Host ''
Write-Host '5. Destinos do menu' -ForegroundColor Cyan
$sbPath = Join-Path $Repo 'shared\sidebar.js'
if (-not (Test-Path $sbPath)) {
    Falha 'sidebar.js nao encontrado'
} else {
    $sb = Get-Content $sbPath -Raw
    $quebrados = @()
    $padraoHref = [regex]"href:'([\w/\-\.]+\.html)'"
    foreach ($m in $padraoHref.Matches($sb)) {
        $rel  = $m.Groups[1].Value -replace '/', '\'
        $alvo = Join-Path $Repo $rel
        if (-not (Test-Path $alvo)) { $quebrados += $m.Groups[1].Value }
    }
    if ($quebrados.Count -gt 0) { Falha ('menu aponta para arquivo inexistente: ' + ($quebrados -join ', ')) }
    else { Certo 'todos os itens do menu levam a paginas existentes' }
}

# --- 6. Migrations em sequencia ---------------------------------------------
Write-Host ''
Write-Host '6. Banco de dados' -ForegroundColor Cyan
$dbDir = Join-Path $Repo 'database'
if (-not (Test-Path $dbDir)) {
    Aviso 'pasta database nao encontrada'
} else {
    $todos = Get-ChildItem $dbDir -Filter *.sql | Sort-Object Name
    $migs = @()
    foreach ($m in $todos) {
        if ($m.Name -match '^[0-9][0-9]_' -and $m.Name -notmatch '^(00|98|99)_') { $migs += $m }
    }
    $esperado = 1
    $furos = @()
    foreach ($m in $migs) {
        $num = [int]$m.Name.Substring(0,2)
        while ($esperado -lt $num) {
            $furos += ('{0:D2}' -f $esperado)
            $esperado = $esperado + 1
        }
        $esperado = $esperado + 1
    }
    if ($furos.Count -gt 0) { Aviso ('faltam migrations: ' + ($furos -join ', ')) }
    else { Certo ("$($migs.Count) migrations em sequencia, ate " + $migs[-1].Name) }

    if (Test-Path (Join-Path $dbDir '98_testes.sql')) { Certo 'arquivo de testes presente' }
    else { Aviso 'sem 98_testes.sql' }
}

# --- Resultado --------------------------------------------------------------
Write-Host ''
Write-Host '========================================' -ForegroundColor Cyan
if ($problemas -eq 0 -and $avisos -eq 0) {
    Write-Host '  Tudo certo. Pode publicar.' -ForegroundColor Green
} elseif ($problemas -eq 0) {
    Write-Host "  $avisos aviso(s), nenhuma falha. Pode publicar." -ForegroundColor Yellow
} else {
    Write-Host "  $problemas falha(s) e $avisos aviso(s)." -ForegroundColor Red
    Write-Host '  Nao publique antes de resolver as falhas.' -ForegroundColor Red
}
Write-Host '========================================' -ForegroundColor Cyan
Write-Host ''

if ($problemas -gt 0) { exit 1 }
