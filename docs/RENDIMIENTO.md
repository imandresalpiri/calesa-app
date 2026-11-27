# Rendimiento

Los topes vigentes de cada superficie que crece, su índice y el comando que los mide. La regla está en `.claude/rules/escala.md`. Un
presupuesto no se sube para hacer pasar una medición: se explica o se arregla (salvo la regla del 5 % de `.claude/rules/e2e.md`).

## Cómo se mide

- `pnpm db:medir` (`scripts/medir-listado.mjs`, títulos en `scripts/mediciones.mjs`): cada `supabase/tests/medir-*.sql` en una transacción
  que se revierte, como `authenticated`, plan genérico (`force_generic_plan`), `EXPLAIN (ANALYZE, BUFFERS)`, mediana de 5 de 7 corridas.
  Asserta la forma del plan (índice nombrado, sin recorrer la tabla, lo que se descarta).
- `pnpm db:sembrar-volumen` (62.000 leads; `-- --leads 200000` → 212.000; 10.000 vehículos, 200.000 seguimientos, 20.000 recordatorios,
  8.000 oportunidades en una etapa; 50.000 cotizaciones de `sembrar-cotizaciones.sql`: la dueña 2/5, Ana 1/25, 70 % con vehículo, 2 %
  finales, 2 % en la papelera; termina en `vacuum analyze`) y `pnpm db:medir:volumen` (`medir-escala.sql`, como la dueña con «todos» y Ana
  con «propios», y las demás `medir-*.sql` de volumen). Después, `pnpm db:reset`. Una medición que siembra en su transacción hace `vacuum`
  antes y después; una que siembra sus cotizaciones vacía la tabla en su transacción (`truncate … cascade`, que el `rollback` devuelve).
- Buffers por relación (`pg_stat_get_xact_blocks_fetched`), no totales: el autovacuum de las tablas de permisos mueve los totales.
- Pantalla: `E2E_VOLUMEN=1 pnpm test:e2e` (volumen por SQL en `e2e/soporte/sql.ts`): pedidos, bytes de la primera respuesta y nodos del
  DOM, sin cronómetros.
- JS en frío: suma de los `.js` (gzip, sin caché) que nombra el documento (`e2e/soporte/js-en-frio.ts`); topes en
  `e2e/soporte/presupuestos.ts`, los hace cumplir `e2e/presupuesto-js.spec.ts`.
- Jobs y baja con transacciones de verdad: `medir-jobs.sql`, `medir-bajas.sql` (pausa el cron `equipo-bajas`). `pnpm db:carreras` para los
  candados.
- Los ms de lo que escribe a disco dependen de un `fsync` lento: un job o una baja que cae sin que cambie el trabajo (lotes, buffers) se
  anota con su carga; no se afloja el tope ni se reintenta a ciegas.

## Seguimientos de un lead

Bloque «Seguimiento» de la ficha y su «Ver todos» (`?todos=seguimientos`).

- En la ficha, los últimos 3 (`PRIMEROS_DE_SEGUIMIENTOS`), leídos en el servidor con `lead_seguimientos(p_tamano := 3)` (pide uno de más: «Ver
  todos» sólo si hay). «Ver todos»: 20 por «Ver más», hasta 500 (`TAMANO_DE_VER_MAS`, `TOPE_DE_LO_CARGADO`); más allá, «Ir a una fecha».
- Índices: `seguimientos_lead_autor_idx (lead_id, usuario_id, ocurrido_en desc, id desc)` y `seguimientos_lead_publicos_idx` (parcial).
  «Recargar» tras un conflicto: primera página + `lead_seguimiento(p_lead, p_id)` por la PK, ≤ 2 pedidos.
- Primera respuesta de «Ver todos» < 24 KB con 20 ítems; 1 pedido al abrirlo (+ los tipos activos); el navegador no pide nada al llegar a la
  ficha. Nodos del drawer ≤ 2.500 tras 5 «Ver más» y ≤ 9.000 en el tope (`content-visibility: auto` por ítem).
- Mide: `db:medir` (página 1 y 501); `e2e/leads-rapido-volumen.spec.ts` (el «Ver todos» de la ficha con 20.000).

## Recordatorios de un lead

- En la ficha, los 3 pendientes más próximos (`PRIMEROS_DE_RECORDATORIOS`, `recordar_en` ascendente: los vencidos primero), leídos en el
  servidor con `lead_recordatorios(p_lead, false, null, null, 3)`; «Ver todos» (`?todos=recordatorios`): 20 por «Ver más», hasta 500 por lista;
  «Completados» no se lee hasta abrirse. Lectura: `lead_recordatorios(p_lead, p_completados, …)`; por id, `recordatorios_vista`. Cada cambio
  vuelve a leer la ficha (`router.refresh()`, por el aviso de vencidos): relee todos sus bloques.
- Índices (parciales): `recordatorios_lead_pendientes_idx (usuario_id, lead_id, recordar_en, id)` y
  `recordatorios_lead_completados_idx (usuario_id, lead_id, completado_en desc, id desc)`.
- Primera respuesta < 14 KB con 20 ítems; 1 pedido al abrir, 1 más al abrir «Completados»; «Recargar»: 1 pedido, por su id.
- Aviso de vencidos de la ficha: `lead_ficha()` cuenta hasta 21 por `recordatorios_lead_pendientes_idx` («más de 20»).
- Mide: `db:medir` (sin filas descartadas en ningún plan); `e2e/leads-rapido-volumen.spec.ts`.

## Actividad

`/actividad` y la «Actividad reciente» de un registro.

- Página por cursor sobre `id`, 20 por «Ver más» (`TAMANO_DE_VER_MAS`, la base acota con `_acotar_pagina(p_tamano, 20, 100)`), hasta 500
  (`TOPE_DE_LO_CARGADO`, `<AvisoDeTope>`); más allá, «Ir a una fecha». Ningún total. La «Actividad reciente» lee 5 (`TAMANO_DE_ACTIVIDAD_RECIENTE`;
  la base, uno más) por la ruta del registro.
- Índices por ruta: `actividad_pkey` (sin filtro e «Ir a una fecha», que ancla por `actividad_fecha_idx`), `actividad_actor_id_idx`,
  `actividad_tabla_id_idx`, `actividad_registro_id_idx`, `actividad_accion_id_idx`. El registro y el primer cambio de cada fila se leen por la PK de
  las 20 ya elegidas (`_actividad_registro`), nunca filtran ni ordenan; el recorte y el registro, una vez por fila (CTE `materialized`).
- Con 300.000 filas, cada ruta ≤ 60 ms por su índice, sin `Seq Scan` ni `Sort`, y a lo sumo `máx(2 × t; t + 15 ms)` de la función de antes de la frase
  (medido: 9–12 ms contra 20–29 ms). El detalle de una fila se lee al desplegarla (`actividad_diff`, por la PK) y su código va con `diferido()`.
- Mide: `medir-actividad-listar.sql` (`db:medir:volumen`).

## Agenda

- Calendario: `agenda_rango()`, un pedido por rango de ≤ 45 días; tope 200 por clase (`limit 201`, `hay_mas` y `tope`). Índices:
  `eventos_inicio_idx`, `tareas_responsable_idx` (mías) o `tareas_vence_idx` (con `agenda.ver_todo`), `recordatorios_usuario_idx` y
  `vehiculos_cierre_subasta_idx` origen por origen. `eventos: leer` en línea: `tiene_permiso` como InitPlan y el destinatario por PK.
- Límite sin assert: en un origen con «propios» la RLS descarta adentro los vehículos ajenos, acotado a las subastas vivas del origen en el
  rango (el mismo de `medir-panel-cierre-subasta.sql`).
- Pendientes: tres lecturas en paralelo en el servidor, tras su `<Suspense>` (la hoja no las espera), de 20 por grupo (`TAMANO_DE_VER_MAS`; la base,
  `_acotar_pagina(…, 20, 50)`): «Vencidas» y «Recordatorios» por `agenda_pendientes()` (`tareas_pendientes_idx`, `recordatorios_usuario_idx`; cursor
  `(vence_en, id)` y `(recordar_en, id)`) y «Sin fecha» por `agenda_tareas_sin_fecha()` (`tareas_sin_fecha_idx`, cursor `(creado_en, id)`). Los índices de
  tareas son parciales en `estado = 'pendiente'` y las RPC lo dicen literal (en plpgsql: por PostgREST el plan genérico no usaría el índice). «Ver más»,
  en el navegador y con `diferido()` hasta `TOPE_DE_LO_CARGADO`: supabase-js no viaja en frío. Sólo `hay_mas`, ningún total.
- JS en frío de `/agenda` (sin tope propio): 386,2 KB en 27 chunks (la hoja, la columna de
  pendientes con «Completar», la barra con «Ir a una fecha» y «Vista y opciones»; el formulario con el lead, «Ver más» y el modal «Nuevo» van diferidos). Los esqueletos salen por `pantallas/agenda-esqueletos.ts`: con el barril de la pantalla, el `loading.tsx` baja dos veces su código (≈ 25 KB más).
- «¿A quién?»: `agenda_quienes_reciben()`, ≥ 3 letras o dígitos, tope 20, sobre `perfiles`.
- Sin volumen ni `medir-*.sql`: `eventos` y `tareas` no son tablas que crecen.

## Embarques y contenedores

- `/logistica/embarques`: `embarques_listar()` y `contenedores_listar()` (definer) de un origen (`p_origen`) por cursor sobre el booking o el número (`p_desde`: el id del
  último), de a `TAMANO_DE_PAGINA_POR_DEFECTO` (`_acotar_pagina(p_tope, 50, 100)`), sin `?por=`, total ni `offset`, por `embarques_origen_booking_idx` y
  `contenedores_origen_numero_idx`. El estado es calculado y sin índice: se filtra primero por fechas y se confirma con la regla, **mirando a lo sumo 500 por llamada** (`cortada`
  y «Seguir buscando»). Registradas en `scripts/guardas/areas-b/paginas-en-la-base.ts`.
- Por fila: contenedores (`limit 101`, `contenedores_embarque_idx`), vehículos visibles acotados (hasta 100, de los primeros 1.000; con alcance «todos», 101) y «Algo que
  falta» con **200 evaluaciones por llamada** repartidas entre las filas (`{ n, hay_mas }`). Las tres van en plpgsql (que guarda su plan) y con el alcance de `logistica.ver`
  resuelto una vez por llamada: con `language sql` y `puede_vehiculo()` por vehículo la página costaba ≈ 250 ms. Medido con volumen (`medir-logistica.sql` › «entidades», 120.000
  transportes): 15–50 ms y ≈ 23 KB por página, presupuesto **100 ms y 40 KB** (también la que corta a los 500).
- La página de un embarque (`embarque_leer()`: una lectura por su clave primaria, hasta 100 contenedores y 200 vehículos visibles de las primeras 1.000 unidades, con su
  declaración y lo que les falta) y el drawer de un contenedor (`contenedor_leer()`): 4–5 ms con volumen (presupuestos 30 y 20 ms). Navieras y puertos de todos los orígenes, una
  vez por pedido (`cache()`, `.limit(201)`). El lote de «Mover», los documentos y el prorrateo de un grupo leen `transporte_unidades()` (≤ 200, por id).
- La bandeja del día (llegadas, salidas) junta por tanda tres rutas, cada una con su `order by … limit`: lo propio (`transportes_llegadas_idx`,
  `transportes_salidas_idx`), el embarque directo y el embarque por su contenedor (`embarques_llegadas_idx`, `embarques_salidas_idx`).
- El hueco «Transporte»: `transporte_leer` cuenta los vehículos visibles de su embarque y su contenedor hasta 100 (`hay_mas`) y lee a lo sumo
  1.000 unidades para saber si hay ocultas.
- **Medido** (`supabase/tests/medir-logistica.sql`, la siembra de la logística con la mitad de los transportes en 7.500 contenedores de 8 y uno de
  cada tres de ellos en su embarque: 2.500 embarques de 24; un origen, `p_origen`): una página de grupos de la dueña 13–14 ms y 11,7 KB, la de Ana 45–58 ms; el
  filtro que nadie cumple, 47–51 / 83–86 ms y 0,1 KB; el resumen de un contenedor o un embarque de 8, 4–9 ms y ≤ 6 KB; la lista de una fase
  filtrada por contenedor o booking, la dueña 1,4 ms (la lee desde las unidades de la entidad, hasta 10.000) y Ana 84 ms (parte de lo propio,
  como sin filtro). Presupuestos: página de grupos ≤ 100 ms (filtro que nadie cumple, 200) y 24 KB; resumen ≤ 20 ms y 12 KB; lista filtrada
  ≤ 10 / 200 ms y 24 KB. Sin `Seq Scan` de `embarques` ni `contenedores`.
- **La migración de los textos a las entidades** (`_embarques_desde_textos`, la misma de la migración, sobre esa siembra): 120.000 transportes,
  60.000 asignados a 7.500 contenedores y 2.500 embarques, en 3,5 s (presupuesto ≤ 60 s). Sus índices nuevos se crean sin `concurrently`
  (`docs/DESPLIEGUE.md` › «4. Migraciones»).
- Sin presupuesto de JS: el drawer sólo se monta con la clave en la URL y los huecos van con `diferido()`.

## Gastos y pagos

- `/logistica/gastos`: `gastos_listar()` y `pagos_listar()` (definer, filtran por origen y alcance), siempre con el origen elegido (sin filtro de origen en pantalla), cursor `(fecha desc, id desc)`, de a
  `TAMANO_DE_PAGINA_POR_DEFECTO` + 1, sin `?por=`, total ni `offset`. Índices `gastos_fecha_idx` y `pagos_fecha_idx` (parciales
  `where eliminado_en is null`). Registradas en `scripts/guardas/areas-c/paginas-en-la-base.ts`.
- **Sin medir con volumen** (`docs/PENDIENTES.md`: falta `medir-gastos-pagos-listar.sql`). Con «propios» el `en_cartera` por
  fila puede descartar al profundizar; hasta medirlo no hay presupuesto.
- Listas de un hueco de la unidad (`gastos_vehiculo_idx`, `pagos_vehiculo_idx`): tope 50 + 1 con aviso y «Ver todos en Gastos».

## Chat

- Lista: `chat_conversaciones()`, 20 por «Ver más» (máx. 50), cursor `(ultimo_mensaje_en, id)`. Parte de
  `conversaciones_miembros_usuario_idx` y lee `conversaciones` por PK: ordena sólo las de quien mira. No leídos: ≤ 100 entradas de
  `mensajes_hilo_idx` por fila (≤ 2.000 por página de 20; ≤ 5.000 con 50).
- Total: `chat_no_leidos()`, se detiene a los 100; peor caso, una sonda por conversación de quien mira más 100 entradas.
- Sin volumen ni `medir-*.sql` (`conversaciones` y `mensajes` no son tablas que crecen). El plan genérico de plpgsql no se midió.
- Límite sin assert: una conversación que recibe un mensaje mientras se pagina sube y no reaparece abajo; la relectura de la cabeza la trae.

## Hilo

- Se lee en el navegador: páginas de 21 (`tamano + 1`) por `mensajes_hilo_idx (conversacion_id, creado_en desc, id desc)`, sin `offset` ni
  `count`; tope 500 con `<AvisoDeTope>` e `<IrAUnaFecha>`. La señal relee 20 filas (una por ráfaga, debounce de 250 ms).
- La cita de un mensaje respondido se lee **aparte**, por `mensajes_pkey` (≤ 21 ids, sólo si la página trae respuestas): el embed
  `responde` no sirve sobre una relación a sí misma (PostgREST la rechaza o la devuelve como arreglo).
- `chat_leer`, `mensaje_editar` y `mensaje_eliminar` escriben una fila. DOM: ≤ 500 burbujas; el menú «⋯» sólo existe abierto.
- Límite sin assert: editar o borrar un mensaje más viejo que los 20 más nuevos no se refresca en la **otra** sesión hasta recargar o «Ver
  anteriores». Sin volumen ni `medir-*.sql`.

## Inicio: la bandeja

- Tres lecturas en el servidor, cada una `limit 6` tras el `<Suspense>` de su bloque: `recordatorios_vista` por
  `recordatorios_usuario_idx`; `leads_cartera_vista` por `leads_asesores_listado_idx` (cuesta la cartera de quien mira); `perfiles` por
  `perfiles_vigentes_orden_idx`. Ninguna recorre `leads`.
- `turnos-web`: dos lecturas `limit 6` de `solicitudes_contacto_web` (`solicitudes_contacto_web_usuario_id_idx`; las `asignada`, por
  `solicitudes_web_asesor_abiertas_idx`) y, si hay vehículos, una de `web.vehiculos` por ids. La tarjeta sólo se monta con turnos; el panel
  de vincular va con `diferido()`.
- «Ver todos» de cada bloque: un `<Link>` (sin JS ni lectura propia) que se dibuja sólo con el bloque en su tope. El panel de turnos (`?panel=turnos`) vive en el navegador: código con `diferido()` al primer
  `?panel=turnos`, nada al cargar `/` en frío (`presupuesto-js`); lee a la apertura y al volver a la pestaña 2 consultas `limit 21` (vigentes y vencidas) más una de `web.vehiculos` por ids, y «Ver más» otras
  dos por cursor `(vence_en, id)`, nunca `offset` ni conteo; tope 200 (`TOPE_DE_TURNOS_CARGADOS`) con aviso. Una persona recibe pocos turnos por día: tabla sin medición de volumen.
- «Personas sin rol» → `equipo_lista(p_estado => 'sin_rol')`: la antijunta `not exists (… usuarios_roles)` camina `perfiles_vigentes_orden_idx` en el orden de la lista y se detiene en 101 (`limit`); una tabla de decenas de personas, sin medición de volumen.
- `repuestos-por-mover` y `esperas-repuestos`: una lectura `limit 6` cada uno sobre `repuestos_items` (`repuestos_items_fase_id_idx`, orden
  `fase_desde`; sin índice propio: `docs/PENDIENTES.md`), con fase, proyecto y título embebidos. Server Components.

## Inventario de escala

Tope = lo que se dibuja o se lee de una vez; un número que se muestra es siempre acotado (`limit tope + 1`, «más de N»). Presupuesto = lo
que asserta `pnpm db:medir:volumen` o el e2e. Mide `medir-escala.sql` salvo que se diga otro.

### Leads

- Listado: 100 por cursor (`MAXIMO_DE_PAGINA_DE_LEADS`), `leads_listado_idx`; 30 ms página 1, 150 ms página profunda (100 por cursor). La
  policy se estima con `_lead_visible_para()` sobre `leads.cartera`.
- Filtro «Sin seguimiento» (`?sin_seguimiento=si|no`, `ultimo_seguimiento_en is null and creado_en < ahora − 24 h`; su contrario, `is not null or creado_en >= …`): columnas de la fila sobre el orden del listado,
  sin índice propio; se mide en `medir-escala.sql` («listado …: sin seguimiento» y «con seguimiento», «míos» y «todos»): «sin seguimiento» ≤ 100 ms y «con seguimiento» ≤ 150 ms (el contrario descarta más filas de la cartera).
