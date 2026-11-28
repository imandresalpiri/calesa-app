# cotizaciones › aprobada

El área `aprobada` de `cotizaciones`: la cotización aprobada de cada vehículo. Ficha del módulo: `../../CLAUDE.md` › «Áreas». Dominio y reglas:
`docs/COTIZADOR.md` › «La cotización aprobada».

## Qué es

Cada vehículo tiene a lo sumo una cotización **aprobada** (`cotizaciones_aprobadas`, una fila por vehículo con el primer resultado congelado). Nace aprobada la
primera activa; quien aprueba en el origen (`cotizaciones.aprobar`) elige otra; si la aprobada se invalida o va a la papelera la releva la más antigua activa.
No es la **Final**. `client.ts` vacío; `index.ts` sólo lleva las lecturas por página que unen las pantallas de `src/app`; la composición del navegador
(`composicion.client.ts`, la lectura de «De este vehículo») la importa sólo su hook.

## En la pantalla

- **La guardada** (`pantallas/aprobada-cotizacion.ts` → `HUECOS_DE_APROBADA_EN_LA_GUARDADA.Insignias`, antes de las insignias de `comentarios`):
  `aprobada-de-la-guardada.tsx` (Server Component tras `<Suspense fallback={null}>`) lee `leerMarcaDeLaGuardada()` (`cotizaciones` con el embebido por el único de
  `cotizaciones_aprobadas`, `cache()`). Todos los que ven la cotización ven la insignia «Aprobada» (`insignia-aprobada.tsx`: un `<span>` con `badgeVariants`, sin
  `<Badge>` de Base UI); quien tiene la clave en el origen ve «Aprobar» (`boton-aprobar.tsx`, una isla que al entrar pasa a la insignia). Sin vehículo, inválida o
  sin la lectura de la marca, el botón queda apagado con su motivo (`motivoParaNoAprobar`, `aria-describedby`); sin lectura nunca se inventa una marca. Lo leído se
  le anota al núcleo (`anotar-aprobada.tsx` → `anotarAprobada()` de `features/privada/hooks/aprobada-anotada.ts`) y se pone al día con los avisos entre islas: «Hacer
  privada» del «⋯» sale apagada en la aprobada.
- **Una privada pregunta antes** (glosario: «Cotización privada»): aprobarla la hace pública y «Deshacer» no la vuelve privada. «Aprobar…» (con puntos: abre algo) abre
  `<DialogoDeAprobarPrivada>` en `?panel=aprobar-privada&para=<id>&desde=fila|guardada|vehiculo|ficha|comparar` (`useAprobarPrivadaPorUrl(desde)`, `entities/aprobada/url.ts`;
  `desde` evita que el listado, o las tarjetas de la ficha del vehículo (`ficha`), y «De este vehículo» dentro del resumen abran dos), con `AVISO_AL_APROBAR` y, en la guardada, que lo no guardado se pierde. Confirmar
  llama a `aprobarHaciendolaPublica()` (`hacerlaPublica`, `p_hacerla_publica`); en la guardada, al entrar, `router.refresh()` (la versión cambió). «De este vehículo», las
  tarjetas de la ficha y Comparar no preguntan por la marca leída (`cotizaciones_de_este_vehiculo()` la trae sólo para la insignia): la base rechaza sin `p_hacerla_publica`
  (22023, `hint privada` → `causa: CAUSA_PRIVADA`) y `alSerPrivada` abre la misma pregunta.
  Registrado en `scripts/guardas/confirmar-con-url-papelera.ts`.
- **No hay `<Confirmar>` para una pública:** aprobar es reversible. `aprobarLaCotizacion()` (función, no hook; sin `useAction`: el JS en frío de la guardada está al tope) llama a la
  action, aplica lo devuelto con `alCambiar` y avisa con «Deshacer» 10 s si llegó `anterior` (aprueba la anterior con su versión). **La action no revalida ni
  refresca** (`.claude/rules/acciones.md`: remontaría lo tipeado en la hoja).
- Errores: el texto de la base (PT409 con quién y cuándo + «Recargar», 42501, 22023, 23514); sin red, «Sin conexión: no se aprobó…»; inesperado tras llegar,
  «No sabemos si se aprobó: recarga para verlo.» + «Recargar». Ninguna cifra en un `aria-label` ni en un `title`.
- **Las lecturas por página**, de ≤ 100 ids y sin consultar si no hay ids: `leerAprobadasDeVehiculos(ids)` para el «Costo estimado» de `/vehiculos` es la RPC
  `cotizaciones_aprobadas_de_vehiculos` (por la clave primaria, con el nombre del modo de la cotización: `modo`, nulo sin modo o sin permiso en el origen de la
  versión); `leerAprobadasDeCotizaciones(ids)` para el listado, una consulta por el único con `.limit(ids.length)`. El monto cruza como texto (`monto::text`).

