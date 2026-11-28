// Las medidas del editor de artes: la rejilla de la pantalla y cada una de sus celdas. Las usan el marco en frío (`MarcoDelEditor`, también el
// `loading.tsx`) y el editor con su código (`EditorDeArtes`), así nada salta cuando llega: la barra mide 3rem de alto y las columnas, el riel
// 3rem, el panel izquierdo 18rem y el inspector 19rem; el lienzo se queda con el resto.
export const REJILLA_DEL_EDITOR =
  'grid h-dvh grid-cols-[3rem_18rem_minmax(0,1fr)_19rem] grid-rows-[3rem_minmax(0,1fr)] overflow-hidden bg-(--color-paper)'

// La barra de arriba (3rem), también la de `/artes/<id>` sin editor (`FueraDelEditor`).
export const BARRA_DEL_EDITOR =
  'flex min-w-0 items-center gap-2 border-b border-(--color-line) bg-(--color-surface) px-2'

// Los anchos fijos de la barra (los mismos en frío): el disparador del vehículo de ejemplo y el renglón del guardado miden 13rem y 14rem de
// 1024 a 1280 px, y 16rem y 18rem desde ahí. Fijos por ancho de pantalla, no por contenido (nada salta), y a 1024 px caben con «Volver a
// Artes», el nombre (se corta), el formato, «Guardar» y el «⋯».
export const ANCHOS_DE_LA_BARRA = {
  ejemplo: 'w-52 xl:w-64',
  guardado: 'w-56 xl:w-72',
} as const

export const CELDAS_DEL_EDITOR = {
  barra: `col-span-4 ${BARRA_DEL_EDITOR}`,
  riel: 'min-h-0 border-r border-(--color-line) bg-(--color-surface)',
  izquierda: 'min-h-0 min-w-0 border-r border-(--color-line) bg-(--color-surface)',
  lienzo: 'relative min-h-0 min-w-0 overflow-hidden bg-(--color-paper-dim)',
  derecha: 'min-h-0 min-w-0 border-l border-(--color-line) bg-(--color-surface)',
} as const

// Lo que va encima del lienzo, arriba y al centro (el aviso de un conflicto, el de «Sin conexión»): no le cambia el tamaño.
export const ENCIMA_DEL_LIENZO = 'absolute inset-x-4 top-4 z-10 mx-auto max-w-lg'
