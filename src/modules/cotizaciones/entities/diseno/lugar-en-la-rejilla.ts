// El lugar de cada pieza en la rejilla libre del editor de la hoja (docs/GLOSARIO.md › «Posición (en la rejilla)», «Lugar libre (de la rejilla)»): qué
// ocupa cada espacio, si un lugar está libre, el primero libre donde entra una pieza y el orden de lectura en que se guarda la lista. Hay tres espacios:
// la rejilla de las principales (con el bloque «Avanzado» como una fila entera), la lista de las avanzadas y la rejilla de cada sección. Nada se corre
// solo: un lugar que pisa a otra pieza o se sale no se ocupa. Puras.
import {
  COLUMNAS_DE_LA_REJILLA,
  FILAS_DE_LA_REJILLA,
  type Diseno,
  type Posicion,
  type SeccionDeDiseno,
} from '../diseno'
import { altoEfectivo, anchoEfectivoDeLaSeccion, anchoEfectivoDelItem } from '../diseno-en-rejilla'
import { enOrdenDeLectura, sePisan, ultimaFila, type PiezaEnLaRejilla } from '../rejilla-de-la-hoja'
import {
  mismaPieza,
  piezaDelItemDeLaHoja,
  ubicarLaPieza,
  type PiezaDeLaHoja,
} from './pieza-de-la-hoja'

export type EspacioDeLaRejilla =
  { tipo: 'principales' } | { tipo: 'avanzadas' } | { tipo: 'seccion'; seccion: string }

export type Tamano = { ancho: number; alto: number }
export type LugarDeLaPieza = { espacio: EspacioDeLaRejilla; pieza: PiezaEnLaRejilla }
export type Ocupante = { pieza: PiezaDeLaHoja; lugar: PiezaEnLaRejilla }

export const espacioDeLaSeccion = (s: Pick<SeccionDeDiseno, 'presentacion'>): EspacioDeLaRejilla =>
  s.presentacion === 'avanzado' ? { tipo: 'avanzadas' } : { tipo: 'principales' }

export const mismoEspacio = (a: EspacioDeLaRejilla, b: EspacioDeLaRejilla): boolean =>
  a.tipo === b.tipo && (a.tipo !== 'seccion' || (b.tipo === 'seccion' && a.seccion === b.seccion))

const deLaSeccion = (s: SeccionDeDiseno): PiezaEnLaRejilla => ({
  posicion: s.posicion,
  ancho: anchoEfectivoDeLaSeccion(s),
  alto: altoEfectivo(s),
})

// El bloque «Avanzado» ocupa su fila entera; sin la clave no tiene lugar en la rejilla (va debajo de todo).
const delBloque = (d: Diseno): PiezaEnLaRejilla | null =>
  d.avanzado === undefined
    ? null
    : { posicion: { columna: 1, fila: d.avanzado.fila }, ancho: COLUMNAS_DE_LA_REJILLA, alto: 1 }

// Dónde está una pieza (nulo para la cabecera, que no va en la rejilla, o lo que ya no está).
export function lugarDe(d: Diseno, p: PiezaDeLaHoja): LugarDeLaPieza | null {
  if (p.pieza === 'cabecera') return null
  if (p.pieza === 'bloque-avanzado') {
    const bloque = delBloque(d)
    return bloque === null ? null : { espacio: { tipo: 'principales' }, pieza: bloque }
  }
  if (p.pieza === 'seccion') {
    const s = d.secciones.find((x) => x.id === p.seccion)
    return s === undefined ? null : { espacio: espacioDeLaSeccion(s), pieza: deLaSeccion(s) }
  }
  const u = ubicarLaPieza(d, p)
  if (u === null) return null
  return {
    espacio: { tipo: 'seccion', seccion: u.seccion.id },
    pieza: {
      posicion: u.item.posicion,
      ancho: anchoEfectivoDelItem(u.item),
      alto: altoEfectivo(u.item),
    },
  }
}

// Lo que ocupa un espacio, en orden de lectura.
export function ocupantes(d: Diseno, espacio: EspacioDeLaRejilla): Ocupante[] {
  const lista: Ocupante[] = []
  if (espacio.tipo === 'seccion') {
    const s = d.secciones.find((x) => x.id === espacio.seccion)
    for (const it of s?.items ?? []) {
      lista.push({
        pieza: piezaDelItemDeLaHoja(it),
        lugar: { posicion: it.posicion, ancho: anchoEfectivoDelItem(it), alto: altoEfectivo(it) },
      })
    }
  } else {
    for (const s of d.secciones) {
      if (mismoEspacio(espacioDeLaSeccion(s), espacio)) {
        lista.push({ pieza: { pieza: 'seccion', seccion: s.id }, lugar: deLaSeccion(s) })
      }
    }
    const bloque = delBloque(d)
    if (espacio.tipo === 'principales' && bloque !== null) {
      lista.push({ pieza: { pieza: 'bloque-avanzado' }, lugar: bloque })
    }
  }
  return enOrdenDeLectura(lista, (o) => o.lugar.posicion)
}

export type LugarLibre =
  | { ok: true }
  | { ok: false; motivo: 'se_sale' }
  | { ok: false; motivo: 'pisa'; con: PiezaDeLaHoja }

