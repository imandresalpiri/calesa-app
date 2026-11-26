import { ENLACE_DE_ADUANA } from '@/modules/logistica/pantallas/aduana-enlace'
import { ENLACE_DE_DINERO } from '@/modules/logistica/pantallas/dinero-enlace'
import { ENLACE_DE_TRANSPORTE } from '@/modules/logistica/pantallas/transporte-enlace'
import { puede, type Permisos } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'

export type EnlaceDelMenu = { titulo: string; ruta: string }

// Los enlaces de la sub-navegación de `/logistica`, en este orden: Cadena (siempre, con `logistica.ver` en algún origen) y, de las áreas, los que ya tienen página
// (`ENLACE_DE_<ÁREA>` no nulo) y cuyo permiso tiene la persona.
export function enlacesDeLogistica(permisos: Permisos): EnlaceDelMenu[] {
  if (!puede(permisos, 'logistica.ver')) return []
  const deLasAreas = [ENLACE_DE_TRANSPORTE, ENLACE_DE_ADUANA, ENLACE_DE_DINERO].flatMap((enlace) =>
    enlace !== null && puede(permisos, enlace.permiso)
      ? [{ titulo: enlace.titulo, ruta: enlace.ruta }]
      : [],
  )
  return [{ titulo: 'Cadena', ruta: RUTAS.logistica }, ...deLasAreas]
}

// Los orígenes cuya pestaña Fases abre el ⚙ «Configurar»: los que la persona configura (`flujos.configurar`) o donde gestiona los catálogos de logística, en
// el orden recibido y los activos antes que los inactivos. Sin ninguno, no hay botón.
export function origenesParaConfigurar(
  permisos: Permisos,
  origenes: readonly { id: string; activo: boolean }[],
): string[] {
  const permitidos = origenes.filter(
    (o) =>
      puede(permisos, 'flujos.configurar', o.id) ||
      puede(permisos, 'logistica.catalogos.gestionar', o.id),
  )
  return [...permitidos.filter((o) => o.activo), ...permitidos.filter((o) => !o.activo)].map(
    (o) => o.id,
  )
}

// A qué origen lleva el ⚙: al de `?origen=` (el que la cadena muestra) si la persona lo configura; si no, al primero que configura (`primero`, el primero de
// `origenesParaConfigurar`). Nulo: ninguno, no hay botón.
export function destinoDeConfigurar(
  pedido: string | null,
  permitidos: readonly string[],
): string | null {
  if (pedido !== null && permitidos.includes(pedido)) {
    return pedido
  }
  return permitidos[0] ?? null
}

// Las rutas que son de la cadena aunque no sean `/logistica`: la lista de una fase y la página de un grupo de la bandeja. «Cadena» queda marcada en ellas.
const RUTAS_DE_LA_CADENA = [`${RUTAS.logistica}/fase/`, `${RUTAS.logistica}/bandeja/`]

/** ¿Es este enlace el de la página donde está la persona? Un enlace es el actual en su ruta y debajo de ella; «Cadena» también en la lista de una fase y la de un grupo de la bandeja. */
export function esEnlaceActual(enlace: EnlaceDelMenu, ruta: string): boolean {
  if (enlace.ruta === ruta) return true
  if (enlace.ruta === RUTAS.logistica)
    return RUTAS_DE_LA_CADENA.some((prefijo) => ruta.startsWith(prefijo))
  return ruta.startsWith(`${enlace.ruta}/`)
}
