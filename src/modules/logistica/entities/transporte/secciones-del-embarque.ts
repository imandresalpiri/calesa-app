import type { ContenedorDelEmbarque, EmbarqueLeido, VehiculoDelEmbarque } from './embarque'

// La jerarquía de la página del embarque: embarque → contenedores → vehículos, y los sueltos al final (un solo nivel de secciones).
export type SeccionDelEmbarque = {
  contenedor: ContenedorDelEmbarque
  vehiculos: VehiculoDelEmbarque[]
}

export type SeccionesDelEmbarque = {
  // Una por contenedor, en el orden de los contenedores (por número), aunque esté vacío.
  contenedores: SeccionDelEmbarque[]
  // Los que van en un contenedor que pasó el tope de 100: «Otros contenedores».
  otros: VehiculoDelEmbarque[]
  // Los que van directos en el embarque, sin contenedor.
  sueltos: VehiculoDelEmbarque[]
}

/** Los vehículos del embarque repartidos en sus contenedores, en el orden en que llegaron. */
export function seccionesDelEmbarque(
  embarque: Pick<EmbarqueLeido, 'contenedores' | 'vehiculos'>,
): SeccionesDelEmbarque {
  const porContenedor = new Map<string, VehiculoDelEmbarque[]>(
    embarque.contenedores.map((c) => [c.id, []]),
  )
  const otros: VehiculoDelEmbarque[] = []
  const sueltos: VehiculoDelEmbarque[] = []
  for (const v of embarque.vehiculos) {
    if (v.contenedorId === null) {
      sueltos.push(v)
      continue
    }
    const lista = porContenedor.get(v.contenedorId)
    if (lista) lista.push(v)
    else otros.push(v)
  }
  return {
    contenedores: embarque.contenedores.map((contenedor) => ({
      contenedor,
      vehiculos: porContenedor.get(contenedor.id) ?? [],
    })),
    otros,
    sueltos,
  }
}
