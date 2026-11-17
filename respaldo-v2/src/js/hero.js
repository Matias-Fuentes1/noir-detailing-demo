// Hero "pulilo vos": una capa opaca (canvas) sobre la foto limpia.
// Se limpia con el slider (de izquierda a derecha) o pasando el mouse / el dedo por la foto.
// El medidor de brillo muestra qué porcentaje de la foto ya está limpio (0 a 100).

const ESCALA_MASCARA = 0.25; // la máscara se trabaja a 1/4 de resolución: rápida y con bordes suaves

export function iniciarHero({ reducido }) {
  const hero = document.querySelector('.hero');
  const img = hero?.querySelector('img.hero-foto');
  const canvas = document.getElementById('hero-sucio');
  const range = document.getElementById('hero-range');
  const linea = hero?.querySelector('.hero-linea');
  const fill = document.getElementById('brillo-fill');
  const valor = document.getElementById('brillo-valor');
  if (!hero || !img || !canvas?.getContext || !range) return;

  const ctx = canvas.getContext('2d');
  const sucio = document.createElement('canvas');
  const sctx = sucio.getContext('2d');
  const pincel = document.createElement('canvas'); // trazos del usuario
  const pctx = pincel.getContext('2d');
  const mascara = document.createElement('canvas'); // pincel + zona del slider
  const mctx = mascara.getContext('2d', { willReadFrequently: true });

  let W = 0, H = 0, dpr = 1;
  let corte = reducido ? 100 : Number(range.value);
  let ultimo = null;
  let presionado = false;
  let pendiente = false;
  let ultimaMedicion = 0;
  if (reducido) range.value = '100';

  const esControl = (el) => el.closest('a, button, input, label, select, .hero-pulido');

  function medidas() {
    const r = hero.getBoundingClientRect();
    const nuevoW = Math.round(r.width), nuevoH = Math.round(r.height);
    if (!nuevoW || !nuevoH) return false;
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    // Conserva los trazos al cambiar de tamaño.
    const anterior = pincel.width ? pincel : null;
    let copia = null;
    if (anterior) {
      copia = document.createElement('canvas');
      copia.width = anterior.width; copia.height = anterior.height;
      copia.getContext('2d').drawImage(anterior, 0, 0);
    }
    W = nuevoW; H = nuevoH;
    canvas.width = sucio.width = Math.round(W * dpr);
    canvas.height = sucio.height = Math.round(H * dpr);
    pincel.width = mascara.width = Math.max(1, Math.round(W * ESCALA_MASCARA));
    pincel.height = mascara.height = Math.max(1, Math.round(H * ESCALA_MASCARA));
    if (copia) pctx.drawImage(copia, 0, 0, pincel.width, pincel.height);
    pintarSucio();
    return true;
  }

  // Dibuja la foto "sucia": desaturada, más oscura, con película de polvo y marcas de agua.
  function pintarSucio() {
    const cw = sucio.width, ch = sucio.height;
    const iw = img.naturalWidth, ih = img.naturalHeight;
    const s = Math.max(cw / iw, ch / ih);
    const dw = iw * s, dh = ih * s;
    const pos = getComputedStyle(img).objectPosition.split(' ').map((v) => (v.endsWith('%') ? parseFloat(v) / 100 : 0.5));
    sctx.globalCompositeOperation = 'source-over';
    sctx.clearRect(0, 0, cw, ch);
    sctx.drawImage(img, (cw - dw) * (pos[0] ?? 0.5), (ch - dh) * (pos[1] ?? 0.5), dw, dh);
    sctx.globalCompositeOperation = 'saturation';
    sctx.fillStyle = 'rgba(128,128,128,.78)';
    sctx.fillRect(0, 0, cw, ch);
    sctx.globalCompositeOperation = 'multiply';
    sctx.fillStyle = '#6c6b66';
    sctx.fillRect(0, 0, cw, ch);
    sctx.globalCompositeOperation = 'source-over';
    sctx.fillStyle = 'rgba(132,124,108,.2)';
    sctx.fillRect(0, 0, cw, ch);
    // Manchas y gotas secas (pseudoaleatorio fijo para que siempre se vea igual).
    let semilla = 7;
    const azar = () => ((semilla = (semilla * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 260; i++) {
      const x = azar() * cw, y = azar() * ch, r = (1.5 + azar() * 7) * dpr;
      const g = sctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(200,192,172,${0.06 + azar() * 0.14})`);
      g.addColorStop(1, 'rgba(200,192,172,0)');
      sctx.fillStyle = g;
      sctx.beginPath(); sctx.arc(x, y, r, 0, Math.PI * 2); sctx.fill();
    }
    sctx.strokeStyle = 'rgba(210,205,190,.07)';
    sctx.lineWidth = 1 * dpr;
    for (let i = 0; i < 90; i++) {
      const x = azar() * cw, y = azar() * ch, r = (20 + azar() * 90) * dpr, a = azar() * Math.PI * 2;
      sctx.beginPath(); sctx.arc(x, y, r, a, a + 0.6 + azar() * 1.2); sctx.stroke();
    }
  }

  function componer() {
    pendiente = false;
    mctx.clearRect(0, 0, mascara.width, mascara.height);
    mctx.drawImage(pincel, 0, 0);
    mctx.fillStyle = '#000';
    mctx.fillRect(0, 0, (mascara.width * corte) / 100, mascara.height);

    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(sucio, 0, 0);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(mascara, 0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'source-over';

    if (linea) {
      linea.style.transform = `translateX(${(W * corte) / 100 - 1}px)`;
      linea.classList.toggle('activa', corte > 0.5 && corte < 99.5);
    }
    const ahora = performance.now();
    if (ahora - ultimaMedicion > 90) { ultimaMedicion = ahora; medir(); }
    else { clearTimeout(componer.t); componer.t = setTimeout(medir, 120); }
  }

  function medir() {
    const { data } = mctx.getImageData(0, 0, mascara.width, mascara.height);
    let limpio = 0;
    for (let i = 3; i < data.length; i += 16) if (data[i] > 127) limpio++; // 1 de cada 4 píxeles alcanza
    const brillo = Math.round((limpio / (data.length / 16)) * 100);
    valor.textContent = String(brillo);
    fill.style.transform = `scaleX(${brillo / 100})`;
  }

  const pedirCuadro = () => { if (!pendiente) { pendiente = true; requestAnimationFrame(componer); } };

  function pintar(e) {
    const r = hero.getBoundingClientRect();
    const x = (e.clientX - r.left) * ESCALA_MASCARA;
    const y = (e.clientY - r.top) * ESCALA_MASCARA;
    const radio = Math.min(Math.max(W * 0.045, 30), 72) * ESCALA_MASCARA;
    pctx.strokeStyle = '#000';
    pctx.fillStyle = '#000';
    pctx.lineCap = 'round';
    pctx.lineWidth = radio * 2;
    pctx.beginPath();
    if (ultimo) { pctx.moveTo(ultimo.x, ultimo.y); pctx.lineTo(x, y); pctx.stroke(); }
    else { pctx.arc(x, y, radio, 0, Math.PI * 2); pctx.fill(); }
    ultimo = { x, y };
    pedirCuadro();
  }

  function activar() {
    if (!medidas()) return;
    componer();
    hero.classList.add('puliendo');

    hero.addEventListener('pointerdown', (e) => {
      if (esControl(e.target)) return;
      presionado = true; ultimo = null; pintar(e);
    });
    hero.addEventListener('pointermove', (e) => {
      if (esControl(e.target)) { ultimo = null; return; }
      if (e.pointerType === 'mouse' || presionado) pintar(e);
    });
    const soltar = () => { presionado = false; ultimo = null; };
    hero.addEventListener('pointerup', soltar);
    hero.addEventListener('pointercancel', soltar);
    hero.addEventListener('pointerleave', soltar);

    range.addEventListener('input', () => { corte = Number(range.value); pedirCuadro(); });

    let t;
    new ResizeObserver(() => { clearTimeout(t); t = setTimeout(() => { if (medidas()) componer(); }, 80); }).observe(hero);
  }

  if (img.complete && img.naturalWidth) activar();
  else img.addEventListener('load', activar, { once: true });
}
