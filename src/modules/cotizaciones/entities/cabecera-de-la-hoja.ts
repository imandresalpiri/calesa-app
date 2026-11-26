import type { RespuestaDeRecalculo } from './recalculo'

// La cabecera de la hoja (`cotizacion_hoja()` › `cabecera`): lo que es del diseño entero y no de una sección. Reglas puras, cero I/O.

// El modo de tipo de cambio con que abre una cotización nueva (P1): el modo por defecto del diseño si lo trae y existe; si no, el primero de los que
// declara; nulo si no declara ninguno. Una guardada abre con el suyo.
export function modoInicial(cabecera: {
  modos: readonly { clave: string }[]
  modoPorDefecto?: string | null
}): string | null {
  const porDefecto = cabecera.modoPorDefecto
  if (porDefecto != null && cabecera.modos.some((m) => m.clave === porDefecto)) {
    return porDefecto
  }
  return cabecera.modos[0]?.clave ?? null
}

// Los modos que dibuja el encabezado, en el orden del diseño: los visibles (sin `modosVisibles`, todos) más el que la cotización tiene elegido, que se
// dibuja siempre aunque no sea visible (una guardada vieja no pierde su modo). La visibilidad no es una regla de guardado.
export function modosDelEncabezado<M extends { clave: string }>(
  cabecera: { modos: readonly M[]; modosVisibles: readonly string[] | null },
  elegido: string | null,
): M[] {
  const visibles = cabecera.modosVisibles
  if (visibles === null) {
    return [...cabecera.modos]
  }
  return cabecera.modos.filter((m) => m.clave === elegido || visibles.includes(m.clave))
}

// «Ver total Bs» se ofrece si el diseño lo permite **y** hay con qué moneda escribirlo (P6): sin `monedaBs` (la versión no tiene `total_en`, o su tipo de cambio no existe o
// está inactivo) la hoja no dibuja el interruptor y guarda `ver_total_bs` en falso.
export function ofreceVerTotalBs(cabecera: { verTotalBs: boolean; monedaBs: string | null }) {
  return cabecera.verTotalBs && cabecera.monedaBs !== null
}

// «Ver total» con que abre una cotización nueva: el del diseño por defecto, sólo si la hoja lo ofrece. Una guardada abre con el suyo.
export function verTotalBsAlAbrir(cabecera: {
  verTotalBs: boolean
  monedaBs: string | null
  verTotalBsPorDefecto: boolean
}): boolean {
  return ofreceVerTotalBs(cabecera) && cabecera.verTotalBsPorDefecto
}

export type TotalEnMonedaLocal =
  { tipo: 'sin_calcular' } | { tipo: 'faltante' } | { tipo: 'valor'; bs: number }

// El total en la moneda local (`totales.bs` de la respuesta): sin respuesta no hay; con la respuesta y sin valor, falta («—»).
export function totalBsDelResumen(respuesta: RespuestaDeRecalculo | null): TotalEnMonedaLocal {
  if (respuesta === null) {
    return { tipo: 'sin_calcular' }
  }
  const bs = respuesta.totales.bs
  return bs === null ? { tipo: 'faltante' } : { tipo: 'valor', bs }
}

// El nombre (el de la base) del modo elegido, para decirlo (el ⚙ de la cabecera, la tarjeta); nulo si la hoja no declara modos o no hay uno elegido.
export function nombreDelModo(
  cabecera: { modos: readonly { clave: string; nombre: string }[] },
  clave: string | null,
): string | null {
  return cabecera.modos.find((m) => m.clave === clave)?.nombre ?? null
}

// Si la cabecera de la hoja dibuja algo (dos modos o más, «Ver total en moneda local» o el ⚙): con eso la ranura de la cabecera muestra la cabecera quieta antes de que la
// hoja se monte y la llene por un portal (sin saltos). El ⚙ cuenta con `ajustes`, que la base da sólo a quien configura el origen (el mismo que ve el ⚙).
export function cabeceraSeDibuja(
  cabecera: {
    modos: readonly { clave: string }[]
    modosVisibles: readonly string[] | null
    verTotalBs: boolean
    monedaBs: string | null
    ajustes: boolean
  },
  modoElegido: string | null,
): boolean {
  return (
    modosDelEncabezado(cabecera, modoElegido).length >= 2 ||
    ofreceVerTotalBs(cabecera) ||
    cabecera.ajustes
  )
}
