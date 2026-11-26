-- Embarques y contenedores como entidades: el embarque es el booking de un origen, dueño de la naviera, los puertos y las fechas; el contenedor
-- (número, tipo y sello) va en un embarque o todavía sin él. El transporte de cada unidad apunta a su contenedor o a su embarque (nunca a los dos)
-- y lo que es del embarque se lee del embarque. Esta migración crea las tablas, la vista que resuelve lo que ve la persona, el estado calculado,
-- y lleva a las entidades los textos de hoy (`transportes.booking` y `transportes.contenedor`, que se borran después de pasar los lectores).

-- ---------------------------------------------------------------------------------------------------------------------------------------------
-- 1. Tipos de contenedor: catálogo fijo. Un tipo nuevo entra con su migración, como un permiso; no hay pantalla para editarlo.
-- ---------------------------------------------------------------------------------------------------------------------------------------------

create table public.tipos_contenedor (
  clave text primary key check (clave ~ '^[A-Z0-9]{1,8}$'),
  nombre text not null check (char_length(nombre) between 1 and 40),
  orden smallint not null default 0,
  activo boolean not null default true
);
comment on table public.tipos_contenedor is 'Tipos de contenedor (20, 40, 40HC…): catálogo fijo, se escribe sólo por migración. Lo lee toda persona activa.';
alter table public.tipos_contenedor enable row level security;
revoke all on table public.tipos_contenedor from anon, authenticated;
grant select on table public.tipos_contenedor to authenticated;
grant all on table public.tipos_contenedor to service_role;
create policy "tipos_contenedor: leer" on public.tipos_contenedor for select to authenticated using (true);

insert into public.tipos_contenedor (clave, nombre, orden) values
  ('20', '20′ estándar', 10),
  ('40', '40′ estándar', 20),
  ('40HC', '40′ High Cube', 30),
  ('45HC', '45′ High Cube', 40),
  ('20RF', '20′ refrigerado', 50),
  ('40RF', '40′ refrigerado', 60)
on conflict (clave) do update set nombre = excluded.nombre, orden = excluded.orden;

-- ---------------------------------------------------------------------------------------------------------------------------------------------
-- 2. Embarques y contenedores. Origen nulo = de repuestos (sólo ítems). La clave se guarda normalizada (`_transporte_cambios`: sin espacios, en
--    mayúsculas) y es única por origen. Las fechas cruzadas (ETA o arribo antes del zarpe) se agregan después del movimiento de datos.
-- ---------------------------------------------------------------------------------------------------------------------------------------------

create table public.embarques (
  id uuid primary key default gen_random_uuid(),
  origen_id uuid references public.origenes (id) on delete restrict,
  booking text not null check (booking ~ '^[A-Z0-9./-]{1,40}$'),
  naviera_id uuid references public.navieras (id) on delete set null,
  puerto_origen_id uuid references public.puertos (id) on delete set null,
  puerto_destino_id uuid references public.puertos (id) on delete set null,
  zarpe_estimado_el date,
  zarpe_el date,
  eta_el date,
  arribo_el date,
  notas text check (char_length(notas) <= 2000),
  creado_en timestamptz not null default now(),
  creado_por uuid references public.perfiles (id) on delete set null,
  actualizado_en timestamptz not null default now(),
  actualizado_por uuid references public.perfiles (id) on delete set null
);
comment on table public.embarques is
  'Un embarque: el booking de un origen (nulo = de repuestos), dueño de la naviera, los puertos y las fechas de sus unidades (directas o por sus contenedores). Se escribe sólo por RPC (embarque_crear, embarque_guardar, transporte_guardar, transporte_grupo_aplicar, transporte_asignar, transporte_quitar); su estado se calcula (embarque_estado).';
comment on column public.embarques.zarpe_el is 'El zarpe (planificado o real): lo lee «Salen hoy» y la clave de requisito transporte.zarpe.';
comment on column public.embarques.zarpe_estimado_el is 'El zarpe estimado al reservar; no lo lee ninguna regla.';

create table public.contenedores (
  id uuid primary key default gen_random_uuid(),
  origen_id uuid references public.origenes (id) on delete restrict,
  numero text not null check (numero ~ '^[A-Z0-9./-]{1,40}$'),
  tipo text references public.tipos_contenedor (clave),
  sello text check (char_length(sello) between 1 and 40),
  embarque_id uuid references public.embarques (id) on delete restrict,
  notas text check (char_length(notas) <= 2000),
  creado_en timestamptz not null default now(),
  creado_por uuid references public.perfiles (id) on delete set null,
  actualizado_en timestamptz not null default now(),
  actualizado_por uuid references public.perfiles (id) on delete set null
);
comment on table public.contenedores is
  'Un contenedor de un origen (nulo = de repuestos): número, tipo y sello, en un embarque de su mismo origen o todavía sin él. Se escribe sólo por RPC (contenedor_crear, contenedor_guardar, transporte_guardar, transporte_grupo_aplicar, transporte_asignar, transporte_quitar).';

-- La sonda de transporte_grupos (min(booking) > x), la búsqueda exacta por (clave, origen) y la unicidad, con un solo índice.
create unique index embarques_booking_origen_key on public.embarques (booking, origen_id) nulls not distinct;
-- La FK y la policy por origen; la lista por origen de la pantalla de embarques (por ETA).
create index embarques_origen_id_idx on public.embarques (origen_id, eta_el);
-- «Llegadas esperadas» (_bandeja_dia_llegadas): los embarques sin arribo con ETA, hacia atrás desde hoy.
create index embarques_llegadas_idx on public.embarques (eta_el, id) where arribo_el is null and eta_el is not null;
-- «Salen hoy» (_bandeja_dia_salidas).
create index embarques_salidas_idx on public.embarques (zarpe_el, id) where zarpe_el is not null;
-- Las FK; _naviera_uso y _puerto_uso.
create index embarques_naviera_id_idx on public.embarques (naviera_id);
create index embarques_puerto_origen_id_idx on public.embarques (puerto_origen_id);
create index embarques_puerto_destino_id_idx on public.embarques (puerto_destino_id);
create index embarques_creado_por_idx on public.embarques (creado_por);
create index embarques_actualizado_por_idx on public.embarques (actualizado_por);

-- La sonda de transporte_grupos por contenedor, la búsqueda exacta y la unicidad.
create unique index contenedores_numero_origen_key on public.contenedores (numero, origen_id) nulls not distinct;
-- Los contenedores de un embarque (estado, bandeja, grupos, invariante) y el restrict de su FK: `embarque_id = $1` implica el predicado.
create index contenedores_embarque_idx on public.contenedores (embarque_id) where embarque_id is not null;
-- La policy por origen.
create index contenedores_origen_id_idx on public.contenedores (origen_id);
create index contenedores_tipo_idx on public.contenedores (tipo);
create index contenedores_creado_por_idx on public.contenedores (creado_por);
create index contenedores_actualizado_por_idx on public.contenedores (actualizado_por);

