# logistica

Operación diaria sobre el flujo: cadena por fase, mover con vista previa, documentos con aprobación y vencimiento, transporte (embarques y contenedores como grupos), declaraciones aduaneras, gastos y pagos, notas, alertas por demora y margen contra la cotización final.

La tarea de oro 3 la prueba `e2e/logistica-tarea-de-oro.spec.ts`. Abiertos (`docs/PENDIENTES.md`): **6-4**, **6-5** (medir `gastos_listar` y `pagos_listar`),
**6-6** (prorratear por valor), **6-7** (borrar una nota propia por RPC), **8-13b**.

## Entra y sale

- Entra: acciones de logística en `/logistica/*`, subida de documentos (también desde cámara), confirmación de pagos, cron de alertas.
- Sale (núcleo): `leerUnidad(id)` (la unidad de vehículo bajo la RLS de quien mira; nula si no existe, está en la papelera o no la ve; `titulo` =
  «<principal> · <título>» si el origen tiene campo principal y se puede leer: `features/nucleo/unidad-con-identidad.ts`), `huecosVisibles`,
  `ORDEN_DE_HUECOS`, `refDeUnidad`, los tipos de la unidad y de los huecos; por `pantallas/unidad.ts`, `<PanelDeLaUnidad>` (los drawers: cabecera y bloques plegables), que recibe `relacionados?: ReactNode` (el bloque «Relacionados» de un vehículo, bajo la cabecera y antes de los huecos; lo compone `src/app/(app)/logistica/unidad-abierta.tsx` con `leads.ver`: `logistica` no conoce `vehiculos/relacionados`); por `pantallas/unidad-pagina.ts`, `<PaginaDeLaUnidad>` (la página: cabecera compacta con `foto` y `relacionados` en una línea, y los huecos en zonas o en bloques con la barra «Mover»; lo compone `src/app/(app)/logistica/vehiculo/[id]/unidad-en-su-pagina.tsx`) y, por `pantallas/unidad-esqueletos.ts`, `EsqueletoDeLaUnidad` y `EsqueletoDeLaFoto` (sólo para `loading.tsx`: importar el barril de `unidad-pagina` bajaría su chunk dos veces); `ZONA_DEL_HUECO`, `zonasDeLaUnidad` y `pestanaInicial` (`entities/nucleo/zonas.ts`).
- Área `cadena`: `leerResumenDeLaCadena(origenId)` (el número de cada fase: vehículos, demorados y trabados, con tope), `leerLaFase(pedido)` (una página de la lista de una fase,
  con los vehículos nombrados por el campo principal), `dondeEsta(busqueda)` (hasta 10, en todos los orígenes de la persona; texto corto no llama a la base),
  `leerOrigenesDeLaCadena(permisos)` (las pestañas), `leerNavieras()`, `esquemaDeFiltrosDeLaCadena`, `pedidoDeLaCadena`, `claveDeFase`, `faseDeLaClave`, `rutaDeLaFase`, el cursor de una
  fase y las claves de URL de los filtros (`origen`, `q`, `demoradas`, `por_aprobar`, `contenedor`, `booking`, `naviera`).
- Área `alertas`: `bandejaLogistica(tope)` (demoradas, trabados y por aprobar de quien mira; una lectura de `logistica_bandeja` por request con `cache()`),
  `detalleDeDemorada` y `detalleDeTrabado`, para los bloques de Inicio de `tablero`, que arman su «Ver todas» con `rutaDelGrupoDeLaBandeja`; y la bandeja del día:
  `leerGrupoDeLaBandeja`, `gruposVisibles(permisos)`, `grupoDelSlug`, `rutaDelGrupoDeLaBandeja`, los textos y la acción de cada fila.
- Núcleo, para las áreas: `nombrarVehiculos` (el nombre «<principal> · <título>», `features/nucleo/identidad-de-vehiculos.ts`), `EnlaceALaUnidad`, `useIrALaUnidad` y
  `rutaDeLaUnidad(id, hueco?)` (`?hueco=documentos` abre esa pestaña —o ese bloque, en el celular— de la página de la unidad).
- Lo consumen `tablero`, `vehiculos` (ficha) y `web` (portal: fases y documentos visibles).
- Depende de: `vehiculos`, `origenes`, `empresa`, `flujos`, `cotizaciones`, `agenda` («Pedirlo» de «Qué falta»: `leerQuienesPuedenRecibir` y `darTareaVinculada`, funciones de servidor que llaman sus actions; ningún componente de `agenda` entra al JS de la página).

## Áreas

