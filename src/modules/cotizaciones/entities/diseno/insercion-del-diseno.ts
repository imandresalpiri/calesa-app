// Sumar y quitar piezas y secciones del diseño desde el editor de la hoja. Puras: nada muta lo que recibe y un lugar que no existe devuelve el diseño tal
// cual. Una sección recién sumada nace vacía (el editor la dibuja con su «+»): una vacía no se guarda (`seccionVacia()`), porque la base pide al menos una
// pieza por sección. Lo que queda inválido por otra regla (un total en una sección con nivel) lo dice `validarDiseno()` tras el cambio.
import {
  esLaPieza,
  MAXIMO_DE_ITEMS_DEL_DISENO,
  type ClaveDePieza,
  type Diseno,
  type ItemDeDiseno,
  type SeccionDeDiseno,
} from '../diseno'
import { conSeccion } from './edicion-del-diseno'

export const MOTIVO_DEL_TOPE_DE_PIEZAS = `La hoja ya tiene ${String(MAXIMO_DE_ITEMS_DEL_DISENO)} piezas: quita una para sumar otra.`
export const MOTIVO_DE_LA_ULTIMA_SECCION = 'La hoja necesita al menos una sección.'

export const piezasDelDiseno = (d: Diseno): number =>
  d.secciones.reduce((n, s) => n + s.items.length, 0)

export const hayLugarParaOtraPieza = (d: Diseno): boolean =>
  piezasDelDiseno(d) < MAXIMO_DE_ITEMS_DEL_DISENO

// La primera sección sin piezas: con ella el borrador no se guarda.
export const seccionVacia = (d: Diseno): SeccionDeDiseno | undefined =>
  d.secciones.find((s) => s.items.length === 0)

export const motivoDeLaSeccionVacia = (s: Pick<SeccionDeDiseno, 'id' | 'titulo'>) =>
  `La sección «${s.titulo ?? s.id}» está vacía: suma una pieza o quítala para guardar.`

// En el lugar `indice` de la sección (al final si pasa del largo). Con la hoja en el tope, nada.
export function sumarItem(
  d: Diseno,
  seccionId: string,
  indice: number,
  item: ItemDeDiseno,
): Diseno {
  if (!hayLugarParaOtraPieza(d)) return d
  return conSeccion(d, seccionId, (s) => {
    const lugar = Math.max(0, Math.min(Math.trunc(indice), s.items.length))
    return { ...s, items: [...s.items.slice(0, lugar), item, ...s.items.slice(lugar)] }
  })
}

// La primera pieza así en su sección.
export function quitarItem(d: Diseno, clave: ClaveDePieza): Diseno {
  return conSeccion(d, clave.seccion, (s) => {
    const i = s.items.findIndex((it) => esLaPieza(it, clave))
    return i < 0 ? s : { ...s, items: s.items.filter((_, k) => k !== i) }
  })
}

// El id libre `seccion_<n>` y el título «Sección <n>», con el primer n que no está tomado.
export function sumarSeccion(
  d: Diseno,
  presentacion: SeccionDeDiseno['presentacion'],
): { diseno: Diseno; seccion: string } {
  const tomados = new Set(d.secciones.map((s) => s.id))
  let n = d.secciones.length + 1
  while (tomados.has(`seccion_${String(n)}`)) n += 1
  const seccion: SeccionDeDiseno = {
    id: `seccion_${String(n)}`,
    titulo: `Sección ${String(n)}`,
    presentacion,
    items: [],
  }
  return { diseno: { ...d, secciones: [...d.secciones, seccion] }, seccion: seccion.id }
}

export function quitarSeccion(
  d: Diseno,
  seccionId: string,
): { ok: true; diseno: Diseno } | { ok: false; motivo: string } {
  if (!d.secciones.some((s) => s.id === seccionId)) return { ok: true, diseno: d }
  if (d.secciones.length <= 1) return { ok: false, motivo: MOTIVO_DE_LA_ULTIMA_SECCION }
  return { ok: true, diseno: { ...d, secciones: d.secciones.filter((s) => s.id !== seccionId) } }
}
