-- El texto base de las artes (`artes_textos_base`, escrito por `artes_texto_base_guardar`): quién lo lee (quien ve cotizaciones del origen),
-- quién lo cambia (quien configura cotizaciones en él), que un origen inexistente no se escribe aunque el permiso sea global, la versión, el
-- largo y las variables, que todo origen lo tiene (el sembrado y el trigger) y que nadie escribe directo. Corre en PGlite (`pnpm db:probar`,
-- después de la lista fija); cada bloque arma su terreno y revierte.

create or replace function pg_temp.artb_como(p_id uuid) returns void language plpgsql as $$
begin
  reset role;
  perform set_config('request.jwt.claim.sub', p_id::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_id, 'role', 'authenticated')::text, true);
  set local role authenticated;
end;
$$;

create or replace function pg_temp.artb_u(n integer) returns uuid language sql immutable as $$
  select ('00000000-0000-4000-8000-000000a72e' || lpad(n::text, 2, '0'))::uuid
$$;

-- Las personas: 1 ve y configura cotizaciones en todo origen; 2 ve y configura en el origen 1 (subasta); 3 sólo ve el origen 1; 4 ve y
-- configura en el origen 2 (manual); 5 no ve cotizaciones. Los dos orígenes son de la prueba (`ab_o1`, `ab_o2`).
create or replace function pg_temp.artb_terreno() returns void language plpgsql as $$
declare v_rol uuid; v_o1 uuid; v_o2 uuid;
begin
  reset role;
  insert into auth.users (id, email, raw_app_meta_data)
  select pg_temp.artb_u(n), 'ab' || n || '@ejemplo.com', '{"invitado": true}' from generate_series(1, 5) n;
  update public.perfiles set invitacion_aceptada_en = now() where id in (select pg_temp.artb_u(n) from generate_series(1, 5) n);
  update public.perfiles set nombre = 'Ana Base' where id = pg_temp.artb_u(2);
  delete from public.usuarios_roles where usuario_id in (select pg_temp.artb_u(n) from generate_series(1, 5) n);
  insert into public.origenes (clave, nombre, tipo) values ('ab_o1', 'AB subasta', 'subasta') returning id into v_o1;
  insert into public.origenes (clave, nombre, tipo) values ('ab_o2', 'AB manual', 'manual') returning id into v_o2;
  insert into public.roles (clave, nombre) values ('ab_todo', 'AB todo') returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (pg_temp.artb_u(1), v_rol, true);
  insert into public.roles_permisos (rol_id, permiso_clave, alcance) values
    (v_rol, 'cotizaciones.ver', 'todos'), (v_rol, 'cotizaciones.configurar', 'todos');
  insert into public.roles (clave, nombre) values ('ab_configura_1', 'AB configura uno') returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (pg_temp.artb_u(2), v_rol, true);
  insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance) values
    (v_rol, 'cotizaciones.ver', v_o1, 'todos'), (v_rol, 'cotizaciones.configurar', v_o1, 'todos');
  insert into public.roles (clave, nombre) values ('ab_ve_1', 'AB ve uno') returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (pg_temp.artb_u(3), v_rol, true);
  insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance) values (v_rol, 'cotizaciones.ver', v_o1, 'todos');
  insert into public.roles (clave, nombre) values ('ab_configura_2', 'AB configura dos') returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (pg_temp.artb_u(4), v_rol, true);
  insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance) values
    (v_rol, 'cotizaciones.ver', v_o2, 'todos'), (v_rol, 'cotizaciones.configurar', v_o2, 'todos');
  insert into public.roles (clave, nombre) values ('ab_sin', 'AB sin cotizaciones') returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (pg_temp.artb_u(5), v_rol, true);
  insert into public.roles_permisos (rol_id, permiso_clave, alcance) values (v_rol, 'leads.ver', 'todos');
end;
$$;

create or replace function pg_temp.artb_o(n integer) returns uuid language sql stable as $$
  select id from public.origenes where clave = 'ab_o' || n
$$;

