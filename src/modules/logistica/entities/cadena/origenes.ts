// Los orígenes de Logística (6.03-1): los activos donde la persona tiene `logistica.ver` y el flujo de vehículos tiene la regla `logistica` encendida. Arriba de toda
// página de Logística, una pestaña por cada uno. `reglas`: las reglas activas de su flujo (`flujos_reglas`), que deciden qué pestañas tiene el origen; nulas si el
// flujo no se pudo leer (el origen sigue en la lista: la base vuelve a exigir regla y permiso en cada lectura).
export type OrigenDeLaCadena = {
  id: string
  nombre: string
  color: string | null
  reglas: readonly string[] | null
}

/**
 * El origen que dibuja una página de Logística: el pedido (`?origen=`) si está entre los de la persona; si no, el último que eligió (`logistica.ultimo_origen`) si
 * todavía está; si no, el primero. Nulo si no hay ninguno. Nunca un error.
 */
export function origenElegido(
  origenes: readonly OrigenDeLaCadena[],
  parametro: string | null | undefined,
  ultimo: string | null = null,
): OrigenDeLaCadena | null {
  return (
    origenes.find((origen) => origen.id === parametro) ??
    origenes.find((origen) => origen.id === ultimo) ??
    origenes[0] ??
    null
  )
}
