-- reescribir_rutas_viejas
-- Lo guardado que nombra un parámetro mudado pasa a su nombre de hoy (.claude/rules/rutas.md › «Los datos guardados»). Migración de datos:
-- idempotente (cada update toma sólo lo viejo) y sin auditoría (ninguna de las dos tablas la escribe). Son tablas por persona, de decenas a
-- cientos de filas: ni lotes ni índice. `notificaciones.ruta` no se toca: ninguna función ni trigger escribió una ruta mudada.

-- 1. Las vistas del inventario con el filtro «Situación» de antes pasan a «Subasta» y «Fase»:
--    en_subasta → vivas · sin_resolver → sin_resolver · no_ganada → no_ganadas (si venían varias, gana la primera en ese orden);
--    las fases (uuid) y `ninguna` → fase, sin repetir y en el orden en que venían. Un `subasta` o un `fase` que ya estaba se respeta.
--    Se quitan `situacion` y `cursor` (era de otro filtro). Lo que no se entiende se pierde con la clave.
with viejas as (
  select id, params, string_to_array(params ->> 'situacion', ',') as valores
    from public.vistas_guardadas
   where pantalla = 'vehiculos'
     and params ? 'situacion'
), fases as (
  select v.id, string_agg(u.valor, ',' order by u.primera) as fase
    from viejas v
    cross join lateral (
      select x.valor, min(x.n) as primera
        from unnest(v.valores) with ordinality as x(valor, n)
       where x.valor = 'ninguna'
          or x.valor ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
       group by x.valor
    ) u
   group by v.id
)
update public.vistas_guardadas g
   set params = (v.params - 'situacion' - 'cursor')
     || case when v.params ? 'subasta' then '{}'::jsonb
             when 'en_subasta' = any (v.valores) then '{"subasta": "vivas"}'::jsonb
             when 'sin_resolver' = any (v.valores) then '{"subasta": "sin_resolver"}'::jsonb
             when 'no_ganada' = any (v.valores) then '{"subasta": "no_ganadas"}'::jsonb
             else '{}'::jsonb
        end
     || case when v.params ? 'fase' or f.fase is null then '{}'::jsonb
             else jsonb_build_object('fase', f.fase)
        end
  from viejas v
  left join fases f on f.id = v.id
 where g.id = v.id;

-- 2. La última pestaña de cada origen con el nombre de antes: flujo → fases; formula, formulas y tablas → planilla; datos (ya no es una
--    pestaña: es el drawer de la cabecera) se olvida, y el origen abre su primera pestaña.
update public.preferencias_usuario p
   set valor = (
         select coalesce(
                  jsonb_object_agg(
                    e.key,
                    case e.value #>> '{}'
                      when 'flujo' then '"fases"'::jsonb
                      when 'formula' then '"planilla"'::jsonb
                      when 'formulas' then '"planilla"'::jsonb
                      when 'tablas' then '"planilla"'::jsonb
                      else e.value
                    end
                  ),
                  '{}'::jsonb
                )
           from jsonb_each(p.valor) e
          where e.value #>> '{}' <> 'datos'
       )
 where p.clave = 'origenes.ultima_pestana'
   and exists (
         select 1
           from jsonb_each_text(p.valor) e
          where e.value in ('flujo', 'formula', 'formulas', 'tablas', 'datos')
       );
