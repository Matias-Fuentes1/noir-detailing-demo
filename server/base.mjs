// Utilidades del lado del servidor (funciones de Vercel en /api y el servidor de desarrollo de Vite).
// Nada de este archivo llega al navegador.
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { normalizar } from '../src/js/contenido.js';

const leer = (url) => JSON.parse(readFileSync(url, 'utf8'));

export const env = (k) => process.env[k] ?? '';
export const supabaseUrl = () => env('VITE_SUPABASE_URL') || env('SUPABASE_URL');
// Clave pública (publishable / anon): respeta RLS. Clave secreta (secret / service_role): solo servidor.
export const supabaseAnon = () => env('VITE_SUPABASE_PUBLISHABLE_KEY') || env('VITE_SUPABASE_ANON_KEY') || env('SUPABASE_ANON_KEY');
export const claveSecreta = () => env('SUPABASE_SECRET_KEY') || env('SUPABASE_SERVICE_ROLE_KEY');
export const hayServiceRole = () => Boolean(supabaseUrl() && claveSecreta());
export const haySupabase = () => Boolean(supabaseUrl() && supabaseAnon());

const opcionesCliente = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };

// Cliente público (respeta RLS): solo puede leer el contenido publicado.
export const clienteAnon = () => createClient(supabaseUrl(), supabaseAnon(), opcionesCliente);

// Cliente con los permisos del usuario que manda su token (respeta RLS como ese usuario).
export const clienteUsuario = (token) =>
  createClient(supabaseUrl(), supabaseAnon(), { ...opcionesCliente, global: { headers: { Authorization: `Bearer ${token}` } } });

// Cliente de servicio (saltea RLS). Solo para insertar consultas y eventos ya validados.
export const clienteServicio = () => createClient(supabaseUrl(), claveSecreta(), opcionesCliente);

// ---------------------------------------------------------------- contenido
let cache = { doc: null, hasta: 0 };

export function contenidoBase() {
  return leer(new URL('../src/config/negocio.json', import.meta.url));
}

// Contenido publicado (con caché de 15 s por instancia). Si Supabase no está configurado o falla,
// usa src/config/negocio.json para que la web nunca quede en blanco.
export async function contenidoPublicado({ sinCache = false } = {}) {
  if (!sinCache && cache.doc && Date.now() < cache.hasta) return cache.doc;
  let doc = null;
  if (haySupabase()) {
    try {
      const { data, error } = await clienteAnon().from('contenido').select('doc').eq('clave', 'publicado').maybeSingle();
      if (error) throw error;
      doc = data?.doc ?? null;
    } catch (e) {
      console.error('[contenido] No se pudo leer Supabase, uso negocio.json:', e.message);
    }
  }
  doc = normalizar(doc ?? contenidoBase());
  cache = { doc, hasta: Date.now() + 15000 };
  return doc;
}

export function imagenesLocales() {
  for (const ruta of ['../dist/img/imagenes.json', '../public/img/imagenes.json']) {
    const url = new URL(ruta, import.meta.url);
    if (existsSync(url)) return leer(url);
  }
  return {};
}

export function plantilla() {
  for (const ruta of ['../dist/_plantilla.html']) {
    const url = new URL(ruta, import.meta.url);
    if (existsSync(url)) return readFileSync(url, 'utf8');
  }
  return null;
}

// ---------------------------------------------------------------- http
export async function leerJson(req, limite = 16 * 1024) {
  if (req.body !== undefined && req.body !== null && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body || '{}');
  if (Buffer.isBuffer(req.body)) return JSON.parse(req.body.toString('utf8') || '{}');
  const partes = [];
  let total = 0;
  for await (const parte of req) {
    total += parte.length;
    if (total > limite) throw Object.assign(new Error('Pedido demasiado grande'), { status: 413 });
    partes.push(parte);
  }
  const texto = Buffer.concat(partes).toString('utf8');
  return texto ? JSON.parse(texto) : {};
}

export function responder(res, status, cuerpo, headers = {}) {
  res.statusCode = status;
  for (const [k, v] of Object.entries({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers })) res.setHeader(k, v);
  res.end(cuerpo === undefined ? '' : JSON.stringify(cuerpo));
}

export function ipDe(req) {
  const xff = String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim();
  return xff || req.headers['x-real-ip'] || req.socket?.remoteAddress || '';
}

// Hash anónimo que cambia cada día: sirve para contar visitantes únicos y frenar abusos,
// pero no permite identificar a nadie ni seguirlo entre días. La IP no se guarda.
export function huellaDiaria(req) {
  const dia = new Date().toISOString().slice(0, 10);
  const sal = env('HUELLA_SAL') || claveSecreta().slice(-16) || 'noir';
  return createHash('sha256').update(`${ipDe(req)}|${req.headers['user-agent'] ?? ''}|${dia}|${sal}`).digest('hex').slice(0, 24);
}

export function mismoOrigen(req) {
  const origen = req.headers.origin;
  if (!origen) return true; // sendBeacon y algunos navegadores no lo mandan en el mismo origen
  try {
    return new URL(origen).host === req.headers.host;
  } catch {
    return false;
  }
}
