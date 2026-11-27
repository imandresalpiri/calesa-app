// Mover piezas en la rejilla libre del editor de la hoja: a un lugar (arrastrando o con «Columna» y «Fila»), de a una celda con Alt+flechas y a la sección
// vecina con el «⋯». Un lugar que pisa a otra pieza o se sale no se ocupa y nada se empuja (docs/DECISIONES.md › «La hoja en una rejilla libre»); la
// única excepción son las avanzadas, que son una lista: soltar una sobre otra las intercambia. La tarjeta del total no entra a una sección que no la admite.
// Pasar a otra sección puede cambiar quién ve la pieza (`cambioDeNivel()` lo avisa). Puras.
import { FILAS_DE_LA_REJILLA, type Diseno, type Posicion, type SeccionDeDiseno } from '../diseno'
import { altoEfectivo, anchoEfectivoDelItem } from '../diseno-en-rejilla'
import { enOrdenDeLectura } from '../rejilla-de-la-hoja'
import { conSeccion } from './edicion-del-diseno'
import {
  lugarDe,
  lugarLibre,
  primerLugarLibre,
  type EspacioDeLaRejilla,
} from './lugar-en-la-rejilla'
import { ubicarLaPieza, type PiezaDeLaHoja } from './pieza-de-la-hoja'
import { admiteElTotal } from './total-de-la-hoja'

export type MotivoDeNoMover =
  | { motivo: 'se_sale' }
  | { motivo: 'pisa'; con: PiezaDeLaHoja }
  | { motivo: 'total' }
  | { motivo: 'extremo' }
  | { motivo: 'no_esta' }
export type Movida = { ok: true; diseno: Diseno } | ({ ok: false } & MotivoDeNoMover)

const noMueve = (m: MotivoDeNoMover): Movida => ({ ok: false, ...m })

// Un ítem a `posicion` de la sección `seccion` (la suya u otra).
export function moverPiezaA(
  d: Diseno,
  p: PiezaDeLaHoja,
  destino: { seccion: string; posicion: Posicion },
): Movida {
  const u = ubicarLaPieza(d, p)
  const s = d.secciones.find((x) => x.id === destino.seccion)
  if (u === null || s === undefined) return noMueve({ motivo: 'no_esta' })
  if (u.item.tipo === 'total' && !admiteElTotal(s)) return noMueve({ motivo: 'total' })
  const lugar = {
    posicion: destino.posicion,
    ancho: anchoEfectivoDelItem(u.item),
    alto: altoEfectivo(u.item),
  }
  const libre = lugarLibre(d, p, { tipo: 'seccion', seccion: s.id }, lugar)
  if (!libre.ok) return noMueve(libre)
  const movido = { ...u.item, posicion: destino.posicion }
  if (s.id === u.seccion.id) {
    return {
      ok: true,
      diseno: conSeccion(d, s.id, (x) => ({
        ...x,
        items: x.items.map((it, k) => (k === u.indice ? movido : it)),
      })),
    }
  }
  const sinElla = conSeccion(d, u.seccion.id, (x) => ({
    ...x,
    items: x.items.filter((_, k) => k !== u.indice),
  }))
  return {
    ok: true,
    diseno: conSeccion(sinElla, s.id, (x) => ({ ...x, items: [...x.items, movido] })),
  }
}

// Una sección a `posicion` de su espacio (las principales o la lista de las avanzadas).
export function moverSeccionA(d: Diseno, seccion: string, posicion: Posicion): Movida {
  const p: PiezaDeLaHoja = { pieza: 'seccion', seccion }
  const actual = lugarDe(d, p)
  if (actual === null) return noMueve({ motivo: 'no_esta' })
  const libre = lugarLibre(d, p, actual.espacio, { ...actual.pieza, posicion })
  if (!libre.ok) return noMueve(libre)
  return { ok: true, diseno: conSeccion(d, seccion, (s) => ({ ...s, posicion })) }
}

// El bloque «Avanzado» a otra fila entera de las principales.
export function moverElBloque(d: Diseno, fila: number): Movida {
  const p: PiezaDeLaHoja = { pieza: 'bloque-avanzado' }
  const actual = lugarDe(d, p)
  if (actual === null) return noMueve({ motivo: 'no_esta' })
  const libre = lugarLibre(d, p, actual.espacio, {
    ...actual.pieza,
    posicion: { columna: 1, fila },
  })
  return libre.ok ? { ok: true, diseno: { ...d, avanzado: { fila } } } : noMueve(libre)
}

// Las avanzadas en su orden, apiladas desde la fila 1: cada una en sus filas, columna 1.
function apilarAvanzadas(d: Diseno, orden: readonly SeccionDeDiseno[]): Diseno {
  const filaDe = new Map<string, number>()
  let fila = 1
  for (const s of orden) {
    filaDe.set(s.id, fila)
    fila += altoEfectivo(s)
  }
  return {
    ...d,
    secciones: d.secciones.map((s) => {
      const f = filaDe.get(s.id)
      return f === undefined ? s : { ...s, posicion: { columna: 1, fila: f } }
    }),
  }
}

const avanzadasEnOrden = (d: Diseno) =>
  enOrdenDeLectura(
    d.secciones.filter((s) => s.presentacion === 'avanzado'),
    (s) => s.posicion,
  )