-- `estado/hint` de lo que cae, o «no cayó».
create or replace function pg_temp.artb_falla(p_sql text) returns text language plpgsql as $$
declare v_estado text; v_hint text;
begin
  execute p_sql;
  return 'no cayó';
exception when others then
  get stacked diagnostics v_estado = returned_sqlstate, v_hint = pg_exception_hint;
  return v_estado || '/' || coalesce(v_hint, '');
end;
$$;

-- `estado/hint: mensaje` de lo que cae, o «no cayó».
create or replace function pg_temp.artb_mensaje(p_sql text) returns text language plpgsql as $$
declare v_estado text; v_hint text; v_mensaje text;
begin
  execute p_sql;
  return 'no cayó';
exception when others then
  get stacked diagnostics v_estado = returned_sqlstate, v_hint = pg_exception_hint, v_mensaje = message_text;
  return v_estado || '/' || coalesce(v_hint, '') || ': ' || v_mensaje;
end;
$$;

-- La versión del texto base de un origen, leída como el dueño de la tabla.
create or replace function pg_temp.artb_version(p_origen uuid) returns timestamptz language plpgsql as $$
declare v timestamptz; v_rol text := current_user; v_sub text := current_setting('request.jwt.claim.sub', true);
begin
  reset role;
  select t.actualizado_en into v from public.artes_textos_base t where t.origen_id = p_origen;
  if v_rol = 'authenticated' then
    perform pg_temp.artb_como(v_sub::uuid);
  end if;
  return v;
end;
$$;

-- Guardar como quien llama con la versión vigente.
create or replace function pg_temp.artb_sql(p_origen uuid, p_texto text) returns text language plpgsql as $$
begin
  return format('select public.artes_texto_base_guardar(%L, %L, %L)', p_origen, p_texto, pg_temp.artb_version(p_origen));
end;
$$;

-- @test artes: el texto base lo lee quien ve cotizaciones de su origen; ni el de otro origen, ni una cuenta bloqueada, ni quien no ve cotizaciones
begin;
do $$
declare o1 uuid; o2 uuid; k integer;
begin
  perform pg_temp.artb_terreno();
  o1 := pg_temp.artb_o(1);
  o2 := pg_temp.artb_o(2);

  perform pg_temp.artb_como(pg_temp.artb_u(3));
  select count(*) into k from public.artes_textos_base where origen_id = o1;
  if k <> 1 then raise exception 'quien ve cotizaciones del origen 1 no lee su texto base (%)', k; end if;
  select count(*) into k from public.artes_textos_base where origen_id = o2;
  if k <> 0 then raise exception 'quien ve sólo el origen 1 lee el texto base del 2'; end if;

  perform pg_temp.artb_como(pg_temp.artb_u(4));
  select count(*) into k from public.artes_textos_base where origen_id in (o1, o2);
  if k <> 1 or not exists (select 1 from public.artes_textos_base where origen_id = o2) then
    raise exception 'quien ve sólo el origen 2 lee % textos base, esperaba sólo el suyo', k;
  end if;

  perform pg_temp.artb_como(pg_temp.artb_u(5));
  select count(*) into k from public.artes_textos_base;
  if k <> 0 then raise exception 'quien no ve cotizaciones lee % textos base', k; end if;

  perform pg_temp.artb_como(pg_temp.artb_u(1));
  select count(*) into k from public.artes_textos_base where origen_id in (o1, o2);
  if k <> 2 then raise exception 'quien ve cotizaciones de todo origen lee % de los dos', k; end if;

  reset role;
  update public.perfiles set bloqueado = true where id = pg_temp.artb_u(1);
  perform pg_temp.artb_como(pg_temp.artb_u(1));
  select count(*) into k from public.artes_textos_base;
  if k <> 0 then raise exception 'una cuenta bloqueada lee % textos base', k; end if;
  if pg_temp.artb_falla(format('select public.artes_texto_base_guardar(%L, %L, now())', o1, 'Hola')) <> '42501/' then
    raise exception 'una cuenta bloqueada no recibe 42501 al guardar';
  end if;
end $$;
rollback;

