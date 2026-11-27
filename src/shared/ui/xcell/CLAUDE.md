# shared/ui/xcell

La celda de la hoja de cotizar (`docs/COTIZADOR.md` › «Binding con la XCell»; `docs/UX.md` › «Cotizar», 3). Dibuja y maneja **una** celda a partir de props:
no lee la base y **no calcula nada**. Dice «esta celda pasó a N» (`onCommit`) o «volver» (`onReset`) y la base recalcula.

## Entra y sale

- Entra: `@/shared/lib` (`formato`, `cifra-fija`, `color`, `numero-tipeado`), `../monto`, `../monto-con-decimales`, `../regional`, `../live`, `../lista/simbolos-de-lista` (los trazos de los iconos).
- Sale: `index.ts` → `XCell`, `EstiloDeTonos`, `SimbolosDeXCell` y los tipos; la usan la hoja de `cotizaciones` y la de ítems de `repuestos`. También
  `TextoDeValor` (lo que dice una celda cuando no se edita, con sus «Decimales»: la columna Ejemplo y el panel «Decimales» de la planilla). También
  `BOTON_DEL_VALOR` y `ENTRADA` (`clases.ts`: el estilo de lo editable, para otra superficie que quiera marcar así sus celdas) y `XCELL_COMPACTA` (la celda
  densa de una tabla: la pone `repuestos` en el contenedor de sus celdas). `xcell.soporte.tsx` (`celda()`, `abrir()`,
  `BASE`) es **sólo de las pruebas** (importa vitest y testing-library; `scripts/mapa.sh` no lista los `.soporte.`).
- La hoja monta **una vez** `<SimbolosDeXCell/>` (los iconos y la descripción que anuncia las flechas) y `<EstiloDeTonos tonos={…}/>` (las filas de
  `tonos`, que lee ella; `shared` no las busca).

## El contrato con la hoja (props primitivas)

`id, label, format ('monto'|'porcentaje'|'numero'), currency?, decimals?` (sólo la vista), `value, defaultValue?, suggested, overridden, handEdited?,
calculatedValue?, calculatedFormat?, calculatedDecimals?, disabledReason?, secondaryDisabledReason?, tone?, error?, secondaryId?, secondaryValue?, secondaryFormat?, secondaryDecimals?, secondaryProminent?, hasHelp?, hasSettings?, onHelp?(id), onSettings?(id), onCommit(id, valor|null), onReset(id)`.

- **`decimals`, `secondaryDecimals` y `calculatedDecimals`** (los «Decimales» de una celda, glosario; los llena la hoja desde el nodo): **N fijos**
  (mínimo y máximo N), con la cifra redondeada antes mitad lejos de cero (`redondeadaParaMostrar()` y `formatearConDecimales()` de `cifra-fija.ts`, sobre
  `redondear()`: `Intl` solo da otra cifra en un casi empate); en un porcentaje, los de los puntos («14,9 %» con 1). Sin ellos, lo de siempre: 2 en un
  monto, hasta 2 en un número o un porcentaje. Sólo la vista: la edición abre con la precisión completa (`formatearParaEditar`).
- `suggested = fuentes[id] === 'sugerido'` y `overridden = fuentes[id] === 'override'`: con `value`, `defaultValue` y `suggested` no se distingue
  «modificado» de «input» en un sobrescribible (con un override el motor no calcula el sugerido).
- **Un candado por lado.** `disabledReason` es el del principal (sin par, el de la celda) y `secondaryDisabledReason` el del secundario. Un lado bloqueado
  lleva `aria-disabled` (se alcanza con Tab y se lee) y no abre la edición (ni clic, ni un carácter, ni F2, ni Retroceso); si se bloquea **el lado que se
  edita**, la edición se va en el render; si se bloquea el otro, sigue. Con **todos** los lados bloqueados la celda es `deshabilitado` (borde discontinuo,
  sin ↺); con uno solo, el borde discontinuo es de la caja de ese botón y ↺ sigue con `overridden`. Las guardas son tres (abrir, las teclas y el render).
- `defaultValue` y `handEdited` sólo deciden la palabra de ↺: con `defaultValue`, «Volver al valor por defecto»; sin él, «Volver al calculado» en una celda
  pisada y «Volver al sugerido» en otra (la logística de `repuestos`). **Nunca la cifra.**
