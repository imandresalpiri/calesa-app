// La API de servidor del área `transporte` de `logistica`: las lecturas de `/logistica/embarques` y de la página de un embarque (la lista, un embarque, un contenedor, los tipos de
// contenedor y los catálogos), el pedido de la lista y las claves de URL. Sale por el `index.ts` de la raíz.
export {
  leerContenedor,
  leerContenedores,
  leerEmbarque,
  leerEmbarques,
  leerTiposDeContenedor,
  type TipoDeContenedor,
} from '../../infra/transporte/embarques'
export {
  leerCatalogosDeTransporte,
  type CatalogosDeTransporte,
} from '../../infra/transporte/lectura-de-catalogos'
export {
  CLAVE_DE_ESTADO,
  esquemaDeFiltrosDeEmbarques,
  embarquesFiltrados,
  pedidoDeEmbarques,
  type PedidoDeEmbarques,
} from '../../entities/transporte/filtros-de-embarques'
export type {
  ContenedorLeido,
  EmbarqueLeido,
  VehiculoDelEmbarque,
} from '../../entities/transporte/embarque'
export type {
  ContenedorDeLaLista,
  EmbarqueDeLaLista,
  PaginaDeContenedores,
  PaginaDeEmbarques,
} from '../../entities/transporte/lista-de-embarques'
export {
  CLAVE_DE_DONDE_VIAJA,
  CLAVE_DEL_CONTENEDOR_ABIERTO,
  CLAVE_DE_FALTA,
  CLAVE_DE_GRUPO,
  ETIQUETA_DE_VISTA_DE_GRUPOS,
  huecoDelPanel,
  PANEL_AGREGAR_CONTENEDOR,
  PANEL_AGREGAR_VEHICULOS,
  PANEL_EDITAR_CONTENEDOR,
  PANEL_EDITAR_EMBARQUE,
  PANEL_NUEVO_EMBARQUE,
  tipoDeGrupoDeLaVista,
  VALOR_DE_FALTA,
  vistaDeGrupos,
  vistaDelOrigen,
  vistasDeTransporte,
  type VistaDeGrupos,
} from '../../entities/transporte/paneles'
export {
  EMBARQUE_QUE_NO_ESTA,
  CONTENEDOR_QUE_NO_ESTA,
  tituloDelContenedor,
  tituloDelEmbarque,
} from '../../entities/transporte/textos'
export { leerResumenDeTransporte } from './composicion'