- **De este vehículo** (`features/aprobada/components/de-este-vehiculo/`): en la guardada, la línea bajo la cabecera (`BajoLaCabecera`) y la sección bajo la
  hoja (`Debajo`), Server Components tras `<Suspense>` que leen `leerOtrasDelVehiculo()` (las otras del vehículo con `limit 101` por PostgREST, `cache()`:
  la comparten); sin otras, sin vehículo visible o si falla, nada. La lista es una isla que pide su código y su primera página al acercarse
  (`al-acercarse.tsx` → `diferidos.tsx`) y lee desde el navegador por `composicion.client.ts` (`cotizaciones_de_este_vehiculo`, de a 10 hasta 100;
  `useDeEsteVehiculo`, con `ultimo` como único guardián). En el resumen entra por `pantallas/aprobada-resumen.ts` (sólo la cáscara) como la quinta pestaña «De este vehículo» (`?pestana=vehiculo`; sin `conTitulo`: la pestaña es el título;
  con `vacio`, «Ésta es la única cotización de este vehículo.»). La ficha del vehículo no lo usa: dibuja su fila de tarjetas (`features/aprobada/components/fichas/`, con la fila que le da el listado por hueco), que reutiliza `useDeEsteVehiculo`, `useAprobarEsta`, la casilla y `BotonComparar`. La aprobada va primero (`filasALaVista()`: la fijada, sin repetir), «Esta» la que se mira, y **«Aprobar esta»** en las demás: el servidor manda
  dónde aprueba quien mira (`aprobarEn`, de `origenesCon`) y `motivoParaNoAprobarEsta()` da el motivo (el permiso del origen y después inválida, como la base).
  Aprobar usa `aprobarLaCotizacion()` (su `alCambiar` recibe además el id que quedó aprobado); tras entrar o deshacer el bloque relee su primera página y
  avisa a las otras islas del vehículo (`hooks/aprobada-del-vehiculo.ts`: `avisarAprobada()`, `useAlCambiarLaAprobada()`), así «Aprobar» de la cabecera se
  pone al día sin refrescar la hoja. **Las casillas**
  (`conCasillas` con `volverA`): una por fila (`casilla-de-comparar.tsx`) y «Comparar» en la fila del título (`boton-comparar.tsx`), con la lógica pura en
  `entities/aprobada/eleccion-para-comparar.ts` (hasta 3, en el orden de la lista, se sueltan las que ya no están). En la guardada el h2 lo dibuja el servidor con una ranura vacía al lado
  (`ID_DE_LA_RANURA_DE_COMPARAR`) y la isla pone «Comparar» ahí con un portal (`ranuraDeComparar`): el título nunca se vuelve a montar (el foco del «Ver»
  sigue en él) y las casillas y el botón viajan sólo en el chunk diferido.
- **De este vehículo desde el servidor**: `leerPaginaDeEsteVehiculo({ vehiculoId, cursor })` (`infra/aprobada/de-este-vehiculo.ts`, `index.ts`) es la misma
  lectura con el cliente de servidor y el cursor opaco (el `siguiente` de la página anterior; uno que no se lee pide la primera), por
  `cotizaciones_vehiculo_creado_idx`. La pide el vehículo de ejemplo del editor de artes (`GET /artes/ejemplo/vehiculos/<id>/cotizaciones`, en `src/app`), con
  `filasALaVista()` y `tituloDeLaFila()` (también en `index.ts`).

- **La ficha del vehículo** (`/vehiculos/[id]`, columna izquierda): su «Costo estimado» lee la aprobada con `leerAprobadasDeVehiculos([vehiculoId])` (la lectura del
  inventario, con el modo) y lo dibuja `vehiculos`; «Compartir» es el diálogo del área `tarjeta` (`pantallas/tarjeta-compartir.ts`). Sin aprobada que quien mira vea, «—» con «Cotizar».

- **Comparar cotizaciones** (`/cotizaciones/comparar`, `pantallas/aprobada-comparar.ts`): `leerParaComparar(ids)` (`infra/aprobada/para-comparar.ts`) lee en
  paralelo una `cotizacion_hoja_guardada` por id (sin `cotizacion_evaluar`) y las marcas de las ≤ 3 (`COLUMNAS_PARA_COMPARAR`: vehículo, origen, estado,
  autor, aprobada); una columna que falla lleva su error y las demás siguen, y si fallan las marcas falla la página. `veredictoDeComparar()` dice si se
  comparan (ningún 42501, la marca de cada una, un solo vehículo) y `compararCotizaciones()` (`entities/aprobada/comparar.ts` y `comparar-alineacion.ts`)
  arma en el servidor el modelo plano: las cabeceras y las filas alineadas por nodo (sección del diseño, celda y su porcentaje, subtotal, variante por su
  etiqueta, interruptor «Sí»/«No», lo aparte en «Totales»; «falta» si la versión no lo trae o no viene su valor) con la diferencia contra la primera
  columna leída. `TablaDeComparar` (columna de etiquetas fija, desplazamiento lateral con la pista) guarda la aprobada en su estado: `useAprobarEsta` (su
  `alCambiar` recibe el id que quedó aprobado) la mueve sin recargar; «Reintentar» de una columna es `router.refresh()`.

- **El listado** (`pantallas/aprobada-listado.ts`): «Aprobar» del «⋯» de cada fila llama a `aprobarLaCotizacion()` con la versión de la página; el listado no tiene lo
  tipeado de una hoja, así que `alCambiar` refresca la página (la anterior aprobada del vehículo deja de serlo). No se ofrece en la que ya es la aprobada.

## En la base

`cotizacion_aprobar(id, versión)` y el mantenimiento al confirmar: `docs/COTIZADOR.md`. La lectura del bloque, `cotizaciones_de_este_vehiculo()` (invocadora), y la del
«Costo estimado» de `/vehiculos`, `cotizaciones_aprobadas_de_vehiculos(ids)` (invocadora, hasta 100 ids), las dos con `_nombre_del_modo()` (`security definer`, el
nombre del modo a quien tiene `cotizaciones.ver` del origen; una llamada por versión y modo). Pruebas: `supabase/tests/areas/aprobada/` (`de-este-vehiculo.sql`
para el bloque, `de-vehiculos.sql` para el inventario), `scripts/carreras/cotizaciones-aprobada.mjs`, `supabase/tests/medir-cotizaciones-aprobadas.sql` y `medir-cotizaciones-de-este-vehiculo.sql`.
