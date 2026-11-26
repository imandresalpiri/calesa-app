-- Migración de datos: se borra al aplastar (`pnpm db:aplastar`), con su entrada en `DATOS_DE_PRUEBA` de `scripts/probar-schema.mjs`.
-- Los grupos de texto de los campos (de los leads y de cada origen) pasan al catálogo. La prueba devuelve la columna `grupo` de antes,
-- siembra textos y ejecuta otra vez la sección de datos de la migración (`_migracion_de_grupos`, la que empieza con
-- `-- campos_grupos_catalogo`: lo que va entre `-- datos:inicio` y `-- datos:fin`). No depende de otro archivo
-- (`SOLO=areas/campos/grupos-migracion.sql`).
--
-- Qué asegura:
--   M1. Los textos que sólo difieren en mayúsculas, tildes o espacios quedan en un grupo: gana el más usado; si empatan, el del campo de
--       menor orden (no el orden binario).
--   M2. Los grupos se ordenan por su primer campo; cada campo queda con el suyo; un texto vacío o nulo queda sin grupo; la columna se va.
--   M3. Por origen: el mismo nombre en dos orígenes son dos grupos, y cada campo queda con el de su origen.
--   M4. Idempotente: con la columna de vuelta y los mismos textos, no crea grupos ni reescribe campos (ni un `ctid` nuevo).
--   M5. No escribe en la auditoría ni mueve la versión de los campos.

