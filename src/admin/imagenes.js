// Subida de fotos: se achican en el navegador (WebP de 1600 y 800 px, como hace el build con fotos/)
// y se guardan en el bucket público 'medios' de Supabase Storage.
import { supabase, mensajeError } from './supabase.js';

const TIPOS = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon'];
const MAX_MB = 15;

async function achicar(archivo, ancho, tipo, calidad) {
  const bitmap = await createImageBitmap(archivo);
  const escala = Math.min(1, ancho / bitmap.width);
  const w = Math.round(bitmap.width * escala);
  const h = Math.round(bitmap.height * escala);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (tipo === 'image/jpeg') { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h); }
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  const blob = await new Promise((ok) => canvas.toBlob(ok, tipo, calidad));
  if (!blob) throw new Error('El navegador no pudo procesar la imagen.');
  return { blob, w, h };
}

const nombreUnico = () => `${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID().slice(0, 12)}`;

async function subir(ruta, blob, tipo) {
  const { error } = await supabase.storage.from('medios').upload(ruta, blob, { contentType: tipo, cacheControl: '31536000', upsert: false });
  if (error) throw new Error(mensajeError(error));
  return supabase.storage.from('medios').getPublicUrl(ruta).data.publicUrl;
}

export function validarArchivo(archivo, { soloIcono = false } = {}) {
  if (!archivo) return 'Elegí una imagen.';
  if (!TIPOS.includes(archivo.type)) return 'Formato no admitido. Usá JPG, PNG o WebP.';
  if (!soloIcono && /svg|icon/.test(archivo.type)) return 'Para fotos usá JPG, PNG o WebP.';
  if (archivo.size > MAX_MB * 1024 * 1024) return `La imagen pesa más de ${MAX_MB} MB.`;
  return '';
}

// Devuelve { src, src800, w, h } listo para guardar en el contenido.
export async function subirFoto(archivo, carpeta = 'fotos', { formato = 'image/webp', ancho = 1600 } = {}) {
  const error = validarArchivo(archivo);
  if (error) throw new Error(error);
  const ext = formato === 'image/jpeg' ? 'jpg' : 'webp';
  const base = `${carpeta}/${nombreUnico()}`;
  const grande = await achicar(archivo, ancho, formato, 0.82);
  const chica = await achicar(archivo, 800, formato, 0.78);
  const [src, src800] = await Promise.all([subir(`${base}.${ext}`, grande.blob, formato), subir(`${base}-800.${ext}`, chica.blob, formato)]);
  return { src, src800, w: grande.w, h: grande.h };
}

// Favicon: se sube tal cual si es SVG/ICO; si es foto, se recorta a 256 px en PNG.
export async function subirIcono(archivo) {
  const error = validarArchivo(archivo, { soloIcono: true });
  if (error) throw new Error(error);
  if (/svg|icon/.test(archivo.type)) {
    const ext = archivo.type.includes('svg') ? 'svg' : 'ico';
    const src = await subir(`iconos/${nombreUnico()}.${ext}`, archivo, archivo.type);
    return { src, src800: src, w: 256, h: 256 };
  }
  const { blob, w, h } = await achicar(archivo, 256, 'image/png');
  const src = await subir(`iconos/${nombreUnico()}.png`, blob, 'image/png');
  return { src, src800: src, w, h };
}

// URL para mostrar una foto en el panel (subida o del build en /img).
export function urlFoto(f, chica = true) {
  if (!f) return '';
  if (typeof f === 'object') return chica ? f.src800 || f.src : f.src;
  return `/img/${f}${chica ? '-800' : ''}.webp`;
}
