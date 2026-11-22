// Las clases de la celda. El botón del valor y la entrada que lo reemplaza comparten su caja (grande o chica): mismo tamaño, relleno, letra y alto de
// línea, así abrir la edición no mueve nada. Los colores salen de `--tono-*` (lo escribe `<EstiloDeTonos>`) y, sin tono, de los tokens neutros.
export const TINTA = 'text-[color:var(--tono-tinta,var(--color-ink))]'

// 44 px EN PX con el dedo (no `size-11`, que es rem y crece con el texto), y compacto sólo con puntero fino desde 768 px.
const BLANCO_TACTIL = 'min-h-[44px] md:pointer-fine:min-h-8'

// La celda de V1: una fila de 56 px (`--xcell-alto`, en px: es un mínimo y no crece con el texto) con rótulo · valor(es) · acciones; lo que no cabe baja de
// línea (el valor antes de encimarse con el rótulo). El relleno y la separación de las filas los puede pisar quien la contiene (una sección «compacta»)
// con `--xcell-relleno`, `--xcell-separacion` y `--xcell-alto`; sin ellas, 8 px, 6 px y 56 px. El blanco táctil no cambia. El color del grupo va en borde
// y fondo (`--tono-*`). Deshabilitada (todos los lados bloqueados: otra variante, condición apagada, un nivel), gris con su monto: fondo apagado y tinta
// suave de los tokens, que pasan AA (`design/tokens.test.ts`), en vez de su tono.
export const RAIZ =
  'flex min-h-[var(--xcell-alto,56px)] flex-wrap content-center items-center justify-end gap-x-2 gap-y-[var(--xcell-separacion,calc(var(--spacing)*1.5))] rounded-md border p-[var(--xcell-relleno,calc(var(--spacing)*2))] text-sm border-[color:var(--tono-borde,var(--color-line-strong))] bg-[color:var(--tono-fondo,var(--color-surface))] data-[estado~=deshabilitado]:border-dashed data-[estado~=deshabilitado]:[--tono-fondo:var(--color-surface-2)] data-[estado~=deshabilitado]:[--tono-borde:var(--color-line-strong)] data-[estado~=deshabilitado]:[--tono-tinta:var(--color-ink-soft)] ' +
  TINTA

// El rótulo, como en V1: a 16 px del borde (8 de relleno y 8 de sangría, `--xcell-sangria`) y en 1,3 veces la letra de la hoja (`--xcell-letra-rotulo`);
// el peso se hereda (el «Énfasis» fuerte de una sección lo sube). Toma lo que queda (desde 6 rem) y, si no alcanza, se corta con «…»: el texto completo va
// en `title` (y es el nombre del grupo para el lector). Como crece, lo de su fila queda a la derecha; en una fila de abajo, `justify-end` de la raíz lleva
// los valores y las acciones a la derecha, juntos.
export const ETIQUETA =
  'min-w-0 grow basis-24 truncate py-1 ps-[var(--xcell-sangria,8px)] text-[length:var(--xcell-letra-rotulo,calc(var(--text-sm)*1.3))]'
// Las acciones, detrás del valor. Se separan 8 px, como los valores: el contorno del foco de una ocupa 4 y no toca a la vecina.
export const ACCIONES = 'flex shrink-0 items-center gap-2'

// El valor, en la monoespaciada de los tokens (`--font-mono`) con cifras tabulares: nunca se corta (no se parte ni se achica) y, si no cabe junto al rótulo,
// baja a su fila a la derecha. La entrada que lo reemplaza toma el ancho medido del botón (`LadoDeXCell`). Sin valor («Sin valor», `data-vacio`), en la
// letra del texto: no parece una cifra y el alto no cambia (el mínimo es de la raíz).
const CAJA_SIN_BORDE = `${BLANCO_TACTIL} block shrink-0 rounded-sm text-right font-mono whitespace-nowrap tabular-nums data-[vacio]:font-sans data-[vacio]:font-normal data-[vacio]:text-(length:--text-sm)`
// El lado grande (el monto; en un par con el monto de secundario, el %) en 1,5 veces la letra de la hoja y negrita (`--xcell-letra-valor`); el chico, en
// la letra de la hoja y de peso normal, como el «13.00 %» de V1. El alto de línea del grande es relativo a su letra y no menor que el normal de la fuente:
// un `<input>` no baja de ese (el botón sí), y con uno más chico la entrada medía 2 px más que el botón que reemplaza.
const GRANDE =
  'min-w-[6rem] text-[length:var(--xcell-letra-valor,calc(var(--text-sm)*1.5))] leading-[1.5] font-bold'
