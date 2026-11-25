// Composición del NÚCLEO de `cotizaciones` en el servidor: acá se decide qué implementación recibe cada interfaz de
// `entities/repositorios-*`. Los casos de uso del núcleo importan de este archivo, nunca de `infra/` (lo verifica eslint-plugin-boundaries)
// ni de la `composicion.ts` de la raíz, que sólo reexporta (4.15-4).
import 'server-only'
import type {
  CotizadorEncima,
  CotizadorEncimaEnPar,
  CreadorDeCotizacion,
  CreadorEnPar,
  GuardadorEnPar,
  GuardadorDeCotizacion,
  LectorDeHoja,
  LectorDeUnaGuardada,
  RecalculadorAlAbrir,
  RecalculadorAlAbrirEnPar,
} from '../../entities/repositorios-de-hoja'
import type { CambiadorDePrivada } from '../../entities/privada'
import type { LectorDeNiveles, RepositorioDeNiveles } from '../../entities/repositorios-de-niveles'
import { cotizarEncima, crearCotizacion, guardarCotizacion } from '../../infra/cotizaciones'
import {
  cotizarEncimaEnPar,
  crearCotizacionesEnPar,
  guardarCotizacionesEnPar,
} from '../../infra/cotizaciones-en-par'
import { nivelesSupabase } from '../../infra/niveles'
import { cambiarPrivada } from '../../infra/privada'
import { leerCatalogoDeTablas as catalogoDeTablas } from '../../infra/queries/catalogo-de-tablas'
import { getHojaParaCotizar } from '../../infra/queries/hoja'
import { getHojaDeUnaGuardada } from '../../infra/queries/hoja-de-una-guardada'
import { contarCotizacionesDelVehiculo as contarDeInfra } from '../../infra/queries/historial-del-vehiculo'
import { getNivelesDeAcceso } from '../../infra/queries/niveles'
import {
  recalcularAlAbrir as recalcularAlAbrirDeInfra,
  recalcularAlAbrirEnPar as recalcularAlAbrirEnParDeInfra,
} from '../../infra/queries/recalculo'

export const repositorioDeNiveles: RepositorioDeNiveles = nivelesSupabase
export const leerNivelesDeAcceso: LectorDeNiveles = getNivelesDeAcceso
export const leerHojaParaCotizar: LectorDeHoja = getHojaParaCotizar
export const leerHojaDeUnaGuardada: LectorDeUnaGuardada = getHojaDeUnaGuardada
export const recalcularAlAbrir: RecalculadorAlAbrir = recalcularAlAbrirDeInfra
export const recalcularAlAbrirEnPar: RecalculadorAlAbrirEnPar = recalcularAlAbrirEnParDeInfra
export const creadorDeCotizacion: CreadorDeCotizacion = crearCotizacion
export const guardadorDeCotizacion: GuardadorDeCotizacion = guardarCotizacion
export const contarCotizacionesDelVehiculo = contarDeInfra
export const cotizadorEncima: CotizadorEncima = cotizarEncima
export const creadorEnPar: CreadorEnPar = crearCotizacionesEnPar
export const guardadorEnPar: GuardadorEnPar = guardarCotizacionesEnPar
export const cotizadorEncimaEnPar: CotizadorEncimaEnPar = cotizarEncimaEnPar
export const cambiadorDePrivada: CambiadorDePrivada = cambiarPrivada
// El catálogo de tablas de un origen (las activas del origen y las compartidas, una por clave): lo leen la fórmula (BUSCARV) y el diseño (la ayuda);
// null si no se pudo leer.
export const leerCatalogoDeTablas = catalogoDeTablas
