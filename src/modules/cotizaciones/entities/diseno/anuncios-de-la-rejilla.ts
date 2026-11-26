// Los textos de mover en la rejilla libre del editor de la hoja (docs/UX.md › «Cotización: hoja (estados propios)»): cómo se nombra cada pieza, lo que
// dice la marca de lo que se arrastra, lo que se anuncia al mover y por qué no se movió. Puras.
import { COLUMNAS_DE_LA_REJILLA, FILAS_DE_LA_REJILLA, type Diseno, type Posicion } from '../diseno'
import { lugarDe, ocupantes, type LugarDeLaPieza, type Tamano } from './lugar-en-la-rejilla'
import type { Direccion, MotivoDeNoMover } from './mover-en-la-rejilla'
import { mismaPieza, type PiezaDeLaHoja } from './pieza-de-la-hoja'

// Cómo se nombra una pieza dentro de un texto: «Precio» (con sus comillas), la tarjeta del total, «Base» (una sección), «Avanzado».
export type Nombrar = (p: PiezaDeLaHoja) => string

export const SECCION_SIN_TITULO = 'Sección sin título'
export const EN_LA_VISTA_APILADA =
  'En esta vista las piezas se apilan: elige una vista más ancha para acomodarlas.'
export const LA_ULTIMA_FILA = `Fila ${String(FILAS_DE_LA_REJILLA)} es la última.`
const AVANZADO = '«Avanzado»'

export function nombrarEnLaHoja(d: Diseno, etiquetas: ReadonlyMap<string, string>): Nombrar {
  return (p) => {
    switch (p.pieza) {
      case 'nodo':
      case 'atajos':
        return `«${etiquetas.get(p.nodo) ?? p.nodo}»`
      case 'total':
        return 'la tarjeta del total'
      case 'seccion':
        return `«${d.secciones.find((s) => s.id === p.seccion)?.titulo ?? SECCION_SIN_TITULO}»`
      case 'bloque-avanzado':
        return AVANZADO
      case 'cabecera':
        return 'la cabecera'
      default: {
        const _: never = p
        return _
      }
    }
  }
}

// La marca de un lugar libre: «Columna 7, fila 2» (el bloque «Avanzado», que ocupa la fila entera: «Fila 5»).
export const textoDelLugar = (p: PiezaDeLaHoja, posicion: Posicion): string =>
  p.pieza === 'bloque-avanzado'
    ? `Fila ${String(posicion.fila)}`
    : `Columna ${String(posicion.columna)}, fila ${String(posicion.fila)}`

export const ahiEsta = (nombre: string) => `Ahí está ${nombre}.`

// Una pieza que no entra en `destino`: por el ancho («No entra: «Precio» mide 6 columnas y desde la 9 quedan 4.») o por la última fila.
export function noEntra(nombre: string, destino: Posicion, tamano: Tamano): string {
  if (destino.columna + tamano.ancho - 1 <= COLUMNAS_DE_LA_REJILLA) return LA_ULTIMA_FILA
  const quedan = Math.max(0, COLUMNAS_DE_LA_REJILLA - destino.columna + 1)
  const resto = quedan === 1 ? 'queda 1' : `quedan ${String(quedan)}`
  return `No entra: ${nombre} mide ${String(tamano.ancho)} columnas y desde la ${String(destino.columna)} ${resto}.`
}

// Alt+flechas contra el borde: la primera columna o fila, el extremo de la lista de «Avanzado», o una dirección en la que no se mueve.
function enElExtremo(p: PiezaDeLaHoja, actual: LugarDeLaPieza, direccion: Direccion): string {
  const horizontal = direccion === 'izquierda' || direccion === 'derecha'
  if (p.pieza === 'bloque-avanzado') {
    if (horizontal) return `${AVANZADO} ocupa la fila entera.`
    return direccion === 'arriba' ? 'Ya está en la primera fila.' : LA_ULTIMA_FILA
  }
  if (actual.espacio.tipo === 'avanzadas') {
    if (horizontal) return `Las secciones de ${AVANZADO} van una debajo de otra.`
    return direccion === 'arriba'
      ? `Ya es la primera de ${AVANZADO}.`
      : `Ya es la última de ${AVANZADO}.`
  }
  return direccion === 'izquierda'
    ? 'Ya está en la primera columna.'
    : 'Ya está en la primera fila.'
}

const PASO: Readonly<Record<Direccion, Posicion>> = {
  izquierda: { columna: -1, fila: 0 },
  derecha: { columna: 1, fila: 0 },
  arriba: { columna: 0, fila: -1 },
  abajo: { columna: 0, fila: 1 },
}

