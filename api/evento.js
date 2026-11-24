// POST /api/evento  →  visitas y clics en WhatsApp para el dashboard (sin cookies ni IP).
import { clienteServicio, hayServiceRole, huellaDiaria, leerJson, mismoOrigen, responder } from '../server/base.mjs';

const TIPOS = new Set(['visita', 'whatsapp']);
const MAX_POR_DIA = 300;

export default async function handler(req, res) {
  if (req.method !== 'POST') return responder(res, 405, { error: 'Método no permitido' }, { Allow: 'POST' });
  if (!mismoOrigen(req)) return responder(res, 403, { error: 'Origen no permitido' });
  if (!hayServiceRole()) return responder(res, 204);
  if (/bot|crawl|spider|preview|headless/i.test(String(req.headers['user-agent'] ?? ''))) return responder(res, 204);

  let datos;
  try {
    datos = await leerJson(req, 2048);
  } catch {
    return responder(res, 400, { error: 'Pedido inválido' });
  }
  const tipo = String(datos.tipo ?? '');
  if (!TIPOS.has(tipo)) return responder(res, 400, { error: 'Tipo inválido' });
  const detalle = datos.detalle == null ? null : String(datos.detalle).replace(/[^\p{L}\p{N} #_\-]/gu, '').slice(0, 40) || null;

  const db = clienteServicio();
  const huella = huellaDiaria(req);
  const hoy = new Date();
  hoy.setUTCHours(0, 0, 0, 0);
  const { count } = await db.from('eventos').select('id', { count: 'exact', head: true }).eq('huella', huella).gte('creado_en', hoy.toISOString());
  if ((count ?? 0) >= MAX_POR_DIA) return responder(res, 204);

  const { error } = await db.from('eventos').insert({ tipo, detalle, huella });
  if (error) console.error('[evento]', error.message);
  return responder(res, 204);
}
