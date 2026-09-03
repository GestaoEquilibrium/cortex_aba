// ============================================================================
// CORTEX aba - js/app.js
// Shell: sidebar flutuante por perfil, recolher/expandir, modo claro/escuro.
// Os modulos serao plugados nos proximos sprints.
// ============================================================================

const ICONES = {
  inicio:     '\u2302',
  pacientes:  '\u2661',
  agenda:     '\uD83D\uDCC5',
  avaliacoes: '\u270E',
  programas:  '\uD83D\uDCDA',
  presenca:   '\u2713',
  faltas:     '\u26A0',
  rh:         '\uD83D\uDC65',
  admin:      '\uD83D\uDD11'
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
      icone.textContent = ICONES[item.id] || '\u25CF';

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
