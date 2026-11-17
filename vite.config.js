import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import { renderPagina } from './build/pagina.mjs';

const raiz = import.meta.dirname;
const rutaNegocio = resolve(raiz, 'src/config/negocio.json');
const rutaImagenes = resolve(raiz, 'public/img/imagenes.json');

// Arma el HTML de la página a partir de src/config/negocio.json.
// El contenido queda escrito en el HTML final, así se ve aunque el JavaScript no cargue.
function paginaDesdeConfig() {
  return {
    name: 'pagina-desde-config',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        const negocio = JSON.parse(readFileSync(rutaNegocio, 'utf8'));
        const imagenes = existsSync(rutaImagenes) ? JSON.parse(readFileSync(rutaImagenes, 'utf8')) : {};
        return renderPagina(html, negocio, imagenes);
      },
    },
    configureServer(server) {
      server.watcher.add([rutaNegocio, rutaImagenes, resolve(raiz, 'build')]);
      server.watcher.on('change', (archivo) => {
        if (archivo.endsWith('negocio.json') || archivo.endsWith('imagenes.json') || archivo.includes('build')) {
          server.ws.send({ type: 'full-reload' });
        }
      });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [paginaDesdeConfig()],
});
