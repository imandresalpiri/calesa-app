-- Copiar las fases (`flujo_copiar_fases`): el flujo de vehículos de un origen sin fases empieza como copia del de otro. No depende de otro archivo
-- (`SOLO=areas/flujos/copiar-fases.sql`). Cada bloque abre su transacción y la revierte.
--
-- Qué asegura:
--   C1. La copia completa: reglas exactas, fases activas (sin la jubilada) con sus columnas, roles, salidas entre activas con sus roles,
--       requisitos apuntando a las fases nuevas, el tipo de la empresa con su id y los tipos del flujo creados en el destino; conteos, versión,
--       origen intacto y una fila `flujo.copiado` en la actividad.
--   C2. Lo saltado: `subasta` (la fase se copia sin «Es la subasta»), `espera_apagada`, `espera_jubilada` y `tipo_documento_reusado` (el
--       requisito usa el tipo que ya estaba y, si sus formatos no caben, queda sin acotar).
--   C3. Permisos: quien no configura flujos, quien configura sólo uno de los dos flujos y quien sólo tiene `repuestos.configurar` → 42501 sin escribir.
--   C4. Rechazos: destino con fases (aunque sea una jubilada) → 23514 `destino`; origen sin fases activas, el mismo flujo, repuestos o un origen
--       inexistente → 22023 `desde`/`destino`; versión vieja o destino inexistente → PT409; sobre el tope de tipos → 22023 `tipos_documento`.
--   C5. `authenticated` ejecuta; `anon` no.
--   C6. La copia lleva la posición de cada fase en el diagrama (la que no tenía sigue sin ella).

