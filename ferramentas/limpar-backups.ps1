# ============================================================================
# CORTEX aba — limpeza das pastas de backup
# ----------------------------------------------------------------------------
# Cada sprint cria uma pasta _backups_sprintN_data dentro do repositório. Depois
# de 32 sprints elas ocupam espaço e poluem o git status.
#
# Este script mantém as N mais recentes e apaga o resto. Mostra o que vai fazer
# antes de fazer.
# ============================================================================
$ErrorActionPreference = 'Stop'

$Repo   = 'D:\NOVO CORTEX ABA\cortex_app_inicial\cortex_aba_app'
$Manter = 3          # quantas pastas mais recentes preservar

if (-not (Test-Path $Repo)) { throw "Repositório não encontrado: $Repo" }

$pastas = Get-ChildItem -Path $Repo -Directory -Filter '_backups_*' |
          Sort-Object LastWriteTime -Descending

if ($pastas.Count -eq 0) {
    Write-Host "Nenhuma pasta de backup encontrada." -ForegroundColor Green
    exit
}

$tamanhoTotal = 0
$pastas | ForEach-Object {
    $t = (Get-ChildItem $_.FullName -Recurse -File | Measure-Object -Property Length -Sum).Sum
    $tamanhoTotal += $t
}

Write-Host ""
Write-Host ("Encontradas {0} pastas, ocupando {1:N1} MB" -f $pastas.Count, ($tamanhoTotal/1MB)) -ForegroundColor Cyan
Write-Host ""

$preservar = $pastas | Select-Object -First $Manter
$apagar    = $pastas | Select-Object -Skip $Manter

Write-Host "PRESERVAR (as $Manter mais recentes):" -ForegroundColor Green
$preservar | ForEach-Object {
    Write-Host ("   " + $_.Name + "   " + $_.LastWriteTime.ToString('dd/MM/yyyy HH:mm')) -ForegroundColor DarkGray
}

if ($apagar.Count -eq 0) {
    Write-Host ""
    Write-Host "Nada a apagar." -ForegroundColor Green
    exit
}

Write-Host ""
Write-Host "APAGAR ($($apagar.Count) pastas):" -ForegroundColor Yellow
$apagar | ForEach-Object {
    Write-Host ("   " + $_.Name + "   " + $_.LastWriteTime.ToString('dd/MM/yyyy HH:mm')) -ForegroundColor DarkGray
}

$liberado = 0
$apagar | ForEach-Object {
    $liberado += (Get-ChildItem $_.FullName -Recurse -File | Measure-Object -Property Length -Sum).Sum
}
Write-Host ""
Write-Host ("Isso libera {0:N1} MB." -f ($liberado/1MB)) -ForegroundColor Cyan
Write-Host ""
Write-Host "Lembrando: o histórico real está no GitHub. Estas pastas são só rede de" -ForegroundColor DarkGray
Write-Host "segurança local para o caso de um patch dar errado antes do commit." -ForegroundColor DarkGray
Write-Host ""

$ok = Read-Host "Confirma a exclusão? (s/n)"
if ($ok -ne 's') { Write-Host "Cancelado." -ForegroundColor Yellow; exit }

$apagar | ForEach-Object {
    Remove-Item $_.FullName -Recurse -Force
    Write-Host ("   removida: " + $_.Name) -ForegroundColor Green
}

Write-Host ""
Write-Host ("Pronto. {0:N1} MB liberados." -f ($liberado/1MB)) -ForegroundColor Green

# as pastas nunca deveriam ir para o repositório remoto
$gitignore = Join-Path $Repo '.gitignore'
$linha = '_backups_*/'
if (-not (Test-Path $gitignore)) {
    Set-Content -Path $gitignore -Value $linha -Encoding UTF8
    Write-Host "Criado .gitignore ignorando as pastas de backup." -ForegroundColor Green
} elseif ((Get-Content $gitignore -Raw) -notmatch [regex]::Escape($linha)) {
    Add-Content -Path $gitignore -Value "`n$linha"
    Write-Host "Adicionado ao .gitignore: $linha" -ForegroundColor Green
}
