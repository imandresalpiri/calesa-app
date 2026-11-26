-- La pestaña Fases de un origen también la abre quien gestiona sus catálogos de logística (puertos, navieras, categorías de gasto y tipos de documento se
-- configuran ahí, arriba del diagrama): el marco del origen lee `origenes_resumen()`, que ahora acepta también `logistica.catalogos.gestionar`. El cuerpo es
-- el de antes; sólo cambia el chequeo inicial (sin origen, como los otros tres: el resumen no dice nada de un catálogo).
create or replace function public.origenes_resumen()
returns table(origen_id uuid, vehiculos integer, cotizaciones integer, campos_activos integer, categorias integer, fases integer, formula_publicada boolean, concesiones integer, tarjeta_publicada boolean)
language plpgsql stable security definer
set search_path = ''
as $$
begin
  perform public.assert_activo();
  if not (public.tiene_permiso('origenes.gestionar') or public.tiene_permiso('flujos.configurar') or public.tiene_permiso('cotizaciones.configurar')
          or public.tiene_permiso('logistica.catalogos.gestionar')) then
    raise exception 'No tienes permiso para ver cómo está configurado cada origen.' using errcode = '42501';
  end if;
  return query
  select o.id,
    (select count(*)::int from public.vehiculos v where v.origen_id = o.id),
    (select count(*)::int from public.cotizaciones q where q.origen_id = o.id),
    (select count(*)::int from public.origenes_campos c where c.origen_id = o.id and c.activo),
    (select count(*)::int from public.categorias k where k.origen_id = o.id),
    (select count(*)::int from public.fases f join public.flujos fl on fl.id = f.flujo_id where fl.origen_id = o.id and f.activa),
    exists (select 1 from public.formulas_del_origen fo where fo.origen_id = o.id and fo.activa),   -- formulas_del_origen_activa_unica
    (select count(*)::int from public.roles_permisos rp where rp.origen_id = o.id),
    -- La activa (formulas_del_origen_activa_unica) y su publicada (plantillas_publicada_unica).
    exists (select 1 from public.formulas_del_origen fo
              join public.plantillas_tarjeta p on p.formula_del_origen_id = fo.id and p.estado = 'publicada'
             where fo.origen_id = o.id and fo.activa)
  from public.origenes o
  order by o.orden, o.nombre;
end;
$$;

comment on function public.origenes_resumen() is 'Cómo está configurado cada origen (origenes.gestionar, flujos.configurar, cotizaciones.configurar o logistica.catalogos.gestionar en alguno; si no, 42501): conteos de vehículos, cotizaciones, campos, categorías, fases y concesiones; formula_publicada (tiene fórmula activa) y tarjeta_publicada (la fórmula activa tiene su tarjeta publicada).';

revoke all on function public.origenes_resumen() from public, anon;
grant execute on function public.origenes_resumen() to authenticated, service_role;
