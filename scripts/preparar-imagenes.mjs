// Corre antes de dev y build (npm "predev" / "prebuild").
// Convierte cada foto de /fotos (jpg, png o webp), respetando las subcarpetas, a WebP en /public/img:
//   fotos/servicios/opticas.jpg → public/img/servicios/opticas.webp      (ancho máximo 1600 px)
//                               → public/img/servicios/opticas-800.webp  (ancho máximo 800 px)
// y escribe /public/img/imagenes.json con el ancho y alto de cada una ("servicios/opticas": { w, h }).
// En negocio.json cada foto se nombra igual: "servicios/opticas" (sin extensión).
import { readdir, mkdir, stat, writeFile } from 'node:fs/promises';
import { join, parse, relative, sep } from 'node:path';
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

async function listar(dir) {
  const salida = [];
  for (const e of (await readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    const ruta = join(dir, e.name);
    if (e.isDirectory()) salida.push(...(await listar(ruta)));
    else if (/\.(jpe?g|png|webp)$/i.test(e.name)) salida.push(ruta);
  }
  return salida;
}

const listado = {};
let generadas = 0;

for (const entrada of await listar(origen)) {
  const { dir, name } = parse(relative(origen, entrada));
  const clave = (dir ? `${dir}/${name}` : name).split(sep).join('/');
  const carpeta = join(destino, dir);
  await mkdir(carpeta, { recursive: true });
  const grande = join(carpeta, `${name}.webp`);
  const chica = join(carpeta, `${name}-800.webp`);

  if ((await masNuevo(entrada, grande)) || (await masNuevo(entrada, chica))) {
    await sharp(entrada).rotate().resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 80 }).toFile(grande);
    await sharp(entrada).rotate().resize({ width: 800, withoutEnlargement: true }).webp({ quality: 76 }).toFile(chica);
    generadas++;
  }
  const { width, height } = await sharp(grande).metadata();
  listado[clave] = { w: width, h: height };
}

await writeFile(join(destino, 'imagenes.json'), JSON.stringify(listado, null, 2));
console.log(`[imagenes] ${Object.keys(listado).length} foto(s) disponibles, ${generadas} convertida(s) a WebP`);
