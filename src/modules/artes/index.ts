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
  leerTextoBase,
  pdfDelArte,
  type PdfDelArte,
  type PedidoDelPdfDelArte,
  type TextoBaseLeido,
} from './composicion'
export {
  claveDelPedido,
  esquemaDeFiltrosDeArtes,
  leerPestana,
  pedidoDePlantillas,
  type PedidoDePlantillas,
  type PestanaDeArtes,
} from './entities/filtros'
export { tipoDelFormato, type ClaveDeFormato, type TipoDeArte } from './entities/formatos'
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
export type {
  ImagenDeArte,
  LogoDelEditor,
  OrigenDeArtes,
  PlantillaDeArte,
  PorDefecto,
} from './entities/tipos'
// El documento de una plantilla de arte y lo que se comprueba antes de usarlo.
export {
  MENSAJE_DOCUMENTO_INVALIDO,
  MENSAJE_DOCUMENTO_PESADO,
  validarDocumento,
  type DocumentoDeArte,
} from './entities/documento'
// El PDF de un arte (`POST /artes/<id>/pdf`): el pedido, de dónde sale cada imagen y el nombre del archivo.
export { deDondeSaleLaImagen, type ImagenDelPdf } from './entities/pdf/imagen-del-pdf'
export {
  CABECERA_DE_LO_QUE_FALTA,
  esquemaDelPedidoDelPdf,
  MENSAJE_SIN_EL_PDF,
  MENSAJE_SIN_LA_PLANTILLA,
  PESO_MAXIMO_DEL_PEDIDO,
} from './entities/pdf/pedido-del-pdf'
export { nombreDelPdf } from './entities/editor/exportar'
// Los datos con que se llena un arte (`entities/datos/`): las formas que arma `src/app` (`src/app/(app)/_arte/`) para las rutas del vehículo de
// ejemplo, y lo puro que resuelve un arte con ellos (el editor y el texto para compartir de una cotización).
export {
  capasConDatos,
  tieneDatos,
  type CapaResuelta,
  type CapasConDatos,
  type Falta,
} from './entities/datos/capas-con-datos'
export { fotosEnOrden, type FotoParaOrdenar } from './entities/datos/fotos-en-orden'
export { datosDelEjemploElegido, leadsDelEjemplo } from './entities/datos/ejemplo-con-datos'
export type { EjemploElegido } from './entities/datos/ejemplo-elegido'
export { datosDelArteDeEjemplo } from './entities/editor/datos-de-ejemplo'
export {
  imagenesDelPdf,
  paginasConDatos,
  type PaginaConDatos,
} from './entities/pdf/paginas-con-datos'
export { textoDeLoQueFalta } from './entities/datos/lo-que-falta'
export {
  MOTIVO_SIN_EL_MENSAJE_DEL_PORTAL,
  motivoSinVehiculosDeEjemplo,
} from './entities/datos/motivos-del-editor'
export { quedoVacio, resolverTexto, type TextoResuelto } from './entities/datos/resolver-texto'
export type {
  CotizacionDeEjemplo,
  CotizacionesDeEjemplo,
  FilaDeCotizacionDeEjemplo,
  FilaDeVehiculoDeEjemplo,
  GrupoDeLeadsDeEjemplo,
  LeadDeEjemplo,
  LeadsDeEjemplo,
  VehiculoDeEjemplo,
  VehiculosDeEjemplo,
} from './entities/datos/respuestas'
export { LARGO_MAXIMO_DEL_TEXTO_BASE, validarTextoBase } from './entities/datos/texto-base'
export { motivoSinPermisoDelTextoBase } from './features/textos/schemas/guardar-texto-base'
export { textoBaseInicial } from './entities/datos/texto-base-inicial'
export {
  REDES_DEL_ARTE,
  type AsesorDelArte,
  type DatosDeLaCotizacion,
  type DatosDelArte,
  type DatosDelVehiculo,
  type EmpresaDelArte,
  type FijosDelArte,
  type MontoDelArte,
  type RedDelArte,
  type TipoDeOrigenDelArte,
} from './entities/datos/tipos'
export { valoresDelArte, type ValoresDelArte } from './entities/datos/valores-del-arte'
export {
  variablesDelArte,
  type CampoDelArte,
  type CatalogoDelArte,
  type VariableDelArte,
} from './entities/datos/variables-del-arte'
export { MAXIMO_DE_FOTOS_DEL_VEHICULO } from './entities/capas-del-documento'
export { LADOS_DE_LA_FOTO, type LadoDeLaFoto } from './entities/medios'
