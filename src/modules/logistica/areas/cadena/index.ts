// La API de servidor de el área `cadena` de `logistica`: el número de cada fase (la gráfica), la lista de una fase, «dónde está» y las pestañas de origen, con sus filtros y tipos.
// La pantalla la consume por `pantallas/cadena.ts` y `pantallas/cadena-fase.ts`. Sale por el `index.ts` de la raíz.
export {
  dondeEsta,
  leerEntidadDelFiltro,
  leerLaFase,
  leerNavieras,
  leerOrigenesDeLaCadena,
  leerResumenDeLaCadena,
} from './composicion'
export {
  CLAVE_DE_EMBARQUE,
  CLAVE_DE_BUSQUEDA_DE_LA_CADENA,
  CLAVE_DE_DONDE_BUSCAR,
  buscaEnTodos,
  rutaDeDondeEsta,
  CLAVE_DE_CONTENEDOR,
  CLAVE_DE_DEMORADAS,
  CLAVE_DE_FASE_DE_LA_CADENA,
  CLAVE_DE_NAVIERA,
  CLAVE_DE_POR_APROBAR,
  MINIMO_DE_BUSQUEDA_DE_LA_CADENA,
  avisoDeEntidadQueNoEsta,
  cadenaFiltrada,
  entidadPedida,
  esquemaDeFiltrosDeLaCadena,
  pedidoDeLaCadena,
  type EntidadDelFiltro,
  type EntidadPedida,
  type FiltrosDeLaCadena,
  type NavieraParaFiltrar,
} from '../../entities/cadena/filtros'
export {
  CLAVE_DE_SIN_FASE,
  claveDeFase,
  codificarCursorDeLaFase,
  faseDeLaClave,
  leerCursorDeLaFase,
  rutaDeLaFase,
  type CursorDeLaFase,
} from '../../entities/cadena/fase'
export { origenElegido, type OrigenDeLaCadena } from '../../entities/cadena/origenes'
export type {
  PaginaDeLaFase,
  ResultadoDeDondeEsta,
  UnidadDondeEsta,
  VehiculoDeLaFase,
} from '../../entities/cadena/leer'
export type { FaseDelResumen, ResumenDeLaCadena } from '../../entities/cadena/resumen'