create or replace function pg_temp.cf_persona(p_concesiones text[]) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('cf_' || substr(v_id::text, 1, 8), 'CF ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id)
    values (v_rol, split_part(c, '@', 1), nullif(split_part(c, '@', 2), '')::uuid);
  end loop;
  return v_id;
end $f$;

-- Un origen nuevo de ese tipo (su flujo lo crea `origen_crear_flujo`, con sus reglas y sin fases); devuelve el id del flujo.
create or replace function pg_temp.cf_flujo(p_tipo text default 'manual') returns uuid language plpgsql as $f$
declare o uuid; s text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
begin
  insert into public.origenes (clave, nombre, tipo) values ('cf_' || s, 'CF origen ' || s, p_tipo::public.tipo_origen) returning id into o;
  return (select id from public.flujos where origen_id = o);
end $f$;

create or replace function pg_temp.cf_origen_de(p_flujo uuid) returns uuid language sql as $f$
  select origen_id from public.flujos where id = p_flujo;
$f$;

create or replace function pg_temp.cf_version(p_flujo uuid) returns timestamptz language sql as $f$
  select actualizado_en from public.flujos where id = p_flujo;
$f$;

create or replace function pg_temp.cf_fase(p_flujo uuid, p_nombre text, p_orden int, p_extra jsonb default '{}') returns uuid language sql as $f$
  insert into public.fases (flujo_id, nombre, orden, activa, es_inicial, es_final, es_subasta, publica_web, alias_portal, permite_aduana)
  values (p_flujo, p_nombre, p_orden, coalesce((p_extra ->> 'activa')::boolean, true), coalesce((p_extra ->> 'es_inicial')::boolean, false),
          coalesce((p_extra ->> 'es_final')::boolean, false), coalesce((p_extra ->> 'es_subasta')::boolean, false),
          coalesce((p_extra ->> 'publica_web')::boolean, false), p_extra ->> 'alias_portal', coalesce((p_extra ->> 'permite_aduana')::boolean, false))
  returning id;
$f$;

create or replace function pg_temp.cf_fase_de_repuestos() returns uuid language sql as $f$
  insert into public.fases (flujo_id, nombre, orden)
  select id, 'CF rep ' || substr(gen_random_uuid()::text, 1, 6), 1000 from public.flujos where ambito = 'repuestos' returning id;
$f$;

create or replace function pg_temp.cf_salida(p_flujo uuid, p_de uuid, p_a uuid) returns uuid language sql as $f$
  insert into public.fases_transiciones (flujo_id, de_fase_id, a_fase_id) values (p_flujo, p_de, p_a) returning id;
$f$;

create or replace function pg_temp.cf_tipo(p_flujo uuid, p_nombre text, p_activo boolean default true, p_formatos text[] default null)
returns uuid language sql as $f$
  insert into public.tipos_documento (flujo_id, nombre, activo, orden, formatos)
  values (p_flujo, p_nombre, p_activo, 10, coalesce(p_formatos, '{application/pdf,image/jpeg,image/png,image/webp}')) returning id;
$f$;

create or replace function pg_temp.cf_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
declare v jsonb; v_m text; v_e text; v_h text;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  begin
    execute p_sql into v;
  exception when others then
    get stacked diagnostics v_m = message_text, v_e = returned_sqlstate, v_h = pg_exception_hint;
    reset role;
    return jsonb_build_object('error', v_e, 'mensaje', v_m, 'hint', nullif(v_h, ''));
  end;
  reset role;
  return coalesce(v, '{}'::jsonb);
end $f$;

create or replace function pg_temp.cf_copiar(p_quien uuid, p_flujo uuid, p_desde uuid, p_version timestamptz default null) returns jsonb language sql as $f$
  select pg_temp.cf_corre(p_quien, format('select public.flujo_copiar_fases(%L, %L, %L)',
    p_flujo, coalesce(p_version, (select actualizado_en from public.flujos where id = p_flujo)), p_desde));
$f$;

create or replace function pg_temp.cf_falla(p_que text, p_r jsonb, p_estado text, p_hint text) returns void language plpgsql as $f$
begin
  if p_r ->> 'error' is distinct from p_estado or p_r ->> 'hint' is distinct from p_hint then
    raise exception '%: debía dar % (hint %) y dio %', p_que, p_estado, p_hint, p_r;
  end if;
end $f$;

create or replace function pg_temp.cf_bien(p_que text, p_r jsonb) returns jsonb language plpgsql as $f$
begin
  if p_r ? 'error' or p_r ->> 'version' is null then raise exception '%: debía andar y dio %', p_que, p_r; end if;
  return p_r;
end $f$;

create or replace function pg_temp.cf_reglas(p_flujo uuid) returns text[] language sql as $f$
  select coalesce(array_agg(regla || ':' || activa order by regla), '{}') from public.flujos_reglas where flujo_id = p_flujo;
$f$;

-- La fase del destino con ese nombre.
create or replace function pg_temp.cf_en(p_flujo uuid, p_nombre text) returns uuid language sql as $f$
  select id from public.fases where flujo_id = p_flujo and nombre = p_nombre;
$f$;

-- @test copiar-fases: copia reglas, fases activas, roles, salidas, requisitos y tipos del flujo; mueve la versión y deja el origen intacto (C1)
begin;
do $$
declare
  a uuid := pg_temp.cf_flujo(); b uuid := pg_temp.cf_flujo();
  yo uuid := pg_temp.cf_persona(array['flujos.configurar']);
  r1 uuid; r2 uuid; te uuid; tf uuid; ti uuid; fr uuid := pg_temp.cf_fase_de_repuestos();
  f1 uuid; f2 uuid; f3 uuid; fj uuid; s12 uuid;
  va timestamptz; vb timestamptz; res jsonb; tf_nuevo uuid; n int;
  reglas_a text[];
begin
  -- Reglas distintas de las del destino: aduana encendida y portal apagado (el destino nace sin aduana y con el portal).
  insert into public.flujos_reglas (flujo_id, regla, activa) values (a, 'aduana', true);
  update public.flujos_reglas set activa = false where flujo_id = a and regla = 'portal_cliente';
  insert into public.roles (clave, nombre) values ('cf_r1', 'CF R1') returning id into r1;
  insert into public.roles (clave, nombre) values ('cf_r2', 'CF R2') returning id into r2;
  te := pg_temp.cf_tipo(null, 'CF Empresa ' || substr(gen_random_uuid()::text, 1, 6));
  tf := pg_temp.cf_tipo(a, 'CF Factura del proveedor', true, '{application/pdf,image/png}');
  ti := pg_temp.cf_tipo(a, 'CF Viejo', false);
  f1 := pg_temp.cf_fase(a, 'CF Compra', 10, '{"es_inicial": true, "alias_portal": "Comprado", "permite_aduana": true}');
  f2 := pg_temp.cf_fase(a, 'CF Viaje', 20, '{"publica_web": true}');
  f3 := pg_temp.cf_fase(a, 'CF Entrega', 30, '{"es_final": true}');
  fj := pg_temp.cf_fase(a, 'CF Vieja', 40, '{"activa": false}');
  update public.fases set descripcion = 'CF desc', color = '#123456', demora_dias = 5, alerta_cada_horas = 12, nota_obligatoria = true where id = f2;
  s12 := pg_temp.cf_salida(a, f1, f2);
  update public.fases_transiciones set accion = 'Embarcar', nota_obligatoria = true where id = s12;
  perform pg_temp.cf_salida(a, f2, f3);
  perform pg_temp.cf_salida(a, f2, fj);
  insert into public.fases_roles (fase_id, rol_id) values (f1, r1);
  insert into public.fases_transiciones_roles (transicion_id, rol_id) values (s12, r2);
  insert into public.fases_requisitos (fase_id, tipo, orden, clave_dato, config) values (f1, 'dato', 10, 'pagos.umbral_pct', '{"pct": 50}');
  insert into public.fases_requisitos (fase_id, tipo, orden, tipo_documento_id, bloqueante) values (f1, 'documento', 20, te, true);
  insert into public.fases_requisitos (fase_id, tipo, orden, tipo_documento_id, formatos, min_archivos) values (f2, 'documento', 10, tf, '{application/pdf}', 2);
  insert into public.fases_requisitos (fase_id, tipo, orden, espera_fase_id, espera_ambito) values (f3, 'espera', 10, fr, 'hijos');
  va := pg_temp.cf_version(a); vb := pg_temp.cf_version(b); reglas_a := pg_temp.cf_reglas(a);

  res := pg_temp.cf_bien('C1', pg_temp.cf_copiar(yo, b, a));
  if res -> 'copiado' is distinct from '{"fases": 3, "salidas": 2, "requisitos": 4, "tipos_documento": 2}'::jsonb
     or res -> 'saltado' <> '[]'::jsonb or (res -> 'saltado_hay_mas')::boolean then
    raise exception 'C1: la respuesta no es la esperada: %', res;
  end if;
  if (res ->> 'version')::timestamptz is distinct from pg_temp.cf_version(b) or pg_temp.cf_version(b) <= vb then
    raise exception 'C1: la versión devuelta no es la del destino o no avanzó';
  end if;
  if pg_temp.cf_reglas(b) is distinct from reglas_a then
    raise exception 'C1: las reglas del destino % no son las del origen %', pg_temp.cf_reglas(b), reglas_a;
  end if;
  -- Las fases: las tres activas con sus columnas, sin la jubilada.
  if (select array_agg(nombre || ':' || orden || ':' || es_inicial || ':' || es_final || ':' || activa order by orden) from public.fases where flujo_id = b)
     is distinct from array['CF Compra:10:true:false:true', 'CF Viaje:20:false:false:true', 'CF Entrega:30:false:true:true'] then
    raise exception 'C1: las fases del destino no son las esperadas';
  end if;
  if (select alias_portal || ':' || permite_aduana from public.fases where id = pg_temp.cf_en(b, 'CF Compra')) is distinct from 'Comprado:true'
     or (select descripcion || ':' || color || ':' || demora_dias || ':' || alerta_cada_horas || ':' || nota_obligatoria || ':' || publica_web
         from public.fases where id = pg_temp.cf_en(b, 'CF Viaje')) is distinct from 'CF desc:#123456:5:12:true:true' then
    raise exception 'C1: las columnas de las fases no se copiaron';
  end if;
  -- Salidas entre activas, con sus datos y sus roles; ninguna hacia la jubilada.
  if (select array_agg(d.nombre || '>' || h.nombre || ':' || coalesce(s.accion, '-') || ':' || s.nota_obligatoria order by d.orden)
        from public.fases_transiciones s join public.fases d on d.id = s.de_fase_id join public.fases h on h.id = s.a_fase_id
       where s.flujo_id = b) is distinct from array['CF Compra>CF Viaje:Embarcar:true', 'CF Viaje>CF Entrega:-:false'] then
    raise exception 'C1: las salidas del destino no son las esperadas';
  end if;
  if not exists (select 1 from public.fases_roles where fase_id = pg_temp.cf_en(b, 'CF Compra') and rol_id = r1)
     or (select count(*) from public.fases_roles fr2 join public.fases f on f.id = fr2.fase_id where f.flujo_id = b) <> 1 then
    raise exception 'C1: los roles de las fases no se copiaron';
  end if;
  if not exists (select 1 from public.fases_transiciones_roles sr join public.fases_transiciones s on s.id = sr.transicion_id
                  where s.flujo_id = b and s.de_fase_id = pg_temp.cf_en(b, 'CF Compra') and sr.rol_id = r2) then
    raise exception 'C1: los roles de la salida no se copiaron';
  end if;
  -- Requisitos: sobre las fases nuevas; el de la empresa con su id; el del flujo con el tipo nuevo; la espera a la misma fase de repuestos.
  if (select count(*) from public.fases_requisitos q join public.fases f on f.id = q.fase_id where f.flujo_id = b) <> 4 then
    raise exception 'C1: el destino debía quedar con los cuatro requisitos, sobre sus fases';
  end if;
  if not exists (select 1 from public.fases_requisitos where fase_id = pg_temp.cf_en(b, 'CF Compra') and tipo = 'dato'
                  and clave_dato = 'pagos.umbral_pct' and config = '{"pct": 50}' and orden = 10)
     or not exists (select 1 from public.fases_requisitos where fase_id = pg_temp.cf_en(b, 'CF Compra') and tipo_documento_id = te and bloqueante)
     or not exists (select 1 from public.fases_requisitos where fase_id = pg_temp.cf_en(b, 'CF Entrega') and espera_fase_id = fr and espera_ambito = 'hijos') then
    raise exception 'C1: los requisitos de dato, de documento de la empresa o de espera no se copiaron';
  end if;
  select tipo_documento_id into tf_nuevo from public.fases_requisitos where fase_id = pg_temp.cf_en(b, 'CF Viaje');
  if tf_nuevo = tf or (select flujo_id || ':' || nombre || ':' || activo || ':' || formatos::text || ':' || coalesce(proposito, '-')
                         from public.tipos_documento where id = tf_nuevo)
                      is distinct from b || ':CF Factura del proveedor:true:{application/pdf,image/png}:-'
     or (select formatos::text || ':' || min_archivos from public.fases_requisitos where fase_id = pg_temp.cf_en(b, 'CF Viaje')) is distinct from '{application/pdf}:2' then
    raise exception 'C1: el tipo del flujo no se creó en el destino con los mismos datos';
  end if;
  if (select array_agg(nombre || ':' || activo order by nombre) from public.tipos_documento where flujo_id = b)
     is distinct from array['CF Factura del proveedor:true', 'CF Viejo:false'] then
    raise exception 'C1: los tipos del flujo del destino no son los esperados';
  end if;
  -- El origen, intacto.
  if pg_temp.cf_version(a) is distinct from va
     or (select count(*) from public.fases where flujo_id = a) <> 4
     or (select count(*) from public.fases_transiciones where flujo_id = a) <> 3
     or (select count(*) from public.tipos_documento where flujo_id = a) <> 2
     or (select count(*) from public.fases_requisitos q join public.fases f on f.id = q.fase_id where f.flujo_id = a) <> 4 then
    raise exception 'C1: el origen cambió';
  end if;
  select count(*) into n from public.actividad
   where accion = 'flujo.copiado' and tabla = 'flujos' and registro_id = b::text and actor_id = yo
     and detalle = jsonb_build_object('desde', a, 'fases', 3, 'saltados', 0);
  if n <> 1 then raise exception 'C1: debía quedar una fila flujo.copiado en la actividad y hay %', n; end if;
end $$;
rollback;

-- @test copiar-fases: lo saltado (subasta, espera apagada o jubilada, tipo reusado) se dice y el resto se copia (C2)
begin;
do $$
declare
  yo uuid := pg_temp.cf_persona(array['flujos.configurar']);
  sub uuid := pg_temp.cf_flujo('subasta'); man uuid := pg_temp.cf_flujo('manual');
  a uuid := pg_temp.cf_flujo(); b uuid := pg_temp.cf_flujo(); c uuid := pg_temp.cf_flujo(); d uuid := pg_temp.cf_flujo();
  fr uuid := pg_temp.cf_fase_de_repuestos(); f uuid; tf uuid; td uuid; res jsonb;
begin
  -- Subasta → manual: la fase se copia sin «Es la subasta».
  perform pg_temp.cf_fase(sub, 'CF Compra', 10, '{"es_inicial": true}');
  perform pg_temp.cf_fase(sub, 'CF Remate', 20, '{"es_subasta": true}');
  perform pg_temp.cf_fase(sub, 'CF Entrega', 30, '{"es_final": true}');
  res := pg_temp.cf_bien('C2 subasta', pg_temp.cf_copiar(yo, man, sub));
  if res -> 'saltado' is distinct from '[{"motivo": "subasta", "nombre": "CF Remate"}]'::jsonb
     or (select es_subasta from public.fases where id = pg_temp.cf_en(man, 'CF Remate')) then
    raise exception 'C2: la subasta debía copiarse apagada y decirse: %', res;
  end if;

  -- Una espera con «esperas» apagada en el origen (queda viva así: la regla ya apagada no mira el uso).
  f := pg_temp.cf_fase(a, 'CF Espera', 10, '{"es_inicial": true}');
  insert into public.fases_requisitos (fase_id, tipo, orden, espera_fase_id, espera_ambito) values (f, 'espera', 10, fr, 'hijos');
  set local session_replication_role = replica;
  update public.flujos_reglas set activa = false where flujo_id = a and regla = 'esperas';
  set local session_replication_role = origin;
  res := pg_temp.cf_bien('C2 espera apagada', pg_temp.cf_copiar(yo, b, a));
  if res -> 'saltado' is distinct from '[{"motivo": "espera_apagada", "nombre": "CF Espera"}]'::jsonb
     or res -> 'copiado' ->> 'requisitos' <> '0'
     or exists (select 1 from public.fases_requisitos where fase_id = pg_temp.cf_en(b, 'CF Espera')) then
    raise exception 'C2: la espera con la regla apagada debía saltarse: %', res;
  end if;

  -- Una espera hacia una fase de repuestos jubilada después.
  f := pg_temp.cf_fase(c, 'CF Espera', 10, '{"es_inicial": true}');
  insert into public.fases_requisitos (fase_id, tipo, orden, espera_fase_id, espera_ambito) values (f, 'espera', 10, fr, 'hijos');
  update public.fases set activa = false where id = fr;
  -- Y un tipo del flujo con el nombre de uno que el destino ya tenía (otras mayúsculas, una tilde y espacios de más: la misma clave), con formatos
  -- que no caben en el de destino.
  tf := pg_temp.cf_tipo(c, 'CF Factura', true, '{application/pdf,image/png}');
  td := pg_temp.cf_tipo(d, 'cf  fáctura ', true, '{image/png}');
  insert into public.fases_requisitos (fase_id, tipo, orden, tipo_documento_id, formatos) values (f, 'documento', 20, tf, '{application/pdf}');
  res := pg_temp.cf_bien('C2 jubilada y reusado', pg_temp.cf_copiar(yo, d, c));
  if res -> 'saltado' is distinct from
       '[{"motivo": "tipo_documento_reusado", "nombre": "CF Factura"}, {"motivo": "espera_jubilada", "nombre": "CF Espera"}]'::jsonb
     or res -> 'copiado' is distinct from '{"fases": 1, "salidas": 0, "requisitos": 1, "tipos_documento": 0}'::jsonb then
    raise exception 'C2: la espera jubilada y el tipo reusado debían decirse: %', res;
  end if;
  if (select tipo_documento_id || ':' || coalesce(formatos::text, 'nulo') from public.fases_requisitos where fase_id = pg_temp.cf_en(d, 'CF Espera'))
     is distinct from td || ':nulo'
     or (select count(*) from public.tipos_documento where flujo_id = d) <> 1 then
    raise exception 'C2: el requisito debía usar el tipo que ya estaba, sin acotar sus formatos';
  end if;
end $$;
rollback;

-- @test copiar-fases: quien no configura flujos, quien configura un solo flujo y quien sólo configura repuestos reciben 42501 sin escribir (C3)
begin;
do $$
declare
  -- Sin cuentas previas (SOLO= sin humo.sql) la primera queda dueña: se crea una antes de las que se prueban.
  primera uuid := pg_temp.cf_persona(array['vehiculos.ver']);
  a uuid := pg_temp.cf_flujo(); b uuid := pg_temp.cf_flujo(); vb timestamptz; quien uuid; i int := 0; r jsonb;
begin
  perform pg_temp.cf_fase(a, 'CF Compra', 10, '{"es_inicial": true}');
  vb := pg_temp.cf_version(b);
  foreach quien in array array[
    pg_temp.cf_persona(array['vehiculos.ver']),
    pg_temp.cf_persona(array['flujos.configurar@' || pg_temp.cf_origen_de(b)]),
    pg_temp.cf_persona(array['flujos.configurar@' || pg_temp.cf_origen_de(a)]),
    pg_temp.cf_persona(array['repuestos.configurar'])]
  loop
    i := i + 1;
    r := pg_temp.cf_copiar(quien, b, a);
    if r ->> 'error' is distinct from '42501' then
      raise exception 'C3 (persona %): debía dar 42501 y dio %', i, r;
    end if;
  end loop;
  if pg_temp.cf_version(b) is distinct from vb or exists (select 1 from public.fases where flujo_id = b) then
    raise exception 'C3: sin permiso se escribió o se movió la versión';
  end if;
end $$;
rollback;

-- @test copiar-fases: destino con fases, origen vacío, el mismo flujo, repuestos, inexistentes, versión vieja y tope de tipos (C4)
begin;
do $$
declare
  yo uuid := pg_temp.cf_persona(array['flujos.configurar', 'repuestos.configurar']);
  a uuid := pg_temp.cf_flujo(); b uuid := pg_temp.cf_flujo(); conjubilada uuid := pg_temp.cf_flujo(); vacio uuid := pg_temp.cf_flujo();
  tope uuid := pg_temp.cf_flujo(); rep uuid := (select id from public.flujos where ambito = 'repuestos');
begin
  perform pg_temp.cf_fase(a, 'CF Compra', 10, '{"es_inicial": true}');
  perform pg_temp.cf_fase(conjubilada, 'CF Vieja', 10, '{"activa": false}');
  perform pg_temp.cf_falla('C4 destino con una jubilada', pg_temp.cf_copiar(yo, conjubilada, a), '23514', 'destino');
  perform pg_temp.cf_falla('C4 origen sin fases activas', pg_temp.cf_copiar(yo, b, conjubilada), '22023', 'desde');
  perform pg_temp.cf_falla('C4 origen vacío', pg_temp.cf_copiar(yo, b, vacio), '22023', 'desde');
  perform pg_temp.cf_falla('C4 el mismo flujo', pg_temp.cf_copiar(yo, b, b), '22023', 'desde');
  perform pg_temp.cf_falla('C4 repuestos como origen', pg_temp.cf_copiar(yo, b, rep), '22023', 'desde');
  perform pg_temp.cf_falla('C4 repuestos como destino', pg_temp.cf_copiar(yo, rep, a), '22023', 'destino');
  perform pg_temp.cf_falla('C4 origen inexistente', pg_temp.cf_copiar(yo, b, gen_random_uuid()), '22023', 'desde');
  perform pg_temp.cf_falla('C4 versión vieja', pg_temp.cf_copiar(yo, b, a, pg_temp.cf_version(b) - interval '1 second'), 'PT409', null);
  perform pg_temp.cf_falla('C4 destino inexistente', pg_temp.cf_copiar(yo, gen_random_uuid(), a), 'PT409', null);
  -- El destino ya tiene el tope de tipos propios: el tipo del origen no cabe.
  insert into public.tipos_documento (flujo_id, nombre, orden)
  select tope, 'CF tope ' || i, i from generate_series(1, public._tipos_documento_tope()) i;
  perform pg_temp.cf_tipo(a, 'CF Factura nueva');
  perform pg_temp.cf_falla('C4 tope de tipos', pg_temp.cf_copiar(yo, tope, a), '22023', 'tipos_documento');
  if exists (select 1 from public.fases where flujo_id in (b, tope, rep) and nombre = 'CF Compra') then
    raise exception 'C4: un rechazo dejó algo escrito';
  end if;
end $$;
rollback;

-- @test copiar-fases: authenticated ejecuta la RPC y anon no (C5)
begin;
do $$
begin
  if not has_function_privilege('authenticated', 'public.flujo_copiar_fases(uuid, timestamptz, uuid)', 'execute') then
    raise exception 'C5: authenticated debía ejecutar flujo_copiar_fases';
  end if;
  if has_function_privilege('anon', 'public.flujo_copiar_fases(uuid, timestamptz, uuid)', 'execute') then
    raise exception 'C5: anon no debía ejecutar flujo_copiar_fases';
  end if;
end $$;
rollback;

-- @test copiar-fases: la copia lleva la posición de cada fase en el diagrama, y la que no tenía sigue sin ella (C6)
begin;
do $$
declare
  primera uuid := pg_temp.cf_persona(array['vehiculos.ver']);
  a uuid := pg_temp.cf_flujo(); b uuid := pg_temp.cf_flujo();
  quien uuid := pg_temp.cf_persona(array['flujos.configurar@' || pg_temp.cf_origen_de(a), 'flujos.configurar@' || pg_temp.cf_origen_de(b)]);
  f1 uuid := pg_temp.cf_fase(a, 'CF Con lugar', 10, '{"es_inicial": true}');
  f2 uuid := pg_temp.cf_fase(a, 'CF Sin lugar', 20);
begin
  update public.fases set posicion_x = 12.5, posicion_y = -3 where id = f1;
  perform pg_temp.cf_bien('C6', pg_temp.cf_copiar(quien, b, a));
  if (select posicion_x::text || ',' || posicion_y::text from public.fases where id = pg_temp.cf_en(b, 'CF Con lugar')) is distinct from '12.50,-3.00'
     or (select posicion_x from public.fases where id = pg_temp.cf_en(b, 'CF Sin lugar')) is not null then
    raise exception 'C6: la copia no llevó las posiciones';
  end if;
end $$;
rollback;
