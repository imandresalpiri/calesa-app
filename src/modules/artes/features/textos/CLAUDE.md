# artes/features/textos

La pestaña «Textos» del editor de artes, junto al lienzo: el **Texto base del origen** (docs/GLOSARIO.md) con su vista previa con los datos del
lienzo y, debajo, el **Mensaje del portal** de `leads`. Dos secciones planas, cada una con su título y su guardado.

## Entra y sale

- Sale: `PanelDeTextos` (`components/panel-de-textos.tsx`, `'use client'`), que `features/editor` monta diferido en la pestaña. Lo que recibe es
  `PropsDelPanelDeTextos` (`tipos.ts`): el origen (id, nombre, tipo), su `CatalogoDelArte`, el texto base leído (`null` si no se pudo: parte de
  `textoBaseInicial(tipo)` y guardar crea la fila), el Mensaje del portal con su versión, el motivo de sólo lectura de cada uno, los `DatosDelArte` del
  ejemplo del lienzo y el Modo Live (`sinMoneda`).
- La página lee el texto base con `leerTextoBase(origenId)` (`index.ts`, `infra/textos-base.ts`: `{ texto, actualizadoEn } | null`, por la PK de
  `artes_textos_base`) y arma el motivo con `motivoSinPermisoDelTextoBase(origen)` si quien mira no tiene `cotizaciones.configurar` en el origen.
- Guarda con `guardarTextoBaseDelOrigen` (`actions/`): `cotizaciones.configurar` en el origen, las reglas de `validarTextoBase()` dichas antes
  (`entities/datos/texto-base.ts`, espejo de `artes_texto_base_guardar()`) y la versión esperada. No revalida: devuelve la versión nueva y el panel
  sigue con ella. `PT409` → conflicto con el mensaje de la base, `42501` → el motivo del origen, `22023` con `hint` → junto al campo.
- Depende de `origenes` (la action lee el tipo del origen y los campos de su ficha: `getOrigenes`, `leerLayout`) y de `leads/client`
  (`EditorDelMensajeDelPortal`, que guarda el mensaje por su cuenta).

## Archivos clave

- `hooks/use-texto-base.ts` — lo escrito sobre lo guardado (una versión nueva por props sólo pisa lo escrito si no había nada), las reglas en
  vivo, un envío a la vez con la versión (`useEnvioConVersion`), el estado de la línea del guardado (guardando, guardado, conflicto, sin red,
  error) y el borrador en `sessionStorage` (`artes:texto-base:<origenId>:<actualizadoEn>`).
- `components/seccion-del-texto-base.tsx` — el `EditorConVariables` compacto con las variables del catálogo (las `{ficha.<campo>}` activas y las
  `{celda.<concepto>}` valen al escribirlas: `valeEnElOrigen()`), la vista previa, «Guardar», «Restablecer» (pone el inicial del tipo) y la línea
  de dos renglones reservados (o el aviso de conflicto con «Recargar»).
- `components/vista-previa-con-datos.tsx` — `resolverTexto()` con `valoresDelArte()`: como sale al compartir (la línea de una variable vacía se
  quita), en una caja de alto fijo.

## No se rompe

- La versión esperada viaja como el texto que dio la base, nunca por `Date`; nula sólo si la fila no se pudo leer.
- Guardar no remonta ni refresca la página: el panel aplica la versión que devolvió la RPC. Si la pestaña se desmonta, la página debe darle la
  versión nueva o mantenerlo montado: con la vieja, el próximo guardado choca con uno mismo (`PT409`).
- Nada salta: la vista previa tiene alto fijo y la línea del guardado, dos renglones reservados.
- Las `{celda.*}` no se ofrecen como botón (cambian con cada cotización): se aceptan escritas.
