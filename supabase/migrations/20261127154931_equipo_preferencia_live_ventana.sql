-- La ventana de cámara del Modo Live (docs/GLOSARIO.md › «Ventana de cámara»): su lugar, su tamaño, si está minimizada, qué datos de quien
-- presenta muestra y qué cámara usa, guardados por persona en `preferencias_usuario` con la clave `live.ventana`. La base admite sólo un objeto
-- con esas claves y de esa forma; espejo de `esquemaDeLaVentanaDeCamara` (`src/modules/equipo/entities/ventana-de-camara.ts`). Cada persona
-- escribe la suya por la policy de siempre. La cámara nunca se graba ni se sube: acá sólo viaja el `deviceId` de la que eligió.

create function public._preferencia_live_ventana_valida(p_valor jsonb) returns boolean
  language sql immutable
  set search_path = ''
as $$
  select coalesce(
    jsonb_typeof(p_valor) = 'object'
    -- Ninguna clave fuera de las conocidas.
    and not exists (
      select 1 from jsonb_object_keys(p_valor) k
       where k <> all (array['x', 'y', 'ancho', 'minimizada', 'espejo', 'ficha_web', 'datos', 'camara'])
    )
    -- Posición: % del espacio libre de la ventana del navegador (0 = pegada al borde izquierdo o de arriba, 100 = al derecho o de abajo).
    and (not (p_valor ? 'x') or case when jsonb_typeof(p_valor -> 'x') = 'number' then (p_valor ->> 'x')::numeric between 0 and 100 else false end)
    and (not (p_valor ? 'y') or case when jsonb_typeof(p_valor -> 'y') = 'number' then (p_valor ->> 'y')::numeric between 0 and 100 else false end)
    -- Ancho en px: el mínimo es 200; el máximo (50 % de la ventana) lo aplica la interfaz; acá sólo un tope que ninguna pantalla pasa.
    and (not (p_valor ? 'ancho') or case when jsonb_typeof(p_valor -> 'ancho') = 'number' then (p_valor ->> 'ancho')::numeric between 200 and 4000 else false end)
    and (not (p_valor ? 'minimizada') or jsonb_typeof(p_valor -> 'minimizada') = 'boolean')
    and (not (p_valor ? 'espejo') or jsonb_typeof(p_valor -> 'espejo') = 'boolean')
    and (not (p_valor ? 'ficha_web') or jsonb_typeof(p_valor -> 'ficha_web') = 'boolean')
    -- Los datos que muestra: hasta 4, de la lista cerrada.
    and (not (p_valor ? 'datos') or case when jsonb_typeof(p_valor -> 'datos') = 'array' then
          jsonb_array_length(p_valor -> 'datos') <= 4
          and not exists (
            select 1 from jsonb_array_elements(p_valor -> 'datos') e
             where jsonb_typeof(e) <> 'string' or (e #>> '{}') <> all (array['nombre_y_cargo', 'contacto', 'logo', 'redes_y_web'])
          )
        else false end)
    -- El `deviceId` de la cámara elegida (texto corto) o null: la primera que haya.
    and (not (p_valor ? 'camara') or jsonb_typeof(p_valor -> 'camara') = 'null'
         or (jsonb_typeof(p_valor -> 'camara') = 'string' and length(p_valor ->> 'camara') <= 300))
  , false)
$$;

comment on function public._preferencia_live_ventana_valida(jsonb) is
  'Forma de la preferencia live.ventana: objeto con x, y (0–100), ancho (200–4000), minimizada, espejo, ficha_web, datos (≤ 4 de una lista) y camara (texto ≤ 300 o null).';

revoke all on function public._preferencia_live_ventana_valida(jsonb) from public, anon;
grant execute on function public._preferencia_live_ventana_valida(jsonb) to authenticated, service_role;

alter table public.preferencias_usuario add constraint preferencias_live_ventana_valida
  check (clave <> 'live.ventana' or public._preferencia_live_ventana_valida(valor));
