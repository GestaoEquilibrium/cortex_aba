# EQ ABA — Sprint 1 · banco ligado

## Ordem de execução
1. Rodar o **bloco 1** (já executado) e o **bloco 2** do SQL no SQL Editor do projeto `cortex_aba`.
2. Criar o usuário admin em Authentication → Users e inserir a linha em `profissionais`.
3. Aplicar este patch com o script PowerShell e publicar no git.
4. Abrir `index.html` e entrar com e-mail e senha reais.

## Arquivos deste patch
```
config.js                  credenciais reais do projeto cortex_aba
index.html                 login real (Supabase Auth) — substitui o atalho de perfis
dashboard.html             painel lendo pacientes e sessoes do banco
pacientes/lista.html       lista real + cadastro básico de paciente
shared/supabase_client.js  cliente único (window.eqClient)
shared/auth_guard.js       sessão + vínculo em profissionais + tema + inatividade 15 min
shared/tema.js             perfil agora vem da sessão real
shared/sidebar.js          nome/perfil/equipe da sessão, logout de verdade
```

## O que mudou de comportamento
- Não existe mais o atalho "entrar como" do Sprint 0. Sem usuário no banco, não entra.
- `shared/mock.js` deixa de ser usado por dashboard e pacientes. Continua servindo
  a tela de sessão (`sessao/sessao.html`), que só sai do mock no Sprint 2.
- O painel mostra apenas números que existem de fato. O que ainda não tem tabela
  aparece na lista "ainda não implantado" — nada é estimado.

## Detalhe técnico registrado
Datas são montadas manualmente (`ano-mês-dia` local), sem `toISOString()`, e a idade
é calculada quebrando a string. É o mesmo problema de fuso que ficou pendente no CORTEX
(`calcularIdadeDetalhada`): meia-noite UTC vira o dia anterior em BRT −3. Aqui já nasce certo.