- Teléfonos extra: ≤ 20 por lead (el `check` de `telefonos_extra_maximo`), una sola respuesta con la lista entera, `leads_telefonos_unico (lead_id, telefono)`.
  El panel de edición, un pedido (`lead_ficha()` ya trae los extras y el máximo). Con «Los teléfonos extra cuentan como el principal» encendida,
  `_lead_verificar()` suma una búsqueda por `leads_telefonos_telefono_idx` sólo si el número no es principal de nadie.
- Choques de teléfonos (Configuración › Leads › tarjeta «Teléfonos extra» › «Números repetidos», leídos desde el navegador al abrir el modal): `telefonos_extra_choques()` por cursor sobre `leads_telefonos_pkey`, de a 20 (hasta 50),
  con tope de recorrido de 10.000 filas por llamada («Seguir buscando») y `limit n + 1`, sin total; cada fila busca su choque por `leads_telefono_unico`
  y `leads_telefonos_telefono_idx`. Mide: `MEDIR_SOLO=medir-telefonos-choques pnpm db:medir:volumen` (los buffers por relación no crecen con N): peor caso ≈ 90 ms con 30.000 extras y ≈ 105 ms con 60.000 (tope 400 ms), la página con choques ≈ 70 ms.
- Quien tiene pocos leads («la chica»): «míos» por `leads_cartera_vista` e
  `leads_asesores_listado_idx (usuario_id, lead_creado_en desc, lead_id desc) include (tipo_acceso, revocado_en) where revocado_en is null`
  (lo elige `fuenteDelListado()`); página 1 hasta 30 ms, cursor hasta 150, hasta 3.000 descartes, con 62.000 y 212.000. Un «todos» con
  cartera corta (`leads_cartera_corta()`, hasta 5.000) también va por la cartera; la dueña no. Límite: 500 leads en la papelera descartan
  ~530 en la página 1 (≤ 30 ms).
- Último seguimiento y próximo recordatorio del listado (`medir-leads-ultimo-contacto.sql`): dos columnas de `leads_vista` (subconsultas `limit 1` por
  `seguimientos_lead_fecha_idx`, igualdad con `ultimo_seguimiento_en`, y `recordatorios_lead_pendientes_idx`), la página de 101 filas de la dueña y de Ana, «todos»
  y «míos»: ≤ 150 ms (31 a 56 ms con la siembra, 11 a 13 ms sin las columnas), sin `Seq Scan` de `seguimientos` ni `recordatorios`, ≤ 40 buffers por fila
  (8 a 18) y +~250 B crudos por fila en la respuesta. Con 40 seguimientos y 3 recordatorios pendientes por lead el costo por fila no cambia (la
  medición lo asserta: ±25 %); con el índice por fecha caído, la guarda falla. Con la RLS de `seguimientos` cada fila paga una vez `puede_lead()` (~14 buffers).
- «Míos» del panel del cliente por lo más reciente (`leerMios`; `medir-cartera-reciente.sql`): `leads_cartera_vista`,
  `order by reciente_en desc, id desc`, `TAMANO_DE_VER_MAS + 1` filas, sin `Sort` ni `Seq Scan`, por
  `leads_asesores_reciente_idx (usuario_id, lead_reciente_en desc, lead_id desc) where revocado_en is null`. Topes: 30 ms y 1.500
  buffers; la pestaña de una clase, 2.500 buffers (camina ~7 leads por cada uno que muestra). **Límite aceptado:** quien tiene miles de
  leads y ninguno de una clase recorre su cartera entera en esa pestaña, tope 400 ms con 80.000 en su cartera (el panel muestra el esqueleto); crece con la cartera de quien mira. Escribir: cada
  seguimiento reescribe las filas de cartera de su lead (tope 250 buffers); el relleno de la migración ≤ 60 s.
- Panel del cliente de la hoja (`e2e/cotizar-panel-del-cliente.spec.ts`): la barra va fuera de `[data-hoja]` y no importa el panel ni
  `<Badge>`. Con 20 filas, en «Todos»: ≤ 159 nodos y ≤ 5.282 B la primera respuesta de «míos». Cambiar de pestaña o de página no pide al
  servidor (`history: 'replace'`). El catálogo es `leads_catalogos()` entero, leído una vez al abrir (memoria de 60 s); en «Todos» y en la
  búsqueda va a la vez que la primera página y la pestaña de una clase lo espera. La búsqueda es la del listado por candidatos (la mide
  `busqueda-volumen.sql`). El «+» va en el panel diferido; el alta es la del shell.
- Nombre y filtros en dos pasos: `leads_candidatos(p_filtros)` (definer, `{ ids, completa, hasta }`, 300 candidatos; etapa W de hasta
  4.000 filas por el orden del listado, 10.000 en un campo público de quien ve «todos»; etapa I por
  `leads_busqueda_idx gin (cartera, nombre gin_trgm_ops, atributos_publicos jsonb_path_ops) where eliminado_en is null and cartera <> '{}'`,
  con `fastupdate = on` y `gin_pending_list_limit = 256`) y `leads_vista_por_ids(p_leads)` (invocador, SQL, `stable`, sin `strict`: se
  inlinea). No depende de N;
  `condicionesDeLaPagina()` no repite nombre, campo público ni etiqueta en el paso 2.
- Presupuestos de esos dos pasos, iguales con 62.000 y 212.000: nombre escaso ≤ 50 ms; texto y rango de un campo público ≤ 50 ms y 45.000
  buffers; campo privado, tachados ocultos y primer pedido de la exportación ≤ 100 ms y 40.000 buffers (paso 1 ≤ 80, paso 2 ≤ 40); conteo
  entero de la exportación con un valor denso ≤ 800 ms y 400.000 buffers. Berta lee ≤ 40 bloques del heap buscando un nombre ajeno (sin
  oráculo). Una etiqueta propia entra por `leads_candidatos()` (clave `etiquetas`, `leads_etiquetas_etiqueta_id_idx`), ≤ 100 ms.
- Mínimo del nombre: 3 letras o dígitos seguidos (`[[:alnum:]]{3}` en `_leads_candidatos_indexable()`; JS `[\p{L}\p{Nd}]{3}`); con 1 o 2,
  0 pedidos (`e2e/leads-listado-busqueda-minima.spec.ts`). Límite: una etiqueta puesta sólo en los 40.000 leads más viejos de la dueña
  cuesta ~138 ms con 212.000.
- Huella: `busqueda-leads.sql` (`db:probar`) y `busqueda-volumen.sql` (`db:medir:volumen`) comparan filas enteras por md5 entre la ruta de
  la vista y la de los candidatos.
- Filtros por origen y tipo: `leads_listado_idx` (uno raro, por `leads_origen_lead_id_idx` y `leads_tipo_lead_id_idx`); 100 ms; sin índice
  compuesto. Más de ~1.000.000 de leads: volver a medir con `db:sembrar-volumen -- --leads 1000000`.
- Atributo público (`atributos_publicos`), favoritos, tachados, etiqueta (unión por PK con las marcas): 100 ms cada uno. Aviso de tachados
  ocultos: «más de 50» (`contarLeadsHasta`, `leads_tachados_pkey`), 100 ms.
- Buscar `#n`: `leads_ids_del_numero(p_numero, p_todos)`, hasta 100 ids; `leads_numeros_globales_numero_key` y
  `leads_numeros_propios_creador_idx (creado_por, numero)`; ≤ 5 ms, sin `Seq Scan`. Los números del listado son subconsultas escalares;
  `tiene_permiso('leads.numero_global.ver')` se evalúa una vez por consulta. Alta (número propio): `leads_contadores` por PK, 80 ms.
- Ficha: «más de 100 vehículos» (`vehiculos_lead_id_idx`), 80 ms; `lead_vehiculos` se lee **una vez por pedido** (`leerVehiculosDelLead` es
  `cache()`: la gestión de «Vehículos» al pie de Relacionados y las opciones de vehículo de seguimientos y oportunidades la comparten).
  «Vincular o marcar un vehículo» (`?panel=agregar-vehiculo`, `shallow: false`) relee toda la ficha. Oportunidades: cursor de a 20 (máx. 100), las abiertas primero, por
  `oportunidades_lead_abiertas_idx` y `oportunidades_lead_cerradas_idx`; bloques que no crecen con la profundidad
  (`medir-lead-oportunidades.sql`); `medir-escala.sql` mide la primera de 20 (150 ms). La pantalla pide 10 en el servidor y 20 por «Ver más».
- Papelera de leads: 5 lotes por cursor (`LOTES_POR_PAGINA`), de cada uno los primeros 20 (`PRIMEROS_DEL_LOTE`) y «Mostrar los N» (≤ 200);
  `en_papelera` exacto ≤ 200; `lotes_papelera_tipo_idx`; 400 ms.
- «Quién lo tiene» (`leads_asesores`, 50 ms), candidatos de cartera (`limit 500`, 50 ms), `leads_catalogos()` (30 ms). Etiquetas: 50 por
  persona, «En N leads» hasta 1.001 (`leads_etiquetas_etiqueta_id_idx`), 300 ms.
- Selectores del alta (desde el navegador al abrir el drawer: `lead_alta_contexto` y `leads_campos`): los tres catálogos al tope de 100
  (`_origenes_lead_tope()`, `_tipos_lead_tope()`, `_tipos_seguimiento_tope()`), sin `clave` ni `icono`; 2 pedidos, < 40 KB sin comprimir con
  100 + 100 + 100 (`e2e/leads-alta-contexto.spec.ts`); ningún documento los lleva.
- Configuración de orígenes, tipos de lead y de seguimiento: 100 cada uno («N de 100»); «¿algún lead lo usa?» es un `exists` por rango
  (`>= x and <= x`) sobre `leads_origen_lead_id_idx`, `leads_tipo_lead_id_idx`, `seguimientos_tipo_idx`; 100 ms la lista, 5 ms eliminar.
- Iconos del catálogo (24 claves): las filas dibujan un símbolo compartido (`<use href>`); el shell y el alta no importan el catálogo.
- Exportar: lotes de 500, hasta 5.000, 5 por hora; hasta 5.001 ids de a 1.000 (`leads_listado_idx`), 100 ms; «Descargamos N» exacto.
- Importar: «Tus importaciones recientes» 20 de las últimas 24 h (`importaciones_leads`, 300 ms); vista previa 500 filas, 50 por página;
  lotes de 50, 500 por archivo (`FILAS_POR_LOTE`). `medir-importacion-volumen.sql`: 500 filas ≤ 2 s con 62.000 y 212.000 leads, y la razón
  del tiempo por fila entre los dos volúmenes de `actividad` en 0,8–1,2 (falla si crece con `actividad`). La oportunidad base de cada fila
  (con su historial y su actividad) suma ~20 %: 500 filas ~1,3 s. `_lead_crear` busca la adopción
  sólo si el alta trae `adoptar` (`actividad_intento_adopcion_idx`); la importación lo rechaza. `medir-importacion.sql` (`db:medir`, base
  recién reseteada; `seed.sql` analiza).
- No se agrega un índice, trigger o columna a `leads` sin medir alta (80 ms), 500 filas importadas (≤ 2 s) y la baja de 200.000.

### Vehículos, orígenes, equipo y empresa

- **Relacionados** (`vehiculo_relacionados()`, `lead_relacionados()` y sus `*_pagina()`; `medir-relacionados.sql`): una lectura `security definer` por bloque (la ficha y la unidad, en el servidor; «Ver todos», en el
  navegador). Tope: 3 filas por grupo (≤ 9 por bloque) y una ventana de 101 relaciones por grupo (la cabecera dice «100+»); «Ver todos» de a 20 por cursor `(fecha, id)` hasta 500, con un recorrido de hasta 2.000 filas por llamada
  (`cortada` si hay demasiadas ocultas seguidas). Índices: `vehiculos_interesados_vehiculo_reciente_idx`, `…_lead_reciente_idx`, `vehiculos_vinculos_lead_abierto_idx`, `cotizaciones_relacion_vehiculo_idx`, `…_lead_idx` y `…_par_idx`
  (parciales de la cotización activa). Con un vehículo de 5.000 interesados y 2.000 cotizaciones: resumen ≈ 4 ms (3 ms la dueña) y 835 bloques, los mismos que con 300 (no crece con N); los relacionados de un lead de 1.000 vinculados,
  1.000 interesados y 2.000 cotizaciones ≈ 9 a 13 ms; una página «Ver todos» ≈ 5 a 15 ms (Ana, que ve 3 de 5.000, recorre las 2.000 filas del tope: ≈ 10 ms). Tope de la medición: 20 ms por llamada. Las cuatro llevan `set random_page_cost = 1.1`
  (sin él el plan genérico ordena todo lo del vehículo caliente: 20 mil bloques). Las imágenes, la miniatura de 480 px; el visor, la grande. Sin caché de cliente: la ficha y la unidad se releen al actuar (`revalidarVinculo()`).
  Dos presentaciones (en una línea y compacta), sin grupos vacíos: lo que no tiene nada no se dibuja y las filas de una línea existen sólo en su popover (diferido, montado al primer clic).
  Con un vínculo y 4 interesados (`section[aria-label="Relacionados"]`, escritorio): la ficha del vehículo 8.078 B, 58 nodos y 213 px de alto (332 px en el celular); la ficha del lead con un
  vínculo 3.350 B, 30 nodos y 143 px.
  En las fichas lo lee el servidor y entra en el documento de la ficha (sus topes, en «JS en frío»).

- Inventario: 50 por cursor (máx. 100, `MAXIMO_DE_PAGINA_DE_VEHICULOS`), `vehiculos_origen_listado_idx`; 20 ms página, 100 / 150 ms
  búsqueda y limpieza.
- Lectura con 50.000 y 250.000 (`medir-vehiculos-lectura.sql`): la dueña, Pía y Beto («propios», `en_cartera` una vez por fila) ≤ 10 ms y
  300 buffers (Beto ≤ 1.000); `puede_vehiculo()` ≤ 5 ms; razón con 250.000 ≤ máx(1,5 × t; t + 3 ms), buffers ≤ 1,2 × + 20. Sin assert:
  quien tiene vehículos sin lead recorre el origen entero por PostgREST; por eso quien ve «propios» lee por `vehiculos_inventario()`.
- **El inventario por rutas** (`vehiculos_inventario()`; `medir-vehiculos-inventario.sql`, `-forma`, `-guarda`, `-costo-fijo`), plpgsql
  invocadora que planea su texto en cada llamada: R1 el origen (`vehiculos_origen_listado_idx`; quien ve «todos» o tiene más de 5.000 leads
  en su cartera), R2 lo creado (`vehiculos_creador_idx`), R3 la cartera corta (un lateral por lead sobre `vehiculos_lead_id_idx`), cada una
  con su `limit`; `limpieza_el` sobre lo leído por R1 o R2, y R3 relee sólo las de la página. Topes: Pía, la chica y Beto ≤ 10 ms (Pía con
  un atributo sin coincidencias ≤ 20), Vera (cartera de 5.000) ≤ 40; bloques del índice de la ruta: Pía ≤ 12, la chica ≤ 6, Beto ≤ 20;
  bloques de `vehiculos` con 250.000 ≤ 1,2 × + 20. El tiempo no se compara entre volúmenes (el ruido lo confundía con crecimiento).
  **«Situación»** (`situacion_en`; `medir-vehiculos-inventario-situacion.sql`): una situación propia es una igualdad sobre `vehiculos_situacion_idx` bajo su `Limit`
  (≈ 100 bloques de `vehiculos` y ≈ 4 ms con 50.000 y con 250.000, sin filas descartadas); con varias propias o con fases, una ruta por rama unidas con `union all`
  (Postgres no ordena por `creado_en` a través de varios valores de un índice: con un `= any` la misma lista leía todas las de la situación y crecía con N). Las fases
  siguen por `vehiculos_origen_listado_idx`. El atajo «Sin resolver» pide `tope + 1` (100) filas por el mismo índice.
  **«Subasta» por cierre** (`cierre_entre` y `p_orden = 'cierre'`; `medir-vehiculos-inventario-cierre.sql`): el tramo 0 (vivas con cierre) por
  `vehiculos_subasta_viva_cierre_idx (origen_id, cierre_subasta_en, id)` y el 1 (vivas sin fecha) por `vehiculos_subasta_viva_sin_fecha_idx`, parciales de las vivas;
  el 2 por `vehiculos_origen_listado_idx`. Con 50.000 y 250.000: una ventana por cierre ≈ 5 ms y 111 bloques, todas las vivas ≈ 9 ms, «Anterior» desde el tramo 1
  ≈ 9 ms, hondo en el tramo 2 ≈ 4 ms y 15 bloques; tope 10 ms. Sin filtro por cierre lee los tres tramos (≈ 16 ms, plano con N): tope 20 ms, el presupuesto de la
  página del inventario. «Cierra hoy» por «Más recientes» ordena las vivas de la ventana (crecen con las subastas vivas, no con el inventario): sin el chequeo de
  crecimiento ni de bloques, con el tope de tiempo. El índice del tramo 1 sólo gana con 250.000: con 50.000 el plan prefiere `vehiculos_situacion_idx`, y la
  forma se exige sólo con el volumen grande.
  Límites sin assert: más de 5.000 en la cartera recorre el origen (R1); R3 crece con los vehículos de la cartera, no con N; un filtro sin
  coincidencias recorre todo lo que la persona creó; 500 alternativas sin coincidencias ≈ 144 ms (el tope de la validación);
  `por_limpiar` llama a `limpieza_el(v)` por candidata; el costo fijo de una llamada no crece con las concesiones.
  Cada página pide además la condición por defecto (`situacion_fuera_de` sin las no ganadas, medida en «Pía · por defecto» y «Beto · por
  defecto»: misma ruta e índice). **Límite aceptado:** con la limpieza apagada y muchas no ganadas, una página lee también las no ganadas
  intercaladas: crece con su densidad, no con N.
- **Panel de revisiones de una guardada** (`e2e/cotizar-guardada-revisiones.spec.ts`): `cotizacion_revisiones` por cursor (`p_antes`), de a
  `TAMANO_DE_VER_MAS` hasta `TOPE_DE_LO_CARGADO`, por `cotizaciones_revisiones_cotizacion_idx (cotizacion_id, id desc)`. Primera página con
  20: ≤ 254 nodos y ≤ 12.503 B (≈ 12 nodos por fila: dos `<Monto>` por revisión; no envolver cada cambio en otro `<span>`). El tope de 500
  se prueba en Vitest. «Ir a una fecha»: un pedido por salto con `p_hasta`; viaja en el chunk diferido del panel. Los nombres de un cambio de
  vehículo: **una** lectura de `vehiculos` por página, por `vehiculos_pkey`, con los ids de esa página (≤ 2 × `TAMANO_DE_VER_MAS`) y
  `.limit(ids.length)`; ninguna si la página no cambia de vehículo, nunca una por fila.
  `medir-cotizacion-revisiones-fecha.sql`: el ancla por
  `cotizaciones_revisiones_cotizacion_creado_idx (cotizacion_id, creado_en desc, id desc)` y la página por
  `cotizaciones_revisiones_cotizacion_idx`; con 5.000 revisiones, los mismos bloques a cualquier profundidad e igual
  con 500 que con 5.000 (sin el índice, la guarda cae). Supone que el id crece con `creado_en` por cotización
  (`docs/PENDIENTES.md`).
