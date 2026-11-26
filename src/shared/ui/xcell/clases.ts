// Las clases de la celda. El botón del valor y la entrada que lo reemplaza comparten su caja (grande o chica): mismo tamaño, relleno, letra y alto de
// línea, así abrir la edición no mueve nada. Los colores salen de `--tono-*` (lo escribe `<EstiloDeTonos>`) y, sin tono, de los tokens neutros.
export const TINTA = 'text-[color:var(--tono-tinta,var(--color-ink))]'

// 44 px EN PX con el dedo (no `size-11`, que es rem y crece con el texto), y compacto sólo con puntero fino desde 768 px.
const BLANCO_TACTIL = 'min-h-[44px] md:pointer-fine:min-h-8'

// La celda: una rejilla de alto fijo. La línea (`--xcell-linea`) mide el valor grande (1,5 veces su letra más el relleno) y nunca menos que el blanco
// táctil: sale de la letra, nunca de un px literal (con la «Letra» grande o el texto al 200 % un alto en px cortaría el valor). El alto depende sólo de la
// letra, del puntero y del ancho de la celda; nunca del estado (editar, el aviso, el error, la marca, «Calculado», el candado, ↺): todo va en la misma
// línea. `--xcell-alto` (56 px; 40 en una sección «compacta») es el mínimo de la raíz y los hijos tienen alto fijo: la primera fila (`--xcell-fila`) cabe el
// rótulo flotante y la línea de la nota, y la celda mide lo mismo en todo estado. Tres disposiciones por el ancho de la celda (consulta de contenedor
// `xc`): en fila, «rótulo y nota | valor(es) | acciones»; apilada (simple bajo 16 rem, par bajo 26), el valor de la `parada` 0 junto al rótulo y abajo el
// otro con las acciones; alta (bajo 13 rem: el texto al 200 % en el celular), el rótulo solo arriba, el valor entero en su fila y abajo el resto. Los cortes
// salen de la hoja: su media columna (16,6 rem) y el celular (20,5) quedan en fila con un valor de miles y dos acciones; un par en el celular, apilado.
// El relleno y la separación los puede pisar quien la contiene (`--xcell-relleno`, `--xcell-separacion`; 8 y 6 px). `XCELL_COMPACTA` la vuelve una fila
// `flex` que crece (`--xcell-display`, `--xcell-contenedor`). Deshabilitada (todos los lados bloqueados), gris con su monto: fondo apagado y tinta suave de
// los tokens (AA en `design/tokens.test.ts`) y el cursor de no permitido. `container-type` crea un contexto de apilamiento: con el foco o el puntero adentro
// sube (`z-10`) para que su globo no quede bajo la celda de abajo. El globo de la raíz (su `::after`) dice el aviso entero cuando la línea no alcanza.
// Todo eso es igual en toda celda y vive en `xcell.css` (una vez por página, no repetido en cada celda): la raíz sólo lleva el grupo de las variantes.
export const RAIZ = 'group/xc'

// Inactiva o bloqueada: el rótulo y el punto apagados, como el rótulo de un campo deshabilitado (un texto de un control inactivo está exento de contraste).
// El valor NO: queda a opacidad 1 con la tinta suave sobre el fondo apagado (AA); una opacidad en toda la celda lo bajaría de 4,5:1.
const APAGADO = 'group-data-[estado~=deshabilitado]/xc:opacity-60'

// El rótulo, la nota y «Calculado» comparten el área de la columna 1 (`data-rotulo`, `data-nota` en `xcell.css`): el rótulo al medio y, cuando hace falta
// lugar, sube y se achica (etiqueta flotante: `transform`, nunca la letra ni el alto) y la línea de la nota queda abajo. El inicio es el de V1 (8 de
// relleno y 8 de `--xcell-sangria`) más el punto de lo sugerido si lo hay (`--xcell-inicio`), como margen y no relleno: si el valor y las acciones no le
// dejan lugar, el rótulo se achica hasta nada (el texto sigue en `title` y en el nombre del grupo) en vez de quedar debajo del valor. Alta, ocupa toda la
// fila de arriba.

// El rótulo, en 1,3 veces la letra de la hoja (`--xcell-letra-rotulo`) y con el peso heredado. Se corta con «…» y el texto completo va en `title` (y es
// el nombre del grupo para el lector). Flota con una entrada abierta o una línea de nota: sube a la parte de arriba de la línea y queda en tres cuartos
// (`--xcell-sube`, `--xcell-escala`; `--xcell-flota: 0` lo apaga). La transición sólo con movimiento permitido y nunca `transition-all`. `grow basis-24`
// sólo cuenta en la fila `flex` de `XCELL_COMPACTA`.
export const ETIQUETA = `grow basis-24 self-center truncate leading-[1.25] text-[length:var(--xcell-letra-rotulo,calc(var(--text-sm)*1.3))] ${APAGADO}`