-- @test artes: cambia el texto base sólo quien configura cotizaciones en su origen, y guardar mueve la versión y deja quién lo cambió
begin;
do $$
declare o1 uuid; o2 uuid; v0 timestamptz; v1 timestamptz; v text; t public.artes_textos_base;
begin
  perform pg_temp.artb_terreno();
  o1 := pg_temp.artb_o(1);
  o2 := pg_temp.artb_o(2);

  perform pg_temp.artb_como(pg_temp.artb_u(3));
  v := pg_temp.artb_falla(pg_temp.artb_sql(o1, 'Hola {vehiculo}'));
  if v <> '42501/' then raise exception 'quien sólo ve cotizaciones esperaba 42501, dio %', v; end if;
  perform pg_temp.artb_como(pg_temp.artb_u(5));
  v := pg_temp.artb_falla(pg_temp.artb_sql(o1, 'Hola {vehiculo}'));
  if v <> '42501/' then raise exception 'quien no ve cotizaciones esperaba 42501, dio %', v; end if;
  perform pg_temp.artb_como(pg_temp.artb_u(2));
  v := pg_temp.artb_falla(pg_temp.artb_sql(o2, 'Hola {vehiculo}'));
  if v <> '42501/' then raise exception 'quien configura otro origen esperaba 42501, dio %', v; end if;

  v0 := pg_temp.artb_version(o1);
  v1 := public.artes_texto_base_guardar(o1, E'  Hola {vehiculo}\r\nTotal: {total}\n\n ', v0);
  if v1 is null or v1 <= v0 then raise exception 'guardar no movió la versión (% → %)', v0, v1; end if;
  reset role;
  select * into t from public.artes_textos_base where origen_id = o1;
  if t.texto is distinct from E'Hola {vehiculo}\nTotal: {total}' then raise exception 'el texto no quedó normalizado: %', t.texto; end if;
  if t.actualizado_en is distinct from v1 then raise exception 'la versión devuelta no es la guardada'; end if;
  if t.actualizado_por is distinct from pg_temp.artb_u(2) then raise exception 'no quedó quién lo cambió'; end if;
end $$;
rollback;

-- @test artes: un origen que no existe da 22023 aunque el permiso sea global, y no se escribe nada
begin;
do $$
declare v text; x uuid := gen_random_uuid(); k integer;
begin
  perform pg_temp.artb_terreno();
  perform pg_temp.artb_como(pg_temp.artb_u(1));
  v := pg_temp.artb_mensaje(format('select public.artes_texto_base_guardar(%L, %L, now())', x, 'Hola'));
  if v <> '22023/origen: Ese origen no existe.' then raise exception 'un origen inexistente esperaba 22023 origen, dio %', v; end if;
  v := pg_temp.artb_falla(format('select public.artes_texto_base_guardar(%L, %L, null)', x, 'Hola'));
  if v <> '22023/origen' then raise exception 'un origen inexistente sin versión esperaba 22023 origen, dio %', v; end if;
  reset role;
  select count(*) into k from public.artes_textos_base where origen_id = x;
  if k <> 0 then raise exception 'se escribió el texto base de un origen que no existe'; end if;
end $$;
rollback;

