-- La pestaña Aduana es de un origen (docs/DECISIONES.md › «Logística siempre en un origen, el último que usaste»): `declaraciones_listar` pide
-- `p_origen` y lista las declaraciones con algún vehículo vivo de ese origen más las que no tienen ninguno vivo («Sin vehículos»: una declaración
-- recién creada todavía no es de ningún origen). Un origen cuyo flujo no usa la regla `aduana` da vacío. La firma vieja (4 argumentos) se borra:
-- con las dos, PostgREST tendría dos funciones.

drop function public.declaraciones_listar(timestamptz, uuid, integer, jsonb);

create function "public"."declaraciones_listar"("p_desde" timestamp with time zone, "p_id" "uuid", "p_tope" integer, "p_filtros" "jsonb", "p_origen" "uuid") RETURNS TABLE("id" "uuid", "numero" "text", "canal" "text", "aceptada_el" "date", "vence_tributos_el" "date", "despachante" "text", "deposito" "text", "creado_en" timestamp with time zone, "actualizado_en" timestamp with time zone, "vehiculos" integer, "hay_ocultos" boolean, "pagada" boolean, "faltan" integer)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
#variable_conflict use_column
declare
  -- TAMANO_DE_PAGINA_POR_DEFECTO (50), máximo 100, más una para saber si hay otra.
  v_n integer := public._acotar_pagina(p_tope, 50, 100) + 1;
  v_lote constant integer := 200;
  v_yo uuid := (select auth.uid());
  v_gestiona boolean;
  f record;
  v_todos uuid[]; v_algun uuid[];
  v_desde timestamptz; v_id uuid;
  d public.declaraciones_aduana; s record;
  v_leidas integer; v_hallados integer := 0;
begin
  perform public.assert_activo();
  v_gestiona := public.tiene_permiso('logistica.aduana.gestionar');
  if not (v_gestiona or public.tiene_permiso('logistica.ver')) then
    raise exception 'No tienes permiso para ver las declaraciones.' using errcode = '42501';
  end if;
  if p_origen is null then
    raise exception 'La lista de declaraciones es de un origen.' using errcode = '22023', hint = 'p_origen';
  end if;
  -- Un origen cuyo flujo de vehículos no usa la regla aduana no tiene pestaña Aduana: nada que listar (flujos_origen_unico).
  if not exists (select 1 from public.flujos fl
                  where fl.origen_id = p_origen and fl.ambito = 'vehiculos' and public.flujo_regla_activa(fl.id, 'aduana')) then
    return;
  end if;
  select * into f from public._declaraciones_filtros(p_filtros);
  if (p_desde is null) <> (p_id is null) then
    raise exception 'El cursor de la lista está incompleto.' using errcode = '22023', hint = 'cursor';
  end if;
  v_todos := public.origenes_con_alcance('logistica.ver', 'todos');
  v_algun := public.origenes_con_alcance('logistica.ver', 'propios');
  -- Sin cursor, uno que va antes de toda fila (creado_en nunca es infinity): una sola consulta y el cursor sigue siendo condición de índice.
  v_desde := coalesce(p_desde, 'infinity'::timestamptz);
  v_id := coalesce(p_id, 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid);
  -- Por lotes de 200 sobre declaraciones_aduana_creado_idx (creado_en desc, id desc), sin filtros en la consulta: con ellos, el plan genérico los
  -- creía selectivos y ordenaba toda la tabla. Los filtros y la visibilidad sin gestionar descartan filas del índice: la tabla es de volumen bajo (D34).
  loop
    v_leidas := 0;
    for d in
      select x.* from public.declaraciones_aduana x
       where (x.creado_en, x.id) < (v_desde, v_id)
       order by x.creado_en desc, x.id desc
       limit v_lote
    loop
      v_leidas := v_leidas + 1;
      v_desde := d.creado_en;
      v_id := d.id;
      continue when f.canal is not null and d.canal is distinct from f.canal;
      continue when f.q is not null and not starts_with(upper(d.numero), upper(f.q));
      -- La declaración es del origen si tiene al menos un vehículo vivo de él; la que no tiene ninguno vivo («Sin vehículos») va en todos los orígenes con
      -- aduana. Por declaraciones_vehiculos_pkey (declaracion_id, …) y vehiculos_pkey: una declaración junta pocos vehículos.
      continue when not exists (
        select 1 from public.declaraciones_vehiculos dv join public.vehiculos v on v.id = dv.vehiculo_id
         where dv.declaracion_id = d.id and dv.removido_en is null and v.eliminado_en is null and v.origen_id = p_origen)
        and exists (
        select 1 from public.declaraciones_vehiculos dv join public.vehiculos v on v.id = dv.vehiculo_id
         where dv.declaracion_id = d.id and dv.removido_en is null and v.eliminado_en is null);
      select * into s from public._declaracion_resumen(d.id, v_todos, v_algun, v_yo);
      continue when not v_gestiona and s.vehiculos = 0;
      continue when f.pagada is not null and s.pagada is distinct from f.pagada;
      id := d.id; numero := d.numero; canal := d.canal::text; aceptada_el := d.aceptada_el; vence_tributos_el := d.vence_tributos_el;
      despachante := d.despachante; deposito := d.deposito; creado_en := d.creado_en; actualizado_en := d.actualizado_en;
      vehiculos := s.vehiculos; hay_ocultos := s.hay_ocultos; pagada := s.pagada; faltan := s.faltan;
      return next;
      v_hallados := v_hallados + 1;
      exit when v_hallados >= v_n;
    end loop;
    exit when v_hallados >= v_n or v_leidas < v_lote;
  end loop;
end;
$$;

comment on function public.declaraciones_listar(timestamptz, uuid, integer, jsonb, uuid) is
  'Las declaraciones de aduana de un origen (p_origen, obligatorio: 22023 hint p_origen) que quien llama ve (con logistica.aduana.gestionar, todas; con logistica.ver, las que tienen un vehículo vivo que ve): las que tienen algún vehículo vivo de ese origen y las que no tienen ninguno vivo («Sin vehículos»). Un origen sin la regla aduana en su flujo: vacío. Por cursor (creado_en desc, id desc) sobre declaraciones_aduana_creado_idx, con filtros canal, pagada y q. Por fila: vehiculos y faltan (de los que ve), hay_ocultos, pagada (de todos los vivos, D31). Hasta el tope más una. Sin total (6.07-3).';

revoke all on function public.declaraciones_listar(timestamptz, uuid, integer, jsonb, uuid) from public, anon;
grant execute on function public.declaraciones_listar(timestamptz, uuid, integer, jsonb, uuid) to authenticated, service_role;