create or replace function pg_temp.gm_migrar() returns void language plpgsql as $f$
begin
  execute (select substring(doc #>> '{}' from '-- datos:inicio(.*)-- datos:fin') from _migracion_de_grupos);
end $f$;

-- La forma de antes: la columna `grupo` con el nombre del grupo de cada campo y ningún grupo en el catálogo.
create or replace function pg_temp.gm_volver_atras() returns void language plpgsql as $f$
begin
  alter table public.leads_campos add column grupo text;
  update public.leads_campos c set grupo = g.nombre from public.leads_campos_grupos g where g.id = c.grupo_id;
  update public.leads_campos set grupo_id = null where grupo_id is not null;
  delete from public.leads_campos_grupos;
  alter table public.origenes_campos add column grupo text;
  update public.origenes_campos c set grupo = g.nombre from public.origenes_campos_grupos g where g.id = c.grupo_id;
  update public.origenes_campos set grupo_id = null where grupo_id is not null;
  delete from public.origenes_campos_grupos;
end $f$;

-- Campos de leads con grupos escritos de varias formas: «datos del auto» (dos veces, una con espacios de más) le gana a «Datos del Auto»
-- (una); «extra» y «Extra» empatan y gana el de menor orden; uno vacío y uno nulo.
create or replace function pg_temp.gm_sembrar_leads() returns void language plpgsql as $f$
begin
  insert into public.leads_campos (clave, etiqueta, tipo, orden, grupo) values
    ('gm_a1', 'GM A1', 'texto', 9001, 'Datos del Auto'),
    ('gm_a2', 'GM A2', 'texto', 9002, 'datos del auto'),
    ('gm_a3', 'GM A3', 'texto', 9003, ' datos  del   auto '),
    ('gm_b1', 'GM B1', 'texto', 9010, 'extra'),
    ('gm_b2', 'GM B2', 'texto', 9011, 'Extra'),
    ('gm_c1', 'GM C1', 'texto', 9020, '   '),
    ('gm_c2', 'GM C2', 'texto', 9021, null);
end $f$;

create or replace function pg_temp.gm_grupo_de(p_clave text) returns text language sql as $f$
  select g.nombre from public.leads_campos c join public.leads_campos_grupos g on g.id = c.grupo_id where c.clave = p_clave
$f$;

-- @test grupos migrados: los de leads se unen por la clave, gana el más usado y se ordenan por su primer campo (M1, M2)
begin;
do $$
begin
  perform pg_temp.gm_volver_atras();
  perform pg_temp.gm_sembrar_leads();
  perform pg_temp.gm_migrar();
  if pg_temp.gm_grupo_de('gm_a1') is distinct from 'datos del auto' or pg_temp.gm_grupo_de('gm_a2') is distinct from 'datos del auto'
     or pg_temp.gm_grupo_de('gm_a3') is distinct from 'datos del auto' then
    raise exception 'M1: el más usado: % / % / %', pg_temp.gm_grupo_de('gm_a1'), pg_temp.gm_grupo_de('gm_a2'), pg_temp.gm_grupo_de('gm_a3');
  end if;
  if pg_temp.gm_grupo_de('gm_b1') is distinct from 'extra' or pg_temp.gm_grupo_de('gm_b2') is distinct from 'extra' then
    raise exception 'M1: el empate lo gana el de menor orden: % / %', pg_temp.gm_grupo_de('gm_b1'), pg_temp.gm_grupo_de('gm_b2');
  end if;
  if (select count(*) from public.leads_campos_grupos where public._nombre_de_catalogo(nombre) in ('datos del auto', 'extra')) <> 2 then
    raise exception 'M1: quedaron grupos repetidos: %', (select array_agg(nombre) from public.leads_campos_grupos);
  end if;
  if exists (select 1 from public.leads_campos where clave in ('gm_c1', 'gm_c2') and grupo_id is not null) then
    raise exception 'M2: un texto vacío o nulo quedó con grupo';
  end if;
  if exists (select 1 from public.leads_campos_grupos where nombre = '') then raise exception 'M2: nació un grupo sin nombre'; end if;
  if (select array_agg(nombre order by orden) from public.leads_campos_grupos
       where nombre in ('Datos personales', 'Ubicación', 'Notas', 'datos del auto', 'extra'))
     <> array['Datos personales', 'Ubicación', 'Notas', 'datos del auto', 'extra'] then
    raise exception 'M2: el orden de los grupos no es el de su primer campo: %', (select array_agg(nombre order by orden) from public.leads_campos_grupos);
  end if;
  if exists (select 1 from public.leads_campos_grupos where orden % 10 <> 0) then raise exception 'M2: el orden no va de 10 en 10'; end if;
  if (select g.nombre from public.leads_campos c join public.leads_campos_grupos g on g.id = c.grupo_id where c.clave = 'direccion')
     is distinct from 'Ubicación' then raise exception 'M2: un campo de fábrica perdió su grupo'; end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'leads_campos' and column_name = 'grupo') then
    raise exception 'M2: la columna de antes sigue';
  end if;
end $$;
rollback;

-- @test grupos migrados: por origen, el mismo nombre en dos orígenes son dos grupos (M3)
begin;
do $$
declare o1 uuid; o2 uuid;
begin
  insert into public.origenes (clave, nombre) values ('prueba_gm1', 'Prueba gm 1') returning id into o1;
  insert into public.origenes (clave, nombre) values ('prueba_gm2', 'Prueba gm 2') returning id into o2;
  perform pg_temp.gm_volver_atras();
  update public.origenes_campos set grupo = 'VEHICULO ' where origen_id = o1 and clave = 'motor';
  update public.origenes_campos set grupo = null where origen_id = o2 and clave = 'descripcion';
  perform pg_temp.gm_migrar();
  if (select array_agg(nombre order by orden) from public.origenes_campos_grupos where origen_id = o1) <> array['Vehículo', 'Venta'] then
    raise exception 'M3: los grupos del primer origen: %', (select array_agg(nombre order by orden) from public.origenes_campos_grupos where origen_id = o1);
  end if;
  if (select array_agg(nombre order by orden) from public.origenes_campos_grupos where origen_id = o2) <> array['Vehículo', 'Venta'] then
    raise exception 'M3: los grupos del segundo origen: %', (select array_agg(nombre order by orden) from public.origenes_campos_grupos where origen_id = o2);
  end if;
  if exists (select 1 from public.origenes_campos c join public.origenes_campos_grupos g on g.id = c.grupo_id where g.origen_id <> c.origen_id) then
    raise exception 'M3: un campo quedó con el grupo de otro origen';
  end if;
  if (select g.nombre from public.origenes_campos c join public.origenes_campos_grupos g on g.id = c.grupo_id where c.origen_id = o1 and c.clave = 'motor')
     is distinct from 'Vehículo' then raise exception 'M3: «VEHICULO » no se unió a «Vehículo»'; end if;
  if (select grupo_id from public.origenes_campos where origen_id = o2 and clave = 'descripcion') is not null then
    raise exception 'M3: un campo sin grupo quedó con uno';
  end if;
  if exists (select 1 from public.origenes_campos c where c.origen_id in (o1, o2) and c.clave <> 'descripcion' and c.grupo_id is null) then
    raise exception 'M3: quedó un campo sin su grupo';
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'origenes_campos' and column_name = 'grupo') then
    raise exception 'M3: la columna de antes sigue';
  end if;
