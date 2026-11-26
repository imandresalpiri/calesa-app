// El tamaño y el lugar de una pieza en la rejilla libre, como los cambian el borde, Alt+Shift+flechas y los campos «Columna», «Fila», «Ancho» y «Alto»
// del inspector: crecer nunca empuja a la vecina (se topa con ella o con el borde) y cada opción que no entra va apagada con su motivo
// (`opcionesDelLugar()`). Puras.
import {
  COLUMNAS_DE_LA_REJILLA,
  FILAS_DE_LA_REJILLA,
  MAXIMO_DE_FILAS,
  piezaDelItem,
  type Diseno,
} from '../diseno'
import { ultimaFila, type PiezaEnLaRejilla } from '../rejilla-de-la-hoja'
import { ponerAspectoDeItem, ponerAspectoDeSeccion } from './edicion-del-aspecto'
import {
  lugarDe,
  lugarLibre,
  ocupantes,
  type LugarDeLaPieza,
  type Tamano,
} from './lugar-en-la-rejilla'
import { ubicarLaPieza, type PiezaDeLaHoja } from './pieza-de-la-hoja'

// Por qué no creció más: el borde de la rejilla, el tope de filas o la pieza de al lado.
export type Tope =
  | { lado: 'ancho' | 'alto'; motivo: 'borde' | 'maximo' }
  | { lado: 'ancho' | 'alto'; motivo: 'pisa'; con: PiezaDeLaHoja }

const acotar = (n: number, max: number) => Math.max(1, Math.min(max, Math.round(n)))

type Crecida = { d: Diseno; p: PiezaDeLaHoja; actual: LugarDeLaPieza; lado: 'ancho' | 'alto' }

// Crece de a una columna (o fila) mientras entra: el primer choque topa.
function crecer(c: Crecida, desde: Tamano, hasta: number): { tamano: Tamano; tope: Tope | null } {
  const { d, p, actual, lado } = c
  let tamano = desde
  for (let n = desde[lado] + 1; n <= hasta; n++) {
    const probado = { ...tamano, [lado]: n }
    const libre = lugarLibre(d, p, actual.espacio, { posicion: actual.pieza.posicion, ...probado })
    if (!libre.ok) {
      const tope: Tope =
        libre.motivo === 'pisa'
          ? { lado, motivo: 'pisa', con: libre.con }
          : { lado, motivo: 'borde' }
      return { tamano, tope }
    }
    tamano = probado
  }
  return { tamano, tope: null }
}

// El tamaño que entra de lo que se pide (achicar siempre entra): primero el ancho, después el alto.
export function tamanoQueEntra(
  d: Diseno,
  p: PiezaDeLaHoja,
  deseado: Partial<Tamano>,
): { tamano: Tamano; tope: Tope | null } | null {
  const actual = lugarDe(d, p)
  if (actual === null) return null
  const ancho = acotar(deseado.ancho ?? actual.pieza.ancho, COLUMNAS_DE_LA_REJILLA)
  const alto = acotar(deseado.alto ?? actual.pieza.alto, MAXIMO_DE_FILAS)
  const pedidoMaximo: Tope | null =
    (deseado.alto ?? 0) > MAXIMO_DE_FILAS ? { lado: 'alto', motivo: 'maximo' } : null
  const base = {
    ancho: Math.min(ancho, actual.pieza.ancho),
    alto: Math.min(alto, actual.pieza.alto),
  }
  const a = crecer({ d, p, actual, lado: 'ancho' }, base, ancho)
  const b = crecer({ d, p, actual, lado: 'alto' }, a.tamano, alto)
  return { tamano: b.tamano, tope: a.tope ?? b.tope ?? pedidoMaximo }
}

export type TamanoPedido = { ancho?: number | 'automatica'; alto?: number }

// Lo que se pide en columnas: «Automática» son las 6 de su lugar en escritorio.
const pedidoEnColumnas = (deseado: TamanoPedido): Partial<Tamano> => ({
  ...(deseado.ancho === undefined
    ? {}
    : { ancho: deseado.ancho === 'automatica' ? 6 : deseado.ancho }),
  ...(deseado.alto === undefined ? {} : { alto: deseado.alto }),
})

