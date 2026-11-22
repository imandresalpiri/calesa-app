-- La última pestaña que cada persona abrió en cada origen (`origenes.ultima_pestana`): un objeto `{ "<origen uuid>": "<pestaña>" }` con
-- hasta 30 entradas. La base valida la forma, no los nombres de las pestañas: renombrar una no pide migración (la app ignora al leer una
-- que ya no existe). Sin tablas ni índices nuevos: la PK `(usuario_id, clave)` sostiene la lectura y el upsert, y la RLS es la de siempre.

-- Espejo de `TOPE_DE_PESTANAS_RECORDADAS` (`src/modules/equipo/entities/ultima-pestana.ts`).
create function public._preferencia_ultima_pestana_valida(p_valor jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(p_valor) = 'object'
     and (select count(*) from (select 1 from jsonb_object_keys(p_valor) limit 31) k) <= 30
     and not exists (
       select 1
         from jsonb_each(p_valor) e
        where e.key !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
           or jsonb_typeof(e.value) <> 'string'
           or (e.value #>> '{}') !~ '^[a-z]{1,20}$'
     )
$$;

comment on function public._preferencia_ultima_pestana_valida(jsonb) is
  'Forma de la preferencia origenes.ultima_pestana: objeto de hasta 30 entradas uuid → nombre de pestaña en minúsculas.';

-- El CHECK la llama con el rol de quien escribe la fila.
revoke all on function public._preferencia_ultima_pestana_valida(jsonb) from public, anon;
grant execute on function public._preferencia_ultima_pestana_valida(jsonb) to authenticated, service_role;

alter table public.preferencias_usuario
  add constraint preferencias_ultima_pestana_valida
  check (clave <> 'origenes.ultima_pestana' or public._preferencia_ultima_pestana_valida(valor));
