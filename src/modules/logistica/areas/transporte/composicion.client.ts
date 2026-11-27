// Composición del área `transporte` de `logistica` en el navegador (6.08-1): lo que leen los drawers de los catálogos en las fases de un origen. La importa sólo su feature y ningún barril la reexporta
// (como `areas/dinero/composicion.client.ts`).
export {
  leerNavierasDelOrigen,
  leerPuertosDelOrigen,
  NO_SE_CARGARON_LAS_NAVIERAS,
  NO_SE_CARGARON_LOS_PUERTOS,
} from '../../infra/transporte/catalogos.client'

// Lo que lee el hueco «Transporte» de la unidad (6.08-2): su transporte, la oferta del flujo, los catálogos y los permisos de quien mira.
export {
  leerTransporteDeLaUnidad,
  NO_SE_CARGO_EL_TRANSPORTE,
  type TransporteDeLaUnidad,
} from '../../infra/transporte/unidad.client'
export { leerMisPermisos } from '../../infra/transporte/permisos.client'

// Lo que ofrecen los selectores de los formularios de un embarque y un contenedor.
export {
  leerContenedoresParaElegir,
  leerContenedoresSinEmbarque,
  leerEmbarquesParaElegir,
  leerTiposDeContenedorParaElegir,
  type TipoParaElegir,
  NO_SE_CARGARON_LAS_OPCIONES,
  TOPE_PARA_ELEGIR,
  type OpcionesParaElegir,
} from '../../infra/transporte/para-elegir.client'
