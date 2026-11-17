// Luz de inspección, comparador antes/después (con selector de pares), agua sobre el panel y LED del proceso.
// Todo funciona con mouse, dedo (touch-action: pan-y: el scroll vertical nunca se traba) y teclado.

const limitar = (v, min, max) => Math.min(max, Math.max(min, v));

/* ---------- 01 · Luz de inspección por etapas ---------- */
export function iniciarInspeccion(negocio, { reducido }) {
  const fig = document.getElementById('inspeccion');
  if (!fig) return;
  const luz = fig.querySelector('.insp-luz');
  const etapas = negocio.pulido.etapas;
  const titulo = document.getElementById('etapa-titulo');
  const texto = document.getElementById('etapa-texto');
  const defectos = document.getElementById('etapa-defectos');
  const numero = document.getElementById('insp-etapa');
  const botones = [...document.querySelectorAll('[data-etapa]')].filter((b) => b.tagName === 'BUTTON');
  let tocado = false;

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
      const e = etapas[i];
      fig.dataset.etapa = String(i);
      botones.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      titulo.textContent = e.titulo;
      texto.textContent = e.texto;
      defectos.textContent = `${e.defectos} %`;
      numero.textContent = String(i + 1);
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

/* ---------- 04 · Comparador (divisor arrastrable + teclado) ---------- */
export function iniciarComparador(fig) {
  if (!fig) return;
  const range = fig.querySelector('.comp-range');
  range.step = '2';
  const set = (v) => {
    v = limitar(v, 0, 100);
    fig.style.setProperty('--split', `${v}%`);
    range.value = String(Math.round(v));
    range.setAttribute('aria-valuetext', `${Math.round(v)} % antes`);
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
  // El range invisible recibe el foco y las flechas del teclado (el anillo se dibuja en la manija).
  range.addEventListener('input', () => set(Number(range.value)));
  set(50);
}

/* Selector vertical: Pintura · Interior · Llantas (cambia el par de fotos). */
export function iniciarResultados(negocio) {
  const fig = document.getElementById('comparador');
  const pie = document.getElementById('comp-pie');
  const botones = [...document.querySelectorAll('button[data-par]')];
  if (!fig || !botones.length) return;
  botones.forEach((b) =>
    b.addEventListener('click', () => {
      const id = b.dataset.par;
      botones.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      fig.querySelectorAll('.par').forEach((p) => { p.hidden = p.dataset.par !== id; });
      pie.textContent = negocio.resultados.find((r) => r.id === id)?.pie ?? '';
    }),
  );
}

/* ---------- 02 · Agua sobre el panel: con o sin cerámico ----------
   Al cargar, el panel ya muestra gotas quietas (estado final). "Rociar el panel" las tira de nuevo:
   con cerámico forman perlas y las grandes resbalan; sin cerámico se aplastan y quedan.
   Con reduced motion siempre se muestra el estado final, sin animar. */
export function iniciarAgua(negocio, { reducido }) {
  const fig = document.getElementById('agua');
  const boton = document.getElementById('rociar');
  if (!fig || !boton) return;
  const capa = document.getElementById('gotas');
  const contador = document.getElementById('agua-gotas');
  const angulo = document.getElementById('agua-angulo');
  const comp = document.getElementById('agua-comp');
  const rotulo = document.getElementById('agua-rotulo');
  const modos = negocio.ceramico.modos;
  const botonesModo = [...document.querySelectorAll('button[data-modo]')];
  const animar = (el, frames, o) => (el.animate ? el.animate(frames, { fill: 'forwards', ...o }) : null);
  let modo = fig.dataset.modo || 'con';
  let tanda = 0;

  const contar = () => { contador.textContent = String(capa.querySelectorAll('.gota:not(.se-va)').length); };

  function rociar({ animado }) {
    tanda++;
    const esta = tanda;
    capa.replaceChildren();
    const ancho = fig.clientWidth || 600;
    const cantidad = ancho < 600 ? 26 : 40;
    // Pseudoaleatorio con semilla: el estado inicial siempre se ve igual.
    let semilla = animado ? Math.floor(Math.random() * 1e6) + 1 : 11;
    const azar = () => ((semilla = (semilla * 16807) % 2147483647) / 2147483647);

    for (let i = 0; i < cantidad; i++) {
      const x = azar() * 92 + 4;
      const y = azar() * 74 + 14;
      const s = Math.round(7 + azar() * (ancho < 600 ? 10 : 15));
      const g = document.createElement('i');
      if (modo === 'con') {
        g.className = 'gota perla';
        g.style.cssText = `--s:${s}px;left:${x}%;top:${y}%`;
        const resbala = s > 14 && azar() < 0.55;
        if (!animado) { if (!resbala) capa.append(g); continue; }
        capa.append(g);
        const retraso = i * 22 + azar() * 60;
        animar(g, [{ transform: 'translateY(-36px) scale(.5)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 240, delay: retraso, easing: 'cubic-bezier(.16,1,.3,1)' });
        if (resbala) {
          const largo = 80 + azar() * 200;
          const a = animar(g, [{ transform: 'none', opacity: 1 }, { transform: `translate(${Math.round(azar() * 16 - 8)}px, ${Math.round(largo)}px) scale(.85, 1.15)`, opacity: 0 }], { duration: 900 + azar() * 600, delay: retraso + 700 + azar() * 900, easing: 'cubic-bezier(.55,0,.85,.45)' });
          if (a) a.onfinish = () => { if (esta === tanda) { g.classList.add('se-va'); contar(); } };
        }
      } else {
        g.className = 'gota mancha';
        const ex = (2 + azar() * 1.2).toFixed(2), ey = (1.2 + azar() * 0.5).toFixed(2), rot = Math.round(azar() * 50 - 25);
        g.style.cssText = `--s:${Math.round(s * 1.15)}px;left:${x}%;top:${y}%`;
        capa.append(g);
        const final = `scale(${ex}, ${ey}) rotate(${rot}deg)`;
        if (!animado) { g.style.transform = final; g.style.opacity = '.7'; continue; }
        const retraso = i * 22 + azar() * 60;
        animar(g, [{ transform: 'translateY(-36px) scale(.5)', opacity: 0 }, { transform: 'none', opacity: 1, offset: 0.45 }, { transform: final, opacity: 0.7 }], { duration: 540, delay: retraso, easing: 'cubic-bezier(.16,1,.3,1)' });
      }
    }
    contar();
  }

  function cambiarModo(nuevo) {
    modo = nuevo;
    fig.dataset.modo = nuevo;
    botonesModo.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.modo === nuevo)));
    angulo.textContent = modos[nuevo].angulo;
    comp.textContent = modos[nuevo].comportamiento;
    rotulo.textContent = nuevo === 'con' ? 'Con cerámico' : 'Sin cerámico';
    rociar({ animado: false });
  }

  botonesModo.forEach((b) => b.addEventListener('click', () => cambiarModo(b.dataset.modo)));
  boton.addEventListener('click', () => rociar({ animado: !reducido }));
  rociar({ animado: false });
}

/* ---------- 03 · Parallax leve de las fotos del bento ----------
   translateY de −20 a 20 px según dónde está la tarjeta en la pantalla. Solo desktop (≥1100 px con mouse)
   y nunca con reduced motion. */
export function iniciarParallax({ reducido }) {
  const tarjetas = [...document.querySelectorAll('.servicio')];
  const mq = matchMedia('(min-width: 1100px) and (hover: hover)');
  if (reducido || !tarjetas.length) return;
  let pendiente = false;
  function actualizar() {
    pendiente = false;
    const activo = mq.matches;
    for (const t of tarjetas) {
      const r = t.getBoundingClientRect();
      if (!activo) { t.style.removeProperty('--py'); continue; }
      if (r.bottom < 0 || r.top > innerHeight) continue;
      const p = limitar((r.top + r.height / 2 - innerHeight / 2) / (innerHeight / 2 + r.height / 2), -1, 1);
      t.style.setProperty('--py', `${(p * 20).toFixed(1)}px`);
    }
  }
  const pedir = () => { if (!pendiente) { pendiente = true; requestAnimationFrame(actualizar); } };
  addEventListener('scroll', pedir, { passive: true });
  addEventListener('resize', pedir);
  mq.addEventListener?.('change', pedir);
  actualizar();
}

/* ---------- 05 · Tira LED del proceso (se enciende con el scroll) ---------- */
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
