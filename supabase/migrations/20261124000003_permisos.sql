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