- Panel del vehículo (desde el navegador): páginas de `TAMANO_DE_VER_MAS` + 1 por cursor, con 50.000 y 250.000, como la dueña, Pía y Beto:
  «Últ. cotización» por `vehiculos_cotizado_idx` (`medir-panel-ultima-cotizacion.sql`) y «Cierre subasta» por `vehiculos_cierre_subasta_idx`
  sobre la columna generada `cierre_subasta_en` (`medir-panel-cierre-subasta.sql`; el margen de 24 h es otro `>=`), ≤ 10 ms y 300 buffers
  (Beto ≤ 1.000), sin `Sort`. Historial de un vehículo con 5.000 cotizaciones por `cotizaciones_vehiculo_creado_idx`
  (`medir-historial-del-vehiculo.sql`), ≤ 10 ms y 300 buffers. Razón con 250.000 ≤ máx(1,5 × t; t + 3 ms), buffers ≤ 1,2 × + 20.
  Límites sin assert: el plan genérico de la profunda de un vehículo muy cotizado a veces ordena las suyas (crece con las cotizaciones del
  vehículo, no con N); la chica recorre lo cotizado y lo vivo de su origen; el historial de quien ve «propios» recorre las del vehículo; la
  portada embebida de cada fila (≤ 21 lecturas por `vehiculos_portada_unica`) no tiene medición SQL.
- En pantalla (`e2e/cotizar-panel-del-vehiculo.spec.ts`): con 20 tarjetas sin foto y el buscador, ≤ 299 nodos y ≤ 5.150 B la primera
  respuesta (con portada, cada fila suma su ruta de miniatura; la columna `situacion` marca la subasta cerrada); cambiar de pestaña o de página no pide al servidor. La búsqueda tiene la
  forma de la del inventario (título, VIN o lote por `vehiculos_origen_listado_idx`, de a 21, desde 3 letras o números, pausa de 300 ms) y
  sólo ella pide `creado_en` (en las pestañas pasaría el tope de bytes). Sin medir, como en el inventario: el `lote` en el `or` y el texto que
  no coincide (recorre el origen).
- El alta se pide al abrirse y lee el layout activo desde el navegador (`useLayoutActivo()`): la diferencia del documento entre la dueña y
  un rol sin `vehiculos.crear` ≤ 40.000 B sin comprimir (`e2e/cotizar-panel-crear-vehiculo.spec.ts`).
- Historial en pantalla: al desplegarlo, de a 21 por cursor, con el autor embebido (una lectura por PK de `perfiles` por fila, ≤ 21: límite
  sin assert) y «Ver más» hasta 500, que ofrece «Ver todas en Cotizaciones» (`/cotizaciones?vehiculo=`).
  `e2e/cotizar-historial-del-vehiculo.spec.ts`:
  ≤ 5.250 B la primera respuesta y ≤ 65 nodos. «Cotizado (n)» es la misma consulta con `select('id')`, en paralelo con la hoja.
- «Cotizaciones de este vehículo» de `/vehiculos/[id]`: la fila de tarjetas lee `cotizaciones_de_este_vehiculo` una vez (`TARJETAS_EN_LA_FICHA` = 10, la aprobada fijada aparte), sin cursor ni
  «Ver más» propio: lo demás es la tarjeta «Ver más» al listado filtrado. Al acercarse el bloque (nunca con el documento), código con el `diferido()` de la isla. `e2e/vehiculos-cotizaciones.spec.ts`:
  ≤ 5.150 B la respuesta (medido 4.884) y ≤ 395 nodos la fila con 10 tarjetas (con la imagen, «Compartir», «Aprobar esta» y la casilla; medido 375), en los dos proyectos más un 5 %.
- **Comparar cotizaciones** (`/cotizaciones/comparar`): a lo sumo 3 `cotizacion_hoja_guardada()` (por `cotizaciones_pkey`) y una lectura de las marcas por
  PostgREST de ≤ 3 filas (`cotizaciones_pkey` con la aprobada por `cotizaciones_aprobadas_cotizacion_id_key`, `.limit(ids.length)`), todo en paralelo tras
  `<Suspense>`; sin `cotizacion_evaluar`. Ninguna lista que crezca: sin cursor, sin conteo, sin medición propia. Lo dibujado: ≤ 3 columnas × los nodos
  visibles de cada versión (el diseño tiene tope de 40 ítems por sección), más los porcentajes de los pares y lo aparte. El modelo se arma en el servidor y
  viaja plano. JS en frío: `'/cotizaciones/comparar'` en `e2e/soporte/presupuestos.ts` (sin la hoja: la tabla, `<Monto>` y la action de aprobar): medido 358,7 KB, tope 380. Las casillas y «Comparar» de «De este vehículo» van en su chunk diferido.
- **«De este vehículo»** (el bloque de la guardada y del resumen de `/cotizaciones`): `cotizaciones_de_este_vehiculo()` desde el navegador, de a
  `TAMANO_DE_ESTE_VEHICULO` (10) + 1 por cursor `(creado_en, id)` sobre `cotizaciones_vehiculo_creado_idx` y, sin cursor, la aprobada por
  `cotizaciones_aprobadas_pkey`; «Ver más» hasta `TOPE_DE_ESTE_VEHICULO` (100), dibujado con `cortarAlTope()`. Origen, autor y si es la aprobada salen de las
  ≤ 102 filas leídas (claves primarias); el nombre del modo, una llamada a `_nombre_del_modo()` por versión y modo. `medir-cotizaciones-de-este-vehiculo.sql`
  (un vehículo con 5.000 entre 50.000 y 250.000): la dueña ≤ 10 ms y ≤ 150 bloques de `cotizaciones` (medido 2,4 / 2,5 ms y 9 / 10 bloques la primera, 1,1 / 1,6
  ms y 6 la profunda; ≈ 440 buffers en total por el costo fijo de la RLS), sin recorrer la tabla y sin crecer con N; Ana («propios», 5 de 5.000) ≤ 100 ms como en
  el listado (medido 40, recorre las del vehículo). La línea de la guardada y la decisión de dibujar son una lectura del servidor por PostgREST con `limit 101`
  (`conteoAcotado`, `cache()`), la forma de «Cotizado (n)»: sin medición propia. En pantalla (`e2e/cotizaciones-de-este-vehiculo.spec.ts`, 10 filas y la
  aprobada): la primera respuesta ≤ 5.600 B (columnas cortas, `total`, `moneda`, `editada_en`, `vence_el`, como el alias `a` del historial; medido 5.327) y ≤ 240 nodos (medido 165: ≈ 15 por fila, porque cada una lleva n.º, título, insignias, `<Monto>`, modo, autor, fecha y dos acciones; el tope de 65
  del historial es para filas de 3 nodos). Código: la isla al acercarse y la cáscara `diferido()` en su `diferidos.tsx`; el bloque, al acercarse (guardada) o
  al abrir el resumen. En frío, sólo la cáscara del hueco (el resumen ya es diferido).
- **La barra del resumen** (`e2e/cotizaciones-drawer.spec.ts`): abrir el resumen no pide nada nuevo: el «⋯» y «Compartir» salen de lo que la página ya leyó. La
  cotización del resumen que no está en la página (una línea del modal de un grupo, otra página) suma su id a las tres lecturas por clave primaria de las marcas
  (`conLaDelResumen()`) y una llamada a `cotizaciones_modos_de([id])` dentro de `leerLaDelResumen()`, en el mismo pedido al servidor. La barra suma 3 botones al
  resumen y ninguno a la lista (los diálogos cerrados no dibujan). Código: `AccionesDelResumen` y `CabeceraDelResumen` viajan en el chunk diferido del resumen;
  en frío, unas líneas del listado.
- **«Compartir la cotización»** (`e2e/cotizaciones-compartir.spec.ts`): por apertura, un `GET /cotizaciones/<id>/compartir` (la hoja guardada, `cotizacion_tarjeta`,
  el vehículo y la subasta por clave primaria, el autor y los ajustes: lo mismo que un PDF, sin dibujarlo) y la imagen de la tarjeta con la caché del navegador (un 304
  con su ETag); al elegir «Fotos», `…/compartir/fotos` (el vehículo por `cotizaciones_pkey` y `vehiculos_imagenes` por `vehiculo_id`, ≤ 24) con miniaturas de 480 px
  `lazy`, y la completa (≤ 1.600 px) sólo de lo marcado. Cambiar de pestaña, formato o zona no pide nada. Código: el panel entero por `diferido()`; en frío sólo el
  botón del detalle y la línea del «⋯» (que no se dibuja hasta abrir el menú); la hoja nueva no dibuja el botón.
- **Los retoques de la tarjeta** (`e2e/cotizar-retoques.spec.ts`): sin lista ni consulta que crezca. `cotizacion_retocar_tarjeta()` lee la cotización por
  `cotizaciones_pkey` y la tarjeta por `cotizacion_tarjeta()` (la versión por `formulas_pkey`, la publicada de su fórmula del origen por `plantillas_publicada_unica`); los retoques
  tienen el tope de su forma (≤ 1.000 celdas, ≤ 120 filas, 300 caracteres por texto, 24 KiB) y la revisión guarda sólo cantidades. Lo que se dibuja en el
  modo: un botón por celda y uno por fila, los topes de la plantilla. Código: la vista previa (ya diferida) suma el estado del modo, `aplicarRetoques()` y
  «Retocar»; la interfaz del modo, en su propio chunk (`components/retoques/diferidos.tsx`). En frío sólo una prop del proveedor (la de los retoques, unos
  bytes en `/cotizaciones/[id]` y en `/cotizaciones/nuevo`).
- El dato del vehículo en el panel (sin spec propio): con un vehículo en la URL, la página lee además el layout del origen en el
  `Promise.all` y, tras `leerVehiculo`, `editablesDe` (sin consulta con «todos» o lo que creó); el documento suma `paraElegir` (≈ 150 B) y
  `seEligen`. Con un elegido y un dato, una `cotizacion_tabla` por tabla distinta, en paralelo, recordada 5 min por hoja abierta y tabla
  (`memoriaDeLectura()`). Se dibujan ≤ 50 opciones (`TOPE_DE_OPCIONES`) con «Buscar en las opciones» y `<AvisoDeTope>`.
- Papelera de vehículos: como la de leads, 200 ms. «Más de 1.000» archivos por borrar (`cola_gc_storage_edad_idx`, 50 ms). Galería: 24 por
  vehículo (`vehiculos_imagenes_hash_unico`). Vínculos e interesados: 50 / 100, «Mostrando los 50 vínculos / 100 interesados más
  recientes.» (`vehiculos_vinculos_vehiculo_idx`); en el lead, los tres bloques de «Vehículos» 100 / 100 / 50. «Agregar vehículo»: 20, lee
  21, 300 ms.
- Papelera de cotizaciones: como la de vehículos, `lotes_papelera_tipo_idx`, 200 ms. «Le queda alguna en la papelera» es una sonda por lote
  (`cotizaciones_lote_papelera_idx`, `limit 1`): un `exists` haría un semi join que lee entero ese índice. `medir-escala.sql`, con 500
  lotes más de la dueña: por el índice, sin recorrer `lotes_papelera` ni `cotizaciones`; quien no tiene la clave descarta los lotes ajenos
  (tope 600; crece con ellos, no con la página).
- `/cotizaciones/papelera` (`e2e/cotizaciones-papelera.spec.ts`): una página (`tamano + 1`) y «Mostrar los N» un lote al pedirlo. JS en frío
  ≤ 440 KB. Página 1 con 5 × 20: ≤ 3.000 nodos y ≤ 480.000 B de documento (medido: 477.234, con los botones «Recargar la página» y «Copiar el enlace de esta página» del marco: regla del 5 %), igual (± 2 %) con lotes de 21 que
  de 200 (≈ 1 KB por botón «Purgar»: las clases de `Button`). Purgar no lee nada: una llamada por confirmación y relee una página.
- Orígenes: resumen y categorías con uso, 100 / 50 ms (exento, administración). Tipos de cambio: historial de 30 («Mostrando los 30
  cambios más recientes.»).
- Requisitos de una fase (administración): `requisito_impacto()` y `flujo_fuera_de_regla()` recorren ≤ 1.000 unidades por fase sin orden
  (`vehiculos_fase_id_idx` / `repuestos_items_fase_id_idx`; más es una muestra, `revisadas` lo dice) y cortan en `tope + 1` (50, máx. 100).
  Presupuesto previo 500 ms; peor caso de `flujo_fuera_de_regla`: fases con bloqueantes × 1.000 `evaluar_requisitos`. Exento de medición.
- Equipo: 100 por nombre (`TOPE_DEL_EQUIPO`; `equipo_lista()` lee 101) en dos etapas: W las primeras 2.000 del estado (perezosa), I el
  trigram. Índices `perfiles_vigentes_orden_idx`, `perfiles_estado_orden_idx`, `perfiles_busqueda_idx` (GIN trigram; `unaccent` declarada
  `immutable`, `reindex` si cambia). Sin texto ≤ 150 buffers la consulta; < 3.500 nodos (`e2e/equipo-tope.spec.ts`). Mínimo 3 letras o
  dígitos, 0 pedidos con 1 o 2 (`e2e/equipo-busqueda-minima.spec.ts`); `lista-equipo.tsx` no llama a `setParametros` si `q` no cambia.
  Miniatura de 96 px. `medir-equipo.sql` (10.000 y 100.000 personas; no crece más de 1,5 veces, piso 60 buffers).
- Roles: `roles_personas()` hasta 1.001 por rol («más de 1.000 personas»), `usuarios_roles_rol_idx`, ≤ 150 buffers. La matriz no pagina:
  80 filas de catálogo + hasta 18 de niveles (`_niveles_tope()` = 10; 9 que generan permisos × 2) más el renglón de «Todos», el rótulo y el pie del grupo (`e2e/roles-niveles.spec.ts`). El código
  de los niveles (el «⋯», los modales) y el del cuadro de «Quién crea y quién ve» se piden al usarse (`diferido()`).
- Modo Live (`/configuracion/modo-live`): «Por rol», los primeros 100 roles (`TOPE_DE_ROLES_PARA_ELEGIR`, con aviso) y sus filas de
  `live_ajustes_roles` por clave primaria. «Ajustes por persona»: `live_personas()` (definer, `_acotar_pagina(…, 21, 21)`): sin texto, quienes
  tienen lo propio por `live_ajustes_personas_actualizado_idx (actualizado_en desc, usuario_id desc)` y cursor, «Ver más» de a 20 desde el
  navegador hasta `TOPE_DE_LO_CARGADO`; con texto (3 letras), las 20 primeras por nombre con la misma búsqueda de Equipo
  (`_equipo_lista_sql`, sus índices y su medición). Una tabla de configuración (una fila por rol o persona con ajustes): sin medición de
  volumen. Los modales y las confirmaciones, con `diferido()`. En la sesión, los ajustes son dos lecturas por clave primaria dentro de
  `mi_sesion()`, sin pedidos nuevos; el marco suma ≈ 2 KB de JS a toda ruta (el proveedor del Live, el interruptor y el silencio del push, cuya E/S
  se pide con `import()` sólo al encender): `/cotizaciones/nuevo` 480,4 (tope 485) y `/vehiculos/[id]` 541,0 (tope 545) por la regla del 5 %.

### Baja de una persona

- Vista previa: hasta 1.001 («más de 1.000»), `leads_asesores_usuario_vigente_idx`, ≤ 300 ms (`_bajas_en_curso()` envuelta en
  `(select …)::uuid[]`, un InitPlan).
- Baja: lotes de 5.000 por cursor (ids del índice y candado por clave, separados). `medir-bajas.sql` con 200.000 leads de una persona: la
  llamada ≤ 4.000 ms; el job `equipo-bajas` corta cada corrida a 1,5 s: ≤ 12 corridas, ≤ 20.000 ms en total, la más larga ≤ 3.000 ms. Lo
  que cuenta es el trabajo (≈ 40 lotes).
- Por qué cuesta: `cartera` está en `leads_busqueda_idx`, así que ningún update de la baja es HOT (11 btree en `leads`). Sacarla del GIN rompe
  la búsqueda (Berta leería leads ajenos): descartado. Con lotes de 1.000 la guarda de corridas cae.

### Jobs (100.000 filas por purgar)

Mide `medir-jobs.sql`; los presupuestos son 10 a 30 veces lo típico.

- `papelera-purgar`: 50 lotes por corrida entre leads, vehículos y cotizaciones, cada hora. Con 100.000 cotizaciones en 500 lotes (una
  revisión y un adjunto cada una), una corrida purga 10.000 ≤ 25.000 ms; selección por `lotes_papelera_pendientes_idx` y una sonda por lote;
  refcount de cada adjunto por `cotizaciones_adjuntos_ruta_idx` (sin él, un `Seq Scan` por ruta).
- `limpieza-automatica`: mueve 200 y revisa 1.000 más.
- `situacion-al-cerrar` (cada 10 min): hasta 500 por corrida, de a un origen de subasta, por `vehiculos_situacion_idx (origen_id, situacion,
creado_en desc, id desc) where eliminado_en is null and situacion <> 'fase'`; recorre las «En subasta» del origen: crece con las subastas
  vivas, no con N. 500 de 1.000 vencidas entre 2.000 ≤ 2.000 ms.
- **Límite aceptado:** marcar o desmarcar «Es la subasta» recalcula la situación de los vehículos de esa fase y de los «sin fase» del origen
  (también la papelera) en la transacción de `fase_guardar`: lineal, en una acción de configuración poco frecuente.
- `importaciones-vinculos-purgar`, `importaciones-filas-purgar` y `apibara-consultas-purgar`: lotes de 10.000, 10 por corrida.
- `importaciones-continuar` (cada 2 min): 5 importaciones totales detenidas y 50 sin avance en 24 h por corrida
  (`importaciones_en_curso_idx`).
- `importar-csv` (función edge): ≤ 45 s por invocación, lotes de 50 (`FILAS_POR_LOTE`); archivo normalizado ≤ 10 MB y 20.000 filas, leído
  entero en cada invocación. Con ≈ 8 s cada 500 leads, 20.000 filas son 7 u 8 invocaciones y más de 20 min (el job despierta la siguiente a
  los 2 min sin avance).
- Convertir en el navegador: 20.000 leads pasan el presupuesto de ≤ 1 s, así que la pantalla convierte por tramos de 500
  (`convertir-por-tramos.ts`) cediendo el hilo, con «Preparando el archivo…» y el avance; idéntico a una pasada (`preparadorDeFilas`). La
  vista previa convierte 500 (`FILAS_DE_VISTA_PREVIA`).
- Importaciones: «Ver más» de 20 hasta 500 por `importaciones_lista_propia_idx` o `importaciones_lista_idx` (parciales: el filtro
  `archivo_ruta is not null` va siempre); sondeo cada 5 s por PK con ≤ 21 ids, sólo con alguna en curso y la pestaña a la vista; el informe
  de rechazadas, ≤ 20 × 1.000 por PK y sólo al «Descargar». No es una tabla que crece.
- `storage-gc`: 100 por ronda, 5 rondas; 2.000 huérfanos encolados por pasada; el barrido lleva un cursor por bucket (`cola_gc_barrido`):
  10.000 objetos por pasada, 5 pasadas por corrida. Barre `vehiculos` y `cotizaciones`, cada uno con su rama por `not exists` sobre las tablas que lo
  referencian (`medir-jobs.sql`, 100.000 objetos en `cotizaciones` con adjuntos en uso: ≈ 0,2 s por ventana que encola 10.000 y ≈ 0,18 s la
  misma ya encolada; topes 4 s y 1 s, los de `vehiculos`).
