// Corre antes de dev y build (npm "predev" / "prebuild").
// Convierte cada foto de /fotos (jpg, png o webp) a WebP en /public/img:
//   <nombre>.webp      → ancho máximo 1600 px
//   <nombre>-800.webp  → ancho máximo 800 px (para pantallas chicas y tarjetas)
// y escribe /public/img/imagenes.json con el ancho y alto de cada una.
// La página usa ese listado: si una foto todavía no existe, muestra un placeholder.
import { readdir, mkdir, stat, writeFile } from 'node:fs/promises';
import { join, parse } from 'node:path';
import sharp from 'sharp';

const raiz = join(import.meta.dirname, '..');
const origen = join(raiz, 'fotos');
const destino = join(raiz, 'public/img');

async function masNuevo(a, b) {
  try {
    return (await stat(a)).mtimeMs > (await stat(b)).mtimeMs;
  } catch {
    return true;
  }
}

await mkdir(destino, { recursive: true });
const listado = {};
let generadas = 0;

for (const archivo of (await readdir(origen)).sort()) {
  if (!/\.(jpe?g|png|webp)$/i.test(archivo)) continue;
  const { name } = parse(archivo);
  const entrada = join(origen, archivo);
  const grande = join(destino, `${name}.webp`);
  const chica = join(destino, `${name}-800.webp`);

  if (await masNuevo(entrada, grande)) {
    await sharp(entrada).rotate().resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 80 }).toFile(grande);
    await sharp(entrada).rotate().resize({ width: 800, withoutEnlargement: true }).webp({ quality: 76 }).toFile(chica);
    generadas++;
  }
  const { width, height } = await sharp(grande).metadata();
  listado[name] = { w: width, h: height };
}

await writeFile(join(destino, 'imagenes.json'), JSON.stringify(listado, null, 2));
console.log(`[imagenes] ${Object.keys(listado).length} foto(s) disponibles, ${generadas} convertida(s) a WebP`);