- **Una celda pisada** (`handEdited`: lo escrito pisó un cálculo, `docs/COTIZADOR.md` › «Pisar un cálculo»; lo decide la hoja) lleva la marca «Editado a
  mano» y, con `calculatedValue`, «Calculado: …» en la línea de la nota, en `calculatedFormat` (sin él, `format`) y `calculatedDecimals`, con la moneda de la celda:
  el dinero por `<Monto>`, `null` como «—». Sin `calculatedValue` (el recálculo no llegó) va sólo la marca: nunca una cifra vieja. Sin `handEdited`, lo
  calculado no se dibuja.
- Los callbacks son uno por hoja y estables: la celda está en `memo` y la hoja recalcula cada 150 ms. Un objeto o una función nuevos por render dibujan
  **todas** las celdas (`xcell-hoja.test.tsx`: cambiar una dibuja una).
- **El par porcentaje–monto es una celda con dos lados**, editables los dos: el principal es el nodo de la celda y el secundario `secondaryId`. Cada uno
  emite `onCommit(suId, valor)`; ↺ emite `onReset(id)` con el id de la celda. **La hoja traduce:** editar el % quita el override del monto (`COTIZADOR.md` ›
  «El par porcentaje-monto») y ↺ quita los dos.
- **`secondaryProminent`** (el diseño dice `secundario: 'monto'`: el % es el valor de la celda, «14.94 % $181»): el secundario va **primero en el DOM**
  (el orden visual, el de Tab y el de las flechas coinciden) y grande, y el principal detrás, chico. `data-parada` sale de ese orden (el primero es 0, el
  que busca la hoja y el que recibe el foco tras ↺); `data-lado` (`principal` o `secundario`) dice qué lado es cada botón. Los ids que emiten `onCommit` y `onReset` no cambian.

## La ayuda y el ⚙

- `hasHelp` = la celda del diseño trae `ayuda` (tabla **o** texto: lo decide la hoja); `hasSettings` = constante con `cotizaciones.configurar` del origen, o
  tipo de cambio con `empresa.tipos_cambio.gestionar`. **La celda no decide permisos ni abre nada: emite `onHelp(id)` / `onSettings(id)`** con el id de la
  celda (no el del secundario) y **no mueve el foco**; devolverlo al cerrar es de la hoja.
- Cada botón se dibuja con la bandera **y** el callback (`accionesDe()` en `estado.ts`): una bandera sin callback sería un botón muerto. **Los mismos
  callbacks para todas las celdas**: un ternario por celda que cree una función por render dibuja todas.
- **Deshabilitada:** la ayuda y el ⚙ **siguen** (no escriben en esta cotización); ↺ se va. Si no corresponde, la hoja no manda `hasSettings`.
- **Modo Live:** siguen. Los botones no dicen cifras; lo que abran pasa sus cifras por `<Monto>` cuando es una celda de dinero (sin símbolo con el
  modo). La cabecera no lee `useLive()`: encender Live no la dibuja de nuevo.
- Nombres: «Ayuda de {label}», «Cambiar el valor por defecto de {label}», «Volver al valor por defecto de {label}» (o «Volver al calculado de {label}»).
  Iconos del sprite: `xcell-ayuda`, `xcell-ajustes` (los reguladores de V1, como el ⚙ de la cabecera de la hoja) y `xcell-editado` (el lápiz de la marca).
- **El atajo se anuncia.** El valor, con acciones, lleva `aria-keyshortcuts="ArrowRight"` **y** `aria-describedby` a «Más acciones con la flecha derecha.»
  (NVDA y JAWS no leen `aria-keyshortcuts`). El texto vive **una vez por hoja** en `<SimbolosDeXCell/>` (`hidden`, que sigue contando para
  `aria-describedby`), después del aviso y del candado. En los dos lados de un par; sin acciones, nada (el candado no cuenta: su motivo ya está en la
  descripción). Lo prueba `e2e/xcell-teclado.spec.ts` con CDP.

## El aspecto: la celda de V1

- **La geometría vive en `xcell.css`** (lo importa `src/app/globals.css`): la rejilla, sus variables, el lugar de cada hijo, el rótulo flotante y el globo
  de la raíz, iguales en toda celda, van una vez por página y no repetidos en clases en cada celda (la hoja tiene decenas y el documento tiene presupuesto
  de bytes, `e2e/cotizar-panel-crear-vehiculo.spec.ts` D1). En `@layer components` y con `:where()`: una clase siempre la pisa. Cada hijo se reconoce por un
  atributo (`data-rotulo`, `data-nota`, `data-lugar` `a`/`b`, `data-acciones`); en clases (`clases.ts`) queda lo que cambia por lado o por estado.
