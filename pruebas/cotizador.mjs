// Prueba TODAS las combinaciones del cotizador (tamaño × paquete/servicio × estado × extras)
// contra una fórmula escrita de nuevo acá, y verifica que el precio de las tarjetas no afecte el cálculo.
// Uso: node pruebas/cotizador.mjs
import { readFileSync } from 'node:fs';
import { normalizar } from '../src/js/contenido.js';
import { calcular, opcionesPrincipales, tamanosActivos, extrasActivos } from '../src/js/calculo.js';

const doc = normalizar(JSON.parse(readFileSync(new URL('../src/config/negocio.json', import.meta.url), 'utf8')));
const red = (n) => Math.round(n / doc.cotizador.redondeo) * doc.cotizador.redondeo;

function esperado(tam, pr, iEstado, extras) {
  const base = red(pr.precio * tam.multiplicador);
  const est = doc.cotizador.estados[iEstado];
  const recargo = pr.pintura ? red(base * est.recargo) : 0;
  return base + recargo + extras.reduce((s, e) => s + e.precio, 0);
}

const extras = extrasActivos(doc);
const subconjuntos = Array.from({ length: 1 << extras.length }, (_, m) => extras.filter((_, i) => m & (1 << i)));
let total = 0, fallas = 0;
for (const t of tamanosActivos(doc))
  for (const p of opcionesPrincipales(doc))
    for (let e = 0; e < doc.cotizador.estados.length; e++)
      for (const ex of subconjuntos) {
        total++;
        const r = calcular(doc, { tamano: t.id, principal: p.id, estado: e, extras: ex.map((x) => x.id) });
        const esp = esperado(t, p, e, ex);
        if (r.total !== esp || r.total !== r.desglose.reduce((s, d) => s + d.monto, 0) || r.total % doc.cotizador.redondeo !== 0) {
          fallas++;
          if (fallas < 5) console.log('✗', t.id, p.id, e, ex.map((x) => x.id), r.total, esp);
        }
      }
console.log(`${total} combinaciones probadas, ${fallas} fallas`);

// El precio "Desde" de la tarjeta no cambia el cotizador; el precio del cotizador sí.
const sel = { tamano: 'mediano', principal: 'pulido', estado: 1, extras: [] };
const antes = calcular(doc, sel).total;
const conTarjeta = calcular(normalizar({ ...doc, servicios: doc.servicios.map((s) => (s.id === 'pulido' ? { ...s, precio: 999999 } : s)) }), sel).total;
const conCotizador = calcular(normalizar({ ...doc, servicios: doc.servicios.map((s) => (s.id === 'pulido' ? { ...s, precioCotizador: 200000 } : s)) }), sel).total;
const okTarjeta = antes === conTarjeta;
const okCot = conCotizador !== antes;
console.log(okTarjeta ? '✓' : '✗', 'cambiar el precio de la tarjeta no altera el cotizador');
console.log(okCot ? '✓' : '✗', 'cambiar el precio del cotizador sí cambia el total');
// Desactivar un paquete o extra lo saca del cálculo
const sinPremium = normalizar({ ...doc, paquetes: doc.paquetes.map((p) => (p.id === 'premium' ? { ...p, activo: false } : p)) });
const okInactivo = !opcionesPrincipales(sinPremium).some((p) => p.id === 'premium') && calcular(sinPremium, { ...sel, principal: 'premium' }).principal.id !== 'premium';
console.log(okInactivo ? '✓' : '✗', 'un paquete desactivado no se puede cotizar');
process.exit(fallas || !okTarjeta || !okCot || !okInactivo ? 1 : 0);
