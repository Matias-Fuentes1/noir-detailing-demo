// POST /api/preview  →  HTML de la página con el BORRADOR (o con cambios sin guardar que manda el panel).
// Solo para administradores: verifica el token de la sesión y que el usuario esté en la tabla admins.
import { clienteUsuario, haySupabase, imagenesLocales, leerJson, plantilla, responder } from '../server/base.mjs';
import { renderSobrePlantilla } from '../build/pagina.mjs';
import { normalizar } from '../src/js/contenido.js';

export default async function handler(req, res, ctx = {}) {
  if (req.method !== 'POST') return responder(res, 405, { error: 'Método no permitido' }, { Allow: 'POST' });
  if (!haySupabase()) return responder(res, 503, { error: 'Supabase no está configurado' });
  const token = String(req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
  if (!token) return responder(res, 401, { error: 'Falta iniciar sesión' });

  const db = clienteUsuario(token);
  const { data: esAdmin, error: errAdmin } = await db.rpc('es_admin');
  if (errAdmin || esAdmin !== true) return responder(res, 403, { error: 'No autorizado' });

  let cuerpo;
  try {
    cuerpo = await leerJson(req, 2 * 1024 * 1024);
  } catch (e) {
    return responder(res, e.status ?? 400, { error: 'Pedido inválido' });
  }
  let doc = cuerpo.doc;
  if (!doc) {
    const { data, error } = await db.from('contenido').select('doc').eq('clave', 'borrador').maybeSingle();
    if (error || !data) return responder(res, 404, { error: 'No hay borrador' });
    doc = data.doc;
  }
  const html = ctx.plantilla ? await ctx.plantilla() : plantilla();
  if (!html) return responder(res, 500, { error: 'Falta la plantilla: corré npm run build' });

  const origen = `${req.headers['x-forwarded-proto'] ?? 'https'}://${req.headers['x-forwarded-host'] ?? req.headers.host}`;
  const pagina = renderSobrePlantilla(html, normalizar(doc), imagenesLocales(), { silencioso: true, origen, preview: 'sin publicar', noindex: true })
    // En el iframe del panel, las rutas relativas (./assets, /img) tienen que apuntar al sitio.
    .replace('<head>', `<head>\n  <base href="${origen}/">`);
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(pagina);
}