// Qué cambia de lo que hay: el ancho si se pidió otro (o «Automática»), y el alto si se pidió otro.
function loQueCambia(deseado: TamanoPedido, entra: Tamano, hay: Tamano) {
  const tocaAncho =
    deseado.ancho !== undefined && (deseado.ancho === 'automatica' || entra.ancho !== hay.ancho)
  const conAlto = deseado.alto === undefined || entra.alto === hay.alto ? {} : { alto: entra.alto }
  return { tocaAncho, conAlto }
}

// Escribe el tamaño que entra; lo que no cambia no se escribe (una sección «Automática» que no puede crecer sigue «Automática»). Una sección «Automática»
// que entra entera queda sin ancho; 1 fila quita el alto, y en lo que no es celda 12 columnas quitan el ancho (lo de siempre).
export function ponerTamano(d: Diseno, p: PiezaDeLaHoja, deseado: TamanoPedido): Diseno {
  const actual = lugarDe(d, p)
  const entra = tamanoQueEntra(d, p, pedidoEnColumnas(deseado))
  if (entra === null || actual === null) return d
  const { ancho } = entra.tamano
  const { tocaAncho, conAlto } = loQueCambia(deseado, entra.tamano, actual.pieza)
  if (p.pieza === 'seccion') {
    const automatica = deseado.ancho === 'automatica' && ancho === 6
    const conAncho = tocaAncho ? { ancho: automatica ? null : ancho } : {}
    return ponerAspectoDeSeccion(d, p.seccion, { ...conAncho, ...conAlto })
  }
  const u = ubicarLaPieza(d, p)
  if (u === null) return d
  const conAncho = tocaAncho ? { ancho } : {}
  return ponerAspectoDeItem(d, u.seccion.id, piezaDelItem(u.item), { ...conAncho, ...conAlto })
}

// Una opción de un campo del lugar: su valor y, si no entra, por qué («se pisa con «Flete»», «se sale de las 12 columnas»).
export type OpcionDelLugar = { valor: number; motivo: string | null }
export type OpcionesDelLugar = {
  columna: OpcionDelLugar[]
  fila: OpcionDelLugar[]
  ancho: OpcionDelLugar[]
  alto: OpcionDelLugar[]
}

export const motivoDeSeSale = (lado: 'columnas' | 'filas') =>
  lado === 'columnas'
    ? `se sale de las ${String(COLUMNAS_DE_LA_REJILLA)} columnas`
    : `se sale de las ${String(FILAS_DE_LA_REJILLA)} filas`

const rango = (desde: number, hasta: number) =>
  Array.from({ length: Math.max(0, hasta - desde + 1) }, (_, i) => desde + i)

// Lo que ofrece cada campo del lugar de una pieza: cada valor con el resto como está. Las filas llegan hasta la siguiente a la última ocupada de su espacio.
export function opcionesDelLugar(
  d: Diseno,
  p: PiezaDeLaHoja,
  nombreDe: (p: PiezaDeLaHoja) => string,
): OpcionesDelLugar | null {
  const actual = lugarDe(d, p)
  if (actual === null) return null
  const { posicion } = actual.pieza
  const opcion = (valor: number, cambio: Partial<PiezaEnLaRejilla>, lado: 'columnas' | 'filas') => {
    const libre = lugarLibre(d, p, actual.espacio, { ...actual.pieza, ...cambio })
    if (libre.ok) return { valor, motivo: null }
    return {
      valor,
      motivo:
        libre.motivo === 'pisa' ? `se pisa con «${nombreDe(libre.con)}»` : motivoDeSeSale(lado),
    }
  }
  const ultima = ultimaFila(ocupantes(d, actual.espacio).map((o) => o.lugar))
  const filas = Math.min(FILAS_DE_LA_REJILLA, Math.max(ultima + 1, posicion.fila))
  return {
    columna: rango(1, COLUMNAS_DE_LA_REJILLA).map((c) =>
      opcion(c, { posicion: { ...posicion, columna: c } }, 'columnas'),
    ),
    fila: rango(1, filas).map((f) => opcion(f, { posicion: { ...posicion, fila: f } }, 'filas')),
    ancho: rango(1, COLUMNAS_DE_LA_REJILLA).map((a) => opcion(a, { ancho: a }, 'columnas')),
    alto: rango(1, MAXIMO_DE_FILAS).map((a) => opcion(a, { alto: a }, 'filas')),
  }
}
