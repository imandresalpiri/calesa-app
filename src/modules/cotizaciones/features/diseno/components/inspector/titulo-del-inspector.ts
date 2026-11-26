import type { Diseno } from '../../../../entities/diseno'
import {
  ETIQUETAS_PARA_SUMAR,
  type TipoParaSumar,
} from '../../../../entities/diseno/ofertas-para-sumar'
import { ubicarLaPieza, type PiezaDeLaHoja } from '../../../../entities/diseno/pieza-de-la-hoja'

export const SECCION_SIN_TITULO = 'Sección sin título'

const deUnItem = (pieza: Extract<PiezaDeLaHoja, { nodo: string }>, d: Diseno): TipoParaSumar => {
  if (pieza.pieza === 'atajos') return 'atajos'
  const tipo = ubicarLaPieza(d, pieza)?.item.tipo
  return tipo === undefined || tipo === 'total' ? 'celda' : tipo
}

// El título del inspector: qué pieza es y cuál («Celda de una fila «Precio»», «Sección «Extras»», «Tarjeta del total»…).
export function tituloDelInspector(
  pieza: PiezaDeLaHoja,
  d: Diseno,
  etiquetas: ReadonlyMap<string, string>,
): string {
  switch (pieza.pieza) {
    case 'cabecera':
      return 'Cabecera de la hoja'
    case 'total':
      return ETIQUETAS_PARA_SUMAR.total
    case 'bloque-avanzado':
      return 'Bloque «Avanzado»'
    case 'seccion': {
      const titulo = d.secciones.find((s) => s.id === pieza.seccion)?.titulo ?? null
      return titulo === null ? SECCION_SIN_TITULO : `Sección «${titulo}»`
    }
    case 'nodo':
    case 'atajos':
      return `${ETIQUETAS_PARA_SUMAR[deUnItem(pieza, d)]} «${etiquetas.get(pieza.nodo) ?? pieza.nodo}»`
  }
}
