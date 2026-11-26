// Composición del módulo en el servidor: acá se decide qué implementación recibe cada interfaz
// de `entities/repositorios`. Los casos de uso de `features/` importan de este archivo, nunca de
// `infra/` (lo verifica eslint-plugin-boundaries).
import 'server-only'
import type {
  LectorDeAjustes,
  LectorDeAjustesDeCotizacion,
  LectorDeEnlacesDeAyuda,
  LectorDeHistorial,
  LectorDeIntegraciones,
  LectorDeLeyendaDeTiposCambio,
  LectorDeMisEnlacesDeAyuda,
  LectorDeMonedasYTiposCambio,
  LectorDeUltimosCambios,
  LectorDeVehiculosQueCambian,
  ProbadorDeRevalidacion,
  RepositorioAjustesDeCotizacion,
  RepositorioDeEnlacesDeAyuda,
  RepositorioDeMisEnlacesDeAyuda,
  RepositorioEmpresa,
  RepositorioIntegraciones,
  RepositorioLeyendaDeTiposCambio,
  RepositorioTiposCambio,
} from './entities/repositorios'
import { ajustesDeCotizacionSupabase } from './infra/ajustes-de-cotizacion'
import { empresaSupabase } from './infra/empresa'
import { enlacesDeAyudaSupabase, misEnlacesDeAyudaSupabase } from './infra/enlaces-de-ayuda'
import { dibujarImagenDeTiposCambio } from './infra/compartir/imagen'
import { integracionesSupabase } from './infra/integraciones'
import { leyendaDeTiposCambioSupabase } from './infra/leyenda-de-tipos-cambio'
import { getAjustes, getAjustesParaEditar, getPoliticaDeLimpieza } from './infra/queries/ajustes'
import { getAjustesDeCotizacion } from './infra/queries/ajustes-de-cotizacion'
import { getParaCompartir } from './infra/queries/compartir'
import { getEnlacesDeAyuda, getMisEnlacesDeAyuda } from './infra/queries/enlaces-de-ayuda'
import { getLeyendaDeTiposCambio } from './infra/queries/leyenda'
import {
  getIntegraciones,
  getVehiculosQueCambian,
  integracionActiva,
} from './infra/queries/integraciones'
import {
  getHistorial,
  getMonedasYTiposCambio,
  getTiposCambio,
  getTiposCambioDeLaBarra,
  getUltimosCambios,
} from './infra/queries/tipos-cambio'
import { probarRevalidacion } from './infra/revalidacion-prueba'
import { tiposCambioSupabase } from './infra/tipos-cambio'
import {
  responderParaCompartir,
  type FormatoParaCompartir,
} from './features/compartir-tipos-cambio/responder'

export const repositorioEmpresa: RepositorioEmpresa = empresaSupabase
export const repositorioTiposCambio: RepositorioTiposCambio = tiposCambioSupabase
export const repositorioIntegraciones: RepositorioIntegraciones = integracionesSupabase
export const repositorioAjustesDeCotizacion: RepositorioAjustesDeCotizacion =
  ajustesDeCotizacionSupabase
export const repositorioLeyendaDeTiposCambio: RepositorioLeyendaDeTiposCambio =
  leyendaDeTiposCambioSupabase
export const repositorioDeEnlacesDeAyuda: RepositorioDeEnlacesDeAyuda = enlacesDeAyudaSupabase
export const repositorioDeMisEnlacesDeAyuda: RepositorioDeMisEnlacesDeAyuda =
  misEnlacesDeAyudaSupabase
export const probadorDeRevalidacion: ProbadorDeRevalidacion = probarRevalidacion

export const leerAjustes: LectorDeAjustes = getAjustesParaEditar
export const leerMonedasYTiposCambio: LectorDeMonedasYTiposCambio = getMonedasYTiposCambio
export const leerHistorial: LectorDeHistorial = getHistorial
export const leerUltimosCambios: LectorDeUltimosCambios = getUltimosCambios
export const leerIntegraciones: LectorDeIntegraciones = getIntegraciones
export const leerVehiculosQueCambian: LectorDeVehiculosQueCambian = getVehiculosQueCambian
export const leerAjustesDeCotizacion: LectorDeAjustesDeCotizacion = getAjustesDeCotizacion
export const leerLeyendaDeTiposCambio: LectorDeLeyendaDeTiposCambio = getLeyendaDeTiposCambio
export const leerEnlacesDeAyuda: LectorDeEnlacesDeAyuda = getEnlacesDeAyuda
export const leerMisEnlacesDeAyuda: LectorDeMisEnlacesDeAyuda = getMisEnlacesDeAyuda

// Lo que el popover de la barra pide para compartir los tipos de cambio (`/tipos-de-cambio/texto` y `/imagen`).
export function responderCompartirTiposCambio(
  formato: FormatoParaCompartir,
  ids: string | null,
): Promise<Response> {
  return responderParaCompartir(formato, ids, {
    leer: getParaCompartir,
    dibujar: dibujarImagenDeTiposCambio,
  })
}

// Lo que consumen el shell y otros módulos: nunca tumban una pantalla.
export {
  getAjustes,
  getPoliticaDeLimpieza,
  getTiposCambio,
  getTiposCambioDeLaBarra,
  integracionActiva,
}
