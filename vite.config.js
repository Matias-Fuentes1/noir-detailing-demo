import { readFileSync, existsSync, copyFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import { renderPagina } from './build/pagina.mjs';

const raiz = import.meta.dirname;
const rutaNegocio = resolve(raiz, 'src/config/negocio.json');
const rutaImagenes = resolve(raiz, 'public/img/imagenes.json');

// Contenido para el HTML del build y del servidor de desarrollo: lo publicado en Supabase
// (si hay variables de entorno) o, si no, src/config/negocio.json.
async function cargarContenido() {
  try {
    const { contenidoPublicado } = await import('./server/base.mjs');
    return await contenidoPublicado({ sinCache: true });
  } catch (e) {
    console.warn('[pagina] Uso negocio.json:', e.message);
    return JSON.parse(readFileSync(rutaNegocio, 'utf8'));
  }
}

function paginaDesdeContenido() {
  let esBuild = false;
  let salida = resolve(raiz, 'dist');
  return {
    name: 'pagina-desde-contenido',
    configResolved(config) {
      esBuild = config.command === 'build';
      salida = resolve(config.root, config.build.outDir);
    },
    transformIndexHtml: {
      order: 'pre',
      async handler(html, ctx) {
        if (!html.includes('<!--@pagina-->')) return html; // el panel (/admin) tiene su propio HTML
        const negocio = await cargarContenido();
        const imagenes = existsSync(rutaImagenes) ? JSON.parse(readFileSync(rutaImagenes, 'utf8')) : {};
        return renderPagina(html, negocio, imagenes, { silencioso: !esBuild && ctx?.server != null });
      },
    },
    // Después del build: dist/_plantilla.html es la base que api/pagina.js re-renderiza en cada visita.
    // En Vercel se borra dist/index.html para que "/" vaya a la función (si no, ganaría el archivo estático).
    closeBundle() {
      if (!esBuild) return;
      const index = resolve(salida, 'index.html');
      if (!existsSync(index)) return;
      copyFileSync(index, resolve(salida, '_plantilla.html'));
      if (process.env.VERCEL || process.env.NOIR_SSR === '1') rmSync(index);
    },
    // En desarrollo, /api/* corre las mismas funciones que en Vercel.
    configureServer(server) {
      server.watcher.add([rutaNegocio, rutaImagenes, resolve(raiz, 'build')]);
      server.watcher.on('change', (archivo) => {
        if (archivo.endsWith('negocio.json') || archivo.endsWith('imagenes.json') || archivo.includes('build')) server.ws.send({ type: 'full-reload' });
      });
      server.middlewares.use(async (req, res, next) => {
        const ruta = req.url.split('?')[0];
        const nombre = { '/api/consultas': 'consultas', '/api/evento': 'evento', '/api/preview': 'preview' }[ruta];
        if (!nombre) return next();
        try {
          req.headers['x-forwarded-proto'] = 'http';
          const mod = await server.ssrLoadModule(`/api/${nombre}.js`);
          const plantilla = async () => server.transformIndexHtml('/', readFileSync(resolve(raiz, 'index.html'), 'utf8'));
          await mod.default(req, res, { plantilla });
        } catch (e) {
          console.error(e);
          res.statusCode = 500;
          res.end('Error en la API de desarrollo');
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Las variables sin prefijo VITE_ (como SUPABASE_SERVICE_ROLE_KEY) quedan solo del lado del servidor.
  const variables = loadEnv(mode, raiz, '');
  for (const [k, v] of Object.entries(variables)) if (process.env[k] === undefined) process.env[k] = v;

  return {
    base: './',
    plugins: [paginaDesdeContenido()],
    esbuild: { jsx: 'automatic', jsxImportSource: 'preact' },
    build: {
      rollupOptions: {
        input: {
          index: resolve(raiz, 'index.html'),
          admin: resolve(raiz, 'admin/index.html'),
        },
      },
    },
  };
});
