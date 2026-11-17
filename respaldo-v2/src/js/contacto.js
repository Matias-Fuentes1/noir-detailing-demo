// Formulario de turno (valida y abre WhatsApp), mapa de Leaflet y visor de trabajos.
import { linkWhatsApp, completar } from './calculo.js';
import { abrirWhatsApp } from './cotizador.js';

/* ---------- Turno ---------- */
export function iniciarTurno(negocio) {
  const form = document.getElementById('turno-form');
  if (!form) return;
  const campos = [...form.querySelectorAll('input, select')];

  function validar(campo) {
    const valor = campo.value.trim();
    let error = '';
    if (campo.required && !valor) error = campo.dataset.error || 'Completá este campo.';
    else if (campo.type === 'tel' && valor && valor.replace(/\D/g, '').length < 8) error = campo.dataset.errorFormato;
    const caja = document.getElementById(`${campo.id}-error`);
    if (caja) caja.textContent = error;
    campo.setAttribute('aria-invalid', String(Boolean(error)));
    return !error;
  }

  campos.forEach((c) => {
    c.addEventListener('blur', () => { if (c.value.trim() || c.dataset.tocado) validar(c); c.dataset.tocado = '1'; });
    c.addEventListener('input', () => { if (c.getAttribute('aria-invalid') === 'true') validar(c); });
    c.addEventListener('change', () => { if (c.getAttribute('aria-invalid') === 'true') validar(c); });
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const invalidos = campos.filter((c) => !validar(c));
    if (invalidos.length) { invalidos[0].focus(); return; }
    const d = Object.fromEntries(new FormData(form));
    const lineas = [
      completar(negocio.mensajes.turno, negocio),
      `• Nombre: ${d.nombre.trim()}`,
      `• Teléfono: ${d.telefono.trim()}`,
      d.auto.trim() && `• Auto: ${d.auto.trim()}`,
      `• Servicio: ${d.servicio}`,
      `• Día preferido: ${d.dia || 'cualquier día'}`,
    ].filter(Boolean);
    abrirWhatsApp(linkWhatsApp(negocio, lineas.join('\n')));
  });
}

/* ---------- Mapa (Leaflet + OpenStreetMap, se carga al acercarse) ---------- */
export function iniciarMapa(negocio) {
  const el = document.getElementById('mapa');
  if (!el || !('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver(
    async (entradas) => {
      if (!entradas[0].isIntersecting) return;
      io.disconnect();
      try {
        const [{ default: L }] = await Promise.all([import('leaflet'), import('leaflet/dist/leaflet.css')]);
        const { lat, lng, zoom } = negocio.mapa;
        el.replaceChildren();
        const tactil = matchMedia('(pointer: coarse)').matches;
        const mapa = L.map(el, { center: [lat, lng], zoom, scrollWheelZoom: false, dragging: !tactil, tap: false });
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(mapa);
        L.marker([lat, lng], {
          icon: L.divIcon({ className: '', html: '<span class="pin-mapa"></span>', iconSize: [22, 22], iconAnchor: [11, 11] }),
          title: negocio.nombre,
          alt: `${negocio.nombre}, ${negocio.direccion}`,
        })
          .addTo(mapa)
          .bindPopup(`<strong>${negocio.nombre}</strong><br>${negocio.direccion}`);
      } catch {
        /* si el mapa no carga, queda el link a Google Maps */
      }
    },
    { rootMargin: '400px 0px' },
  );
  io.observe(el);
}

/* ---------- Trabajos: filtro + visor ---------- */
export function iniciarTrabajos(negocio) {
  const grilla = document.getElementById('trabajos-grilla');
  const visor = document.getElementById('visor');
  if (!grilla) return;
  const chips = [...document.querySelectorAll('[data-filtro]')];
  chips.forEach((chip) =>
    chip.addEventListener('click', () => {
      const f = chip.dataset.filtro;
      chips.forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
      grilla.querySelectorAll('li').forEach((li) => { li.hidden = f !== 'todos' && li.dataset.cat !== f; });
    }),
  );

  if (!visor || typeof visor.showModal !== 'function') return;
  const media = document.getElementById('visor-media');
  const pie = document.getElementById('visor-titulo');
  let origen = null;
  grilla.addEventListener('click', (e) => {
    const boton = e.target.closest('.trabajo');
    if (!boton) return;
    const t = negocio.trabajos[Number(boton.dataset.indice)];
    const copia = boton.querySelector('img, .ph').cloneNode(true);
    if (copia.tagName === 'IMG') { copia.sizes = '100vw'; copia.loading = 'eager'; }
    media.replaceChildren(copia);
    pie.textContent = `${t.auto} · ${t.servicio}`;
    origen = boton;
    visor.showModal();
  });
  visor.querySelector('.visor-cerrar').addEventListener('click', () => visor.close());
  visor.addEventListener('click', (e) => { if (e.target === visor) visor.close(); });
  visor.addEventListener('close', () => origen?.focus());
}
