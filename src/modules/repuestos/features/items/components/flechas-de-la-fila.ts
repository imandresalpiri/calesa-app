// Las flechas ← y → entre las celdas de la fila del ítem (como en una hoja de cálculo). Puro: decide si la flecha sale de la celda y a cuál va; leer el DOM es de quien lo usa.

export type TipoDeParada = 'texto' | 'seleccion' | 'valor'

export type EntradaDeLaFlecha = {
  tecla: string
  tipo: TipoDeParada
  // El cursor de un texto (`selectionStart` y `selectionEnd`) y su largo; sin sentido en los otros tipos.
  inicio: number
  fin: number
  largo: number
  // Qué parada de la fila es la actual y cuántas hay.
  indice: number
  total: number
  // Un valor de `XCell` con otra parada en ese sentido (sus acciones): la flecha es de la celda.
  otraParadaEnLaCelda?: boolean
}

/**
 * A qué parada pasa el foco con la flecha, o nulo si la flecha no sale de la celda: en un texto sólo con el cursor en el borde (sin selección) y en la dirección de ese borde; en un
 * `<select>` y en el valor de una `XCell` siempre (salvo que la `XCell` tenga otra parada en ese sentido); sin vecina, nulo.
 */
export function paradaTrasLaFlecha(e: EntradaDeLaFlecha): number | null {
  const paso = e.tecla === 'ArrowRight' ? 1 : e.tecla === 'ArrowLeft' ? -1 : 0
  if (paso === 0) return null
  if (e.tipo === 'texto') {
    const sinSeleccion = e.inicio === e.fin
    const enElBorde = paso === 1 ? e.fin === e.largo : e.inicio === 0
    if (!sinSeleccion || !enElBorde) return null
  }
  if (e.tipo === 'valor' && e.otraParadaEnLaCelda === true) return null
  const destino = e.indice + paso
  return destino >= 0 && destino < e.total ? destino : null
}
