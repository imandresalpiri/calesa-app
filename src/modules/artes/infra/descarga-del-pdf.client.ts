// El PDF de una plantilla de arte pedido desde el editor: un POST a la ruta de `src/app/(app)/artes/[id]/pdf` con lo que se ve (el documento y lo
// elegido como ejemplo) y la sesión de quien mira. No sigue la redirección (sin sesión la ruta manda al ingreso: bajaría la página de ingreso) y no
// guarda en caché. Del cuerpo de un rechazo sólo se usa el texto corto que escribió la ruta (los suyos son para la persona); si no, uno propio.
import {
  MENSAJE_SESION_VENCIDA,
  MENSAJE_SIN_CONEXION,
  fallo,
  ok,
  type CodigoError,
  type Resultado,
} from '@/shared/lib/errores'
import {
  CABECERA_DE_LO_QUE_FALTA,
  cuantasFaltan,
  MENSAJE_SIN_EL_PDF,
  rutaDelPdfDelArte,
  type PedidoDelPdf,
} from '../entities/pdf/pedido-del-pdf'

const ES_PDF = /^application\/pdf\b/
const ES_TEXTO = /^text\/plain\b/
const LARGO_MAXIMO_DEL_TEXTO = 200

export type PdfBajado = { blob: Blob; faltan: number }

function codigoDelRechazo(status: number): CodigoError {
  switch (status) {
    case 403:
      return 'sin_permiso'
    case 404:
      return 'no_encontrado'
    case 413:
    case 422:
      return 'validacion'
    default:
      return 'inesperado'
  }
}

async function textoDelRechazo(respuesta: Response): Promise<string> {
  if (respuesta.status >= 500 || !ES_TEXTO.test(respuesta.headers.get('content-type') ?? '')) {
    return MENSAJE_SIN_EL_PDF
  }
  try {
    const texto = (await respuesta.text()).trim()
    return texto !== '' && texto.length <= LARGO_MAXIMO_DEL_TEXTO ? texto : MENSAJE_SIN_EL_PDF
  } catch {
    return MENSAJE_SIN_EL_PDF
  }
}

export async function pedirElPdfDelArte(
  plantillaId: string,
  pedido: PedidoDelPdf,
): Promise<Resultado<PdfBajado>> {
  let respuesta: Response
  try {
    respuesta = await fetch(rutaDelPdfDelArte(plantillaId), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pedido),
      redirect: 'manual',
      cache: 'no-store',
    })
  } catch {
    return fallo('inesperado', MENSAJE_SIN_CONEXION, 'sin_red')
  }
  if (respuesta.type === 'opaqueredirect' || (respuesta.status >= 300 && respuesta.status < 400)) {
    return fallo('no_autenticado', MENSAJE_SESION_VENCIDA)
  }
  if (!respuesta.ok) {
    return fallo(codigoDelRechazo(respuesta.status), await textoDelRechazo(respuesta))
  }
  if (!ES_PDF.test(respuesta.headers.get('content-type') ?? '')) {
    return fallo('inesperado', MENSAJE_SIN_EL_PDF)
  }
  try {
    const blob = await respuesta.blob()
    return ok({ blob, faltan: cuantasFaltan(respuesta.headers.get(CABECERA_DE_LO_QUE_FALTA)) })
  } catch {
    return fallo('inesperado', MENSAJE_SIN_EL_PDF)
  }
}