El módulo se parte por **área** (igual que `flujos` y `cotizaciones`). Un área vive en `features|entities|infra/<área>/`, `areas/<área>/{index,client,composicion}.ts`
y `pantallas/<área>.ts` (y `pantallas/<área>-<pantalla>.ts`). El **núcleo** (la unidad, el panel, sus huecos y la selección) es la carpeta `nucleo` de cada capa.
`index.ts`, `client.ts` y `composicion.ts` de la raíz sólo hacen `export *` del núcleo y de cada área. **Un área no importa otra y el núcleo no importa ningún
área** (`scripts/guardas/areas-de-logistica.test.ts`): lo compartido va al núcleo.

| Área         | Qué es                                                                                                              |
| ------------ | ------------------------------------------------------------------------------------------------------------------- |
| `nucleo`     | `Unidad`, `HuecoDeLaUnidad`, el panel de la unidad, el orden de sus huecos y la selección del lote                  |
| `cadena`     | la gráfica de la cadena por origen de `/logistica`, la lista de una fase (`/logistica/fase/[fase]`) y «dónde está»  |
| `mover`      | «Qué falta», mover con nota, notas, historial y el lote                                                             |
| `documentos` | subir, aprobar o rechazar, editar fechas, «Visible en el portal», eliminar y subir a un grupo                       |
| `transporte` | embarques y contenedores (hueco «Transporte», `/logistica/embarques`, «Editar grupo», catálogos Puertos y Navieras) |
| `aduana`     | declaraciones (hueco «Aduana», `/logistica/aduana`, alta, edición, composición y canal)                             |
| `dinero`     | gastos, pagos y margen (tres huecos, `/logistica/gastos`, prorratear, categorías de gasto, pagos de un proyecto)    |
| `alertas`    | alertas por demora y por vencimiento, la bandeja del día de `/logistica` y la bandeja de Inicio                     |

**Los huecos.** El panel no sabe qué lleva: cada área los declara en su `pantallas/` (`<área>-unidad.ts` → `HUECOS_DE_<ÁREA>_EN_LA_UNIDAD`; `<área>-grupo.ts`;
`<área>-enlace.ts`; `<área>-catalogos.ts`) y sólo `src/app` los junta. Un hueco se dibuja si la persona tiene alguna de sus claves **en el origen de la unidad**
y su regla de `flujos_reglas` está activa; el orden es `ORDEN_DE_HUECOS`, no el del archivo. Se monta al abrir su bloque (`BloqueDelHueco`). Cada hueco va en su `LimiteDelHueco` (si se rompe al dibujarse: «No pudimos mostrar «<título>».» con «Reintentar», y el resto sigue) y su `diferido()` avisa y muestra su esqueleto _en su lugar_ (`aviso: 'aqui'`, `EsqueletoDelHueco`). **En su página** (`PaginaDeLaUnidad`) los huecos van en tres **zonas** que decide `ZONA_DEL_HUECO` (un solo mapa junto a `ORDEN_DE_HUECOS`, con `Record`: una clave nueva exige zona): `principal` («Qué falta» con mover, siempre a la vista), `pestanas` (Documentos · Transporte · Repuestos · Aduana · **Dinero** = gastos, pagos y margen apilados) y `lateral` (Notas · Historial). La forma se elige por el ancho de la pantalla (`DisposicionDeLaPagina`, `useAlMenos(CORTE_DEL_PANEL)`: desde 1024 px, `DisposicionEnZonas`; por debajo, `DisposicionPlegable` = `BloquesDeLaUnidad` + `BarraDeMover`); el alto fijo sólo desde 56 rem del contenedor (`@container/unidad`) y lo pone `src/app` (`--alto-del-detalle`, `vehiculo/[id]/alto-del-detalle.ts`). Cada contenido se dibuja **una sola vez**, en la forma elegida (nunca dos instancias: se duplicarían los `data-bloque-del-hueco` y los `?panel=`). Un hueco de pestañas se monta al elegirla (`ZonaDePestanas`) y queda montado; la pestaña va en `?hueco=` (nuqs, `shallow`, `replace`, `usePestanaDeLaZona`). `EnvoltorioDelHueco` existe desde el primer render (`useHayHueco` no se suscribe) y `abrirHueco` elige la pestaña y, ya visible, trae el hueco a la vista y enfoca la pestaña (un `focus()` sobre algo `hidden` no hace nada; en zonas nunca `querySelector('details')`). `useEnZonas()` (`features/nucleo/disposicion.ts`) le dice a un área en qué forma está. En un drawer, `PanelDeLaUnidad` sigue con bloques plegables. El panel exige
`logistica.ver` en el origen **y** que la RLS de `vehiculos` deje leer la fila: con sólo una, «No tienes permiso» o «ya no está disponible».

## Archivos clave

