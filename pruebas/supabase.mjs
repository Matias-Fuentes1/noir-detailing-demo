// Pruebas de punta a punta contra el proyecto real de Supabase + la API (/api) del servidor.
// Uso:  npm run dev  (en otra terminal)  y después  node pruebas/supabase.mjs [http://localhost:5173]
// Necesita .env (URL, publishable, secret) y .env.test (NOIR_TEST_EMAIL / NOIR_TEST_CLAVE de un admin de prueba).
// Todo lo que crea (consultas, eventos, fotos, usuario sin permisos) lo borra al final.
// Publica dos veces (un cambio y su reversión): el contenido publicado queda igual que antes.
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';
import { createClient } from '@supabase/supabase-js';

const raiz = fileURLToPath(new URL('..', import.meta.url));
const env = { ...loadEnv('test', raiz, ''), ...process.env };
const URL_SB = env.VITE_SUPABASE_URL;
const PUB = env.VITE_SUPABASE_PUBLISHABLE_KEY;
const SECRETA = env.SUPABASE_SECRET_KEY;
const SITIO = process.argv[2] ?? 'http://localhost:5173';
const opc = { auth: { persistSession: false, autoRefreshToken: false } };

const anon = createClient(URL_SB, PUB, opc);
const svc = createClient(URL_SB, SECRETA, opc);
let ok = 0, mal = 0;
const espera = (nombre, cond, det = '') => { if (cond) { ok++; console.log(`  ✓ ${nombre}`); } else { mal++; console.log(`  ✗ ${nombre} ${det}`); } };
const limpiar = { consultas: [], fotos: [], usuarios: [] };

