# artes/features/editor

El editor de artes a pantalla completa (`/artes/<id>`, en `src/app/(editor)/`): riel de herramientas, «Agregar» y «Capas», el lienzo de Konva y
el panel derecho con «Diseño» (el inspector) y «Textos» (`features/textos`), con atajos, deshacer, borrador local, guardar con versión y exportar
PNG. En Carta y A4, la **Tira de páginas** (docs/GLOSARIO.md) abajo del panel izquierdo y «Descargar PDF» en la barra. El arte se ve con el **Vehículo de ejemplo** (docs/GLOSARIO.md) elegido en la barra. Las reglas son puras en `entities/editor/` y
`entities/datos/`.

## Entra y sale

- Sale por `pantallas/artes-plantilla`: `PantallaDelEditor` (`'use client'`: el aviso de menos de 1024 px y, desde ahí, `EditorDeArtesDiferido`),
  `MarcoDelEditor` (puro: el marco en frío con las medidas de `rejilla.ts`; el `enFrio` del diferido, el `loading.tsx` y la cáscara del layout
  `(editor)`), `FueraDelEditor` (puro: la barra con «Volver a Artes» y un estado al centro) y `ErrorDelDocumento`.
- Entra de la página: `PropsDelEditorDeArtes` (`tipos.ts`): la plantilla con su documento ya leído, los logos de la empresa con archivo (los
  arma la página con `conArchivo(leerLogos())` de `empresa`: el módulo no lee `empresa` en el servidor), el motivo de sólo lectura (o nulo) y lo
  de `datos-del-editor.ts`: el origen con los campos de su ficha, el texto base, el Mensaje del portal, lo fijo del arte (`FijosDelArte`), el
  Modo Live de los clientes y los motivos de cada uno (sin `vehiculos.ver` en el origen, el disparador apagado).
- Lee el vehículo de ejemplo por las rutas GET de `src/app/(app)/artes/ejemplo/*` (`hooks/use-busqueda-de-vehiculos.ts`,
  `use-lectura-del-ejemplo.ts`, `use-cotizaciones-de-ejemplo.ts`, con `fetch`): las formas de lo que responden están en
  `entities/datos/respuestas.ts`.
- Usa del módulo: `guardarPlantillaDeArte` y `duplicarPlantillaDeArte` (`features/plantillas/actions/`), el modal de «Duplicar en otro formato»
  (`features/plantillas`), la biblioteca (`features/imagenes`: `useImagenes`, `leerMasImagenesDeArte`), `subirMiniatura` y `pedirElPdfDelArte`
  (`composicion.client.ts`).
- «Descargar PDF» (`components/barra/boton-descargar-pdf.tsx`, sólo en una plantilla de PDF, también en sólo lectura; `ANCHOS_DE_LA_BARRA.pdf`):
  `hooks/use-descarga-del-pdf-del-arte.ts` termina el texto abierto, manda lo que se ve con lo elegido (`eleccionDelEjemplo()`) al `POST
/artes/<id>/pdf`, un pedido a la vez y apagado sin conexión, y avisa si salió en blanco o sin alguna imagen.

## Archivos clave

- **Páginas** (sólo en un formato de PDF): `EstadoDelEditor.paginaId` es la elegida y toda acción escribe en ella (`paginaDe()`, `conPagina`;
  `medirTexto` lleva su `paginaId`). `hooks/use-paginas.ts` reparte ir, agregar, duplicar, mover y quitar (`entities/editor/paginas.ts`) con sus
  motivos; RePág y AvPág van a la anterior y a la siguiente. `components/paginas/`: `tira-de-paginas.tsx` (alto fijo de 9 rem, «Páginas» con su «+»
  y las miniaturas de costado, cada una con su número y su «⋯»), `orden-de-paginas.tsx` (dnd-kit, de costado; con el teclado, Espacio la toma y la
  suelta) y `menu-de-la-pagina.tsx`. `pestanas-del-panel-izquierdo.tsx` deja «Agregar» y «Capas» arriba: en un PDF el panel reparte su alto fijo.
- `components/lienzo/miniatura-de-la-pagina.tsx` — un `Stage` chico por página, `listening={false}`, en `memo` (sólo se redibuja la que cambió; la
  elegida va con `useDeferredValue`), con las fotos de 480 px y la misma `CapaDeContenido` que el lienzo. **La miniatura de la plantilla** sale del
  lienzo si muestra la página 1; si no, de la miniatura de la página 1 (`primera`, `use-documento-del-editor.ts`), siempre con los datos de ejemplo.