alter table public.embarques enable row level security;
alter table public.contenedores enable row level security;
revoke all on table public.embarques from anon, authenticated;
revoke all on table public.contenedores from anon, authenticated;
grant select on table public.embarques to authenticated;
grant select on table public.contenedores to authenticated;
grant all on table public.embarques to service_role;
grant all on table public.contenedores to service_role;
-- Sin policies de escritura: sólo por RPC security definer.
create policy "embarques: leer" on public.embarques for select to authenticated
  using (origen_id = any ((select public.origenes_con_alcance('logistica.ver', 'propios'))::uuid[])
         or (origen_id is null and (select public.tiene_permiso('repuestos.ver'))));
create policy "contenedores: leer" on public.contenedores for select to authenticated
  using (origen_id = any ((select public.origenes_con_alcance('logistica.ver', 'propios'))::uuid[])
         or (origen_id is null and (select public.tiene_permiso('repuestos.ver'))));

create trigger trg_actualizado_en before update on public.embarques for each row execute function public.set_actualizado_en();
create trigger trg_actualizado_en before update on public.contenedores for each row execute function public.set_actualizado_en();

-- ---------------------------------------------------------------------------------------------------------------------------------------------
-- 3. El transporte apunta a su contenedor o a su embarque (uno o ninguno). El embarque de una unidad es coalesce(t.embarque_id, c.embarque_id).
--    Con embarque, la unidad no guarda naviera, puertos ni fechas propios: los lee del embarque. Los check nacen `not valid` y se validan
--    después del movimiento.
-- ---------------------------------------------------------------------------------------------------------------------------------------------

alter table public.transportes
  add column contenedor_id uuid references public.contenedores (id) on delete restrict,
  add column embarque_id uuid references public.embarques (id) on delete restrict;
alter table public.transportes add constraint transportes_contenedor_o_embarque
  check (num_nonnulls(contenedor_id, embarque_id) <= 1) not valid;
alter table public.transportes add constraint transportes_embarque_sin_propios
  check (embarque_id is null or (naviera_id is null and puerto_origen_id is null and puerto_destino_id is null
                                 and zarpe_el is null and eta_el is null and arribo_el is null)) not valid;
comment on column public.transportes.contenedor_id is 'El contenedor de la unidad (excluye embarque_id). Su embarque, si tiene, es el de la unidad.';
comment on column public.transportes.embarque_id is 'El embarque de una unidad suelta, sin contenedor (excluye contenedor_id). Con embarque, naviera, puertos y fechas propios van nulos.';

-- Las unidades de un embarque (directas) y las de un contenedor; también el restrict de sus FK (`x = $1` implica `x is not null`).
create index transportes_embarque_idx on public.transportes (embarque_id, id) where embarque_id is not null;
create index transportes_contenedor_id_idx on public.transportes (contenedor_id, id) where contenedor_id is not null;

-- ---------------------------------------------------------------------------------------------------------------------------------------------
-- 4. Lo que ve la persona, en un solo lugar. El embarque manda: con embarque, naviera, puertos y fechas son los suyos; sin él, los propios.
--    Sólo la leen las funciones security definer (sin grant para authenticated): la app lee por RPC.
-- ---------------------------------------------------------------------------------------------------------------------------------------------

create view public.transportes_con_embarque with (security_invoker = true) as
select t.id, t.vehiculo_id, t.repuesto_id, t.sigue_al_vehiculo, t.contenedor_id,
       e.id as embarque_id,
       c.numero as contenedor,
       e.booking,
       case when e.id is null then t.naviera_id else e.naviera_id end as naviera_id,
       case when e.id is null then t.puerto_origen_id else e.puerto_origen_id end as puerto_origen_id,
       case when e.id is null then t.puerto_destino_id else e.puerto_destino_id end as puerto_destino_id,
       case when e.id is null then t.zarpe_el else e.zarpe_el end as zarpe_el,
       case when e.id is null then t.eta_el else e.eta_el end as eta_el,
       case when e.id is null then t.arribo_el else e.arribo_el end as arribo_el,
       t.notas, t.creado_en, t.actualizado_en, t.actualizado_por,
       c.actualizado_en as contenedor_actualizado_en,
       e.actualizado_en as embarque_actualizado_en,
       c.origen_id as contenedor_origen_id,
       e.origen_id as embarque_origen_id
  from public.transportes t
  left join public.contenedores c on c.id = t.contenedor_id                                     -- contenedores_pkey
  left join public.embarques e on e.id = coalesce(t.embarque_id, c.embarque_id);                -- embarques_pkey
comment on view public.transportes_con_embarque is
  'El transporte de cada unidad resuelto: el contenedor (número), el booking y el embarque, y naviera, puertos y fechas del embarque si tiene (si no, los propios). Sólo para funciones security definer.';
revoke all on table public.transportes_con_embarque from anon, authenticated;
grant select on table public.transportes_con_embarque to service_role;

-- Lo que es del embarque para un contenedor o un embarque dados (lo que pone la vista), para los triggers que combinan con OLD/NEW.
create or replace function public._embarque_valores(p_contenedor uuid, p_embarque uuid,
  out embarque_id uuid, out booking text, out contenedor text, out naviera_id uuid, out puerto_origen_id uuid, out puerto_destino_id uuid,
  out zarpe_el date, out eta_el date, out arribo_el date)
  language plpgsql stable security definer
  set search_path = ''
as $$
declare v_emb uuid := p_embarque;
begin
  if p_contenedor is not null then
    select c.numero, coalesce(p_embarque, c.embarque_id) into contenedor, v_emb from public.contenedores c where c.id = p_contenedor;  -- contenedores_pkey
  end if;
  if v_emb is not null then
    select e.id, e.booking, e.naviera_id, e.puerto_origen_id, e.puerto_destino_id, e.zarpe_el, e.eta_el, e.arribo_el
      into embarque_id, booking, naviera_id, puerto_origen_id, puerto_destino_id, zarpe_el, eta_el, arribo_el
      from public.embarques e where e.id = v_emb;                                                  -- embarques_pkey
  end if;
end;
$$;
comment on function public._embarque_valores(uuid, uuid) is
  'Lo del embarque para un contenedor (y su embarque) o un embarque: lo que la vista transportes_con_embarque pone en una unidad con ese contenedor o ese embarque. Sin embarque, los datos van nulos y valen los propios.';
