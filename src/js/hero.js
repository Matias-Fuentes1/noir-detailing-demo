// Hero "pulilo vos": una capa de mugre (canvas) sobre la foto limpia.
// Se limpia pasando el mouse o el dedo (pincel circular blando: ~120 px en desktop, ~90 px en mobile).
// Cada 150 ms se muestrea la máscara para saber qué porcentaje está limpio y se actualiza el contador.
// Al llegar al 95 % se funde el resto (400 ms), aparece "IMPECABLE." y el botón principal late una vez.
// "Pulir todo" hace lo mismo para teclado o para quien no descubre el gesto.
// Con reduced motion el hero arranca limpio, sin mugre.

const ESCALA = 0.25; // la máscara se trabaja a 1/4 de resolución: rápida y con bordes suaves
const UMBRAL = 95;

export function iniciarHero({ reducido }) {
  const hero = document.querySelector('.hero');
  const img = hero?.querySelector('img.hero-foto');
  const canvas = document.getElementById('hero-sucio');
  const texto = document.getElementById('pulido-texto');
  const aviso = document.getElementById('pulido-aviso');
  const fill = document.getElementById('brillo-fill');
  const todo = document.getElementById('pulir-todo');
  const cta = hero?.querySelector('.btn-acento');
  if (!hero || !img || !canvas?.getContext || !texto) return;

  const tactil = matchMedia('(hover: none)').matches;
  const pista = `Pasá ${tactil ? 'el dedo' : 'el mouse'} por el auto para pulirlo`;
  let estado = '';
  let objetivo = 0;   // % limpio medido
  let mostrado = 0;   // % que se muestra (con conteo suave)
  let anim = 0;

  function pintarTexto(n) {
    if (estado === 'impecable') return;
    if (n < 5) {
      if (estado !== 'inicio') { texto.textContent = pista; estado = 'inicio'; }
    } else {
      if (estado !== 'puliendo') {
        estado = 'puliendo';
        texto.innerHTML = 'Brillo <span class="dato" data-n></span> / 100 · te falta <span class="dato" data-f></span> para dejarlo impecable';
      }
      texto.querySelector('[data-n]').textContent = String(n);
      texto.querySelector('[data-f]').textContent = `${100 - n} %`;
    }
    fill.style.transform = `scaleX(${n / 100})`;
  }

  // Conteo suave del número hacia el valor medido.
  function contar() {
    cancelAnimationFrame(anim);
    const paso = () => {
      const d = objetivo - mostrado;
      mostrado = Math.abs(d) < 1 ? objetivo : mostrado + Math.sign(d) * Math.max(1, Math.round(Math.abs(d) * 0.18));
      pintarTexto(mostrado);
      if (mostrado !== objetivo) anim = requestAnimationFrame(paso);
    };
    anim = requestAnimationFrame(paso);
  }

  function terminar({ fundido }) {
    if (estado === 'impecable') return;
    estado = 'impecable';
    cancelAnimationFrame(anim);
    objetivo = mostrado = 100;
    fill.style.transform = 'scaleX(1)';
    hero.classList.add('limpio');
    if (!fundido) canvas.hidden = true;
    texto.innerHTML = reducido ? 'Brillo <span class="dato">100</span> / 100' : '<span class="dato impecable">IMPECABLE.</span> Brillo <span class="dato">100</span> / 100';
    aviso.textContent = 'Pintura impecable: brillo 100 de 100.';
    todo.disabled = true;
    if (fundido && cta?.animate) {
      cta.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.04)' }, { transform: 'scale(1)' }], { duration: 400, delay: 300, easing: 'cubic-bezier(.16,1,.3,1)' });
    }
  }

  // Con reduced motion: arranca limpio.
  if (reducido) { terminar({ fundido: false }); return; }

  const ctx = canvas.getContext('2d');
  const sucio = document.createElement('canvas');
  const sctx = sucio.getContext('2d');
  const mascara = document.createElement('canvas'); // trazos del usuario (lo pintado = limpio)
  const mctx = mascara.getContext('2d', { willReadFrequently: true });
  let W = 0, H = 0, dpr = 1;
  let ultimo = null;
  let presionado = false;
  let cambios = false;
  let pendiente = false;

  const radio = () => (tactil ? 45 : 60) * ESCALA; // diámetro ≈ 90 / 120 px
  const esControl = (el) => el.closest('a, button, input, label');

  function medidas() {
    const r = hero.getBoundingClientRect();
    const nW = Math.round(r.width), nH = Math.round(r.height);
    if (!nW || !nH) return false;
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let copia = null;
    if (mascara.width) {
      copia = document.createElement('canvas');
      copia.width = mascara.width; copia.height = mascara.height;
      copia.getContext('2d').drawImage(mascara, 0, 0);
    }
    W = nW; H = nH;
    canvas.width = sucio.width = Math.round(W * dpr);
    canvas.height = sucio.height = Math.round(H * dpr);
    mascara.width = Math.max(1, Math.round(W * ESCALA));
    mascara.height = Math.max(1, Math.round(H * ESCALA));
    if (copia) mctx.drawImage(copia, 0, 0, mascara.width, mascara.height);
    pintarSucio();
    return true;
  }

  // La foto "sucia": desaturada, más oscura, con película de polvo y marcas de agua secas.
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
    sctx.fillStyle = 'rgba(128,128,128,.8)';
    sctx.fillRect(0, 0, cw, ch);
    sctx.globalCompositeOperation = 'multiply';
    sctx.fillStyle = '#66655f';
    sctx.fillRect(0, 0, cw, ch);
    sctx.globalCompositeOperation = 'source-over';
    sctx.fillStyle = 'rgba(132,124,108,.22)';
    sctx.fillRect(0, 0, cw, ch);
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
    sctx.lineWidth = dpr;
    for (let i = 0; i < 90; i++) {
      const x = azar() * cw, y = azar() * ch, r = (20 + azar() * 90) * dpr, a = azar() * Math.PI * 2;
      sctx.beginPath(); sctx.arc(x, y, r, a, a + 0.6 + azar() * 1.2); sctx.stroke();
    }
  }

  function componer() {
    pendiente = false;
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(sucio, 0, 0);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(mascara, 0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'source-over';
  }
  const pedirCuadro = () => { if (!pendiente) { pendiente = true; requestAnimationFrame(componer); } };

  // Pincel circular blando: sellos con degradé radial a lo largo del trazo.
  function sello(x, y) {
    const r = radio();
    const g = mctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(0,0,0,1)');
    g.addColorStop(0.55, 'rgba(0,0,0,.85)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    mctx.fillStyle = g;
    mctx.beginPath(); mctx.arc(x, y, r, 0, Math.PI * 2); mctx.fill();
  }
  function pintar(e) {
    if (estado === 'impecable') return;
    const r = hero.getBoundingClientRect();
    const x = (e.clientX - r.left) * ESCALA;
    const y = (e.clientY - r.top) * ESCALA;
    if (ultimo) {
      const d = Math.hypot(x - ultimo.x, y - ultimo.y);
      const pasos = Math.max(1, Math.ceil(d / (radio() / 3)));
      for (let i = 1; i <= pasos; i++) sello(ultimo.x + ((x - ultimo.x) * i) / pasos, ultimo.y + ((y - ultimo.y) * i) / pasos);
    } else sello(x, y);
    ultimo = { x, y };
    cambios = true;
    pedirCuadro();
  }

  // Muestreo cada 150 ms (solo si hubo trazos nuevos).
  function medir() {
    if (!cambios || estado === 'impecable') return;
    cambios = false;
    const { data } = mctx.getImageData(0, 0, mascara.width, mascara.height);
    let limpio = 0;
    for (let i = 3; i < data.length; i += 16) if (data[i] > 127) limpio++; // 1 de cada 4 píxeles alcanza
    const n = Math.min(100, Math.round((limpio / (data.length / 16)) * 100));
    if (n >= UMBRAL) { terminar({ fundido: true }); return; }
    objetivo = n;
    contar();
  }

  function activar() {
    if (!medidas()) return;
    componer();
    hero.classList.add('puliendo');
    pintarTexto(0);

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
    hero.addEventListener('pointercancel', soltar); // gesto vertical: el navegador scrollea (touch-action: pan-y)
    hero.addEventListener('pointerleave', soltar);
    todo?.addEventListener('click', () => terminar({ fundido: true }));
    setInterval(medir, 150);

    let t;
    new ResizeObserver(() => { clearTimeout(t); t = setTimeout(() => { if (estado !== 'impecable' && medidas()) componer(); }, 80); }).observe(hero);
  }

  if (img.complete && img.naturalWidth) activar();
  else img.addEventListener('load', activar, { once: true });
}
