// Íconos SVG en línea (trazo de 1.8, heredan el color del texto).
const trazos = {
  whatsapp:
    '<path d="M4.5 19.5l1.1-3.9A8 8 0 1 1 8.6 18.6z"/><path d="M9 8.6c.2-.5.6-.6 1-.5l.6 1.4c.1.3 0 .6-.2.8l-.4.4c.5 1 1.3 1.8 2.3 2.3l.4-.4c.2-.2.5-.3.8-.2l1.4.6c.1.4 0 .8-.5 1-1.8.9-6-2.7-5.4-5.4z"/>',
  telefono: '<path d="M5 4h3l1.5 4-2 1.2a11 11 0 0 0 5.3 5.3L14 12.5l4 1.5v3a2 2 0 0 1-2 2A13 13 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  cerrar: '<path d="M6 6l12 12M18 6L6 18"/>',
  calendario: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4M8 14h3"/>',
  lupa: '<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5M8.5 9.5a3 3 0 0 1 2.5-1.5"/>',
  pin: '<path d="M12 21s-6-5.4-6-11a6 6 0 0 1 12 0c0 5.6-6 11-6 11z"/><circle cx="12" cy="10" r="2.2"/>',
  calculadora: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8.5 12h.01M12 12h.01M15.5 12h.01M8.5 16h.01M12 16h.01M15.5 16h.01"/>',
  mano: '<path d="M8 13V6.5a1.5 1.5 0 0 1 3 0V12M11 11V5a1.5 1.5 0 0 1 3 0v6M14 11V6.5a1.5 1.5 0 0 1 3 0V14a6 6 0 0 1-6 6h-.5a6 6 0 0 1-4.6-2.2L4 15.4a1.5 1.5 0 0 1 2.3-1.9L8 15"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  reloj: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4.5l3 1.8"/>',
  gota: '<path d="M12 3.5s-6 6.6-6 10.5a6 6 0 0 0 12 0c0-3.9-6-10.5-6-10.5z"/>',
  flechas: '<path d="M9 7l-5 5 5 5M15 7l5 5-5 5"/>',
  instagram: '<rect x="4" y="4" width="16" height="16" rx="4.5"/><circle cx="12" cy="12" r="3.6"/><path d="M16.8 7.2h.01"/>',
  estrella: '<path d="M12 3.8l2.5 5.1 5.6.8-4 3.9 1 5.6-5.1-2.7-5 2.7 1-5.6-4.1-3.9 5.6-.8z"/>',
  camara: '<path d="M4 8h3l1.5-2h7L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.3"/>',
  ruta: '<circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M8 18h7a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h7"/>',
};

export const icono = (nombre) =>
  `<svg class="ico" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${trazos[nombre] ?? ''}</svg>`;
