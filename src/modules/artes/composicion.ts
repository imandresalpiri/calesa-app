// Composición del módulo en el servidor: los casos de uso y `src/app` importan de acá, nunca de `infra/`.
import 'server-only'
import type { PdfDelArte, PedidoDelPdfDelArte } from './infra/pdf/pdf-del-arte'

export {
  getMisPorDefecto as leerMisPorDefecto,
  getPaginaDeImagenes as leerPaginaDeImagenes,
  getPaginaDePlantillas as leerPaginaDePlantillas,
  getPlantillaParaEditar as leerPlantillaParaEditar,
  leerArteParaCompartir,
} from './infra/lecturas'
export {
  archivoDeLaImagen as archivoDeLaImagenDeArte,
  archivoDelLogo as archivoDelLogoDeArte,
  type ArchivoDelLienzo,
} from './infra/medios'
export {
  cambiarVisibilidad,
  crearImagen,
  crearPlantilla,
  duplicarPlantilla,
  eliminarPlantilla,
  guardarPlantilla,
  ponerPorDefecto,
  quitarImagen,
  renombrarImagen,
  usosDeLaImagen,
  type ConVersion,
  type Creada,
  type ImagenQuitada,
} from './infra/mutaciones'
export {
  getTextoBase as leerTextoBase,
  guardarTextoBase,
  type TextoBaseGuardado,
  type TextoBaseLeido,
} from './infra/textos-base'
export type { PdfDelArte, PedidoDelPdfDelArte } from './infra/pdf/pdf-del-arte'

// El PDF de un arte con unos datos: react-pdf y sharp se cargan al pedirlo, con `import()`; ninguna otra ruta que importa el módulo los paga.
export async function pdfDelArte(pedido: PedidoDelPdfDelArte): Promise<PdfDelArte> {
  const { pdfDelArte: dibujar } = await import('./infra/pdf/pdf-del-arte')
  return dibujar(pedido)
}