- `leads-campos-privacidad` (lotes de 5.000, hasta 10 por corrida) y `equipo-bajas` (arriba).

## Ítems por página: qué lista lo admite y su máximo

Elige 10, 25, 50 o 100 (`listas.por_pagina`, `?por=`); cada lista declara su máximo. Un máximo se gana midiendo: `db:medir:volumen` y
`e2e/listas-por-pagina-volumen.spec.ts` (bytes, nodos, página profunda). El selector va en «Vista y opciones» (popover o, en el celular, hoja
inferior), que no se dibuja hasta abrirse: la carga sólo paga el botón. En el celular se dibuja una sola vista (`UnaSolaVista`, según el `user-agent`).

- Listado de leads: 100; ≤ 3.610 nodos en escritorio y 3.070 en celular con filas sin seguimientos (`leads-escala.spec.ts` con `?por=100`: 3.435 y 2.920 medidos; 2.100 y 1.810 con 50:
  1.985 y 1.720 medidos). La fila no lleva un botón «+ Oportunidad» (5 nodos por fila de la tabla y 3 por tarjeta): «Nueva oportunidad…» es una línea del «⋯»; con
  las 100 filas llenas de la siembra, ≤ 4.650 nodos y 55.500 B gz (`listas-por-pagina-volumen.spec.ts`). Las columnas «Último seguimiento» y «Recordatorio» pesan
  ~7 nodos y ~70 B comprimidos por fila llena (100 filas llenas: 4.035 nodos y 52,9 KB en escritorio; 4.419 nodos y 51,2 KB en celular). Es lo que el listado
  dice de cada lead; bajarlo pide un máximo de 50 por página.
- Inventario de vehículos: 100; ≤ 6.300 nodos y 66.000 B gz con 100 filas: en escritorio (la tabla, con «Lote», «Compra directa» y «Costo estimado» con su modo) medido 5.703 nodos y 63.488 B; en el celular (la misma tarjeta de la lista que en escritorio: la foto con el chip del lote y las filas de datos fijas con «—», `dt` y `dd` directo en la grilla, sin envoltorio por fila ni nodo para el «—») 6.150 nodos y 63.539 B. El tope de nodos, un 5 % sobre 6.000; el «⋯» único con sus paneles no suma nodos por fila y el «Costo estimado» viaja como un `Record` por id de vehículo con la ruta, el monto, la moneda y el modo.
- Listado de cotizaciones: **50** (`MAXIMO_DE_PAGINA_DE_COTIZACIONES`); ≤ 2.700 nodos y 49.500 B gz. Con la tarjeta de la lista (la imagen con su recuadro, el «⋯»,
  seis filas de datos, el conteo del grupo y «Compartir»: ≈ 40 nodos cada una) 100 pasan el tope por más del 5 % (4.329 nodos y 61,3 KB en el celular, agrupada):
  el máximo es 50 para las cuatro formas (tabla y tarjetas, agrupada o no; la vista cambia en el cliente sin releer). Medido con 50 (escritorio, la dueña): tarjetas agrupada 2.310 nodos y 41,9 KB, sin
  agrupar 2.142 y 38,8 KB; tabla agrupada 1.703 y 39,4 KB, sin agrupar 1.539 y 36,7 KB; Ana, 2.154 y 39,2 KB en tarjetas agrupada; el celular, 2.287 y 41,9 KB.
  La página profunda no crece (≤ 15 %). Las vistas guardadas van por `diferido()` (el JS de `/cotizaciones`, en «JS en frío»).
- Sin selector: las papeleras (5 lotes × 20), «Ver más» de seguimientos y recordatorios, la columna del kanban (50, tope 500,
  `TAMANO_DE_COLUMNA`) y las listas de tope fijo.
- En la base cada RPC con tamaño acota con `_acotar_pagina(pedido, por_defecto, máximo)`: seguimientos y recordatorios 20 hasta 50;
  papeleras 6 hasta 51; `embudo_tablero` 50 hasta 100 por columna y 500 hasta 1.000 de total; `embudo_etapa_pagina` 50 hasta 100;
  `vehiculos_inventario()` 100 hasta 100. El listado de leads y el inventario de quien ve «todos» van por PostgREST (`max_rows` = 1.000).
  `escala.sql` llama las RPC con 100000, 51, 30, 0, -1 y nulo.

## Kanban y oportunidades

- Tablero: 6 columnas × 50, «500+» por columna, `oportunidades_tablero_idx`; la policy de `oportunidades` pregunta por fila
  `_lead_vivo_en_mi_cartera(lead_id)`. Presupuestos: tablero 800 ms, «Ver más» 500 ms, buscar 700 / 200 ms; primera página de una columna,
  «Ver más» y total acotado ≤ 25 ms (la guarda asserta `oportunidades_tablero_idx`, sin recorrer `oportunidades`, ≤ 200 descartes).
- Embudo filtrado por lead (`?lead=`): `embudo_tablero_del_lead` y `embudo_etapa_pagina_del_lead`, los mismos topes (50 por columna, «500+»), cada
  columna por `oportunidades_lead_etapa_idx` (lead, persona, etapa, actividad). `supabase/tests/medir-lead-oportunidades.sql` asserta el índice, sin
  `Sort` ni `Seq Scan` y ≤ 1 descarte, con 1.000 en una columna sobre 20.000 de fondo; el tablero y su «Ver más» ≤ 50 ms (medido: 12 y 4,3 ms).
- La guarda de «una abierta por lead y embudo» es un `select … limit 1` por `oportunidades_lead_abiertas_idx` tras un candado por (lead, embudo);
  `abiertas_por_embudo` (sólo en la primera página de `lead_oportunidades`) es una sonda `limit 1` por embudo, 10 como mucho, por el mismo índice.
- Nodos con una columna en el tope (500 tarjetas): ≤ 10.300 en escritorio (medidos 10.252, con el menú lateral plegable: un `<span>` por entrada y su botón) y 6.000 en el celular (`leads-escala.spec.ts`); el «⋯» de cada
  tarjeta cuesta exactamente 3 nodos (`<use>` a un símbolo de `src/shared/ui/lista/simbolos-de-lista.tsx`; `e2e/mas-acciones-icono.spec.ts`).
  El servidor dibuja una sola distribución según el ancho de la petición.
- Oportunidades de la ficha: 10 en el servidor y «Ver más» de a `TAMANO_DE_VER_MAS` desde el navegador hasta `TOPE_DE_LO_CARGADO`, con
  aviso y «Verlas en tu embudo» (el embudo filtrado por el lead). Documento de la ficha ≤ 138 KB sobre `/perfil` (`PRESUPUESTO_DE_LA_FICHA_EN_KB`), igual (± 2 KB) con 10 o con 1.000; cada
  «Ver más» pesa lo mismo a cualquier profundidad; nodos lineales hasta 500 (`e2e/leads-oportunidades-ver-todas.spec.ts`).

## Vistos

- `vistos_de(módulo, tipo, ids)`: una lectura por pantalla dibujada, de a ≤ 100 ids por llamada (dos llamadas por tipo como mucho: tope de 200 ids por tipo) por la PK
  `(usuario, módulo, tipo, referencia_id)` y el último por `vistos_ultimo_idx (usuario, módulo, tipo, visto_en desc)` con `limit 1`. La lista recortada
  va a una variable antes de consultar: dentro de la consulta la RLS la deja como filtro y se recorre todo el par. En la agenda (evento y tarea), un `select` por la PK
  (`vistos_pkey`, ≤ 2 filas) dice cuál de los dos últimos es el más reciente. `supabase/tests/medir-vistos.sql` (`MEDIR_SOLO=medir-vistos pnpm db:medir:volumen`):
  con 2.000 y con 20.000 vistos por persona, `vistos_de` con 100 ids 0,3–0,5 ms y 129 bloques con 20.000 (sube un nivel del árbol por sonda, nunca con las filas del par); el
  último de la agenda por la PK 0,03 ms y 13 bloques, igual con las dos cargas. `visto_registrar`, un upsert por PK; uno nuevo con 19.999 filas cuenta hasta el techo: ≈ 3 ms.
  La E/S (supabase-js) se pide al usarse y no está en el JS en frío de la lista. `vistos_purgar()` cada hora, por persona por `vistos_usuario_visto_idx`, lotes de 5.000 y 50.000 por corrida (el orden rota con la hora); techo de 20.000 filas por persona, contado con tope sólo al insertar.

## Alertas y bandeja de logística

- `logistica_bandeja(5)` (definer, máx. 20): demoradas = por par (origen visible, fase que alerta) un rango de `vehiculos_cadena_idx` con
  `limit 50` (cuesta los pares, no las unidades). Trabados: hasta 50 `evaluar_requisitos`. Por aprobar: `documentos_por_revisar_idx` con
  `limit n + 1`. Sin volumen: rangos acotados de índices ya medidos. Con el alcance «propios» recorre la fase (pendiente: `docs/PENDIENTES.md`). La bandeja del día de `/logistica` es otra
  lectura (`logistica_bandeja_grupo`), medida: ver «La cadena de logística».
- `alertas_demora()` (job `alertas-demora`, cada hora en el minuto 12): ≤ 2.000 unidades por corrida, de a 200 por cursor
  `(fase_desde, id)` sobre `vehiculos_cadena_idx`; destinatarios una vez por origen. «Ya avisé», «abierto» y el cierre al mover
  (`trg_alertas_cerrar_al_mover`, también en un `cambiar_fase_lote` de 200) van por
  `notificaciones_referencia_idx (referencia_id, tipo, usuario_id, creado_en desc)`. **Límite aceptado:** con más de 2.000 demoradas, las
  nuevas esperan a que se muevan las viejas.
- `documentos_vencimientos()` (job `documentos-vencimientos`, 11:15 UTC): ≤ 2.000 por corrida por `documentos_vencen_idx (vence_el)`; el
  cursor `(vence_el, id)` agrega un ordenamiento parcial e incluye los documentos de repuestos (cuentan para el tope).
- Cada aviso nuevo pasa por `trg_notificaciones_push`: con `push_web`, un `pg_net` por insert; reabrir no empuja.
- Inicio: los tres bloques de logística leen `bandejaLogistica(TOPE_DE_BLOQUE)` con `cache()`: una llamada por pantalla. Cada bloque dice
  «N» o «más de 5» (`cantidadAcotada`).

## La cadena de logística

- `/logistica`: la Cadena de un origen (la gráfica y «dónde está»); `/logistica/bandeja`, la bandeja del día de ese origen; `/logistica/fase/[fase]`, la lista de una fase; `/logistica/bandeja/[grupo]`,
  un grupo entero del origen. Todo por cursor, con tope y sin ningún total (`1.000+`, `100+`). Cada página lee una vez por pedido la sesión, los orígenes y sus flujos (`origenDeLaPagina`, con
  `cache()`, la comparten la barra y el contenido): N lecturas cortas de flujo, en paralelo, para N orígenes (`docs/PENDIENTES.md`: una sola lectura si se mide lenta).
- **Dónde está:** `logistica_donde_esta()` con `p_origen` (el elegido; nulo con «Buscar en todos los orígenes»), hasta 10 + 1; texto corto no llama a la base.
- **Gráfica:** `logistica_cadena_resumen()` cuenta por fase con `limit tope + 1` sobre `vehiculos_cadena_idx (origen_id, fase_id, fase_desde, id) where eliminado_en is null and situacion <> 'no_ganada'`
  (parcial: cada consulta lleva el literal y el `order by` del índice); los trabados, las primeras 50 demoradas de cada fase con `evaluar_requisitos` (por `documentos_unidad_tipo_idx`). Con el
  alcance «propios» parte de `_logistica_lo_propio` (hasta 10.001 ids). Server Component, sin JS propio.
- **Lista de una fase:** `logistica_cadena_columna()` de a 50 (`TAMANO_DE_LA_FASE`) por cursor `(fase_desde, id)`; una sola vista en el DOM (tabla desde 768 px, tarjetas por debajo); nada por fila
  (los atributos del nombre van en tandas de 100 ids por PK). Selección de hasta 200.
- **Bandeja del día:** `logistica_bandeja_grupo()` con `p_origen` (obligatorio: el alcance es un arreglo de uno), un ayudante e índice por grupo (`vehiculos_cadena_idx` para demorados y trabados, `documentos_por_revisar_idx`, `documentos_vencen_idx`,
  `transportes_llegadas_idx`, `transportes_salidas_idx`, `vehiculos_situacion_idx`); la portada lee 5 filas por grupo con el conteo hasta 100 (`TOPE_DE_LA_BANDEJA`), una página de un grupo, 20
  (`TAMANO_DE_LA_BANDEJA`). Lo recorrido con fecha para al leer 2.000 (`cortada`) y trabados evalúa 200 demoradas por llamada.
- **Medido** (`supabase/tests/medir-logistica.sql`, 300.000 vehículos vivos en un origen, 40 % con transporte y 25 % con documento; en una transacción sin VACUUM: el índice visita la tabla, así que es
  pesimista): el resumen de la dueña 11–20 ms y 2,8 KB, el de Ana («propios», 12.000 propios y 3.000 de su cartera) 80–155 ms; los bloques del índice con la fase 3 a 15.000 y a 120.000 no crecen
  (106 / 107; vehiculos 8.545 / 8.598); cada grupo de la portada de la dueña 8–20 ms (trabados, 42) y ≤ 2 KB, el de Ana 130–290 ms (trae lo propio una vez por grupo); una página de 20 con cursor profundo
  7–13 ms y ≤ 6 KB; la lista de la fase 1,8 ms y 13 KB (Ana, 58–125 ms). Presupuestos: resumen ≤ 50 / 250 ms (dueña / Ana) y 4 KB; portada ≤ 60 ms (trabados 100) / 300 ms y 6 KB; página con cursor ≤ 40 ms y
  12 KB; lista de la fase ≤ 10 / 200 ms y 24 KB.
- Lo medido se arma en una transacción que se revierte: `session_replication_role = replica`, 195.000 vehículos con la fase 3 en 15.000 y después 105.000 más a ella (sumar y no mover: mover deja filas
  muertas en los índices y cambia lo que se mide).
- JS en frío (`e2e/presupuesto-js.spec.ts`): `/logistica` ≤ 390 KB (medido 373,8, con el ⚙ «Configurar») y `/logistica/fase/[fase]` ≤ 390 KB (medido 367,0 en 27 chunks): sobre lo medido más un 5 %, a la decena.
  `/logistica/bandeja` ≤ 390 KB, provisional hasta su primera medición (la bandeja del día viajaba en `/logistica`). La barra de Logística es de servidor: sólo el desborde de los orígenes y
  `RecordarElOrigen` viajan al navegador.
- JS en frío del detalle de un vehículo (`/logistica/vehiculo/[id]`): ≤ 470 KB (medido 446,1; el popover de relacionados, cada hueco y el modal «Pedírselo a alguien» van con `diferido()`), sobre lo medido más un 5 %, a la decena.
- **Acciones de «Qué falta»** (`/logistica/vehiculo/[id]`): sin lectura nueva; viajan en la respuesta de la action de siempre (≈ 150 a 250 B por falta) y
  `por_revisar` sale del mismo `count` por `documentos_unidad_tipo_idx`. Se dibuja un botón por falta y el «⋯» sólo con más. «Pedírselo a alguien» llega
  con `diferido()` al primer uso y lee una vez al abrir (`agenda_quienes_reciben` con `p_permiso`: 20 + 1 sobre `perfiles`, la tabla del equipo); buscar,
  desde 3 letras con 300 ms de espera.
- **Página de la unidad** (`/logistica/vehiculo/[id]`): no hay lectura nueva salvo `leerVehiculo` (una fila por PK, tras su `Suspense`, para la portada; el resto de las fotos, al acercarse: máximo 24). En escritorio se piden al abrir **tres** huecos (Qué falta, Documentos, Notas: tres chunks diferidos y tres lecturas del navegador); en el celular, **uno**. Lo demás, al elegir su pestaña, y queda montado. Topes y cursores, los de siempre: notas e historial de a 20 (`TAMANO_DE_VER_MAS`) por cursor `(creado_en, id)` hasta 500 (`TOPE_DE_LO_CARGADO`, `notas_vehiculo_vivas_idx`, `historial_fases_vehiculo_idx`); documentos 50+1 (vivos); gastos y pagos 50+1. Cada pestaña dibuja dentro de su marco con desplazamiento: la página no crece. Sin migración ni consulta nueva: no hay medición de volumen propia.
- Nodos del DOM, medidos en el recorrido (`page.evaluate`, sin spec nuevo): la portada entera con 5 grupos de 5 filas, 334; la gráfica de 5 fases, 53; la lista de una fase con 50 vehículos en escritorio, 1.039.
- Sin volumen de interfaz propio: `e2e/logistica-cadena.spec.ts` prueba «Siguiente» con 51 y `e2e/logistica-bandeja-del-dia.spec.ts` los 21 demorados, no miden nodos de miles.
- Lote de mover: selección y lotes ≤ 200 (`TOPE_DEL_LOTE`) en **una llamada** (`previsualizar_cambio_fase_lote`, `cambiar_fase_lote`). Los
  destinos de la fase son configuración (`TOPE_DE_DESTINOS`). «Unidades de un grupo (lote)»: `transporte_unidades()` (≤ 200, de un embarque
  o un contenedor por su id). Las casillas y el contexto van en el JS de `/logistica`; la barra,
  el drawer y el hueco del grupo, con `diferido()`.
- Panel de la unidad, «Notas»: `notas` por `notas_vehiculo_vivas_idx (vehiculo_id, creado_en desc, id desc) where eliminado_en is null`,
  `limit 21`, cursor `(creado_en, id)` e «Ir a una fecha»; hasta 500 con `<AvisoDeTope>`; autor y fase embebidos. Sin `medir-*.sql`.
- «Historial»: `historial_fases` por `historial_fases_vehiculo_idx (vehiculo_id, creado_en)` hacia atrás, igual cursor, tope y salto; fases
  y persona embebidas. Se lee al abrir su bloque; código con `diferido()`.

## Buscador

Cada sección por su RPC, de a `_acotar_pagina(p_tamano, 5, 20)` + 1, con el mínimo de `MINIMO_DE_BUSQUEDA` en la base
(`_buscador_interpretar()`).

- Leads (`buscador_leads()`): la ventana de `leads_candidatos()` con sólo el texto + `leads_ids_del_numero()` (≤ 100) + una pasada de
  `leads_vista_por_ids()`; corta en 21.
- Vehículos (`buscador_vehiculos()`): una ruta por origen visible por `vehiculos_origen_listado_idx`, ≤ 21 por origen. **Límite sin
  assert:** un texto que no coincide recorre los vehículos vivos de cada origen visible.