// Las acciones, detrás del valor, en la última columna. Se separan 8 px, como los valores: el contorno del foco de una ocupa 4 y no toca a la vecina. La
// banda existe aunque esté vacía y mide el blanco táctil: aparecer ↺ no cambia el alto. Angosta, va abajo a la derecha, junto al valor chico (su lugar,
// `data-acciones` en `xcell.css`).
export const ACCIONES = `flex shrink-0 items-center gap-2 ${BLANCO_TACTIL}`

// Dónde va cada lado (`data-lugar` en `xcell.css`): el que se lee primero (`parada` 0, `a`) en la columna 2 y, apilada, en toda la fila de arriba a la
// derecha (alta, en la segunda); el otro (`b`) en la columna 3 y, apilada o alta, abajo, antes de las acciones. El orden en que se ven es el del DOM en
// las tres. Los cortes van en rem: con el texto al 200 % la celda se apila sola. La entrada lleva el mismo lugar que el botón que reemplaza.
export type Lugar = 'a' | 'b'

// El valor, en la monoespaciada de los tokens (`--font-mono`) con cifras tabulares: nunca se corta (no se parte ni se achica). Su caja mide la línea de la
// celda (`--xcell-linea`) y centra el texto: el alto es el mismo en reposo, editando y sin valor («Sin valor», `data-vacio`, en la letra del texto).
const CAJA_SIN_BORDE = `h-[var(--xcell-linea,44px)] inline-flex shrink-0 items-center justify-end rounded-sm text-right font-mono whitespace-nowrap tabular-nums data-[vacio]:font-sans data-[vacio]:font-normal data-[vacio]:text-(length:--text-sm)`
// El lado grande (el monto; en un par con el monto de secundario, el %) en 1,5 veces la letra de la hoja y negrita (`--xcell-letra-valor`); el chico, en
// la letra de la hoja y de peso normal, como el «13.00 %» de V1.
const GRANDE =
  'min-w-[6rem] text-[length:var(--xcell-letra-valor,calc(var(--text-sm)*1.5))] leading-[1.5] font-bold'
const CHICO = 'min-w-[3.5rem] text-(length:--text-sm) leading-5 font-normal'
const RELLENO = 'border-0 px-2 py-1'
// El lado bloqueado de un par cuyo otro lado se edita (4.13-3c, P3): su caja va apagada, como un campo deshabilitado (el fondo apagado y la tinta suave,
// AA), con el borde discontinuo que, con la celda entera bloqueada, lleva la celda. El relleno pierde el píxel del borde: mide lo mismo que la otra caja.
const DISCONTINUA = `border border-dashed border-[color:var(--tono-borde,var(--color-line-strong))] px-[7px] py-[3px] bg-(--color-surface-2) [--tono-tinta:var(--color-ink-soft)]`

// El foco es un contorno EXTERIOR, en el `-ink` del color primario (≥ 3:1 sobre la superficie en claro y en oscuro; el primario a secas da 2,8:1 en oscuro);
// el «modificado» es un anillo INTERIOR en la tinta: no se confunden y se ven a la vez. Los controles de una celda se separan 8 px: el contorno ocupa 4.
export const FOCO =
  'outline-offset-2 focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-(--color-primario-ink)'

// Al pasar el puntero se ilumina el valor que se toca o, sobre el resto de la celda, el que abriría un toque en el fondo (`data-blanco`). Un lado
// bloqueado no se ilumina: no hay efecto que invite a tocarlo.
const BOTON_SIN_TINTA = `${FOCO} cursor-text not-aria-disabled:hover:bg-black/5 dark:not-aria-disabled:hover:bg-white/10 data-blanco:group-hover/xc:group-not-has-[button:hover]/xc:bg-black/5 dark:data-blanco:group-hover/xc:group-not-has-[button:hover]/xc:bg-white/10 group-data-[estado~=modificado]/xc:ring-2 group-data-[estado~=modificado]/xc:ring-inset group-data-[estado~=modificado]/xc:ring-[color:var(--tono-tinta,var(--color-ink))] aria-disabled:cursor-not-allowed`
// El lado chico, en gris: sin tono, la tinta suave; con tono, la tinta del tono (un gris sobre un fondo de color no garantiza AA).
const TINTA_CHICA = 'text-[color:var(--tono-tinta,var(--color-ink-soft))]'

export const BOTON_DEL_VALOR = `${CAJA_SIN_BORDE} ${GRANDE} ${RELLENO} bg-transparent ${BOTON_SIN_TINTA} ${TINTA}`
export const BOTON_GRANDE_BLOQUEADO = `${CAJA_SIN_BORDE} ${GRANDE} ${DISCONTINUA} ${BOTON_SIN_TINTA} ${TINTA}`
export const BOTON_CHICO = `${CAJA_SIN_BORDE} ${CHICO} ${RELLENO} bg-transparent ${BOTON_SIN_TINTA} ${TINTA_CHICA}`
export const BOTON_CHICO_BLOQUEADO = `${CAJA_SIN_BORDE} ${CHICO} ${DISCONTINUA} ${BOTON_SIN_TINTA} ${TINTA_CHICA}`