revoke all on function public._embarque_valores(uuid, uuid) from public, anon, authenticated;

-- Los datos de transporte de una unidad, con o sin embarque: el argumento de _transporte_cambios y _transporte_validar.
create type public.datos_de_transporte as (
  vehiculo_id uuid,
  repuesto_id uuid,
  sigue_al_vehiculo boolean,
  contenedor text,
  booking text,
  naviera_id uuid,
  puerto_origen_id uuid,
  puerto_destino_id uuid,
  zarpe_el date,
  eta_el date,
  arribo_el date,
  notas text
);
comment on type public.datos_de_transporte is 'El transporte de una unidad como lo ve la persona (transportes_con_embarque): lo que validan _transporte_cambios y _transporte_validar.';

-- ---------------------------------------------------------------------------------------------------------------------------------------------
-- 5. El estado del embarque se calcula (espejo: entities/transporte/estado.ts). «Entregado» manda: hay unidades y todas están en una fase final.
--    Si no, «Llegó» con arribo; si no, «En tránsito» con zarpe hasta hoy; si no, «Armándose». Un contenedor sin embarque está «Sin embarque».
-- ---------------------------------------------------------------------------------------------------------------------------------------------

create or replace function public._estado_del_embarque(p_zarpe date, p_arribo date, p_hay_unidades boolean, p_todas_finales boolean, p_hoy date)
  returns text
  language sql immutable
  set search_path = ''
as $$
  select case
    when coalesce(p_hay_unidades, false) and coalesce(p_todas_finales, false) then 'entregado'
    when p_arribo is not null then 'llego'
    when p_zarpe is not null and p_zarpe <= p_hoy then 'en_transito'
    else 'armandose'
  end;
$$;
comment on function public._estado_del_embarque(date, date, boolean, boolean, date) is
  'La regla del estado del embarque: entregado (hay unidades y todas en una fase final), llego (con arribo), en_transito (zarpe hasta hoy) o armandose.';
revoke all on function public._estado_del_embarque(date, date, boolean, boolean, date) from public, anon, authenticated;

create or replace function public.embarque_estado(p_embarque uuid) returns text
  language plpgsql stable security definer
  set search_path = ''
as $$
declare e public.embarques; v_hay boolean; v_no_final boolean;
begin
  select * into e from public.embarques x where x.id = p_embarque;                                 -- embarques_pkey
  if e.id is null then
    return null;
  end if;
  -- Las unidades vivas, directas (transportes_embarque_idx) o por sus contenedores (contenedores_embarque_idx → transportes_contenedor_id_idx).
  select exists (
           select 1 from public.transportes t
            where t.embarque_id = e.id
              and (exists (select 1 from public.vehiculos v where v.id = t.vehiculo_id and v.eliminado_en is null)
                   or exists (select 1 from public.repuestos_items i where i.id = t.repuesto_id and i.eliminado_en is null)))
         or exists (
           select 1 from public.contenedores c join public.transportes t on t.contenedor_id = c.id
            where c.embarque_id = e.id
              and (exists (select 1 from public.vehiculos v where v.id = t.vehiculo_id and v.eliminado_en is null)
                   or exists (select 1 from public.repuestos_items i where i.id = t.repuesto_id and i.eliminado_en is null)))
    into v_hay;
  if v_hay then
    select exists (
             select 1 from public.transportes t
               left join public.vehiculos v on v.id = t.vehiculo_id and v.eliminado_en is null
               left join public.repuestos_items i on i.id = t.repuesto_id and i.eliminado_en is null
               left join public.fases f on f.id = coalesce(v.fase_id, i.fase_id)
              where t.embarque_id = e.id and (v.id is not null or i.id is not null) and not coalesce(f.es_final, false))
           or exists (
             select 1 from public.contenedores c join public.transportes t on t.contenedor_id = c.id
               left join public.vehiculos v on v.id = t.vehiculo_id and v.eliminado_en is null
               left join public.repuestos_items i on i.id = t.repuesto_id and i.eliminado_en is null
               left join public.fases f on f.id = coalesce(v.fase_id, i.fase_id)
              where c.embarque_id = e.id and (v.id is not null or i.id is not null) and not coalesce(f.es_final, false))
      into v_no_final;
  end if;
  return public._estado_del_embarque(e.zarpe_el, e.arribo_el, v_hay, not coalesce(v_no_final, true),
                                     coalesce(public._bandeja_dia_hoy(), current_date));
end;
$$;
comment on function public.embarque_estado(uuid) is
  'El estado calculado de un embarque (_estado_del_embarque) con las fases de todas sus unidades vivas, directas o en sus contenedores, y el día de la empresa. Nulo si no existe.';
revoke all on function public.embarque_estado(uuid) from public, anon, authenticated;
grant execute on function public.embarque_estado(uuid) to service_role;

create or replace function public.contenedor_estado(p_contenedor uuid) returns text
  language plpgsql stable security definer
  set search_path = ''
as $$
declare c public.contenedores; e public.embarques; v_hay boolean; v_no_final boolean;
begin
  select * into c from public.contenedores x where x.id = p_contenedor;                            -- contenedores_pkey
  if c.id is null then
    return null;
  end if;
  if c.embarque_id is null then
    return 'sin_embarque';
  end if;
  select * into e from public.embarques x where x.id = c.embarque_id;                              -- embarques_pkey
  -- Sus propias unidades vivas, hasta 201 (transportes_contenedor_id_idx).
  select count(*) > 0, coalesce(bool_or(not coalesce(f.es_final, false)), false) into v_hay, v_no_final
    from (select t.vehiculo_id, t.repuesto_id from public.transportes t where t.contenedor_id = c.id order by t.id limit 201) t
    left join public.vehiculos v on v.id = t.vehiculo_id and v.eliminado_en is null
    left join public.repuestos_items i on i.id = t.repuesto_id and i.eliminado_en is null
    left join public.fases f on f.id = coalesce(v.fase_id, i.fase_id)
   where v.id is not null or i.id is not null;
  return public._estado_del_embarque(e.zarpe_el, e.arribo_el, v_hay, not v_no_final, coalesce(public._bandeja_dia_hoy(), current_date));
end;
$$;
comment on function public.contenedor_estado(uuid) is
  'El estado calculado de un contenedor: sin_embarque si no tiene; si no, la regla del embarque con las fechas de su embarque y las fases de sus propias unidades vivas (hasta 201).';
revoke all on function public.contenedor_estado(uuid) from public, anon, authenticated;
grant execute on function public.contenedor_estado(uuid) to service_role;

