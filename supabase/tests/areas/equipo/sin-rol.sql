-- El estado «Sin rol» de `equipo_lista()`: las personas activas, no bloqueadas y sin ninguna fila en `usuarios_roles` (lo mismo que cuenta el bloque «Personas
-- sin rol» de Inicio). No depende de otro archivo (`SOLO=areas/equipo/sin-rol.sql`); cada bloque abre su transacción y la revierte.

-- @test SR1 «sin_rol» trae a quien no tiene rol y no a quien lo tiene, está bloqueada o de baja
do $$
declare
  v_duena uuid := gen_random_uuid();
  v_rol uuid := (select id from public.roles where clave = 'dueno');
  v_sin uuid := gen_random_uuid();
  v_con uuid := gen_random_uuid();
  v_bloqueada uuid := gen_random_uuid();
  v_baja uuid := gen_random_uuid();
  v_ids uuid[];
begin
  insert into auth.users (id, email, raw_app_meta_data) values
    (v_duena, v_duena || '@ejemplo.com', '{"invitado": true}'),
    (v_sin, v_sin || '@ejemplo.com', '{"invitado": true}'), (v_con, v_con || '@ejemplo.com', '{"invitado": true}'),
    (v_bloqueada, v_bloqueada || '@ejemplo.com', '{"invitado": true}'), (v_baja, v_baja || '@ejemplo.com', '{"invitado": true}');
  insert into public.usuarios_roles (usuario_id, rol_id) values (v_duena, v_rol), (v_con, v_rol) on conflict do nothing;
  update public.perfiles set invitacion_aceptada_en = now() where id = v_duena;
  update public.perfiles set bloqueado = true, bloqueado_en = now() where id = v_bloqueada;
  update public.perfiles set activo = false, baja_en = now() where id = v_baja;

  perform set_config('request.jwt.claim.sub', v_duena::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  select array_agg(x) into v_ids from public.equipo_lista(null, 'sin_rol', 101) x;
  reset role;
  if not (v_sin = any (v_ids)) then raise exception '«sin_rol» no trajo a la persona sin rol'; end if;
  if v_con = any (v_ids) then raise exception '«sin_rol» trajo a una persona con rol'; end if;
  if v_bloqueada = any (v_ids) then raise exception '«sin_rol» trajo a una persona bloqueada'; end if;
  if v_baja = any (v_ids) then raise exception '«sin_rol» trajo a una persona de baja'; end if;
  if exists (select 1 from public.usuarios_roles ur where ur.usuario_id = any (v_ids)) then
    raise exception '«sin_rol» trajo a alguien con una fila en usuarios_roles';
  end if;
end $$;

-- @test SR2 las tres etapas dan los mismos ids para «sin_rol», con un texto
do $$
declare
  v_duena uuid := gen_random_uuid();
  v_sin uuid := gen_random_uuid();
  v_texto text := 'srprueba' || replace(gen_random_uuid()::text, '-', '');
  v_recorrer uuid[];
  v_indice uuid[];
  v_todo uuid[];
begin
  -- Siempre tiene que quedar alguien activo que gestione el equipo: la dueña de la prueba.
  insert into auth.users (id, email, raw_app_meta_data) values (v_duena, v_duena || '@ejemplo.com', '{"invitado": true}');
  insert into public.usuarios_roles (usuario_id, rol_id) values (v_duena, (select id from public.roles where clave = 'dueno'));
  update public.perfiles set invitacion_aceptada_en = now() where id = v_duena;
  insert into auth.users (id, email, raw_app_meta_data) values (v_sin, v_texto || '@ejemplo.com', '{"invitado": true}');
  execute public._equipo_lista_sql(v_texto, 'sin_rol', 101, 'recorrer') into v_recorrer;
  execute 'select array(' || public._equipo_lista_sql(v_texto, 'sin_rol', 101, 'indice') || ')' into v_indice;
  execute 'select array(' || public._equipo_lista_sql(v_texto, 'sin_rol', 101, 'todo') || ')' into v_todo;
  if v_recorrer is distinct from v_indice or v_indice is distinct from v_todo then
    raise exception 'las etapas de «sin_rol» no coinciden';
  end if;
  if v_todo is distinct from array[v_sin] then
    raise exception 'el texto no encontró a la persona sin rol: % / %', v_todo, v_recorrer;
  end if;
end $$;
