# CORTEX aba — Sprint 32 · app instalável e funcionando sem internet

## Sem SQL

## O que muda
A fila offline já guardava os registros, mas a página não abria sem rede. Agora abre.

- **Painel, Sessão de hoje, Agenda e Login** funcionam sem internet
- Página nunca visitada mostra uma tela explicando, em vez de erro do navegador
- O sistema pode ser **instalado** no tablet ou celular como aplicativo
- Aviso quando a conexão cai, e sincronização automática quando volta

## Como instalar no tablet
Abrir a Sessão de hoje. Depois de alguns segundos aparece a faixa oferecendo instalar.
Também dá pelo menu do navegador: "Adicionar à tela inicial" no Android, "Compartilhar →
Adicionar à Tela de Início" no iPhone.

Instalado, ele abre sem barra de navegador e tem atalhos para Sessão, Agenda e Tarefas.

## A parte delicada: não ficar preso em versão antiga
O sistema muda toda semana. Um cache mal configurado serviria uma versão velha para
sempre — e o pior é que pareceria estar tudo funcionando.

A estratégia:

| O quê | Como | Por quê |
|---|---|---|
| Páginas | rede primeiro, cache como reserva | atualização chega na hora |
| CSS e JS | cache primeiro, revalidando por trás | carregam `?v=N`; versão nova é endereço novo |
| Supabase | **nunca passa pelo cache** | dado de paciente não fica guardado no navegador |

Quando sai versão nova, aparece uma faixa âmbar pedindo para atualizar. O sistema
também procura atualização a cada 30 minutos de uso.

## Um erro que o teste pegou
Na primeira versão, o pré-carregamento usava `addAll`, que é atômico: **um arquivo
faltando derrubava a lista inteira, em silêncio**. Um favicon ausente deixou o sistema
sem nada em cache, e só apareceu ao derrubar o servidor e tentar abrir.

Agora cada arquivo é guardado individualmente, e o que falhar aparece no console
sem levar os outros junto.

## Manutenção — isto exige atenção
O arquivo `sw.js` tem uma lista com os endereços dos arquivos essenciais, **com a versão
embutida** (`styles/components.css?v=5`).

**Quando eu mudar a versão de um arquivo compartilhado, preciso atualizar essa lista e
subir o `VERSAO` no topo do `sw.js`.** Se esquecer, o cache antigo continua sendo servido.

Está anotado como parte do processo de cada sprint daqui em diante.

## Testado
Com o servidor derrubado: painel, sessão e agenda abriram do cache; página não visitada
mostrou a tela de offline. 15 arquivos pré-carregados.

## Arquivos
```
sw.js              novo — service worker
shared/pwa.js      novo — registro, aviso de versão e instalação
offline.html       novo — tela quando a página não está guardada
site.webmanifest   atalhos e modo aplicativo
demais páginas     carregam o pwa.js
```
