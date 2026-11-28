// El PDF de un arte con los datos que se vuelven a leer con la sesión de quien pide: el documento (el que se ve en el editor, también sin guardar)
// resuelto página por página como en el lienzo (`paginasConDatos()`), los montos siempre con su moneda (también con el Modo Live: un PDF se
// manda), las imágenes leídas por su lector y el dibujo de `pdfDelArte()`. Devuelve los bytes y cuántas imágenes no llegaron; el vehículo elegido
// que ya no se ve es `no_encontrado`, con su texto.
import 'server-only'
import {
  imagenesDelPdf,
  MENSAJE_SIN_EL_PDF,
  paginasConDatos,
  pdfDelArte,
  valoresDelArte,
  type DocumentoDeArte,
  type EjemploElegido,
  type PdfDelArte,
  type PlantillaDeArte,
} from '@/modules/artes'
import type { requerirSesion } from '@/modules/equipo'
import { fallo, ok, type Resultado } from '@/shared/lib/errores'
import { NO_ESTA_EL_VEHICULO } from '../../artes/ejemplo/_respuestas'
import { leerDatosParaElPdf } from './datos-para-el-pdf'
import { imagenesParaElPdf } from './imagenes-para-el-pdf'

type Sesion = Awaited<ReturnType<typeof requerirSesion>>

type PedidoDelArte = {
  plantilla: Pick<PlantillaDeArte, 'nombre' | 'ancho' | 'alto' | 'origenId'>
  documento: DocumentoDeArte
  eleccion: EjemploElegido | null
}

export async function armarElPdfDelArte(
  sesion: Sesion,
  { plantilla, documento, eleccion }: PedidoDelArte,
): Promise<Resultado<PdfDelArte>> {
  const leidos = await leerDatosParaElPdf(sesion, { origenId: plantilla.origenId, eleccion })
  if (!leidos.ok) {
    return leidos
  }
  if (leidos.data === null) {
    return fallo('no_encontrado', NO_ESTA_EL_VEHICULO)
  }
  const { datos, catalogo, logos, deDonde } = leidos.data
  const valores = valoresDelArte(datos, { sinMoneda: false, catalogo })
  const paginas = paginasConDatos(documento, valores, { catalogo, logos, datos, sinMoneda: false })
  const imagenes = await imagenesParaElPdf(imagenesDelPdf(paginas), { quien: sesion, ...deDonde })
  try {
    return ok(
      await pdfDelArte({
        paginas,
        medidas: { ancho: plantilla.ancho, alto: plantilla.alto },
        imagenes,
        titulo: plantilla.nombre,
        autor: datos.empresa.nombre,
      }),
    )
  } catch (error) {
    console.error('[pdf] No se pudo dibujar el arte.', error)
    return fallo('inesperado', MENSAJE_SIN_EL_PDF)
  }
}
