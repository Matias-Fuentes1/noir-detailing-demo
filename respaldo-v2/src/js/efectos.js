// Luz de inspección, comparadores (agua y antes/después), gotas de agua y línea del proceso.

const limitar = (v, min, max) => Math.min(max, Math.max(min, v));

/* ---------- Luz de inspección ---------- */
export function iniciarInspeccion(negocio, { reducido }) {
  const fig = document.getElementById('inspeccion');
  if (!fig) return;
  const luz = fig.querySelector('.insp-luz');
  const texto = document.getElementById('etapa-texto');
  const botones = [...document.querySelectorAll('.etapa')];
  let tocado = false;

  luz.style.left = '0';
  luz.style.top = '0';
  function mover(xp, yp) {
    fig.style.setProperty('--lx', `${xp}%`);
    fig.style.setProperty('--ly', `${yp}%`);
    luz.style.transform = `translate3d(${(fig.clientWidth * xp) / 100}px, ${(fig.clientHeight * yp) / 100}px, 0) translate(-50%, -50%)`;
  }
  const desdeEvento = (e) => {
    const r = fig.getBoundingClientRect();
    mover(limitar(((e.clientX - r.left) / r.width) * 100, 0, 100), limitar(((e.clientY - r.top) / r.height) * 100, 0, 100));
  };
  mover(57, 45);
  new ResizeObserver(() => { if (!tocado) mover(57, 45); }).observe(fig);

  fig.addEventListener('pointerdown', (e) => { tocado = true; desdeEvento(e); });
  fig.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'mouse' || e.buttons || e.pressure > 0) { tocado = true; desdeEvento(e); }
  });

  botones.forEach((b) =>
    b.addEventListener('click', () => {
      const i = Number(b.dataset.etapa);
      fig.dataset.etapa = String(i);
      botones.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      texto.textContent = negocio.pulido.etapas[i]?.texto ?? '';
    }),
  );

  // En pantallas táctiles, si nadie la toca, la luz recorre el panel una vez y se queda quieta.
  if (reducido || !matchMedia('(hover: none)').matches || !('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver(
    (entradas) => {
      if (!entradas[0].isIntersecting) return;
      io.disconnect();
      const inicio = performance.now();
      const duracion = 2600;
      const paso = (t) => {
        if (tocado) return;
        const k = Math.min(1, (t - inicio) / duracion);
        const a = k * Math.PI * 2;
        const amp = 1 - k * 0.6;
        mover(57 + Math.sin(a) * 30 * amp, 45 + Math.sin(a * 2) * 18 * amp);
        if (k < 1) requestAnimationFrame(paso);
      };
      requestAnimationFrame(paso);
    },
    { threshold: 0.5 },
  );
  io.observe(fig);
}

/* ---------- Comparador genérico (divisor arrastrable + teclado) ---------- */
export function iniciarComparador(fig) {
  if (!fig) return;
  const range = fig.querySelector('.comp-range');
  range.step = '2';
  const set = (v) => {
    v = limitar(v, 0, 100);
    fig.style.setProperty('--split', `${v}%`);
    range.value = String(Math.round(v));
    range.setAttribute('aria-valuetext', `${Math.round(v)} %`);
  };
  const desdeEvento = (e) => {
    const r = fig.getBoundingClientRect();
    set(((e.clientX - r.left) / r.width) * 100);
  };
  let arrastrando = false;
  let movio = false;
  fig.addEventListener('pointerdown', (e) => {
    arrastrando = true;
    movio = false;
    // Con el mouse se mueve al instante; con el dedo esperamos a ver si es un arrastre horizontal
    // (un gesto vertical lo toma el scroll gracias a touch-action: pan-y).
    if (e.pointerType === 'mouse') { desdeEvento(e); fig.setPointerCapture(e.pointerId); }
  });
  fig.addEventListener('pointermove', (e) => { if (arrastrando) { movio = true; desdeEvento(e); } });
  fig.addEventListener('pointerup', (e) => { if (arrastrando && !movio && e.pointerType !== 'mouse') desdeEvento(e); arrastrando = false; });
  fig.addEventListener('pointercancel', () => { arrastrando = false; });
  range.addEventListener('input', () => set(Number(range.value)));
  set(50);
}