- Cotizaciones (`buscador_cotizaciones()`, definer; `medir-buscador.sql`, 50.000 y 250.000): el número por `cotizaciones_numero_key`; el
  título por `cotizaciones_titulo_trgm`, ≤ 1.000 candidatas de los orígenes que se ven, más las propias por `cotizaciones_creador_idx`
  (≤ 21) **sólo donde se tiene «propios» sin «todos»**; la policy sobre ellas por PK. Presupuestos: número 10 ms, título raro 20, común 150
  la dueña y 300 con «propios»; ningún recorrido entero. **Límites declarados:** con un título común el GIN y la PK de la policy crecen con
  las coincidencias (≤ 1.000 × su profundidad); la ruta de las propias crece con las propias; con «todos» y más de 1.000 coincidencias, las
  propias no tienen prioridad (se llega por `#número` o afinando). Con el plan a medida (las 5 primeras llamadas de una sesión) un título muy
  común va por un `Seq Scan` con `limit 1000`: se queda así. Guarda: sin `cotizaciones_titulo_trgm`, lo raro recorre la tabla.
- Búsqueda del listado de cotizaciones (`cotizaciones_buscar()`, invocadora; `medir-cotizaciones-buscar.sql`, 50.000 y 250.000; `?q=`): el número por
  `cotizaciones_numero_key` (≈ 1,5 ms, 4 bloques); cada fuente nombra ≤ 50 ids —clientes por la ventana de `leads_candidatos()` y `leads_vista_por_ids()`, vehículos
  por origen por `vehiculos_origen_listado_idx` (la RLS no deja usar su trigrama), autores por `perfiles` (decenas de filas), títulos de la cotización por
  `_cotizaciones_ids_por_titulo()` (definer, plan genérico: ≤ 1.000 candidatas por `cotizaciones_titulo_trgm` de los orígenes que se ven, más ≤ 51 propias por
  `cotizaciones_creador_idx` donde sólo se ve «propios», la policy sobre ellas y las 51 más nuevas)— y de cada uno una página por
  `cotizaciones_lead_creado_idx`, `cotizaciones_vehiculo_creado_idx` o `cotizaciones_creador_idx` (el título, por la PK), fundidas y sin repetir. Presupuestos: número
  20 ms, cliente raro 80, cliente común 400, vehículo raro 150, vehículo común 400, autor 60, título raro 80 y título común 150 (el doble para Ana; el título
  suma ≈ 5 ms a la llamada entera, cuyo piso de texto ya es ≈ 36–45 ms: no se compara con los 20 ms de `buscador_cotizaciones()`, que es sólo esa fuente);
  medido el título raro 40,6 ms (dueña, 304 bloques) y 42,8 (Ana) con 50.000, 39,6 y 41,5 con 250.000; el común 60,6 / 83,6 con 50.000 y 59,8 / 81,4 con
  250.000, con `acotada` (Ana paga ≈ 100 `en_cartera()`); medido ≈ 37–45 ms los de texto (el piso es `leads_candidatos()` y el
  recorrido de los vehículos de cada origen) y ≈ 13 ms los comunes de vehículo. Ningún recorrido entero de `cotizaciones`; número, cliente raro y vehículo raro no
  crecen con N (≤ 1,2 × los bloques y 1,5 × el tiempo de 50.000). **Límites declarados:** un texto de vehículo que no coincide con nada recorre los vehículos vivos de cada
  origen visible (como `buscador_vehiculos()`); con «propios», por autor sólo se buscan las propias (nada de un `en_cartera()` por cada cotización de otra persona);
  con un título común el GIN crece con las coincidencias (≤ 1.000 por su profundidad) y, con más de 1.000, las 50 son las más nuevas de esas candidatas, no de
  todas (`acotada` lo avisa); los filtros del listado (clase, «mías», cursor) se aplican sobre esas 50, no antes.
- Últimos abiertos (`leerUltimosAbiertos()`): ≤ 16 visitas propias por `visitados_usuario_visto_idx` y hasta tres lecturas en paralelo por
  PK (≤ 16 ids cada una, bajo la RLS de cada tabla); se muestran 8.
- Una búsqueda: hasta 4 pedidos en paralelo, cada uno ≤ 6 filas; espera de 250 ms entre teclas.
- La paleta: 5 filas por sección, 8 «Últimos abiertos», 8 acciones con texto (sin texto, las ~25 del menú). El shell suma el botón,
  `useAtajo` y las acciones como props; `cmdk`, `command.tsx`, la paleta y sus hooks van tras `diferido()` hasta pulsar «Buscar».
- `visitados`: ≤ 50 por persona (`visita_registrar()` recorta), por la PK y `visitados_usuario_visto_idx (usuario_id, visto_en desc)`.

## Repuestos

- `repuestos_proyectos_listar()` (definer): cursor sobre `repuestos_proyectos_numero_key` (`numero desc`), de a 50 (máx. 100) + 1; con y
  sin cursor son dos consultas. Las cuentas de ítems leen ≤ 201 vivos por `repuestos_items_proyecto_id_idx`; el título del vehículo
  (`puede_vehiculo`) sólo para la página. El texto (≥ 3 o sólo dígitos) es filtro: si no coincide recorre los proyectos vivos (**límite sin
  assert**).
- `repuestos_stock_listar()` (definer): cursor `(en_stock_desde, id)` sobre
  `repuestos_items_en_stock_idx (en_stock_desde desc, id desc) where en_stock_desde is not null and eliminado_en is null`, de a 50
  (máx. 100) + 1; ids primero, luego proyecto y título de la página. Sin presupuesto
  medido. La dibuja `/repuestos?vista=stock` (`TAMANO_DE_PAGINA_POR_DEFECTO`); el buscador de «Reasignar»
  lee una página de `TAMANO_DE_VER_MAS` abiertos. Movimientos de un ítem (`leerMovimientosDeItem`): por
  `repuestos_stock_movimientos_item_id_idx`, `id desc` como cursor, de a `TAMANO_DE_VER_MAS` + 1, tope `TOPE_DE_LO_CARGADO` con
  `<AvisoDeTope>`. **Excepción a «siempre hay un camino a lo antiguo»:** más allá de 500 movimientos no hay «Ir a una fecha» (un ítem tiene
  pocos).
- Compras de un proyecto: PostgREST bajo `repuestos.costos.ver`, por `repuestos_compras_proyecto_id_idx`, tope 200 + 1 con `<AvisoDeTope>`
  (sin camino: compras no crece), orden `fecha desc, creado_en desc, id desc`; sólo al abrir la pestaña. `repuestos_proyecto_margen()`
  (definer), un proyecto, `sin_precio` hasta 201.
- `repuestos_pendientes_de_vehiculo()` (definer): un proyecto vivo por vehículo (`repuestos_proyecto_por_vehiculo`), sus ítems por
  `repuestos_items_proyecto_id_idx` y las esperas de las fases siguientes; de a 50 (máx. 200) + 1. El hueco «Repuestos» del panel del
  vehículo la llama al abrir el bloque y otra vez si cambia la fase.
- Cadena (`/repuestos?vista=cadena`): PostgREST bajo `repuestos.ver`, **una consulta por fase** (≤ 30) más «Sin fase», en paralelo, cada una
  `limit 51` (`TAMANO_DE_COLUMNA + 1`) por `repuestos_items_fase_id_idx`, orden `(fase_desde, id)`; «Ver más» de a 50 por cursor hasta
  `TOPE_DE_LO_CARGADO`. Pendiente (`docs/PENDIENTES.md`): un índice `(fase_id, fase_desde, id)` si llega a
  miles. `/repuestos` no tiene presupuesto de JS.
- Sin volumen ni `EXPLAIN` en `db:medir:volumen`: `repuestos_*` no están entre las tablas que crecen de `escala.md`.
- El cliente de un proyecto: la cabecera de `/repuestos/[id]` lee un lead por su PK de `leads_vista` (`limit 1`) sólo con `lead_id` y `leads.ver`; el
  `?lead=` de «Nuevo proyecto», igual, sólo con el formulario en la URL. El lead del vehículo, en el navegador al elegirlo: `vehiculo_vinculos`
  (≤ 51 filas por vehículo, una lectura por elección). El buscador de leads es el de siempre (`_acotar_pagina`). La lista no suma lecturas.
- JS en frío: «Nuevo proyecto» (formulario, buscadores, lectura del vínculo y supabase-js) llega con `diferido()` desde `src/app` al abrirlo:
  `/repuestos` pesa 376,3 KB (build de e2e, `medirJsEnFrio`). Sin tope propio.
- La barra de progreso de `/repuestos/[id]`: tres lecturas de configuración en paralelo en cada carga (fases, salidas y requisitos de dato con una clave de hito del
  flujo de repuestos; topes 30 / 360 / 60 más uno, por `fases_flujo_id_nombre_key`, `fases_transiciones_flujo_id_idx` y `fases_requisitos_fase_id_idx`)
  y, sólo con `repuestos.costos.ver`, el pago vivo (`limit 1` por `pagos_proyecto_repuestos_id_idx`). Progreso y siguiente los calcula el navegador sobre
  las filas de la hoja (≤ 200): O(fases² + ítems) por cambio de filas. Ningún número es un total («37+ de 200+»). Las pestañas Cotizaciones, Pagos y Compras (Compras tope 200,
  Cotizaciones 50, Pagos como siempre) se leen al elegirlas y su código llega con `diferido()`. Los grupos por paso de los ítems los arma el navegador sobre las
  mismas filas (O(n), ≤ 200 filas y ≤ 31 encabezados; los conteos con la hoja topada, «N+»). El buscador y los filtros de los ítems también: un recorrido O(n) por
  cambio sobre esas filas (≤ 200), sin otra lectura ni pedido; el drawer del ítem y el de «Agregar ítem» viajan con `diferido()` y sus secciones las lee el servidor al abrirlos (`?item=`).
  **JS en frío de `/repuestos/[id]`** (con tres ítems, mismo método): 395,5 KB en 29 chunks. La cabecera sale de `pantallas/proyectos-detalle.ts`, no del barril del listado (que arrastra el listado y «Nuevo
  proyecto»). Sin tope propio.
- El vehículo de la cabecera de `/repuestos/[id]`: el vehículo por su PK (empieza en la página, en paralelo con la hoja) y, dentro de su `<Suspense>` y sólo
  con vehículo, `leerFasesDeOrigen` (≤ ~30 fases, `cache()` por pedido) y `getOrigenes(true)` (decenas, `cache()`); la hoja no espera ninguna. Su miniatura es
  la de 480 px (`ruta_miniatura`, `unoptimized`, `loading="lazy"`), nunca el original; los tres bloques del vehículo son de servidor.
- El panel del ítem (`?item=`) lee al abrirse sólo lo que se ve: «Qué falta», las imágenes (`limit 9`, una sola lectura que comparten la portada y la tarjeta «Imágenes») y, con
  `repuestos.costos.ver`, las compras del ítem (`TAMANO_DE_VER_MAS` + 1 por `repuestos_compras_item_id_idx`, una sola lectura para la tarjeta «Compras» y «Proveedor»). Documentos, historial y notas
  muestran una línea fija y leen (50 y 20) al abrir su drawer. En la Cadena, sin la hoja, se suman la fila del ítem, los catálogos y las monedas (tres lecturas por id o de configuración). En `/repuestos` (la Cadena) el panel va con `diferido()`.
- Imágenes de un ítem: `limit 9` por `repuestos_items_imagenes_item_id_idx`, sólo al abrir el panel; el trigger cuenta con `limit 8` bajo
  un candado por ítem. **Excepción a «nunca el original»:** sin miniatura y con `unoptimized`, cada imagen baja el WebP de ≤ 1600 px (≤ 8
  por panel abierto).
- Catálogos de logística (el drawer de cada uno en la pestaña Fases de un origen): se leen al abrir su drawer, cada grupo («De <origen>» y los
  compartidos) con `limit 201` por PostgREST (decenas de filas); tope 200 con `<AvisoDeTope>`.
- Configuración del cotizador (`/repuestos/configuracion/cotizador`): tres lecturas en paralelo bajo `repuestos.cotizar` o
  `repuestos.configurar`: la configuración por su PK (`order by id desc`, la primera es la vigente) tope 20 + 1, los tramos por
  `repuestos_tramos_logistica_moneda_idx` y las cajas por `repuestos_cajas_moneda_monto_key`, tope 200 + 1 cada una, con `<AvisoDeTope>`.
  Los modales se piden al abrirse (`diferido()`).
- Cotizaciones de un proyecto (`/repuestos/[id]`, «Cotizaciones»): `limit 51` por `repuestos_cotizaciones_proyecto_id_idx`, tope 50 con
  `<AvisoDeTope>`, sólo con la pestaña abierta (el «⋯» de cada tarjeta no lee nada: sus acciones salen de la fila y de los permisos de la página; las confirmaciones, con `diferido()`); la hoja lee la cotización por PK (`limit 1`) y sus líneas por
  `repuestos_cotizaciones_lineas_cotizacion_id_idx` (tope 200 de la base) y, sólo con `lead_id` y `leads.ver`, una fila de `leads_vista` por PK para el cliente del proyecto. En borrador lee además los ítems del proyecto (`limit 201`, tope
  200 por `armarHoja`); el total en vivo es O(líneas) ≤ 200 por cambio, con líneas y `XCell` en `memo` y callbacks estables.

## Tablero: métricas

- `tablero_leads()` y `tablero_cotizaciones()` (definer): agregados de un período ≤ 366 días (zona de la empresa). `tablero_leads` recorre
  `leads_listado_idx` por `creado_en` y `leads_cliente_desde_idx` (parcial) por `cliente_desde`; el dueño por `leads_asesores_dueno_unico`
  (una sonda por lead). `tablero_cotizaciones` recorre `cotizaciones_listado_idx`. Costo lineal en lo **del período**; rankings cortados con
  `row_number()` (10 orígenes, 20 personas), un día por fecha con `generate_series`.
- `tablero_margen()` y `tablero_cola_web()` (definer), con la misma regla: `tablero_margen` recorre `pagos_tablero_confirmado_idx` (parcial:
  confirmados vivos de vehículo, por `confirmado_en`) y `pagos_fecha_idx`; por vehículo, una sonda en `pagos_vehiculo_idx`,
  `gastos_vehiculo_idx` y `cotizaciones_final_por_vehiculo`; 10 orígenes. `tablero_cola_web` recorre
  `solicitudes_contacto_web_asignada_idx` y corta en 20 personas.
- Sin presupuesto medido ni `EXPLAIN` en `db:medir:volumen` (no es una lista); si hace falta, se mide con 366 días.
- `/tablero`: ≤ 4 RPC por carga (una por grupo, compartidas con `cache()`); Server Components sin JS propio salvo el «Reintentar» de un
  widget caído y los `<Link>`; sin presupuesto de JS. «Personalizar» es un `<Drawer>` diferido; guardar es un `upsert` de `tablero.widgets`
  y `router.refresh()`. Las gráficas son HTML y SVG de servidor (90 días: 180 rectángulos y 90 filas), sin consulta nueva.

## JS en frío (con gzip, lo que el documento nombra)

- Topes (`PRESUPUESTO_DE_JS_EN_KB` de `e2e/soporte/presupuestos.ts`, lo medido más un 5 % a la decena; uno pasado por ≤ 5 % se sube con la regla del 5 %):
  `/leads` 560, `/leads/[id]` 595 (590,2 medidos con el `enFrio` de `diferido()`, que viaja en el marco: regla del 5 %), `/perfil` 440, `/vehiculos` 530, `/vehiculos/[id]` 545 (541,0 medidos con la cotización privada, los dos botones del marco, la cuenta regresiva de la subasta y el Modo Live configurable en el marco: regla del 5 %), `/cotizaciones` 400 (con las tarjetas de la lista, la imagen de la tarjeta en frío y el hook de los menús de las filas que comparte con las fichas),
  `/cotizaciones/nuevo` 485 (480,4 medidos con el Modo Live configurable en el marco; 478,3 con la posición de cada pieza y el bloque «Avanzado»; con la hoja con el aspecto de V1, la tarjeta del total como pieza de una sección (`TotalDeHoja`), el interruptor «Privada», los botones «Recargar la página» y «Copiar el enlace de esta página» del marco y la marca, «Calculado» y la región del aviso de un cálculo pisado: regla del 5 %; con la subasta, `?origen=`; la línea «Descargar PDF», el contexto del «⋯» de la guardada y el interruptor «Privada» viajan con la hoja), `/cotizaciones/[id]` 500
  (el título de la cotización y la cabecera compacta, con el menú de Base UI del «⋯» en frío; 488,8 medidos con la rejilla libre; «Hacer privada», la insignia, los dos botones del marco y el orden de los bloques por grupo de campos: regla del 5 %), `/cotizaciones/comparar` 380, `/logistica` 390,
  `/logistica/fase/[fase]` 390, `/logistica/vehiculo/[id]` 470, `/configuracion/roles` 410 (388,2 medidos con los niveles de acceso y «Quién crea y quién ve» dentro de la matriz; el «⋯» de cada nivel, sus modales y el cuadro van con `diferido()`);
  `/cotizaciones/nuevo` 480 (473,9 medidos con la hoja con el aspecto de V1, la tarjeta del total como pieza de una sección (`TotalDeHoja`), el interruptor «Privada», los botones «Recargar la página» y «Copiar el enlace de esta página» del marco y la marca, «Calculado» y la región del aviso de un cálculo pisado: regla del 5 %; con la subasta, `?origen=`; la línea «Descargar PDF», el contexto del «⋯» de la guardada y el interruptor «Privada» viajan con la hoja), `/cotizaciones/[id]` 500
  (el título de la cotización y la cabecera compacta, con el menú de Base UI del «⋯» en frío; 490,5 medidos con «Hacer privada», la insignia, los dos botones del marco y el orden de los bloques por grupo de campos: regla del 5 %), `/cotizaciones/comparar` 380, `/logistica` 390,
  `/cotizaciones/nuevo` 480 (470,2 medidos sin el resumen de la derecha: la región del total, el cierre con «Guardar» y la ranura de la cabecera; con la hoja con el aspecto de V1, la tarjeta del total como pieza de una sección (`TotalDeHoja`), el interruptor «Privada», los botones «Recargar la página» y «Copiar el enlace de esta página» del marco y la marca, «Calculado» y la región del aviso de un cálculo pisado: regla del 5 %; con la subasta, `?origen=`; la línea «Descargar PDF», el contexto del «⋯» de la guardada y el interruptor «Privada» viajan con la hoja), `/cotizaciones/[id]` 490
  (el título de la cotización y la cabecera compacta, con el menú de Base UI del «⋯» en frío; 484,6 medidos con «Hacer privada», la insignia, los dos botones del marco y la cabecera quieta de la ranura: regla del 5 %), `/cotizaciones/comparar` 380, `/logistica` 390,
  `/logistica/bandeja` 390 (provisional), `/logistica/fase/[fase]` 390, `/logistica/embarques`, `/logistica/embarques/[id]` y `/logistica/aduana` 410 (386,1, 385,7 y 382,3 medidos), `/logistica/vehiculo/[id]` 470, `/configuracion/roles` 410 (388,2 medidos con los niveles de acceso y «Quién crea y quién ve» dentro de la matriz; el «⋯» de cada nivel, sus modales y el cuadro van con `diferido()`);
  `/cotizaciones/papelera` 440 (en su spec).
