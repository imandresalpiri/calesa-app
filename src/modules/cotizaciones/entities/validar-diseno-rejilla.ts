// La geometría de la rejilla libre en §2 de `validarDiseno()` (espejo de `_diseno_secciones()`): cada pieza dentro de las 12 columnas y las 200 filas
// (`pieza_fuera_de_la_rejilla`) y sin pisar una celda ya ocupada (`piezas_se_pisan`: la primera, en el orden de la lista, que cae sobre otra). Hay una
// ocupación por espacio: la de las principales (con la fila entera del bloque «Avanzado», que se marca antes de recorrerlas), la de las avanzadas y la
// de los ítems de cada sección. Cada pieza es una visita del medidor: sus celdas son a lo sumo 12 × 4, una constante.
import type { Diseno, ItemDeDiseno, SeccionDeDiseno } from './diseno'
import { altoEfectivo, anchoEfectivoDeLaSeccion, anchoEfectivoDelItem } from './diseno-en-rejilla'
import type { Medidor } from './medidor'
import { fallo, type FalloDeDiseno } from './motivos-de-diseno'
import {
  COLUMNAS_DE_LA_REJILLA,
  FILAS_DE_LA_REJILLA,
  type PiezaEnLaRejilla,
} from './rejilla-de-la-hoja'

// Las celdas ocupadas de un espacio, como `(fila - 1) * 12 + columna - 1`.
export type Ocupacion = Set<number>

// Las ocupaciones de las secciones: la del bloque «Avanzado» ya marcada en la de las principales.
export function ocupacionesDeLasSecciones(d: Diseno): {
  principal: Ocupacion
  avanzado: Ocupacion
} {
  const principal: Ocupacion = new Set()
  if (d.avanzado !== undefined) {
    const base = (d.avanzado.fila - 1) * COLUMNAS_DE_LA_REJILLA
    for (let c = 0; c < COLUMNAS_DE_LA_REJILLA; c++) principal.add(base + c)
  }
  return { principal, avanzado: new Set() }
}

const piezaDeLaSeccion = (s: SeccionDeDiseno): PiezaEnLaRejilla => ({
  posicion: s.posicion,
  ancho: anchoEfectivoDeLaSeccion(s),
  alto: altoEfectivo(s),
})
const piezaDelItem = (it: ItemDeDiseno): PiezaEnLaRejilla => ({
  posicion: it.posicion,
  ancho: anchoEfectivoDelItem(it),
  alto: altoEfectivo(it),
})

type Rechazo = 'pieza_fuera_de_la_rejilla' | 'piezas_se_pisan'

// Si la pieza se sale o pisa una celda ocupada; si no, marca las suyas.
function ocupar(ocupacion: Ocupacion, p: PiezaEnLaRejilla, m: Medidor): Rechazo | undefined {
  m.visitas += 1
  const { columna, fila } = p.posicion
  const hastaColumna = columna + p.ancho - 1
  const hastaFila = fila + p.alto - 1
  if (hastaColumna > COLUMNAS_DE_LA_REJILLA || hastaFila > FILAS_DE_LA_REJILLA) {
    return 'pieza_fuera_de_la_rejilla'
  }
  const celdas: number[] = []
  for (let f = fila; f <= hastaFila; f++) {
    for (let c = columna; c <= hastaColumna; c++) {
      const celda = (f - 1) * COLUMNAS_DE_LA_REJILLA + c - 1
      if (ocupacion.has(celda)) return 'piezas_se_pisan'
      celdas.push(celda)
    }
  }
  for (let i = 0; i < celdas.length; i++) ocupacion.add(celdas[i] as number)
  return undefined
}

export function revisarGeometriaDeLaSeccion(
  ocupacion: Ocupacion,
  s: SeccionDeDiseno,
  m: Medidor,
): FalloDeDiseno | undefined {
  const r = ocupar(ocupacion, piezaDeLaSeccion(s), m)
  return r === undefined ? undefined : fallo(r, { donde: s.id, pieza: 'seccion' })
}

// `donde` es el nodo del ítem; la tarjeta del total no tiene nodo y nombra su sección.
export function revisarGeometriaDelItem(
  ocupacion: Ocupacion,
  s: SeccionDeDiseno,
  it: ItemDeDiseno,
  m: Medidor,
): FalloDeDiseno | undefined {
  const r = ocupar(ocupacion, piezaDelItem(it), m)
  if (r === undefined) return undefined
  return it.tipo === 'total'
    ? fallo(r, { donde: s.id, pieza: 'total' })
    : fallo(r, { donde: it.nodo })
}

// La primera pieza que se sale o pisa a otra, en el orden de la validación: a la que lleva «Ir a la pieza» un rechazo de la rejilla (su `donde` no
// distingue unos atajos de su celda ni la tarjeta del total de su sección).
export function primeraPiezaQueNoCabe(
  d: Diseno,
): { seccion: SeccionDeDiseno; item?: ItemDeDiseno } | null {
  const m = { visitas: 0 }
  const espacios = ocupacionesDeLasSecciones(d)
  for (let i = 0; i < d.secciones.length; i++) {
    const s = d.secciones[i] as SeccionDeDiseno
    if (revisarGeometriaDeLaSeccion(espacios[s.presentacion], s, m) !== undefined)
      return { seccion: s }
    const celdas: Ocupacion = new Set()
    for (let k = 0; k < s.items.length; k++) {
      const item = s.items[k] as ItemDeDiseno
      if (revisarGeometriaDelItem(celdas, s, item, m) !== undefined) return { seccion: s, item }
    }
  }
  return null
}