// Transparente, sin borde propio ni el fondo de `<Input>` (que trae `dark:bg-input/30` y `aria-invalid:border-destructive`). La de cada lado lleva la letra
// de su botón: abrir la edición no cambia el tamaño.
export const ENTRADA_GRANDE = `${CAJA_SIN_BORDE} ${GRANDE} ${RELLENO} ${FOCO} ${TINTA} bg-transparent`
export const ENTRADA_CHICA = `${CAJA_SIN_BORDE} ${CHICO} ${RELLENO} ${FOCO} ${TINTA} bg-transparent`
export const ENTRADA = ENTRADA_GRANDE

export const BOTON_DE_ACCION = `${BLANCO_TACTIL} inline-flex min-w-[44px] md:pointer-fine:min-w-8 cursor-pointer items-center justify-center rounded-sm ${FOCO} ${TINTA} hover:bg-black/5 dark:hover:bg-white/10`

// El candado de un lado bloqueado, en la fila de acciones: mide lo que un botón de acción y su motivo (su `aria-label`) se ve en un globo al pasar el
// puntero, al enfocarlo con → o al tocar la celda bloqueada. El globo es el `::after` del mismo nodo (ningún nodo más por celda): abajo a la derecha, parte
// su texto y no toma el puntero. No se apaga: es información (3:1 de lo que no es texto).
export const CANDADO = `relative ${BLANCO_TACTIL} inline-flex min-w-[44px] md:pointer-fine:min-w-8 cursor-help items-center justify-center rounded-sm ${FOCO} ${TINTA} after:pointer-events-none after:absolute after:top-full after:right-0 after:z-20 after:mt-1 after:hidden after:w-max after:max-w-64 after:rounded-(--radius-sm) after:bg-(--color-ink) after:px-2 after:py-1 after:text-left after:font-sans after:text-(length:--text-xs) after:font-normal after:whitespace-normal after:text-(--color-paper) after:content-[attr(aria-label)] hover:after:block focus:after:block`

// El punto de lo sugerido, al inicio del área del rótulo (el rótulo empieza después: `--xcell-inicio`).
export const PUNTO = `[grid-area:1/1] size-2 shrink-0 self-center justify-self-start ms-[var(--xcell-sangria,8px)] rounded-full bg-[color:var(--tono-tinta,var(--color-ink))] ${APAGADO}`

// La línea de la nota: abajo del área del rótulo, en una línea que se corta con «…» (el texto completo en `title`, en el globo de la raíz al enfocar o tocar
// y en la descripción para el lector). En la fila `flex` de `XCELL_COMPACTA` va en su propia línea al final y se parte (`--xcell-nota-*`).
const LINEA_DE_NOTA = `block self-end overflow-hidden text-ellipsis [white-space:var(--xcell-nota-corte,nowrap)] [overflow-wrap:anywhere] text-xs leading-4 [flex-basis:var(--xcell-nota-base,auto)] [order:var(--xcell-nota-orden,0)]`
export const NOTA = `${LINEA_DE_NOTA} ${TINTA} [&>svg]:me-1 [&>svg]:inline [&>svg]:align-top`

// La marca «Editado a mano» de un cálculo pisado: el lápiz, primero en la fila de acciones. No es un control: sin blanco táctil ni foco.
export const MARCA = `inline-flex shrink-0 items-center ${TINTA}`
// «Calculado: $480» en la línea de la nota de la celda pisada, en la letra chica del lado chico (con tono, la tinta del tono: un gris no garantiza AA). Con
// un aviso a la vez se ve el aviso y lo calculado queda para el lector (`sr-only`: sigue en la descripción).
export const CALCULADO = `${LINEA_DE_NOTA} ${TINTA_CHICA} group-has-[[role=alert]]/xc:sr-only`

// La celda densa de una tabla (la hoja de ítems de `repuestos`): sin el alto, la sangría ni las letras de la de V1, y una fila `flex` que crece en vez de la
// rejilla de alto fijo (vive en una `<table class="w-max">`, donde `container-type` la colapsaría a 0). Sin etiqueta flotante. Va en el contenedor de sus celdas.
export const XCELL_COMPACTA =
  '[--xcell-alto:auto] [--xcell-sangria:0px] [--xcell-letra-rotulo:var(--text-sm)] [--xcell-letra-valor:var(--text-sm)] [--xcell-display:flex] [--xcell-contenedor:normal] [--xcell-flota:0] [--xcell-hueco-punto:0px] [--xcell-nota-base:100%] [--xcell-nota-orden:1] [--xcell-nota-corte:normal]'
