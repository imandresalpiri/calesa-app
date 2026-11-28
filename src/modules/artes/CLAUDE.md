# artes

Plantillas de arte (un formato de redes o de PDF, por origen, privadas o de la empresa), el editor de artes que las dibuja, la biblioteca de
imágenes que usan, los datos con que se llena un arte (el vehículo de ejemplo, el **Texto base del origen**) y la plantilla por defecto de
cada persona para compartir una cotización.

## Entra y sale

- Sale: `/artes` (`pantallas/artes-seccion.ts`), en el menú después de Cotizaciones. Dos pestañas (`?pestana=imagenes`; sin el parámetro, Plantillas),
  `<PestanasDeArtes>` sobre nuqs: cambiar de pestaña borra los filtros y los paneles.
  - **Plantillas**: tarjetas con su «⋯» (`lineasDeLaPlantilla()`), filtros como chips en la URL (`?origen=`, `?formato=`, `?de=mias|empresa`), «Nueva
    plantilla» en `?panel=nueva`, eliminar en `?panel=eliminar&plantilla=<id>` y hacer privada la de otra persona en `?panel=privada&plantilla=<id>`.
  - **Imágenes** (diferida: su código no viaja en frío): «Subir imagen» en `?panel=subir`, renombrar en `?panel=renombrar&imagen=<id>` y quitar en
    `?panel=quitar&imagen=<id>` (con los usos leídos al abrir).
  - Las dos: «Ver más» por una Server Action que lee en el servidor (`leerMasPlantillasDeArte`, `leerMasImagenesDeArte`; `TAMANO_DE_VER_MAS`, hasta
    `TOPE_DE_LO_CARGADO`): supabase-js no viaja en frío. Tras una mutación la lista vuelve a la primera página.
- Sale: `/artes/[id]` (`pantallas/artes-plantilla.ts`), en `src/app/(editor)/`: el editor de artes a pantalla completa (su ficha:
  `features/editor/CLAUDE.md`); sin verla, «No encontramos esta plantilla de arte.». No redirige.
- Sale: `/artes/imagenes/[id]` y `/artes/logos/[variante]` (`route.ts` en `(app)`): las imágenes del lienzo por el mismo origen, con sesión y la
  guarda del Live (`archivoDeLaImagenDeArte`, `archivoDelLogoDeArte`, `cabecerasDelMedio`).
- Entra por `src/app`: el **vehículo de ejemplo** del editor. `artes` no importa `vehiculos`, `cotizaciones`, `web` ni `leads/index` (`cotizaciones`
  va a depender de `artes` para compartir con plantilla): las arma `src/app/(app)/_arte/` (`datos-del-arte.ts`, `lead-de-ejemplo.ts` con el filtro
  del Live, `leer-fijos-del-arte.ts`) en rutas GET JSON nunca guardadas (`SIN_MEDIO`), con la sesión de quien pide y la guarda del Live, y el módulo sólo define sus formas
  (`entities/datos/respuestas.ts`, `DatosDelArte`):
  - `/artes/ejemplo/vehiculos?origen=&q=&cursor=` — los del origen que quien mira ve (`vehiculos.ver`), de a `TAMANO_DE_VER_MAS`, con su portada.
  - `/artes/ejemplo/vehiculos/[id]?origen=` — los datos del vehículo (ficha, subasta, fotos en orden) y sus leads relacionados (sólo el nombre;
    con los clientes apagados en el Live, el motivo).
  - `/artes/ejemplo/vehiculos/[id]/cotizaciones?cursor=` — «De este vehículo» (`leerPaginaDeEsteVehiculo` de `cotizaciones`).
  - `/artes/ejemplo/cotizaciones/[id]` — el total con su modo, número, vigencia y las celdas del nivel «todos».
  - `/artes/fotos/[vehiculo]/[foto]?ancho=480|1600` — la foto del vehículo por el mismo origen, sólo por ids (inmutable: el objeto es por
    hash; 304 con su ETag): la única puerta de una foto al lienzo.
- Sale: `POST /artes/[id]/pdf` (`src/app/(app)/artes/[id]/pdf/route.ts`, `rutaDelPdfDelArte()`): «Descargar PDF» del editor en una plantilla de
  PDF. Recibe lo que se ve (`{ documento, eleccion }`, `esquemaDelPedidoDelPdf`: el documento se valida como al guardar y lo elegido son sólo
  ids) y responde el PDF adjunto con `X-Imagenes-Que-Faltan`; sólo del mismo sitio (`vieneDelMismoOrigen()`), con la sesión de quien pide y la
  guarda del Live. Lo arma `src/app/(app)/_arte/pdf/`: vuelve a leer la plantilla, el vehículo, la cotización y el lead por id
  (`leer-vehiculo-del-arte.ts`, `leer-cotizacion-del-arte.ts`, las mismas lecturas de las rutas del ejemplo), resuelve las capas con los
  datos del servidor (`paginasConDatos()`, con su moneda) y baja cada imagen por su origen (`deDondeSaleLaImagen()`: la biblioteca, el logo,
  la foto del vehículo elegido, la tarjeta de su cotización armada con `armarLaImagen()` y las de ejemplo), de a 4, con tope de peso y de
  espera; la que no llega no va y se cuenta. Del navegador, `pedirElPdfDelArte()` (`composicion.client.ts`).