- **Cadena:** `/logistica` dibuja la bandeja del día y, al lado, la cadena como gráfica (un Server Component sin JS propio: `GraficaDeLaCadena`, una `<ol>` con un punto por fase, su cifra y su
  barra, con «demorados» y «trabados» dichos con texto). Cada fase es un enlace a `/logistica/fase/[fase]` (`[fase]` = el id o `sin_fase`): la lista de a 50 por cursor `(fase_desde, id)`, con
  `FilterShell`, búsqueda y la selección del lote. **Un vehículo se abre siempre en su página** (`/logistica/vehiculo/[id]`), nunca en un drawer: el nombre es un `EnlaceALaUnidad` y un clic
  en el resto de la fila va ahí (`useIrALaUnidad`). La fila dice «En subasta» o «Sin resolver» cuando la subasta manda (`situacion` de `vehiculos`, la calcula la base). Las URL del kanban
  viejo (`?vehiculo=`, `?fase=`, `?demoradas=si`, `?por_aprobar=si`) las redirige `src/app/(app)/logistica/url-vieja.ts`. «Dónde está» es un formulario (`?q=`) bajo las pestañas de origen.
- **Bandeja del día** (área `alertas`, `/logistica`): siete grupos en este orden —Demorados, Trabados, Documentos por aprobar, Documentos por vencer, Llegadas esperadas, Salen hoy,
  Subastas sin resolver— que lee `logistica_bandeja_grupo` (una lectura por grupo, en paralelo, cada una con su error aparte; un grupo vacío no se dibuja y todos vacíos dicen «Nada pendiente
  hoy»). La portada trae las primeras 5 de cada uno con el conteo hasta 100 y «Ver todos» → `/logistica/bandeja/[grupo]` (de a 20 por cursor, `leerCursor`). La acción de la fila (`features/alertas/accion-de-la-fila.ts`)
  sale sólo con su permiso: «Mover» (`flujos.mover` del origen), «Ver qué falta», «Revisar» y «Renovar» (llevan a `?hueco=documentos`; **no se aprueba en la fila**: se aprueba mirando el archivo) y,
  en «sin resolver», «La ganamos» (`?ganada=si`) y «No la ganamos» (`useNoGanada` con «Deshacer» de 10 s y `router.refresh()`). Quién ve cada grupo: lo visible (`_logistica_alcance`); por aprobar,
  además `logistica.documentos.aprobar`; por vencer, además `logistica.documentos.subir`. Con «propios», la base parte de `_logistica_lo_propio` y nunca lee `lead_id`.
- **«Visto» en logística** (`docs/GLOSARIO.md`). El contexto `logistica` es el detalle del vehículo en este módulo: `/logistica/vehiculo/[id]` (`UnidadEnSuPagina` registra el visto, sólo la página) o el panel de
  gastos y pagos (`?vehiculo=`, que registra la lista, no el drawer: un registro por apertura); la ficha de `/vehiculos` es otro contexto. Marcan, con `MarcasDeLogistica` de `src/app` (`equipo/pantallas/marcas-de-visto`):
  la bandeja del día y la de un grupo, la lista de una fase, «dónde está», gastos y pagos y las unidades de un grupo de embarques (`EnlaceALaUnidad` baja el tono del nombre; el sufijo, el ojo de «Último visto»). **Aduana no:**
  su fila es una declaración y sus vehículos son texto sin enlace.
- **Una subasta no ganada no cuenta** (`situacion = 'no_ganada'`): fuera de la cadena (también «Sin fase»), de las demoradas y «Por aprobar» de la bandeja
  y de `alertas_demora`. `vehiculos_cadena_idx` es parcial sin ellas: toda consulta que lo usa lleva el literal `situacion <> 'no_ganada'`
  (`supabase/tests/areas/situacion/cuenta.sql` lo cuenta).
- **Unidad de un ítem de repuesto.** El panel abre una `UnidadAbierta`: `Unidad` (`origenId: string`; la única que ven las áreas sólo de vehículos) o un ítem
  (`origenId` nulo, `proyecto?: { id, vehiculoId }`); `esUnidadDeVehiculo(u)` estrecha. Sólo `mover` y el núcleo tipan con `UnidadAbierta`. `repuestos` arma la
  unidad (`src/app/(app)/repuestos/item-abierto.tsx`); `logistica` no importa `repuestos`. Un hueco declara su variante `repuesto?: { permisos, regla, componente? }`
  (sin `componente` no dibuja nada; el `componente` del hueco nunca recibe un ítem); sin variante no se dibuja para un ítem (Aduana, Gastos, Pagos, Margen).
  `huecosVisibles({ tipo: 'repuesto', origenId: null })` filtra por `repuestos.ver` global; el filtro de tipo va antes de descartar repetidos. El transporte de un
  ítem lo dibuja el núcleo (`pantallas/unidad-item.ts`, `textoDelTransporteDelItem`; 8-13b).
  **El panel de un ítem va con sus secciones a la vista** (`PanelDeLaUnidadALaVista`, por `pantallas/unidad-item.ts`; el de `/logistica/gastos?vehiculo=` sigue
  plegable): «Qué falta» primero, los `bloques` que compone `src/app` (imágenes, stock y compras de `repuestos`) y el resto en `ORDEN_DEL_ITEM`
  (`enElOrdenDelItem`). Cada sección es un `SeccionDelHuecoALaVista` (`h3` con `tabIndex={-1}`, `data-bloque-del-hueco`, montada con el panel) en su
  `LimiteDelHueco`; el atajo de una falta la trae a la vista y enfoca su `h3`. `conCabecera={false}` omite `CabeceraDeLaUnidad` cuando el título ya dice qué ítem es (el drawer de un ítem de `/repuestos/[id]`; queda la línea de `aviso`). `destinoInicial` (`?destino=` de `repuestos`) llega a «Qué falta» por el contexto
  `ProveedorDelDestinoInicial` / `useDestinoInicialDelMover()` (`features/nucleo/destino-inicial.tsx`, nulo sin proveedor): `CuerpoDeQueFalta` lo abre con
  `conAbiertoPorDefecto` sólo si está entre los destinos leídos y fuera de «La ganamos». Tras un `PT409`, el aviso de un ítem sólo ofrece «Recargar»
  (la página de la unidad es de un vehículo).
