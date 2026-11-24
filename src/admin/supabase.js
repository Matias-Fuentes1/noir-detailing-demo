// Cliente de Supabase del panel. Solo usa la URL y la clave publishable (públicas por diseño):
// lo que cada usuario puede leer o cambiar lo deciden las políticas RLS de la base.
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

export const configurado = Boolean(url && anon);

export const supabase = configurado
  ? createClient(url, anon, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'noir-admin-sesion' } })
  : null;

// Mensajes de error entendibles para alguien que no programa.
export function mensajeError(e) {
  const m = String(e?.message ?? e ?? '');
  if (/Invalid login credentials/i.test(m)) return 'El email o la contraseña no son correctos.';
  if (/Email not confirmed/i.test(m)) return 'Confirmá tu email antes de entrar.';
  if (/rate limit|too many/i.test(m)) return 'Demasiados intentos. Esperá un momento y probá de nuevo.';
  if (/JWT|token|session/i.test(m)) return 'Tu sesión venció. Volvé a iniciar sesión.';
  if (/No autorizado|permission denied|row-level security|42501/i.test(m)) return 'Tu cuenta no tiene permiso para hacer esto.';
  if (/Failed to fetch|NetworkError|network/i.test(m)) return 'No hay conexión con el servidor. Revisá internet y probá de nuevo.';
  if (/Payload too large|exceeded the maximum allowed size/i.test(m)) return 'La imagen es demasiado pesada (máximo 5 MB).';
  return m || 'Algo salió mal. Probá de nuevo.';
}
