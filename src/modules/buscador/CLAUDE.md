# buscador

Paleta global (Ctrl/Cmd+K) que busca leads, vehículos, cotizaciones y acciones acotada a los permisos del usuario, con últimos abiertos.

## Entra y sale

- Entra: texto (`MINIMO_DE_BUSQUEDA`: 3 letras o dígitos seguidos, o un número de lead o cotización), atajos de teclado.
- Sale: `client.ts` (lecturas por sección, `leerUltimosAbiertos()`, `agruparResultados()`, `seccionesQueBuscan()`; `chat` lo usa para las menciones
  `#`), `shell.client.ts` (`<Buscador>`, montado por `HuecoBuscador` en `src/app/(app)/_shell/huecos/buscador.tsx`, y `<ElegirLead>`, diferido: el segundo paso de «Nuevo» de la barra; también sale por `client.ts` para «Lead (opcional)» del formulario de un evento de la agenda), `pantallas/visita.ts`
  (`<RegistrarVisita>`).
- Depende de `leads`, `vehiculos`, `cotizaciones` sólo por la base; de módulos, sólo `interpretarBusqueda()` de `@/modules/leads/client`, que llama
  la feature (no `entities` ni `infra`). No importa `chat`.

## Archivos clave

- `entities/ranking.ts` — `seccionesQueBuscan(interpretacion, tipos?)` (espejo de `_buscador_interpretar`; `tipos` deja sólo los que se pueden buscar), `agruparResultados()` (número exacto, después lo que empieza con
  el texto, el resto como lo dio la base; `POR_SECCION` = 5). `entities/resultados.ts`: las columnas que se piden (nunca teléfono, campos ni montos).
- `infra/buscar.client.ts` — una lectura por sección con `.abortSignal(signal)`: nunca lanza y con la señal cancelada no pide nada. Registradas en
  `scripts/guardas/areas-b/paginas-en-la-base.ts` (defecto 5, máximo 20). `infra/visitados.client.ts`: 16 visitas propias, cada entidad hidratada bajo
  su RLS; lo que no llega sale sin marcador.
- `features/elegir-lead/` — «elegir un lead de mi cartera» (seguimiento o recordatorio desde «Nuevo»): `buscarLeadsDeLaCartera()` pide los candidatos de `buscador_leads` hasta el máximo de la base (20), los pasa por `leads_vista_por_ids` con `en_cartera`
  y muestra 5 («Escribe más» si hay otros); mismo mínimo, misma espera y mismo cancelar que la paleta; un teléfono no se busca.
- Modo Live: `<Buscador tipos>` (el layout los calcula con `tiposDeLaPaleta(sesion.live)` de `src/app/(app)/_shell/acciones-de-la-paleta.ts`) acota la
  búsqueda y los «Últimos abiertos»: un tipo que no está no se pide ni se hidrata. Los tipos se fijan por su contenido (`useTiposEstables`): un
  `router.refresh()` con la paleta abierta no vuelve a pedir.
- `<RegistrarVisita tipo id />` (Server Action sobre `visita_registrar`, sin DOM, una vez por (tipo, id), sin avisar si falla): lo montan las tres
  fichas **después** de sus salidas «no disponible». La paleta viaja con `diferido()`; los hooks no consultan hasta `abierta`; el layout le pasa las
  acciones ya filtradas por `puede()` (`src/app/(app)/_shell/acciones-de-la-paleta.ts`).
- Pruebas: `supabase/tests/areas/buscador/`; volumen, `supabase/tests/medir-buscador.sql` (`MEDIR_SOLO=medir-buscador pnpm db:medir:volumen` tras
  `pnpm db:sembrar-volumen`; después, `pnpm db:reset`).

## Tablas

Ninguna propia. Escribe `visitados` (equipo) sólo por `visita_registrar(p_tipo, p_id)` (upsert de la fila propia, tope 50 por persona) y la lee por
`visitados_usuario_visto_idx`.

RPC (de `authenticated`, ninguna de `anon`; `_acotar_pagina(p_tamano, 5, 20)`, devuelven hasta n + 1):

- `buscador_leads(p_texto, p_tamano)` → `uuid[]`, invocadora: `#n` por `leads_ids_del_numero` y nombre por `leads_candidatos` (sólo `texto`), pasados por
  `leads_vista_por_ids`.
- `buscador_vehiculos(p_texto, p_tamano)`, invocadora: título, VIN o lote, una ruta por origen visible por `vehiculos_origen_listado_idx`.
- `buscador_cotizaciones(p_texto, p_tamano)`, **`security definer`**: número exacto o título por `cotizaciones_titulo_trgm` (hasta 1.000 de sus orígenes)
  más las propias por `cotizaciones_creador_idx` en los orígenes con «propios» sin «todos»; sin montos, papelera, `lead_id`, `vehiculo_id` ni
  `creado_por`.
- `_buscador_interpretar(p_texto)`: el mínimo en la base, espejo de `interpretarBusqueda()`.

## No se rompe

- Nunca devuelve algo que la RLS esconde ni busca por teléfono o por un campo de un lead (fuga del enmascarado u oráculo de un privado).
- `buscador_cotizaciones` copia fila por fila la policy «cotizaciones: leer»: quien la cambie cambia la RPC; `buscador.sql` compara las dos.
- Con menos que el mínimo, nada: lo decide la base.
- Una cotización se nombra por su título o «Cotización n.º N» (la regla de `tituloDeLaCotizacion()` de `cotizaciones` sin el vehículo, escrita en
  `fila-de-resultado.tsx`: `buscador_cotizaciones()` no devuelve el vehículo, por decisión, y la paleta no carga el barril de `cotizaciones`). **Límite:** una vieja
  sin título y con vehículo se nombra por su número; desde que el título es automático, toda cotización guardada lo lleva.
- Las acciones («nuevo lead», «cotizar») aparecen sólo si `puede()` lo permite.

## Ojo

- Quien cancela descarta la respuesta mirando su `signal`: la lectura no tiene un valor «cancelada».
- Registrar la visita es una escritura: va por Server Action, no desde `infra/*.client.ts`.
- Debounce de 250 ms. `pareceTelefono` (≥ 7 dígitos sin `#`) omite la sección de leads.
- Con `SOLO=` la primera cuenta creada es la dueña: `buscador.sql` crea una de relleno antes de sus personas.
