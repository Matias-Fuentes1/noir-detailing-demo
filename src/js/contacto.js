// Mapa de Leaflet del bloque de contacto.

/* ---------- Mapa (Leaflet + OpenStreetMap, oscuro, sin rueda; se carga al acercarse) ---------- */
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
        // Con el dedo, el mapa no arrastra: así nunca traba el scroll de la página.
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