-- ---------------------------------------------------------------------------------------------------------------------------------------------
-- 6. El invariante, al confirmar (diferido: el orden de las escrituras dentro de una RPC no importa):
--    - una unidad en un contenedor con embarque no guarda naviera, puertos ni fechas propios;
--    - un vehículo va en un contenedor o un embarque de su origen (un ítem, en cualquiera); un contenedor, en un embarque de su origen.
-- ---------------------------------------------------------------------------------------------------------------------------------------------

create or replace function public.transporte_invariante() returns trigger
  language plpgsql security definer
  set search_path = ''
as $$
declare v_c public.contenedores; v_origen uuid; v_destino uuid; v_hay boolean;
begin
  if tg_table_name = 'transportes' then
    -- La fila pudo cambiar o borrarse antes de confirmar: se mira la vigente.
    select * into v_c from public.contenedores x where x.id = (select t.contenedor_id from public.transportes t where t.id = new.id);
    if v_c.id is not null and v_c.embarque_id is not null
       and exists (select 1 from public.transportes t
                    where t.id = new.id
                      and num_nonnulls(t.naviera_id, t.puerto_origen_id, t.puerto_destino_id, t.zarpe_el, t.eta_el, t.arribo_el) > 0) then
      raise exception 'Una unidad en un contenedor con embarque no guarda naviera, puertos ni fechas propios.' using errcode = '23514', hint = 'contenedor';
    end if;
    select v.origen_id into v_origen from public.transportes t join public.vehiculos v on v.id = t.vehiculo_id where t.id = new.id;
    if v_origen is not null then
      select coalesce(c.origen_id, e.origen_id), (c.id is not null or e.id is not null) into v_destino, v_hay
        from public.transportes t
        left join public.contenedores c on c.id = t.contenedor_id
        left join public.embarques e on e.id = t.embarque_id
       where t.id = new.id;
      if v_hay and v_destino is distinct from v_origen then
        raise exception 'Un vehículo va en un contenedor o un embarque de su origen.' using errcode = '22023', hint = 'origen';
      end if;
    end if;
  else
    select * into v_c from public.contenedores x where x.id = new.id;
    if v_c.embarque_id is not null then
      if not exists (select 1 from public.embarques e where e.id = v_c.embarque_id and e.origen_id is not distinct from v_c.origen_id) then
        raise exception 'Ese embarque es de otro origen.' using errcode = '22023', hint = 'embarque_id';
      end if;
      if exists (select 1 from public.transportes t                                                  -- transportes_contenedor_id_idx
                  where t.contenedor_id = v_c.id
                    and num_nonnulls(t.naviera_id, t.puerto_origen_id, t.puerto_destino_id, t.zarpe_el, t.eta_el, t.arribo_el) > 0) then
        raise exception 'Una unidad en un contenedor con embarque no guarda naviera, puertos ni fechas propios.' using errcode = '23514', hint = 'contenedor';
      end if;
    end if;
  end if;
  return null;
end;
$$;
comment on function public.transporte_invariante() is
  'Trigger de constraint diferido: con embarque (por el contenedor), la unidad no guarda naviera, puertos ni fechas propios; un vehículo va en un contenedor o embarque de su origen; un contenedor, en un embarque de su origen.';
revoke all on function public.transporte_invariante() from public, anon, authenticated;

create constraint trigger trg_transporte_invariante
  after insert or update of contenedor_id, embarque_id, naviera_id, puerto_origen_id, puerto_destino_id, zarpe_el, eta_el, arribo_el
  on public.transportes deferrable initially deferred
  for each row execute function public.transporte_invariante();
create constraint trigger trg_contenedor_invariante
  after insert or update of embarque_id, origen_id
  on public.contenedores deferrable initially deferred
  for each row execute function public.transporte_invariante();

-- ---------------------------------------------------------------------------------------------------------------------------------------------
-- 7. La actividad: embarques y contenedores son entidades, con el espejo de su policy y su título.
-- ---------------------------------------------------------------------------------------------------------------------------------------------

create or replace function public._actividad_recorte(p_tabla text) returns text
  language sql immutable
  set search_path = ''
as $$
  select case
    when p_tabla = 'leads' then 'lead'
    when p_tabla in ('vehiculos', 'cotizaciones', 'comprobantes', 'declaraciones_aduana', 'documentos', 'gastos', 'pagos', 'transportes',
                     'embarques', 'contenedores', 'repuestos_compras', 'repuestos_items', 'formulas', 'formulas_del_origen') then 'entidad'
    when p_tabla in ('ajustes_empresa', 'ajustes_web', 'ajustes_leads', 'categorias', 'cola_web_asesores', 'fases', 'fases_requisitos',
                     'fases_transiciones', 'integraciones', 'leads_campos', 'origenes', 'origenes_campos', 'origenes_lead',
                     'plantillas_tarjeta', 'roles_permisos', 'tipos_cambio', 'tipos_lead', 'tipos_seguimiento', 'usuarios_roles') then 'configuracion'
  end;
$$;

create or replace function public._actividad_puede_ver_fila(p_tabla text, p_registro text, p_fila jsonb) returns boolean
  language plpgsql stable security definer
  set search_path = ''
as $$
declare
  v_id uuid;
  v_fila jsonb := p_fila;
