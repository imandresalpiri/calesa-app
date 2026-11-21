// Las columnas de la fila del ítem, en su orden: qué es el ítem, cantidad y precio; los demás datos después. Texto de interfaz, no regla: ninguna ayuda nombra un valor de catálogo.
export const COLUMNAS_DE_LA_FILA = [
  {
    clave: 'item',
    titulo: 'Ítem',
    ayuda: 'Ítem: tipo de pieza, condición y descripción',
    clase: 'min-w-72',
  },
  {
    clave: 'cantidad',
    titulo: 'Cantidad',
    ayuda: 'Cantidad: cuántas unidades se piden',
    clase: 'min-w-28 text-right',
  },
  {
    clave: 'precio',
    titulo: 'Precio al cliente',
    ayuda: 'Precio al cliente: lo que se le cobra por unidad',
    clase: 'min-w-40 text-right',
  },
  {
    clave: 'pais',
    titulo: 'País de origen',
    ayuda: 'País de origen: de dónde viene la pieza',
    clase: '',
  },
  {
    clave: 'via',
    titulo: 'Vía de transporte',
    ayuda: 'Vía de transporte: cómo viaja la pieza',
    clase: '',
  },
  { clave: 'moneda', titulo: 'Moneda', ayuda: 'Moneda: la del precio al cliente', clase: '' },
  {
    clave: 'tracking',
    titulo: 'Tracking',
    ayuda: 'Tracking: el número de seguimiento del envío',
    clase: 'min-w-36',
  },
  {
    clave: 'notas',
    titulo: 'Notas',
    ayuda: 'Notas: lo que el equipo anota del ítem',
    clase: 'min-w-48',
  },
] as const

export type ClaveDeColumna = (typeof COLUMNAS_DE_LA_FILA)[number]['clave']

/** La clase de la columna: la misma en su `<th>` y en sus celdas. */
export const claseDe = (clave: ClaveDeColumna): string =>
  COLUMNAS_DE_LA_FILA.find((c) => c.clave === clave)?.clase ?? ''