- **Un campo de alto fijo** (una rejilla): rótulo · valor(es) · acciones, hermanos en la raíz (`RotuloDeXCell`, `PieDeXCell` y `AccionesDeXCell`,
  sin envoltorio). **El alto depende de la letra, del puntero y del ancho, nunca del estado**: editar, el aviso, el error, la marca, «Calculado», el
  candado o ↺ no lo cambian (`e2e/xcell-geometria.spec.ts` y `e2e/cotizar-xcell-como-campo.spec.ts` lo miden). `--xcell-linea` es el alto del valor
  (`max(44px, letra del valor × 1,5 + 8px)`; 32 px con puntero fino desde 768 px), `--xcell-fila` el de la primera fila (la línea, `--xcell-alto` menos el
  relleno, o lo que piden el rótulo flotante y la nota) y `--xcell-alto` (56 px) el mínimo de la raíz. Entre acciones, 8 px (el contorno del foco ocupa 4).
- **Tres disposiciones por el ancho** (consulta de contenedor `xc`; `data-lugar`, `data-acciones`): **en fila**; **apilada** (simple bajo 16 rem, par
  bajo 26: la `parada` 0 junto al rótulo, el otro lado y las acciones abajo); **alta** (bajo 13 rem, el texto al 200 % en el celular: el rótulo solo, el
  valor entero en su fila, el resto abajo). `container-type` crea un contexto de apilamiento: la raíz sube (`z-10`) con el foco o el puntero adentro para
  que su globo no quede debajo de la celda siguiente. Si el valor y las acciones no le dejan lugar, el rótulo (con margen, no relleno) se achica hasta nada.
- **La línea de la nota:** el aviso, el error y «Calculado» comparten el área del rótulo, abajo (`self-end`), en una línea cortada con «…»; el texto entero
  va en `title`, en la descripción y en el globo de la raíz (`data-aviso`, su `::after`) al enfocarla, salvo con el candado enfocado (su propio globo).
  Con un aviso, «Calculado» queda `sr-only`. **El rótulo flota** (sube y queda en tres cuartos con `translate`/`scale`, `--xcell-sube`, `--xcell-escala`)
  con una entrada abierta o una línea de nota; `--xcell-flota: 0` lo apaga.
- **El rótulo**, a 16 px del borde (8 de relleno y 8 de `--xcell-sangria`), en 1,3 veces la letra de la hoja (`--xcell-letra-rotulo`) y con el peso heredado.
- **El lado grande** (el monto; con `secondaryProminent`, el %) en 1,5 veces la letra de la hoja y negrita (`--xcell-letra-valor`), en la monoespaciada; **el
  chico**, en la letra de la hoja (`--text-sm`), de peso normal y gris. La entrada lleva la letra de su lado (`ENTRADA_GRANDE`, `ENTRADA_CHICA`).
- **Las acciones, en el orden de V1:** candado · ⚙ · ayuda · ↺ (paradas 10, 11, 12 y 13). **La marca «Editado a mano»** es el primer hijo de la ranura de
  acciones, antes del candado y sin parada: `<span role="img" aria-label="Editado a mano" title="Editado a mano">` con el lápiz (3 nodos, sólo en la celda
  pisada). No es un chip con texto: ensancharía la celda y empujaría el valor. **«Calculado: …»** va en la línea de la nota, después del aviso, en la letra
  chica del lado chico (`CALCULADO`); no es un aviso (sin `role=alert`) ni sólo un `title` (no se vería en el celular).
- Todo sigue a `--text-sm`, así la «Letra» de una sección sigue escalando la celda.

## Estados (`data-estado`, suman)

`normal` · `sugerido` (punto + «Sugerido» para el lector) · `modificado` (anillo interior en la tinta + ↺; pisado, además el lápiz «Editado a mano» y
«Calculado: …») · `deshabilitado` (apagada como un campo deshabilitado: el candado con su motivo, borde discontinuo, el cursor de no permitido y gris con su
monto: la raíz pisa `--tono-fondo|borde|tinta` con `surface-2`, `line-strong` e `ink-soft`, que pasan AA; sólo el rótulo y el punto bajan a opacidad 0,6,
**nunca el valor**; `aria-disabled`, no `disabled`), **sólo con todos los lados bloqueados** (otra variante, condición apagada, un nivel). Ningún estado es sólo color.

