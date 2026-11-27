// Qué se oculta en el Live, por área. Cada `page.tsx` y `route.ts` de `(app)` nombra la suya (`src/app/(app)/_live/pantallas-del-live.ts`,
// vigilado por `scripts/guardas/live-en-las-paginas.test.ts`); el menú, también (`navegacion.ts`).
import { puede, type Permisos } from '@/shared/lib/permisos'
import type { AjustesDelLive } from './live'
import type { EstadoDelLive } from './live-combinar'

export const AREAS_DEL_LIVE = [
  'vehiculos',
  'cotizaciones',
  // Leads: sólo con «Completo».
  'clientes',
  // `/logistica`: sólo la cadena.
  'logistica.cadena',
  // El resto de Logística: siempre oculto.
  'logistica',
  // `/repuestos`: sólo sus números.
  'repuestos.estadisticas',
  // El resto de Repuestos: siempre oculto.
  'repuestos',
  'inicio',
  'tablero',
  // Planilla, Hoja y Tarjeta de un origen (y la lista de orígenes y el inicio de Configuración que llevan a ellas), en sólo lectura.
  'origenes.lectura',
  // Agenda, chat, actividad, datos, notificaciones, el perfil, las papeleras y el resto de Configuración.
  'siempre-oculto',
] as const

export type AreaDelLive = (typeof AREAS_DEL_LIVE)[number]

// Qué valor deja ver cada área configurable; `true` = siempre oculta.
function visibleSegun(ajustes: AjustesDelLive): Record<AreaDelLive, boolean> {
  return {
    vehiculos: ajustes.vehiculos,
    cotizaciones: ajustes.cotizaciones,
    clientes: ajustes.clientes === 'completo',
    'logistica.cadena': ajustes.logistica === 'cadena',
    logistica: false,
    'repuestos.estadisticas': ajustes.repuestos === 'estadisticas',
    repuestos: false,
    inicio: ajustes.inicio,
    tablero: ajustes.inicio,
    'origenes.lectura': ajustes.origenesConfig === 'lectura',
    'siempre-oculto': false,
  }
}

export function seOcultaEnElLive(live: EstadoDelLive, area: AreaDelLive): boolean {
  return live.encendido && !visibleSegun(live.ajustes)[area]
}

// Un origen se ve si el Live está apagado, si muestra «todos» o si está entre los elegidos.
export function origenVisibleEnElLive(live: EstadoDelLive, origenId: string | null): boolean {
  if (!live.encendido || live.ajustes.origenes === 'todos') {
    return true
  }
  return origenId !== null && live.ajustes.origenes.includes(origenId)
}

// Cómo se ve el cliente de una cotización: su nombre (`completo`, o `nombres` con leads de verdad) o «Cliente».
export type ClienteEnElLive = 'nombre' | 'oculto'

export function clienteEnElLive(live: EstadoDelLive): ClienteEnElLive {
  if (!live.encendido || live.ajustes.clientes === 'completo' || live.nombresDeClientes) {
    return 'nombre'
  }
  return 'oculto'
}

// Qué hace una pantalla con el cliente de una cotización: leer su nombre (`leer`), escribir «Cliente» sin leer nada (`reemplazar`) o no nombrarlo
// (`ninguno`: sin `leads.ver`, como fuera del Live). Con «Sólo nombres», `permisos` ya llega sin `leads.ver` (`permisosDelLive()`): `nombresDeClientes`
// dice si los reales lo tienen.
export type ClienteDeLaCotizacion = 'leer' | 'reemplazar' | 'ninguno'

export function clienteDeLaCotizacion(
  live: EstadoDelLive,
  permisos: Permisos,
): ClienteDeLaCotizacion {
  if (clienteEnElLive(live) === 'oculto') {
    return 'reemplazar'
  }
  if (live.encendido && live.nombresDeClientes) {
    return 'leer'
  }
  return puede(permisos, 'leads.ver') ? 'leer' : 'ninguno'
}

// La barra del cliente de la hoja de cotizar con el Live: `apagado` (no se elige: «Se elige al salir del Modo Live»), `nombres` (el panel sólo con
// nombres) o null (como fuera del Live: también con «Completo»).
export type BarraDelClienteEnElLive = 'apagado' | 'nombres' | null

export function barraDelClienteEnElLive(live: EstadoDelLive): BarraDelClienteEnElLive {
  if (!live.encendido || live.ajustes.clientes === 'completo') {
    return null
  }
  return live.nombresDeClientes ? 'nombres' : 'apagado'
}
