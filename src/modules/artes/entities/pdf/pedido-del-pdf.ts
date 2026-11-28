// El pedido del PDF de un arte desde el editor (`POST /artes/<id>/pdf`): el documento que se ve (también sin guardar) y el vehículo de ejemplo
// elegido (nulo: los datos de ejemplo). El documento llega crudo y la ruta lo valida con `validarDocumento()`; lo elegido son sólo ids, que la
// ruta vuelve a leer con la sesión de quien pide (nunca usa datos que manda el navegador). Cuántas imágenes no llegaron vuelve en una cabecera.
// Puro.
import { z } from 'zod'
import { esquemaDelEjemplo } from '../datos/ejemplo-elegido'

export const esquemaDelPedidoDelPdf = z.object({
  documento: z.unknown(),
  eleccion: esquemaDelEjemplo.nullable(),
})
export type PedidoDelPdf = z.infer<typeof esquemaDelPedidoDelPdf>

// El cuerpo más grande que se lee: el documento con su tope (512 KiB) y la elección, con holgura para el JSON.
export const PESO_MAXIMO_DEL_PEDIDO = 600 * 1024

export const MENSAJE_SIN_LA_PLANTILLA = 'No encontramos esta plantilla de arte.'
export const MENSAJE_SIN_EL_PDF = 'No se pudo armar el PDF. Vuelve a intentarlo.'

export const CABECERA_DE_LO_QUE_FALTA = 'X-Imagenes-Que-Faltan'

export const rutaDelPdfDelArte = (id: string) => `/artes/${encodeURIComponent(id)}/pdf`

// Cuántas imágenes faltan según la cabecera: un entero positivo; sin ella o con otra cosa, ninguna.
export function cuantasFaltan(cabecera: string | null): number {
  return cabecera !== null && /^\d+$/.test(cabecera) ? Number(cabecera) : 0
}
