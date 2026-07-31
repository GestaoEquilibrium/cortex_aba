# CORTEX aba — Sprint 43 · verificação do repositório

## Sem SQL e sem mudança de tela

## Por que este sprint existe
As três entregas anteriores foram correções de erros que **eu causei**, todos da mesma
família: montei um sprint a partir da base errada, apaguei correções antigas sem
perceber, e o script de aplicação não acusou nada — ele só conferia se as novidades
chegaram, nunca se o que já existia continuava lá.

Este script confere as duas coisas.

## ferramentas/verificar-repo.ps1

```powershell
powershell -ExecutionPolicy Bypass -File ferramentas\verificar-repo.ps1
```

Rode **antes de publicar**. Ele devolve código de erro quando encontra falha, então dá
para encadear com o `git push`.

### O que verifica

**1. Uma versão por arquivo.** Página carregando a versão antiga de um módulo é o erro
mais difícil de enxergar: a tela abre normalmente, só se comporta como na semana passada.

**2. Service worker alinhado.** Se a lista do `sw.js` apontar versão antiga, o cache serve
o arquivo velho e a mudança simplesmente não aparece — sem erro nenhum na tela.

**3. Módulos obrigatórios.** Página interna sem proteção de acesso é falha grave. Sem
registro de erro ou sem service worker é aviso.

**4. Regras de estilo que já se perderam.** Cada linha corresponde a um problema que
aconteceu de verdade: a marca escorregando sobre o sino, o cartão do usuário não
empilhado, os botões espremidos. E confere se a lista de seletores do menu recolhido
está inteira — foi uma vírgula no lugar errado que quebrou tudo no sprint 41.

**5. Destinos do menu.** Item apontando para arquivo que não existe.

**6. Migrations em sequência.** Furo na numeração significa arquivo perdido.

### Testado
Quebrei o repositório de propósito, um erro por vez, e conferi que ele acusa:

| O que quebrei | Acusou |
|---|---|
| CSS vindo de uma base antiga | 4 regras perdidas |
| Uma página com versão diferente do menu | versão divergente **e** desalinho do sw.js |
| Lista do service worker atrasada | aponta v=6, páginas usam v=8 |
| Lista de seletores partida | "a marca vai vazar" |
| Página apagada mas ainda no menu | destino inexistente |

Os dois primeiros são exatamente os erros que passaram por mim.

## Como usar daqui em diante
No fim de cada aplicação de patch, antes do `git push`:

```powershell
powershell -ExecutionPolicy Bypass -File ferramentas\verificar-repo.ps1
if ($LASTEXITCODE -eq 0) { git add -A; git commit -m "..."; git push }
```

## Arquivos
```
ferramentas/verificar-repo.ps1   novo
```