/* ---------- Rociar agua ---------- */
export function iniciarAgua({ reducido }) {
  const fig = document.getElementById('agua');
  const boton = document.getElementById('rociar');
  if (!fig || !boton) return;
  const sin = fig.querySelector('.gotas-sin');
  const con = fig.querySelector('.gotas-con');
  const animar = (el, frames, opciones) => (el.animate ? el.animate(frames, { fill: 'forwards', ...opciones }) : null);

  function limpiar(capa) {
    [...capa.children].forEach((g) => {
      const a = animar(g, [{ opacity: getComputedStyle(g).opacity }, { opacity: 0 }], { duration: 150 });
      if (a) a.onfinish = () => g.remove();
      else g.remove();
    });
  }

  function rociar() {
    limpiar(sin);
    limpiar(con);
    const ancho = fig.clientWidth;
    const cantidad = ancho < 600 ? 26 : 44;
    for (let i = 0; i < cantidad; i++) {
      const x = Math.random() * 96 + 2;
      const y = Math.random() * 78 + 4;
      const s = Math.round(7 + Math.random() * (ancho < 600 ? 10 : 15));
      const retraso = i * (reducido ? 0 : 22) + Math.random() * 60;
      const resbala = s > 13 && Math.random() < 0.6;

      // Mitad con cerámico: perla redonda; las más grandes se deslizan y se van.
      const perla = document.createElement('i');
      perla.className = 'gota';
      perla.style.cssText = `--s:${s}px;left:${x}%;top:${y}%`;
      // Mitad sin tratamiento: la gota se aplasta y se queda.
      const mancha = document.createElement('i');
      mancha.className = 'gota';
      const ex = (2 + Math.random() * 1.2).toFixed(2), ey = (1.2 + Math.random() * 0.5).toFixed(2), rot = Math.round(Math.random() * 50 - 25);
      mancha.style.cssText = `--s:${Math.round(s * 1.15)}px;left:${x}%;top:${y}%`;

      if (reducido) {
        if (!resbala) con.append(perla);
        mancha.style.transform = `scale(${ex}, ${ey}) rotate(${rot}deg)`;
        mancha.style.opacity = '.7';
        sin.append(mancha);
        continue;
      }
      con.append(perla);
      sin.append(mancha);
      const caida = [{ transform: 'translateY(-36px) scale(.5)', opacity: 0 }, { transform: 'translateY(0) scale(1)', opacity: 1 }];
      animar(perla, caida, { duration: 240, delay: retraso, easing: 'ease-out' });
      animar(mancha, caida, { duration: 240, delay: retraso, easing: 'ease-out' });
      animar(mancha, [{ transform: 'translateY(0) scale(1)', opacity: 1 }, { transform: `translateY(0) scale(${ex}, ${ey}) rotate(${rot}deg)`, opacity: 0.7 }], { duration: 300, delay: retraso + 240, easing: 'ease-out' });
      if (resbala) {
        const largo = 80 + Math.random() * 200;
        animar(perla, [{ transform: 'translateY(0) scale(1)', opacity: 1 }, { transform: `translate(${Math.round(Math.random() * 16 - 8)}px, ${Math.round(largo)}px) scale(.85, 1.15)`, opacity: 0 }], { duration: 900 + Math.random() * 600, delay: retraso + 700 + Math.random() * 900, easing: 'cubic-bezier(.55,0,.85,.45)' });
      }
    }
  }
  boton.addEventListener('click', rociar);
}

/* ---------- Línea del proceso ---------- */
export function iniciarProceso({ reducido }) {
  const cont = document.getElementById('proceso-linea');
  if (!cont) return;
  const fill = cont.querySelector('.proceso-fill');
  const riel = cont.querySelector('.proceso-riel');
  const pasos = [...cont.querySelectorAll('.paso')];
  if (reducido) {
    fill.style.transform = 'none';
    pasos.forEach((p) => p.classList.add('encendido'));
    return;
  }
  let pendiente = false;
  function actualizar() {
    pendiente = false;
    const punto = innerHeight * 0.62;
    const r = riel.getBoundingClientRect();
    const p = limitar((punto - r.top) / r.height, 0, 1);
    fill.style.transform = `scaleY(${p})`;
    for (const paso of pasos) {
      const m = paso.querySelector('.paso-marca').getBoundingClientRect();
      paso.classList.toggle('encendido', m.top + m.height / 2 <= r.top + p * r.height + 1);
    }
  }
  const pedir = () => { if (!pendiente) { pendiente = true; requestAnimationFrame(actualizar); } };
  addEventListener('scroll', pedir, { passive: true });
  addEventListener('resize', pedir);
  actualizar();
}