**El aviso y los candados (`notasDe()` en `estado.ts`).** El aviso de lo tipeado o, si no hay, el `error` va **escrito** en la línea de la nota (`role=alert`) y
describe a todos los lados. El motivo de un candado **no se escribe**: cada lado bloqueado tiene su candado en la fila de acciones, **uno por texto
distinto**, un `<span role="img" aria-label="{motivo}" tabIndex={-1}>` con el icono (los mismos 3 nodos que una nota). Es el blanco del
`aria-describedby` de su lado (la descripción toma el `aria-label` del nodo referido; jsdom no lo hace, Chromium sí: lo prueba
`e2e/xcell-teclado.spec.ts` por CDP) y su **globo** (el `::after` de `CANDADO`, con `content: attr(aria-label)`: ningún nodo más) muestra el motivo al pasar
el puntero o al enfocarlo con →; `Esc` vuelve al valor y lo cierra. El error y un candado **conviven**. Cada botón describe, en orden, el aviso o el error,
**su** candado y el atajo; la entrada abierta, sólo el aviso o el error. En una celda pisada la marca y lo calculado describen a todos los lados, después
del aviso y antes del candado. Ningún estado es sólo color: el candado y el borde discontinuo lo dicen.

## Qué emite y quién valida

- Emite sólo si **cambió**: el texto es otro que el que se abrió **y** el número, a 15 cifras, es otro que `value` a 15 cifras. Abrir y salir con Tab no
  convierte un sugerido en override. El texto de edición lleva la precisión completa (`formatearParaEditar`).
- Vacío emite `null` (la hoja decide qué significa). Lo que no es un número finito no se emite: la edición sigue, con su aviso.
- **El rango, lo obligatorio y lo entero no los valida la celda:** `cotizacion_evaluar` los dice en `faltantes` (`fuera_de_rango`, `requerido_sin_valor`)
  con el valor en null, y la hoja los traduce (`textoDelFaltante()` de `cotizaciones`) y los pasa por `error`.
- Un porcentaje se tipea en puntos («14,94») y se emite como la fracción que guarda `valores` (0,1494), a 15 cifras.
- **El número se lee con `leerNumeroTipeado`** (`@/shared/lib/numero-tipeado`) y el locale de la empresa (`useRegional()`): en es-BO «1.234» es 1234, «1,5»
  es 1,5 y «1.5» no se emite («Usa coma para los decimales: 1,5.»); «1e3», «0x10» e «Infinity» no son números («Escribe un número, por ejemplo 1234,5.»).

## Teclado y toque

- **Toda la celda es el campo** (`toque-de-xcell.ts`, `useToqueDeLaCelda()`): un clic en el rótulo o el fondo abre la edición como el clic en el valor, con
  todo seleccionado, en el primer lado libre en el orden en que se ven (`ladoDelToque()`; ese botón lleva `data-blanco` y se ilumina al pasar el puntero
  por la celda). Lo que ya es un control (`button`, `input`, `[data-parada]`, la marca `[role=img]`) se ocupa solo. Con la edición abierta, el `mousedown`
  en el rótulo o el fondo se frena: la entrada no pierde el foco. **Una bloqueada** tocada con el puntero (rótulo, fondo o valor) no abre y enfoca su
  candado, cuyo globo dice el motivo (`candadoDe` de `notasDe()`); Enter o Espacio en un lado bloqueado (el clic con `detail` 0) no mueve el foco.

- **Una parada de `Tab` por valor** (dos en un par). Las acciones y el candado llevan `tabIndex -1` y se alcanzan con `→` / `←` desde el valor, en el orden en
  que se ven (valor → el otro lado → candado → ⚙ → ayuda → ↺); `Esc` en una acción o en el candado vuelve al valor. Las flechas son **de la celda**: la hoja no las usa entre celdas; en la entrada mueven el cursor.
- Tipear un carácter abre la edición con él (el `keydown` se frena: si no, se inserta dos veces, «55»); Enter, F2 y el clic abren con el valor
  seleccionado; Retroceso o Supr abren vacía.
- Enter confirma y devuelve el foco al valor (el `keydown` se frena: si no, su `keypress` vuelve a abrir). `Esc` cancela (y no sube al modal). `Tab`
  confirma **sin** frenar el keydown y la entrada se va al perder el foco: desmontarla antes deja al navegador sin lugar de partida. Con un texto que no es
  un número, Enter y Tab no avanzan. Un clic afuera confirma un número y descarta lo demás.
- El foco vuelve al botón por un ref que sólo se marca al cerrar una edición: montar 300 celdas no le roba el foco a la página.

## Tono, Modo Live y tamaños