- **Hueco «Repuestos»:** en `ORDEN_DE_HUECOS` entre `transporte` y `aduana` (el orden va por lo que más se hace: que-falta, documentos, notas, historial, transporte, repuestos, aduana, gastos, pagos, margen); lo declara `repuestos` (`pantallas/flujo-esperas.ts`) y lo suma
  `src/app/(app)/logistica/huecos-de-la-unidad.tsx` (`repuestos.ver` y regla `esperas`; sin variante `repuesto`). `logistica` sólo conoce la clave.
- **Área `mover`, «Qué falta» y mover** (`pantallas/mover-unidad.ts`, hueco `que-falta` abierto al inicio). `useParaMover` lee con la action `leerQueFalta`,
  que envuelve `leerParaMoverDe` de `flujos` (la misma lectura) y suma, por requisito que falta, sus **acciones** (`docs/GLOSARIO.md` › «Acción del requisito»)
  ya resueltas en el servidor (`entities/mover/`: `capacidadesDeQueFalta` con `puede()`, `resolverAccionesDeQueFalta`, `acciones-de-un-dato.ts`): ni los
  permisos ni la regla viajan al navegador. Relee al volver el foco (5 s de mínimo), al cambiar la fase y con `logistica:unidad-cambio` (también lo avisa
  el dinero). Cada falta lleva un botón chico con el verbo («Subir», «Revisar», «Completar», «Registrar», «Ir a …», «Pedirlo»; el nombre accesible lleva el
  objeto) y hasta dos más en su «⋯» (`BotonesDelRequisito`); `accionesADibujar` filtra lo que sólo sabe el navegador: con la clave del hueco y sin el hueco
  dibujado la regla está apagada (nada), lo que lleva a un hueco ausente se descarta, **en un drawer** lo que sacaría de la pantalla dice «Abrir la unidad»
  (`useEnLaPagina()`, que da `DisposicionDeLaPagina`) y sin red todo se apaga con «Sin conexión…» en la línea viva. `useHacerAccionDelRequisito` las ejecuta:
  «Subir» abre `?subir=documentos&tipo_documento=` (en zonas, en una sola escritura con `?hueco=`), «Revisar» y «Completar» abren el hueco y enfocan
  `data-tipo-de-documento-id` o `data-clave-de-dato` (`enfocarAlAparecer`, hasta 5 s), «Registrar» abre `?panel=pago&pago=nuevo`. La franja «fuera de
  regla» sigue con su atajo (`AtajoDeRequisito`). **«Pedirlo»** (`?pedir=requisito&falta=<id>`, `usePedirloPorUrl`: se revisa al abrir contra la lectura,
  «Eso ya no falta.») abre el modal «Pedírselo a alguien» con `diferido()` al primer uso (`diferidos-de-que-falta.tsx`, montado una vez por
  `PedirloDeQueFalta`): `leerQuienesPueden` (hasta 20; con más, busca desde 3 letras con 300 ms) y `pedirLoQueFalta` (una tarea sin fecha vinculada al
  vehículo, con el id del intento; 23514 → «Esa persona ya no puede recibir tareas. Elige otra.» y relee). Las dos piden `agenda.tareas.asignar`; un ítem
  no ofrece «Pedirlo» (una tarea no se vincula a un ítem). `useMoverLaUnidad` envía con `faseEsperada = unidad.faseId` (éxito = `router.refresh()`). Textos y estado
  del botón de mover son de `flujos`. Un ítem manda `{ repuesto }` (`unidadAMover`).