begin
  if p_registro is null or p_registro !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  v_id := p_registro::uuid;
  if v_fila is null and p_tabla in ('comprobantes', 'documentos', 'formulas', 'formulas_del_origen', 'gastos', 'pagos', 'transportes',
                                    'embarques', 'contenedores') then
    -- Cada una por su PK.
    v_fila := case p_tabla
      when 'comprobantes' then (select to_jsonb(t) from public.comprobantes t where t.id = v_id)
      when 'documentos' then (select to_jsonb(t) from public.documentos t where t.id = v_id)
      when 'formulas' then (select to_jsonb(t) from public.formulas t where t.id = v_id)
      when 'formulas_del_origen' then (select to_jsonb(t) from public.formulas_del_origen t where t.id = v_id)
      when 'gastos' then (select to_jsonb(t) from public.gastos t where t.id = v_id)
      when 'pagos' then (select to_jsonb(t) from public.pagos t where t.id = v_id)
      when 'transportes' then (select to_jsonb(t) from public.transportes t where t.id = v_id)
      when 'embarques' then (select to_jsonb(t) from public.embarques t where t.id = v_id)
      when 'contenedores' then (select to_jsonb(t) from public.contenedores t where t.id = v_id)
    end;
    if v_fila is null then
      return false;
    end if;
  end if;
  return coalesce(case p_tabla
    -- policy «vehiculos: leer» / «cotizaciones: leer»: la fila propia, por su id.
    when 'vehiculos' then public.puede_vehiculo(v_id, 'vehiculos.ver')
    when 'cotizaciones' then public.puede_cotizacion(v_id, 'cotizaciones.ver')
    when 'comprobantes' then public.puede_cotizacion((v_fila ->> 'cotizacion_id')::uuid, 'cotizaciones.ver')
    when 'documentos' then public.puede_unidad((v_fila ->> 'vehiculo_id')::uuid, (v_fila ->> 'repuesto_id')::uuid, 'logistica.ver', 'repuestos.ver')
    when 'gastos' then public.puede_unidad((v_fila ->> 'vehiculo_id')::uuid, (v_fila ->> 'repuesto_id')::uuid, 'logistica.gastos.ver', 'repuestos.costos.ver')
    when 'transportes' then public.puede_unidad((v_fila ->> 'vehiculo_id')::uuid, (v_fila ->> 'repuesto_id')::uuid, 'logistica.ver', 'repuestos.ver')
    -- policies «embarques: leer» y «contenedores: leer»: logistica.ver en su origen; sin origen, repuestos.ver.
    when 'embarques' then case when v_fila ->> 'origen_id' is null then public.tiene_permiso('repuestos.ver')
                               else (v_fila ->> 'origen_id')::uuid = any (public.origenes_con_alcance('logistica.ver', 'propios')) end
    when 'contenedores' then case when v_fila ->> 'origen_id' is null then public.tiene_permiso('repuestos.ver')
                                  else (v_fila ->> 'origen_id')::uuid = any (public.origenes_con_alcance('logistica.ver', 'propios')) end
    when 'pagos' then ((v_fila ->> 'vehiculo_id') is not null and public.puede_vehiculo((v_fila ->> 'vehiculo_id')::uuid, 'logistica.pagos.ver'))
                   or ((v_fila ->> 'proyecto_repuestos_id') is not null and public.tiene_permiso('repuestos.costos.ver'))
    -- policies «formulas: leer» y «formulas_del_origen: leer»: el origen con cotizaciones.configurar (propios o más).
    when 'formulas' then (v_fila ->> 'origen_id')::uuid = any (public.origenes_con_alcance('cotizaciones.configurar', 'propios'))
    when 'formulas_del_origen' then (v_fila ->> 'origen_id')::uuid = any (public.origenes_con_alcance('cotizaciones.configurar', 'propios'))
    when 'repuestos_compras' then public.tiene_permiso('repuestos.costos.ver')
    when 'repuestos_items' then public.tiene_permiso('repuestos.ver')
    -- policy «declaraciones_aduana: leer» (6.07-3): quien gestiona aduana, o un vehículo vigente de la declaración que se ve.
    when 'declaraciones_aduana' then public.tiene_permiso('logistica.aduana.gestionar')
      or exists (select 1 from public.declaraciones_vehiculos dv
                  where dv.declaracion_id = v_id and dv.removido_en is null and public.puede_vehiculo(dv.vehiculo_id, 'logistica.ver'))
  end, false);
end;
$$;

