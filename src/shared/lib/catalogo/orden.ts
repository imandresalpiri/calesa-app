export type DireccionDeOrden = 'subir' | 'bajar'

// «Subir» o «Bajar» un elemento como lo pide la base (`*_mover(p_despues_de)`): el id del que queda justo antes, o nulo si queda primero.
// `undefined` si no se puede mover hacia ahí (ya es el primero o el último, o no está).
export function despuesDeAlMover(
  lista: readonly { id: string }[],
  id: string,
  direccion: DireccionDeOrden,
): string | null | undefined {
  const posicion = lista.findIndex((elemento) => elemento.id === id)
  if (posicion < 0) {
    return undefined
  }
  if (direccion === 'subir') {
    return posicion === 0 ? undefined : (lista[posicion - 2]?.id ?? null)
  }
  return lista[posicion + 1]?.id
}

// Cuántos ítems tiene cada elemento del catálogo, contados sobre lo ya cargado (con su tope: nunca un total de la base).
export function usosPorElemento<Item>(
  items: readonly Item[],
  elementoDe: (item: Item) => string | null,
): ReadonlyMap<string, number> {
  const usos = new Map<string, number>()
  for (const item of items) {
    const id = elementoDe(item)
    if (id !== null) {
      usos.set(id, (usos.get(id) ?? 0) + 1)
    }
  }
  return usos
}