const CHICO = 'min-w-[3.5rem] text-(length:--text-sm) leading-5 font-normal'
const RELLENO = 'border-0 px-2 py-1'
// El lado bloqueado de un par cuyo otro lado se edita (4.13-3c, P3): su caja lleva el borde discontinuo que, con la celda entera bloqueada, lleva la celda.
// El relleno pierde el píxel del borde: la caja mide lo mismo que la del otro lado.
const DISCONTINUA = `border border-dashed border-[color:var(--tono-borde,var(--color-line-strong))] px-[7px] py-[3px]`

// El foco es un contorno EXTERIOR, en el `-ink` del color primario (≥ 3:1 sobre la superficie en claro y en oscuro; el primario a secas da 2,8:1 en oscuro);
// el «modificado» es un anillo INTERIOR en la tinta: no se confunden y se ven a la vez. Los controles de una celda se separan 8 px: el contorno ocupa 4.
export const FOCO =
  'outline-offset-2 focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-(--color-primario-ink)'

const BOTON_SIN_TINTA = `${FOCO} cursor-text bg-transparent hover:bg-black/5 dark:hover:bg-white/10 group-data-[estado~=modificado]/xc:ring-2 group-data-[estado~=modificado]/xc:ring-inset group-data-[estado~=modificado]/xc:ring-[color:var(--tono-tinta,var(--color-ink))] aria-disabled:cursor-not-allowed`
// El lado chico, en gris: sin tono, la tinta suave; con tono, la tinta del tono (un gris sobre un fondo de color no garantiza AA).
const TINTA_CHICA = 'text-[color:var(--tono-tinta,var(--color-ink-soft))]'

export const BOTON_DEL_VALOR = `${CAJA_SIN_BORDE} ${GRANDE} ${RELLENO} ${BOTON_SIN_TINTA} ${TINTA}`
export const BOTON_GRANDE_BLOQUEADO = `${CAJA_SIN_BORDE} ${GRANDE} ${DISCONTINUA} ${BOTON_SIN_TINTA} ${TINTA}`
export const BOTON_CHICO = `${CAJA_SIN_BORDE} ${CHICO} ${RELLENO} ${BOTON_SIN_TINTA} ${TINTA_CHICA}`
export const BOTON_CHICO_BLOQUEADO = `${CAJA_SIN_BORDE} ${CHICO} ${DISCONTINUA} ${BOTON_SIN_TINTA} ${TINTA_CHICA}`

// Transparente, sin borde propio ni el fondo de `<Input>` (que trae `dark:bg-input/30` y `aria-invalid:border-destructive`). La de cada lado lleva la letra
// de su botón: abrir la edición no cambia el tamaño.
export const ENTRADA_GRANDE = `${CAJA_SIN_BORDE} ${GRANDE} ${RELLENO} ${FOCO} ${TINTA} bg-transparent`
export const ENTRADA_CHICA = `${CAJA_SIN_BORDE} ${CHICO} ${RELLENO} ${FOCO} ${TINTA} bg-transparent`
export const ENTRADA = ENTRADA_GRANDE

export const BOTON_DE_ACCION = `${BLANCO_TACTIL} inline-flex min-w-[44px] md:pointer-fine:min-w-8 items-center justify-center rounded-sm ${FOCO} ${TINTA} hover:bg-black/5 dark:hover:bg-white/10`

// El candado de un lado bloqueado, en la fila de acciones: mide lo que un botón de acción y su motivo (su `aria-label`) se ve en un globo al pasar el
// puntero o al enfocarlo con →. El globo es el `::after` del mismo nodo (ningún nodo más por celda): abajo a la derecha, parte su texto y no toma el puntero.
export const CANDADO = `relative ${BLANCO_TACTIL} inline-flex min-w-[44px] md:pointer-fine:min-w-8 items-center justify-center rounded-sm ${FOCO} ${TINTA} after:pointer-events-none after:absolute after:top-full after:right-0 after:z-20 after:mt-1 after:hidden after:w-max after:max-w-64 after:rounded-(--radius-sm) after:bg-(--color-ink) after:px-2 after:py-1 after:text-left after:font-sans after:text-(length:--text-xs) after:font-normal after:whitespace-normal after:text-(--color-paper) after:content-[attr(aria-label)] hover:after:block focus:after:block`

export const PUNTO = 'size-2 shrink-0 rounded-full bg-[color:var(--tono-tinta,var(--color-ink))]'

export const NOTA = `flex min-w-0 basis-full items-start gap-1 text-xs [overflow-wrap:anywhere] ${TINTA}`

// La celda densa de una tabla (la hoja de ítems de `repuestos`): sin el alto, la sangría ni las letras de la de V1. Va en el contenedor de sus celdas.
export const XCELL_COMPACTA =
  '[--xcell-alto:auto] [--xcell-sangria:0px] [--xcell-letra-rotulo:var(--text-sm)] [--xcell-letra-valor:var(--text-sm)]'
