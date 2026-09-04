// ============================================================================
// CORTEX aba - js/modulos/foto.js
// Ajustador de foto reutilizavel: antes de salvar qualquer foto (paciente,
// perfil do profissional), abre uma janela para arrastar/posicionar e dar
// zoom, com mascara redonda de previa. Exporta JPG quadrado 512x512.
// Uso: const blob = await MODULOS.foto.ajustar(file); // null = cancelou
// ============================================================================

window.MODULOS = window.MODULOS || {};

window.MODULOS.foto = {

  TAM_SAIDA: 512,   // px do arquivo final
  TAM_VISOR: 280,   // px do visor na tela

  _st: null,

  ajustar(arquivo) {
    return new Promise(resolve => {
      if (!arquivo || !arquivo.type.startsWith('image/')) { resolve(null); return; }

      const url = URL.createObjectURL(arquivo);
      const img = new Image();
      img.onload = () => this._abrir(img, url, resolve);
      img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
      img.src = url;
    });
  },

  _abrir(img, url, resolve) {
    const V = this.TAM_VISOR;
    const minEscala = Math.max(V / img.naturalWidth, V / img.naturalHeight);

    this._st = {
      img, url, resolve,
      escala: minEscala,
      minEscala,
      x: (V - img.naturalWidth * minEscala) / 2,
      y: (V - img.naturalHeight * minEscala) / 2,
      arrastando: false, px: 0, py: 0
    };

    const overlay = document.createElement('div');
    overlay.id = 'foto-overlay';
    overlay.className = 'primeiro-overlay';
    overlay.innerHTML =
      '<div class="primeiro-caixa" style="width:360px">' +
      '  <h2 style="margin:0 0 4px; font-size:17px">Ajustar foto</h2>' +
      '  <p class="sub" style="margin-bottom:12px">Arraste para posicionar e use o controle para o zoom.</p>' +
      '  <div class="foto-visor" id="foto-visor">' +
      '    <img id="foto-img" src="' + url + '" alt="" draggable="false">' +
      '    <div class="foto-mascara"></div>' +
      '  </div>' +
      '  <input type="range" id="foto-zoom" min="100" max="300" value="100" ' +
      '    style="width:100%; margin:14px 0 4px" ' +
      '    oninput="MODULOS.foto._zoom(this.value)">' +
      '  <div class="barra-acoes">' +
      '    <button class="btn btn-fantasma" onclick="MODULOS.foto._fechar(null)">Cancelar</button>' +
      '    <button class="btn btn-primario" onclick="MODULOS.foto._salvar()">Usar esta foto</button>' +
      '  </div>' +
      '</div>';
    document.body.appendChild(overlay);

    const visor = document.getElementById('foto-visor');
    visor.addEventListener('pointerdown', e => {
      this._st.arrastando = true;
      this._st.px = e.clientX; this._st.py = e.clientY;
      visor.setPointerCapture(e.pointerId);
    });
    visor.addEventListener('pointermove', e => {
      if (!this._st.arrastando) return;
      this._st.x += e.clientX - this._st.px;
      this._st.y += e.clientY - this._st.py;
      this._st.px = e.clientX; this._st.py = e.clientY;
      this._aplicar();
    });
    const soltar = () => { if (this._st) this._st.arrastando = false; };
    visor.addEventListener('pointerup', soltar);
    visor.addEventListener('pointercancel', soltar);

    this._aplicar();
  },

  _zoom(percentual) {
    const st = this._st;
    const V = this.TAM_VISOR;
    const nova = st.minEscala * (percentual / 100);

    // Zoom centrado no meio do visor
    const cx = (V / 2 - st.x) / st.escala;
    const cy = (V / 2 - st.y) / st.escala;
    st.escala = nova;
    st.x = V / 2 - cx * nova;
    st.y = V / 2 - cy * nova;
    this._aplicar();
  },

  _aplicar() {
    const st = this._st;
    const V = this.TAM_VISOR;
    const w = st.img.naturalWidth * st.escala;
    const h = st.img.naturalHeight * st.escala;

    // A imagem nunca deixa buraco no visor
    st.x = Math.min(0, Math.max(V - w, st.x));
    st.y = Math.min(0, Math.max(V - h, st.y));

    const el = document.getElementById('foto-img');
    if (el) el.style.transform =
      'translate(' + st.x + 'px,' + st.y + 'px) scale(' + st.escala + ')';
  },

  _salvar() {
    const st = this._st;
    const V = this.TAM_VISOR;
    const S = this.TAM_SAIDA;

    const canvas = document.createElement('canvas');
    canvas.width = S; canvas.height = S;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingQuality = 'high';

    // Recorte: a area do visor mapeada de volta na imagem original
    const sx = -st.x / st.escala;
    const sy = -st.y / st.escala;
    const sw = V / st.escala;
    ctx.drawImage(st.img, sx, sy, sw, sw, 0, 0, S, S);

    canvas.toBlob(blob => this._fechar(blob), 'image/jpeg', 0.9);
  },

  _fechar(resultado) {
    const st = this._st;
    if (!st) return;
    URL.revokeObjectURL(st.url);
    document.getElementById('foto-overlay')?.remove();
    this._st = null;
    st.resolve(resultado);
  }
};
