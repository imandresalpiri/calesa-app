-- La clave `artes.empresa.gestionar`: su fila del catálogo (global, sin alcance, con los puntos donde se exige) y que el dueño la tiene. Corre en PGlite
-- (`pnpm db:probar`, después de la lista fija, con el seed aplicado); cada bloque revierte.

-- @test artes: la clave artes.empresa.gestionar es global, sin alcance, del módulo artes, y nombra dónde se exige
begin;
do $$
declare v_modulo text; v_por_origen boolean; v_con_alcance boolean; v_aplicado text; v_falta text;
begin
  select modulo, por_origen, con_alcance, aplicado_en into v_modulo, v_por_origen, v_con_alcance, v_aplicado
    from public.permisos where clave = 'artes.empresa.gestionar';
  if not found then raise exception 'falta la clave artes.empresa.gestionar'; end if;
  if v_modulo is distinct from 'artes' or v_por_origen is not false or v_con_alcance is not false then
    raise exception 'la clave quedó del módulo % (por origen %, con alcance %)', v_modulo, v_por_origen, v_con_alcance;
  end if;
  if v_aplicado not like '%artes_plantilla_visibilidad%' then raise exception 'aplicado_en no nombra artes_plantilla_visibilidad: %', v_aplicado; end if;
  -- Cada nombre de aplicado_en es una función que existe.
  select string_agg(x, ', ') into v_falta from unnest(string_to_array(v_aplicado, ', ')) x
   where not exists (select 1 from pg_proc p join pg_namespace s on s.oid = p.pronamespace where s.nspname = 'public' and p.proname = x);
  if v_falta is not null then raise exception 'aplicado_en nombra funciones que no existen: %', v_falta; end if;
end $$;
rollback;

-- @test artes: el dueño tiene artes.empresa.gestionar para todo origen, y con ella hace de la empresa una plantilla de arte
begin;
do $$
declare
  v_quien constant uuid := '00000000-0000-4000-8000-000000a70e01';
  v_p constant uuid := '00000000-0000-4000-8000-000000a70c01';
  v_dueno uuid; v_o uuid; v timestamptz;
begin
  select id into v_dueno from public.roles where clave = 'dueno';
  if v_dueno is null then raise exception 'el seed no dejó el rol dueno'; end if;
  if not exists (select 1 from public.roles_permisos
                  where rol_id = v_dueno and permiso_clave = 'artes.empresa.gestionar' and origen_id is null and alcance = 'todos') then
    raise exception 'el dueño no tiene artes.empresa.gestionar para todo origen';
  end if;

  insert into auth.users (id, email, raw_app_meta_data) values (v_quien, 'artes.dueno@ejemplo.com', '{"invitado": true}');
  update public.perfiles set invitacion_aceptada_en = now() where id = v_quien;
  delete from public.usuarios_roles where usuario_id = v_quien;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_quien, v_dueno, true);
  insert into public.origenes (clave, nombre) values ('apm_o1', 'APM uno') returning id into v_o;
  perform set_config('request.jwt.claim.sub', v_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  v := (public.artes_plantilla_crear(v_p, 'Del dueño', 'cuadrado', 1080, 1080, v_o, '{"version": 1, "paginas": [{"capas": []}]}') ->> 'actualizado_en')::timestamptz;
  perform public.artes_plantilla_visibilidad(v_p, v, 'empresa');
  if (select visibilidad from public.artes_plantillas where id = v_p) is distinct from 'empresa' then raise exception 'el dueño no la hizo de la empresa'; end if;
  reset role;
end $$;
rollback;