// Lo que se intentó: soltar en un lugar (nulo: sobre otra avanzada de la lista; con el motivo de la tarjeta del total en la sección de destino) o un paso
// con Alt+flechas.
export type Intento =
  { destino: Posicion | null; motivoDelTotal?: string | null } | { direccion: Direccion }

// El destino de un paso con Alt+flechas.
const destinoDelPaso = (posicion: Posicion, direccion: Direccion): Posicion => ({
  columna: posicion.columna + PASO[direccion].columna,
  fila: posicion.fila + PASO[direccion].fila,
})

// La hoja sobre la que se habla: el diseño de antes de intentar y cómo se nombra cada pieza.
export type HojaDelTexto = { diseno: Diseno; nombre: Nombrar }

// Por qué no se movió, como se anuncia: «No se movió: ahí está «Flete».», lo que no entra, el motivo de la tarjeta del total o el extremo. Nulo si la
// pieza ya no está (no hay nada que decir).
export function porQueNoSeMovio(
  { diseno, nombre }: HojaDelTexto,
  p: PiezaDeLaHoja,
  motivo: MotivoDeNoMover,
  intento: Intento,
): string | null {
  const actual = lugarDe(diseno, p)
  if (actual === null) return null
  const { posicion, ancho, alto } = actual.pieza
  switch (motivo.motivo) {
    case 'pisa':
      return `No se movió: ahí está ${nombre(motivo.con)}.`
    case 'se_sale': {
      const destino =
        'destino' in intento ? intento.destino : destinoDelPaso(posicion, intento.direccion)
      return destino === null ? null : noEntra(nombre(p), destino, { ancho, alto })
    }
    case 'total':
      return 'destino' in intento ? (intento.motivoDelTotal ?? null) : null
    case 'extremo':
      return 'direccion' in intento ? enElExtremo(p, actual, intento.direccion) : null
    case 'no_esta':
      return null
    default: {
      const _: never = motivo
      return _
    }
  }
}

const mismoLugar = (a: LugarDeLaPieza, b: LugarDeLaPieza) =>
  a.espacio.tipo === b.espacio.tipo &&
  (a.espacio.tipo !== 'seccion' ||
    (b.espacio.tipo === 'seccion' && a.espacio.seccion === b.espacio.seccion)) &&
  a.pieza.posicion.columna === b.pieza.posicion.columna &&
  a.pieza.posicion.fila === b.pieza.posicion.fila

// Lo que se anuncia tras mover (nulo si quedó donde estaba):
// - «Moviste «Precio» a la columna 7, fila 2.», y a otra sección «Moviste «Flete» a «Extras», columna 1, fila 3.»;
// - «Moviste la sección «Base» a la columna 7, fila 1.», y una avanzada «Moviste la sección «Costos» a la posición 2 de 3 de «Avanzado».»;
// - «Moviste «Avanzado» a la fila 5.».
export function anuncioDeLaMovida(
  antes: Diseno,
  despues: Diseno,
  p: PiezaDeLaHoja,
  nombre: Nombrar,
): string | null {
  const a = lugarDe(antes, p)
  const b = lugarDe(despues, p)
  if (a === null || b === null || mismoLugar(a, b)) return null
  const { columna, fila } = b.pieza.posicion
  if (p.pieza === 'bloque-avanzado') return `Moviste ${AVANZADO} a la fila ${String(fila)}.`
  const enLaColumna = `columna ${String(columna)}, fila ${String(fila)}`
  if (p.pieza === 'seccion') {
    if (b.espacio.tipo !== 'avanzadas')
      return `Moviste la sección ${nombre(p)} a la ${enLaColumna}.`
    const lista = ocupantes(despues, b.espacio)
    const lugar = lista.findIndex((o) => mismaPieza(o.pieza, p)) + 1
    return `Moviste la sección ${nombre(p)} a la posición ${String(lugar)} de ${String(lista.length)} de ${AVANZADO}.`
  }
  if (
    a.espacio.tipo === 'seccion' &&
    b.espacio.tipo === 'seccion' &&
    a.espacio.seccion !== b.espacio.seccion
  ) {
    return `Moviste ${nombre(p)} a ${nombre({ pieza: 'seccion', seccion: b.espacio.seccion })}, ${enLaColumna}.`
  }
  return `Moviste ${nombre(p)} a la ${enLaColumna}.`
}
