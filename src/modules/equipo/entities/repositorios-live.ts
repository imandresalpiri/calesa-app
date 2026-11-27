// Lo que Configuración › Modo Live necesita de afuera: leer los ajustes de los roles y las personas, y escribirlos por RPC con la versión que se
// tenía en pantalla (`PT409` si otra persona los cambió). `features/live` depende de estas interfaces y `../composicion.ts` les da `infra/live.ts`.
import type { Resultado } from '@/shared/lib/errores'
import type { AjustesParcialesDelLive } from './live'
import type {
  AjustesDeLosRoles,
  CursorDePersonasDelLive,
  PaginaDePersonasDelLive,
} from './live-configuracion'

export type LectorDeAjustesDeLosRoles = () => Promise<Resultado<AjustesDeLosRoles>>

// Sin texto (o con uno que no busca), quienes tienen lo propio por cursor; con texto, las primeras que lo nombran.
export type PedidoDePersonasDelLive = {
  texto: string | null
  cursor: CursorDePersonasDelLive | null
}

export type LectorDePersonasDelLive = (
  pedido: PedidoDePersonasDelLive,
) => Promise<Resultado<PaginaDePersonasDelLive>>

export type RepositorioDelLive = {
  // La esperada nula crea la fila (el rol estaba «Por defecto»).
  guardarRol: (pedido: {
    rolId: string
    ajustes: AjustesParcialesDelLive
    actualizadoEnEsperado: string | null
  }) => Promise<Resultado<{ actualizadoEn: string }>>
  quitarRol: (pedido: { rolId: string; actualizadoEnEsperado: string }) => Promise<Resultado<null>>
  // Unos ajustes vacíos quitan la fila: la versión vuelve nula.
  guardarPersona: (pedido: {
    usuarioId: string
    ajustes: AjustesParcialesDelLive
    actualizadoEnEsperado: string | null
  }) => Promise<Resultado<{ actualizadoEn: string | null }>>
  quitarPersona: (pedido: {
    usuarioId: string
    actualizadoEnEsperado: string
  }) => Promise<Resultado<null>>
}
