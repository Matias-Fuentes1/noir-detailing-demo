// Crea (o habilita) un administrador del panel.
// Uso:  npm run crear-admin -- dueño@local.com
// Pide la contraseña por consola (no queda en el historial). Necesita SUPABASE_SECRET_KEY en .env.
// Si el usuario ya existe en Supabase Auth, solo lo agrega a la tabla admins.
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';
import { createClient } from '@supabase/supabase-js';

const raiz = fileURLToPath(new URL('..', import.meta.url));
Object.assign(process.env, { ...loadEnv('development', raiz, ''), ...process.env });

const url = process.env.VITE_SUPABASE_URL;
const secreta = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = (process.argv[2] ?? '').trim().toLowerCase();
const nombre = process.argv[3] ?? null;

if (!url || !secreta) {
  console.error('Falta VITE_SUPABASE_URL o SUPABASE_SECRET_KEY en .env');
  process.exit(1);
}
if (!/^\S+@\S+\.\S+$/.test(email)) {
  console.error('Uso: npm run crear-admin -- email@dominio.com ["Nombre"]');
  process.exit(1);
}

function preguntarOculto(texto) {
  return new Promise((ok) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (s) => { if (!rl.silenciar) rl.output.write(s); };
    rl.question(texto, (r) => { rl.close(); process.stdout.write('\n'); ok(r); });
    rl.silenciar = true;
  });
}

const db = createClient(url, secreta, { auth: { persistSession: false, autoRefreshToken: false } });

let usuario = null;
for (let pagina = 1; !usuario; pagina++) {
  const { data, error } = await db.auth.admin.listUsers({ page: pagina, perPage: 200 });
  if (error) throw error;
  usuario = data.users.find((u) => u.email?.toLowerCase() === email) ?? null;
  if (data.users.length < 200) break;
}

if (!usuario) {
  const clave = process.env.NOIR_CLAVE_ADMIN || (await preguntarOculto(`Contraseña para ${email} (mínimo 10 caracteres): `));
  if (clave.length < 10) {
    console.error('La contraseña tiene que tener al menos 10 caracteres.');
    process.exit(1);
  }
  const { data, error } = await db.auth.admin.createUser({ email, password: clave, email_confirm: true });
  if (error) throw error;
  usuario = data.user;
  console.log(`Usuario creado: ${email}`);
} else {
  console.log(`El usuario ${email} ya existía en Supabase Auth.`);
}

const { error } = await db.from('admins').upsert({ user_id: usuario.id, email, nombre });
if (error) throw error;
console.log(`Listo: ${email} es administrador. Entrá en /admin.`);