- **El tono:** la celda sólo pone `data-tono="<clave>"` y lee `--tono-fondo|borde|tinta`; `<EstiloDeTonos>` los escribe por clave, en claro y en `.dark`,
  desde las filas de `tonos` (AA validado en la base, `_tono_colores()`). Una clave desconocida cae a los tokens neutros. `cssDeTonos()` valida con Zod (la
  clave de `_tono_clave()` y `#rrggbb`) y descarta el tono entero si algo falla: al `<style>` no llega nada sin validar. Todo lo que dice la celda va en la
  tinta.
- **Modo Live:** el valor sin editar pasa por `<Monto>`: el número sin el símbolo de su moneda. La entrada abierta es siempre `type="text"` con el
  número sin símbolo (`formatearParaEditar`); encender el modo a mitad de una edición no la toca (ni el foco ni lo tipeado). El `title` de
  «Calculado» sale de `textoPlanoDeValor(…, sinMoneda)` con el modo o sin hidratar (`e2e/xcell-geometria.spec.ts`).
- **Lo que pisa quien la contiene:** `--xcell-relleno` y `--xcell-separacion` (8 y 6 px; la sección «compacta» de la hoja los pone a 4 y 2 px y el alto,
  `--xcell-alto`, a 40 px), `--xcell-sangria` (8 px), `--xcell-letra-rotulo` y `--xcell-letra-valor` (1,3 y 1,5 veces `--text-sm`). La letra sigue
  `--text-sm` (la hoja la pisa con la «Letra» de una pieza) y el peso del rótulo se hereda (el «Énfasis» fuerte). `XCELL_COMPACTA` los pone para una tabla
  densa (sin alto mínimo, sin sangría y todo en `--text-sm`) y la vuelve una fila `flex` que crece, sin etiqueta flotante (`--xcell-display: flex`,
  `--xcell-contenedor: normal`: en su `<table class="w-max">` un `container-type` la colapsaría a 0; `--xcell-flota: 0`; `--xcell-nota-*`). El blanco táctil de 44 px no cambia.
- **Tamaños:** el rótulo se corta con «…» (`truncate`) y el texto completo va en `title` y en el nombre del grupo. **El valor nunca se corta**
  (`whitespace-nowrap`, `shrink-0`; el grande desde 6 rem, el chico desde 3,5): va en la monoespaciada de los tokens (`font-mono`, Geist Mono) con
  `tabular-nums`, y los separadores son los de `formato.ts`. El lado chico va gris (sin tono, `ink-soft`; con tono, la tinta del tono). Sin valor, «Sin
  valor» en la letra del texto (`data-vacio`), con el mismo alto. La entrada toma el ancho medido del botón al abrirse (`LadoDeXCell`) y mide 44 px en px: abrir no mueve nada. El anillo del modificado es **interior**
  (`ring-inset`) y el foco, un contorno **exterior**: se ven a la vez.
- **Nodos por celda:** los fija `xcell-hoja.test.tsx` (normal 7, par 8; la ayuda, el ⚙ o un candado suman 3 cada uno; el peor, par modificado con un lado
  bloqueado, error, ayuda y ⚙: 23). Una celda pisada suma sólo en ella la marca (3) y «Calculado» (4 con dinero, 1 sin él; `xcell-pisada.test.tsx`).
  Iconos por sprite (2 nodos cada uno). Topes de 300 celdas: 3.100 en el banco (`e2e/xcell-teclado.spec.ts`) y 3.200 en la mezcla de
  `xcell-hoja.test.tsx` (mide 3.185), sin pisadas. Un nodo más por celda son 300: lo ven los dos.

## Cómo se prueba

- Vitest (`xcell-*.test.tsx`, `estado.test.ts`, `tonos.test.tsx`): estados, teclado, sin emisión falsa, el par y sus candados, las flechas, la ayuda y el ⚙,
  el atajo, la entrada con Live, el tono, el sprite, los nodos, el memo y la celda pisada (la marca, «Calculado» y la palabra de ↺). **jsdom no reproduce dónde cae el primer carácter, el `keypress` ni a dónde va
  Tab:** eso lo prueba el e2e.
- e2e (`e2e/xcell-teclado.spec.ts`, `e2e/xcell-geometria.spec.ts`, en los dos proyectos): la celda sola en un **banco** que no es una ruta de `src/app`
  (`e2e/soporte/banco.ts` compila `banco-de-xcell.tsx` con el esbuild de `tsx` y lo sirve con `page.route`). Teclado de verdad, el atajo en el árbol de
  accesibilidad (CDP) y geometría (claro/oscuro, 100/200 %, 412/1.280 px). Firefox no se prueba.
