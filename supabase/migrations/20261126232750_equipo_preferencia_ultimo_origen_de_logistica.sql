-- El último origen de logística (`logistica.ultimo_origen`): el que la persona eligió por última vez en Logística. Sin `?origen=`, cada página
-- de Logística dibuja ése (si todavía lo ve). La base sólo admite un uuid como texto; qué origen es válido lo decide la página al leerlo.
-- Cada persona escribe la suya: las policies de siempre de `preferencias_usuario`.
alter table public.preferencias_usuario
  add constraint preferencias_logistica_ultimo_origen_valida
  check (
    clave <> 'logistica.ultimo_origen'
    or (
      jsonb_typeof(valor) = 'string'
      and (valor #>> '{}') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    )
  );
