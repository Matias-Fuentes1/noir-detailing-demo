// Medición propia y liviana para el dashboard del panel: visitas y clics en WhatsApp.
// Sin cookies, sin IP guardada, sin servicios de terceros. El servidor solo guarda un hash
// anónimo que cambia todos los días (para contar visitantes únicos del día).

function enviar(tipo, detalle) {
  const cuerpo = JSON.stringify({ tipo, detalle });
  try {
    if (navigator.sendBeacon?.('/api/evento', new Blob([cuerpo], { type: 'application/json' }))) return;
    fetch('/api/evento', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: cuerpo, keepalive: true }).catch(() => {});
  } catch {
    /* la medición nunca debe romper la página */
  }
}

// Dónde estaba el botón: sección o parte fija de la página.
function lugar(el) {
  if (el.dataset.lugar) return el.dataset.lugar;
  if (el.closest('#cotizador-form, #barra-cotizador')) return 'cotizador';
  if (el.closest('.header')) return 'header';
  if (el.closest('#barra-movil')) return 'barra mobile';
  if (el.closest('.footer')) return 'footer';
  return el.closest('section[id]')?.id ?? 'otro';
}

export function medir() {
  // Ni bots de prueba, ni la vista previa del panel, ni quien pidió no ser medido.
  if (navigator.webdriver || document.querySelector('.aviso-preview') || navigator.doNotTrack === '1') return;
  try {
    if (!sessionStorage.getItem('noir-visita')) {
      sessionStorage.setItem('noir-visita', '1');
      enviar('visita', location.hash ? location.hash.slice(0, 40) : null);
    }
  } catch {
    enviar('visita', null);
  }
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href*="wa.me"]');
    if (a) enviar('whatsapp', lugar(a));
  }, { capture: true });
}
