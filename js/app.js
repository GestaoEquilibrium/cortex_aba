// ============================================================================
// CORTEX aba - js/app.js
// Shell: sidebar flutuante por perfil, recolher/expandir, modo claro/escuro.
// Os modulos serao plugados nos proximos sprints.
// ============================================================================

const SVG_ATTR = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';

const ICONES = {
  inicio:     '<svg ' + SVG_ATTR + '><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/></svg>',
  pacientes:  '<svg ' + SVG_ATTR + '><path d="M12 20s-7-4.5-9-9c-1.2-2.8.6-6 3.7-6C8.6 5 10.5 6.4 12 8c1.5-1.6 3.4-3 5.3-3 3.1 0 4.9 3.2 3.7 6-2 4.5-9 9-9 9z"/></svg>',
  agenda:     '<svg ' + SVG_ATTR + '><rect x="3.5" y="5" width="17" height="16" rx="2.5"/><line x1="3.5" y1="10" x2="20.5" y2="10"/><line x1="8" y1="3" x2="8" y2="7"/><line x1="16" y1="3" x2="16" y2="7"/></svg>',
  avaliacoes: '<svg ' + SVG_ATTR + '><path d="M4 20l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19l-4 1z"/></svg>',
  programas:  '<svg ' + SVG_ATTR + '><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5V5.5"/><line x1="9" y1="8" x2="15" y2="8"/></svg>',
  presenca:   '<svg ' + SVG_ATTR + '><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8.5 12.5l2.5 2.5 5-5.5"/></svg>',
  faltas:     '<svg ' + SVG_ATTR + '><path d="M12 4 2.8 19.5h18.4z"/><line x1="12" y1="10" x2="12" y2="14"/><circle cx="12" cy="16.8" r=".4"/></svg>',
  rh:         '<svg ' + SVG_ATTR + '><circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 19.5c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5"/><circle cx="17" cy="9.5" r="2.4"/><path d="M15.8 14.7c2.6.2 4.2 1.8 4.7 4.3"/></svg>',
  admin:      '<svg ' + SVG_ATTR + '><circle cx="8.5" cy="12" r="4"/><path d="M12.5 12H21M18 12v3M15.5 12v2"/></svg>'
};

const NAVEGACAO = [
  {
    grupo: 'ASSISTENCIAL',
    itens: [
      { id: 'inicio',     rotulo: 'Inicio',       perfis: ['direcao','coordenador','terapeuta','aplicador','callcenter','suporte'] },
      { id: 'pacientes',  rotulo: 'Pacientes',    perfis: ['direcao','coordenador','terapeuta','aplicador','callcenter'] },
      { id: 'agenda',     rotulo: 'Agenda',       perfis: ['direcao','coordenador','terapeuta','aplicador','callcenter'] },
      { id: 'avaliacoes', rotulo: 'Avaliacoes',   perfis: ['direcao','coordenador','terapeuta'] },
      { id: 'programas',  rotulo: 'Programas',    perfis: ['direcao','coordenador','terapeuta','aplicador'] }
    ]
  },
  {
    grupo: 'GESTAO',
    itens: [
      { id: 'presenca', rotulo: 'Lista de Presenca', perfis: ['direcao','coordenador','callcenter'] },
      { id: 'faltas',   rotulo: 'Gestao de Faltas',  perfis: ['direcao','coordenador'] },
      { id: 'rh',       rotulo: 'RH',                perfis: ['direcao','coordenador'] },
      { id: 'admin',    rotulo: 'Usuarios e Acessos', perfis: ['direcao','suporte'] }
    ]
  }
];

async function iniciarApp() {
  const sessao = await exigirSessao();
  if (!sessao) return;

  const { profile } = sessao;

  document.getElementById('usuario-nome').textContent = profile.nome;
  document.getElementById('usuario-perfil').textContent = ROTULOS_PERFIL[profile.perfil] || profile.perfil;
  document.getElementById('avatar').textContent = iniciais(profile.nome);

  montarSidebar(profile.perfil);

  // Saudacao conforme a hora
  const hora = new Date().getHours();
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
  document.getElementById('saudacao').textContent =
    saudacao + ', ' + profile.nome.split(' ')[0] + '!';

  const hoje = new Date().toLocaleDateString('pt-BR',
    { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  document.getElementById('data-hoje').textContent =
    hoje.charAt(0).toUpperCase() + hoje.slice(1);

  // Restaura estado recolhido da sidebar
  try {
    if (localStorage.getItem('cortex_sidebar') === 'recolhida') {
      document.getElementById('shell').classList.add('recolhida');
    }
  } catch (e) {}

  // Icone inicial do botao de modo
  const botaoModo = document.getElementById('botao-modo');
  if (botaoModo) {
    botaoModo.textContent =
      document.documentElement.getAttribute('data-modo') === 'escuro' ? '\u2600' : '\u263E';
  }
}

function montarSidebar(perfil) {
  const nav = document.getElementById('sidebar-nav');
  nav.innerHTML = '';

  NAVEGACAO.forEach(grupo => {
    const itensVisiveis = grupo.itens.filter(i => i.perfis.includes(perfil));
    if (itensVisiveis.length === 0) return;

    const titulo = document.createElement('div');
    titulo.className = 'nav-grupo-titulo';
    titulo.textContent = grupo.grupo;
    nav.appendChild(titulo);

    itensVisiveis.forEach(item => {
      const a = document.createElement('a');
      a.className = 'nav-item' + (item.id === 'inicio' ? ' ativa' : '');
      a.href = '#' + item.id;
      a.title = item.rotulo;

      const icone = document.createElement('span');
      icone.className = 'icone';
      icone.innerHTML = ICONES[item.id] || '';

      const texto = document.createElement('span');
      texto.textContent = item.rotulo;

      a.appendChild(icone);
      a.appendChild(texto);

      a.addEventListener('click', e => {
        e.preventDefault();
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('ativa'));
        a.classList.add('ativa');
        // Modulos serao carregados aqui nos proximos sprints
      });

      nav.appendChild(a);
    });
  });
}

function alternarSidebar() {
  const shell = document.getElementById('shell');
  shell.classList.toggle('recolhida');
  try {
    localStorage.setItem('cortex_sidebar',
      shell.classList.contains('recolhida') ? 'recolhida' : 'aberta');
  } catch (e) {}
}

document.addEventListener('DOMContentLoaded', iniciarApp);
