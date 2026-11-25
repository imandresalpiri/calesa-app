// Dónde va un rechazo de forma del aspecto en el editor del diseño: de la ruta (`campo` de `forma`, la de Zod: `diseno.secciones.0.relleno`,
// `diseno.secciones.2.items.1.alto`, `diseno.cabecera.tono`) a la pieza y la clave, para dibujar el error bajo su select. Uno dentro de la ayuda de una celda
// (`diseno.secciones.2.items.0.ayuda.1.texto`) va a su bloque, con el resto de la ruta como clave. Nulo si no es nada de eso (el aviso general lo dice igual).
import { piezaDelItem, type Diseno, type PiezaEnLaSeccion } from '../diseno'

const DEL_ITEM = ['ancho', 'alto', 'letra', 'enfasis']
const DE_LA_SECCION = [
  'ancho',
  'alto',
  'relleno',
  'separacion',
  'densidad',
  'letra',
  'enfasis',
  'tono',
]
const DE_LA_CABECERA = ['tono', 'relleno', 'letra', 'enfasis']

export type LugarDelRechazo =
  | { pieza: 'cabecera'; clave: string }
  | { pieza: 'seccion'; seccionId: string; clave: string }
  | { pieza: 'item'; seccionId: string; item: PiezaEnLaSeccion; clave: string }
  | { pieza: 'bloque'; seccionId: string; nodo: string; bloque: number; clave: string }

const indice = (texto: string | undefined) =>
  texto !== undefined && /^\d+$/.test(texto) ? Number(texto) : undefined

function deLaCabecera(
  clave: string | undefined,
  sobra: string | undefined,
): LugarDelRechazo | null {
  return clave !== undefined && sobra === undefined && DE_LA_CABECERA.includes(clave)
    ? { pieza: 'cabecera', clave }
    : null
}

type Seccion = Diseno['secciones'][number]

// `ayuda.<i>.<clave…>` de una celda: el bloque `i`.
function delBloque(
  s: Seccion,
  it: Seccion['items'][number],
  partes: readonly (string | undefined)[],
): LugarDelRechazo | null {
  const bloque = indice(partes[0])
  if (it.tipo !== 'celda' || bloque === undefined) return null
  return {
    pieza: 'bloque',
    seccionId: s.id,
    nodo: it.nodo,
    bloque,
    clave: partes.slice(1).join('.'),
  }
}

function deLaSeccion(s: Seccion, partes: (string | undefined)[]): LugarDelRechazo | null {
  const [a, b, clave, ...resto] = partes
  if (a !== undefined && b === undefined && DE_LA_SECCION.includes(a)) {
    return { pieza: 'seccion', seccionId: s.id, clave: a }
  }
  const it = a === 'items' ? s.items[indice(b) ?? -1] : undefined
  if (it === undefined || clave === undefined) return null
  if (clave === 'ayuda') return delBloque(s, it, resto)
  return DEL_ITEM.includes(clave)
    ? { pieza: 'item', seccionId: s.id, item: piezaDelItem(it), clave }
    : null
}

export function campoDelRechazo(campo: string | undefined, d: Diseno): LugarDelRechazo | null {
  if (campo === undefined) return null
  const [raiz, pieza, a, ...resto] = campo.split('.')
  if (raiz !== 'diseno') return null
  if (pieza === 'cabecera') return deLaCabecera(a, resto[0])
  const s = pieza === 'secciones' ? d.secciones[indice(a) ?? -1] : undefined
  return s === undefined ? null : deLaSeccion(s, resto)
}
