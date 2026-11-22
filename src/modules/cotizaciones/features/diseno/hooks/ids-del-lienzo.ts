import { piezaDelItem, type ClaveDePieza, type Diseno } from '../../../entities/diseno'
import { piezaDelItemDeLaHoja, textoDeLaPieza } from '../../../entities/diseno/pieza-de-la-hoja'

// Los ids del arrastre del lienzo (un id del diseño no lleva `/`): una pieza `pieza/<sección>/<pieza>` (con `#n` si se repite en un diseño que no valida), el
// final de una sección `fin/<sección>` (donde cae lo que se suelta al final, o en una sección vacía) y una sección `seccion/<sección>`.
export const ID_DE_SECCION = 'seccion/'
export const ID_DEL_FIN = 'fin/'
const ID_DE_PIEZA = 'pieza/'

export const idDeLaSeccion = (seccion: string) => `${ID_DE_SECCION}${seccion}`
export const idDelFin = (seccion: string) => `${ID_DEL_FIN}${seccion}`
export const esIdDeSeccion = (id: string | number) => String(id).startsWith(ID_DE_SECCION)

// El lugar de cada id de pieza: su sección y su posición, y la clave con que se edita.
export type LugarDelId = { seccion: string; indice: number; clave: ClaveDePieza }

export type IdsDelLienzo = {
  // Los ids de las piezas de cada sección, en su orden.
  porSeccion: ReadonlyMap<string, string[]>
  lugares: ReadonlyMap<string, LugarDelId>
}

export function idsDelLienzo(d: Diseno): IdsDelLienzo {
  const porSeccion = new Map<string, string[]>()
  const lugares = new Map<string, LugarDelId>()
  for (const s of d.secciones) {
    const vistos = new Map<string, number>()
    const ids = s.items.map((item, indice) => {
      const texto = textoDeLaPieza(piezaDelItemDeLaHoja(item))
      const n = vistos.get(texto) ?? 0
      vistos.set(texto, n + 1)
      const id = `${ID_DE_PIEZA}${s.id}/${texto}${n === 0 ? '' : `#${String(n)}`}`
      lugares.set(id, { seccion: s.id, indice, clave: { ...piezaDelItem(item), seccion: s.id } })
      return id
    })
    porSeccion.set(s.id, ids)
  }
  return { porSeccion, lugares }
}
