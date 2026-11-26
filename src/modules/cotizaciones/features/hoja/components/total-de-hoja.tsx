'use client'

import type { ContextoDeHoja } from '../../../entities/binding'
import type { TotalDeHoja as Total } from '../../../entities/hoja'
import { RegionDelTotal } from './region-del-total'

// La tarjeta del total donde el diseño la ubica (glosario: «Tarjeta del total»), a todo ancho de su lugar: con la hoja (`ContextoDelTotal`), la región del total con sus
// avisos debajo; en el lienzo del editor, la tarjeta sola.
export function TotalDeHoja({ item, contexto }: { item: Total; contexto: ContextoDeHoja }) {
  return <RegionDelTotal etiqueta={item.etiqueta} decimales={item.decimales} contexto={contexto} />
}
