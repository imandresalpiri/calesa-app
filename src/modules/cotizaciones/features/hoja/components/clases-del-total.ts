// La tarjeta del total (glosario: «Tarjeta del total»), como la de V1: superficie invertida (la tinta de fondo y el papel de letra: oscura en claro y clara
// en oscuro; el par pasa AA en `design/tokens.test.ts`), el rótulo chico en mayúsculas por CSS y la cifra grande. Pegada al borde de arriba del resumen
// (sangra hasta su borde: el resumen tiene `p-4`), así no es una tarjeta dentro de otra. En par, una por total: la segunda sangra sólo de costado.
const TARJETA = '-mx-4 grid gap-1 bg-(--color-ink) p-5 text-(--color-paper)'
export const TARJETA_DEL_TOTAL = `${TARJETA} -mt-4 rounded-t-(--radius-card)`
export const TARJETA_DE_COSTADO = TARJETA
export const ETIQUETA_DEL_TOTAL =
  'text-(length:--text-xs) font-medium tracking-wider uppercase [overflow-wrap:anywhere]'
export const CIFRA_DEL_TOTAL = 'text-(length:--text-2xl) font-semibold tabular-nums'
// La tarjeta del total donde el diseño la ubica (una pieza de su sección): la misma superficie, con sus esquinas y sin sangrar.
export const TARJETA_EN_LA_SECCION =
  'grid content-center gap-1 rounded-(--radius-card) bg-(--color-ink) p-5 text-(--color-paper)'
