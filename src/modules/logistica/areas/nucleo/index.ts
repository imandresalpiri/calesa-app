// La API de servidor del núcleo de `logistica` (6.01): la unidad y los huecos de su panel. Sale por el `index.ts` de la raíz.
export { leerUnidad } from './composicion'
export { refDeUnidad } from '../../entities/nucleo/unidad'
export type { RefDeUnidad, Unidad, UnidadAbierta } from '../../entities/nucleo/unidad'
export { huecosVisibles, ORDEN_DE_HUECOS } from '../../entities/nucleo/hueco'
export type { HuecoDeLaUnidad } from '../../entities/nucleo/hueco'
export type { EntidadDelHueco, GrupoDeLogistica, HuecoDelGrupo } from '../../entities/nucleo/grupo'
export { huecosPara } from '../../entities/nucleo/huecos-del-grupo'
export type { CatalogoDeLogistica, EnlaceDeLogistica } from '../../entities/nucleo/enlaces'
export {
  CLAVE_DE_ORIGEN_DE_LOGISTICA,
  CLAVE_DEL_HUECO_ABIERTO,
  enElOrigen,
  rutaDeLaUnidad,
} from '../../entities/nucleo/enlaces'
export {
  esTarjetaConocida,
  ORDEN_DE_TARJETAS,
  tarjetaDelHueco,
  tarjetasDeLaUnidad,
  TITULO_DE_LA_TARJETA,
} from '../../entities/nucleo/tarjetas'
export type { ClaveDeTarjeta, TarjetaConSusHuecos } from '../../entities/nucleo/tarjetas'
export { demoraDeLaUnidad } from '../../entities/nucleo/demora'
export type { FaseParaLaDemora } from '../../entities/nucleo/demora'
export { capacidadesDeLaTarjeta } from '../../entities/nucleo/acciones-de-la-tarjeta'
export type { CapacidadesDeLaTarjeta } from '../../entities/nucleo/acciones-de-la-tarjeta'
export { accionDeVer } from '../../entities/nucleo/tarjeta'
export { CLAVE_DE_SUBIR, CLAVE_DEL_TIPO_A_SUBIR } from '../../entities/nucleo/paneles-de-la-unidad'
export type {
  AccionDeLaTarjeta,
  DestinoDeLaAccion,
  ResumenDeTarjeta,
} from '../../entities/nucleo/tarjeta'
