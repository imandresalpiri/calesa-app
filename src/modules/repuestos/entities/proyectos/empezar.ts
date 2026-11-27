import type { ProyectoDeVehiculo } from './resumen'
import { rutaDeNuevoItem, rutaDeNuevoProyectoConVehiculo } from './rutas'

export type AccionDeEmpezar = {
  clave: 'pedir' | 'agregar'
  etiqueta: string
  destino: { tipo: 'ruta'; href: string }
}

/**
 * Cómo empezar a pedirle repuestos a un vehículo que no espera ninguno (la tarjeta «Repuestos» de la unidad en `logistica`). Pide `repuestos.editar` (llega resuelto): con un
 * proyecto abierto del vehículo, «Agregar un repuesto»; sin proyecto, «Pedir repuestos para este vehículo». Con el proyecto cerrado, ninguna: no se le agregan ítems y el
 * vehículo no admite otro proyecto vivo. Sin I/O.
 */
export function accionDeEmpezar(pedido: {
  vehiculoId: string
  proyecto: ProyectoDeVehiculo | null
  puedeEditar: boolean
}): AccionDeEmpezar | null {
  const { proyecto, puedeEditar } = pedido
  if (!puedeEditar) return null
  if (proyecto === null) {
    const href = rutaDeNuevoProyectoConVehiculo(pedido.vehiculoId)
    return {
      clave: 'pedir',
      etiqueta: 'Pedir repuestos para este vehículo',
      destino: { tipo: 'ruta', href },
    }
  }
  if (proyecto.cerradoEn !== null) return null
  const href = rutaDeNuevoItem(proyecto.id)
  return { clave: 'agregar', etiqueta: 'Agregar un repuesto', destino: { tipo: 'ruta', href } }
}
