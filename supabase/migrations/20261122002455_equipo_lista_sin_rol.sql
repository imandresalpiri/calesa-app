-- «Sin rol» en la lista del equipo: las personas activas, no bloqueadas y sin ninguna fila en `usuarios_roles`. Es la misma definición que el bloque
-- «Personas sin rol» de Inicio (`getPersonasSinRol`), para que «Ver todas» abra la lista de lo que el bloque cuenta. Sólo cambia `_equipo_lista_sql()`:
-- `equipo_lista()` ya le pasa el estado tal cual y valida el permiso. La antijunta se apoya en `usuarios_roles_usuario_idx`.
create or replace function public._equipo_lista_sql(p_texto text, p_estado text, p_limite integer, p_etapa text)
returns text
language plpgsql
stable
set search_path = ''
as $$
declare
  v_texto text := left(btrim(coalesce(p_texto, '')), 100);
  v_estado text := coalesce(p_estado, 'vigentes');
  v_estado_donde text;
  v_texto_donde text := 'true';
  v_texto_de_w text := 'true';
begin
  if v_estado = 'vigentes' then
    v_estado_donde := 'p.activo';
  elsif v_estado = 'sin_rol' then
    v_estado_donde := 'p.activo and not p.bloqueado and not exists (select 1 from public.usuarios_roles ur where ur.usuario_id = p.id)';
  elsif v_estado in ('activa', 'invitacion_pendiente', 'bloqueada', 'baja') then
    v_estado_donde := format('public._estado_de_persona(p.activo, p.bloqueado, p.invitado_en, p.invitacion_aceptada_en) = %L', v_estado);
  else
    raise exception 'El estado «%» no existe.', v_estado using errcode = '22023';
  end if;
  if v_texto <> '' then
    v_texto_donde := format('public._sin_tildes(p.nombre || %L || coalesce(p.email::text, %L)) like %L', ' ', '', public._equipo_busqueda_patron(v_texto));
    v_texto_de_w := format('public._sin_tildes(w.nombre || %L || coalesce(w.email::text, %L)) like %L', ' ', '', public._equipo_busqueda_patron(v_texto));
  end if;
  if p_etapa = 'recorrer' then
    -- Sin `materialized`: la subconsulta se lee de a una fila y el `limit` de afuera corta en cuanto junta lo que pide. El `order by` de afuera lo cumple el de adentro
    -- (el planificador lo sabe y no ordena otra vez).
    return format('select array(select w.id from (select p.id, p.nombre, p.email from public.perfiles p where %s order by p.nombre, p.email, p.id limit %s) w '
                  'where %s order by w.nombre, w.email, w.id limit %s) as ids',
                  v_estado_donde, public._equipo_lista_recorrido(), v_texto_de_w, p_limite);
  elsif p_etapa = 'indice' then
    -- `materialized` cierra la subconsulta: sin él el planificador la deshace y camina el índice del orden (el plan de «maria»).
    return format('with m as materialized (select p.id, p.nombre, p.email from public.perfiles p where %s and %s) '
                  'select m.id from m order by m.nombre, m.email, m.id limit %s',
                  v_estado_donde, v_texto_donde, p_limite);
  elsif p_etapa = 'todo' then
    return format('select p.id from public.perfiles p where %s and %s order by p.nombre, p.email, p.id limit %s', v_estado_donde, v_texto_donde, p_limite);
  end if;
  raise exception 'La etapa «%» no existe.', p_etapa;
end;
$$;
