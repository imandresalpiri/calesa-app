// Soltar lo que se arrastra en el lienzo del editor de la hoja: dónde cae (una celda de la rejilla de una sección, una de la rejilla de las principales o
// una avanzada de la lista), qué dice la marca mientras se arrastra y qué cambia al soltar. La marca y lo que se aplica salen del mismo cálculo: lo que la
// marca dice libre es lo que se mueve. Puras.
import { altoEfectivo, anchoEfectivoDeLaSeccion, anchoEfectivoDelItem } from '../diseno-en-rejilla'
import { COLUMNAS_DE_LA_REJILLA, type Diseno, type Posicion } from '../diseno'
import {
  ahiEsta,
  noEntra,
  textoDelLugar,
  type HojaDelTexto,
  type Intento,
} from './anuncios-de-la-rejilla'
import { ocupantes, type Tamano } from './lugar-en-la-rejilla'
import {
  intercambiarAvanzadas,
  moverElBloque,
  moverPiezaA,
  moverSeccionA,
  type Movida,
} from './mover-en-la-rejilla'
import { mismaPieza, ubicarLaPieza, type PiezaDeLaHoja } from './pieza-de-la-hoja'
import { motivoParaElTotal } from './total-de-la-hoja'

export type Caida =
  | { espacio: 'seccion'; seccion: string; posicion: Posicion }
  | { espacio: 'principales'; posicion: Posicion }
  | { espacio: 'avanzada'; seccion: string }

// Qué cambia al soltar `p` en `caida`. Lo que no va ahí (una pieza en la rejilla de las secciones, una sección en la de otra) no se mueve.
export function soltarEn(d: Diseno, p: PiezaDeLaHoja, caida: Caida): Movida {
  const noVa: Movida = { ok: false, motivo: 'no_esta' }
  switch (caida.espacio) {
    case 'seccion':
      return p.pieza === 'nodo' || p.pieza === 'atajos' || p.pieza === 'total'
        ? moverPiezaA(d, p, { seccion: caida.seccion, posicion: caida.posicion })
        : noVa
    case 'principales':
      if (p.pieza === 'bloque-avanzado') return moverElBloque(d, caida.posicion.fila)
      return p.pieza === 'seccion' ? moverSeccionA(d, p.seccion, caida.posicion) : noVa
    case 'avanzada':
      return p.pieza === 'seccion' ? intercambiarAvanzadas(d, p.seccion, caida.seccion) : noVa
    default: {
      const _: never = caida
      return _
    }
  }
}

// El tamaño de lo que se arrastra (el bloque ocupa la fila entera). Nulo si ya no está.
function tamanoDe(d: Diseno, p: PiezaDeLaHoja): Tamano | null {
  if (p.pieza === 'bloque-avanzado') return { ancho: COLUMNAS_DE_LA_REJILLA, alto: 1 }
  if (p.pieza === 'seccion') {
    const s = d.secciones.find((x) => x.id === p.seccion)
    return s === undefined ? null : { ancho: anchoEfectivoDeLaSeccion(s), alto: altoEfectivo(s) }
  }
  const u = ubicarLaPieza(d, p)
  return u === null ? null : { ancho: anchoEfectivoDelItem(u.item), alto: altoEfectivo(u.item) }
}

// Lo que dice la marca: `libre` (se mueve al soltar), `pisa` (ahí hay otra), `se_sale` (no entra) o `no_admite` (la tarjeta del total en una sección que no
// la acepta). `apilada` la pone el lienzo, que es quien sabe si la vista apila (`EN_LA_VISTA_APILADA`).
export type EstadoDeLaMarca = 'libre' | 'pisa' | 'se_sale' | 'no_admite' | 'apilada'

// La marca: su estado, su texto y, en una rejilla, el lugar y el tamaño que ocuparía la pieza (para dibujar su recuadro).
export type MarcaDeLaCaida = {
  estado: Exclude<EstadoDeLaMarca, 'apilada'>
  texto: string
  lugar: { posicion: Posicion; tamano: Tamano } | null
}

// Dónde quedaría una avanzada soltada sobre otra: el lugar de esa otra en la lista.
function lugarEnLaLista(d: Diseno, seccion: string): string {
  const lista = ocupantes(d, { tipo: 'avanzadas' })
  const i = lista.findIndex((o) => mismaPieza(o.pieza, { pieza: 'seccion', seccion }))
  return `Posición ${String(i + 1)} de ${String(lista.length)} de «Avanzado»`
}

const posicionDe = (p: PiezaDeLaHoja, caida: Caida): Posicion | null => {
  if (caida.espacio === 'avanzada') return null
  return p.pieza === 'bloque-avanzado' ? { columna: 1, fila: caida.posicion.fila } : caida.posicion
}

type Cuadro = { posicion: Posicion | null; tamano: Tamano }

// La marca de lo que no se mueve: lo que pisa, lo que no entra o la tarjeta del total donde no va.
function marcaDelMotivo(
  { diseno, nombre }: HojaDelTexto,
  p: PiezaDeLaHoja,
  caida: Caida,
  { movida, cuadro }: { movida: Exclude<Movida, { ok: true }>; cuadro: Cuadro },
): MarcaDeLaCaida | null {
  const { posicion, tamano } = cuadro
  const lugar = posicion === null ? null : { posicion, tamano }
  switch (movida.motivo) {
    case 'pisa':
      return { estado: 'pisa', texto: ahiEsta(nombre(movida.con)), lugar }
    case 'se_sale':
      return posicion === null
        ? null
        : { estado: 'se_sale', texto: noEntra(nombre(p), posicion, tamano), lugar }
    case 'total': {
      const motivo = caida.espacio === 'seccion' ? motivoDelTotalEn(diseno, caida.seccion) : null
      return motivo === null ? null : { estado: 'no_admite', texto: motivo, lugar }
    }
    case 'extremo':
    case 'no_esta':
      return null
    default: {
      const _: never = movida
      return _
    }
  }
}

// La marca de soltar `p` en `caida` (nula si ahí no va: el lienzo no la dibuja).
export function marcaDeLaCaida(
  hoja: HojaDelTexto,
  p: PiezaDeLaHoja,
  caida: Caida,
): MarcaDeLaCaida | null {
  const tamano = tamanoDe(hoja.diseno, p)
  if (tamano === null) return null
  const posicion = posicionDe(p, caida)
  const movida = soltarEn(hoja.diseno, p, caida)
  if (!movida.ok) return marcaDelMotivo(hoja, p, caida, { movida, cuadro: { posicion, tamano } })
  return {
    estado: 'libre',
    texto:
      caida.espacio === 'avanzada'
        ? lugarEnLaLista(hoja.diseno, caida.seccion)
        : textoDelLugar(p, posicion ?? caida.posicion),
    lugar: posicion === null ? null : { posicion, tamano },
  }
}

const motivoDelTotalEn = (d: Diseno, seccion: string): string | null => {
  const s = d.secciones.find((x) => x.id === seccion)
  return s === undefined ? null : motivoParaElTotal(s)
}

// Lo que se intentó al soltar, para decir por qué no se movió (`porQueNoSeMovio()`).
export const intentoDeLaCaida = (d: Diseno, p: PiezaDeLaHoja, caida: Caida): Intento => ({
  destino: posicionDe(p, caida),
  motivoDelTotal: caida.espacio === 'seccion' ? motivoDelTotalEn(d, caida.seccion) : null,
})