- **Las fuentes del PDF:** en un formato de PDF el lienzo dibuja la «Geist del PDF» (`FUENTE_DEL_PDF`: una `FontFace` por peso desde
  `/fuentes/geist/`, `use-fuentes-listas.ts`) y cada texto se parte con `disposicionDelTexto()` midiendo como Konva
  (`nodos/medir-en-el-navegador.ts`, con la versión de las fuentes cargadas: lo medido con el respaldo no vale). El inspector ofrece sólo Geist
  en 400, 500, 600 y 700, sin sombra ni borde de texto (`fuentesDelFormato`, `efectosDelFormato`).

- `components/editor-de-artes.tsx` — la raíz diferida: arma el estado y lo reparte por props a la barra, el riel, el panel izquierdo, el lienzo y
  el inspector (`tipos.ts` es el contrato entre ellos). Konva y react-konva sólo los importan `components/lienzo/**` y lo que carga esta raíz.
- `hooks/use-arte-con-datos.ts` — en orden: el vehículo de ejemplo y el catálogo del origen (`useEjemploDelEditor`), el documento
  (`use-documento-del-editor`) y los datos con que se ve la página (`useDatosDelEditor`: `capasConDatos()`, lo que falta, el Live).
  `hooks/use-trabajo-en-el-lienzo.ts` — la herramienta, el tamaño de la celda, la cámara, agregar y los atajos.
- `hooks/use-documento-del-editor.ts` — con qué arranca (`use-inicio-del-editor`: lo guardado o el borrador), el documento con su historial
  (`use-editor-de-arte`: `reducirEditor`), el nombre, el guardado (`use-guardado`, con su motivo para no guardar: una variable desconocida) y el
  borrador (`use-borrador-local`). La miniatura se arma sólo con los datos de ejemplo.
- `hooks/use-vehiculo-de-ejemplo.ts` — la elección (vehículo, cotización y lead), recordada por persona y plantilla en `localStorage`
  (`ejemplo-recordado.ts`, que también da `recordarElEjemplo` a `client.ts`); `use-lectura-del-ejemplo.ts` lee el elegido con su primera página de
  cotizaciones, y una lectura nueva deja sin efecto la anterior (`turno`).
- `components/barra/vehiculo-de-ejemplo.tsx` — el disparador de ancho fijo en la barra y su popover de alto fijo; el cuerpo
  (`components/ejemplo/`, diferido): buscar (3 letras o números; sin texto, lo más nuevo), la lista con «Ver más» hasta el tope, la cotización y el
  lead del elegido (selects nativos) y el pie con lo que se lee y «Usar los datos de ejemplo».
- `components/aviso-de-datos-que-faltan.tsx` — «A esta plantilla le faltan datos con este vehículo: …» (`textoDeLoQueFalta`, con tope y «y N
  más»), el último de `avisos-encima-del-lienzo.tsx`: sólo con un vehículo real y cerrado hasta que cambie la elección o lo que falta.
- `components/inspector/pestanas-del-inspector.tsx` — «Diseño» y «Textos» en la fila de 40 px; «Textos» (`PanelDeTextosDiferido`) se pide al
  abrirla y queda montada. `campos-de-la-foto.tsx` y `vista-del-foco.tsx`: la foto N, «Cubrir» o «Contener» y el foco.
  `aviso-de-las-variables.tsx`: la línea de abajo de «Texto» (la desconocida en rojo, la que no aplica en el origen).
- `hooks/use-atajos-del-editor.ts` y `acciones-del-teclado.ts` — los atajos en `window` (`accionDeLaTecla()` de `entities/editor/atajos.ts` dice
  cuál) y lo que hace cada uno; Esc, Ctrl+S y «?» por `useAtajo`.
- `components/lienzo/` — el `Stage` (cámara, rueda, mano, recuadro, herramientas que dibujan, pluma), los nodos en `memo` y la capa de interfaz
  (`name="interfaz"`: el Transformer, las guías, el contorno y las asas de la pluma), que se oculta al exportar.
- `components/capas/` (dnd-kit: arrastrar y teclado; `marca-de-datos.tsx`: con datos, o sin datos con el elegido), `components/agregar/` («Texto»
  con los datos del origen por grupo, `grupos-para-agregar.ts`; «De la cotización»: la tarjeta y las fotos; cada grupo, `role="group"`),
  `components/inspector/` y `components/barra/`.

## No se rompe

- Un texto se parte con `disposicionDelTexto()` y Konva sólo pinta las líneas (`wrap="none"`): el PDF las parte con la misma regla y las mismas
  medidas (`e2e/artes-pdf-contra-el-lienzo.spec.ts` compara el PNG de la página con el PDF).
