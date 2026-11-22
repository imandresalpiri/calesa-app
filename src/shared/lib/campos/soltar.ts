// Qué hace soltar algo al arrastrar en el editor de campos. Lo que se arrastra y lo que lo recibe se nombran con un prefijo, porque la fila
// de un campo y su casilla de dato clave son dos elementos distintos: `campo:<id>` (la fila), `fijo:<llave>` (un dato común),
// `casilla:<llave>` (un lugar lleno) y `casilla-libre:<n>` (un lugar vacío). Sin I/O: el editor despacha lo que esto devuelve.
import { MOTIVO_OTRO_GRUPO } from './motivos'
import { destinoAlSoltar } from './orden'

type Ordenable = { id: string; grupo: string | null; activo: boolean }

export const idDeFila = (campoId: string) => `campo:${campoId}`
export const idDeFijo = (llave: string) => `fijo:${llave}`
export const idDeCasilla = (llave: string) => `casilla:${llave}`
export const idDeCasillaLibre = (posicion: number) => `casilla-libre:${String(posicion)}`

type Elemento =
  | { tipo: 'campo'; id: string }
  | { tipo: 'fijo'; llave: string }
  | { tipo: 'casilla'; llave: string }
  | { tipo: 'libre'; posicion: number }

export function leerId(id: string): Elemento | null {
  const corte = id.indexOf(':')
  if (corte < 0) {
    return null
  }
  const prefijo = id.slice(0, corte)
  const resto = id.slice(corte + 1)
  switch (prefijo) {
    case 'campo':
      return { tipo: 'campo', id: resto }
    case 'fijo':
      return { tipo: 'fijo', llave: resto }
    case 'casilla':
      return { tipo: 'casilla', llave: resto }
    case 'casilla-libre': {
      const posicion = Number(resto)
      return Number.isInteger(posicion) && posicion >= 0 ? { tipo: 'libre', posicion } : null
    }
    default:
      return null
  }
}

export type QueHaceLaSoltada =
  | { tipo: 'mover-campo'; id: string; despuesDe: string | null }
  | { tipo: 'poner-en-casilla'; llave: string; posicion: number }
  | { tipo: 'mover-casilla'; desde: number; hasta: number }
  // `motivo`: por qué no se puede, para anunciarlo; null = se soltó donde no hace nada (o en su lugar).
  | { tipo: 'nada'; motivo: string | null }

export type CasillasDeLaSoltada = {
  // Las llaves de los lugares llenos, en orden.
  llaves: readonly string[]
  tope: number
  motivoTope: string
  // La llave de dato clave de un campo (por su id), o null si no puede serlo (un desactivado).
  llaveDeCampo: (campoId: string) => string | null
}

const NADA: QueHaceLaSoltada = { tipo: 'nada', motivo: null }

// A qué lugar de las casillas apunta lo que recibe: el de una casilla llena o el número de un lugar libre (nunca más allá del último).
function posicionDe(sobre: Elemento, llaves: readonly string[]): number | null {
  if (sobre.tipo === 'casilla') {
    const indice = llaves.indexOf(sobre.llave)
    return indice < 0 ? null : indice
  }
  if (sobre.tipo === 'libre') {
    return Math.min(sobre.posicion, llaves.length)
  }
  return null
}

// Un campo o un dato común sobre las casillas: si ya es dato clave, cambia de lugar; si no, entra en ese lugar (con el tope lleno, no).
function alPonerEnCasilla(
  llave: string | null,
  sobre: Elemento,
  casillas: CasillasDeLaSoltada,
): QueHaceLaSoltada {
  const posicion = posicionDe(sobre, casillas.llaves)
  if (llave === null || posicion === null) {
    return NADA
  }
  const desde = casillas.llaves.indexOf(llave)
  if (desde >= 0) {
    const hasta = Math.min(posicion, casillas.llaves.length - 1)
    return desde === hasta ? NADA : { tipo: 'mover-casilla', desde, hasta }
  }
  if (casillas.llaves.length >= casillas.tope) {
    return { tipo: 'nada', motivo: casillas.motivoTope }
  }
  return { tipo: 'poner-en-casilla', llave, posicion }
}

// Algo sobre las casillas: un campo (por su llave), un dato común o una casilla que cambia de lugar.
function alSoltarEnCasillas(
  tomado: Elemento,
  destino: Elemento,
  casillas: CasillasDeLaSoltada | null,
): QueHaceLaSoltada {
  if (casillas === null) {
    return NADA
  }
  switch (tomado.tipo) {
    case 'casilla':
    case 'fijo':
      return alPonerEnCasilla(tomado.llave, destino, casillas)
    case 'campo':
      return alPonerEnCasilla(casillas.llaveDeCampo(tomado.id), destino, casillas)
    case 'libre':
      return NADA
  }
}

// Un campo sobre otro: cambia de lugar dentro de su grupo; en otro grupo, no (y se dice por qué).
function alSoltarEntreCampos(
  id: string,
  sobreId: string,
  campos: readonly Ordenable[],
): QueHaceLaSoltada {
  const movido = destinoAlSoltar(campos, id, sobreId)
  if (movido !== null) {
    return { tipo: 'mover-campo', id, ...movido }
  }
  const uno = campos.find((campo) => campo.id === id)
  const otro = campos.find((campo) => campo.id === sobreId)
  const otroGrupo = uno !== undefined && otro !== undefined && uno.grupo !== otro.grupo
  return { tipo: 'nada', motivo: otroGrupo ? MOTIVO_OTRO_GRUPO : null }
}

export function queHaceLaSoltada({
  activo,
  sobre,
  campos,
  casillas,
}: {
  activo: string
  sobre: string | null
  // Todos, también los desactivados: el orden se mide sobre el layout entero.
  campos: readonly Ordenable[]
  // Sin casillas (los leads), sólo se ordenan los campos.
  casillas: CasillasDeLaSoltada | null
}): QueHaceLaSoltada {
  const tomado = leerId(activo)
  const destino = sobre === null ? null : leerId(sobre)
  if (tomado === null || destino === null) {
    return NADA
  }
  if (destino.tipo === 'casilla' || destino.tipo === 'libre') {
    return alSoltarEnCasillas(tomado, destino, casillas)
  }
  if (tomado.tipo !== 'campo' || destino.tipo !== 'campo' || tomado.id === destino.id) {
    return NADA
  }
  return alSoltarEntreCampos(tomado.id, destino.id, campos)
}
