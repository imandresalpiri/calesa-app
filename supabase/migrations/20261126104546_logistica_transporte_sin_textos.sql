-- El transporte sin sus textos de booking y contenedor: desde que viven en `embarques` y `contenedores` (`transportes_con_embarque` los lee de ahí) nada
-- escribe ni lee esas columnas. Se van con sus índices, y el check del ítem que sigue al vehículo pasa a nombrar sus entidades.

-- Un ítem que sigue al vehículo no tiene naviera, contenedor ni embarque propios: los toma del transporte de su vehículo.
alter table public.transportes drop constraint transportes_check1;
alter table public.transportes add constraint transportes_sigue_al_vehiculo_sin_propios
  check (not sigue_al_vehiculo or (naviera_id is null and contenedor_id is null and embarque_id is null)) not valid;
alter table public.transportes validate constraint transportes_sigue_al_vehiculo_sin_propios;

drop index public.transportes_booking_idx;
drop index public.transportes_contenedor_idx;
alter table public.transportes drop column booking, drop column contenedor;

comment on table public.transportes is
  'Transporte 1:1 por unidad: va en un contenedor o en un embarque (o en ninguno) y lleva lo propio (notas; naviera, puertos y fechas sólo sin embarque). La vista transportes_con_embarque le pone lo de su embarque. Escritura sólo por RPC: transporte_guardar, transporte_grupo_aplicar, transporte_asignar y transporte_quitar.';
