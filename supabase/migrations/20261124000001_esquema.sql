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
