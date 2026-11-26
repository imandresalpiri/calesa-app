// Los pasos de la hoja (docs/GLOSARIO.md › «Pasos de la hoja»): la fila «Privada · Vista previa» de arriba de las secciones. «Privada» es el interruptor de la marca
// (sólo para quien puede marcarla, en la hoja nueva); «Vista previa» abre la tarjeta (sólo con el proveedor de la tarjeta). Elegir el vehículo y el cliente es de sus
// barras, y lo que falta lo dice el motivo de «Guardar». Reglas puras, cero I/O.

export type ClaveDelPaso = 'privada' | 'vista_previa'

export type PasoDeLaHoja = {
  clave: ClaveDelPaso
  etiqueta: string
  // El panel que abre (`?panel=`); nulo en «Privada», que es un interruptor.
  panel: string | null
}

// Los pasos, en su orden: «Privada» si la hoja dibuja el interruptor; «Vista previa» si la hoja la tiene (su panel, `?panel=vista-previa`). Sin ninguno, la fila no se
// dibuja.
export function pasosDeLaHoja({
  privada,
  vistaPrevia,
}: {
  privada: boolean
  // El nombre del panel de la vista previa; nulo sin ella.
  vistaPrevia: string | null
}): PasoDeLaHoja[] {
  return [
    ...(privada ? [{ clave: 'privada' as const, etiqueta: 'Privada', panel: null }] : []),
    ...(vistaPrevia === null
      ? []
      : [{ clave: 'vista_previa' as const, etiqueta: 'Vista previa', panel: vistaPrevia }]),
  ]
}