- **Área `mover`, «La ganamos»** (`?ganada=si`, `useModoGanada`; la clave `CLAVE_DE_GANADA` sale por `index.ts` para el enlace de la ficha del
  vehículo): «Qué falta» ofrece sólo los destinos que no son la subasta (`entities/mover/ganada.ts`), abre el primero y mover llama `ganarLaSubasta`;
  al lograrlo quita `?ganada` con `shallow: false`, sin `router.refresh()`. Fuera del modo, con la subasta sin resolver y permiso de mover, una línea
  ofrece «La ganamos». La situación llega en `Unidad.situacion` (`entities/nucleo/situacion.ts`, espejo del `check` de la base: una entidad no
  importa `vehiculos`).
- **Área `mover`, las acciones de «Qué falta»** fuera del panel: `LugarDeLasAcciones.aMano` (entidad, con test) pasa a «Abrir la unidad» →
  `rutaDeLaUnidad(id, hueco)` lo que no está a mano; hoy ningún lugar lo usa (la unidad y los drawers miran el DOM con `useAccionesDeQueFalta`). La ficha
  del vehículo no dibuja «Qué falta»: enlaza a la unidad («Ver en logística») y `?seccion=fase|documentos` redirige ahí.
- **Área `mover`, notas e historial** (la zona lateral de la página; plegados en un drawer y en el celular). Se leen con la sesión de quien mira de a `TAMANO_DE_VER_MAS` por cursor `(creado_en, id)` hasta
  `TOPE_DE_LO_CARGADO`; un ítem por `repuesto_id`. «Ir a una fecha» usa `entities/mover/hasta-de-un-dia.ts` (copia de la de `cotizaciones`). Escriben
  `crearNota` (`vehiculo` xor `repuesto`; `logistica.ver` del origen o `repuestos.ver` para un ítem; autor del servidor) y `editarNota`, directo bajo la RLS
  de `notas`, sin RPC ni versión. **No hay «Borrar»:** el borrado suave por `update` lo rechaza la policy de lectura (`supabase/tests/areas/mover/notas.sql`;
  6-7). La nota de un cambio de fase no se edita (`quePuedeHacerConLaNota`). «Ver en logística» de la ficha lo pone `src/app`.
- **Área `mover`, el lote.** La **selección vive en el núcleo** (`entities/nucleo/seleccion.ts`: una sola fase, hasta 200; `useSeleccionDeLaCadena()`, `null`
  sin proveedor). La lista de una fase sólo la lee («Elegir los de esta página»: la página, hasta 200); `mover` la provee (`ProveedorDeLaSeleccion`, que montan `src/app/(app)/logistica/fase/[fase]/page.tsx` sólo con `flujos.mover` en
  el origen y en una fase de verdad —se vacía al cambiar de fase, origen o filtros, y sobrevive a «Siguiente»— y la portada, con `?panel=lote`, para un grupo) y dibuja `BarraDelLote` y `DrawerDelLote` (`?panel=lote` con `destino`, `contenedor`, `booking`). El drawer usa
  `destinosDeLaFase`, `previsualizarCambioLote` (una llamada, hasta 200) y `cambiarFaseLote`; el resultado es el de **todo** el lote (las que la vista dejó
  afuera cuentan como no movidas) y «Reintentar» vuelve a la vista previa con las no movidas. Un grupo (`?contenedor=` o `?booking=`) lee sus unidades de a
  201 y entran las de una misma fase; `pantallas/mover-grupo.ts` declara «Mover el grupo» con «Marcar que llegó» para un contenedor.