- Medido: `/leads` 526,5 KB en 36 chunks y `/leads/[id]` 590,2 KB (el «+» y los «⋯» de los bloques de la derecha van en frío: `DropdownMenu` y `MasAcciones`
  viajan con el «⋯» de la cabecera). Al borde: `/cotizaciones` 391,2 de 400 (con el resumen en pestañas y su lectura sobre las fichas; el despliegue de un grupo y «Comparar» van con `diferido()`; con `<MenuDeVistas>` en
  frío serían 450: va con `diferido()`; la imagen del resumen, sólo su cáscara: `CLAVE_DEL_VISOR` por el barril del visor sumaba 2,5 KB, se importa de
  `use-carrusel`), `/cotizaciones/[id]` 488,8 de 500 (la rejilla, sus posiciones y el aspecto de la hoja pesan por sus tablas de clases, una por corte; la barra del vehículo de la cabecera va con
  `diferido()`, y con ella el panel de elegir otro vehículo en una preventa) y `/cotizaciones/nuevo` 478,3 de 480 (la posición de cada pieza viaja en frío con la hoja: `posiciones-de-la-hoja.ts` y `clases-de-la-posicion.ts`; la tarjeta del total como pieza, también: es una pieza más; nada del editor; lo de la hoja en par va con `diferido()`; el aviso de un cálculo pisado y la lista del resumen, también; el
  pedido del PDF va en su propia composición, sin la lectura de la tarjeta; el campo del título va con `diferido()` dentro del panel; los pasos de la hoja y el botón del ⚙ de la cabecera viajan en frío, su panel, los campos por defecto y los enlaces de la ayuda con
  `diferido()`) (`docs/PENDIENTES.md`).
- La hoja no lleva al navegador `diseno.ts` ni su Zod: las constantes de la rejilla viven en `rejilla-de-la-hoja.ts` (importarlas de `diseno.ts` suma 1,7 KB a cada
  ruta). dnd-kit (el orden del diseño y las asas de fila del editor de la tarjeta) viaja sólo en los `diferido()` de las pestañas «Hoja» y «Tarjeta»
  (`/configuracion/origenes/<id>/hoja|tarjeta`); lo que se sume a la hoja va con `diferido()` (el aviso de subasta cerrada suma 0,1 KB).
  La guardada viaja con la hoja nueva (`hoja-de-cotizar.tsx` importa su guardado).
- `/vehiculos` (el inventario): ≤ 530 KB, medido 506,8 en 33 chunks (los filtros «Subasta» y «Fase» y el orden por cierre con su ubicación: +3,4). El «⋯» de la fila sigue siendo un botón (su contenido se arma al abrirse) y sus
  paneles van una vez por lista con `diferido()` + `useAbiertoAlgunaVez()` (`listado/components/diferidos.tsx`): «Editar imágenes», la vitrina completa y
  «Actualizar los datos» no pesan en frío. Abrir «Editar imágenes» o la vitrina (`?panel=…&para=<id>`, `shallow: false`) vuelve a pedir la página de la
  lista al servidor, como `?editar=`; la página lee sólo el panel nombrado (la galería ≤ 24 con la subasta en un origen de subasta, o el vehículo por pk y,
  si se abre, `vehiculo_vitrina_previa`). «Actualizar los datos» es una consulta a apibara por confirmación, nunca al abrir el menú.
- `/vehiculos/[id]` (la ficha del vehículo): ≤ 545 KB, medido 541,0 en 35 chunks (sus paneles del «⋯» con su propio `diferidos-de-la-ficha.tsx`):
  «Cotizaciones de este vehículo» y «Actividad reciente» (las cáscaras de sus islas), la ficha completa (`?ver=ficha`, con `useAbiertoAlgunaVez`), la imagen de la aprobada y
  «Compartir» van con `diferido()`; la tira es la del visor; el panel de la vitrina es de cliente y su vista previa viaja con él. El documento de la ficha
  aporta 69,3 KB sobre `/perfil` (el perfil en tarjetas pesa unos 11 KB menos) con una cotización y lo mismo con 601 (`PRESUPUESTO_DE_LA_FICHA_DEL_VEHICULO_EN_KB` = 73;
  `e2e/vehiculos-ficha-dos-columnas.spec.ts`). Lecturas por pedido, tras su `<Suspense>` y en paralelo: `vehiculo_relacionados` (≤ 9 filas), la
  subasta y sus ajustes, la aprobada (`cotizaciones_aprobadas_de_vehiculos` con un solo id: por `cotizaciones_aprobadas_pkey` y `cotizaciones_pkey`, con el modo), los datos clave (`leerDatosClave`, 1 o 2 lecturas por PK; al documento viajan sólo sus ≤ 4 campos), la
  vitrina (`vehiculo_vitrina_previa`, una, la comparten la cabecera y el panel),
  los ajustes de la empresa (la zona y los días de «Actividad reciente»), el proyecto de repuestos (`proyectoDe`,
  `cache()`: una fila por `repuestos_proyecto_por_vehiculo`, la comparten el enlace corto y el aviso «Ver el proyecto de repuestos»), la limpieza y la
  resolución; desde el navegador, las fotos de la tira al montarse (≤ 24 miniaturas de 480 px, una lectura; la grande sólo en el visor y en la ficha
  completa), «Cotizaciones de este vehículo» (11 por página, de a 10 hasta 100) y «Actividad reciente» (`actividad_listar` por registro, ≤ 6 filas por
  su índice) al acercarse, y el layout activo al abrir la ficha completa. Sin caché de
  cliente: `router.refresh()` (también tras aprobar desde el bloque) y `revalidarVinculo()` vuelven a dibujar todos los bloques.
- El flujo (la pestaña «Fases» de un origen, `/configuracion/origenes/<id>/fases`, con su tope, abajo, y
  `/repuestos/configuracion/flujo`, 410,4 en 28, sin tope propio). El vacío de un flujo sin fases («Empezar con las fases de…») viaja con la
  página; su modal, con `diferido()`. De dónde copiar se lee sólo con el flujo vacío: una consulta por `fases` con tope de flujos. El diagrama (`@xyflow/react` y lo suyo) llega
  al dibujarse, con `diferido()`: un chunk de 63,2 KB gz (196,4 crudo, con la edición del lienzo) y 2,0 KB gz de CSS; ninguna otra ruta ni el marco lo nombran
  (`scripts/guardas/xyflow-diferido.test.ts`). Una sola lectura del flujo (los topes de `leerFlujoParaConfigurar`); hasta 200 cajas y 500
  flechas, con `onlyRenderVisibleElements`. Mover fases no lee nada: una escritura por arrastre soltado o por ráfaga de teclado (600 ms tras la
  última tecla), un lote con todas las movidas (`fase_posiciones_guardar`, hasta 200 por lote, una actualización por fila por la PK, sin auditar)
  y la recarga del flujo que ya hace toda edición; nunca una por tecla ni por cuadro del arrastre.
- Configuración (`/configuracion/*`, el inicio incluido), sin tope propio: el layout suma a cada página el menú de Configuración y la cabecera (Server
  Components) y las piezas de cliente chicas (la marca del enlace, la vuelta, el `<select>` del selector de sección y el buscador con su búsqueda, que
  filtra lo que el menú ya recibe más las `palabras` del registro, ≈ 2 KB más en el HTML); los íconos de las secciones se dibujan en el servidor y no
  cruzan como código; no importa `secciones.ts`, `permisos.ts` ni ningún barril de módulo. El inicio lee además, por streaming y sólo para quien abre Orígenes, `origenes_resumen()` (decenas de filas; el mismo costo que
  `/configuracion/origenes`) y, con una subasta activa, las integraciones; lo que falta se dibuja hasta 3 por tarjeta (inicio: 356,4 KB en frío).
  Los orígenes que la persona abre entran al menú como sub-ítems de «Orígenes» al pedir la página (`getOrigenes(true)`, con `cache()`, tope 20 con
  «Ver todos»): no cruzan como código, son enlaces del mismo menú.
- Configuración › Empresa (tarjetas de ajustes, cada modal con `diferido()` al abrirse por primera vez): JS en frío (KB gz, `.next-e2e`) `/empresa` 467,4,
  `/empresa/integraciones` 467,4 (las dos pagan el mismo `pantallas/configuracion-empresa`; la tarjeta del asistente de IA y su hook, 2,5 de eso),
  `/empresa/comprobantes` 358,9 (sin tope propio). Los usos del asistente (`asistente_ia_usos`: una fila por persona y mes) se leen en la misma
  pantalla con `asistente_ia_usos_del_mes()`: las 6 personas del mes que más lo usaron (`limit 6`) y el conteo con `limit 101` (la tarjeta muestra
  5 y «y N más», con «+» pasadas las 100), los dos por `asistente_ia_usos_mes_usos_idx` (`mes, usos desc, usuario_id`); contar un uso es un upsert por la
  clave primaria (`usuario_id, mes`).
- Configuración › Leads (seis tarjetas, cada modal con `diferido()` al abrirse por primera vez; sin tope propio): JS en frío (KB gz, `.next-e2e`) `/configuracion/leads` 405,1 contra 458,9 de `/configuracion/empresa` medida en la misma corrida.
- La puesta en marcha de un origen (topes en `e2e/soporte/presupuestos.ts`): `/configuracion/origenes/nuevo` 389,7 (tope 420: el formulario de
  Datos y el paso a paso; sin el marco del origen) y `/configuracion/origenes/<id>/puesta-en-marcha/formula` 461,4 (tope 470, con el bloque «Para todos los orígenes»: la planilla del paso, por el mismo
  `diferido()` de la pestaña; «Empezar en blanco» y «Copiar la de otro origen», por `pantallas/formulas-del-origen-empezar`). Los otros pasos reusan el
  editor de su pestaña y no llevan tope propio.
- La página de un origen: cada pestaña carga sólo su pantalla (`pantallas/origen-*`, `formula|diseno|plantilla|tablas|diseno-colores|configuracion`).
  JS en frío de las seis pestañas (KB gz, `medirJsEnFrio()` sobre `.next-e2e`; topes en `e2e/soporte/presupuestos.ts`):
  `/configuracion/origenes/<id>/fases` 450,3 (tope 460; el diagrama editable suma su barra y su asa al código en frío de la pestaña), `/planilla` 496,0 (tope 510; la planilla, por `PlanillaDiferida`; sus paneles, «¿Cómo se
  escribe?» y el drawer «Versiones», en su `diferido()`; el arrastre del número va con eventos de puntero, sin dnd-kit), `/hoja` 417,2 (tope 420; dnd-kit, el lienzo y el
  inspector del editor de la hoja, en su `diferido()`, y en frío la hoja con sus posiciones; «Publicar…» suma su botón, su modal va en el suyo; «+ Nuevo nivel» y «+ Nuevo color», en otro), `/tarjeta` 418,1 (tope 430; dibuja en frío el aviso de menos de 1.024 px y arma la lectura del lienzo; el
  editor llega por `diferido()`), `/campos` 409,9 (tope 420; el editor de campos de `shared`: el arrastre y el formulario del campo van en su `diferido()` y la búsqueda filtra en el cliente; la lista del combo del grupo y el cuerpo del drawer «Grupos», en los suyos) y `/categorias` 410,8 (tope 420 por la regla del 5 %: el layout del origen trae el grupo de campos y su orden). Cada pestaña paga en frío las migas con el selector de origen, el drawer
  «Datos» y su botón, el tooltip del ⚠ (que sólo lleva la página del origen: `PestanasConDesborde` lo recibe por `conAviso`) y, en las tres de la fórmula, la barra (el selector con su popover, el estado, «Versiones», «Tablas» y el lugar de
  «Guardar» y «Publicar…»). La lista del selector (con las archivadas), los paneles de cada fórmula (nueva, renombrar, activar, archivar,
  eliminar) y los de las tablas van por `diferido()`; la lista de las tablas se lee en el servidor sólo con `?panel=tablas`. `/configuracion/roles` 388,2 (la matriz con los niveles y el botón de «Quién crea y quién ve»; tope 410).
  La cabecera del origen (migas,
  encabezado, «Datos», el «⋯» y las pestañas con su ⚠) lee `origenes_resumen()` una vez por pedido (`leerElOrigen`, con `cache()`, la comparten la cabecera y
  la pestaña) y la lista de orígenes del selector (`leerOrigenes()`, la misma que el menú); no lee apibara: nada cuenta ni crece con las cotizaciones.
  `/configuracion/origenes/<id>` responde 308 a la última pestaña de la persona (`origenes.ultima_pestana`, una fila por su PK) con `route.ts`, sin
  `page.tsx` ni `loading.tsx` intermedios.
- «Para todos los orígenes» (`/configuracion/origenes`, para quien tiene `cotizaciones.configurar` en algún origen): JS en frío de la página 387,4 KB en
  29 chunks (sin tope propio; con el modal abierto por `?panel=colores` pesa lo mismo: los modales de Colores y Vigencia llegan por `diferido()` al abrirlos). Cada tarjeta lee lo suyo tras su
  `<Suspense>`: Colores, `tonos` (a lo sumo 48 filas, el tope de la base, por `tonos_pkey`/nombre; `limit` de la lectura) y Vigencia, la fila única de `ajustes_empresa`. Son dos lecturas
  chicas más sobre el pedido de la página: no cuentan ni crecen con las cotizaciones, y el costo en frío es el del código de las dos tarjetas (la tarjeta tocable, su límite de error y la lista
  corta de colores); la lista completa de colores (la fila con su «⋯») y el formulario de la vigencia sólo viajan al abrir.
- Las fórmulas del origen (el selector de la barra de la fórmula, `infra/formulas-del-origen/`): Planilla, Hoja y Tarjeta leen 51 filas por `formulas_del_origen_origen_idx` (`limit 51`) y
  dibujan hasta 50 (el tope de `formula_del_origen_crear()`, 22023 hint `formulas`), con su versión publicada y si tiene tarjeta por los índices únicos
  parciales, sin conteo exacto: a las 50, «Nueva fórmula» apagada con su aviso. Las archivadas se leen sólo al abrir su sección, de a 20 por cursor
  hasta 500 con `<AvisoDeTope>`. «Copia de otro origen» ofrece los orígenes de `getOrigenes(true)` (tope 100) y lee las fórmulas del elegido desde el
  navegador (tope 51). La elegida (`?formula=`) se lee por PK en su origen con `cache()`
  (`abrirLaFormulaDeLaPestana`) y versiones, borrador y tarjeta por los índices de esa fórmula; las versiones, sólo en la Planilla. Tablas de configuración (≤ 50 vivas por origen): sin `db:medir:volumen`.
- Configuración › Orígenes: la lista de tarjetas (su JS en frío, el de «Para todos los orígenes», arriba) muestra sólo los orígenes que la persona
  abre, con su tira de pasos de la misma lectura. Sin `diferido()` nuevo: el bloque de datos clave se ve apenas carga «Campos».
- «Vista y opciones» en las barras de los listados: en frío viaja sólo el botón (el panel, `Popover`, `Sheet` y las secciones van con `diferido()`); el
  botón viaja con `FilterShell` aunque la lista no lo dibuje.
- El `index.ts` de un módulo no exporta componentes: cada pantalla trae los suyos por `pantallas/<pantalla>.ts`. `scripts/guardas/barriles.test.ts`
  falla, con el camino, si un `index.ts` llega a un `'use client'`.
- **Trampa:** con `loading.tsx` importando el barril de pantallas, sumar un Client Component a la página baja dos chunks casi iguales (el de
  `loading` y el de `page`); por eso existe `pantallas/esqueleto-de-hoja.ts`. Se ve comparando `entryJSFiles` de
  `page_client-reference-manifest.js` entre dos builds.
- react-pdf no llega al navegador, pero estar en el grafo del servidor suma ≈ 0,45 KB al runtime de Turbopack de **todas** las rutas.
- El marco (shell): en el JS de toda pantalla viajan el menú lateral plegable (`LateralPlegable`, `ProveedorDelMenuPlegado`: un botón, un contexto y `Ctrl/Cmd+B`; sin librería nueva), el botón de la burbuja del chat, los botones «Recargar la página» y «Copiar el enlace de esta página» (el modal del enlace va con `diferido()`), `usePathname`, el store del contador y
  `useAlDescansar`; el cliente de Supabase, la suscripción, el panel, la lista, el hilo y el redactor van con `diferido()`. La campana: su
  contador con Realtime y su popover van con `diferido()` (sin eso `/cotizaciones` subía ≈ 66 KB). Una `chat_no_leidos` al montar y otra por
  ráfaga de señales (≥ 250 ms). Los tipos de cambio de la barra: en frío sólo el botón con los de la barra (≤ 3, `{id, nombre, monedaA, valor}`
  como props: de la misma lectura por request); el contenido del popover (la lectura con supabase-js, el editor y la action) va con
  `diferido()` y su código se adelanta al pasar el puntero. Al abrirlo, una `tipos_cambio_vigentes()` de ≤ 31 filas (un `limit 1` por tipo
  sobre `tipos_cambio_historial_tipo_idx` y dos búsquedas por `perfiles_pkey`), sin caché; tras guardar se relee sin esqueleto. Es una
  tabla de configuración: sin medición de volumen.
- Documento de `/perfil` (HTML con el payload RSC, sin comprimir) ≤ 124 KB (medido: 123,3, con los botones «Recargar la página» y «Copiar el enlace de esta página» del marco: regla del 5 %) (`PRESUPUESTO_DEL_DOCUMENTO_DE_PERFIL_EN_KB`), igual con la
  semilla y con 100 + 100 + 100 catálogos (± 1 KB): lo paga toda pantalla del marco. Las ≈ 30 acciones de la paleta viajan como props del
  hueco del buscador; el formulario de «Tu ficha en la web» se monta y se pide con `diferido()` al abrirla. El layout `(app)` no manda
  catálogos al alta: `<AltaDeLead>` no recibe nada y los lee del navegador (`infra/contexto-de-alta.client.ts`, memoria de 60 s en
  `shared/lib/memoria-de-lectura.ts`).
- Ficha del lead entera (`?seccion=` no cambia el documento; los grupos del layout y los teléfonos de «Ver más» no viajan en él: el modal se pide con
  `diferido()` al abrirlo): ≤ 138 KB sobre `/perfil` (`PRESUPUESTO_DE_LA_FICHA_EN_KB`),
  medido 84,8 con 10 oportunidades (hasta 3 por etapa dibujadas; el tablero con su arrastre `@dnd-kit` llega con `diferido()`), 3 de 10 seguimientos, el recordatorio más próximo, un vínculo, cuatro interesados y el portal,
  y 84,7 con 1.000 de cada uno (`e2e/leads-ficha-dos-columnas.spec.ts`; en el celular, 84,6); lo que más pesa es el HTML de los bloques con sus acciones (Relacionados, el
  portal, las filas de la línea de tiempo y de las oportunidades, cada una con su «⋯») y su payload RSC. Igual con la semilla y con 100 orígenes + 100 tipos (manda los campos
  activos y el origen y tipo del lead; el panel de edición los lee al abrirse, `leerCatalogosDeEdicion()`); `e2e/leads-ficha.spec.ts`. Al abrirla
  desde la fila del listado (sin prefetch: todo viaja con el clic), ≤ 39 KB de RSC (`PRESUPUESTO_DEL_RSC_DE_LA_FICHA_EN_KB`, medido 29,4 en escritorio y 28,5 en el celular). «Cotizaciones» lee 3 (+1) desde el navegador al acercarse
  a la vista (200 px), no con la ficha; su título con «Cotizar» viaja con el documento.
  «Cotizar lead» del «⋯» de la cabecera suma, para quien tiene `cotizaciones.crear`, `getOrigenes()` (una por request) y ~90 B.