-- @test artes: guardar con una versión vieja da PT409 con quién y cuándo (nunca 40001), y el mismo texto no escribe ni mueve la versión
begin;
do $$
declare o1 uuid; v0 timestamptz; v1 timestamptz; v2 timestamptz; v text;
begin
  perform pg_temp.artb_terreno();
  o1 := pg_temp.artb_o(1);
  perform pg_temp.artb_como(pg_temp.artb_u(2));
  v0 := pg_temp.artb_version(o1);
  v1 := public.artes_texto_base_guardar(o1, 'Uno {vehiculo}', v0);

  v := pg_temp.artb_mensaje(format('select public.artes_texto_base_guardar(%L, %L, %L)', o1, 'Dos {vehiculo}', v0));
  if v <> 'PT409/: Cambiaste el texto base de AB subasta hace un momento desde otra ventana. Recarga para seguir desde ahí.' then
    raise exception 'la misma persona con la versión vieja esperaba PT409 de otra ventana, dio %', v;
  end if;
  v := pg_temp.artb_falla(format('select public.artes_texto_base_guardar(%L, %L, %L)', o1, 'Dos {vehiculo}', v1 - interval '1 microsecond'));
  if v <> 'PT409/' then raise exception 'una versión vieja esperaba PT409, dio %', v; end if;
  perform pg_temp.artb_como(pg_temp.artb_u(1));
  v := pg_temp.artb_mensaje(format('select public.artes_texto_base_guardar(%L, %L, %L)', o1, 'Dos {vehiculo}', v0));
  if v <> 'PT409/: Ana Base cambió el texto base de AB subasta hace un momento.' then
    raise exception 'otra persona con la versión vieja esperaba PT409 con quién, dio %', v;
  end if;
  v := pg_temp.artb_falla(format('select public.artes_texto_base_guardar(%L, %L, null)', o1, 'Dos {vehiculo}'));
  if v = 'no cayó' or v like '40001/%' then raise exception 'guardar sin versión no cayó o dio 40001 (%)', v; end if;

  -- El mismo texto (también tras normalizarlo) no escribe: devuelve la misma versión.
  perform pg_temp.artb_como(pg_temp.artb_u(2));
  v2 := public.artes_texto_base_guardar(o1, E'Uno {vehiculo}\r\n', v1);
  if v2 is distinct from v1 then raise exception 'el mismo texto movió la versión (% → %)', v1, v2; end if;
  if pg_temp.artb_version(o1) is distinct from v1 then raise exception 'el mismo texto escribió la fila'; end if;
  reset role;
  if (select texto from public.artes_textos_base where origen_id = o1) <> 'Uno {vehiculo}' then raise exception 'un PT409 escribió el texto'; end if;
end $$;
rollback;

