# CORTEX aba

Sistema de gestao de psicoterapia ABA da Equilibrium Terapia Infantil (Uberlandia - MG).

Stack: Supabase (PostgreSQL + Edge Functions + Storage) | HTML + Vanilla JS | GitHub Pages

## Sprint 1 - Fundacao

Conteudo deste sprint:
- `index.html` - tela de login
- `app.html` - shell do sistema (sidebar por perfil + area principal)
- `assets/css/cortex.css` - identidade visual base
- `assets/js/config.js` - configuracao do Supabase (**colar a chave anon aqui**)
- `assets/js/auth.js` - autenticacao
- `assets/js/app.js` - montagem da sidebar por perfil

## Instalacao

1. Copiar todos os arquivos para a raiz do repositorio `GestaoEquilibrium/cortex_aba`
2. Colar a chave anon em `assets/js/config.js`
3. Executar o SQL do Sprint 1 (enviado inline no chat) no SQL Editor do Supabase
4. Criar a Edge Function `criar-acesso` pelo Dashboard (codigo inline no chat), com **Verify JWT desativado**
5. Criar o primeiro usuario (direcao) pelo Dashboard e executar o SQL de promocao
6. Commit e push - o GitHub Pages publica automaticamente

## Perfis

direcao | coordenador | terapeuta | aplicador | callcenter | suporte | familia
