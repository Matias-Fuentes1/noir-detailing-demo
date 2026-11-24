// Estado compartido del panel: sesión, borrador y lo publicado.
// El borrador es el documento que editan todas las pantallas de contenido; "Publicar" lo copia a la web.
import { useEffect, useState } from 'preact/hooks';
import { supabase, mensajeError } from './supabase.js';
import { normalizar } from '../js/contenido.js';

const oyentes = new Set();
export const estado = {
  sesion: null,
  usuario: null,
  esAdmin: false,
  cargandoSesion: true,
  borrador: null,          // documento normalizado
  borradorFecha: null,
  publicado: null,
  publicadoFecha: null,
  cargandoContenido: false,
  errorContenido: '',
  hayCambiosSinPublicar: false,
};

const avisar = () => oyentes.forEach((f) => f({ ...estado }));
export function actualizar(parcial) {
  Object.assign(estado, parcial);
  avisar();
}

export function useEstado() {
  const [s, set] = useState({ ...estado });
  useEffect(() => {
    oyentes.add(set);
    return () => oyentes.delete(set);
  }, []);
  return s;
}

const iguales = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// ---------------------------------------------------------------- sesión
export async function iniciarSesion() {
  if (!supabase) return actualizar({ cargandoSesion: false });
  const { data } = await supabase.auth.getSession();
  await aplicarSesion(data.session);
  supabase.auth.onAuthStateChange((evento, sesion) => {
    if (evento === 'PASSWORD_RECOVERY') location.hash = '#/nueva-clave';
    if (evento === 'SIGNED_OUT') return actualizar({ sesion: null, usuario: null, esAdmin: false, borrador: null, publicado: null });
    if (evento === 'TOKEN_REFRESHED' || evento === 'SIGNED_IN') aplicarSesion(sesion);
  });
}

async function aplicarSesion(sesion) {
  if (!sesion) return actualizar({ sesion: null, usuario: null, esAdmin: false, cargandoSesion: false });
  if (estado.sesion?.user?.id === sesion.user.id && estado.esAdmin) return actualizar({ sesion });
  const { data: esAdmin } = await supabase.rpc('es_admin');
  actualizar({ sesion, usuario: sesion.user, esAdmin: esAdmin === true, cargandoSesion: false });
  if (esAdmin === true) cargarContenido();
}

export async function entrar(email, clave) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: clave });
  if (error) throw new Error(mensajeError(error));
  const { data: esAdmin } = await supabase.rpc('es_admin');
  if (esAdmin !== true) {
    await supabase.auth.signOut();
    throw new Error('Esta cuenta existe, pero no tiene acceso al panel. Pedile a quien administra el sitio que te dé permiso.');
  }
  await aplicarSesion(data.session);
}

export async function salir() {
  await supabase.auth.signOut();
  location.hash = '#/';
}

// ---------------------------------------------------------------- contenido
export async function cargarContenido() {
  actualizar({ cargandoContenido: true, errorContenido: '' });
  const { data, error } = await supabase.from('contenido').select('clave, doc, actualizado_en');
  if (error) return actualizar({ cargandoContenido: false, errorContenido: mensajeError(error) });
  const b = data.find((x) => x.clave === 'borrador');
  const p = data.find((x) => x.clave === 'publicado');
  if (!b) return actualizar({ cargandoContenido: false, errorContenido: 'La base no tiene contenido inicial. Corré la migración "contenido_inicial" (ver docs/ADMIN.md).' });
  const borrador = normalizar(b.doc);
  const publicado = p ? normalizar(p.doc) : null;
  actualizar({
    borrador,
    borradorFecha: b.actualizado_en,
    publicado,
    publicadoFecha: p?.actualizado_en ?? null,
    cargandoContenido: false,
    hayCambiosSinPublicar: !publicado || !iguales(borrador, publicado),
  });
}

// Guarda claves de primer nivel del documento en el borrador ({ servicios: [...] }).
export async function guardarBorrador(cambios) {
  const { data, error } = await supabase.rpc('guardar_borrador', { cambios });
  if (error) throw new Error(mensajeError(error));
  const borrador = normalizar({ ...estado.borrador, ...cambios });
  actualizar({ borrador, borradorFecha: data, hayCambiosSinPublicar: !estado.publicado || !iguales(borrador, estado.publicado) });
}

export async function publicar(nota) {
  const { data, error } = await supabase.rpc('publicar', { nota: nota || null });
  if (error) throw new Error(mensajeError(error));
  actualizar({ publicado: estado.borrador, publicadoFecha: data, hayCambiosSinPublicar: false });
}

export async function descartarBorrador() {
  const { error } = await supabase.rpc('descartar_borrador');
  if (error) throw new Error(mensajeError(error));
  await cargarContenido();
}

export async function token() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? '';
}