try {
  console.log('Público (clave publishable):');
  let r = await anon.from('contenido').select('clave');
  espera('lee solo el contenido publicado', r.data?.length === 1 && r.data[0].clave === 'publicado', JSON.stringify(r.error ?? r.data));
  r = await anon.from('consultas').select('id');
  espera('no puede leer consultas', Boolean(r.error) || r.data.length === 0);
  r = await anon.from('consultas').insert({ codigo: 'N-HACK01', total: 1 });
  espera('no puede insertar consultas directo', Boolean(r.error));
  r = await anon.rpc('publicar');
  espera('no puede publicar', Boolean(r.error));
  r = await anon.storage.from('medios').upload(`pruebas/anon-${Date.now()}.txt`, new Blob(['x'], { type: 'image/webp' }));
  espera('no puede subir fotos', Boolean(r.error));
  r = await anon.auth.signUp({ email: `intruso-${Date.now()}@noir-demo.test`, password: 'Una-clave-larga-123' });
  espera('el registro público está apagado', Boolean(r.error) && /signup|not allowed|disabled/i.test(r.error.message), r.error?.message ?? 'se pudo registrar');
  if (r.data?.user) limpiar.usuarios.push(r.data.user.id);

  console.log('Usuario logueado SIN permiso de admin:');
  const emailIntruso = `sin-permiso-${Date.now()}@noir-demo.test`;
  const claveIntruso = `Prueba-${crypto.randomUUID()}`;
  const nu = await svc.auth.admin.createUser({ email: emailIntruso, password: claveIntruso, email_confirm: true });
  limpiar.usuarios.push(nu.data.user.id);
  const intruso = createClient(URL_SB, PUB, opc);
  await intruso.auth.signInWithPassword({ email: emailIntruso, password: claveIntruso });
  r = await intruso.rpc('es_admin');
  espera('es_admin() = false', r.data === false, JSON.stringify(r));
  r = await intruso.rpc('guardar_borrador', { cambios: { lema: 'hack' } });
  espera('no puede guardar el borrador', Boolean(r.error));
  r = await intruso.from('consultas').select('id');
  espera('no ve consultas', Boolean(r.error) || r.data.length === 0);
  r = await intruso.from('admins').insert({ user_id: nu.data.user.id, email: emailIntruso });
  espera('no puede hacerse admin', Boolean(r.error));
  r = await intruso.storage.from('medios').upload(`pruebas/intruso-${Date.now()}.webp`, new Blob(['x'], { type: 'image/webp' }));
  espera('no puede subir fotos', Boolean(r.error));

  console.log('Administrador:');
  const admin = createClient(URL_SB, PUB, opc);
  r = await admin.auth.signInWithPassword({ email: env.NOIR_TEST_EMAIL, password: env.NOIR_TEST_CLAVE });
  espera('inicia sesión', !r.error, r.error?.message);
  const token = r.data.session?.access_token;
  r = await admin.auth.signInWithPassword({ email: env.NOIR_TEST_EMAIL, password: 'clave-incorrecta-123' });
  espera('rechaza una contraseña incorrecta', Boolean(r.error));
  await admin.auth.signInWithPassword({ email: env.NOIR_TEST_EMAIL, password: env.NOIR_TEST_CLAVE });
  r = await admin.rpc('es_admin');
  espera('es_admin() = true', r.data === true);
  r = await admin.from('contenido').select('clave, doc');
  espera('ve borrador y publicado', r.data?.length === 2);
  const lemaOriginal = r.data.find((x) => x.clave === 'borrador').doc.lema;
  const marca = `Prueba ${Date.now()}`;
  r = await admin.rpc('guardar_borrador', { cambios: { lema: marca } });
  espera('guarda el borrador', !r.error, r.error?.message);
  r = await anon.from('contenido').select('doc').eq('clave', 'publicado').single();
  espera('el público no ve el borrador', r.data.doc.lema !== marca);
  r = await admin.rpc('publicar', { nota: 'prueba automática' });
  espera('publica', !r.error, r.error?.message);
  r = await anon.from('contenido').select('doc').eq('clave', 'publicado').single();
  espera('el público ve lo publicado', r.data.doc.lema === marca);
  const html = await (await fetch(`${SITIO}/?v=${Date.now()}`)).text();
  espera('la web (render del servidor) muestra el cambio', html.includes(marca));
  await admin.rpc('guardar_borrador', { cambios: { lema: lemaOriginal } });
  await admin.rpc('publicar', { nota: 'prueba automática (reversión)' });
  r = await anon.from('contenido').select('doc').eq('clave', 'publicado').single();
  espera('se revirtió el cambio de prueba', r.data.doc.lema === lemaOriginal);
  r = await admin.from('contenido_versiones').select('id').order('id', { ascending: false }).limit(2);
  espera('quedan las versiones en el historial', r.data?.length === 2);

  // Foto: subir, leer por URL pública, borrar
  const png = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='), (c) => c.charCodeAt(0));
  const ruta = `pruebas/${Date.now()}.png`;
  r = await admin.storage.from('medios').upload(ruta, new Blob([png], { type: 'image/png' }), { contentType: 'image/png' });
  espera('sube una foto al bucket medios', !r.error, r.error?.message);
  limpiar.fotos.push(ruta);
  const pub = admin.storage.from('medios').getPublicUrl(ruta).data.publicUrl;
  const rf = await fetch(pub);
  espera('la foto es pública por URL', rf.ok && rf.headers.get('content-type')?.includes('image'), rf.status);
  r = await admin.storage.from('medios').upload(`pruebas/${Date.now()}.txt`, new Blob(['hola'], { type: 'text/plain' }), { contentType: 'text/plain' });
  espera('rechaza archivos que no son imágenes', Boolean(r.error));

  console.log('Cotizador → API → base:');
  const codigo = `N-T${String(Date.now()).slice(-5)}`.replace(/[^A-Z0-9-]/g, '');
  let resp = await fetch(`${SITIO}/api/consultas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ codigo, nombre: 'Prueba automática', telefono: '2284 15 611455', seleccion: { tamano: 'suv', principal: 'completo', estado: 1, extras: ['opticas', 'motor'] }, total: 1, mensaje: 'texto falso' }),
  });
  espera('la API guarda la consulta', resp.status === 201, `${resp.status} ${await resp.clone().text()}`);
  limpiar.consultas.push(codigo);
  r = await admin.from('consultas').select('*').eq('codigo', codigo).single();
  espera('el precio se recalcula en el servidor (ignora el total del navegador)', r.data?.total > 1000, JSON.stringify(r.data?.total));
  espera('guarda paquete, tamaño, estado y extras', r.data?.principal === 'Completo' && r.data?.tamano === 'SUV' && r.data?.estado_pintura === 'Uso diario' && r.data?.extras.length === 2);
  espera('el mensaje lo arma el servidor con la referencia', r.data?.mensaje.includes(codigo) && !r.data.mensaje.includes('texto falso'));
  const id = r.data.id;
  r = await admin.from('consultas').update({ estado: 'contactada', notas: 'Nota de prueba' }).eq('id', id).select('estado');
  espera('el admin cambia estado y notas', r.data?.[0]?.estado === 'contactada', r.error?.message);
  r = await admin.from('consultas').update({ total: 1 }).eq('id', id);
  espera('el admin NO puede cambiar el precio guardado', Boolean(r.error));
  r = await admin.from('consulta_historial').select('tipo').eq('consulta_id', id).order('id');
  espera('historial automático', r.data?.map((x) => x.tipo).join(',') === 'creada,estado,nota', JSON.stringify(r.data));
  resp = await fetch(`${SITIO}/api/consultas`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ codigo: 'N-BOT001', web: 'spam', seleccion: {} }) });
  r = await svc.from('consultas').select('id').eq('codigo', 'N-BOT001');
  espera('la trampa anti-bots descarta el envío', resp.status === 202 && r.data.length === 0);
  resp = await fetch(`${SITIO}/api/consultas`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://otro-sitio.com' }, body: '{}' });
  espera('rechaza pedidos de otro origen', resp.status === 403);
  resp = await fetch(`${SITIO}/api/consultas`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ codigo: 'malo' }) });
  espera('valida el código', resp.status === 400);

  const antes = (await svc.from('eventos').select('id', { count: 'exact', head: true })).count;
  resp = await fetch(`${SITIO}/api/evento`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 prueba' }, body: JSON.stringify({ tipo: 'whatsapp', detalle: 'prueba-automatica' }) });
  const despues = (await svc.from('eventos').select('id', { count: 'exact', head: true })).count;
  espera('la API registra clics en WhatsApp', resp.status === 204 && despues === antes + 1);
  r = await admin.rpc('resumen_dashboard', { dias: 30 });
  espera('el dashboard lee datos reales', !r.error && r.data.consultas_total >= 1 && r.data.clics_whatsapp >= 1, r.error?.message);

  resp = await fetch(`${SITIO}/api/preview`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
  espera('la vista previa exige sesión', resp.status === 401);
  resp = await fetch(`${SITIO}/api/preview`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${(await intruso.auth.getSession()).data.session.access_token}` } });
  espera('la vista previa rechaza a quien no es admin', resp.status === 403);
  resp = await fetch(`${SITIO}/api/preview`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({}) });
  const prev = await resp.text();
  espera('la vista previa funciona para el admin', resp.status === 200 && prev.includes('aviso-preview'));
} finally {
  // ---------------------------------------------------------------- limpieza
  // La limpieza también se verifica: si algo queda, se avisa (no falla en silencio).
  const errLimpieza = [];
  const chequear = (que, r) => { if (r?.error) errLimpieza.push(`${que}: ${r.error.message}`); };
  for (const c of limpiar.consultas) chequear('consulta', await svc.from('consultas').delete().eq('codigo', c));
  chequear('eventos', await svc.from('eventos').delete().eq('detalle', 'prueba-automatica'));
  chequear('versiones', await svc.from('contenido_versiones').delete().like('nota', 'prueba automática%'));
  if (limpiar.fotos.length) chequear('fotos', await svc.storage.from('medios').remove(limpiar.fotos));
  for (const u of limpiar.usuarios) chequear('usuario', await svc.auth.admin.deleteUser(u));
  if (errLimpieza.length) { mal++; console.log('  ✗ limpieza incompleta:', errLimpieza.join(' | ')); }
  console.log(`\n${ok} ok, ${mal} fallas${errLimpieza.length ? '' : ' · datos de prueba borrados'}`);
  process.exit(mal ? 1 : 0);
}
