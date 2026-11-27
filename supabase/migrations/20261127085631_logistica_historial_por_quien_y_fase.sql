-- El historial de una unidad filtrado por quién lo movió o por la fase a la que entró (la tarjeta «Historial» de la página de la unidad: `?historial_quien=` y
-- `?historial_fase=`). La lectura es la de siempre (la página de `TAMANO_DE_VER_MAS` + 1 por el cursor `(creado_en, id)`, del más nuevo al más viejo) con una igualdad más:
-- sin estos índices, `historial_fases_vehiculo_idx` recorre todo el historial del vehículo descartando las filas de otra persona o de otra fase.
-- El `id` desempata el cursor en el sentido del orden (sin él, el plan ordena). «Sistema» (`usuario_id is null`) es condición del primero: un btree indexa los nulos.
-- Ni la RLS ni los grants cambian. Lo mide `supabase/tests/medir-historial-de-fases.sql`.
create index historial_fases_vehiculo_quien_idx on public.historial_fases (vehiculo_id, usuario_id, creado_en desc, id desc) where vehiculo_id is not null;
create index historial_fases_vehiculo_fase_idx on public.historial_fases (vehiculo_id, a_fase_id, creado_en desc, id desc) where vehiculo_id is not null;
