# artes

Plantillas de arte (un formato de redes o de PDF, por origen, privadas o de la empresa), el editor de artes que las dibuja, la biblioteca de
imágenes que usan y la plantilla por defecto de cada persona para compartir una cotización.

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
- `index.ts`: las lecturas de las dos páginas (`leerPlantillaParaEditar`) y de las rutas de imágenes, `puedeEditarLaPlantilla`, los filtros
  puros (`esquemaDeFiltrosDeArtes`, `pedidoDePlantillas`, `leerPestana`, `claveDelPedido`), `origenesDeArtes()` y
  `leerArteParaCompartir(origenId, tipo)` (qué se comparte de una cotización: la plantilla por defecto de quien mira si todavía la ve; si no, lo
  de hoy). `client.ts`: sólo tipos.
- Quién entra: quien ve cotizaciones de algún origen (`cotizaciones.ver`). Sin ninguno, `MOTIVO_SIN_ARTES`. En el Modo Live sigue a «Cotizaciones».
- Depende de `equipo` (sesión, `puede()`), `origenes` (la página pasa la lista) y `empresa/client` (las reglas del SVG: `medidasDeSvg`,
  `motivoDeSvgInvalido`, `PESO_MAXIMO_SVG`). Los logos del editor los lee la página (`leerLogos()` de `empresa`) y los pasa por props; la ruta
  de un logo los lee con `archivoDelLogoDeArte`.

## Archivos clave

- `entities/formatos.ts` — los formatos (`FORMATOS_DE_ARTE`: redes en px, PDF en puntos; «Personalizado», cada lado de 320 a 4.096 px), espejo de
  `_artes_medidas_validas()` y `_artes_tipo_del_formato()` (`scripts/guardas/formatos-de-arte.test.ts` compara los dos).
- `entities/documento.ts` — la forma del documento (versión 2: `documentoVacio()`, `imagenesDelDocumento()`, `migrarDocumento()`), espejo de
  `_artes_documento_valido()`.
- `entities/editor/` — las reglas puras del editor: el estado y su reducer (`estado.ts`, `historial.ts`, `orden.ts`, `grupos.ts`), la cámara,
  las guías y alinear, la pluma, los atajos (`atajos.ts`: tecla → acción), «Duplicar en otro formato» (`otro-formato.ts`), el borrador, exportar,
  el guardado y lo que muestra cada panel. `features/editor/` — los componentes y hooks (su ficha).
- `entities/permisos-de-artes.ts` — `QuienMira` y quién edita, cambia la visibilidad o elimina; `acciones-de-la-plantilla.ts` y
  `acciones-de-la-imagen.ts` arman cada «⋯» con su motivo.
- `entities/imagenes.ts` — los tipos admitidos, el tope de lado y de peso, la miniatura de 480 px y `textoDeUsos()`.
- `entities/por-defecto.ts` — `queSeComparte()` y `esLaPorDefecto()`.
- `features/plantillas/hooks/use-carga-de-artes.ts` — la paginación de las dos pestañas; `use-fila-por-url.ts` — un diálogo sobre una fila por la
  URL (una que no está en lo cargado no abre).
- `features/imagenes/hooks/preparar-imagen.ts` — al elegir el archivo (`comoSeGuarda()`): opaca, WebP ≤ 1600 px; con transparencia, tal cual si ya es
  PNG o WebP y cabe, si no PNG; siempre con su miniatura de 480 px. Un SVG pasa las reglas del de la marca y es su propia miniatura.
  `infra/subida.client.ts` sube por hash.

## Tablas

`artes_plantillas` (el documento no se lee en las listas), `artes_imagenes`, `artes_plantillas_imagenes` (qué imágenes nombra cada documento: los
usos por índice) y `artes_por_defecto` (por persona, origen y tipo; la lee sólo su dueño). Bucket privado `artes` (`imagenes/<sha256>.<ext>`,
`miniaturas/<sha256>.<ext>`), servido con URL firmada. Permiso `artes.empresa.gestionar`.
RPC (`security definer`): `artes_plantilla_crear`, `_guardar`, `_duplicar`, `_visibilidad`, `_eliminar`, `artes_por_defecto_poner`, `artes_imagen_crear`,
`_renombrar`, `_usos` (con tope: 101 dice «más de 100»), `_quitar`. Pruebas: `supabase/tests/areas/artes/`.

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
