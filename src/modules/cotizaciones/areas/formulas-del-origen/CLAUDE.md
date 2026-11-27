# cotizaciones › formulas-del-origen

El área `formulas-del-origen` de `cotizaciones`: la barra de la fórmula de Planilla, Hoja y Tarjeta en la página del origen (elegir, crear, copiar, renombrar,
activar, archivar y eliminar las fórmulas del origen). Ficha del módulo: `../../CLAUDE.md` › «Áreas»; el dominio, `docs/COTIZADOR.md` › «Fórmulas del
origen».

## Qué es

Un origen tiene hasta 50 fórmulas sin archivar y a lo sumo una activa, la que se cotiza. La base lo decide todo (`formula_del_origen_crear|renombrar|archivar|
eliminar|activar`): el permiso (`cotizaciones.configurar` del origen y, al copiar de otro, también de ese), el nombre, el tope, la versión esperada y qué
tarjeta sirve. Acá se lee, se dibuja y se pide.

## Entradas

- `index.ts` (servidor): `leerFormulasDelOrigen(origenId)`, las no archivadas (tope 50, `hayMas`) con sus piezas de hoy (el borrador y la publicada de
  `formulas` y de `plantillas_tarjeta`, leídas en una segunda consulta por `formula_del_origen_id`) y `hayArchivadas`; `leerLaFormulaDelOrigen(origenId, id)`
  (con `cache()`), la fórmula del editor con la activa del origen, nula si no es de ese origen o no se ve.
- `composicion.client.ts` (navegador; sólo su feature): `leerArchivadas(origenId, cursor)` (de a `TAMANO_DE_VER_MAS` por `(archivada_en desc, id desc)`, hasta
  `TOPE_DE_LO_CARGADO`) y `leerFormulasParaCopiar(origenId, copiaId)` (las no archivadas del origen elegido y, si se pidió, la archivada que se copia).
- `composicion.ts` (servidor): `formulasDelOrigenSupabase`, el repositorio de las cinco RPC, que usan las actions de `features/formulas-del-origen/actions/`.
  Cada action pide `puede(ctx.permisos, 'cotizaciones.configurar', origenId)` antes de llamar y **no revalida**: la pantalla vuelve a leer con
  `router.refresh()` (crear abre la planilla nueva).
- `client.ts` vacío. Las pantallas: `pantallas/formulas-del-origen.ts` (`ConLaBarraDeLaFormula`, del núcleo, y `BarraDeLaFormulaDelOrigen`, que recibe el
  origen, la elegida, la lista leída, los orígenes de los que copia y lo que `src/app` pone de otras áreas: «Versiones» y «Tablas»). La puesta en marcha del origen (glosario) usa dos más, con los mismos modales
  (`components/puesta-en-marcha/`, su propio `diferidos.tsx`): `pantallas/formulas-del-origen-empezar.ts` (`EmpezarLaFormula`: «Empezar en blanco» o «Copiar la
  de otro origen», que abren «Nueva fórmula» con `&como=blanco|otro`, el nombre del origen propuesto y `alCrear`, que se queda en el paso) y
  `pantallas/formulas-del-origen-publicar.ts` (`PublicarLaFormula`: «Qué se publica» y «Publicar…», que abre «Activar» con `alActivar`, que lleva a «Listo»).

## La pantalla

- La barra (`components/barra/`): el selector «Fórmula: <nombre> (activa) ▾» abre un popover con la lista (código diferido, montado al abrirse): la activa
  primero (★) y las demás por nombre (`ordenDeLaLista()`), cada fila un enlace a la misma pestaña con `?formula=<id>` y su «⋯»
  (`menuDeLaFormulaDelOrigen()`); «Archivadas», plegada, se lee al abrirse; al pie, «Nueva fórmula». Al lado, el estado: el que registra el editor de la
  pestaña (`useEstadoEnLaBarra`) o, sin él, el de la fórmula (`estadoDeLaFormula()`). La elegida queda en la URL (`useFormulaEnLaUrl`, `replace`).
- Los paneles van por la URL (`entities/formulas-del-origen/rutas.ts`) y se montan una vez por pantalla (`usePanelesDeLaFormula()`): `?panel=nueva-formula`
  (`&copia=<id>` desde «Copiar»), `renombrar-formula`, `activar-formula`, `archivar-formula` y `eliminar-formula` (`&cual=<id>`: `formula` es la elegida). Archivar o eliminar la elegida
  lleva a la pestaña sin `?formula=` (la de trabajo). Uno que nombra una fórmula
  que no está en lo leído no se abre (`useRevisionAlAbrir()`).
- «Nueva fórmula» crea con un id por apertura; los avisos de la copia (`avisos-de-la-copia.ts`) quedan en `sessionStorage` (`claveDeLosAvisos(id)`) para la
  planilla, que abre con «Información de la fórmula» (`PANEL_DE_LA_INFORMACION` del núcleo) si hay alguno. En la Planilla y la Tarjeta, la barra pone `<RanuraDelEstado>`
  junto al estado, donde llega el ⓘ de cada una (`<AccionesEnLaBarra lugar="estado">`). «Activar» manda las ocho esperadas que se vieron (`esperadasDeActivar()`); un rechazo con `hint` ofrece ir al lugar
  (`destinoDelRechazoDeActivar()`). Eliminar una ya usada (23503) ofrece «Archivar».

## No se rompe

- Lo que otorga la activa se escribe sólo por RPC; ningún `.update()` sobre `formulas_del_origen`.
- Las esperadas viajan como el texto de la base, nunca por `Date`.
- Ningún área importa ésta: lo que la página del origen necesita sale por sus entradas.
