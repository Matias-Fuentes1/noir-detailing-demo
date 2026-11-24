// POST /api/consultas  →  guarda el pedido del cotizador antes de que el visitante abra WhatsApp.
// El precio NO se toma del navegador: se recalcula acá con el contenido publicado (calculo.js),
// así nadie puede guardar un presupuesto inventado.
import { contenidoPublicado, clienteServicio, hayServiceRole, huellaDiaria, leerJson, mismoOrigen, responder } from '../server/base.mjs';
import { calcular, mensajePresupuesto } from '../src/js/calculo.js';

const corto = (v, max) => String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
const MAX_POR_HORA = 10;

export default async function handler(req, res) {
  if (req.method !== 'POST') return responder(res, 405, { error: 'Método no permitido' }, { Allow: 'POST' });
  if (!mismoOrigen(req)) return responder(res, 403, { error: 'Origen no permitido' });
  if (!hayServiceRole()) return responder(res, 503, { error: 'El guardado de consultas no está configurado' });

  let datos;
  try {
    datos = await leerJson(req);
  } catch (e) {
    return responder(res, e.status ?? 400, { error: 'Pedido inválido' });
  }

  // Trampa anti-bots: un campo invisible que las personas no completan.
  if (corto(datos.web, 200)) return responder(res, 202, { ok: true });

  const codigo = corto(datos.codigo, 12).toUpperCase();
  if (!/^N-[A-Z0-9]{6}$/.test(codigo)) return responder(res, 400, { error: 'Código inválido' });
  const nombre = corto(datos.nombre, 80);
  const telefono = corto(datos.telefono, 40).replace(/[^\d+()\-\s]/g, '');
  const sel = datos.seleccion ?? {};
  const seleccion = {
    tamano: corto(sel.tamano, 60),
    principal: corto(sel.principal, 60),
    estado: Number.isInteger(Number(sel.estado)) ? Number(sel.estado) : 0,
    extras: Array.isArray(sel.extras) ? sel.extras.slice(0, 20).map((x) => corto(x, 60)) : [],
  };

  const negocio = await contenidoPublicado();
  const r = calcular(negocio, seleccion);
  const huella = huellaDiaria(req);
  const db = clienteServicio();

  const haceUnaHora = new Date(Date.now() - 3600_000).toISOString();
  const { count, error: errCuenta } = await db.from('consultas').select('id', { count: 'exact', head: true }).eq('huella', huella).gte('creada_en', haceUnaHora);
  if (errCuenta) {
    console.error('[consultas] cuenta', errCuenta.message);
    return responder(res, 500, { error: 'No se pudo guardar' });
  }
  if ((count ?? 0) >= MAX_POR_HORA) return responder(res, 429, { error: 'Demasiadas consultas seguidas' });

  const fila = {
    codigo,
    nombre: nombre || null,
    telefono: telefono || null,
    tamano_id: r.tamano.id,
    tamano: r.tamano.nombre,
    principal_id: r.principal.id,
    principal: r.principal.nombre,
    principal_tipo: r.principal.tipo,
    estado_pintura: r.estado?.nombre ?? null,
    extras: r.extras.map((e) => ({ id: e.id, nombre: e.nombre, precio: e.precio })),
    total: r.total,
    dias: r.dias,
    tiempo: r.tiempo,
    desglose: r.desglose,
    mensaje: mensajePresupuesto(negocio, r, nombre, codigo),
    origen: 'cotizador',
    huella,
  };
  const { error } = await db.from('consultas').insert(fila);
  if (error) {
    if (error.code === '23505') return responder(res, 200, { ok: true, codigo }); // reintento del mismo pedido
    console.error('[consultas] insert', error.message);
    return responder(res, 500, { error: 'No se pudo guardar' });
  }
  return responder(res, 201, { ok: true, codigo, total: r.total });
}