end $$;
rollback;

-- @test grupos migrados: correrla otra vez no crea grupos ni reescribe campos (M4)
begin;
do $$
declare antes jsonb; despues jsonb;
begin
  perform pg_temp.gm_volver_atras();
  perform pg_temp.gm_sembrar_leads();
  perform pg_temp.gm_migrar();
  -- La columna vuelve con los mismos textos, y los grupos ya están.
  alter table public.leads_campos add column grupo text;
  update public.leads_campos c set grupo = s.grupo from (values ('gm_a1', 'Datos del Auto'), ('gm_a2', 'datos del auto'),
    ('gm_a3', ' datos  del   auto '), ('gm_b1', 'extra'), ('gm_b2', 'Extra'), ('gm_c1', '   ')) s (clave, grupo) where c.clave = s.clave;
  update public.leads_campos c set grupo = g.nombre from public.leads_campos_grupos g where g.id = c.grupo_id and c.clave not like 'gm_%';
  alter table public.origenes_campos add column grupo text;
  update public.origenes_campos c set grupo = g.nombre from public.origenes_campos_grupos g where g.id = c.grupo_id;
  select jsonb_build_object(
           'campos', (select jsonb_agg(jsonb_build_array(ctid::text, grupo_id) order by id) from public.leads_campos),
           'del_origen', (select jsonb_agg(jsonb_build_array(ctid::text, grupo_id) order by id) from public.origenes_campos),
           'grupos', (select jsonb_agg(jsonb_build_array(ctid::text, nombre, orden) order by id) from public.leads_campos_grupos),
           'grupos_del_origen', (select jsonb_agg(jsonb_build_array(ctid::text, nombre, orden) order by id) from public.origenes_campos_grupos))
    into antes;
  perform pg_temp.gm_migrar();
  select jsonb_build_object(
           'campos', (select jsonb_agg(jsonb_build_array(ctid::text, grupo_id) order by id) from public.leads_campos),
           'del_origen', (select jsonb_agg(jsonb_build_array(ctid::text, grupo_id) order by id) from public.origenes_campos),
           'grupos', (select jsonb_agg(jsonb_build_array(ctid::text, nombre, orden) order by id) from public.leads_campos_grupos),
           'grupos_del_origen', (select jsonb_agg(jsonb_build_array(ctid::text, nombre, orden) order by id) from public.origenes_campos_grupos))
    into despues;
  if antes is distinct from despues then raise exception 'M4: la segunda corrida cambió algo'; end if;
end $$;
rollback;

-- @test grupos migrados: no escribe en la auditoría ni mueve la versión de los campos (M5)
begin;
do $$
declare ultima bigint; antes jsonb;
begin
  perform pg_temp.gm_volver_atras();
  perform pg_temp.gm_sembrar_leads();
  ultima := (select coalesce(max(id), 0) from public.actividad);
  antes := (select jsonb_object_agg(id, actualizado_en) from public.leads_campos);
  perform pg_temp.gm_migrar();
  if exists (select 1 from public.actividad where id > ultima) then
    raise exception 'M5: la migración escribió en la auditoría: %', (select jsonb_agg(jsonb_build_array(tabla, accion)) from public.actividad where id > ultima);
  end if;
  if antes is distinct from (select jsonb_object_agg(id, actualizado_en) from public.leads_campos) then
    raise exception 'M5: movió la versión de un campo';
  end if;
  if (select count(*) from public.leads_campos where grupo_id is not null and clave like 'gm_%') <> 5 then
    raise exception 'M5: no migró los campos sembrados';
  end if;
end $$;
rollback;
