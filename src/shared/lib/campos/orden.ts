// El orden de un layout es relativo: «después de X», no una posición. Si otra persona agregó un
// campo entre tanto, el campo queda junto al vecino que se eligió.
type Ordenable = { id: string; grupo: string | null; activo: boolean }

export type Sentido = 'subir' | 'bajar'

// A dónde mandar un campo cuando se sube o se baja un lugar dentro de su grupo: «después de X»
// (null = primero de todo), que es lo que entiende la RPC de mover. Devuelve null en los extremos
// del grupo. `todos` incluye los desactivados: la base ordena el layout entero.
export function destinoDeMovimiento(
  todos: readonly Ordenable[],
  id: string,
  sentido: Sentido,
): { despuesDe: string | null } | null {
  const campo = todos.find((otro) => otro.id === id)
  if (!campo) {
    return null
  }
  const delGrupo = todos.filter((otro) => otro.activo && otro.grupo === campo.grupo)
  const posicion = delGrupo.findIndex((otro) => otro.id === id)
  if (sentido === 'bajar') {
    const siguiente = delGrupo[posicion + 1]
    return siguiente ? { despuesDe: siguiente.id } : null
  }
  const anterior = delGrupo[posicion - 1]
  if (!anterior) {
    return null
  }
  // Antes del anterior = después de quien está justo antes del anterior en el orden entero.
  const indice = todos.findIndex((otro) => otro.id === anterior.id)
  return { despuesDe: todos[indice - 1]?.id ?? null }
}

// A dónde mandar un campo que se suelta sobre otro al arrastrarlo: «después de X» (null = primero de todo). Al bajar queda después del
// que se eligió; al subir, antes (después de quien está justo antes en el orden entero). Sólo dentro de su grupo y entre activos: con
// otro grupo, un desactivado o él mismo, null.
export function destinoAlSoltar(
  todos: readonly Ordenable[],
  id: string,
  sobreId: string,
): { despuesDe: string | null } | null {
  const campo = todos.find((otro) => otro.id === id)
  const sobre = todos.find((otro) => otro.id === sobreId)
  if (!campo || !sobre || campo.id === sobre.id || !campo.activo || !sobre.activo) {
    return null
  }
  if (campo.grupo !== sobre.grupo) {
    return null
  }
  const desde = todos.indexOf(campo)
  const hasta = todos.indexOf(sobre)
  if (desde < hasta) {
    return { despuesDe: sobre.id }
  }
  return { despuesDe: todos[hasta - 1]?.id ?? null }
}

// El layout como queda tras mover un campo «después de X» (null = primero de todo): lo que se ve mientras la base lo guarda. Si el campo o
// el vecino no están, queda igual.
export function aplicarMovimiento<Campo extends { id: string }>(
  todos: readonly Campo[],
  id: string,
  despuesDe: string | null,
): Campo[] {
  const campo = todos.find((otro) => otro.id === id)
  if (!campo || campo.id === despuesDe) {
    return [...todos]
  }
  const sinEl = todos.filter((otro) => otro.id !== id)
  if (despuesDe === null) {
    return [campo, ...sinEl]
  }
  const vecino = sinEl.findIndex((otro) => otro.id === despuesDe)
  if (vecino < 0) {
    return [...todos]
  }
  return [...sinEl.slice(0, vecino + 1), campo, ...sinEl.slice(vecino + 1)]
}
