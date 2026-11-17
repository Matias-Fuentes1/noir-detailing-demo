// Cálculo del cotizador. Lo usan la página (para el valor inicial, sin JS)
// y el navegador (para actualizarlo en vivo). Todos los números salen de negocio.json.

const formato = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 });

export const pesos = (n) => `$${formato.format(Math.round(n))}`;

export const textoDias = (d) => {
  if (d < 1) return 'en el día';
  const n = Math.ceil(d);
  return `${n} ${n === 1 ? 'día' : 'días'}`;
};

export function opcionesPrincipales(negocio) {
  return [
    ...negocio.paquetes.map((p) => ({ ...p, tipo: 'paquete' })),
    ...negocio.servicios.map((s) => ({ ...s, tipo: 'servicio' })),
  ];
}

export function calcular(negocio, sel) {
  const c = negocio.cotizador;
  const tamano = c.tamanos.find((t) => t.id === sel.tamano) ?? c.tamanos[0];
  const principal = opcionesPrincipales(negocio).find((p) => p.id === sel.principal) ?? negocio.paquetes[0];
  const estado = c.estados[Number(sel.estado)] ?? c.estados[0];
  const extras = c.extras.filter((e) => (sel.extras ?? []).includes(e.id));
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

export function mensajePresupuesto(negocio, r, nombre) {
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