- **Área `documentos`.** `entities/documentos/`: `admision.ts` (qué entra a la bandeja, fechas por modo de vencimiento), vencimiento («vence hoy» aún vale),
  qué cuenta para un requisito (aprobado, vivo, sin vencer, mime **del requisito**, entre min y max: repite `evaluar_requisitos` sólo para «N de M») y
  `revision.ts` (`quePuedeHacer`: cada acción oculta, habilitada o apagada con motivo). `pantallas/documentos-unidad.ts` declara «Documentos» (`logistica.ver`,
  sin regla); `?hueco=documentos` (`rutaDeLaUnidad(id, 'documentos')`) lo abre de entrada, y a eso redirige `?seccion=documentos` de la ficha del vehículo. El navegador lee con la sesión de quien mira (vivos con tope 50, URL firmada de
  60 s del bucket privado `documentos`).
  **Subir:** en las zonas de la página, un botón «Subir documentos» abre `DrawerParaSubir` en `?subir=documentos` (clave propia: `?panel=` cerraría el drawer del ítem; `useEnZonas()` decide; sin `logistica.documentos.subir`, botón apagado con su motivo escrito; la zona de pestañas abre en Documentos con `?subir=` para que el hueco esté montado); se cierra solo al terminar sin fallos, con fallos queda abierto con «Reintentar los N que faltan». En bloques (celular, drawers, ítem) la bandeja sigue en línea. Con `&tipo_documento=<id>` (lo pone «Subir» de «Qué falta») la bandeja vacía arranca con ese tipo (`useBandeja(tipos, tipoPedido)`: nunca pisa lo elegido con archivos puestos) y un envío sin fallos lo quita; cada grupo de un tipo lleva `data-tipo-de-documento-id` («Revisar» lo enfoca). Las claves compartidas entre áreas (`CLAVE_DE_SUBIR`, `CLAVE_DEL_TIPO_A_SUBIR`, las del formulario de un pago y los atributos `data-tipo-de-documento-id` y `data-clave-de-dato`) viven en el núcleo (`entities/nucleo/paneles-de-la-unidad.ts`). La bandeja queda **sin subir** hasta enviar (`useBandeja`: formato del tipo, 25 MB, repetido por hash, hasta 20; aviso desde 10 MB); se sube por
  hash (`<unidad>/<sha>.<ext>`) y recién entonces `registrarDocumentos` (`documento_registrar`, id del intento por archivo); cerrar con bandeja pregunta.
  **Revisar:** `revisarDocumento`, `editarDocumento`, `eliminarDocumento` → `documento_revisar|editar|eliminar` con la versión de la fila (`PT409` en la fila
  con `<AvisoDeConflicto>`, conserva lo escrito). Sin la clave nada se esconde: se apaga con el motivo. Editar y eliminar se ofrecen a quien tiene aprobar o
  subir (el navegador no sabe quién subió) y la base decide. `?panel=eliminar-documento&documento=<id>` (el rechazo de la fase se dice sin cerrar).
  **Grupo:** `pantallas/documentos-grupo.ts` declara «Subir un documento a las unidades» (`logistica.documentos.subir`): un objeto en la carpeta de la primera
  unidad y una fila por unidad (hasta 100).
- **Área `aduana`.** `/logistica/aduana` (`pantallas/aduana.ts`; `ENLACE_DE_ADUANA` pide `logistica.ver`). `entities/aduana/`: `declaracion.ts` (`actualizadoEn` es
  la versión), `estado.ts` («pagada» y «faltan» los calcula la base, nunca el cliente; el día es el de la empresa), `filtros.ts` (sólo `canal`, `pagada`, `q`;
  cursor `(creado_en, id)`, sin «Anterior»), `escritura.ts` (`cambiosDeDeclaracion`: sólo lo que cambió, `null` vacía). Lee `declaraciones_listar` (en la guarda
  de páginas) y `declaracion_leer`; el hueco «Aduana» lee el vínculo vivo por `declaraciones_vehiculos` y «Tributos pagados» (sin montos); fuera de las 200 que
  trae: «Abre la declaración para ver los tributos.». Escriben `guardarDeclaracion`, `ponerVehiculos`, `asignarCanal` → `declaracion_guardar|vehiculos_poner|canal`
  con la versión leída (`PT409` → «Recargar» conserva lo escrito). `?panel=nueva-declaracion` / `?panel=editar-declaracion&declaracion=<id>` (`shallow: false`,
  no convive con el resumen); `?panel=canal` es un `<Confirmar>` sobre el resumen (`?declaracion=`). La composición se cambia en **un solo envío** (buscador por
  `logistica_donde_esta`, al enviar); con canal queda fija. Todo pide `logistica.aduana.gestionar`.
- **Área `dinero`.** Huecos «Gastos», «Pagos», «Margen» en `pantallas/dinero-unidad.ts`. `entities/dinero/`: `margen.ts` (`textosDelMargen`: un `null` es «Sin
  cotización final» o «Sin venta registrada», nunca 0; un 0 verdadero es un monto), `gasto.ts` (`cambiosDeGasto` manda el tipo de cambio sólo si cambió la
  moneda o el tipo), `pago.ts` (monto > 0), `acciones-del-pago.ts` (un confirmado nunca se edita ni se elimina). **`monto_base` lo devuelve la base**: ningún
  componente multiplica por una tasa. El hueco recibe sólo `{ unidad }` y decide «Registrar gasto» con `puede()` sobre `mis_permisos`; protege la base.
  `?panel=gasto&gasto=<id|nuevo>`, `?panel=eliminar-gasto&gasto=<id>`, `?panel=pago|confirmar-pago|eliminar-pago|anular-pago&pago=<id>` (una URL a mano no
  abre lo que el estado o el permiso no dejan). Toda escritura de dinero avisa al «Margen» por un evento del navegador (`eventos-de-dinero.ts`) y, con él, un cambio de la unidad (`avisarCambioDeLaUnidad`: «Qué falta» se relee). Confirmar y
  anular piden `logistica.pagos.confirmar` (global); el sello «Confirmado por <nombre> el <fecha>» lo pone la base; anular pide motivo; el lead va nulo.
  **Pagos de un proyecto de repuestos:** `pantallas/dinero-proyecto.ts` (panel «Pagos» de `/repuestos/[id]`; también `useAlCambiarElDineroDelProyecto`, con el
  que la página se vuelve a pedir tras un pago, y `PARAMETROS_DE_REGISTRAR_PAGO`; `PANELES_DEL_PAGO` sale por `index.ts`): el mismo `CuerpoDePagos` con
  `AmbitoDePagoContext` en `proyecto`, registra `{ proyectoId }` por `pago_registrar_proyecto`, sin lead; permisos por props (`repuestos.costos.editar`,
  `logistica.pagos.confirmar`); anula como el vehículo, y `pago_anular` y `pago_eliminar` no dejan sin pago vivo a un proyecto con un ítem en una fase que pide
  `proyecto.pago_cliente`.
  **Lista:** `/logistica/gastos?ver=gastos|pagos` (`ENLACE_DE_DINERO` pide `logistica.gastos.ver`). `entities/dinero/listas.ts` manda sólo las claves que acepta
  cada RPC (una de más da `22023`); cursor `(fecha, id)` como instante a medianoche, sin «Anterior» ni sumas. La fila abre `?vehiculo=` de `/logistica`.
  **Prorratear:** `pantallas/dinero-grupo.ts`, hueco del resumen de un grupo (`logistica.gastos.editar`; no en el de una declaración). `entities/dinero/reparto.ts`
  repite la aritmética de centavos de `gastos_prorratear` (los que sobran, a los primeros) sólo para la vista previa. El `lote` es el id del intento: se
  conserva si no se sabe qué pasó y se renueva al cambiar lo escrito o al rechazar la base.
  **Categorías de gasto** (`logistica.catalogos.gestionar`): escritura directa bajo la RLS; `categoria.ts` fija los propósitos del `check` de la base.
