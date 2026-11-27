// Las claves de la URL del lote (6.04-3): `?panel=lote` abre el drawer; `destino` (la fase a la que se mueve), `contenedor` y `embarque` (el lote de un grupo, por su id) lo nombran. Se escriben juntas al
// abrir y se borran juntas al cerrar, así abrir desde la barra no deja un `contenedor` viejo.
export const PANEL_DEL_LOTE = 'lote'
export const CLAVE_DE_DESTINO_DEL_LOTE = 'destino'
export const CLAVE_DE_CONTENEDOR_DEL_LOTE = 'contenedor'
export const CLAVE_DE_EMBARQUE_DEL_LOTE = 'embarque'
export const CLAVES_DEL_LOTE = [
  CLAVE_DE_DESTINO_DEL_LOTE,
  CLAVE_DE_CONTENEDOR_DEL_LOTE,
  CLAVE_DE_EMBARQUE_DEL_LOTE,
] as const

export type GrupoDelLote =
  | { tipo: 'contenedor' | 'embarque'; id: string; valido: true }
  // Una URL vieja (`?contenedor=MSCU1234`) o mal copiada: el drawer lo dice, sin leer nada.
  | { tipo: 'contenedor' | 'embarque'; valido: false }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** El grupo que nombra la URL del lote (el contenedor manda sobre el embarque); nulo si no nombra ninguno. */
export function grupoDelLote(
  contenedor: string | null,
  embarque: string | null,
): GrupoDelLote | null {
  const tipo = contenedor !== null ? 'contenedor' : embarque !== null ? 'embarque' : null
  const id = contenedor ?? embarque
  if (tipo === null || id === null) return null
  return UUID.test(id) ? { tipo, id, valido: true } : { tipo, valido: false }
}

/** «Ese contenedor no existe o ya no lo ves.» */
export function textoDelGrupoQueNoEsta(tipo: 'contenedor' | 'embarque'): string {
  return `Ese ${tipo} no existe o ya no lo ves.`
}