- La página `/artes/[id]` lee además (`src/app/(editor)/artes/[id]/datos-del-editor.ts`) el texto base del origen, el Mensaje del portal, lo fijo
  del arte (empresa, quien comparte, redes) y los motivos de sólo lectura, y los pasa por props.
- `index.ts`: las lecturas de las dos páginas (`leerPlantillaParaEditar`) y de las rutas de imágenes, `puedeEditarLaPlantilla`, los filtros
  puros (`esquemaDeFiltrosDeArtes`, `pedidoDePlantillas`, `leerPestana`, `claveDelPedido`), `origenesDeArtes()` y
  `leerArteParaCompartir(origenId, tipo)` (qué se comparte de una cotización: la plantilla por defecto de quien mira si todavía la ve; si no, lo
  de hoy). Para compartir con plantilla: `leerTextoBase(origenId)`, `textoBaseInicial`, `validarTextoBase`, el resolver puro
  (`resolverTexto`, `capasConDatos`, `valoresDelArte`, `variablesDelArte`, `textoDeLoQueFalta`, `fotosEnOrden`), las formas de los datos y de las
  respuestas de las rutas, y los motivos del editor.
- `client.ts`: el resolver puro y sus tipos, `claveDelEjemplo` y `recordarElEjemplo(personaId, plantillaId, eleccion)` (deja elegido el vehículo de
  ejemplo antes de abrir el editor), y los tipos de las plantillas y los formatos.
- Quién entra: quien ve cotizaciones de algún origen (`cotizaciones.ver`). Sin ninguno, `MOTIVO_SIN_ARTES`. En el Modo Live sigue a «Cotizaciones».
- Depende de `equipo` (sesión, `puede()`), `origenes` (la página pasa la lista; la action del texto base lee el tipo y los campos de la ficha),
  `empresa/client` (las reglas del SVG: `medidasDeSvg`, `motivoDeSvgInvalido`, `PESO_MAXIMO_SVG`) y `leads/client` (`EditorDelMensajeDelPortal`,
  en la pestaña «Textos»). Los logos del editor los lee la página (`leerLogos()` de `empresa`) y los pasa por props; la ruta
  de un logo los lee con `archivoDelLogoDeArte`.

## Archivos clave

- `entities/formatos.ts` — los formatos (`FORMATOS_DE_ARTE`: redes en px, PDF en puntos; «Personalizado», cada lado de 320 a 4.096 px), espejo de
  `_artes_medidas_validas()` y `_artes_tipo_del_formato()` (`scripts/guardas/formatos-de-arte.test.ts` compara los dos).
- `entities/documento.ts` — la forma del documento (versión 3: `documentoVacio()`, `imagenesDelDocumento()`, `migrarDocumento()`; la v3 suma el
  foco de la foto), espejo de `_artes_documento_valido()`. `entities/capas-del-documento.ts` — las capas, también las con datos (`foto`,
  `tarjeta`, el texto con variables).
- `entities/datos/` — con qué se llena un arte, puro: las variables por tipo de origen (`variables-del-arte.ts`, el catálogo con los campos de
  la ficha), sus valores (`valores-del-arte.ts`: la subasta en la zona de la empresa, la hora del patio, los montos con y sin moneda),
  `resolverTexto()` (la línea de una variable vacía se quita), `capasConDatos()` (lo que se esconde y lo que falta), el texto base
  (`texto-base.ts`, espejo de `artes_texto_base_guardar()`; `texto-base-inicial.ts`, espejo de `_artes_texto_base_inicial()`), la elección
  recordada (`ejemplo-elegido.ts`) y las formas de las respuestas de las rutas del ejemplo.
- `entities/editor/` — las reglas puras del editor: el estado y su reducer (`estado.ts`, `historial.ts`, `orden.ts`, `grupos.ts`), la cámara,
  las guías y alinear, la pluma, los atajos (`atajos.ts`: tecla → acción), «Duplicar en otro formato» (`otro-formato.ts`), el borrador, exportar,
  el guardado y lo que muestra cada panel. `features/editor/` — los componentes y hooks (su ficha).
- `entities/permisos-de-artes.ts` — `QuienMira` y quién edita, cambia la visibilidad o elimina; `acciones-de-la-plantilla.ts` y
  `acciones-de-la-imagen.ts` arman cada «⋯» con su motivo.
- `entities/imagenes.ts` — los tipos admitidos, el tope de lado y de peso, la miniatura de 480 px y `textoDeUsos()`.
- `entities/por-defecto.ts` — `queSeComparte()` y `esLaPorDefecto()`.
- `features/textos/` — la pestaña «Textos» del editor (su ficha).
- `features/plantillas/hooks/use-carga-de-artes.ts` — la paginación de las dos pestañas; `use-fila-por-url.ts` — un diálogo sobre una fila por la
  URL (una que no está en lo cargado no abre).
