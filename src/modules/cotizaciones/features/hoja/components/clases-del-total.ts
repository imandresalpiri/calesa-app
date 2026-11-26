// La tarjeta del total (glosario: «Tarjeta del total»), como la de V1: superficie invertida (la tinta de fondo y el papel de letra: oscura en claro y clara
// en oscuro; el par pasa AA en `design/tokens.test.ts`), el rótulo chico en mayúsculas por CSS y la cifra grande. Va en su sección (la pieza del diseño) o sola
// arriba de «Avanzado», siempre con sus esquinas: lo que dice aparte va debajo, fuera de ella (nunca una tarjeta dentro de otra). Al 200 % en el celular la cifra
// se parte antes que ensanchar la página (el monto lleva un espacio que no se parte entre la moneda y el número).
export const ETIQUETA_DEL_TOTAL =
  'text-(length:--text-xs) font-medium tracking-wider uppercase [overflow-wrap:anywhere]'
export const CIFRA_DEL_TOTAL =
  'text-(length:--text-2xl) font-semibold tabular-nums [overflow-wrap:anywhere]'
export const TARJETA_EN_LA_SECCION =
  'grid min-w-0 content-center gap-1 rounded-(--radius-card) bg-(--color-ink) p-5 text-(--color-paper)'
