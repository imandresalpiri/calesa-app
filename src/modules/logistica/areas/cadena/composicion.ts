// Composición de el área `cadena` de `logistica` en el servidor: une la lectura (`infra/cadena`) con el nombre de los vehículos (núcleo). Sale por la `composicion.ts` de la raíz.
import 'server-only'
import type { Resultado } from '@/shared/lib/errores'
import type { Permisos } from '@/shared/lib/permisos'
import type { PaginaDeLaFase, ResultadoDeDondeEsta } from '../../entities/cadena/leer'
import type { OrigenDeLaCadena } from '../../entities/cadena/origenes'
import type { PedidoDeLaFase } from '../../entities/cadena/repositorios'
import type { ResumenDeLaCadena } from '../../entities/cadena/resumen'
import { dondeEstaDe } from '../../features/cadena/donde-esta'
import { origenesDeLaCadena } from '../../features/cadena/origenes-de-la-cadena'
import { nombrarVehiculos } from '../../features/nucleo/identidad-de-vehiculos'
import { leerFaseDeLaBase } from '../../infra/cadena/fase'
import { leerDondeEstaDeLaBase } from '../../infra/cadena/donde-esta'
import { leerNavieras } from '../../infra/cadena/navieras'
import { leerResumenDeLaBase } from '../../infra/cadena/resumen'
import { leerAtributosDeLaBase } from '../../infra/nucleo/atributos'

export { leerNavieras }

// El número de cada fase del origen (vehículos, demorados y trabados, con tope).
export function leerResumenDeLaCadena(origenId: string): Promise<Resultado<ResumenDeLaCadena>> {
  return leerResumenDeLaBase(origenId)
}

// Una página de la lista de una fase, con los vehículos nombrados por el campo principal del origen (6.13).
export async function leerLaFase(pedido: PedidoDeLaFase): Promise<Resultado<PaginaDeLaFase>> {
  const leida = await leerFaseDeLaBase(pedido)
  if (!leida.ok) return leida
  const vehiculos = await nombrarVehiculos(
    pedido.origenId,
    leida.data.vehiculos,
    leerAtributosDeLaBase,
  )
  return { ok: true, data: { vehiculos, hayMas: leida.data.hayMas } }
}

// «Dónde está» lo que se busca, en el origen elegido (nulo: en todos los de la persona). Un texto que no alcanza el mínimo no llama a la base.
export function dondeEsta(
  busqueda: string,
  origenId: string | null,
): Promise<Resultado<ResultadoDeDondeEsta>> {
  return dondeEstaDe(leerDondeEstaDeLaBase, busqueda, origenId)
}

// Los orígenes de Logística (las pestañas de arriba), con las reglas de su flujo. Nulo si no se pudo leer la lista de orígenes.
export function leerOrigenesDeLaCadena(permisos: Permisos): Promise<OrigenDeLaCadena[] | null> {
  return origenesDeLaCadena(permisos)
}