- **Área `transporte`.** **Catálogos:** `pantallas/transporte-catalogos.ts`, sub-rutas «Puertos» y «Navieras» de Configuración › Catálogos (`/configuracion/catalogos/puertos` y `/navieras`)
  (`logistica.catalogos.gestionar`; cada catálogo trae su `clave` —el último tramo de su sub-ruta— y su frase). Escritura directa bajo la RLS (`infra/transporte/catalogos.ts`): 0 filas = «No tienes permiso…», nunca éxito; sin versión.
  **No hay «Eliminar»** (borrar dejaría nulos los transportes y vaciaría la oferta): se desactiva. `entities/transporte/catalogo.ts` valida (nombre 1–80, país
  ≤ 60, código ≤ 12 en mayúsculas sin espacios, orden 0–32.767); un puerto **sin país** no lo cubre la unicidad de la base (`NULL ≠ NULL`): la action lo mira,
  pero dos altas simultáneas pueden duplicarlo. `<AvisoDeTope>` a 200.
  **Hueco «Transporte»** (`pantallas/transporte-unidad.ts`; `logistica.ver`, regla `transporte`; sólo vehículos): escribe `guardarTransporte` →
  `transporte_guardar` con la versión leída. Opciones = la oferta del flujo (vacía = todos los activos) **más lo ya guardado**, rotulado «(inactiva)» o «(fuera
  de la oferta)» (`entities/transporte/oferta.ts`). `useBorradorDeTransporte` guarda los campos tocados: tras un `PT409`, «Recargar» trae la versión nueva y lo
  escrito sigue. Sin `logistica.transporte.editar` del origen, campos apagados con el motivo. `entities/transporte/transporte.ts` repite los textos de la base
  (contenedor y booking `^[A-Z0-9./-]{1,40}$` tras quitar **todo** espacio y pasar a mayúsculas; notas ≤ 2.000; ETA y arribo no antes del zarpe) sólo en lo
  que cambió; `porCampoDe` lleva el `hint` al campo. Un rechazo sin campo va en un aviso sobre «Guardar».
  **`/logistica/embarques`:** vistas `?grupo=embarques|contenedores` (cambiar suelta filtros y cursor). Sólo por RPC: `transporte_grupos()` por **cursor opaco**
  (`?cursor=` es el id de una fila, validado con `z.guid()`, no con `leerCursor`; en `scripts/guardas/areas-b/paginas-en-la-base.ts`) y `transporte_grupo()`
  (≤ 200, `hay_mas`, `hay_ocultas`: nunca un total). `cortada` (la base paró a las 2.000 filas) ofrece «Seguir buscando». Filtros
  (`entities/transporte/filtros.ts`): `naviera`, `puerto_origen`, `puerto_destino` (sin opciones no se dibujan), `en_transito` (sin arribo), `q` por prefijo.
  La fila escribe lo común, «Varias»/«Varios» si difieren y «—» si ninguna lo tiene o el id ya no está en el catálogo, nunca el uuid (`textosDelGrupo`). El
  resumen (`?booking=` o `?contenedor=`) lista unidades con fase y ETA (sin «días en la fase»: sería N+1) y monta los huecos de grupo de `mover`, `documentos`
  y `dinero` (`src/app/(app)/logistica/embarques/huecos-del-grupo.ts`) por permiso en cualquier origen, **sin mirar la regla de flujo**; la base exige por unidad.
  **«Editar grupo»:** `?panel=editar-grupo` **tapa** al resumen (`src/app` dibuja uno u otro). El botón sale con `logistica.transporte.editar` o
  `repuestos.editar` (`puedeEditarTransporte`, sin origen). `entities/transporte/edicion-del-grupo.ts`: lo que difiere sale vacío y un «Varios» vacío nunca se
  vacía; las versiones esperadas son las que vio el resumen. `aplicarAlGrupo` → `transporte_grupo_aplicar` (todo o nada, **sin `notas`**, devuelve la clave
  nueva si cambió contenedor o booking); `PT409` → «No se cambió ninguna: <motivo>» con «Recargar» que conserva lo escrito. Opciones: todos los activos (un
  grupo cruza flujos; la base revisa oferta y fase por unidad).