// Soltar una avanzada sobre otra: cambian de lugar en la lista y se vuelven a apilar (nadie más se mueve).
export function intercambiarAvanzadas(d: Diseno, a: string, b: string): Movida {
  const orden = avanzadasEnOrden(d)
  const i = orden.findIndex((s) => s.id === a)
  const j = orden.findIndex((s) => s.id === b)
  const sa = orden[i]
  const sb = orden[j]
  if (sa === undefined || sb === undefined) return noMueve({ motivo: 'no_esta' })
  if (i === j) return { ok: true, diseno: d }
  const nuevo = [...orden]
  nuevo[i] = sb
  nuevo[j] = sa
  return { ok: true, diseno: apilarAvanzadas(d, nuevo) }
}

export type Direccion = 'izquierda' | 'derecha' | 'arriba' | 'abajo'
const PASO: Record<Direccion, { columna: number; fila: number }> = {
  izquierda: { columna: -1, fila: 0 },
  derecha: { columna: 1, fila: 0 },
  arriba: { columna: 0, fila: -1 },
  abajo: { columna: 0, fila: 1 },
}

// Alt+flechas: una celda en esa dirección; si está ocupada o la pieza se sale, no se mueve. Una avanzada sube o baja un lugar en su lista; el bloque
// «Avanzado», a la siguiente fila entera libre.
export function pasoDeTeclado(d: Diseno, p: PiezaDeLaHoja, direccion: Direccion): Movida {
  const actual = lugarDe(d, p)
  if (actual === null) return noMueve({ motivo: 'no_esta' })
  const { columna, fila } = actual.pieza.posicion
  if (p.pieza === 'bloque-avanzado') return pasoDelBloque(d, fila, direccion)
  if (p.pieza === 'seccion' && actual.espacio.tipo === 'avanzadas') {
    return pasoDeUnaAvanzada(d, p.seccion, direccion)
  }
  const destino = { columna: columna + PASO[direccion].columna, fila: fila + PASO[direccion].fila }
  if (destino.columna < 1 || destino.fila < 1) return noMueve({ motivo: 'extremo' })
  return moverEnSuEspacio(d, p, destino)
}

// Una pieza a otro lugar de su mismo espacio, como la llevan Alt+flechas y «Columna» y «Fila» del inspector: un ítem dentro de su sección, una sección entre
// las suyas y el bloque «Avanzado» a esa fila entera.
export function moverEnSuEspacio(d: Diseno, p: PiezaDeLaHoja, posicion: Posicion): Movida {
  const actual = lugarDe(d, p)
  if (actual === null) return noMueve({ motivo: 'no_esta' })
  if (p.pieza === 'bloque-avanzado') return moverElBloque(d, posicion.fila)
  if (p.pieza === 'seccion') return moverSeccionA(d, p.seccion, posicion)
  return actual.espacio.tipo === 'seccion'
    ? moverPiezaA(d, p, { seccion: actual.espacio.seccion, posicion })
    : noMueve({ motivo: 'no_esta' })
}

function pasoDelBloque(d: Diseno, fila: number, direccion: Direccion): Movida {
  if (direccion === 'izquierda' || direccion === 'derecha') return noMueve({ motivo: 'extremo' })
  const paso = direccion === 'arriba' ? -1 : 1
  for (let f = fila + paso; f >= 1 && f <= FILAS_DE_LA_REJILLA; f += paso) {
    const movida = moverElBloque(d, f)
    if (movida.ok) return movida
  }
  return noMueve({ motivo: 'extremo' })
}

function pasoDeUnaAvanzada(d: Diseno, seccion: string, direccion: Direccion): Movida {
  if (direccion === 'izquierda' || direccion === 'derecha') return noMueve({ motivo: 'extremo' })
  const orden = avanzadasEnOrden(d)
  const i = orden.findIndex((s) => s.id === seccion)
  const vecina = orden[i + (direccion === 'arriba' ? -1 : 1)]
  return vecina === undefined
    ? noMueve({ motivo: 'extremo' })
    : intercambiarAvanzadas(d, seccion, vecina.id)
}

// Adónde lleva «Mover a la sección anterior / siguiente»: la vecina en el orden de la lista (saltando las que no admiten la tarjeta del total si es ella),
// en el primer lugar libre donde entra. Nulo en el extremo.
export function destinoEnLaVecina(
  d: Diseno,
  p: PiezaDeLaHoja,
  paso: -1 | 1,
): { seccion: string; posicion: Posicion } | null {
  const u = ubicarLaPieza(d, p)
  if (u === null) return null
  const i = d.secciones.findIndex((s) => s.id === u.seccion.id)
  const candidatas = paso < 0 ? d.secciones.slice(0, i).reverse() : d.secciones.slice(i + 1)
  const tamano = { ancho: anchoEfectivoDelItem(u.item), alto: altoEfectivo(u.item) }
  for (const s of candidatas) {
    if (u.item.tipo === 'total' && !admiteElTotal(s)) continue
    const espacio: EspacioDeLaRejilla = { tipo: 'seccion', seccion: s.id }
    const posicion = primerLugarLibre(d, espacio, tamano)
    if (posicion !== null) return { seccion: s.id, posicion }
  }
  return null
}
