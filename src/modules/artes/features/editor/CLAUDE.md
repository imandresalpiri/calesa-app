# artes/features/editor

El editor de artes a pantalla completa (`/artes/<id>`, en `src/app/(editor)/`): riel de herramientas, «Agregar» y «Capas», el lienzo de Konva y
el inspector «Diseño», con atajos, deshacer, borrador local, guardar con versión y exportar PNG. Las reglas son puras en `entities/editor/`.

## Entra y sale

- Sale por `pantallas/artes-plantilla`: `PantallaDelEditor` (`'use client'`: el aviso de menos de 1024 px y, desde ahí, `EditorDeArtesDiferido`),
  `MarcoDelEditor` (puro: el marco en frío con las medidas de `rejilla.ts`; el `enFrio` del diferido, el `loading.tsx` y la cáscara del layout
  `(editor)`), `FueraDelEditor` (puro: la barra con «Volver a Artes» y un estado al centro) y `ErrorDelDocumento`.
- Entra de la página: `PropsDelEditorDeArtes` (`tipos.ts`): la plantilla con su documento ya leído, los logos de la empresa con archivo (los
  arma la página con `conArchivo(leerLogos())` de `empresa`: el módulo no lee `empresa` en el servidor) y el motivo de sólo lectura (o nulo).
- Usa del módulo: `guardarPlantillaDeArte` y `duplicarPlantillaDeArte` (`features/plantillas/actions/`), el modal de «Duplicar en otro formato»
  (`features/plantillas`), la biblioteca (`features/imagenes`: `useImagenes`, `leerMasImagenesDeArte`) y `subirMiniatura` (`composicion.client.ts`).

## Archivos clave

- `components/editor-de-artes.tsx` — la raíz diferida: arma el estado y lo reparte por props a la barra, el riel, el panel izquierdo, el lienzo y
  el inspector (`tipos.ts` es el contrato entre ellos). Konva y react-konva sólo los importan `components/lienzo/**` y lo que carga esta raíz.
- `hooks/use-documento-del-editor.ts` — con qué arranca (`use-inicio-del-editor`: lo guardado o el borrador), el documento con su historial
  (`use-editor-de-arte`: `reducirEditor`), el nombre, el guardado (`use-guardado`) y el borrador (`use-borrador-local`).
- `hooks/use-atajos-del-editor.ts` y `acciones-del-teclado.ts` — los atajos en `window` (`accionDeLaTecla()` de `entities/editor/atajos.ts` dice
  cuál) y lo que hace cada uno; Esc, Ctrl+S y «?» por `useAtajo`.
- `components/lienzo/` — el `Stage` (cámara, rueda, mano, recuadro, herramientas que dibujan, pluma), los nodos en `memo` y la capa de interfaz
  (`name="interfaz"`: el Transformer, las guías, el contorno y las asas de la pluma), que se oculta al exportar.
- `components/capas/` (dnd-kit: arrastrar y teclado), `components/agregar/`, `components/inspector/` y `components/barra/`.

## No se rompe

- Nada de Konva fuera del árbol diferido: `rg "from 'konva'|react-konva"` encuentra sólo archivos de esta carpeta, y la página en frío no los pide
  (`e2e/artes-editor-aviso.spec.ts` lo mira).
- Ningún `Konva.Image` recibe una URL de otro origen: las imágenes entran por `fuenteDeLaCapa()` (`/artes/imagenes/<id>`, `/artes/logos/<variante>`
  y `public/artes/ejemplo/`), sin `crossOrigin`. Si no, el lienzo queda «teñido» y exportar falla.
- El texto no se escala: ni el Transformer ni «Duplicar en otro formato» tocan `tamano` (el Transformer cambia la caja y el texto se vuelve a
  medir, `medirTexto`).
- Un guardado a la vez, cada uno con la versión que devolvió el anterior (`useUnEnvioALaVez`): si no, `PT409` contra uno mismo.
- Guardar y exportar terminan antes el texto que se escribe encima del lienzo (`terminarElTexto()` del `ManejoDelLienzo`): Ctrl+S vale dentro
  del campo y, si no, guardaría sin lo escrito.
- Las columnas tienen ancho fijo y la barra alto fijo (`rejilla.ts`, las mismas en frío): elegir, editar o cambiar de pestaña no cambia el
  tamaño del lienzo. Los avisos van encima del lienzo (`ENCIMA_DEL_LIENZO`).
- En sólo lectura el reducer no cambia el documento, sólo se usan mover y mano y no hay borrador.

## Ojo

- La rueda se escucha nativa con `{ passive: false }` (si no, Ctrl+rueda acerca la página del navegador).
- Los `dragstart`, `dragmove` y `dragend` de cada nodo llegan al `Stage` (burbujean): `use-arrastre-de-capas` atiende sólo el del nodo de la
  capa (no el del `Stage`, no el de una parte de adentro) y la cámara se mueve con la mano, nunca arrastrando el `Stage`.
- Un SVG sin medidas no se dibuja en Firefox: quien lo carga le pone `width` y `height` de su fila (los de ejemplo las traen).
- Exportar espera las fuentes (`document.fonts`) y las imágenes (hasta 10 s), lleva el `Stage` a la identidad y oculta `.interfaz`, y lo repone
  en el `finally`.
- Copiar y pegar van por `localStorage` (`CLAVE_DEL_PORTAPAPELES`): entre pestañas del editor, no el portapapeles del sistema.
- El borrador vive en `localStorage` por plantilla (`claveDelBorrador`): se anota unos segundos después del último cambio y al salir, y guardar lo
  borra.
