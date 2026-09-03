# CORTEX aba

Sistema de gestao de psicoterapia ABA da Equilibrium Terapia Infantil (Uberlandia - MG).

Stack: Supabase (PostgreSQL + Edge Functions + Storage) | HTML + Vanilla JS | GitHub Pages

## Identidade visual

- Marca: CORTEX com "aba" manuscrito (Caveat), simbolo de neuronio
- Fundo com dots: 14px de espacamento, 10% de intensidade (7% no escuro)
- Sidebar escura flutuante: descolada 12px da borda, cantos 18px, recolhivel para 78px
- Modo claro/escuro: escolha salva no aparelho, aplicada antes da pagina pintar
- Cor por area, nao decoracao: verde em dia | azul agenda/equipe | ambar atencao |
  vermelho atraso/falta | roxo familia/portal (fixas nos dois modos)
- Raio 18px, sombras em 3 niveis, transicoes com overshoot

## Estrutura

- `index.html` - login
- `app.html` - shell (sidebar flutuante por perfil + area principal)
- `styles/base.css` - tokens, modos, dots, reset
- `styles/components.css` - sidebar, cartoes, botoes, campos, selos, heroi
- `js/modo.js` - modo claro/escuro sem piscar
- `js/config.js` - configuracao do Supabase (**colar a chave anon aqui**)
- `js/auth.js` - autenticacao e tema por perfil
- `js/app.js` - shell: navegacao, recolher menu, saudacao

## Perfis

direcao | coordenador | terapeuta | aplicador | callcenter | suporte | familia

Temas: coordenacao (verde) = direcao, coordenador, suporte | equipe (azul) =
terapeuta, aplicador, callcenter | familia (roxo)
