// Lo que la cadena necesita de afuera, dicho como interfaz (6.03-1). La implementación (Supabase) vive en `infra/cadena/` y la une `areas/cadena/composicion.ts`.
import type { Resultado } from '@/shared/lib/errores'
import type { CursorDeLaFase } from './fase'
import type { FiltrosDeLaCadena, NavieraParaFiltrar, TipoDeEntidadDelFiltro } from './filtros'
import type { PaginaDeLaFase, ResultadoDeDondeEsta } from './leer'
import type { ResumenDeLaCadena } from './resumen'

export type PedidoDeLaFase = {
  origenId: string
  // Nulo: «Sin fase».
  faseId: string | null
  cursor: CursorDeLaFase | null
  filtros: FiltrosDeLaCadena
}

// `logistica_cadena_resumen()`: el número de cada fase del origen, con la sesión de quien mira.
export type LectorDelResumen = (origenId: string) => Promise<Resultado<ResumenDeLaCadena>>
// `logistica_cadena_columna()`: una página de la lista de una fase.
export type LectorDeLaFase = (pedido: PedidoDeLaFase) => Promise<Resultado<PaginaDeLaFase>>
// `logistica_donde_esta()`: dónde está lo que se busca, en todos los orígenes de la persona.
// `origenId` nulo: en todos los orígenes de la persona («Buscar en todos los orígenes»).
export type LectorDeDondeEsta = (
  buscar: string,
  origenId: string | null,
) => Promise<Resultado<ResultadoDeDondeEsta>>
// Las navieras activas que usa un origen (sus propias y las compartidas que no tapa).
export type LectorDeNavieras = (origenId: string) => Promise<Resultado<NavieraParaFiltrar[]>>
// El número del contenedor o el booking del embarque que filtra una fase, en su origen y bajo la RLS de quien mira; nulo si no existe o no se ve.
export type LectorDelNombreDelFiltro = (
  tipo: TipoDeEntidadDelFiltro,
  id: string,
  origenId: string,
) => Promise<Resultado<string | null>>
