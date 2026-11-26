// Lo que ofrece el «+» de una sección en el editor de la hoja: cada tipo de pieza con las filas de la fórmula que puede dibujar y que todavía no están en la
// hoja, o el motivo por el que no se puede (el tope de 40 piezas, la tarjeta del total ya ubicada o una sección que no la admite). Lo que sólo admite un tipo
// de pieza se ofrece con ella: una `opcion` en chips de variante, una `bandera` en un interruptor, un `calculo` en una franja de subtotal o una celda, una tabla
// sobrescribible con celda en atajos. Puras; en el orden de la fórmula.
import type { Diseno, ItemSinPosicion, SeccionDeDiseno } from '../diseno'
import type { Definicion } from '../formula'
import type { Nodo } from '../nodos'
import { auxiliaresDe } from '../compilador-auxiliares'
import { columnasParaAtajos } from './edicion-de-items'
import { hayLugarParaOtraPieza, MOTIVO_DEL_TOPE_DE_PIEZAS } from './insercion-del-diseno'
import { nodosDibujados } from './sin-lugar'
import { dondeVaElTotal, motivoParaElTotal, MOTIVO_DEL_TOTAL_REPETIDO } from './total-de-la-hoja'

export const TIPOS_PARA_SUMAR = [
  'celda',
  'variante',
  'atajos',
  'interruptor',
  'subtotal',
  'total',
] as const
export type TipoParaSumar = (typeof TIPOS_PARA_SUMAR)[number]

export const ETIQUETAS_PARA_SUMAR: Record<TipoParaSumar, string> = {
  celda: 'Celda de una fila',
  variante: 'Chips de variante',
  atajos: 'Atajos de una tabla',
  interruptor: 'Interruptor',
  subtotal: 'Franja de subtotal',
  total: 'Tarjeta del total',
}

const SIN_CANDIDATOS: Record<Exclude<TipoParaSumar, 'total'>, string> = {
  celda: 'Todas las filas ya están en la hoja.',
  variante: 'La fórmula no tiene una variante sin lugar en la hoja.',
  atajos: 'Ninguna tabla sobrescribible con su celda en la hoja está sin atajos.',
  interruptor: 'La fórmula no tiene una bandera sin lugar en la hoja.',
  subtotal: 'Todos los cálculos ya están en la hoja.',
}

export type CandidatoParaSumar = { nodo: string; etiqueta: string }
export type OfertaParaSumar = {
  tipo: TipoParaSumar
  etiqueta: string
  // Las filas que puede dibujar (vacío para la tarjeta del total, que no elige fila).
  candidatos: CandidatoParaSumar[]
  motivo: string | null
}

// El ancho con que nace una celda: la mitad de la sección.
export const ANCHO_DE_UNA_CELDA_NUEVA = 6
// Cuántos chips nacen en unos atajos.
export const ATAJOS_DE_UNOS_NUEVOS = 5

function candidatosDe(def: Definicion, d: Diseno): Record<Exclude<TipoParaSumar, 'total'>, Nodo[]> {
  const dibujados = nodosDibujados(def, d)
  const conAtajos = new Set(
    d.secciones.flatMap((s) => s.items.flatMap((it) => (it.tipo === 'atajos' ? [it.nodo] : []))),
  )
  const auxiliares = auxiliaresDe(def, { visitas: 0 })
  const libres = def.nodos.filter((n) => !dibujados.has(n.id))
  return {
    celda: libres.filter(
      (n) => n.tipo !== 'opcion' && n.tipo !== 'bandera' && !auxiliares.has(n.id),
    ),
    variante: libres.filter((n) => n.tipo === 'opcion'),
    interruptor: libres.filter((n) => n.tipo === 'bandera'),
    subtotal: libres.filter((n) => n.tipo === 'calculo'),
    atajos: def.nodos.filter(
      (n) =>
        n.tipo === 'tabla' &&
        n.sobrescribible === true &&
        dibujados.has(n.id) &&
        !conAtajos.has(n.id),
    ),
  }
}

export function ofertasParaSumar(
  def: Definicion,
  d: Diseno,
  seccion: Pick<SeccionDeDiseno, 'presentacion' | 'nivel_ver'>,
): OfertaParaSumar[] {
  const tope = hayLugarParaOtraPieza(d) ? null : MOTIVO_DEL_TOPE_DE_PIEZAS
  const candidatos = candidatosDe(def, d)
  return TIPOS_PARA_SUMAR.map((tipo) => {
    const etiqueta = ETIQUETAS_PARA_SUMAR[tipo]
    if (tipo === 'total') {
      const motivo =
        tope ??
        (dondeVaElTotal(d) === null ? motivoParaElTotal(seccion) : MOTIVO_DEL_TOTAL_REPETIDO)
      return { tipo, etiqueta, candidatos: [], motivo }
    }
    const lista = candidatos[tipo].map((n) => ({ nodo: n.id, etiqueta: n.etiqueta }))
    return {
      tipo,
      etiqueta,
      candidatos: lista,
      motivo: tope ?? (lista.length === 0 ? SIN_CANDIDATOS[tipo] : null),
    }
  })
}

// La pieza que se suma, con lo que la base pide de cada tipo: una celda con su ancho (y el secundario si es el porcentaje de un par sobrescribible), unos
// atajos con su columna y sus chips, un interruptor con su efecto.
export function itemParaSumar(
  def: Definicion,
  tipo: TipoParaSumar,
  nodoId: string,
): ItemSinPosicion {
  const nodos = new Map(def.nodos.map((n) => [n.id, n]))
  const nodo = nodos.get(nodoId)
  switch (tipo) {
    case 'celda': {
      const par =
        nodo?.tipo === 'calculo' && nodo.op === 'porcentaje_de' && nodo.sobrescribible === true
      return {
        tipo: 'celda',
        nodo: nodoId,
        ancho: ANCHO_DE_UNA_CELDA_NUEVA,
        ...(par ? { secundario: 'porcentaje' as const } : {}),
      }
    }
    case 'atajos':
      return {
        tipo: 'atajos',
        nodo: nodoId,
        columna: columnasParaAtajos(nodos, nodoId, '').find((c) => c !== '') ?? nodoId,
        filas: ATAJOS_DE_UNOS_NUEVOS,
      }
    case 'interruptor':
      return { tipo: 'interruptor', nodo: nodoId, efecto: 'habilita' }
    case 'variante':
    case 'subtotal':
      return { tipo, nodo: nodoId }
    case 'total':
      return { tipo: 'total' }
    default: {
      const _: never = tipo
      return _
    }
  }
}
