// Entrada del módulo para Server Components (sin componentes): las lecturas del servidor de `/artes` y del editor de `/artes/[id]` (la
// plantilla, sus imágenes y los logos por el mismo origen), lo puro que arma las páginas y qué se comparte de una cotización.
export {
  archivoDeLaImagenDeArte,
  archivoDelLogoDeArte,
  leerArteParaCompartir,
  leerMisPorDefecto,
  leerPaginaDeImagenes,
  leerPaginaDePlantillas,
  leerPlantillaParaEditar,
} from './composicion'
export {
  claveDelPedido,
  esquemaDeFiltrosDeArtes,
  leerPestana,
  pedidoDePlantillas,
  type PedidoDePlantillas,
  type PestanaDeArtes,
} from './entities/filtros'
export type { ClaveDeFormato, TipoDeArte } from './entities/formatos'
export {
  cabecerasDelMedio,
  esquemaDeLaVarianteDelLogo,
  etiquetaDeLaRuta,
  SIN_MEDIO,
} from './entities/medios'
export { origenesDeArtes } from './entities/origenes'
export {
  MOTIVO_SIN_ARTES,
  puedeEditarLaPlantilla,
  type QuienMira,
} from './entities/permisos-de-artes'
export type { QueSeComparte } from './entities/por-defecto'
export type { ImagenDeArte, OrigenDeArtes, PlantillaDeArte, PorDefecto } from './entities/tipos'