-- @test artes: el texto base vacío, de más de 2000 caracteres o con una variable que no se llena en su origen da 22023 con su campo
begin;
do $$
declare o1 uuid; o2 uuid; v text; v_ficha text;
begin
  perform pg_temp.artb_terreno();
  o1 := pg_temp.artb_o(1);
  o2 := pg_temp.artb_o(2);
  perform pg_temp.artb_como(pg_temp.artb_u(2));

  v := pg_temp.artb_mensaje(pg_temp.artb_sql(o1, ''));
  if v <> '22023/texto: El texto base no puede quedar vacío.' then raise exception 'vacío esperaba 22023 texto, dio %', v; end if;
  v := pg_temp.artb_falla(pg_temp.artb_sql(o1, E'  \r\n\t '));
  if v <> '22023/texto' then raise exception 'sólo blancos esperaba 22023 texto, dio %', v; end if;
  v := pg_temp.artb_falla(format('select public.artes_texto_base_guardar(%L, null, %L)', o1, pg_temp.artb_version(o1)));
  if v <> '22023/texto' then raise exception 'nulo esperaba 22023 texto, dio %', v; end if;
  v := pg_temp.artb_mensaje(pg_temp.artb_sql(o1, repeat('á', 2001)));
  if v <> '22023/texto: El texto base lleva hasta 2000 caracteres.' then raise exception '2001 caracteres esperaba 22023 texto, dio %', v; end if;
  v := pg_temp.artb_falla(pg_temp.artb_sql(o1, repeat('á', 2000)));
  if v <> 'no cayó' then raise exception '2000 caracteres (no bytes) debía guardarse, dio %', v; end if;

  v := pg_temp.artb_mensaje(pg_temp.artb_sql(o1, 'Hola {foo}'));
  if v <> '22023/variables: {foo} no es un dato que el texto base pueda llenar.' then raise exception '{foo} esperaba 22023 variables, dio %', v; end if;
  v := pg_temp.artb_mensaje(pg_temp.artb_sql(o1, 'Hola {}'));
  if v <> '22023/variables: {} no es un dato que el texto base pueda llenar.' then raise exception '{} esperaba 22023 variables, dio %', v; end if;
  v := pg_temp.artb_falla(pg_temp.artb_sql(o1, 'Hola { vehiculo }'));
  if v <> '22023/variables' then raise exception 'una variable con espacios esperaba 22023 variables, dio %', v; end if;
  v := pg_temp.artb_falla(pg_temp.artb_sql(o1, '{celda.}'));
  if v <> '22023/variables' then raise exception '{celda.} esperaba 22023 variables, dio %', v; end if;
  v := pg_temp.artb_falla(pg_temp.artb_sql(o1, '{ficha.no_existe}'));
  if v <> '22023/variables' then raise exception 'una ficha sin campo esperaba 22023 variables, dio %', v; end if;
  v := pg_temp.artb_falla(pg_temp.artb_sql(o1,
    '{vehiculo} {lote} {subasta} {hora_del_patio} {enlace_del_lote} {celda.Total FOB} {red.instagram} {web} {empresa} {cliente} {numero}'));
  if v <> 'no cayó' then raise exception 'las de subasta en un origen de subasta debían guardarse, dio %', v; end if;

  perform pg_temp.artb_como(pg_temp.artb_u(4));
  v := pg_temp.artb_mensaje(pg_temp.artb_sql(o2, 'Lote: {lote}'));
  if v <> '22023/variables: {lote} sólo se llena en un origen de subasta.' then raise exception '{lote} en un manual esperaba 22023 variables, dio %', v; end if;
  v := pg_temp.artb_falla(pg_temp.artb_sql(o2, '{vehiculo} {enlace_del_lote}'));
  if v <> '22023/variables' then raise exception '{enlace_del_lote} en un manual esperaba 22023 variables, dio %', v; end if;

  -- `ficha.<clave>`: un campo activo del origen sí; inactivo, o de otro origen, no.
  reset role;
  select c.clave into v_ficha from public.origenes_campos c where c.origen_id = o2 and c.activo and not c.principal order by c.clave collate "C" limit 1;
  if v_ficha is null then raise exception 'el origen manual de la prueba nació sin campos'; end if;
  perform pg_temp.artb_como(pg_temp.artb_u(4));
  v := pg_temp.artb_falla(pg_temp.artb_sql(o2, '{ficha.' || v_ficha || '}'));
  if v <> 'no cayó' then raise exception 'un campo activo de la ficha debía guardarse, dio %', v; end if;
  reset role;
  update public.origenes_campos set activo = false where origen_id = o2 and clave = v_ficha;
  insert into public.origenes_campos (origen_id, clave, etiqueta, tipo) values (o1, 'solo_en_uno', 'Sólo en uno', 'texto');
  perform pg_temp.artb_como(pg_temp.artb_u(4));
  v := pg_temp.artb_falla(pg_temp.artb_sql(o2, '{ficha.' || v_ficha || '}'));
  if v <> '22023/variables' then raise exception 'un campo inactivo de la ficha esperaba 22023 variables, dio %', v; end if;
  v := pg_temp.artb_falla(pg_temp.artb_sql(o2, '{ficha.solo_en_uno}'));
  if v <> '22023/variables' then raise exception 'un campo de otro origen esperaba 22023 variables, dio %', v; end if;
end $$;
rollback;

-- @test artes: todo origen tiene su texto base con el inicial de su tipo: el de subasta lleva {lote} y el manual no
begin;
do $$
declare k integer;
begin
  reset role;
  if not exists (select 1 from public.origenes where tipo = 'subasta') or not exists (select 1 from public.origenes where tipo = 'manual') then
    raise exception 'el seed no trae un origen de cada tipo';
  end if;
  select count(*) into k from public.origenes o where not exists (select 1 from public.artes_textos_base t where t.origen_id = o.id);
  if k <> 0 then raise exception '% orígenes sin texto base', k; end if;
  select count(*) into k from public.origenes o join public.artes_textos_base t on t.origen_id = o.id
   where t.texto is distinct from public._artes_texto_base_inicial(o.tipo) or t.actualizado_por is not null;
  if k <> 0 then raise exception '% orígenes con un texto base que no es el inicial de su tipo', k; end if;
  if exists (select 1 from public.origenes o join public.artes_textos_base t on t.origen_id = o.id
              where (o.tipo = 'subasta') <> (t.texto like '%{lote}%')) then
    raise exception 'un texto base de subasta sin {lote} o uno manual con {lote}';
  end if;