CREATE OR REPLACE FUNCTION public._actividad_registro(p_tabla text, p_registro text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_id uuid;
  v_fila jsonb;
  v_vehiculo uuid;
  v_item uuid;
  v_proyecto uuid;
begin
  if p_registro is null or p_registro !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return null;
  end if;
  v_id := p_registro::uuid;
  if p_tabla in ('comprobantes', 'documentos', 'formulas', 'gastos', 'pagos', 'transportes', 'embarques', 'contenedores')
     and not public._actividad_puede_ver_fila(p_tabla, p_registro, null) then
    return null;
  end if;
  -- Cada una por su PK (`<tabla>_pkey`).
  case p_tabla
    when 'leads' then
      return (select jsonb_build_object('titulo', nullif(btrim(l.nombre), '')) from public.leads l where l.id = v_id);
    when 'vehiculos' then
      return (select jsonb_build_object('titulo', v.titulo || ' #' || v.numero) from public.vehiculos v where v.id = v_id);
    when 'cotizaciones' then
      return (select jsonb_build_object('titulo', 'Cotización #' || c.numero) from public.cotizaciones c where c.id = v_id);
    when 'embarques' then
      return (select jsonb_build_object('titulo', 'Embarque «' || e.booking || '»') from public.embarques e where e.id = v_id);
    when 'contenedores' then
      return (select jsonb_build_object('titulo', 'Contenedor «' || c.numero || '»') from public.contenedores c where c.id = v_id);
    when 'comprobantes' then
      return (select jsonb_build_object('titulo', 'Comprobante #' || c.numero, 'destino', jsonb_build_object('cotizacion_id', c.cotizacion_id))
                from public.comprobantes c where c.id = v_id);
    when 'declaraciones_aduana' then
      return (select jsonb_build_object('titulo', 'Declaración ' || d.numero) from public.declaraciones_aduana d where d.id = v_id);
    when 'repuestos_items' then
      return (select jsonb_build_object('titulo', i.descripcion, 'destino', jsonb_build_object('proyecto_id', i.proyecto_id, 'item_id', i.id))
                from public.repuestos_items i where i.id = v_id);
    when 'repuestos_compras' then
      if not public.tiene_permiso('repuestos.ver') then
        return null;
      end if;
      return (select jsonb_build_object('titulo', 'Proyecto #' || p.numero, 'destino', jsonb_build_object('proyecto_id', p.id))
                from public.repuestos_compras c join public.repuestos_proyectos p on p.id = c.proyecto_id where c.id = v_id);
    when 'pagos' then
      select to_jsonb(t) into v_fila from public.pagos t where t.id = v_id;
      v_vehiculo := (v_fila ->> 'vehiculo_id')::uuid;
      v_proyecto := (v_fila ->> 'proyecto_repuestos_id')::uuid;
    when 'documentos' then
      select to_jsonb(t) into v_fila from public.documentos t where t.id = v_id;
      v_vehiculo := (v_fila ->> 'vehiculo_id')::uuid;
      v_item := (v_fila ->> 'repuesto_id')::uuid;
    when 'gastos' then
      select to_jsonb(t) into v_fila from public.gastos t where t.id = v_id;
      v_vehiculo := (v_fila ->> 'vehiculo_id')::uuid;
      v_item := (v_fila ->> 'repuesto_id')::uuid;
    when 'transportes' then
      select to_jsonb(t) into v_fila from public.transportes t where t.id = v_id;
      v_vehiculo := (v_fila ->> 'vehiculo_id')::uuid;
      v_item := (v_fila ->> 'repuesto_id')::uuid;
    else
      -- Una fórmula o una tabla de configuración: la app la nombra por su entidad y la lleva a su página de Configuración.
      return null;
  end case;
  -- Lo que cuelga de una unidad: el vehículo, el ítem de repuestos (con su proyecto) o el proyecto, si quien mira lo lee.
  if v_vehiculo is not null then
    if not public.puede_vehiculo(v_vehiculo, 'vehiculos.ver') then
      return null;
    end if;
    return (select jsonb_build_object('titulo', v.titulo || ' #' || v.numero, 'destino', jsonb_build_object('vehiculo_id', v.id))
              from public.vehiculos v where v.id = v_vehiculo);
  elsif not public.tiene_permiso('repuestos.ver') then
    return null;
  elsif v_item is not null then
    return (select jsonb_build_object('titulo', i.descripcion, 'destino', jsonb_build_object('proyecto_id', i.proyecto_id, 'item_id', i.id))
              from public.repuestos_items i where i.id = v_item);
  elsif v_proyecto is not null then
    return (select jsonb_build_object('titulo', 'Proyecto #' || p.numero, 'destino', jsonb_build_object('proyecto_id', p.id))
              from public.repuestos_proyectos p where p.id = v_proyecto);
  end if;
  return null;
end;
$function$;
revoke all on function public._actividad_recorte(text) from public, anon, authenticated;
grant execute on function public._actividad_recorte(text) to service_role;
revoke all on function public._actividad_puede_ver_fila(text, text, jsonb) from public, anon, authenticated;
grant execute on function public._actividad_puede_ver_fila(text, text, jsonb) to service_role;
revoke all on function public._actividad_registro(text, text) from public, anon, authenticated;
grant execute on function public._actividad_registro(text, text) to service_role;

-- ---------------------------------------------------------------------------------------------------------------------------------------------
-- 8. El movimiento de los textos de hoy a las entidades. Lee la tabla temporal `p_fuente` (transporte_id, vehiculo_id, repuesto_id,
--    origen_vehiculo, origen_proyecto, booking, contenedor, naviera_id, puerto_origen_id, puerto_destino_id, zarpe_el, eta_el, arribo_el,
--    creado_en, actualizado_en), que arma quien llama. Sin auditoría ni versiones nuevas (`session_replication_role = replica`, como la base):
--    no corren `auditar`, `trg_actualizado_en` ni los exigidos; lo que escribe es consistente por construcción. Idempotente: sólo asigna las
--    unidades que todavía no tienen contenedor ni embarque, y una segunda pasada devuelve todo en 0.
--    - El origen de cada fila: el del vehículo. Un ítem: el del vehículo de su proyecto si ahí hay un vehículo con esa clave (la del contenedor
--      si tiene; si no, el booking); si no, el más repetido entre los vehículos de esa clave (empate: el cambio más reciente); si no, nulo
--      (de repuestos).
--    - Cada contenedor (origen, número) va en el embarque del booking más repetido entre sus unidades (empate: el más reciente); sin booking,
--      sin embarque. Una unidad en un contenedor sigue al booking de su contenedor.
--    - Cada embarque (origen, booking) toma, por campo, el valor no nulo más repetido entre las unidades que quedan en él (empate: el más
--      reciente): un campo nunca se vacía si alguna lo tenía, así que ningún requisito cumplido se pierde.
--    Las claves se normalizan como `_transporte_cambios`; una que aun así no tiene la forma pierde lo que sobra y se cuenta.
--    Las consultas sobre las tablas temporales van por SQL dinámico: no existen cuando se revisa la función (la fuente llega por parámetro).
-- ---------------------------------------------------------------------------------------------------------------------------------------------

create or replace function public._embarques_desde_textos(p_fuente regclass) returns jsonb
  language plpgsql
  set search_path = ''
as $$
declare
  v_corregidas integer; v_emb integer; v_emb_distintos integer; v_emb_origenes integer; v_emb_sin integer;
  v_cont integer; v_cont_origenes integer; v_cont_sin integer; v_asig_cont integer; v_asig_emb integer; v_otro integer;
  -- Las tablas de trabajo llevan el nombre de la fuente (`pg_temp_N.x_filas`…): cada texto depende del parámetro y db:lint no lo revisa
  -- contra tablas que no existen al revisar.
  v_t text := p_fuente::text;
begin
  -- Un SET y no set_config(): en Supabase sólo el SET pasa por supautils (postgres no es superusuario).
  set local session_replication_role = replica;
  execute format('drop table if exists %1$s_filas, %1$s_cont, %1$s_cand, %1$s_nuevos', v_t);

  -- Las filas con clave, normalizadas. `o` es el origen con el nulo como un valor (para unir y agrupar).
  execute format($q$
    create temp table %1$s_filas as
    select x.transporte_id, x.vehiculo_id, x.repuesto_id, x.origen_vehiculo, x.origen_proyecto,
           nullif(left(regexp_replace(upper(regexp_replace(coalesce(x.booking, ''), '\s', '', 'g')), '[^A-Z0-9./-]', '', 'g'), 40), '') as booking,
           nullif(left(regexp_replace(upper(regexp_replace(coalesce(x.contenedor, ''), '\s', '', 'g')), '[^A-Z0-9./-]', '', 'g'), 40), '') as contenedor,
           (coalesce(nullif(upper(regexp_replace(coalesce(x.booking, ''), '\s', '', 'g')), '') !~ '^[A-Z0-9./-]{1,40}$', false)
            or coalesce(nullif(upper(regexp_replace(coalesce(x.contenedor, ''), '\s', '', 'g')), '') !~ '^[A-Z0-9./-]{1,40}$', false)) as corregida,
           x.naviera_id, x.puerto_origen_id, x.puerto_destino_id, x.zarpe_el, x.eta_el, x.arribo_el, x.creado_en, x.actualizado_en,
           case when x.vehiculo_id is not null then x.origen_vehiculo end as origen,
           null::text as ef_booking,
           null::uuid as o
      from %1$s x
  $q$, v_t);
  execute format('delete from %1$s_filas where booking is null and contenedor is null', v_t);
  execute format('create index on %1$s_filas (contenedor) where contenedor is not null', v_t);
  execute format('create index on %1$s_filas (booking) where booking is not null', v_t);
  execute format('analyze %1$s_filas', v_t);
  execute format('select count(*) filter (where corregida)::integer from %1$s_filas', v_t) into v_corregidas;

  -- El origen de cada ítem.
  execute format($q$
    update %1$s_filas f
       set origen = coalesce(
             (select f.origen_proyecto
               where exists (select 1 from %1$s_filas v
                              where v.vehiculo_id is not null and v.origen = f.origen_proyecto
                                and case when f.contenedor is not null then v.contenedor = f.contenedor else v.booking = f.booking end)),
             (select v.origen from %1$s_filas v
               where v.vehiculo_id is not null
                 and case when f.contenedor is not null then v.contenedor = f.contenedor else v.booking = f.booking end
               group by v.origen order by count(*) desc, max(v.actualizado_en) desc, v.origen limit 1))
     where f.repuesto_id is not null
  $q$, v_t);
  execute format($q$ update %1$s_filas set o = coalesce(origen, '00000000-0000-0000-0000-000000000000'::uuid) $q$, v_t);

  -- Cada contenedor con su booking: el más repetido entre sus unidades.
  execute format($q$
    create temp table %1$s_cont as
    select k.o, k.contenedor, b.booking, k.creado_en, k.actualizado_en
      from (select f.o, f.contenedor, min(f.creado_en) as creado_en, max(f.actualizado_en) as actualizado_en
              from %1$s_filas f where f.contenedor is not null group by f.o, f.contenedor) k
      left join lateral (select x.booking from %1$s_filas x
                          where x.contenedor = k.contenedor and x.o = k.o and x.booking is not null
                          group by x.booking order by count(*) desc, max(x.actualizado_en) desc, x.booking limit 1) b on true
  $q$, v_t);
  execute format('create index on %1$s_cont (contenedor, o)', v_t);
  execute format('analyze %1$s_cont', v_t);

  -- El booking con el que queda cada unidad: el de su contenedor, o el suyo si va suelta.
  execute format($q$
    update %1$s_filas f set ef_booking = c.booking
      from %1$s_cont c where f.contenedor is not null and c.contenedor = f.contenedor and c.o = f.o
  $q$, v_t);
  execute format('update %1$s_filas set ef_booking = booking where contenedor is null', v_t);
  execute format('create index on %1$s_filas (ef_booking, o) where ef_booking is not null', v_t);
  execute format('analyze %1$s_filas', v_t);

  -- Las filas de cada embarque: las que quedan en él; un booking que ninguna conserva, con las que lo tenían.
  execute format($q$
    create temp table %1$s_cand as
    select f.o, f.ef_booking as booking, f.naviera_id, f.puerto_origen_id, f.puerto_destino_id, f.zarpe_el, f.eta_el, f.arribo_el,
           f.creado_en, f.actualizado_en
      from %1$s_filas f where f.ef_booking is not null
    union all
    select f.o, f.booking, f.naviera_id, f.puerto_origen_id, f.puerto_destino_id, f.zarpe_el, f.eta_el, f.arribo_el, f.creado_en, f.actualizado_en
      from %1$s_filas f
     where f.booking is not null
       and not exists (select 1 from %1$s_filas g where g.ef_booking = f.booking and g.o = f.o)
  $q$, v_t);
  execute format('create index on %1$s_cand (booking, o)', v_t);
  execute format('analyze %1$s_cand', v_t);

  -- Por campo, el valor no nulo más repetido; empate: el cambio más reciente.
  execute format($q$
    create temp table %1$s_nuevos as
    select k.o, k.booking, min(k.creado_en) as creado_en, max(k.actualizado_en) as actualizado_en,
           (count(distinct k.naviera_id) > 1 or count(distinct k.puerto_origen_id) > 1 or count(distinct k.puerto_destino_id) > 1
            or count(distinct k.zarpe_el) > 1 or count(distinct k.eta_el) > 1 or count(distinct k.arribo_el) > 1) as distintos,
           (select c.naviera_id from %1$s_cand c where c.booking = k.booking and c.o = k.o and c.naviera_id is not null
             group by c.naviera_id order by count(*) desc, max(c.actualizado_en) desc, c.naviera_id limit 1) as naviera_id,
           (select c.puerto_origen_id from %1$s_cand c where c.booking = k.booking and c.o = k.o and c.puerto_origen_id is not null
             group by c.puerto_origen_id order by count(*) desc, max(c.actualizado_en) desc, c.puerto_origen_id limit 1) as puerto_origen_id,
           (select c.puerto_destino_id from %1$s_cand c where c.booking = k.booking and c.o = k.o and c.puerto_destino_id is not null
             group by c.puerto_destino_id order by count(*) desc, max(c.actualizado_en) desc, c.puerto_destino_id limit 1) as puerto_destino_id,
           (select c.zarpe_el from %1$s_cand c where c.booking = k.booking and c.o = k.o and c.zarpe_el is not null
             group by c.zarpe_el order by count(*) desc, max(c.actualizado_en) desc, c.zarpe_el limit 1) as zarpe_el,
           (select c.eta_el from %1$s_cand c where c.booking = k.booking and c.o = k.o and c.eta_el is not null
             group by c.eta_el order by count(*) desc, max(c.actualizado_en) desc, c.eta_el limit 1) as eta_el,
           (select c.arribo_el from %1$s_cand c where c.booking = k.booking and c.o = k.o and c.arribo_el is not null
             group by c.arribo_el order by count(*) desc, max(c.actualizado_en) desc, c.arribo_el limit 1) as arribo_el
      from %1$s_cand k
     group by k.o, k.booking
  $q$, v_t);

  execute format($q$
    with ins as (
      insert into public.embarques (origen_id, booking, naviera_id, puerto_origen_id, puerto_destino_id, zarpe_el, eta_el, arribo_el,
                                    creado_en, actualizado_en)
      select nullif(n.o, '00000000-0000-0000-0000-000000000000'::uuid), n.booking, n.naviera_id, n.puerto_origen_id, n.puerto_destino_id,
             n.zarpe_el, n.eta_el, n.arribo_el, n.creado_en, n.actualizado_en
        from %1$s_nuevos n
      on conflict do nothing
      returning booking, origen_id)
    select count(*)::integer,
           count(*) filter (where n.distintos)::integer,
           (select count(*) from (select i.booking from ins i group by i.booking having count(*) > 1) z)::integer,
           count(*) filter (where ins.origen_id is null)::integer
      from ins
      join %1$s_nuevos n on n.booking = ins.booking and n.o = coalesce(ins.origen_id, '00000000-0000-0000-0000-000000000000'::uuid)
  $q$, v_t) into v_emb, v_emb_distintos, v_emb_origenes, v_emb_sin;

  execute format($q$
    with ins as (
      insert into public.contenedores (origen_id, numero, embarque_id, creado_en, actualizado_en)
      select nullif(c.o, '00000000-0000-0000-0000-000000000000'::uuid), c.contenedor, e.id, c.creado_en, c.actualizado_en
        from %1$s_cont c
        left join public.embarques e                                                           -- embarques_booking_origen_key
          on e.booking = c.booking and e.origen_id is not distinct from nullif(c.o, '00000000-0000-0000-0000-000000000000'::uuid)
      on conflict do nothing
      returning numero, origen_id)
    select count(*)::integer,
           (select count(*) from (select i.numero from ins i group by i.numero having count(*) > 1) z)::integer,
           count(*) filter (where ins.origen_id is null)::integer
      from ins
  $q$, v_t) into v_cont, v_cont_origenes, v_cont_sin;

  -- Las unidades en un contenedor: con embarque, sin naviera, puertos ni fechas propios (los lee del embarque).
  execute format($q$
    with asig as (
      update public.transportes t
         set contenedor_id = c.id,
             naviera_id = case when c.embarque_id is null then t.naviera_id end,
             puerto_origen_id = case when c.embarque_id is null then t.puerto_origen_id end,
             puerto_destino_id = case when c.embarque_id is null then t.puerto_destino_id end,
             zarpe_el = case when c.embarque_id is null then t.zarpe_el end,
             eta_el = case when c.embarque_id is null then t.eta_el end,
             arribo_el = case when c.embarque_id is null then t.arribo_el end
        from %1$s_filas f
        join public.contenedores c                                                             -- contenedores_numero_origen_key
          on c.numero = f.contenedor and c.origen_id is not distinct from nullif(f.o, '00000000-0000-0000-0000-000000000000'::uuid)
       where f.contenedor is not null and t.id = f.transporte_id and t.contenedor_id is null and t.embarque_id is null
      returning t.vehiculo_id, f.booking, f.ef_booking)
    select count(*)::integer,
           count(*) filter (where asig.vehiculo_id is not null and asig.booking is not null and asig.ef_booking is distinct from asig.booking)::integer
      from asig
  $q$, v_t) into v_asig_cont, v_otro;

  -- Las unidades sueltas con booking: en su embarque, sin naviera, puertos ni fechas propios.
  execute format($q$
    update public.transportes t
       set embarque_id = e.id, naviera_id = null, puerto_origen_id = null, puerto_destino_id = null, zarpe_el = null, eta_el = null, arribo_el = null
      from %1$s_filas f
      join public.embarques e                                                                  -- embarques_booking_origen_key
        on e.booking = f.booking and e.origen_id is not distinct from nullif(f.o, '00000000-0000-0000-0000-000000000000'::uuid)
     where f.contenedor is null and f.booking is not null and t.id = f.transporte_id and t.contenedor_id is null and t.embarque_id is null
  $q$, v_t);
  get diagnostics v_asig_emb = row_count;

  execute format('drop table if exists %1$s_filas, %1$s_cont, %1$s_cand, %1$s_nuevos', v_t);
  set local session_replication_role = origin;
  return jsonb_build_object(
    'embarques_creados', v_emb,
    'contenedores_creados', v_cont,
    'unidades_asignadas', v_asig_cont + v_asig_emb,
    'embarques_con_datos_distintos', v_emb_distintos,
    'bookings_en_varios_origenes', v_emb_origenes,
    'contenedores_en_varios_origenes', v_cont_origenes,
    'vehiculos_con_otro_booking_por_su_contenedor', v_otro,
    'claves_corregidas', case when v_asig_cont + v_asig_emb > 0 then v_corregidas else 0 end,
    'sin_origen', jsonb_build_object('embarques', v_emb_sin, 'contenedores', v_cont_sin));
end;
$$;
comment on function public._embarques_desde_textos(regclass) is
  'Lleva los textos de booking y contenedor de la tabla temporal p_fuente a embarques y contenedores por origen y asigna las unidades (sin auditoría, idempotente). Devuelve lo que creó y lo que se contó.';
revoke all on function public._embarques_desde_textos(regclass) from public, anon, authenticated;

-- El movimiento de lo de hoy. El aviso dice los números al aplicarla.
create temp table transportes_textos as
select t.id as transporte_id, t.vehiculo_id, t.repuesto_id, v.origen_id as origen_vehiculo, pv.origen_id as origen_proyecto,
       t.booking, t.contenedor, t.naviera_id, t.puerto_origen_id, t.puerto_destino_id, t.zarpe_el, t.eta_el, t.arribo_el,
       t.creado_en, t.actualizado_en
  from public.transportes t
  left join public.vehiculos v on v.id = t.vehiculo_id
  left join public.repuestos_items i on i.id = t.repuesto_id
  left join public.repuestos_proyectos p on p.id = i.proyecto_id
  left join public.vehiculos pv on pv.id = p.vehiculo_id
 where t.booking is not null or t.contenedor is not null;

do $$
begin
  raise notice 'embarques desde los textos: %', public._embarques_desde_textos('pg_temp.transportes_textos');
end $$;

drop table pg_temp.transportes_textos;

-- Los check, validados sobre lo movido. Las fechas del embarque, sólo si ninguna fila las cruza (si no, quedan para lo nuevo y se avisa).
alter table public.transportes validate constraint transportes_contenedor_o_embarque;
alter table public.transportes validate constraint transportes_embarque_sin_propios;
alter table public.embarques add constraint embarques_eta_despues_del_zarpe check (eta_el >= zarpe_el) not valid;
alter table public.embarques add constraint embarques_arribo_despues_del_zarpe check (arribo_el >= zarpe_el) not valid;
do $$
declare v_n integer;
begin
  select count(*) into v_n from public.embarques e where e.eta_el < e.zarpe_el or e.arribo_el < e.zarpe_el;
  if v_n = 0 then
    alter table public.embarques validate constraint embarques_eta_despues_del_zarpe;
    alter table public.embarques validate constraint embarques_arribo_despues_del_zarpe;
  else
    raise notice 'embarques con la ETA o el arribo antes del zarpe: % (los check quedan sin validar)', v_n;
  end if;
end $$;

-- La auditoría de las tablas nuevas, después del movimiento.
create trigger trg_auditar after insert or update or delete on public.embarques for each row execute function public.auditar();
create trigger trg_auditar after insert or update or delete on public.contenedores for each row execute function public.auditar();

-- El permiso alcanza las RPC nuevas (primero transporte_guardar).
insert into public.permisos (clave, modulo, nombre, descripcion, por_origen, con_alcance, aplicado_en, orden)
values ('logistica.transporte.editar', 'logistica', 'Editar transporte', 'Naviera, puertos, contenedor, booking y fechas (por origen)', true, true,
        'transporte_guardar, transporte_grupo_aplicar, embarque_crear, embarque_guardar, contenedor_crear, contenedor_guardar, transporte_asignar, transporte_quitar',
        350)
on conflict (clave) do update set aplicado_en = excluded.aplicado_en;
