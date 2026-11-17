import negocio from './config/negocio.json';
import { iniciarHero } from './js/hero.js';
import { iniciarInspeccion, iniciarComparador, iniciarResultados, iniciarAgua, iniciarProceso, iniciarParallax } from './js/efectos.js';
import { iniciarCotizador } from './js/cotizador.js';
import { iniciarMapa } from './js/contacto.js';

const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
const opciones = { reducido };

/* ---------- Menú (mobile y tablet) ---------- */
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
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && nav.classList.contains('abierto')) { cerrarMenu(); menuBtn.focus(); }
});

/* ---------- Títulos: entran línea por línea, una sola vez ----------
   El HTML se ve completo sin JS. Acá solo se esconden (máscara + translateY) los títulos que todavía
   no se ven, y entran cuando aparecen en pantalla. Con reduced motion no se toca nada. */
const titulos = [...document.querySelectorAll('.titulo, .manif-frase')];
if (!reducido && 'IntersectionObserver' in window) {
  const mostrar = (t) => t.classList.remove('pre');
  titulos.forEach((t) => t.classList.add('pre'));
  const io = new IntersectionObserver(
    (entradas) => entradas.forEach((e) => { if (e.isIntersecting) { mostrar(e.target); io.unobserve(e.target); } }),
    { threshold: 0.2 },
  );
  // Doble rAF: el estado inicial se pinta antes de soltar la transición (el hero entra al cargar).
  requestAnimationFrame(() => requestAnimationFrame(() => titulos.forEach((t) => io.observe(t))));
  // Red de seguridad: lo que quedó arriba (salto con ancla o scroll rápido) aparece igual.
  const revisar = () => titulos.forEach((t) => { if (t.classList.contains('pre') && t.getBoundingClientRect().top < innerHeight) mostrar(t); });
  addEventListener('scroll', revisar, { passive: true });
  addEventListener('hashchange', revisar);
}

/* ---------- Interacciones ---------- */
iniciarHero(opciones);
iniciarInspeccion(negocio, opciones);
iniciarComparador(document.getElementById('comparador'));
iniciarResultados(negocio);
iniciarAgua(negocio, opciones);
iniciarProceso(opciones);
iniciarParallax(opciones);
const cotizador = iniciarCotizador(negocio, opciones);
iniciarMapa(negocio);

// Links que llevan al cotizador con algo elegido (tarjetas de servicios y de duración del cerámico).
document.querySelectorAll('[data-preset]').forEach((a) => a.addEventListener('click', () => cotizador.preseleccionar(a.dataset.preset)));

/* ---------- Barras fijas en mobile ----------
   General ("Presupuesto" | "Pedir cotización") fuera del hero; dentro del cotizador la reemplaza
   la barra con el total, hasta que el panel del presupuesto entra en pantalla. */
const barra = document.getElementById('barra-movil');
const barraCot = document.getElementById('barra-cotizador');
const hero = document.getElementById('inicio');
const formCot = document.getElementById('cotizador-form');
const resumen = document.getElementById('cot-resumen');
if ('IntersectionObserver' in window && barra && hero) {
  const estado = { heroVisible: true, enCotizador: false, resumenVisible: false };
  const pintar = () => {
    const mostrarCot = estado.enCotizador && !estado.resumenVisible;
    const mostrarBarra = !estado.heroVisible && !estado.enCotizador;
    barraCot.classList.toggle('visible', mostrarCot);
    barra.classList.toggle('visible', mostrarBarra);
    barra.inert = !mostrarBarra;
    barraCot.inert = !mostrarCot;
  };
  const obs = (el, clave, o = {}) => new IntersectionObserver(([e]) => { estado[clave] = e.isIntersecting; pintar(); }, o).observe(el);
  obs(hero, 'heroVisible');
  obs(formCot, 'enCotizador', { rootMargin: '0px 0px -30% 0px' });
  obs(resumen, 'resumenVisible', { threshold: 0.35 });
  pintar();
}