end $$;
rollback;

-- @test artes: crear un origen siembra su texto base con el inicial de su tipo, y el inicial vale en su origen
begin;
do $$
declare o1 uuid; o2 uuid; v text;
begin
  perform pg_temp.artb_terreno();
  o1 := pg_temp.artb_o(1);
  o2 := pg_temp.artb_o(2);
  if (select texto from public.artes_textos_base where origen_id = o1) is distinct from public._artes_texto_base_inicial('subasta') then
    raise exception 'el origen de subasta recién creado no tiene el texto inicial de subasta';
  end if;
  if (select texto from public.artes_textos_base where origen_id = o2) is distinct from public._artes_texto_base_inicial('manual') then
    raise exception 'el origen manual recién creado no tiene el texto inicial manual';
  end if;
  v := public._artes_texto_base_variables_validas(o1, 'subasta', public._artes_texto_base_inicial('subasta'));
  if v is not null then raise exception 'el inicial de subasta no vale en su origen: %', v; end if;
  v := public._artes_texto_base_variables_validas(o2, 'manual', public._artes_texto_base_inicial('manual'));
  if v is not null then raise exception 'el inicial manual no vale en su origen: %', v; end if;
end $$;
rollback;

-- @test artes: nadie escribe el texto base directo: insert, update y delete como authenticated dan 42501
begin;
do $$
declare o1 uuid; v text;
begin
  perform pg_temp.artb_terreno();
  o1 := pg_temp.artb_o(1);
  perform pg_temp.artb_como(pg_temp.artb_u(1));
  v := pg_temp.artb_falla(format('insert into public.artes_textos_base (origen_id, texto) values (%L, %L) on conflict do nothing', gen_random_uuid(), 'Hola'));
  if v <> '42501/' then raise exception 'el insert directo esperaba 42501, dio %', v; end if;
  v := pg_temp.artb_falla(format('update public.artes_textos_base set texto = %L where origen_id = %L', 'Hola', o1));
  if v <> '42501/' then raise exception 'el update directo esperaba 42501, dio %', v; end if;
  v := pg_temp.artb_falla(format('delete from public.artes_textos_base where origen_id = %L', o1));
  if v <> '42501/' then raise exception 'el delete directo esperaba 42501, dio %', v; end if;
  v := pg_temp.artb_falla(format('select public._artes_texto_base_inicial(%L)', 'manual'));
  if v <> '42501/' then raise exception 'el texto inicial se llama desde afuera (%)', v; end if;
  v := pg_temp.artb_falla(format('select public._artes_texto_base_variables_validas(%L, %L, %L)', o1, 'subasta', 'Hola'));
  if v <> '42501/' then raise exception 'la validación de variables se llama desde afuera (%)', v; end if;
end $$;
rollback;

-- @test artes: el texto base inicial de cada tipo es el que se espera (su espejo en TS es `textoBaseInicial()`)
begin;
do $$
begin
  if public._artes_texto_base_inicial('subasta') is distinct from E'{vehiculo}\nLote: {lote}\nAño: {anio}\nKilometraje: {kilometraje}\nVIN: {vin}\nSubasta: {subasta}\nHora del patio: {hora_del_patio}\nTotal: {total}\nModo de tipo de cambio: {modo}\nVálida hasta: {vigencia}\nAsesor: {asesor}\nCargo: {cargo}\nWhatsApp: {whatsapp}' then
    raise exception 'el texto inicial de subasta cambió: %', public._artes_texto_base_inicial('subasta');
  end if;
  if public._artes_texto_base_inicial('manual') is distinct from E'{vehiculo}\nAño: {anio}\nKilometraje: {kilometraje}\nVIN: {vin}\nTotal: {total}\nModo de tipo de cambio: {modo}\nVálida hasta: {vigencia}\nAsesor: {asesor}\nCargo: {cargo}\nWhatsApp: {whatsapp}' then
    raise exception 'el texto inicial manual cambió: %', public._artes_texto_base_inicial('manual');
  end if;
end $$;
rollback;
