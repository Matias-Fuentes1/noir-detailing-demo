-- Limpieza única de lo que dejaron las pruebas automáticas del 24/11/2026 (correr una vez en el SQL Editor).
-- 1) Permite que el servidor borre consultas, eventos y versiones (para que las pruebas se limpien solas).
grant select, insert, delete on table public.consultas, public.eventos to service_role;
grant select, delete on table public.contenido_versiones to service_role;

-- 2) Borra los eventos de prueba: la visita del navegador de pruebas y el clic de WhatsApp simulado.
--    (El proyecto es nuevo: todos los eventos anteriores a este momento son de las pruebas.)
delete from public.eventos where creado_en < '2026-11-24 21:30:00+00';

-- 3) Borra las dos publicaciones de prueba (un cambio y su reversión; el contenido publicado ya es el original).
delete from public.contenido_versiones where nota like 'prueba automática%';
