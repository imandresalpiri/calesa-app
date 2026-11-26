import { loQueUsanLosOrigenes, type FilaPropiaOCompartida } from '@/shared/lib/catalogos/propios'

// La clave de un puerto vive en `shared` porque `flujos` también la usa (la oferta de transporte): un módulo no importa otro.
export { claveDePuerto } from '@/shared/lib/catalogos/propios'

// Qué ofrece un selector de un catálogo propio o compartido (puertos, navieras, categorías de gasto) a una o varias unidades, y cómo se nombra lo
// guardado que ya no se ofrece. Lo usan transporte y dinero: un área no importa otra.

export type AlcanceDelCatalogo = {
  // Lo que usan las unidades (activo o no: el selector filtra los activos).
  usables: ReadonlySet<string>
  // Compartidos que un propio activo de alguno de sus orígenes tapa.
  tapados: ReadonlySet<string>
  // Propios que no pueden usar todas (de otro origen, o de uno de varios).
  ajenos: ReadonlySet<string>
}

/**
 * El alcance para unidades de estos orígenes (nulo = un ítem de repuestos, que sólo usa compartidos). Con uno solo, lo que usa ese origen; con
 * varios, sólo los compartidos que no tapa ninguno (la aplicación es de todo o nada: un propio fallaría en las demás).
 */
export function alcanceDelCatalogo(
  filas: readonly FilaPropiaOCompartida[],
  origenes: readonly (string | null)[],
): AlcanceDelCatalogo {
  const distintos = [...new Set(origenes)]
  const conOrigen = distintos.filter((o): o is string => o !== null)
  const lista = loQueUsanLosOrigenes(filas, conOrigen)
  const usables = new Set(
    (distintos.includes(null) ? lista.filter((f) => f.origenId === null) : lista).map((f) => f.id),
  )
  const fuera = filas.filter((f) => !usables.has(f.id))
  return {
    usables,
    tapados: new Set(fuera.filter((f) => f.origenId === null).map((f) => f.id)),
    ajenos: new Set(fuera.filter((f) => f.origenId !== null).map((f) => f.id)),
  }
}

/** Todo lo leído es usable: para quien no sabe de orígenes. */
export function alcanceLibre(filas: readonly { id: string }[]): AlcanceDelCatalogo {
  return { usables: new Set(filas.map((f) => f.id)), tapados: new Set(), ajenos: new Set() }
}

/** El nombre de una fila donde se mezclan orígenes (embarques, el filtro de gastos): un propio lleva su origen, «Arica · Chile». */
export function nombreConOrigen(fila: { nombre: string; origenNombre: string | null }): string {
  return fila.origenNombre ? `${fila.nombre} · ${fila.origenNombre}` : fila.nombre
}

/** El rótulo de algo guardado que ya no se ofrece por su origen; nulo si no es tapado ni ajeno. */
export function rotuloPorOrigen(
  alcance: AlcanceDelCatalogo,
  id: string,
  femenino: boolean,
): string | null {
  if (alcance.ajenos.has(id)) {
    return '(de otro origen)'
  }
  return alcance.tapados.has(id) ? (femenino ? '(tapada)' : '(tapado)') : null
}
