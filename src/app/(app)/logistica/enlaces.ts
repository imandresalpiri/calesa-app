import type { EnlaceDeLogistica } from '@/modules/logistica'
import { enElOrigen } from '@/modules/logistica/pantallas/barra'
import { ENLACE_DE_ADUANA } from '@/modules/logistica/pantallas/aduana-enlace'
import { ENLACE_DE_DINERO } from '@/modules/logistica/pantallas/dinero-enlace'
import { ENLACE_DE_TRANSPORTE } from '@/modules/logistica/pantallas/transporte-enlace'
import { puede, type Permisos } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'

// Las pestañas de un origen en Logística (la segunda fila de la barra), en este orden: Cadena y Bandeja del día siempre; Embarques, Aduana y Gastos si el flujo
// del origen usa alguna de sus reglas y la persona tiene alguno de sus permisos en ese origen. Puro: lo prueba `enlaces.test.ts`.

export type PestanaDeLogistica = 'cadena' | 'bandeja' | EnlaceDeLogistica['clave']

/** Lo que la barra necesita de un origen: su id y las reglas activas de su flujo (nulas si no se pudieron leer). */
export type OrigenConReglas = { id: string; reglas: readonly string[] | null }

export type PestanaDelOrigen = { clave: PestanaDeLogistica; titulo: string; href: string }

/** Si una pestaña va en un origen: `si`; `no_usa` (su flujo no tiene la regla); `sin_permiso`; `flujo_no_leido` (no se sabe: el flujo no se pudo leer). */
export type DisponibilidadDeLaPestana = 'si' | 'no_usa' | 'sin_permiso' | 'flujo_no_leido'

const FIJAS: readonly { clave: PestanaDeLogistica; titulo: string; ruta: string }[] = [
  { clave: 'cadena', titulo: 'Cadena', ruta: RUTAS.logistica },
  { clave: 'bandeja', titulo: 'Bandeja del día', ruta: RUTAS.bandejaDeLogistica },
]

const DE_LAS_AREAS: readonly EnlaceDeLogistica[] = [
  ENLACE_DE_TRANSPORTE,
  ENLACE_DE_ADUANA,
  ENLACE_DE_DINERO,
].filter((enlace) => enlace !== null)

/** El título de una pestaña («Aduana»), para decir que un origen no la usa. */
export function tituloDeLaPestana(clave: PestanaDeLogistica): string {
  return [...FIJAS, ...DE_LAS_AREAS].find((p) => p.clave === clave)?.titulo ?? clave
}

/** Los títulos de las pestañas que dependen del flujo, en orden («Embarques», «Aduana», «Gastos»): lo que falta cuando el flujo no se pudo leer. */
export function pestanasQuePidenElFlujo(): string[] {
  return DE_LAS_AREAS.map((enlace) => enlace.titulo)
}

export function pestanaDisponible(
  permisos: Permisos,
  origen: OrigenConReglas,
  clave: PestanaDeLogistica,
): DisponibilidadDeLaPestana {
  if (FIJAS.some((p) => p.clave === clave)) return 'si'
  const enlace = DE_LAS_AREAS.find((e) => e.clave === clave)
  if (enlace === undefined) return 'no_usa'
  if (origen.reglas === null) return 'flujo_no_leido'
  const { reglas } = origen
  if (!enlace.reglas.some((regla) => reglas.includes(regla))) return 'no_usa'
  if (!enlace.permisos.some((permiso) => puede(permisos, permiso, origen.id))) return 'sin_permiso'
  return 'si'
}

export function pestanasDelOrigen(permisos: Permisos, origen: OrigenConReglas): PestanaDelOrigen[] {
  return [...FIJAS, ...DE_LAS_AREAS]
    .filter((p) => pestanaDisponible(permisos, origen, p.clave) === 'si')
    .map((p) => ({ clave: p.clave, titulo: p.titulo, href: enElOrigen(p.ruta, origen.id) }))
}

/**
 * A dónde lleva la pestaña de otro origen: a la misma pestaña si ese origen la tiene; si no (o desde la unidad, `null`), a su Cadena. Sin filtros ni cursor: serían
 * de otro origen. Desde la lista de una fase se va a la Cadena y desde un grupo de la bandeja, a la Bandeja (la página pasa `cadena` o `bandeja`).
 */
export function hrefDeOtroOrigen(
  pestana: PestanaDeLogistica | null,
  destino: OrigenConReglas,
  permisos: Permisos,
): string {
  const ruta =
    pestana !== null && pestanaDisponible(permisos, destino, pestana) === 'si'
      ? [...FIJAS, ...DE_LAS_AREAS].find((p) => p.clave === pestana)?.ruta
      : undefined
  return enElOrigen(ruta ?? RUTAS.logistica, destino.id)
}

// Los orígenes cuya pestaña Fases abre el ⚙ «Configurar»: los que la persona configura (`flujos.configurar`) o donde gestiona los catálogos de logística, en
// el orden recibido y los activos antes que los inactivos. Sin ninguno, no hay botón.
export function origenesParaConfigurar(
  permisos: Permisos,
  origenes: readonly { id: string; activo: boolean }[],
): string[] {
  const permitidos = origenes.filter(
    (o) =>
      puede(permisos, 'flujos.configurar', o.id) ||
      puede(permisos, 'logistica.catalogos.gestionar', o.id),
  )
  return [...permitidos.filter((o) => o.activo), ...permitidos.filter((o) => !o.activo)].map(
    (o) => o.id,
  )
}

// A qué origen lleva el ⚙: al elegido en la barra si la persona lo configura; si no, al primero que configura (`primero`, el primero de
// `origenesParaConfigurar`). Nulo: ninguno, no hay botón.
export function destinoDeConfigurar(
  elegido: string | null,
  permitidos: readonly string[],
): string | null {
  if (elegido !== null && permitidos.includes(elegido)) {
    return elegido
  }
  return permitidos[0] ?? null
}
