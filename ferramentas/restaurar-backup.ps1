# ============================================================================
# CORTEX aba — restaurar uma cópia de segurança
# ----------------------------------------------------------------------------
# Lê o arquivo .json baixado em Configurações → Cópia de segurança e gera um .sql
# com os comandos de inserção, na ordem certa de dependência.
#
# Backup que nunca foi restaurado não é backup — é um arquivo que ninguém sabe se
# presta. Rode este script pelo menos uma vez, num projeto Supabase vazio, para
# descobrir agora e não no dia ruim.
#
# Uso:
#     powershell -ExecutionPolicy Bypass -File ferramentas\restaurar-backup.ps1 `
#                -Arquivo caminho\cortex-aba-backup-2026-08-03.json
# ============================================================================
param(
    [Parameter(Mandatory=$true)][string]$Arquivo,
    [string]$Saida = ''
)
$ErrorActionPreference = 'Stop'

if (-not (Test-Path $Arquivo)) { throw "Arquivo não encontrado: $Arquivo" }
if ($Saida -eq '') { $Saida = [IO.Path]::ChangeExtension($Arquivo, '.sql') }

Write-Host ""
Write-Host "Lendo $Arquivo ..." -ForegroundColor Cyan
$dados = Get-Content $Arquivo -Raw | ConvertFrom-Json

# ORDEM IMPORTA: uma tabela só pode entrar depois daquelas de que depende.
# Paciente antes de sessão, sessão antes de tentativa. Fora de ordem, o banco
# recusa por chave estrangeira e a restauração para no meio.
$ordem = @(
    @{ chave='equipes';                tabela='equipes_aba' }
    @{ chave='profissionais';          tabela='profissionais' }
    @{ chave='pacientes';              tabela='pacientes' }
    @{ chave='responsaveis';           tabela='responsaveis' }
    @{ chave='responsaveis_pacientes'; tabela='responsaveis_pacientes' }
    @{ chave='vinculos';               tabela='vinculos_paciente_aplicador' }
    @{ chave='configuracoes';          tabela='configuracoes' }
    @{ chave='bloqueios_agenda';       tabela='bloqueios_agenda' }
    @{ chave='ausencias';              tabela='ausencias_profissional' }
    @{ chave='cronograma';             tabela='cronograma_terapeutico' }
    @{ chave='sessoes';                tabela='sessoes' }
    @{ chave='biblioteca_programas';   tabela='biblioteca_programas' }
    @{ chave='pei';                    tabela='pei' }
    @{ chave='pei_programas';          tabela='pei_programas' }
    @{ chave='pei_alvos';              tabela='pei_alvos' }
    @{ chave='registros_tentativa';    tabela='registros_tentativa' }
    @{ chave='evolucoes';              tabela='evolucoes_diarias' }
    @{ chave='comportamentos';         tabela='comportamentos_alvo' }
    @{ chave='registros_comportamento';tabela='registros_comportamento' }
    @{ chave='planos_manejo';          tabela='planos_manejo' }
    @{ chave='protocolos';             tabela='protocolos_avaliacao' }
    @{ chave='protocolo_dominios';     tabela='protocolo_dominios' }
    @{ chave='protocolo_itens';        tabela='protocolo_itens' }
    @{ chave='avaliacoes';             tabela='avaliacoes' }
    @{ chave='avaliacao_respostas';    tabela='avaliacao_respostas' }
    @{ chave='relatorios';             tabela='relatorios_mensais' }
    @{ chave='orientacoes';            tabela='orientacoes_responsavel' }
    @{ chave='tarefas';                tabela='tarefas' }
    @{ chave='documentos';             tabela='documentos_paciente' }
    @{ chave='termos_modelos';         tabela='termos_modelos' }
    @{ chave='termos_assinaturas';     tabela='termos_assinaturas' }
    @{ chave='anamnese_modelos';       tabela='anamnese_modelos' }
    @{ chave='anamneses';              tabela='anamneses' }
    @{ chave='sondagens';              tabela='sondagens_manutencao' }
    @{ chave='supervisoes';            tabela='supervisoes' }
    @{ chave='reforcadores';           tabela='reforcadores' }
    @{ chave='avaliacoes_preferencia'; tabela='avaliacoes_preferencia' }
    @{ chave='admissoes';              tabela='admissoes' }
    @{ chave='encerramentos';          tabela='encerramentos' }
)

