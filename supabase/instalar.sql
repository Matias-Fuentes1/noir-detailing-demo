-- NOIR Detailing · instalación completa (pegar entero en Supabase → SQL Editor → Run).
-- Se puede correr más de una vez: no duplica nada ni pisa contenido existente.

-- ===== 20261124000001_esquema.sql =====
-- NOIR Detailing · esquema del administrador
-- Correr una sola vez en el SQL Editor de Supabase (o con `supabase db push`).
--
-- Qué guarda:
--   admins            quién puede entrar al panel (usuarios de Supabase Auth)
--   contenido         el contenido de la web: un documento 'borrador' (lo que edita el panel)
--                     y uno 'publicado' (lo que ve el público)
--   contenido_versiones  copia de cada publicación (para volver atrás)
--   consultas         pedidos del cotizador, con estado y notas internas
--   consulta_historial   cambios de estado y notas de cada consulta
--   eventos           visitas y clics en WhatsApp (sin IP, sin cookies)
--   storage 'medios'  fotos subidas desde el panel (lectura pública)
--
-- Seguridad: RLS en todas las tablas. El público solo puede LEER el contenido publicado.
-- Las consultas y eventos los inserta la API del servidor (service role), nunca el navegador.

-- gen_random_uuid() viene incluido en Postgres 13+ (no hace falta pgcrypto).

-- ---------------------------------------------------------------- admins
create table if not exists public.admins (
  user_id   uuid primary key references auth.users (id) on delete cascade,
  email     text not null,
  nombre    text,
  creado_en timestamptz not null default now()
);
alter table public.admins enable row level security;

-- ¿El usuario de la sesión es administrador? (security definer: puede leer admins aunque RLS lo oculte)
create or replace function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;
revoke all on function public.es_admin() from public;
grant execute on function public.es_admin() to anon, authenticated;

drop policy if exists "admins se ven entre sí" on public.admins;
create policy "admins se ven entre sí" on public.admins
  for select to authenticated using (public.es_admin());
-- Altas y bajas de admins: solo desde el dashboard de Supabase o scripts/crear-admin.mjs (service role).

-- ---------------------------------------------------------------- contenido
create table if not exists public.contenido (
  clave          text primary key check (clave in ('borrador', 'publicado')),
  doc            jsonb not null check (jsonb_typeof(doc) = 'object' and doc ? 'nombre' and doc ? 'cotizador'),
  actualizado_en timestamptz not null default now(),
  actualizado_por uuid references auth.users (id) on delete set null
);
alter table public.contenido enable row level security;

drop policy if exists "público lee lo publicado" on public.contenido;
create policy "público lee lo publicado" on public.contenido
  for select to anon, authenticated using (clave = 'publicado' or public.es_admin());

drop policy if exists "admins editan el borrador" on public.contenido;
create policy "admins editan el borrador" on public.contenido
  for update to authenticated using (clave = 'borrador' and public.es_admin())
  with check (clave = 'borrador' and public.es_admin());
-- 'publicado' solo cambia con la función publicar() (deja una versión en el historial).

create table if not exists public.contenido_versiones (
  id            bigint generated always as identity primary key,
  doc           jsonb not null,
  publicado_en  timestamptz not null default now(),
  publicado_por uuid references auth.users (id) on delete set null,
  nota          text
);
alter table public.contenido_versiones enable row level security;
drop policy if exists "admins ven versiones" on public.contenido_versiones;
create policy "admins ven versiones" on public.contenido_versiones
  for select to authenticated using (public.es_admin());

-- Guarda partes del borrador sin pisar lo que otro admin guardó en otra sección:
-- `cambios` es un objeto con claves de primer nivel del documento ({"servicios": [...]}).
create or replace function public.guardar_borrador(cambios jsonb)
returns timestamptz
language plpgsql
security invoker
set search_path = public
as $$
declare
  ahora timestamptz := now();
begin
  if not public.es_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  if jsonb_typeof(cambios) <> 'object' then
    raise exception 'Formato inválido';
  end if;
  update public.contenido
     set doc = doc || cambios, actualizado_en = ahora, actualizado_por = auth.uid()
   where clave = 'borrador';
  if not found then
    raise exception 'No hay borrador. Corré la migración de contenido inicial.';
  end if;
  return ahora;
end;
$$;
revoke all on function public.guardar_borrador(jsonb) from public;
grant execute on function public.guardar_borrador(jsonb) to authenticated;

-- Publica el borrador: lo copia a 'publicado' y guarda una versión.
create or replace function public.publicar(nota text default null)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  ahora timestamptz := now();
  borrador jsonb;
begin
  if not public.es_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  select doc into borrador from public.contenido where clave = 'borrador';
  if borrador is null then
    raise exception 'No hay borrador para publicar';
  end if;
  insert into public.contenido (clave, doc, actualizado_en, actualizado_por)
       values ('publicado', borrador, ahora, auth.uid())
  on conflict (clave) do update set doc = excluded.doc, actualizado_en = ahora, actualizado_por = auth.uid();
  insert into public.contenido_versiones (doc, publicado_en, publicado_por, nota)
       values (borrador, ahora, auth.uid(), nota);
  -- Se guardan las últimas 30 publicaciones.
  delete from public.contenido_versiones
   where id not in (select id from public.contenido_versiones order by id desc limit 30);
  return ahora;
end;
$$;
revoke all on function public.publicar(text) from public;
grant execute on function public.publicar(text) to authenticated;

