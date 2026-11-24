// Genera el SQL de instalación a partir de las migraciones y del contenido de la demo.
//   supabase/migrations/20261124000002_contenido_inicial.sql  → carga negocio.json como borrador y publicado
//   supabase/instalar.sql                                     → todo junto, para pegar en el SQL Editor
// Uso: npm run db:sql
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { normalizar } from '../src/js/contenido.js';

const raiz = join(import.meta.dirname, '..');
const dir = join(raiz, 'supabase/migrations');
const doc = normalizar(JSON.parse(readFileSync(join(raiz, 'src/config/negocio.json'), 'utf8')));
const json = JSON.stringify(doc);
const marca = 'noirjson';
if (json.includes(`$${marca}$`)) throw new Error('El contenido incluye el delimitador SQL');

const seed = `-- Contenido inicial: el de la demo (src/config/negocio.json, normalizado).
-- Marca demo.activo = true: número de WhatsApp, dirección, Instagram, precios, opiniones y fotos de trabajos son de EJEMPLO.
-- Si ya hay contenido, no lo pisa.
insert into public.contenido (clave, doc) values
  ('borrador', $${marca}$${json}$${marca}$::jsonb),
  ('publicado', $${marca}$${json}$${marca}$::jsonb)
on conflict (clave) do nothing;
`;
writeFileSync(join(dir, '20261124000002_contenido_inicial.sql'), seed);

const todo = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort().map((f) => `-- ===== ${f} =====\n${readFileSync(join(dir, f), 'utf8')}`).join('\n\n');
writeFileSync(join(raiz, 'supabase/instalar.sql'), `-- NOIR Detailing · instalación completa (pegar entero en Supabase → SQL Editor → Run).\n-- Se puede correr más de una vez: no duplica nada ni pisa contenido existente.\n\n${todo}`);
console.log('[sql] supabase/instalar.sql y la migración de contenido inicial generadas');