- La tira tiene alto fijo y cada miniatura caja fija por formato (`ALTO_DE_LA_MINIATURA`): cambiar de página, agregar o quitar no cambia el tamaño
  del lienzo ni del panel (`e2e/artes-pdf.spec.ts`). Nunca se quita la última página; en sólo lectura la tira se mira y se elige, nada más.
- Nada de Konva fuera del árbol diferido: `rg "from 'konva'|react-konva"` encuentra sólo archivos de esta carpeta, y la página en frío no los pide
  (`e2e/artes-editor-aviso.spec.ts` lo mira).
- Ningún `Konva.Image` recibe una URL de otro origen: las imágenes entran por `fuenteDeLaCapa()` (`/artes/imagenes/<id>`, `/artes/logos/<variante>`,
  `/artes/fotos/<vehiculo>/<foto>`, `/cotizaciones/<id>/imagen` y `public/artes/ejemplo/`), sin `crossOrigin`. Si no, el lienzo queda «teñido» y
  exportar falla. Lo que no carga queda vacío en su caja y se suma a lo que falta.
- Sin nada elegido, todos los datos son de ejemplo; con un vehículo, todos reales (`ejemplo-con-datos.ts`): lo que falta se esconde, nunca se llena
  con uno de ejemplo. Lo elegido no entra al documento ni al historial.
- Con un vehículo real y los clientes apagados en el Modo Live, ningún nombre de lead llega al lienzo ni a la vista previa.
- Con una variable desconocida en algún texto, «Guardar» queda apagado con su motivo en el renglón del guardado («Corrige {x} para guardar.»);
  el borrador local se anota igual.
- El texto no se escala: ni el Transformer ni «Duplicar en otro formato» tocan `tamano` (el Transformer cambia la caja y el texto se vuelve a
  medir, `medirTexto`).
- Un guardado a la vez, cada uno con la versión que devolvió el anterior (`useUnEnvioALaVez`): si no, `PT409` contra uno mismo.
- Guardar y exportar terminan antes el texto que se escribe encima del lienzo (`terminarElTexto()` del `ManejoDelLienzo`): Ctrl+S vale dentro
  del campo y, si no, guardaría sin lo escrito.
- Las columnas tienen ancho fijo y la barra alto fijo (`rejilla.ts`, las mismas en frío, con el hueco del disparador): elegir, editar, cambiar
  de pestaña o de vehículo de ejemplo no cambia el tamaño del lienzo (`e2e/artes-editor-sin-saltos.spec.ts` y `artes-editor-con-datos.spec.ts` lo
  miden). Los avisos van encima del lienzo (`ENCIMA_DEL_LIENZO`).
- A 1024 px la barra entra entera: el disparador y el renglón del guardado miden por ancho de pantalla (`ANCHOS_DE_LA_BARRA`), lo de la derecha no
  se encoge y se corta el nombre (`artes-editor-con-datos.spec.ts` › «a 1024 px»); en sólo lectura, el nombre con su tope y el motivo.
- En sólo lectura el reducer no cambia el documento, sólo se usan mover y mano y no hay borrador.

## Ojo

- La rueda se escucha nativa con `{ passive: false }` (si no, Ctrl+rueda acerca la página del navegador).
- Los `dragstart`, `dragmove` y `dragend` de cada nodo llegan al `Stage` (burbujean): `use-arrastre-de-capas` atiende sólo el del nodo de la
  capa (no el del `Stage`, no el de una parte de adentro) y la cámara se mueve con la mano, nunca arrastrando el `Stage`.
- Un SVG sin medidas no se dibuja en Firefox: quien lo carga le pone `width` y `height` de su fila (los de ejemplo las traen).
- `window.Konva.stages` incluye las miniaturas de la tira: lo que busca el `Stage` del lienzo filtra por `section[aria-label="Lienzo"]`.
- En un PDF, «Exportar esta página en PNG» exporta la elegida (`<nombre>-pagina-2.png` con más de una).
- Exportar espera las fuentes (`document.fonts`) y las imágenes (hasta 10 s), lleva el `Stage` a la identidad y oculta `.interfaz`, y lo repone
  en el `finally`.
- Copiar y pegar van por `localStorage` (`CLAVE_DEL_PORTAPAPELES`): entre pestañas del editor, no el portapapeles del sistema.
- El borrador vive en `localStorage` por persona y plantilla (`claveDelBorrador`): se anota unos segundos después del último cambio y al salir,
  y guardar lo borra.
- La elección del vehículo de ejemplo también (`claveDelEjemplo`), siempre en try/catch: lo recordado que ya no se ve (un 404) se suelta en
  silencio, y en modo privado la elección vale mientras la pantalla esté abierta.
- El alto de un texto no cuenta para «Cambios sin guardar»: cambia al llenarse con otro vehículo (el texto se vuelve a medir).