-- Vuelve el borrador a una versión publicada anterior (no publica: hay que revisar y publicar).
create or replace function public.restaurar_version(version_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.es_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  update public.contenido
     set doc = (select doc from public.contenido_versiones where id = version_id),
         actualizado_en = now(), actualizado_por = auth.uid()
   where clave = 'borrador'
     and exists (select 1 from public.contenido_versiones where id = version_id);
  if not found then
    raise exception 'Versión inexistente';
  end if;
end;
$$;
revoke all on function public.restaurar_version(bigint) from public;
grant execute on function public.restaurar_version(bigint) to authenticated;

-- Descarta el borrador y lo vuelve a dejar igual a lo publicado.
create or replace function public.descartar_borrador()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.es_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  update public.contenido
     set doc = (select doc from public.contenido where clave = 'publicado'),
         actualizado_en = now(), actualizado_por = auth.uid()
   where clave = 'borrador'
     and exists (select 1 from public.contenido where clave = 'publicado');
end;
$$;
revoke all on function public.descartar_borrador() from public;
grant execute on function public.descartar_borrador() to authenticated;

-- ---------------------------------------------------------------- consultas
do $$ begin
  create type public.estado_consulta as enum ('nueva', 'contactada', 'presupuesto_enviado', 'convertida', 'descartada');
exception when duplicate_object then null; end $$;

create table if not exists public.consultas (
  id              uuid primary key default gen_random_uuid(),
  codigo          text not null unique,                 -- referencia corta que viaja en el mensaje de WhatsApp
  creada_en       timestamptz not null default now(),
  estado          public.estado_consulta not null default 'nueva',
  actualizada_en  timestamptz not null default now(),
  nombre          text check (char_length(nombre) <= 80),
  telefono        text check (char_length(telefono) <= 40),
  tamano_id       text,
  tamano          text,
  principal_id    text,
  principal       text,
  principal_tipo  text check (principal_tipo in ('paquete', 'servicio')),
  estado_pintura  text,
  extras          jsonb not null default '[]'::jsonb,
  total           integer check (total >= 0),
  dias            numeric(5, 1),
  tiempo          text,
  desglose        jsonb not null default '[]'::jsonb,
  mensaje         text,
  notas           text check (char_length(notas) <= 4000),
  origen          text not null default 'cotizador',
  huella          text                                   -- hash diario y anónimo, solo para limitar abusos
);
create index if not exists consultas_creada_idx on public.consultas (creada_en desc);
create index if not exists consultas_estado_idx on public.consultas (estado);
create index if not exists consultas_huella_idx on public.consultas (huella, creada_en);
alter table public.consultas enable row level security;

drop policy if exists "admins leen consultas" on public.consultas;
create policy "admins leen consultas" on public.consultas
  for select to authenticated using (public.es_admin());
drop policy if exists "admins actualizan consultas" on public.consultas;
create policy "admins actualizan consultas" on public.consultas
  for update to authenticated using (public.es_admin()) with check (public.es_admin());
drop policy if exists "admins borran consultas" on public.consultas;
create policy "admins borran consultas" on public.consultas
  for delete to authenticated using (public.es_admin());
-- Sin política de insert: las crea /api/consultas con la service role key (valida y recalcula el precio).

-- Los admins solo pueden cambiar estado y notas (el resto lo cargó el visitante).
revoke update on public.consultas from authenticated;
grant update (estado, notas) on public.consultas to authenticated;

create table if not exists public.consulta_historial (
  id          bigint generated always as identity primary key,
  consulta_id uuid not null references public.consultas (id) on delete cascade,
  creado_en   timestamptz not null default now(),
  autor       uuid references auth.users (id) on delete set null,
  tipo        text not null check (tipo in ('creada', 'estado', 'nota')),
  detalle     text
);
create index if not exists historial_consulta_idx on public.consulta_historial (consulta_id, creado_en);
alter table public.consulta_historial enable row level security;
drop policy if exists "admins leen historial" on public.consulta_historial;
create policy "admins leen historial" on public.consulta_historial
  for select to authenticated using (public.es_admin());

-- Historial automático: alta, cambios de estado y de notas.
create or replace function public.registrar_historial_consulta()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.consulta_historial (consulta_id, tipo, detalle) values (new.id, 'creada', new.origen);
    return new;
  end if;
  if new.estado is distinct from old.estado then
    insert into public.consulta_historial (consulta_id, autor, tipo, detalle)
         values (new.id, auth.uid(), 'estado', old.estado || ' → ' || new.estado);
  end if;
  if new.notas is distinct from old.notas then
    insert into public.consulta_historial (consulta_id, autor, tipo, detalle)
         values (new.id, auth.uid(), 'nota', left(coalesce(new.notas, ''), 280));
  end if;
  new.actualizada_en := now();
  return new;
end;
$$;
drop trigger if exists consultas_historial_ins on public.consultas;
create trigger consultas_historial_ins after insert on public.consultas
  for each row execute function public.registrar_historial_consulta();
drop trigger if exists consultas_historial_upd on public.consultas;
create trigger consultas_historial_upd before update on public.consultas
  for each row execute function public.registrar_historial_consulta();

-- ---------------------------------------------------------------- eventos (medición propia)
create table if not exists public.eventos (
  id        bigint generated always as identity primary key,
  creado_en timestamptz not null default now(),
  tipo      text not null check (tipo in ('visita', 'whatsapp')),
  detalle   text check (char_length(detalle) <= 80),   -- ej.: dónde estaba el botón de WhatsApp
  huella    text                                        -- hash diario y anónimo (visitantes únicos del día)
);
create index if not exists eventos_tipo_fecha_idx on public.eventos (tipo, creado_en desc);
alter table public.eventos enable row level security;
drop policy if exists "admins leen eventos" on public.eventos;
create policy "admins leen eventos" on public.eventos
  for select to authenticated using (public.es_admin());

-- ---------------------------------------------------------------- resumen del dashboard
-- Todo sale de las tablas reales. Si no hay datos, devuelve ceros y listas vacías.
create or replace function public.resumen_dashboard(dias integer default 30)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  desde timestamptz := date_trunc('day', now()) - make_interval(days => greatest(dias, 1) - 1);
  resultado jsonb;
begin
  if not public.es_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  select jsonb_build_object(
    'desde', desde,
    'consultas_total',      (select count(*) from consultas where creada_en >= desde),
    'consultas_historico',  (select count(*) from consultas),
    'nuevas',               (select count(*) from consultas where estado = 'nueva'),
    'pendientes',           (select count(*) from consultas where estado in ('nueva', 'contactada')),
    'presupuestos_enviados',(select count(*) from consultas where estado = 'presupuesto_enviado' and creada_en >= desde),
    'convertidas',          (select count(*) from consultas where estado = 'convertida' and creada_en >= desde),
    'descartadas',          (select count(*) from consultas where estado = 'descartada' and creada_en >= desde),
    'visitas',              (select count(*) from eventos where tipo = 'visita' and creado_en >= desde),
    'visitantes',           (select count(distinct (huella, creado_en::date)) from eventos where tipo = 'visita' and creado_en >= desde),
    'clics_whatsapp',       (select count(*) from eventos where tipo = 'whatsapp' and creado_en >= desde),
    'primer_evento',        (select min(creado_en) from eventos),
    'por_dia', (
      select coalesce(jsonb_agg(jsonb_build_object('dia', d::date, 'consultas', coalesce(c.n, 0), 'visitas', coalesce(v.n, 0)) order by d), '[]'::jsonb)
        from generate_series(desde, date_trunc('day', now()), interval '1 day') d
        left join (select creada_en::date dia, count(*) n from consultas where creada_en >= desde group by 1) c on c.dia = d::date
        left join (select creado_en::date dia, count(*) n from eventos where tipo = 'visita' and creado_en >= desde group by 1) v on v.dia = d::date
    ),
    'top_servicios', (
      select coalesce(jsonb_agg(t order by t.n desc), '[]'::jsonb) from (
        select principal as nombre, principal_tipo as tipo, count(*) n
          from consultas where creada_en >= desde and principal is not null
         group by principal, principal_tipo order by count(*) desc limit 6
      ) t
    ),
    'whatsapp_por_lugar', (
      select coalesce(jsonb_agg(t order by t.n desc), '[]'::jsonb) from (
        select coalesce(detalle, 'otro') as lugar, count(*) n
          from eventos where tipo = 'whatsapp' and creado_en >= desde group by 1 order by 2 desc limit 6
      ) t
    ),
    'actividad', (
      select coalesce(jsonb_agg(t order by t.creado_en desc), '[]'::jsonb) from (
        select h.creado_en, h.tipo, h.detalle, c.id as consulta_id, c.codigo, c.nombre, c.principal
          from consulta_historial h join consultas c on c.id = h.consulta_id
         order by h.creado_en desc limit 8
      ) t
    )
  ) into resultado;
  return resultado;
end;
$$;
revoke all on function public.resumen_dashboard(integer) from public;
grant execute on function public.resumen_dashboard(integer) to authenticated;

-- ---------------------------------------------------------------- fotos (Storage)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('medios', 'medios', true, 5242880, array['image/webp', 'image/jpeg', 'image/png', 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "medios: admins suben" on storage.objects;
create policy "medios: admins suben" on storage.objects
  for insert to authenticated with check (bucket_id = 'medios' and public.es_admin());
drop policy if exists "medios: admins reemplazan" on storage.objects;
create policy "medios: admins reemplazan" on storage.objects
  for update to authenticated using (bucket_id = 'medios' and public.es_admin()) with check (bucket_id = 'medios' and public.es_admin());
drop policy if exists "medios: admins borran" on storage.objects;
create policy "medios: admins borran" on storage.objects
  for delete to authenticated using (bucket_id = 'medios' and public.es_admin());
drop policy if exists "medios: admins listan" on storage.objects;
create policy "medios: admins listan" on storage.objects
  for select to authenticated using (bucket_id = 'medios' and public.es_admin());
-- La lectura pública de las fotos va por la URL pública del bucket (no necesita política de select para anon).


-- ===== 20261124000002_contenido_inicial.sql =====
-- Contenido inicial: el de la demo (src/config/negocio.json, normalizado).
-- Marca demo.activo = true: número de WhatsApp, dirección, Instagram, precios, opiniones y fotos de trabajos son de EJEMPLO.
-- Si ya hay contenido, no lo pisa.
insert into public.contenido (clave, doc) values
  ('borrador', $noirjson${"version":5,"demo":{"activo":true,"aviso":"Demo · marca, precios y opiniones de ejemplo"},"nombre":"NOIR Detailing","nombreCorto":"NOIR","descripcion":"Pulido, tratamiento cerámico y detailing interior en Olavarría.","ciudad":"Olavarría","region":"Bs. As.","lema":"Detailing en Olavarría","whatsapp":"549XXXXXXXXXX","telefonoVisible":"2284 XX-XXXX","telefono":"","email":"","direccion":"Av. Colón 2500, Olavarría, Buenos Aires","direccionCorta":"Av. Colón 2500","mapsUrl":"","mapa":{"lat":-36.8927,"lng":-60.3225,"zoom":15},"horario":[{"dias":"Lunes a viernes","horas":"8:30–12:30 y 15–19"},{"dias":"Sábados","horas":"9–13"}],"horarioCorto":"Lun a Vie 8:30–12:30 y 15–19 · Sáb 9–13","instagram":{"usuario":"@noir.detailing","url":"https://www.instagram.com/"},"redes":[],"mensajes":{"cotizacion":"Hola {nombreCorto}, quiero pedir una cotización.","servicio":"Hola {nombreCorto}, quiero pedir una cotización de {servicio}."},"seo":{"titulo":"NOIR Detailing · Olavarría","descripcion":"NOIR Detailing: pulido, tratamiento cerámico y detailing interior en Olavarría. Calculá tu presupuesto y pedí cotización por WhatsApp.","imagen":null,"favicon":null},"secciones":{"manifiesto":{"visible":true},"pulido":{"visible":true},"ceramico":{"visible":true},"servicios":{"visible":true,"titulo":["Todo lo que tu auto","se merece."],"texto":"Precios desde, para un auto chico. El valor final depende del tamaño y del estado de la pintura."},"promociones":{"visible":true,"titulo":["Promociones","por tiempo limitado."],"texto":""},"resultados":{"visible":true,"titulo":["De cansado","a terminado."],"texto":"Arrastrá la línea, o usá las flechas del teclado, para comparar el antes y el después."},"trabajos":{"visible":true,"titulo":"Trabajos recientes","maximo":6},"proceso":{"visible":true,"titulo":["Cinco pasos.","Cero sorpresas."]},"cotizador":{"visible":true,"titulo":["Armalo.","Mirá el precio."],"texto":"Elegí tu auto y lo que querés hacerle. El precio cambia al instante y lo mandás por WhatsApp."},"opiniones":{"visible":true,"titulo":["Te lo devolvemos","impecable."]},"contacto":{"visible":true,"titulo":["Vení a","conocernos."],"texto":""},"preguntas":{"visible":true,"titulo":"Preguntas frecuentes"},"mapa":{"visible":true}},"hero":{"titulo":["Más profundo","que nuevo."],"bajada":"Pulido, tratamiento cerámico y detailing interior, a mano y bajo luz de estudio, en Olavarría.","foto":"hero-coupe","fotoAlt":"Coupé gris oscuro con la pintura brillante bajo las luces del taller","pista":"Pasá el mouse por el auto para pulirlo","botones":[{"texto":"Calcular mi presupuesto","enlace":"#cotizador"},{"texto":"Ver resultados","enlace":"#resultados"}]},"manifiesto":{"frase":["No lavamos autos.","Les devolvemos el reflejo."],"foto":"nosotros/pulido-faro-oscuro","fotoAlt":"Pulidora trabajando sobre el capó negro, junto al faro encendido","datos":[{"valor":"Sin cargo","texto":"Revisión de pintura"},{"valor":"Hasta 3 años","texto":"De protección cerámica"},{"valor":"2 días","texto":"Corrección promedio en el taller"},{"valor":"Lun a Sáb","texto":"Con turno"}]},"pulido":{"titulo":["Las rayas se esconden","en la luz."],"texto":"Cada lavado con esponja o rodillo deja micro rayas. Con luz directa se ven como una telaraña alrededor del reflejo. Mové la luz y pasá por cada etapa.","etapas":[{"nombre":"Cómo llega","titulo":"Cómo llega","texto":"Micro rayas, hologramas y marcas de lavado. Con luz directa, la pintura parece una telaraña.","defectos":100},{"nombre":"Paso 1","titulo":"Corte","texto":"Un compuesto de corte nivela el barniz y saca las rayas más marcadas.","defectos":40},{"nombre":"Paso 2","titulo":"Refinado","texto":"Un pulido más fino borra las marcas que dejó el corte y recupera la profundidad.","defectos":12},{"nombre":"Paso 3","titulo":"Terminación","texto":"La pasada final deja el reflejo como un espejo, listo para proteger.","defectos":3}]},"ceramico":{"titulo":["El agua resbala.","La mugre no se pega."],"texto":"El cerámico deja una capa que repele el agua y la mugre. El auto se ensucia menos y se lava en la mitad de tiempo.","modos":{"con":{"angulo":"≈ 110°","comportamiento":"Forma perlas y resbala"},"sin":{"angulo":"≈ 70°","comportamiento":"Se extiende y deja marca"}},"duraciones":[{"anios":"1 año","paquete":"esencial","texto":"Lavado, descontaminado y cerámico de una capa.","destacado":false},{"anios":"2 años","paquete":"completo","texto":"Suma pulido de un paso antes de proteger.","destacado":false},{"anios":"3 años","paquete":"premium","texto":"Corrección de dos pasos, cerámico y ópticas.","destacado":true}]},"servicios":[{"id":"ceramico","nombre":"Tratamiento cerámico","linea":"Lavado, descontaminado y una capa que protege la pintura por años.","tiempo":"2–3 días","precio":280000,"precioCotizador":280000,"enCotizador":true,"dias":3,"pintura":true,"foto":"servicios/tratamiento-ceramico","fotoAlt":"Mano con guante puliendo el capó bordó de un auto, junto al faro","destacado":true,"activo":true},{"id":"pulido","nombre":"Pulido y corrección","linea":"De uno a tres pasos, según lo que necesite tu pintura.","tiempo":"1–2 días","precio":180000,"precioCotizador":180000,"enCotizador":true,"dias":2,"pintura":true,"foto":"servicios/pulido-correccion","fotoAlt":"Detailer con guantes negros pasando una pulidora roja sobre un capó oscuro","destacado":false,"activo":true},{"id":"interior","nombre":"Detailing interior","linea":"Aspirado profundo, tapizados, plásticos y vidrios.","tiempo":"4 h","precio":65000,"precioCotizador":65000,"enCotizador":true,"dias":0,"pintura":false,"foto":"servicios/detailing-interior","fotoAlt":"Interior de un auto con la puerta abierta, butacas y volante limpios bajo luz cálida","destacado":false,"activo":true},{"id":"lavado","nombre":"Lavado premium","linea":"Prelavado con espuma, a mano a dos baldes y secado con microfibra.","tiempo":"2 h","precio":35000,"precioCotizador":35000,"enCotizador":true,"dias":0,"pintura":false,"foto":"servicios/lavado-premium","fotoAlt":"Cola de un auto negro mojado mientras lo enjuagan a presión","destacado":false,"activo":true},{"id":"opticas","nombre":"Ópticas","linea":"Faros opacos pulidos y protegidos contra el amarillo.","tiempo":"1 h","precio":40000,"precioCotizador":40000,"enCotizador":true,"dias":0,"pintura":false,"foto":"servicios/opticas","fotoAlt":"Detailer limpiando el faro delantero de un auto negro con una microfibra","destacado":false,"activo":true},{"id":"motor","nombre":"Motor y llantas","linea":"Vano motor, plásticos, llantas y cálipers.","tiempo":"2 h","precio":45000,"precioCotizador":45000,"enCotizador":true,"dias":0,"pintura":false,"foto":"servicios/motor-llantas","fotoAlt":"Llanta negra con cáliper amarillo de un auto deportivo gris en el taller","destacado":false,"activo":true}],"paquetes":[{"id":"esencial","nombre":"Esencial","precio":150000,"dias":1,"pintura":false,"incluye":["Lavado premium a mano","Descontaminado de pintura","Cerámico de 1 año"],"activo":true},{"id":"completo","nombre":"Completo","precio":320000,"dias":2,"pintura":true,"incluye":["Todo lo de Esencial","Pulido de un paso","Cerámico de 2 años"],"activo":true},{"id":"premium","nombre":"Premium","precio":520000,"dias":3,"pintura":true,"incluye":["Todo lo de Completo","Corrección de dos pasos","Cerámico de 3 años","Ópticas"],"activo":true}],"cotizador":{"tamanos":[{"id":"chico","nombre":"Chico","ejemplo":"Gol, Onix, 208","multiplicador":1,"silueta":"chico","activo":true},{"id":"mediano","nombre":"Mediano","ejemplo":"Cronos, Corolla, Vento","multiplicador":1.15,"silueta":"mediano","activo":true},{"id":"suv","nombre":"SUV","ejemplo":"Tracker, Hilux, Amarok","multiplicador":1.3,"silueta":"suv","activo":true},{"id":"grande","nombre":"Grande","ejemplo":"Sprinter, Master, Kangoo","multiplicador":1.45,"silueta":"grande","activo":true}],"estados":[{"id":"nuevo","nombre":"Como nuevo","recargo":0,"diasExtra":0},{"id":"uso-diario","nombre":"Uso diario","recargo":0.1,"diasExtra":0},{"id":"castigado","nombre":"Muy castigado","recargo":0.25,"diasExtra":1}],"extras":[{"id":"interior","nombre":"Interior a fondo","precio":45000,"dias":0.5,"activo":true},{"id":"opticas","nombre":"Ópticas","precio":35000,"dias":0,"activo":true},{"id":"motor","nombre":"Motor","precio":30000,"dias":0,"activo":true},{"id":"llantas","nombre":"Llantas y cálipers","precio":40000,"dias":0,"activo":true},{"id":"vidrios","nombre":"Vidrios hidrofóbicos","precio":30000,"dias":0,"activo":true}],"redondeo":1000,"nota":"Precio final después de revisar la pintura, sin cargo.","condiciones":"Presupuesto orientativo. El precio final se confirma al revisar el auto.","privacidad":"Guardamos lo que elegiste, tu nombre y tu teléfono (si los dejás) solo para responderte. No los compartimos.","porDefecto":{"tamano":"mediano","principal":"completo","estado":1}},"promociones":[],"resultados":[{"id":"pintura","nombre":"Pintura","categoria":"pintura","antes":"pintura-antes","despues":"pintura-despues","alt":"Panel de pintura negra","pie":"Capó negro · pulido de dos pasos","visible":true},{"id":"interior","nombre":"Interior","categoria":"interior","antes":null,"despues":"interior-cuero","alt":"Butaca de cuero negro","pie":"Butaca de cuero · limpieza e hidratación","visible":true},{"id":"llantas","nombre":"Llantas","categoria":"llantas","antes":null,"despues":"servicios/motor-llantas","alt":"Llanta negra con cáliper amarillo","pie":"Llanta y cáliper · descontaminado y sellado","visible":true}],"trabajos":[{"id":"trabajo-1","auto":"Coupé negra","servicio":"Pulido de dos pasos","descripcion":"","categoria":"pintura","foto":"trabajos/trabajo-1","fotoAlt":"Frente de una coupé negra con el faro y el capó pulidos","destacado":true,"visible":true,"ejemplo":true},{"id":"trabajo-2","auto":"Sedán blanco","servicio":"Tratamiento cerámico","descripcion":"","categoria":"ceramico","foto":"trabajos/trabajo-2","fotoAlt":"Cola de un sedán blanco con la pintura brillante en el taller","destacado":false,"visible":true,"ejemplo":true},{"id":"trabajo-3","auto":"Deportivo negro","servicio":"Lavado premium","descripcion":"","categoria":"lavado","foto":"trabajos/trabajo-3","fotoAlt":"Deportivo negro cubierto de espuma en un taller oscuro","destacado":false,"visible":true,"ejemplo":true}],"proceso":[{"id":"revisar","titulo":"Revisar","texto":"Miramos la pintura con luz y medidor de espesor, y te mostramos lo que vemos.","foto":"proceso/1-revision","fotoAlt":"Detailer rociando producto sobre el lateral de un auto naranja para revisarlo"},{"id":"descontaminar","titulo":"Descontaminar","texto":"Espuma, lavado a mano, removedor de hierro y clay bar.","foto":"proceso/2-lavado-descontaminado","fotoAlt":"Frente de un auto oscuro cubierto de espuma durante el lavado"},{"id":"corregir","titulo":"Corregir","texto":"El pulido que necesite tu pintura, ni más ni menos.","foto":"proceso/3-correccion","fotoAlt":"Pulidora roja trabajando sobre el capó de un auto oscuro"},{"id":"proteger","titulo":"Proteger","texto":"Cerámico o sellador, según lo que elijas.","foto":"proceso/4-proteccion","fotoAlt":"Mano con guante pasando una microfibra sobre la pintura negra"},{"id":"entregar","titulo":"Entregar","texto":"Lo revisamos juntos bajo la luz y te explicamos cómo cuidarlo.","foto":"proceso/5-entrega","fotoAlt":"Auto negro terminado, con la pintura y las llantas brillantes"}],"opiniones":[{"id":"opinion-1","nombre":"Martín G.","auto":"Toyota Hilux","estrellas":5,"texto":"Me mostraron las rayas con la luz antes de empezar y me pasaron el precio por WhatsApp. Quedó mejor que cuando la saqué de la concesionaria.","foto":null,"visible":true,"ejemplo":true},{"id":"opinion-2","nombre":"Carolina R.","auto":"Peugeot 208","estrellas":5,"texto":"Le hice el cerámico hace unos meses y ahora lo lavo en un rato. El agua se va sola.","foto":null,"visible":true,"ejemplo":true},{"id":"opinion-3","nombre":"Diego F.","auto":"VW Amarok","estrellas":5,"texto":"El interior tenía años de campo y quedó como nuevo. Me explicaron qué productos usar.","foto":null,"visible":true,"ejemplo":true},{"id":"opinion-4","nombre":"Lucía M.","auto":"Fiat Cronos","estrellas":5,"texto":"Puntuales con la entrega y muy prolijos. Los faros parecen nuevos.","foto":null,"visible":true,"ejemplo":true}],"opinionesNota":"Opiniones de ejemplo para la demo.","preguntas":[{"id":"pregunta-1","pregunta":"¿Cuánto dura el cerámico?","respuesta":"Entre 1 y 3 años, según el paquete que elijas y cómo lo cuides. Te dejamos por escrito qué hacer y qué evitar."},{"id":"pregunta-2","pregunta":"¿Cuánto tarda cada servicio?","respuesta":"Un lavado premium lleva unas 2 horas y un interior unas 4. El pulido lleva de 1 a 2 días y el cerámico de 2 a 3, porque necesita tiempo de curado."},{"id":"pregunta-3","pregunta":"¿Puedo esperar mientras lo hacen?","respuesta":"Sí, en los servicios de pocas horas (lavado, ópticas, motor). Para pulido y cerámico te avisamos por WhatsApp cuando está listo."},{"id":"pregunta-4","pregunta":"¿Cuándo puedo lavar el auto después del cerámico?","respuesta":"Esperá 7 días antes del primer lavado. Después, lavalo a mano con shampoo neutro y evitá los rodillos."},{"id":"pregunta-5","pregunta":"¿Qué medios de pago aceptan?","respuesta":"Efectivo, transferencia, débito, crédito y Mercado Pago."}]}$noirjson$::jsonb),
  ('publicado', $noirjson${"version":5,"demo":{"activo":true,"aviso":"Demo · marca, precios y opiniones de ejemplo"},"nombre":"NOIR Detailing","nombreCorto":"NOIR","descripcion":"Pulido, tratamiento cerámico y detailing interior en Olavarría.","ciudad":"Olavarría","region":"Bs. As.","lema":"Detailing en Olavarría","whatsapp":"549XXXXXXXXXX","telefonoVisible":"2284 XX-XXXX","telefono":"","email":"","direccion":"Av. Colón 2500, Olavarría, Buenos Aires","direccionCorta":"Av. Colón 2500","mapsUrl":"","mapa":{"lat":-36.8927,"lng":-60.3225,"zoom":15},"horario":[{"dias":"Lunes a viernes","horas":"8:30–12:30 y 15–19"},{"dias":"Sábados","horas":"9–13"}],"horarioCorto":"Lun a Vie 8:30–12:30 y 15–19 · Sáb 9–13","instagram":{"usuario":"@noir.detailing","url":"https://www.instagram.com/"},"redes":[],"mensajes":{"cotizacion":"Hola {nombreCorto}, quiero pedir una cotización.","servicio":"Hola {nombreCorto}, quiero pedir una cotización de {servicio}."},"seo":{"titulo":"NOIR Detailing · Olavarría","descripcion":"NOIR Detailing: pulido, tratamiento cerámico y detailing interior en Olavarría. Calculá tu presupuesto y pedí cotización por WhatsApp.","imagen":null,"favicon":null},"secciones":{"manifiesto":{"visible":true},"pulido":{"visible":true},"ceramico":{"visible":true},"servicios":{"visible":true,"titulo":["Todo lo que tu auto","se merece."],"texto":"Precios desde, para un auto chico. El valor final depende del tamaño y del estado de la pintura."},"promociones":{"visible":true,"titulo":["Promociones","por tiempo limitado."],"texto":""},"resultados":{"visible":true,"titulo":["De cansado","a terminado."],"texto":"Arrastrá la línea, o usá las flechas del teclado, para comparar el antes y el después."},"trabajos":{"visible":true,"titulo":"Trabajos recientes","maximo":6},"proceso":{"visible":true,"titulo":["Cinco pasos.","Cero sorpresas."]},"cotizador":{"visible":true,"titulo":["Armalo.","Mirá el precio."],"texto":"Elegí tu auto y lo que querés hacerle. El precio cambia al instante y lo mandás por WhatsApp."},"opiniones":{"visible":true,"titulo":["Te lo devolvemos","impecable."]},"contacto":{"visible":true,"titulo":["Vení a","conocernos."],"texto":""},"preguntas":{"visible":true,"titulo":"Preguntas frecuentes"},"mapa":{"visible":true}},"hero":{"titulo":["Más profundo","que nuevo."],"bajada":"Pulido, tratamiento cerámico y detailing interior, a mano y bajo luz de estudio, en Olavarría.","foto":"hero-coupe","fotoAlt":"Coupé gris oscuro con la pintura brillante bajo las luces del taller","pista":"Pasá el mouse por el auto para pulirlo","botones":[{"texto":"Calcular mi presupuesto","enlace":"#cotizador"},{"texto":"Ver resultados","enlace":"#resultados"}]},"manifiesto":{"frase":["No lavamos autos.","Les devolvemos el reflejo."],"foto":"nosotros/pulido-faro-oscuro","fotoAlt":"Pulidora trabajando sobre el capó negro, junto al faro encendido","datos":[{"valor":"Sin cargo","texto":"Revisión de pintura"},{"valor":"Hasta 3 años","texto":"De protección cerámica"},{"valor":"2 días","texto":"Corrección promedio en el taller"},{"valor":"Lun a Sáb","texto":"Con turno"}]},"pulido":{"titulo":["Las rayas se esconden","en la luz."],"texto":"Cada lavado con esponja o rodillo deja micro rayas. Con luz directa se ven como una telaraña alrededor del reflejo. Mové la luz y pasá por cada etapa.","etapas":[{"nombre":"Cómo llega","titulo":"Cómo llega","texto":"Micro rayas, hologramas y marcas de lavado. Con luz directa, la pintura parece una telaraña.","defectos":100},{"nombre":"Paso 1","titulo":"Corte","texto":"Un compuesto de corte nivela el barniz y saca las rayas más marcadas.","defectos":40},{"nombre":"Paso 2","titulo":"Refinado","texto":"Un pulido más fino borra las marcas que dejó el corte y recupera la profundidad.","defectos":12},{"nombre":"Paso 3","titulo":"Terminación","texto":"La pasada final deja el reflejo como un espejo, listo para proteger.","defectos":3}]},"ceramico":{"titulo":["El agua resbala.","La mugre no se pega."],"texto":"El cerámico deja una capa que repele el agua y la mugre. El auto se ensucia menos y se lava en la mitad de tiempo.","modos":{"con":{"angulo":"≈ 110°","comportamiento":"Forma perlas y resbala"},"sin":{"angulo":"≈ 70°","comportamiento":"Se extiende y deja marca"}},"duraciones":[{"anios":"1 año","paquete":"esencial","texto":"Lavado, descontaminado y cerámico de una capa.","destacado":false},{"anios":"2 años","paquete":"completo","texto":"Suma pulido de un paso antes de proteger.","destacado":false},{"anios":"3 años","paquete":"premium","texto":"Corrección de dos pasos, cerámico y ópticas.","destacado":true}]},"servicios":[{"id":"ceramico","nombre":"Tratamiento cerámico","linea":"Lavado, descontaminado y una capa que protege la pintura por años.","tiempo":"2–3 días","precio":280000,"precioCotizador":280000,"enCotizador":true,"dias":3,"pintura":true,"foto":"servicios/tratamiento-ceramico","fotoAlt":"Mano con guante puliendo el capó bordó de un auto, junto al faro","destacado":true,"activo":true},{"id":"pulido","nombre":"Pulido y corrección","linea":"De uno a tres pasos, según lo que necesite tu pintura.","tiempo":"1–2 días","precio":180000,"precioCotizador":180000,"enCotizador":true,"dias":2,"pintura":true,"foto":"servicios/pulido-correccion","fotoAlt":"Detailer con guantes negros pasando una pulidora roja sobre un capó oscuro","destacado":false,"activo":true},{"id":"interior","nombre":"Detailing interior","linea":"Aspirado profundo, tapizados, plásticos y vidrios.","tiempo":"4 h","precio":65000,"precioCotizador":65000,"enCotizador":true,"dias":0,"pintura":false,"foto":"servicios/detailing-interior","fotoAlt":"Interior de un auto con la puerta abierta, butacas y volante limpios bajo luz cálida","destacado":false,"activo":true},{"id":"lavado","nombre":"Lavado premium","linea":"Prelavado con espuma, a mano a dos baldes y secado con microfibra.","tiempo":"2 h","precio":35000,"precioCotizador":35000,"enCotizador":true,"dias":0,"pintura":false,"foto":"servicios/lavado-premium","fotoAlt":"Cola de un auto negro mojado mientras lo enjuagan a presión","destacado":false,"activo":true},{"id":"opticas","nombre":"Ópticas","linea":"Faros opacos pulidos y protegidos contra el amarillo.","tiempo":"1 h","precio":40000,"precioCotizador":40000,"enCotizador":true,"dias":0,"pintura":false,"foto":"servicios/opticas","fotoAlt":"Detailer limpiando el faro delantero de un auto negro con una microfibra","destacado":false,"activo":true},{"id":"motor","nombre":"Motor y llantas","linea":"Vano motor, plásticos, llantas y cálipers.","tiempo":"2 h","precio":45000,"precioCotizador":45000,"enCotizador":true,"dias":0,"pintura":false,"foto":"servicios/motor-llantas","fotoAlt":"Llanta negra con cáliper amarillo de un auto deportivo gris en el taller","destacado":false,"activo":true}],"paquetes":[{"id":"esencial","nombre":"Esencial","precio":150000,"dias":1,"pintura":false,"incluye":["Lavado premium a mano","Descontaminado de pintura","Cerámico de 1 año"],"activo":true},{"id":"completo","nombre":"Completo","precio":320000,"dias":2,"pintura":true,"incluye":["Todo lo de Esencial","Pulido de un paso","Cerámico de 2 años"],"activo":true},{"id":"premium","nombre":"Premium","precio":520000,"dias":3,"pintura":true,"incluye":["Todo lo de Completo","Corrección de dos pasos","Cerámico de 3 años","Ópticas"],"activo":true}],"cotizador":{"tamanos":[{"id":"chico","nombre":"Chico","ejemplo":"Gol, Onix, 208","multiplicador":1,"silueta":"chico","activo":true},{"id":"mediano","nombre":"Mediano","ejemplo":"Cronos, Corolla, Vento","multiplicador":1.15,"silueta":"mediano","activo":true},{"id":"suv","nombre":"SUV","ejemplo":"Tracker, Hilux, Amarok","multiplicador":1.3,"silueta":"suv","activo":true},{"id":"grande","nombre":"Grande","ejemplo":"Sprinter, Master, Kangoo","multiplicador":1.45,"silueta":"grande","activo":true}],"estados":[{"id":"nuevo","nombre":"Como nuevo","recargo":0,"diasExtra":0},{"id":"uso-diario","nombre":"Uso diario","recargo":0.1,"diasExtra":0},{"id":"castigado","nombre":"Muy castigado","recargo":0.25,"diasExtra":1}],"extras":[{"id":"interior","nombre":"Interior a fondo","precio":45000,"dias":0.5,"activo":true},{"id":"opticas","nombre":"Ópticas","precio":35000,"dias":0,"activo":true},{"id":"motor","nombre":"Motor","precio":30000,"dias":0,"activo":true},{"id":"llantas","nombre":"Llantas y cálipers","precio":40000,"dias":0,"activo":true},{"id":"vidrios","nombre":"Vidrios hidrofóbicos","precio":30000,"dias":0,"activo":true}],"redondeo":1000,"nota":"Precio final después de revisar la pintura, sin cargo.","condiciones":"Presupuesto orientativo. El precio final se confirma al revisar el auto.","privacidad":"Guardamos lo que elegiste, tu nombre y tu teléfono (si los dejás) solo para responderte. No los compartimos.","porDefecto":{"tamano":"mediano","principal":"completo","estado":1}},"promociones":[],"resultados":[{"id":"pintura","nombre":"Pintura","categoria":"pintura","antes":"pintura-antes","despues":"pintura-despues","alt":"Panel de pintura negra","pie":"Capó negro · pulido de dos pasos","visible":true},{"id":"interior","nombre":"Interior","categoria":"interior","antes":null,"despues":"interior-cuero","alt":"Butaca de cuero negro","pie":"Butaca de cuero · limpieza e hidratación","visible":true},{"id":"llantas","nombre":"Llantas","categoria":"llantas","antes":null,"despues":"servicios/motor-llantas","alt":"Llanta negra con cáliper amarillo","pie":"Llanta y cáliper · descontaminado y sellado","visible":true}],"trabajos":[{"id":"trabajo-1","auto":"Coupé negra","servicio":"Pulido de dos pasos","descripcion":"","categoria":"pintura","foto":"trabajos/trabajo-1","fotoAlt":"Frente de una coupé negra con el faro y el capó pulidos","destacado":true,"visible":true,"ejemplo":true},{"id":"trabajo-2","auto":"Sedán blanco","servicio":"Tratamiento cerámico","descripcion":"","categoria":"ceramico","foto":"trabajos/trabajo-2","fotoAlt":"Cola de un sedán blanco con la pintura brillante en el taller","destacado":false,"visible":true,"ejemplo":true},{"id":"trabajo-3","auto":"Deportivo negro","servicio":"Lavado premium","descripcion":"","categoria":"lavado","foto":"trabajos/trabajo-3","fotoAlt":"Deportivo negro cubierto de espuma en un taller oscuro","destacado":false,"visible":true,"ejemplo":true}],"proceso":[{"id":"revisar","titulo":"Revisar","texto":"Miramos la pintura con luz y medidor de espesor, y te mostramos lo que vemos.","foto":"proceso/1-revision","fotoAlt":"Detailer rociando producto sobre el lateral de un auto naranja para revisarlo"},{"id":"descontaminar","titulo":"Descontaminar","texto":"Espuma, lavado a mano, removedor de hierro y clay bar.","foto":"proceso/2-lavado-descontaminado","fotoAlt":"Frente de un auto oscuro cubierto de espuma durante el lavado"},{"id":"corregir","titulo":"Corregir","texto":"El pulido que necesite tu pintura, ni más ni menos.","foto":"proceso/3-correccion","fotoAlt":"Pulidora roja trabajando sobre el capó de un auto oscuro"},{"id":"proteger","titulo":"Proteger","texto":"Cerámico o sellador, según lo que elijas.","foto":"proceso/4-proteccion","fotoAlt":"Mano con guante pasando una microfibra sobre la pintura negra"},{"id":"entregar","titulo":"Entregar","texto":"Lo revisamos juntos bajo la luz y te explicamos cómo cuidarlo.","foto":"proceso/5-entrega","fotoAlt":"Auto negro terminado, con la pintura y las llantas brillantes"}],"opiniones":[{"id":"opinion-1","nombre":"Martín G.","auto":"Toyota Hilux","estrellas":5,"texto":"Me mostraron las rayas con la luz antes de empezar y me pasaron el precio por WhatsApp. Quedó mejor que cuando la saqué de la concesionaria.","foto":null,"visible":true,"ejemplo":true},{"id":"opinion-2","nombre":"Carolina R.","auto":"Peugeot 208","estrellas":5,"texto":"Le hice el cerámico hace unos meses y ahora lo lavo en un rato. El agua se va sola.","foto":null,"visible":true,"ejemplo":true},{"id":"opinion-3","nombre":"Diego F.","auto":"VW Amarok","estrellas":5,"texto":"El interior tenía años de campo y quedó como nuevo. Me explicaron qué productos usar.","foto":null,"visible":true,"ejemplo":true},{"id":"opinion-4","nombre":"Lucía M.","auto":"Fiat Cronos","estrellas":5,"texto":"Puntuales con la entrega y muy prolijos. Los faros parecen nuevos.","foto":null,"visible":true,"ejemplo":true}],"opinionesNota":"Opiniones de ejemplo para la demo.","preguntas":[{"id":"pregunta-1","pregunta":"¿Cuánto dura el cerámico?","respuesta":"Entre 1 y 3 años, según el paquete que elijas y cómo lo cuides. Te dejamos por escrito qué hacer y qué evitar."},{"id":"pregunta-2","pregunta":"¿Cuánto tarda cada servicio?","respuesta":"Un lavado premium lleva unas 2 horas y un interior unas 4. El pulido lleva de 1 a 2 días y el cerámico de 2 a 3, porque necesita tiempo de curado."},{"id":"pregunta-3","pregunta":"¿Puedo esperar mientras lo hacen?","respuesta":"Sí, en los servicios de pocas horas (lavado, ópticas, motor). Para pulido y cerámico te avisamos por WhatsApp cuando está listo."},{"id":"pregunta-4","pregunta":"¿Cuándo puedo lavar el auto después del cerámico?","respuesta":"Esperá 7 días antes del primer lavado. Después, lavalo a mano con shampoo neutro y evitá los rodillos."},{"id":"pregunta-5","pregunta":"¿Qué medios de pago aceptan?","respuesta":"Efectivo, transferencia, débito, crédito y Mercado Pago."}]}$noirjson$::jsonb)
on conflict (clave) do nothing;


-- ===== 20261124000003_permisos.sql =====
-- Permisos explícitos (mínimo privilegio).
-- Los proyectos nuevos de Supabase no dan permisos automáticos sobre tablas nuevas: sin esto,
-- ni el público, ni los admins, ni el servidor pueden leer o escribir. RLS sigue decidiendo QUÉ FILAS
-- ve cada uno; estos GRANT deciden QUÉ OPERACIONES puede intentar cada rol.
-- Se puede correr más de una vez.

-- Se parte de cero en todas las tablas del panel.
revoke all on table public.admins, public.contenido, public.contenido_versiones,
  public.consultas, public.consulta_historial, public.eventos from anon, authenticated, service_role;

-- Público (anon): solo leer el contenido (RLS lo limita a 'publicado').
grant select on table public.contenido to anon;

-- Usuarios logueados (RLS los limita a los que están en admins).
grant select on table public.admins to authenticated;
grant select, update on table public.contenido to authenticated;          -- update: solo el borrador (RLS)
grant select on table public.contenido_versiones to authenticated;
grant select, delete on table public.consultas to authenticated;
grant update (estado, notas) on table public.consultas to authenticated;  -- nunca el precio ni los datos del cliente
grant select on table public.consulta_historial to authenticated;
grant select on table public.eventos to authenticated;

-- Servidor (secret key, solo en /api y scripts): guarda consultas y eventos ya validados y da de alta admins.
grant select, insert, delete on table public.consultas, public.eventos to service_role;  -- delete: limpieza de pruebas y mantenimiento
grant select, delete on table public.contenido_versiones to service_role;
grant select, insert, update, delete on table public.admins to service_role;
grant select on table public.contenido to service_role;
grant usage, select on all sequences in schema public to service_role;
