// GET /  →  la página pública, armada en cada visita con el contenido publicado desde el panel.
// Vercel la guarda 60 s en su CDN (y sirve la copia anterior mientras actualiza), así que un cambio
// publicado se ve en menos de un minuto sin volver a desplegar.
import { contenidoPublicado, imagenesLocales, plantilla } from '../server/base.mjs';
import { renderSobrePlantilla } from '../build/pagina.mjs';

export default async function handler(req, res, ctx = {}) {
  try {
    const html = ctx.plantilla ? await ctx.plantilla() : plantilla();
    if (!html) throw new Error('Falta dist/_plantilla.html: corré npm run build');
    const doc = await contenidoPublicado();
    const origen = `https://${req.headers['x-forwarded-host'] ?? req.headers.host}`;
    const pagina = renderSobrePlantilla(html, doc, imagenesLocales(), { silencioso: true, origen });
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=600');
    res.end(pagina);
  } catch (e) {
    console.error('[pagina]', e);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('La página no está disponible en este momento.');
  }
}
