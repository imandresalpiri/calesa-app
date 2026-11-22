// Dónde va un rechazo de forma del aspecto en el editor del diseño: de la ruta (`campo` de `forma`, la de Zod: `diseno.secciones.0.relleno`,
// `diseno.secciones.2.items.1.alto`, `diseno.cabecera.tono`) a la pieza y la clave, para dibujar el error bajo su select. Nulo si no es una clave del aspecto
// (el aviso general lo dice igual).
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

function deLaSeccion(
  s: Diseno['secciones'][number],
  partes: (string | undefined)[],
): LugarDelRechazo | null {
  const [a, b, clave] = partes
  if (a !== undefined && b === undefined && DE_LA_SECCION.includes(a)) {
    return { pieza: 'seccion', seccionId: s.id, clave: a }
  }
  const it = a === 'items' ? s.items[indice(b) ?? -1] : undefined
  if (it === undefined || clave === undefined || !DEL_ITEM.includes(clave)) return null
  return { pieza: 'item', seccionId: s.id, item: piezaDelItem(it), clave }
}

export function campoDelRechazo(campo: string | undefined, d: Diseno): LugarDelRechazo | null {
  if (campo === undefined) return null
  const [raiz, pieza, a, ...resto] = campo.split('.')
  if (raiz !== 'diseno') return null
  if (pieza === 'cabecera') return deLaCabecera(a, resto[0])
  const s = pieza === 'secciones' ? d.secciones[indice(a) ?? -1] : undefined
  return s === undefined ? null : deLaSeccion(s, resto)
}
