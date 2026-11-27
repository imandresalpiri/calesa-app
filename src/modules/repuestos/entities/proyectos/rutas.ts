import { RUTAS } from '@/shared/lib/rutas'
import { PANEL_NUEVO_ITEM } from '../items/paneles'
import { CLAVE_DE_VEHICULO, PANEL_NUEVO_PROYECTO } from './paneles'

/** La pantalla de un proyecto: `/repuestos/<id>` (la dibuja la parte 2 del 8.09). */
export function rutaDelProyecto(id: string): string {
  return `${RUTAS.repuestos}/${id}`
}

/** «Agregar un repuesto»: la hoja del proyecto con «Agregar ítem» abierto (`?panel=nuevo-item`). */
export function rutaDeNuevoItem(proyectoId: string): string {
  return `${rutaDelProyecto(proyectoId)}?${new URLSearchParams({ panel: PANEL_NUEVO_ITEM }).toString()}`
}

/** «Pedir repuestos para este vehículo»: `/repuestos` con «Nuevo proyecto» abierto y ya vinculado al vehículo. */
export function rutaDeNuevoProyectoConVehiculo(vehiculoId: string): string {
  const parametros = new URLSearchParams({
    panel: PANEL_NUEVO_PROYECTO,
    [CLAVE_DE_VEHICULO]: vehiculoId,
  })
  return `${RUTAS.repuestos}?${parametros.toString()}`
}