- «Nuevo lead» es un solo drawer: 1 montaje y 1 entrada animada por apertura, 1 lectura de cada pedido (`e2e/leads-alta-un-drawer.spec.ts`).

- La página de una guía (`/configuracion/web/guias/[id]`, un editor de bloques; sin presupuesto propio: un documento con el editor en frío no es una pantalla que se pida a diario): medido
  362,5 KB en 25 chunks contra 362,6 KB en 26 antes del editor de bloques. Todo el editor (Tiptap, los bloques, la barrita, el panel, la vista previa) viaja con `diferido()` al abrir la guía;
  el esqueleto de `EsqueletoDeEditorDeArticulo` mide lo mismo que el artículo (sin saltos).

## Cotizador (fórmula, diseño, cotizaciones)

Salvo que se diga otro, mide `pnpm db:medir` en la base de la semilla; el tope en ms es la mayor mediana de varias corridas × 3, el de
buffers lo medido + 20 %, y la razón entre tamaños la fija el pedido. Cada guarda se prueba con una versión mala (cuadrática, N+1) que debe
fallar.

- `validar_formula()` (`medir-validar-formula.sql`): 200 nodos ≤ 26 ms, 2.000 ≤ 245 ms, razón ≤ 12. Es `STABLE`; la llamada va sobre una
  subconsulta con `offset 0` (inmutable, caería en Planning Time). 0 buffers.
- `evaluar_formula()` (`medir-evaluar-formula.sql`): 200 nodos ≤ 16 ms, 2.000 ≤ 136 ms, razón ≤ 12; con una columna comprimida ≤ 1,5 veces
  los literales. Una guarda de texto en `evaluar-formula.sql` (`db:probar`) cae si la pasada lee un argumento dentro de un bucle.
- `validar_diseno()` (`medir-validar-diseno.sql`): 206 ítems ≤ 15 ms, 2.018 ≤ 136 ms, razón ≤ 12; columna externa 206 ítems ≤ 320 buffers
  y 2.018 ≤ 2.000; comprimida ≤ 1,5 veces los literales. El sintético no lleva `texto` (no recorre `_diseno_auxiliares()`). Límite: el
  ayudante es lineal en filas × largo del texto; con textos de ≈ 2.000 caracteres pasa el tope desde unas 450 filas (no es guarda). Ninguna
  consulta del bucle nombra un arreglo: lo recibiría entero (cuadrático).
- Guardar y publicar (`medir-publicar.sql`; se repite sin `db:reset` porque compacta `formulas` antes de medir): `formula_publicar` 206
  ítems ≤ 55 ms y 2.350 buffers, 2.018 ≤ 550 ms y 20.600 (razón ≤ 12); `formula_guardar_borrador` ≤ 36 / 320 ms; `_compilar_visibilidad`
  ≤ 4 / 27 ms y, con columna externa, ≤ 60 / 375 buffers. El ⚙ (`formula_cambiar_constante`) ≤ 60 / 550 ms y 2.300 / 5.200 buffers;
  `formula_revertir` ≤ 60 / 600 ms y 2.700 / 21.600 (razón ≤ 12); sus topes de ms pasan los de publicar sólo por el redondeo. Sondas de uso
  (`_tono_en_uso`, con sus dos ramas, y `_nivel_uso`; `formulas_tonos_idx`, `formulas_tonos_del_diseno_idx`, `formulas_niveles_idx`, CTE
  `materialized` para que el GIN conduzca): se miden por crecimiento: 1.800 versiones más suman ≤ 1/3 de lo que suma una copia sin GIN, y
  cada sonda usa su GIN con el plan genérico. Medido con el aspecto: publicar 20,4 / 192,6 ms y 1.573 / 2.550 buffers; el ⚙ 19,8 / 184,8 ms y
  1.992 / 4.494 buffers; revertir 19,8 / 189,4 ms y 2.342 / 18.199; `validar_diseno()` con columna externa 290 / 1.860 buffers (lee sus
  secciones una vez: releerlas del parámetro por sección pasaba de 13.000).
- `_nodos_visibles()` (`medir-nodos-visibles.sql`): razón 255 → 2.487 nodos ≤ 12 en ms y buffers, ≤ 20 ms con 2.487, nunca más que leer la
  fila de la fórmula + 600 buffers. `_nivel_uso()` ≤ 100 ms con 2.000 versiones; `niveles_con_uso()` (9 niveles en uso) ≤ 60 ms con 200
  versiones por nivel y ≤ 400 con 2.000.
- `cotizacion_hoja()` (`medir-cotizacion-hoja.sql`): la hoja de las capturas como dueña ≤ 16 KB y 10 ms; `planilla_usa` ≤ 10 ms; con una
  tabla viva de 1.000 filas ≤ 12 bloques de `tablas_referencia_filas`; sintética de 255 nodos ≤ 25 ms, de 2.487 ≤ 300 ms, razón ≤ 15; 0
  bloques de `cotizaciones` y `cotizaciones_revisiones`. Lineal (~140 B por ítem); un diseño publicable tiene ≤ 40 ítems
  (`demasiados_items`). Las sintéticas no producen ningún dato: el camino con `dato_del_vehiculo` lo miden las semillas. Una sola función SQL
  por nodo: cada llamada de más a una función con `set search_path` cuesta ~50 µs por ítem. **El aspecto no la hace crecer:** la hoja de
  las capturas con aspecto en la cabecera, en cada sección y en cada ítem lee los mismos bloques de cada relación que la de siempre (lo
  afirma la medición) y bajo el mismo tope de 10 ms (medido 5,0 sin y 5,4 con); pesa 3.045 B más (10.868 → 13.913 B, ~64 B por pieza, bajo
  el tope de 16 KB). Un diseño sin aspecto, +0 B. **La ayuda en bloques cabe:** la de la captura 04 (dos títulos, un texto, dos tablas con
  sus columnas, lo que llenan y «Tu vehículo», y dos enlaces) en las tres celdas de «Impuestos» pesa 13.106 B (+2.103 sobre las capturas) y
  tarda 6,3 ms, bajo los mismos topes de 16 KB y 10 ms (lo afirma la medición).
- La hoja de una guardada (`cotizacion_hoja_guardada()`, `medir-cotizacion-hoja-guardada.sql`, 50.000 y 250.000): ≤ 20 ms y 1.500
  buffers, razón de `cotizacion_crear`, 0 recorridos de `cotizaciones` (la anterior por la clave; la nueva viva por `cotizacion_padre_id`),
  `_nodos_visibles` 2 veces y la respuesta de la dueña ≤ 14.230 B. Guarda: buscar la nueva sin índice recorre.
- Versiones de la fórmula (la pestaña «Planilla» de una fórmula del origen, `infra/formula/consulta-de-versiones.ts`): PostgREST de a 20 + 1 por
  cursor sobre `formulas_formula_del_origen_id_version_key` (`version < n`, la serie de la fórmula de la URL), sin `definicion`, `params`, `diseno` ni `visibilidad`; tope 500 con «Ir a la
  versión»; la primera página, el estado (`limit 2`) y los autores en el servidor, «Ver más» desde el navegador. El plan lo fija
  `supabase/tests/areas/formula/versiones-por-cursor.sql` (`db:probar`); falta su `EXPLAIN` en `db:medir:volumen`.
  `configuracion-cotizacion-formula.spec.ts`: «Ver más» ≤ 4.650 B, ≤ 127 nodos con 20 y ≤ 3.151 con 500. Publicar, revertir y descartar: un
  pedido por envío y relee la primera página.
- Pestaña «Tarjeta» (`e2e/configuracion-cotizacion-tarjeta-volumen.spec.ts`): con 500 miembros y la cuadrícula más grande que admite la forma 2 (16 × 120 y
  las celdas de texto que entran en 24 KiB: 193; 1.000 no caben, manda el tope en bytes), primer HTML ≤ 280.700 B y ≤ 5.000 nodos (medido 267.903 B y 4.135
  nodos: 193 celdas dibujadas, 1.727 casillas vacías de un nodo sin hijos cada una, 120 filas con su asa, las cabeceras y el panel; la puesta en marcha suma
  un chunk que nombra cada referencia de cliente del payload, y el grupo `(pestanas)`). Crece contra el editor de
  bloques (183.947 B) porque el contexto reducido lleva todos los nodos del nivel «todos» con su descripción (los ofrece «Dato») y la cuadrícula viaja entera;
  y por la cabecera de la página del origen (migas con el selector, encabezado, pestañas, la barra de la fórmula y el esqueleto de cada nivel, que el payload
  lleva dos veces): ≈ 40 KB fijos, que no crecen con los miembros ni con la cuadrícula (el editor con sus datos es una sola fila de 104 KB);
  la inicial y la guardada son el mismo objeto. La referencia es una fila de `cotizaciones_listado()` por `cotizaciones_origen_creado_idx` más las lecturas
  del PDF, en paralelo con la plantilla, recortada a los nodos del contexto reducido. El editor (lienzo, panel, dnd-kit y atajos: 26,4 KB gz, más dnd-kit, 15,0, el chunk que comparte con el orden del diseño), el modal de
  publicar y el diálogo de descartar van por `diferido()`; «Dato» dibuja 50 («Escribe para acotar.»). Deshacer guarda hasta 100 instantáneas en memoria.
  `pantallas/tarjeta-plantilla.ts` no entra a la hoja. El JS en frío de la pestaña, en «JS en frío» (`/tarjeta`, tope 430).
- Planilla de la fórmula (`e2e/configuracion-cotizacion-formula-planilla-volumen.spec.ts`): abrir la pestaña lee una fila de `formulas` por
  `formulas_pkey` (`definicion`, `params`, `estado`, `diseno`, `nota`) desde el navegador: con 600 filas ≤ 80.900 B; también el terreno de la
  vista previa (abajo) y el catálogo de colores (≤ 48 filas, seis columnas de colores); en el servidor, en paralelo con la fórmula, la plantilla de
  la tarjeta (la lectura de la pestaña «Tarjeta», con lo que nombra). Nada se relee al tipear, al aplicar ni al insertar, mover o eliminar una
  fila. Dibuja hasta 500 filas (`TOPE_DE_LO_CARGADO`) con `<AvisoDeTope>` y «Buscar fila»: ≤ 6.300 nodos. El «⋯» y el clic derecho de las filas,
  las sugerencias y los bordes de las referencias son una sola instancia, no uno por fila; la sesión, la planilla, la tarjeta en vivo y los
  paneles (banda, total, tipo de celda y «¿Cómo se escribe?», que abre el libro de la barra de fórmula) y el modal «Información de la fórmula» van por
  `diferido()`, y arrastrar el número usa eventos de puntero, sin dnd-kit. El resultado al lado (`resultadoAlLado()`) compila, valida y evalúa la
  fórmula entera una vez por pausa de 150 ms, O(filas), en el chunk de la planilla (`resultado-al-lado.escala.test.ts`: razón por fila ≤ 1,1 entre 60 y
  600 filas); el e2e con volumen pide la cifra ≤ 1 s tras tipear en la última de 600.
  La hoja numerada (`hojaDeLaPlanilla()`), `aA1()`, `deA1()`, «de dónde sale», los usos de cada fila (`indiceDeUsos()`) y las bandas son O(filas),
  una vez por fórmula de trabajo; tipear en la unidad de ejemplo o cambiar el modo sólo vuelve a correr `evaluar()` (lineal). El estado de
  las filas es O(filas × nodos), una vez por fórmula de trabajo; filtrar y tipear no lo recalculan
  (`use-editor-de-la-formula.soporte.escala.test.ts`: razón cuadrática ≤ 1,1). Abierto: con miles de filas pasa de 1 s. Compilar y validar
  corren en el navegador al aplicar. La vista previa: 3 pedidos en el caso habitual (tipos de cambio; tablas vivas; sus filas por páginas de
  `limit(1000)` por `tablas_referencia_filas_tabla_orden_idx`) y ≤ 8, constantes; una tabla se lee si tiene ≤ 999 filas, ≤ 40 tablas. Falta
  el `EXPLAIN` de esas lecturas en `db:medir:volumen`. Guardar el borrador es una Server Action sin releer, de menos de 1 MiB con 600 filas; un
  diseño de 2.000 ítems queda bajo el tope de 1 MB de una Server Action (`use-guardar-borrador.soporte.test.ts`).
- `cotizacion_tabla()` (`medir-cotizacion-hoja.sql`): la tabla viva de 1.000 filas (`tablas_referencia_filas_tabla_orden_idx`,
  `limit 1001`), con y sin la hoja abierta, ≤ 25 ms; la firma suma ≤ 3 ms; ≤ 569.352 B la dueña (filas enteras) y ≤ 52.752 la asesora (año y
  factor); 0 bloques de `cotizaciones`. Quien configura recibe las filas sin recortar a `columnas`.
- `cotizacion_evaluar()` (`medir-evaluar.sql`, `db:medir:volumen`, 200 llamadas, 50.000 y 250.000): fórmula del seed mediana ≤ 10 ms y
  p95 ≤ 20; sintética de 200 nodos con 4 tablas de 1.000 filas p95 ≤ 50; p95 con 250.000 sobre 50.000 ≤ 1,5. Guarda de ARMAR:
  ≤ `1,2 × (páginas + 4 × (hojas + 3) + costo fijo)` buffers, y los bloques de `tablas_referencia(_filas)` ≤ los de la consulta de referencia + 2
  (cae con una tabla de más o N+1). La firma de la hoja abierta suma ≤ 3 ms.
- `cotizacion_crear()` (`medir-cotizacion-crear.sql`) y `cotizacion_guardar()` (`medir-cotizacion-guardar.sql`), 50.000 y 250.000:
  ≤ 20 ms y 1.500 buffers (la sintética de guardar ≤ 60 ms y 1.000); 0 recorridos de `cotizaciones` o sus revisiones
  (`pg_stat_xact_user_tables.seq_scan`); razón ≤ máx(1,5 × t; t + 3 ms), buffers ≤ 1,2 × + 20. Cada corrida reescribe la fila del vehículo
  (`cotizado_en`; `pg_temp.sin_cotizar()` antes de cada `explain`, delta de `n_tup_upd` exigido). El intento se busca por `cotizacion_id`.
  **Cotizar encima** (`cotizacion_encima()`, `medir-cotizacion-encima.sql`): los mismos topes, una anterior distinta por corrida. Guarda: la
  nueva viva buscada sin `cotizaciones_encima_unica` recorre.
- Lectura (`medir-cotizaciones-lectura.sql`): páginas de 101 por cursor `(creado_en desc, id desc)` como la dueña, Ana y la chica ≤ 10 ms
  y 300 buffers; `cotizacion_leer` ≤ 10 ms; `cotizacion_revisiones` (500, con autor y etiquetas sobre la página recortada) ≤ 12 ms; razón
  con 250.000 ≤ máx(1,5 × t; t + 3 ms); 0 llamadas por fila a `en_cartera`, `alcance_de` y `mis_leads()`, ≤ 2 a `origenes_con_alcance`;
  `cotizacion_leer` y `cotizacion_revisiones` piden `alcance_de` 1 vez, también con «propios».