- `features/imagenes/hooks/preparar-imagen.ts` — al elegir el archivo (`comoSeGuarda()`): opaca, WebP ≤ 1600 px; con transparencia, tal cual si ya es
  PNG o WebP y cabe, si no PNG; siempre con su miniatura de 480 px. Un SVG pasa las reglas del de la marca y es su propia miniatura.
  `infra/subida.client.ts` sube por hash.

## Tablas

`artes_plantillas` (el documento no se lee en las listas), `artes_imagenes`, `artes_plantillas_imagenes` (qué imágenes nombra cada documento: los
usos por índice), `artes_por_defecto` (por persona, origen y tipo; la lee sólo su dueño) y `artes_textos_base` (uno por origen, con versión; lo
lee quien ve cotizaciones del origen; nace con `_artes_texto_base_inicial(tipo)` para los orígenes que había y por `trg_origen_texto_base` al
dar de alta uno). Bucket privado `artes` (`imagenes/<sha256>.<ext>`,
`miniaturas/<sha256>.<ext>`), servido con URL firmada. Permiso `artes.empresa.gestionar`.
RPC (`security definer`): `artes_plantilla_crear`, `_guardar`, `_duplicar`, `_visibilidad`, `_eliminar`, `artes_por_defecto_poner`, `artes_imagen_crear`,
`_renombrar`, `_usos` (con tope: 101 dice «más de 100»), `_quitar`, `artes_texto_base_guardar` (`cotizaciones.configurar` del origen, las mismas
reglas que `validarTextoBase()`, la versión y `PT409`). Pruebas: `supabase/tests/areas/artes/`.

## No se rompe

- Se escribe sólo por RPC: las tablas no tienen grant de escritura. Cada RPC repite el permiso y la regla; las de edición llevan la versión (`PT409`).
- Una plantilla se ve con `cotizaciones.ver` de su origen; la privada, sólo su autor. Nace privada. La de la empresa la cambia, la hace privada o la
  elimina quien tiene `artes.empresa.gestionar`; la propia, su autor.
- Una plantilla de la empresa sólo nombra imágenes de la empresa (`_artes_validar_imagenes()`, también al hacerla de la empresa).
- Una imagen con usos no se quita: la RPC devuelve cuántas plantillas la usan (también las que quien mira no ve).
- El documento pesa como mucho 512 KiB medidos en la base (`jsonb::text`).
- El texto no se escala al cambiar de formato ni con el Transformer: `reacomodarEnOtroFormato()` ancla cada capa a su centro y deja `tamano`
  (el test A → B → A lo fija).
- Las imágenes entran al lienzo sólo por las rutas del mismo origen (o `public/artes/ejemplo/`), por id: nunca una URL firmada en el documento.
  Las fotos de un vehículo, sólo por `/artes/fotos/<vehiculo>/<foto>`; la tarjeta, por `/cotizaciones/<id>/imagen`.
- Lo elegido como ejemplo no se guarda en el documento: va en el `localStorage` de quien mira (`artes:ejemplo:<persona>:<plantilla>`). La
  miniatura se arma sólo con los datos de ejemplo.
- Sin nada elegido, todo es de ejemplo; con un vehículo, todo es real, sin mezclar. Lo que falta se esconde (la línea entera de un texto).
- Una variable desconocida en el lienzo no se dibuja y no deja guardar la plantilla (sí el borrador); `{lote}` y las de subasta en un origen
  manual no aplican: su línea se quita y no traban el guardado.
- Los grupos son planos y contiguos: un id que comparten capas seguidas, sin grupos dentro de grupos.
- `storage_refcount('artes', …)` cuenta las tres columnas con rutas (`artes_imagenes.ruta`, `.miniatura_ruta`, `artes_plantillas.miniatura_ruta`);
  quien borra una fila encola sus rutas (`_encolar_para_limpiar`) y el barrido tiene su rama para el bucket.

## Ojo

- Safari no codifica WebP en un `<canvas>`: la imagen y su miniatura caen a JPEG (por eso la base admite `jpg`).
- Las miniaturas son URL firmadas de 600 s (`SEGUNDOS_DE_LA_MINIATURA`) dibujadas con `next/image` `unoptimized`; si una falla, el marcador con
  la proporción del formato.
- Un SVG de la biblioteca sólo pasa las reglas en el navegador: se dibuja siempre como `<img>` (`MiniaturaDeArte`), nunca en línea.
- La base busca las imágenes del documento sólo en `paginas[*].capas[*]` de tipo `imagen` (`_artes_imagenes_del_documento()`): un lugar nuevo
  para una imagen (un fondo, un grupo) amplía a la vez esa función, `imagenesDelDocumento()` y el esquema del documento.
