// Cálculo del cotizador: el ÚNICO lugar donde se calcula un precio.
// Lo usan la página (valor inicial, sin JS), el navegador (en vivo), la API (recalcula lo que
// manda el visitante antes de guardarlo) y el panel (vista previa de precios).
// Todos los números salen del contenido normalizado (ver contenido.js).
//
// Fórmula: base = precio del paquete (o `precioCotizador` del servicio suelto) × multiplicador del tamaño
//          + recargo del estado de pintura (solo si el principal trabaja la pintura)
//          + extras. Cada parte se redondea al múltiplo de `redondeo`.
// El precio "Desde" de las tarjetas de servicios (`precio`) NO entra en esta fórmula.

const formato = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 });

export const pesos = (n) => `$${formato.format(Math.round(n))}`;

export const textoDias = (d) => {
  if (d < 1) return 'en el día';
  const n = Math.ceil(d);
  return `${n} ${n === 1 ? 'día' : 'días'}`;
};

// Opciones activas del paso "Paquete" (paquetes + servicios sueltos), con el precio que usa el cálculo.
export function opcionesPrincipales(negocio) {
  return [
    ...negocio.paquetes.filter((p) => p.activo !== false).map((p) => ({ ...p, tipo: 'paquete' })),
    ...negocio.servicios
      .filter((s) => s.activo !== false && s.enCotizador !== false)
      .map((s) => ({ ...s, precio: s.precioCotizador ?? s.precio, tipo: 'servicio' })),
  ];
}

export const tamanosActivos = (negocio) => negocio.cotizador.tamanos.filter((t) => t.activo !== false);
export const extrasActivos = (negocio) => negocio.cotizador.extras.filter((e) => e.activo !== false);

export function calcular(negocio, sel) {
  const c = negocio.cotizador;
  const tamanos = tamanosActivos(negocio);
  const opciones = opcionesPrincipales(negocio);
  const tamano = tamanos.find((t) => t.id === sel.tamano) ?? tamanos[0] ?? { id: '', nombre: '—', multiplicador: 1 };
  const principal = opciones.find((p) => p.id === sel.principal) ?? opciones[0] ?? { id: '', nombre: '—', precio: 0, dias: 0, tipo: 'paquete' };
  const estado = c.estados[Number(sel.estado)] ?? c.estados[0];
  const extras = extrasActivos(negocio).filter((e) => (sel.extras ?? []).includes(e.id));
  const redondeo = c.redondeo || 1;
  const redondear = (n) => Math.round(n / redondeo) * redondeo;

  const base = redondear(principal.precio * tamano.multiplicador);
  const aplicaEstado = Boolean(principal.pintura);
  const recargo = aplicaEstado ? redondear(base * estado.recargo) : 0;

  const desglose = [{ concepto: `${principal.nombre} · ${tamano.nombre}`, monto: base }];
  if (recargo) desglose.push({ concepto: `Estado: ${estado.nombre.toLowerCase()} (+${Math.round(estado.recargo * 100)} %)`, monto: recargo });
  for (const e of extras) desglose.push({ concepto: e.nombre, monto: e.precio });

  const total = desglose.reduce((s, d) => s + d.monto, 0);
  const dias = (principal.dias || 0) + extras.reduce((s, e) => s + (e.dias || 0), 0) + (aplicaEstado ? estado.diasExtra || 0 : 0);

  return { total, dias, tiempo: textoDias(dias), tamano, principal, estado, extras, desglose, aplicaEstado };
}

export function mensajePresupuesto(negocio, r, nombre, codigo) {
  const lineas = [
    `Hola ${negocio.nombreCorto}, quiero pedir una cotización. Lo armé en la web:`,
    `• Vehículo: ${r.tamano.nombre}`,
    `• ${r.principal.tipo === 'paquete' ? 'Paquete' : 'Servicio'}: ${r.principal.nombre}`,
    `• Estado de la pintura: ${r.estado.nombre}`,
    `• Extras: ${r.extras.length ? r.extras.map((e) => e.nombre).join(', ') : 'ninguno'}`,
    `• Estimado: ${pesos(r.total)}`,
    `• Tiempo en el taller: ${r.tiempo}`,
  ];
  if (nombre) lineas.push(`Nombre: ${nombre}`);
  if (codigo) lineas.push(`Ref.: ${codigo}`);
  lineas.push('¿Cuándo puedo llevarlo a revisar?');
  return lineas.join('\n');
}

// Si el número todavía es el de ejemplo (tiene X), la demo no apunta a nadie:
// el link abre WhatsApp con el mensaje armado y se elige el contacto.
export const esNumeroEjemplo = (negocio) => /x/i.test(String(negocio.whatsapp ?? '')) || !String(negocio.whatsapp ?? '').trim();

// Reemplaza {campo} por el valor de la primera fuente que lo tenga (ej.: {nombreCorto}, {servicio}).
export const completar = (texto, ...fuentes) =>
  String(texto).replace(/\{(\w+)\}/g, (m, k) => {
    for (const f of fuentes) if (f && f[k] != null) return f[k];
    return m;
  });

export const linkWhatsApp = (negocio, texto) =>
  `https://wa.me/${esNumeroEjemplo(negocio) ? '' : negocio.whatsapp}?text=${encodeURIComponent(texto)}`;
