// La API de servidor del área `tarjeta` de `cotizaciones`. Sale por el `index.ts` de la raíz, que sólo la reexporta (4.15-4).
//
// `leerAsesorQueMira()`: el asesor de la tarjeta, quien la mira o la comparte (la foto como ruta de `avatares`); lo leen la página de una guardada,
// la hoja nueva, el PDF, «Compartir» y la referencia del editor. `leerAutorDeLaCotizacion(id)`: quien la creó, para «Creado por» de «Compartir». La tarjeta en
// pantalla (`<ProveedorDeLaTarjeta>`) sale por `pantallas/tarjeta.ts`.
//
// `pdfDeUnaGuardada({ lectura, contexto, locale, empresa, topeDelLogo })` (4.18-3a): los bytes y el nombre del PDF de una guardada, de lo guardado; lo pide
// `GET /cotizaciones/[id]/pdf`, que arma el contexto con `contextoDeLaPagina()` (puro); `archivoDelPdf(numero)`, el mismo nombre para el PDF con la
// plantilla de arte.
//
// `paraCompartirDeUnaGuardada({ lectura, contexto, locale })`: las cifras de «Compartir la cotización» (conceptos y total de la tarjeta de lo guardado, y el modo); lo
// pide `GET /cotizaciones/[id]/compartir`, que suma el vehículo y arma `DatosParaCompartir`. `leerVehiculoDeLaCotizacion(id)`: el vehículo por clave primaria, para
// `GET /cotizaciones/[id]/compartir/fotos`.
//
// `imagenDeUnaGuardada(entrada)`: la misma tarjeta como PNG (`{ bytes, ancho, alto, completa }`), la base de la imagen.
//
// La imagen de la tarjeta (`docs/COTIZADOR.md` › «La imagen de la tarjeta»), para `GET /cotizaciones/[id]/imagen`: `leerHuellaDeLaImagen(id)` (la huella de lo que
// dibuja para quien pide; lo que no ve, `no_encontrado`), `etiquetaDeLaImagen({ huella, usuarioId, ancho, sinMoneda })` y `coincideLaEtiqueta(siNoneMatch, etiqueta)`
// (la ETag y el 304), y `armarLaImagen(id, { contextoDe, ancho, sinMoneda })` (el WebP de lo guardado con el contexto de quien mira, `ContextoLeido`; `conRecalculo` falso sin el
// primer recálculo y `completa` falso si una lectura falló o el logo o la foto no llegaron). El componente sale por `pantallas/tarjeta-imagen.ts`.
export {
  imagenDeUnaGuardada,
  leerAsesorQueMira,
  leerAutorDeLaCotizacion,
  leerHuellaDeLaImagen,
  leerVehiculoDeLaCotizacion,
  paraCompartirDeUnaGuardada,
  pdfDeUnaGuardada,
  type EntradaDelPdf,
} from './composicion'
export {
  enlaceParaCompartir,
  esquemaDeLasFotos,
  TOPE_DE_FOTOS_PARA_COMPARTIR,
  type DatosParaCompartir,
  type FotoParaCompartir,
} from '../../entities/tarjeta/compartir/datos-para-compartir'
export { archivoDelPdf } from '../../entities/tarjeta/archivo-del-pdf'
export {
  armarLaImagen,
  type ContextoLeido,
  type ImagenArmada,
} from '../../features/tarjeta/armar-la-imagen'
export {
  contextoDeLaPagina,
  type AsesorDeLaTarjeta,
  type ContextoDeLaCotizacion,
  type PaginaDeLaTarjeta,
} from '../../entities/tarjeta/contexto-de-la-cotizacion'
export {
  coincideLaEtiqueta,
  etiquetaDeLaImagen,
  VERSION_DEL_DIBUJO,
} from '../../entities/tarjeta/etiqueta-de-la-imagen'
export type { ContextoDeQuienMira } from '../../entities/tarjeta/pagina-de-la-imagen'