// Si `lugar` está libre en el espacio para la pieza `p` (que no cuenta: se puede mover sobre su propio lugar). Nula, una pieza nueva.
export function lugarLibre(
  d: Diseno,
  p: PiezaDeLaHoja | null,
  espacio: EspacioDeLaRejilla,
  lugar: PiezaEnLaRejilla,
): LugarLibre {
  const { columna, fila } = lugar.posicion
  if (
    columna < 1 ||
    fila < 1 ||
    columna + lugar.ancho - 1 > COLUMNAS_DE_LA_REJILLA ||
    fila + lugar.alto - 1 > FILAS_DE_LA_REJILLA
  ) {
    return { ok: false, motivo: 'se_sale' }
  }
  const choque = ocupantes(d, espacio).find(
    (o) => (p === null || !mismaPieza(o.pieza, p)) && sePisan(o.lugar, lugar),
  )
  return choque === undefined ? { ok: true } : { ok: false, motivo: 'pisa', con: choque.pieza }
}

// El primer lugar libre donde entra una pieza de ese tamaño, en orden de lectura; con `despues`, el primero después de esa posición. En una rejilla de
// hasta 40 piezas siempre hay uno antes de la fila 200; si no, nulo.
export function primerLugarLibre(
  d: Diseno,
  espacio: EspacioDeLaRejilla,
  tamano: Tamano,
  despues?: Posicion,
): Posicion | null {
  for (let fila = despues?.fila ?? 1; fila + tamano.alto - 1 <= FILAS_DE_LA_REJILLA; fila++) {
    const desde = despues !== undefined && fila === despues.fila ? despues.columna + 1 : 1
    for (let columna = desde; columna + tamano.ancho - 1 <= COLUMNAS_DE_LA_REJILLA; columna++) {
      const lugar = { posicion: { columna, fila }, ...tamano }
      if (lugarLibre(d, null, espacio, lugar).ok) return { columna, fila }
    }
  }
  return despues === undefined ? null : primerLugarLibre(d, espacio, tamano)
}

// La fila que sigue a la última ocupada de un espacio: donde va una avanzada nueva (al final de su lista) o el bloque «Avanzado» nuevo.
export const filaSiguiente = (d: Diseno, espacio: EspacioDeLaRejilla): number =>
  Math.min(FILAS_DE_LA_REJILLA, ultimaFila(ocupantes(d, espacio).map((o) => o.lugar)) + 1)

// La primera avanzada trae el bloque «Avanzado»: en la fila que sigue a las principales.
export const conElBloque = (d: Diseno): Diseno =>
  d.avanzado === undefined
    ? { ...d, avanzado: { fila: filaSiguiente(d, { tipo: 'principales' }) } }
    : d

// Sin avanzadas, el bloque «Avanzado» deja su fila (va debajo de todo, como en un diseño sin la clave).
export function sinBloqueSinAvanzadas(d: Diseno): Diseno {
  if (d.avanzado === undefined || d.secciones.some((s) => s.presentacion === 'avanzado')) return d
  const { avanzado: _, ...sinBloque } = d
  return sinBloque
}

// Una sección que cambia de presentación pasa al otro espacio: una avanzada, al final de su lista (y trae el bloque si no estaba); una principal, al
// primer lugar libre donde entra. Sin lugar, la sección queda como estaba. Nadie más se mueve.
export function cambiarDeEspacio(
  d: Diseno,
  seccionId: string,
  presentacion: SeccionDeDiseno['presentacion'],
): Diseno {
  const s = d.secciones.find((x) => x.id === seccionId)
  if (s === undefined || s.presentacion === presentacion) return d
  const sinElla = { ...d, secciones: d.secciones.filter((x) => x.id !== seccionId) }
  const base = presentacion === 'avanzado' ? conElBloque(sinElla) : sinElla
  const posicion =
    presentacion === 'avanzado'
      ? { columna: 1, fila: filaSiguiente(base, { tipo: 'avanzadas' }) }
      : primerLugarLibre(
          base,
          { tipo: 'principales' },
          { ancho: anchoEfectivoDeLaSeccion(s), alto: altoEfectivo(s) },
        )
  if (posicion === null) return d
  const movida = { ...s, presentacion, posicion }
  return ordenarPorLectura(
    sinBloqueSinAvanzadas({
      ...base,
      secciones: d.secciones.map((x) => (x.id === seccionId ? movida : x)),
    }),
  )
}

// La lista en orden de lectura: las principales con las avanzadas donde va su bloque (al final sin él), y los ítems de cada sección. Así lo que se lee de
// la lista (la primera sección principal, «la primera gana», `nodo_sin_seccion`) coincide con lo que se ve.
export function ordenarPorLectura(d: Diseno): Diseno {
  const conItems = d.secciones.map((s) => ({
    ...s,
    items: enOrdenDeLectura(s.items, (it) => it.posicion),
  }))
  const avanzadas = enOrdenDeLectura(
    conItems.filter((s) => s.presentacion === 'avanzado'),
    (s) => s.posicion,
  )
  const principales = conItems.filter((s) => s.presentacion !== 'avanzado')
  const bloque = delBloque(d)
  const conBloque = enOrdenDeLectura<SeccionDeDiseno | null>(
    bloque === null ? principales : [...principales, null],
    (s) => (s === null ? bloque?.posicion : s.posicion),
  )
  const secciones = conBloque.flatMap((s) => (s === null ? avanzadas : [s]))
  return { ...d, secciones: bloque === null ? [...secciones, ...avanzadas] : secciones }
}
