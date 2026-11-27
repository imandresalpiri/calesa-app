// Sólo pruebas: estados del Modo Live para el menú y la paleta, sin pasar por la sesión.
import type { EstadoDelLive } from '@/modules/equipo/shell.client'

type AjustesDelLive = Extract<EstadoDelLive, { encendido: true }>['ajustes']

export const LIVE_APAGADO_DE_PRUEBA: EstadoDelLive = { encendido: false, puedeEncender: true }

// Encendido con los ajustes por defecto (vehículos de todos los orígenes y cotizaciones) y lo que se pise.
export function liveEncendido(cambios: Partial<AjustesDelLive> = {}): EstadoDelLive {
  return {
    encendido: true,
    puedeEncender: true,
    nombresDeClientes: false,
    ajustes: {
      puedeEncender: true,
      vehiculos: true,
      origenes: 'todos',
      cotizaciones: true,
      clientes: 'apagado',
      logistica: 'apagado',
      repuestos: 'apagado',
      inicio: false,
      origenesConfig: 'apagado',
      ...cambios,
    },
  }
}
