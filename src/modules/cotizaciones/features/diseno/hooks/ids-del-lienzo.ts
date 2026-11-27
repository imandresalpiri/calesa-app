import type { Diseno } from '../../../entities/diseno'
import type { Caida } from '../../../entities/diseno/soltar-en-la-rejilla'
import {
  piezaDelItemDeLaHoja,
  textoDeLaPieza,
  type PiezaDeLaHoja,
} from '../../../entities/diseno/pieza-de-la-hoja'

// Los ids del arrastre del lienzo (un id del diseño no lleva `/`):
// - lo que se arrastra: una pieza `pieza/<sección>/<pieza>` (con `#n` si se repite en un diseño que no valida), una sección `seccion/<sección>` y el bloque
//   «Avanzado» `bloque-avanzado`;
// - donde se suelta: la rejilla de cada sección `rejilla/<sección>`, la de las principales `rejilla-de-las-secciones` y cada avanzada `avanzada/<sección>`
//   (soltar una avanzada sobre otra las intercambia).
// Lo que se arrastra lleva su clase en `data.clase` y lo que recibe, la que acepta en `data.acepta`: cada cosa cae sólo donde va.
export type ClaseDelArrastre = 'pieza' | 'principal' | 'avanzada'
export type DatosDeLoQueSeArrastra = { clase: ClaseDelArrastre }
export type DatosDeDondeCae = { acepta: ClaseDelArrastre }

const ID_DE_PIEZA = 'pieza/'
const ID_DE_SECCION = 'seccion/'
const ID_DE_REJILLA = 'rejilla/'
const ID_DE_AVANZADA = 'avanzada/'
export const ID_DEL_BLOQUE = 'bloque-avanzado'
export const ID_DE_LAS_SECCIONES = 'rejilla-de-las-secciones'

export const idDeLaSeccion = (seccion: string) => `${ID_DE_SECCION}${seccion}`
export const idDeLaRejilla = (seccion: string) => `${ID_DE_REJILLA}${seccion}`
export const idDeLaAvanzada = (seccion: string) => `${ID_DE_AVANZADA}${seccion}`

export type IdsDelLienzo = {
  // Los ids de las piezas de cada sección, en su orden.
  porSeccion: ReadonlyMap<string, string[]>
  piezas: ReadonlyMap<string, PiezaDeLaHoja>
}

export function idsDelLienzo(d: Diseno): IdsDelLienzo {
  const porSeccion = new Map<string, string[]>()
  const piezas = new Map<string, PiezaDeLaHoja>()
  for (const s of d.secciones) {
    const vistos = new Map<string, number>()
    const ids = s.items.map((item) => {
      const pieza = piezaDelItemDeLaHoja(item)
      const texto = textoDeLaPieza(pieza)
      const n = vistos.get(texto) ?? 0
      vistos.set(texto, n + 1)
      const id = `${ID_DE_PIEZA}${s.id}/${texto}${n === 0 ? '' : `#${String(n)}`}`
      piezas.set(id, pieza)
      return id
    })
    porSeccion.set(s.id, ids)
  }
  return { porSeccion, piezas }
}

// Lo que se arrastra con ese id (nulo si ya no está).
export function piezaDelId(ids: IdsDelLienzo, id: string): PiezaDeLaHoja | null {
  if (id === ID_DEL_BLOQUE) return { pieza: 'bloque-avanzado' }
  if (id.startsWith(ID_DE_SECCION))
    return { pieza: 'seccion', seccion: id.slice(ID_DE_SECCION.length) }
  return ids.piezas.get(id) ?? null
}

// El espacio de un id donde se suelta (sin la celda: la pone la geometría de su rejilla).
export type EspacioDelId =
  | { espacio: 'seccion'; seccion: string }
  | { espacio: 'principales' }
  | Extract<Caida, { espacio: 'avanzada' }>

export function espacioDelId(id: string): EspacioDelId | null {
  if (id === ID_DE_LAS_SECCIONES) return { espacio: 'principales' }
  if (id.startsWith(ID_DE_REJILLA))
    return { espacio: 'seccion', seccion: id.slice(ID_DE_REJILLA.length) }
  if (id.startsWith(ID_DE_AVANZADA)) {
    return { espacio: 'avanzada', seccion: id.slice(ID_DE_AVANZADA.length) }
  }
  return null
}
