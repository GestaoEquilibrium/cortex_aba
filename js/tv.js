// ============================================================================
// CORTEX aba - js/tv.js
// Painel do Dia: atualiza sozinho, toca som quando ha novo check-in e
// remove da tela as sessoes concluidas/faltas/canceladas.
// Requer sessao de qualquer perfil interno (logar uma vez na TV).
// ============================================================================

let TV_CHECKINS_VISTOS = new Set();
let TV_PRIMEIRA_CARGA = true;
let TV_AUDIO = null;

function iniciarPainel() {
  // Gesto do usuario habilita o audio e a tela cheia
  TV_AUDIO = new (window.AudioContext || window.webkitAudioContext)();
  if (document.documentElement.requestFullscreen) {
    document.documentElement.requestFullscreen().catch(() => {});
  }
  document.getElementById('tv-inicio').style.display = 'none';
  document.getElementById('tv-painel').style.display = 'flex';

  atualizarRelogio();
  setInterval(atualizarRelogio, 1000);

  cicloTV();
  setInterval(cicloTV, 10000);
}

async function verificarSessaoTV() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) {
    document.getElementById('tv-inicio-msg').innerHTML =
      'Nenhum usuario conectado neste aparelho.<br>' +
      'Entre uma vez pelo <a href="index.html">login do CORTEX</a> e volte a esta pagina.';
    return null;
  }
  return session;
}

function atualizarRelogio() {
  const agora = new Date();
  document.getElementById('tv-relogio').textContent =
    String(agora.getHours()).padStart(2, '0') + ':' + String(agora.getMinutes()).padStart(2, '0');
  const d = agora.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
  document.getElementById('tv-data').textContent = d.charAt(0).toUpperCase() + d.slice(1);
}

async function cicloTV() {
  const sessaoOk = await verificarSessaoTV();
  if (!sessaoOk) {
    document.getElementById('tv-inicio').style.display = 'flex';
    document.getElementById('tv-painel').style.display = 'none';
    return;
  }

  const hoje = new Date().toISOString().slice(0, 10);

  // Garante que a grade do dia virou sessoes (idempotente)
  if (TV_PRIMEIRA_CARGA) {
    await sb.rpc('gerar_sessoes_do_dia', { p_data: hoje });
  }

  const { data: sessoes, error } = await sb
    .from('sessoes')
    .select('id, hora_inicio, status, pacientes(nome), profissional:profiles!sessoes_aplicador_id_fkey(nome), salas(nome)')
    .eq('data', hoje)
    .order('hora_inicio');

  if (error) {
    document.getElementById('tv-rodape').textContent = 'Erro ao atualizar: ' + error.message;
    return;
  }

  const grupos = { agendada: [], checkin: [], em_atendimento: [] };
  (sessoes || []).forEach(s => { if (grupos[s.status]) grupos[s.status].push(s); });

  // Som quando aparece check-in novo (ignora a primeira carga)
  const idsCheckin = new Set(grupos.checkin.map(s => s.id));
  if (!TV_PRIMEIRA_CARGA) {
    let novo = false;
    idsCheckin.forEach(id => { if (!TV_CHECKINS_VISTOS.has(id)) novo = true; });
    if (novo) tocarSino();
  }
  TV_CHECKINS_VISTOS = idsCheckin;
  TV_PRIMEIRA_CARGA = false;

  desenharColuna('col-agendada', grupos.agendada, false);
  desenharColuna('col-checkin', grupos.checkin, true);
  desenharColuna('col-atendimento', grupos.em_atendimento, false);

  const agora = new Date();
  document.getElementById('tv-rodape').textContent =
    'Atualizado as ' + String(agora.getHours()).padStart(2, '0') + ':' +
    String(agora.getMinutes()).padStart(2, '0') + ':' +
    String(agora.getSeconds()).padStart(2, '0') +
    ' \u00B7 ' + (sessoes || []).length + ' sessao(oes) hoje';
}

function nomeCurto(nome) {
  if (!nome) return '?';
  const partes = nome.trim().split(/\s+/);
  return partes[0] + (partes[1] ? ' ' + partes[1][0] + '.' : '');
}

function desenharColuna(id, lista, destaque) {
  const alvo = document.getElementById(id);
  if (lista.length === 0) {
    alvo.innerHTML = '<div class="tv-vazio">&mdash;</div>';
    return;
  }
  alvo.innerHTML = lista.map(s =>
    '<div class="tv-cartao' + (destaque ? ' destaque' : '') + '">' +
    '  <div class="tv-hora">' + s.hora_inicio.slice(0, 5) + '</div>' +
    '  <div class="tv-quem">' +
    '    <b>' + nomeCurto(s.pacientes ? s.pacientes.nome : '') + '</b>' +
    '    <small>' + (s.profissional ? nomeCurto(s.profissional.nome) : '-') +
    (s.salas ? ' \u00B7 ' + s.salas.nome : '') + '</small>' +
    '  </div>' +
    '</div>').join('');
}

function tocarSino() {
  if (!TV_AUDIO) return;
  try {
    const agora = TV_AUDIO.currentTime;
    // Sino de duas notas, suave
    [[880, 0, 0.5], [1174.7, 0.18, 0.6]].forEach(([freq, ini, dur]) => {
      const osc = TV_AUDIO.createOscillator();
      const gan = TV_AUDIO.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gan.gain.setValueAtTime(0, agora + ini);
      gan.gain.linearRampToValueAtTime(0.35, agora + ini + 0.03);
      gan.gain.exponentialRampToValueAtTime(0.001, agora + ini + dur);
      osc.connect(gan).connect(TV_AUDIO.destination);
      osc.start(agora + ini);
      osc.stop(agora + ini + dur);
    });
  } catch (e) { /* som nunca deve quebrar o painel */ }
}