## Tablas

`documentos`, `puertos`, `navieras`, `transportes` (1:1 con la unidad), `declaraciones_aduana`, `declaraciones_vehiculos`, `categorias_gasto`, `gastos`, `pagos`, `notas`.
RPC: `margen_vehiculo`, `alertas_demora` (cron), `storage_refcount`, `logistica_cadena_resumen`, `logistica_cadena_columna` (la lista de una fase), `logistica_bandeja_grupo` (índices `transportes_llegadas_idx` y `transportes_salidas_idx`) y los ayudantes `_logistica_lo_propio` y `_bandeja_dia_*`; mover vía `flujos`. La oferta de transporte es de `flujos` (`flujo_oferta_guardar`);
logística sólo la lee con `flujo_oferta()`. Gastos y pagos se escriben sólo por RPC: `gasto_registrar`, `gasto_guardar`, `gasto_eliminar`, `gastos_prorratear`,
`pago_registrar`, `pago_registrar_proyecto`, `pago_guardar`, `pago_eliminar`, `pago_confirmar`, `pago_anular`; se leen por cursor con `gastos_listar` y
`pagos_listar`. El bucket `comprobantes` lo abre `comprobante_puede` (la fila que nombra el objeto).
**Alertas:** `trg_alertas_cerrar_al_mover` (en `historial_fases`) acciona los `demora_fase` abiertos de la unidad al moverla (`notificaciones_referencia_idx`).
`alertas_demora()` (job `alertas-demora`, cada hora en el minuto 12) recorre por lotes los pares (origen, fase) que alertan, avisa a quien tiene `flujos.mover`,
`logistica.ver` y `vehiculos.ver` del origen (el menor alcance: con `propios`, la unidad que creó o la de su cartera) y reabre el aviso pasado
`fases.alerta_cada_horas` (nulo = 72 h). `documentos_vencimientos()` (job `documentos-vencimientos`, 11:15 UTC) avisa `documento_por_vencer` a quien tiene
`logistica.documentos.subir` del origen (mismo menor alcance), una vez por persona y documento desde `vence_el - aviso_dias`; el texto cambia con
`modo_vencimiento`. `logistica_bandeja(p_tope)` (definer, `authenticated`; 5, máximo 20) da `{ demoradas, trabados, por_aprobar }`, cada una
`{ filas, hay_mas }`, de los orígenes que quien mira ve (por aprobar, además con `logistica.documentos.aprobar`); trabado = demorada a la que le falta un
requisito bloqueante para su fase siguiente. La lee `bandejaLogistica(TOPE_DE_BLOQUE)` (en la guarda de páginas).

## No se rompe

- La entidad agrupadora no es dueña de datos: documentos, gastos, pagos, notas y transporte cuelgan **siempre** de la unidad (`vehiculo_id | repuesto_id`, uno y sólo uno). Prorratear un flete = N filas de `gastos`.
- Mientras la unidad esté en una fase, no se vacía el dato ni se quita el documento que esa fase exige como bloqueante (triggers); si pasa igual, la unidad aparece «fuera de regla», no se expulsa.
- Confirmar un pago es un acto sellado (`pago_sellos`): quién y cuándo los pone el trigger, no el cliente.
- El margen devuelve `null` sin venta registrada; la UI dice «Sin venta registrada», nunca $0.

## Ojo

- Documentos nunca se comprimen; fotos sí (WebP). Objetos por hash; un documento común a 8 vehículos es 1 objeto y 8 filas.
- «DUI pagada» es derivada: todos los vehículos de la declaración tienen un gasto vivo de la categoría tributos. Comprobante ≠ pago.
- Conflicto al mover o editar transporte → `PT409` → «Alguien lo cambió · Recargar». Nunca pisar en silencio.
- Un requisito de dato cuya regla está apagada se puede pedir en `flujos` y su hueco aquí no se dibuja: **6-4** (`docs/PENDIENTES.md`).