- El listado `/cotizaciones` (`medir-cotizaciones-listado.sql`, `db:medir:volumen`): `cotizaciones_listado()`, invocadora, páginas de
  `MAXIMO_DE_PAGINA_DE_COTIZACIONES` + 1, la 1, una profunda y una hacia atrás, con 50.000 y 250.000. Rutas: «todos» por
  `cotizaciones_listado_idx` (con la final, `cotizaciones_finales_idx`) o, con el origen o si «todos» no cubre todos los orígenes, un lateral
  por origen sobre `cotizaciones_origen_creado_idx` (`cotizaciones_origen_finales_idx`); lo propio por `cotizaciones_creador_idx`; la
  cartera, un lateral por lead de `mis_leads()` sobre `cotizaciones_lead_creado_idx`; el vehículo por `cotizaciones_vehiculo_creado_idx`; con
  `p_lead` (`?lead=`), una sola ruta por `cotizaciones_lead_creado_idx`, sin la cartera. La clase nunca es columna de un índice (`enum_eq` no
  es leakproof). Topes: la dueña y la chica ≤ 10 ms, Ana y Teo ≤ 50 (Ana con un vehículo de 5.005 o un lead ajeno, ≤ 100); la dueña ≤ 116
  bloques de `cotizaciones`; con 250.000 ≤ 1,2 × los bloques de 50.000 + 20 y ≤ máx(1,5 × t; t + 3 ms); `mis_leads()` 1 vez si va la cartera
  (ninguna con `p_lead`), `origenes_con_alcance()` ≤ 2 + 2 por ruta, `en_cartera()` ≤ una por fila leída de la cartera o del vehículo,
  ninguna a `alcance_de` ni a `_bajas_en_curso`; los índices de cada caso por nombre y ningún otro con bloques. Máximo de la base: 100 (la pantalla pide hasta 50, `MAXIMO_DE_PAGINA_DE_COTIZACIONES`).
  Una privada ajena (glosario: «Cotización privada») se descarta como filtro sobre la fila que la ruta ya leyó, sin índice que la salte: quien ve «todos» sin
  `cotizaciones.privadas.ver` lee de más en proporción a las privadas ajenas. La siembra de volumen no tiene privadas (`docs/PENDIENTES.md`).
  El bloque «Cotizaciones» de la ficha del lead (`cotizaciones_listado(p_lead)`, 10 + 1 por `cotizaciones_lead_creado_idx`, más los autores por la PK de `perfiles`, los modos por `cotizaciones_modos_de()`
  y las aprobadas por `cotizaciones_aprobadas`, sólo de las 10): la fila de tarjetas. Se lee al acercarse a la vista, con `diferido()` en su `diferidos.tsx`; lo demás, en la tarjeta «Ver más»
  (`/cotizaciones?lead=`); `e2e/leads-cotizaciones.spec.ts`: la respuesta del listado ≤ 6.500 B.
  **La lista agrupada por vehículo** (`cotizaciones_listado_por_vehiculo()`, `medir-cotizaciones-listado-por-vehiculo.sql`, `MEDIR_SOLO=medir-cotizaciones-listado-por-vehiculo
pnpm db:medir:volumen`): invocadora, páginas de `MAXIMO_DE_PAGINA_DE_COTIZACIONES` (50) grupos + 1. Recorre lotes de `_cotizaciones_lote_del_listado()` (las rutas e índices del listado, sin la del
  vehículo; el primero de 4 × la página (204), duplicándose hasta 2.020 leídas: si no llena la página, `cortada`); hacia adelante sólo la primera de cada vehículo en la lectura
  pregunta si hay otra más nueva antes del cursor (una sonda `limit 1` por `cotizaciones_vehiculo_creado_idx`; sin cursor, ninguna); la cabeza por
  `cotizaciones_pkey` y `cotizaciones_aprobadas_pkey` en laterales con `limit` (sin ellos el plan genérico hacía un hash join que recorría la tabla entera: 63.000
  bloques y 2 s para Ana); el conteo, `limit 101` por `cotizaciones_vehiculo_creado_idx`, o lo leído si la lectura llegó al final. No lee `vehiculos`. Medido con
  250.000 y páginas de 50 (igual con 50.000, bloques ≤ 1,2 × + 20): la dueña 5–12 ms (600–2.200 bloques), Teo 5–6, la «chica» 3, Ana 6–24 ms (≈ 9.000 bloques:
  la cartera de 1.000 leads en cada lote) y 57 ms con el lead del vehículo de 5.005 del que ve 5 (cuenta lo leído y salta las sondas repetidas).
  Topes: la dueña y la chica ≤ 30 ms, Ana y Teo ≤ 100; un lote por página en todos los casos.
  **La miniatura de la imagen** (`?ancho=480`): la lista pide la imagen de la tarjeta achicada (`sharp`, al armarla), a la vista y de a cuatro, con su propia
  ETag (304 al volver). La grande, sólo en el visor.
  **La cotización aprobada** (`cotizaciones_aprobadas`, una fila por vehículo; `medir-cotizaciones-aprobadas.sql`, `db:medir:volumen`): tres lecturas por página, todas
  de ≤ 100 ids y una consulta, en paralelo con lo que ya se lee: el «Costo estimado» de la lista de vehículos por la RPC `cotizaciones_aprobadas_de_vehiculos()`
  (invocadora: `cotizaciones_aprobadas_pkey (vehiculo_id)`, cada cotización por `cotizaciones_pkey` y `_nombre_del_modo()` una vez por versión y modo), el
  listado de cotizaciones por el único `cotizaciones_aprobadas_cotizacion_id_key` con `.limit(ids.length)` y el historial (embebido en su misma lectura, con el
  alias `a` por los bytes de `TOPE_DE_BYTES`); más la marca de la guardada por clave primaria, tras `<Suspense>`. Con 50.000 cotizaciones: la dueña ≤ 10 ms y
  ≤ 600 buffers (listado: medido 0,5 ms y 156), la RPC de vehículos ≤ 1.000 buffers (medido 2,2 ms y 820 con un modo en las 100: ≈ 4 por fila al leer la
  cotización con su RLS y ≈ 100 por versión al mirar el permiso del nombre; 3 llamadas a `_nombre_del_modo()` para 3 versiones), sin recorrer la tabla; Ana, sin assert. La reposición al confirmar (`_aprobada_reponer()`, un vehículo con 100 y otro con 1.000 cotizaciones) lee 4 bloques de
  `cotizaciones` en los dos casos (`cotizaciones_vehiculo_creado_idx` hacia atrás, la primera fila): no crece con N. La siembra de volumen llama
  `_cotizaciones_aprobadas_rellenar()` (inserta sin triggers). La isla de la guardada suma ≈ 1,5 KB a `/cotizaciones/[id]` (sin Base UI nuevo).
  La pantalla (`e2e/cotizaciones-listado.spec.ts`, `e2e/listas-por-pagina-volumen.spec.ts`): una vista, 8 columnas, el máximo sin pedidos
  del navegador ni acciones: ≤ 39.500 B y ≤ 2.200 nodos; diez «Siguiente» no los suben. El resumen `?cotizacion=`: abrir desde la fila no
  le pide nada a la página ni a la lista; lee la pestaña «Todo» (sus tres lecturas, abajo); «De este vehículo» (quinta pestaña, sólo con vehículo) lee al elegirla; fuera de la página cuesta un pedido por `cotizaciones_pkey` y un `cotizaciones_listado()` de tamaño 1, más sus tres nombres.
  `router.refresh()` sólo si la URL trae una que nadie trajo (una vez por id) y en cada «Reintentar». Los nombres de la página (cliente,
  vehículo, autor) son tres lecturas por PK de ≤ 100 ids en paralelo (`leads_vista_por_ids`, `vehiculos_pkey`, `perfiles_pkey`): límite sin
  assert.
  **Las pestañas del resumen** (`e2e/cotizaciones-listado-pestanas.spec.ts`; sin lectura nueva en la base, sólo las ya medidas: `cotizacion_comentarios` y
  `cotizacion_revisiones` por sus índices y `cotizaciones_adjuntos` por `cotizaciones_adjuntos_cotizacion_id_idx`, `limit 21`; los comprobantes, por
  `comprobantes_cotizacion_id_idx`, `limit 21`). Cada pestaña se lee al elegirla, con su `diferido()`, de a `TAMANO_DE_VER_MAS` y hasta `TOPE_DE_LO_CARGADO`. «Todo» pide una página de
  cada fuente al abrirse (tres lecturas en paralelo) y dibuja sólo hasta donde llegó la que menos retrocedió; «Ver más» le pide la siguiente sólo a esa fuente y se detiene al
  sumar `TOPE_DE_LO_CARGADO` entre las tres. `/cotizaciones` no paga su código (las pestañas llegan con el resumen, que ya es diferido); `/cotizaciones/[id]` no cambia.
  Límites sin assert: el costo fijo de cada llamada, ≈ 160–240 buffers de `mis_permisos()` (`docs/PENDIENTES.md`); la preventa
  va por filtro; Ana «finales» filtra la clase sobre sus propias; con un vehículo muy cotizado, un `en_cartera()` por cada ajena; una tanda
  contigua en la papelera dentro de un índice entero se lee antes de descartarse. Los `count(*)` por origen de `origenes_resumen()` y del
  borrado de un origen recorren la tabla (tope 100 ms con las 50.000 sembradas; el total exacto está en `docs/PENDIENTES.md`).
- **La hoja en par** (glosario: «Variante en par»; `e2e/cotizar-hermanas.spec.ts`): la celda gemela suma los nodos de una celda y ninguno más; con la fórmula de
  prueba (una común y una en par) `[data-hoja]` mide 116 nodos (su prueba la topa en 500; el techo de la hoja es 525). Lo del par va en su chunk diferido (`PantallaDeCotizarEnParDiferida`,
  `PantallaDeUnParGuardadoDiferida`): en frío sólo viajan el ítem que reparte las celdas en par y las piezas del resumen (el JS en frío de `/cotizaciones/nuevo` y
  `/cotizaciones/[id]`, en «JS en frío»). Al abrir la hoja nueva en par, dos primeros cálculos en paralelo
  (`recalcularAlAbrirEnPar()`); la guardada en par, cuatro llamadas desde el servidor en paralelo (las dos hojas y sus dos `cotizacion_evaluar`). Recalcular, dos
  pedidos por pausa (uno en vuelo por columna). En la base, crear y guardar en par cuestan lo de dos altas o dos guardados (llaman dos veces a
  `cotizacion_crear` y `cotizacion_guardar`, que miden `medir-cotizacion-crear.sql` y `medir-cotizacion-guardar.sql`); `cotizaciones_hermana_unica` sostiene
  quién apunta a una cotización (la papelera y el `set null` de la purga).
- La hoja dibujada (`e2e/cotizar-hoja-200.spec.ts`, 100 % y 200 %): `[data-hoja]` más la ranura de la cabecera y «Avanzado» abierto ≤ 525 nodos con la
  fórmula más grande, como quien cotiza sin ⚙ (~12 nodos por celda: la celda en una fila no lleva el envoltorio de la cabecera); mide 449 al abrir y 493 usada
  (con ⚙, 518 y 565 de 585; el bloque «Avanzado», 1: un envoltorio por hoja), con los pasos de la hoja («Privada · Vista previa»), la región del total, el cierre y un cálculo pisado (24 nodos: la región del
  aviso, 1, en frío; el aviso de la primera vez, 11, y la línea de lo pisado bajo el total, ≈ 5, con `diferido()`; la marca y «Calculado» de la celda, 7). El techo es 500 más un 5 % (`docs/DECISIONES.md` ›
  «Pisar un cálculo»): lo que sume nodos a la hoja va con `diferido()` y, si pasa de 525, se recorta. El aspecto
  (rejilla, espacios, letra y color) y la posición (tres variables en el estilo en línea de cada pieza y una de las filas en cada rejilla) van en clases y
  variables sobre los nodos de siempre: ningún nodo por celda ni por sección. Al abrir,
  2 llamadas desde el servidor (+ `leerVehiculo` con un vehículo en la URL, + `leerClienteElegido` con un `?lead=`, + `integracionActiva`
  con `vehiculos.crear` en un origen de subasta, todas en el mismo `Promise.all`) y ninguna del navegador hasta abrir un panel; después un
  pedido por pausa de tecleo, con 1 en vuelo como máximo (`e2e/cotizar-hoja.spec.ts`).
- El ⚙ de una constante (`e2e/cotizar-ajuste-constante.spec.ts`): como quien configura, cada ⚙ son exactamente 3 nodos (botón, `svg`,
  `use`), el ⚙ de la cabecera son 7 (la fila junto a los modos, el botón, su `svg` y sus cuatro trazos) y la subasta ≤ 585 nodos (techo 600; mide 528 al abrir
  y 575 usada, con un cálculo pisado); las dos personas ven las mismas celdas. Ningún pedido al abrir la hoja ni al pasar por una
  celda; abrir un ⚙ lee una fila, la publicada de la activa (`formulas_del_origen_activa_unica` y `formulas_publicada_unica`), ≤ 70 B. Panel, hook, lectura y action con `diferido()`.
- El ⚙ de un tipo de cambio (`e2e/cotizar-ajuste-tipo-cambio.spec.ts`): una llamada a `formula_tipo_cambio_del_nodo()`, ≤ 247 B; tras
  cambiarlo la hoja no relee. Bloque, hooks y action de `empresa` van con el panel por `diferido()`.
- Vista previa de la tarjeta (`e2e/cotizar-vista-previa.spec.ts`): ninguna lectura al abrir la hoja; suma un paso a la fila de los pasos de la hoja;
  el modal va en un portal, fuera de `[data-hoja]`, con `diferido()`. Al abrirlo, una `cotizacion_tarjeta()` por versión de la fórmula,
  recordada 5 min (`memoriaDeLectura`): ≤ 18.700 B como la dueña y ≤ 130 nodos la tarjeta (17.929 B y 125 nodos medidos con la plantilla de
  `subasta_usa` convertida a la cuadrícula, más un 5 %: la respuesta lleva la cuadrícula entera). Lo acota la forma (≤ 16 × 120 casillas, ≤ 1.000
  celdas, 24 KiB); la geometría es O(celdas + filas + columnas) y sólo viaja en el chunk del modal. «Copiar
  texto» no lee nada y «Descargar PDF» es un pedido por clic; los dos van fuera de `[data-tarjeta-de-cotizacion]`, en el chunk del modal.
- La página de una guardada lee en serie `cotizacion_hoja_guardada`, `cotizacion_evaluar(p_cotizacion)` y, con la hoja, el cliente y el
  vehículo por su nombre. Guardar: una `cotizacion_guardar`. Tras `<Suspense>` y con `cache()`, tres lecturas por PK en paralelo: la fila
  (`estado`, `reportes_count`), la favorita propia y el reporte propio (`(cotizacion_id, usuario_id)`). El Confirmar de moderar lee los
  reportes de esa cotización, ≤ 21 (uno por persona).
- «Enviar a la papelera» y «Marcar final» en la guardada: ninguna lectura nueva al abrir; cada acción es una RPC con su `revalidatePath`. El
  hueco es un Server Component y al navegador llega un `<button>` con las clases de `<Button>`; `<Confirmar>`, la action y su función van
  con `diferido()`.
- PDF de la tarjeta (`e2e/cotizar-pdf.spec.ts`): una cotización por PK — `cotizacion_hoja_guardada`, `cotizacion_evaluar(p_cotizacion)`,
  `cotizacion_tarjeta`, asesor y vehículo por PK y `leerAjustes()` (una RPC más que `getAjustes()`); el logo ≤ 1 MB con 2 s de espera. Topes:
  150 KB y 1,5 s (40.406 B y 150 ms medidos con la cuadrícula: una página A4). La tarjeta de lo guardado lo ofrece con un `<a download>` sin JS.
  La imagen de la tarjeta (`imagenDeUnaGuardada()`) sale al ancho de la tarjeta (≤ 1.600 px) y carga `next/og` sólo con `import()` en el servidor.
- **Imagen de la tarjeta** (`GET /cotizaciones/<id>/imagen`): una llamada a `cotizacion_imagen_huella()` (la cotización, el cliente, el vehículo, el perfil
  de quien pide y los ajustes por PK, la plantilla por índice único, y los catálogos de colores y tipos de cambio, decenas de filas) y, con la ETag igual, 304
  sin nada más; si no, lo del PDF de una cotización más el WebP (`sharp`, sólo en el servidor), sin escribir nada. Una lista de N imágenes son N pedidos
  independientes, nunca una lectura por fila dentro de otra, y la página pide **a lo sumo cuatro a la vez** y sólo las que están a la vista (200 px antes;
  `useCargaDeLaImagen()` sobre `crearCola()`; la que sale de la vista antes de su turno deja la fila): sin la cola, una página de 50 tarjetas serían 50
  armados en paralelo. `private, no-cache` con ETag: el navegador revalida con un 304. `Server-Timing` dice lo que tardaron la huella y el armado. Medido
  en `e2e/cotizaciones-imagen-de-la-tarjeta.spec.ts` (build de producción local, mediana de 5): el armado, 502 ms a 480 px (13.754 B) y 627 ms a 1.600
  (35.222 B); el 304, sólo la huella (8 a 59 ms). La lista de 21 tarjetas en escritorio: nunca más de 4 en vuelo, y las miniaturas a la vista cargan en
  2,9 s en frío (52.482 B) y en 0,8 s al volver (0 B: el navegador revalida y recibe 304).
- Tarea de oro 2 (`e2e/cotizar-tarea-de-oro*.spec.ts`; deterministas: una parada nueva en el camino las rompe): robot < 30 s y KLM ≤ 90 s.
  Teclas de control: el tramo de la hoja hasta el PDF ≤ 29; con el panel del vehículo ≤ 29; con un enlace de subasta, exactamente 33; con
  el cliente, ≤ 29 si existe y ≤ 30 si es nuevo. Cada lado editable de la hoja y de «Avanzado» se alcanza con Tab, en orden.
- El panel de la ayuda de una tabla (sin spec propio): dibuja las primeras 1.000 filas con el aviso «Mostrando las 1.000 primeras filas.»
  (7 nodos por fila); una lectura por apertura, nunca con la hoja; el panel va en un chunk diferido.
- Comprobantes de una cotización (sin volumen: no crece): la guardada los lee una vez por pedido (`cache`), `limit TAMANO_DE_VER_MAS + 1`
  por `comprobantes_cotizacion_id_idx`, más el `estado` por PK. La serie vigente de Empresa es una fila. El aviso «Mostrando los 20 más
  recientes.» no ofrece camino (haría falta anular 20 veces una cotización; si pasa, «Ver más» por cursor `(emitido_en, numero)`). Emitir y
  anular van por `diferido()`.
- Comentarios de una cotización (sin medir con volumen): `cotizacion_comentarios()` lee las raíces de la más nueva a la más vieja por cursor
  `(creado_en, id)`, de a `TAMANO_DE_VER_MAS` (máx. 50), por
  `cotizaciones_comentarios_raices_idx (cotizacion_id, creado_en desc, id desc) where padre_id is null`, y por raíz sus primeras 20
  respuestas (máx. 50) por `cotizaciones_comentarios_respuestas_idx (padre_id, creado_en, id)`; `cotizacion_comentario_respuestas()` sigue
  por el mismo índice. ≤ 21 raíces × 21 respuestas por llamada. Borrar quita la fila salvo
  una raíz con respuestas vivas. Presupuesto a fijar al medir (1.000 comentarios y 500 respuestas: sin `Sort`, sin crecer entre 100 y
  1.000). Adjuntos ≤ 20 por cotización (`cotizacion_adjuntar` cuenta con `limit 20`), leídos con la primera página por
  `cotizaciones_adjuntos_cotizacion_id_idx` (`limit 21`); una URL firmada por clic; sin miniaturas. La pantalla lee al llegar la sección a la
  vista, dibuja ≤ `TOPE_DE_LO_CARGADO` entre raíces y respuestas («Ir a una fecha»: cursor `(inicio del día siguiente, uuid nulo)`); todo
  por `diferido()`.

## La rueda por rol

- `web.solicitar_asesor` y `web_expirar_solicitudes` evalúan `puede_estar_en_la_rueda()` por candidata (`usuarios_roles_pkey`,
  `roles_permisos_rol_clave_idx`). `medir-rueda.sql` (`db:medir:volumen`; 500 personas en la cola, 50.000 y 200.000 solicitudes): la
  elección ≤ 40 ms, `estado_cola_web` ≤ 40, `solicitar_asesor` ≤ 60, `web_expirar_solicitudes(20)` ≤ 800 ms; razón con 4 veces las
  solicitudes ≤ 1,5 (piso 3 ms). Las abiertas por persona, por `solicitudes_web_asesor_abiertas_idx`. Crece la cola, no las solicitudes.
- `cola_web_tablero()` (sin volumen): ≤ 201 habilitadas (`_acotar_pagina(p_tope, 100, 200)`), una `puede_estar_en_la_rueda` por fila y las
  abiertas por `solicitudes_web_asesor_abiertas_idx` (conteo exacto a propósito, acotado por el cupo ≤ 50). `cola_web_solicitudes()`: 21
  filas (`_acotar_pagina(p_tamano, 20, 50)`) por `solicitudes_contacto_web_estado_creado_idx (estado, creado_en desc, id desc)`, y el título
  por `id` de `web.vehiculos`.
- `/configuracion/cola-web`: tres lecturas al abrir (tablero, primera página de «Sin asignar», `ajustes_web`); «Ver más» de a 20 desde el
  navegador hasta 500; «Actualizar» y volver a la pestaña repiten las tres, nunca lo cargado.

## Formas de pantalla (cajas, al 100 y al 200 %)

- El panel de filtros va al costado si el contenedor del listado mide ≥ 40 rem (15 de panel + 1 de hueco + 24 de lista); si no, hoja.
  Ninguna pantalla se ensancha al 200 % (`sinScrollHorizontal()`), el texto no se corta (`sinTextoCortado()`, `exigirMarcadorQueCabe`) y los
  botones del pie del modal miden 44 px.
- La barra del listado: las cajas siguen el orden de lectura; el buscador mide 44 × 44 px y desde 24 rem muestra «Buscar» entero
  (`barra-de-filtros-200.spec.ts`, `barra-de-filtros-vehiculos-200.spec.ts`). El buscador ocupa el ancho libre de su fila (`min-w-0 flex-1 basis-56`:
  con menos de 14 rem toma la fila entera; `barra-compacta.spec.ts`) y «Vista y opciones» crece en alto al 200 % en vez de ensanchar la página.
- Matriz de Roles a 412 px al 200 %: 0 de 72 filas con el control fuera de la vista, sin ensanchar la página.
- El celular corre en e2e sólo lo que tiene rama propia (tarjetas, hoja de filtros, pestañas del kanban, panel desde abajo, menú, pie del
  modal, foto, «Rol a la vista»): las pruebas marcadas se deciden con `E2E_HUELLA` + `scripts/comparar-anchos.mjs`. `E2E_ESTRES=1` repite
  «ítems por página» con la lectura lenta (al cerrar una tarea que toque `shared/ui/filtros` o la preferencia).
