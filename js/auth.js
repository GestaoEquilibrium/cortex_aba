// ============================================================================
// CORTEX aba - js/auth.js
// ============================================================================

const ROTULOS_PERFIL = {
  direcao: 'Direcao',
  coordenador: 'Coordenador ABA',
  terapeuta: 'Terapeuta ABA',
  aplicador: 'Aplicador ABA',
  callcenter: 'Call Center',
  suporte: 'Suporte Tecnico',
  familia: 'Familia'
};

// Tema visual por perfil: gestao ambar | equipe violeta | recepcao coral | familia azul
const TEMA_POR_PERFIL = {
  direcao: 'gestao',
  coordenador: 'gestao',
  suporte: 'gestao',
  terapeuta: 'equipe',
  aplicador: 'equipe',
  callcenter: 'recepcao',
  familia: 'familia'
};

async function fazerLogin(evento) {
  evento.preventDefault();

  const botao = document.getElementById('botao-entrar');
  const erro = document.getElementById('erro-login');
  const email = document.getElementById('email').value.trim();
  const senha = document.getElementById('senha').value;

  erro.classList.remove('visivel');
  botao.disabled = true;
  botao.textContent = 'Entrando...';

  const { error } = await sb.auth.signInWithPassword({ email, password: senha });

  if (error) {
    erro.textContent = error.message.includes('Invalid login credentials')
      ? 'E-mail ou senha incorretos. Verifique e tente novamente.'
      : 'Nao foi possivel entrar: ' + error.message;
    erro.classList.add('visivel');
    botao.disabled = false;
    botao.textContent = 'Entrar';
    return;
  }

  window.location.href = 'app.html';
}

// Exige sessao ativa; devolve { user, profile } ou volta ao login
async function exigirSessao() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) {
    window.location.href = 'index.html';
    return null;
  }

  const { data: profile, error } = await sb
    .from('profiles')
    .select('id, nome, perfil, ativo')
    .eq('id', session.user.id)
    .single();

  if (error || !profile || !profile.ativo) {
    await sb.auth.signOut();
    window.location.href = 'index.html';
    return null;
  }

  // Aplica o tema do perfil (cor de acao)
  document.documentElement.setAttribute('data-tema', TEMA_POR_PERFIL[profile.perfil] || 'gestao');

  return { user: session.user, profile };
}

async function sair() {
  await sb.auth.signOut();
  window.location.href = 'index.html';
}

function iniciais(nome) {
  const partes = nome.trim().split(/\s+/);
  const primeira = partes[0] ? partes[0][0] : '';
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
  return (primeira + ultima).toUpperCase();
}