# Em vez de montar cada valor à mão, entrega o bloco JSON inteiro e deixa o
# PostgreSQL converter usando a definição da tabela. A primeira versão tentava
# adivinhar o tipo e quebrava em campo jsonb que guarda texto simples — o
# "08:00" do horário de funcionamento derrubava a restauração inteira.
$sb = New-Object System.Text.StringBuilder
[void]$sb.AppendLine("-- ============================================================================")
[void]$sb.AppendLine("-- CORTEX aba - restauracao a partir de copia de $($dados.gerado_em)")
[void]$sb.AppendLine("-- ----------------------------------------------------------------------------")
[void]$sb.AppendLine("-- ANTES: rode os arquivos 01 a 26 de database/ num projeto VAZIO.")
[void]$sb.AppendLine("-- Este arquivo traz apenas os dados; a estrutura vem de la.")
[void]$sb.AppendLine("--")
[void]$sb.AppendLine("-- Os gatilhos ficam desligados durante a carga: eles validariam conflito de")
[void]$sb.AppendLine("-- horario e recalculariam alvos em cima de dados que ja vem decididos.")
[void]$sb.AppendLine("-- ============================================================================")
[void]$sb.AppendLine("begin;")
[void]$sb.AppendLine("set session_replication_role = replica;")
[void]$sb.AppendLine("")

$total = 0
$resumo = @()

foreach ($item in $ordem) {
    $linhas = $dados.($item.chave)
    if (-not $linhas -or $linhas.Count -eq 0) { continue }

    $json = ($linhas | ConvertTo-Json -Depth 30 -Compress)
    if ($json[0] -ne '[') { $json = "[$json]" }        # tabela com um registro só
    $json = $json.Replace("'", "''")

    [void]$sb.AppendLine("-- $($item.tabela): $($linhas.Count) registro(s)")
    [void]$sb.AppendLine("insert into public.$($item.tabela)")
    [void]$sb.AppendLine("select * from jsonb_populate_recordset(null::public.$($item.tabela), '$json'::jsonb)")
    [void]$sb.AppendLine("on conflict do nothing;")
    [void]$sb.AppendLine("")

    $total += $linhas.Count
    $resumo += [PSCustomObject]@{ Tabela = $item.tabela; Registros = $linhas.Count }
}

[void]$sb.AppendLine("set session_replication_role = origin;")
[void]$sb.AppendLine("commit;")
[void]$sb.AppendLine("")
[void]$sb.AppendLine("-- Confira se os numeros batem com o esperado:")
foreach ($r in $resumo) {
    [void]$sb.AppendLine("--   $($r.Tabela): $($r.Registros)")
}
[void]$sb.AppendLine("select 'pacientes' as tabela, count(*) from public.pacientes")
[void]$sb.AppendLine("union all select 'sessoes', count(*) from public.sessoes")
[void]$sb.AppendLine("union all select 'tentativas', count(*) from public.registros_tentativa;")

Set-Content -Path $Saida -Value $sb.ToString() -Encoding UTF8

Write-Host ""
$resumo | Format-Table -AutoSize
Write-Host ("$total registros em " + $resumo.Count + " tabelas") -ForegroundColor Green
Write-Host ""
Write-Host "Gerado: $Saida" -ForegroundColor Green
Write-Host ""
Write-Host "COMO USAR" -ForegroundColor Cyan
Write-Host "  1. Crie um projeto Supabase VAZIO" -ForegroundColor Gray
Write-Host "  2. Rode database\01 ate database\26, em ordem" -ForegroundColor Gray
Write-Host "  3. Rode este arquivo" -ForegroundColor Gray
Write-Host "  4. Confira se os numeros do fim batem" -ForegroundColor Gray
Write-Host ""
Write-Host "As contas de acesso NAO vem na copia - precisam ser recriadas em Equipe." -ForegroundColor Yellow
Write-Host "Fotos e documentos ficam no Storage e sao baixados a parte." -ForegroundColor Yellow
