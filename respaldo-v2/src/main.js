import negocio from './config/negocio.json';
import { iniciarHero } from './js/hero.js';
import { iniciarInspeccion, iniciarComparador, iniciarAgua, iniciarProceso } from './js/efectos.js';
import { iniciarCotizador } from './js/cotizador.js';
import { iniciarTurno, iniciarMapa, iniciarTrabajos } from './js/contacto.js';

const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
const opciones = { reducido };

/* ---------- Menú mobile ---------- */
const menuBtn = document.querySelector('.menu-btn');
const nav = document.getElementById('menu');
function cerrarMenu() {
  nav.classList.remove('abierto');
  menuBtn.setAttribute('aria-expanded', 'false');
  menuBtn.setAttribute('aria-label', 'Abrir menú');
}
menuBtn?.addEventListener('click', () => {
  const abierto = nav.classList.toggle('abierto');
  menuBtn.setAttribute('aria-expanded', String(abierto));
  menuBtn.setAttribute('aria-label', abierto ? 'Cerrar menú' : 'Abrir menú');
});
nav?.querySelectorAll('a').forEach((a) => a.addEventListener('click', cerrarMenu));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && nav.classList.contains('abierto')) { cerrarMenu(); menuBtn.focus(); } });

/* ---------- Revelado al hacer scroll ----------
   El HTML se ve completo sin JS. Acá solo se ocultan (para un fundido de 280 ms) las secciones
   que están debajo del pliegue al cargar, y aparecen cuando entra el 10 % de cada una.
   Red de seguridad: si una sección ya está en pantalla (scroll rápido o salto con ancla), se muestra igual. */
const secciones = [...document.querySelectorAll('[data-reveal]')];
if (!reducido && 'IntersectionObserver' in window) {
  const mostrar = (s) => s.classList.remove('pre');
  secciones.forEach((s) => { if (s.getBoundingClientRect().top > innerHeight) s.classList.add('pre'); });
  const io = new IntersectionObserver(
    (entradas) => entradas.forEach((e) => { if (e.isIntersecting) { mostrar(e.target); io.unobserve(e.target); } }),
    { threshold: 0.1 },
  );
  secciones.forEach((s) => io.observe(s));
  // Misma regla del 10 %, calculada en cada evento de scroll (sin esperar a un cuadro):
  // si el observer se demora, la sección igual aparece. Y lo que ya pasó por arriba, también.
  const revisar = () => {
    for (const s of secciones) {
      if (!s.classList.contains('pre')) continue;
      const r = s.getBoundingClientRect();
      if (r.top < innerHeight - Math.min(r.height * 0.1, innerHeight * 0.25)) mostrar(s);
    }
  };
  addEventListener('scroll', revisar, { passive: true });
  addEventListener('hashchange', revisar);
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    const destino = a && document.getElementById(a.getAttribute('href').slice(1));
    destino?.closest('[data-reveal]')?.classList.remove('pre');
  });
}

/* ---------- Interacciones ---------- */
iniciarHero(opciones);
iniciarInspeccion(negocio, opciones);
iniciarComparador(document.getElementById('agua'));
iniciarComparador(document.getElementById('comparador'));
iniciarAgua(opciones);
iniciarProceso(opciones);
iniciarTrabajos(negocio);
const cotizador = iniciarCotizador(negocio, opciones);
iniciarTurno(negocio);
iniciarMapa(negocio);

// Links con preselección del cotizador ("Ver precio del pulido", "Elegir este paquete").
document.querySelectorAll('[data-preset]').forEach((a) => a.addEventListener('click', () => cotizador.preseleccionar(a.dataset.preset)));

/* ---------- Barras fijas en mobile ---------- */
const barra = document.getElementById('barra-movil');
const barraCot = document.getElementById('barra-cotizador');
const hero = document.getElementById('inicio');
const formCot = document.getElementById('cotizador-form');
const resumen = document.getElementById('cot-resumen');
if ('IntersectionObserver' in window && barra && hero) {
  const estado = { heroVisible: true, enCotizador: false, resumenVisible: false };
  const pintar = () => {
    const mostrarCot = estado.enCotizador && !estado.resumenVisible;
    barraCot.classList.toggle('visible', mostrarCot);
    barra.classList.toggle('visible', !estado.heroVisible && !estado.enCotizador);
    barra.inert = !barra.classList.contains('visible');
    barraCot.inert = !mostrarCot;
  };
  const obs = (el, clave, opciones = {}) => new IntersectionObserver(([e]) => { estado[clave] = e.isIntersecting; pintar(); }, opciones).observe(el);
  obs(hero, 'heroVisible');
  obs(formCot, 'enCotizador', { rootMargin: '0px 0px -30% 0px' });
  obs(resumen, 'resumenVisible', { threshold: 0.35 });
  pintar();
}
