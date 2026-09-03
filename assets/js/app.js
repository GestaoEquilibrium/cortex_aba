// ============================================================
// CORTEX aba - Shell da aplicacao (Sprint 1)
// Monta a sidebar conforme o perfil e a tela inicial.
// Os modulos serao plugados nos proximos sprints.
// ============================================================

// Mapa de navegacao por grupo. "perfis" define quem enxerga o item.
const NAVEGACAO = [
  {
    grupo: 'Assistencial',
    itens: [
      { id: 'inicio',     rotulo: 'Inicio',              icone: '&#8962;',  perfis: ['direcao','coordenador','terapeuta','aplicador','callcenter','suporte'] },
      { id: 'pacientes',  rotulo: 'Pacientes',           icone: '&#9825;', perfis: ['direcao','coordenador','terapeuta','aplicador','callcenter'] },
      { id: 'agenda',     rotulo: 'Agenda',              icone: '&#128197;', perfis: ['direcao','coordenador','terapeuta','aplicador','callcenter'] },
      { id: 'avaliacoes', rotulo: 'Avaliacoes',          icone: '&#9998;',  perfis: ['direcao','coordenador','terapeuta'] },
      { id: 'programas',  rotulo: 'Biblioteca de Programas', icone: '&#128218;', perfis: ['direcao','coordenador','terapeuta','aplicador'] }
    ]
  },
  {
    grupo: 'Gestao',
    itens: [
      { id: 'presenca',   rotulo: 'Lista de Presenca',   icone: '&#10003;', perfis: ['direcao','coordenador','callcenter'] },
      { id: 'faltas',     rotulo: 'Gestao de Faltas',    icone: '&#9888;',  perfis: ['direcao','coordenador'] },
      { id: 'rh',         rotulo: 'RH',                  icone: '&#128101;', perfis: ['direcao','coordenador'] },
      { id: 'admin',      rotulo: 'Usuarios e Acessos',  icone: '&#128273;', perfis: ['direcao','suporte'] }
    ]
  }
];

async function iniciarApp() {
  const sessao = await exigirSessao();
  if (!sessao) return;

  const { profile } = sessao;

  // Identificacao do usuario no rodape da sidebar
  document.getElementById('usuario-nome').textContent = profile.nome;
  document.getElementById('usuario-perfil').textContent = ROTULOS_PERFIL[profile.perfil] || profile.perfil;

  montarSidebar(profile.perfil);

  // Tela inicial (placeholder do Sprint 1)
  document.getElementById('boas-vindas-nome').textContent = profile.nome.split(' ')[0];
}

function montarSidebar(perfil) {
  const nav = document.getElementById('sidebar-nav');
  nav.innerHTML = '';

  NAVEGACAO.forEach(grupo => {
    const itensVisiveis = grupo.itens.filter(i => i.perfis.includes(perfil));
    if (itensVisiveis.length === 0) return;

    const divGrupo = document.createElement('div');
    divGrupo.className = 'nav-grupo';

    const titulo = document.createElement('div');
    titulo.className = 'nav-grupo-titulo';
    titulo.textContent = grupo.grupo;
    divGrupo.appendChild(titulo);

    itensVisiveis.forEach(item => {
      const a = document.createElement('a');
      a.className = 'nav-item' + (item.id === 'inicio' ? ' ativa' : '');
      a.href = '#' + item.id;
      a.innerHTML = '<span class="icone">' + item.icone + '</span>' + item.rotulo;
      a.addEventListener('click', e => {
        e.preventDefault();
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('ativa'));
        a.classList.add('ativa');
        // Modulos serao carregados aqui nos proximos sprints
      });
      divGrupo.appendChild(a);
    });

    nav.appendChild(divGrupo);
  });
}

document.addEventListener('DOMContentLoaded', iniciarApp);
