import { RUTAS } from '@/shared/lib/rutas'

// En qué orígenes quien mira ve vehículos (`origenesCon(permisos, 'vehiculos.ver')`): `'todos'` o los ids. Sin ninguno, la lista vacía: ningún enlace.
export type VehiculosVisibles = 'todos' | readonly string[]

export const SIN_VEHICULOS_VISIBLES: VehiculosVisibles = []

// La ficha del vehículo de una cotización (`/vehiculos/<id>`), o nulo si no tiene vehículo o quien mira no ve los de su origen (entonces su título es texto).
export function rutaDelVehiculoDeLaFila(
  fila: { vehiculoId: string | null; origenId: string },
  visibles: VehiculosVisibles,
): string | null {
  if (fila.vehiculoId === null) {
    return null
  }
  const ve = visibles === 'todos' || visibles.includes(fila.origenId)
  return ve ? `${RUTAS.vehiculos}/${fila.vehiculoId}` : null
}

// El nombre accesible del enlace a la ficha del vehículo.
export const nombreDelEnlaceAlVehiculo = (titulo: string): string => `Ver ${titulo} en Vehículos`
