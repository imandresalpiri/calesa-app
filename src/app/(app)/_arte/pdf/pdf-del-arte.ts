// El PDF de un arte con los datos que se vuelven a leer con la sesión de quien pide: el documento (el que se ve en el editor, también sin guardar)
// resuelto página por página como en el lienzo (`paginasConDatos()`), los montos siempre con su moneda (también con el Modo Live: un PDF se
// manda), las imágenes leídas por su lector y el dibujo de `pdfDelArte()`. Devuelve los bytes y cuántas imágenes no llegaron (o la `regla` de una
// página con más texto que su tope). Desde el editor,
// con lo elegido como vehículo de ejemplo (`armarElPdfDelArte`: el vehículo que ya no se ve es `no_encontrado`, con su texto); desde una
// cotización, con la guardada que ya leyó su ruta (`armarElPdfDeLaCotizacion`: la que ya no se ve, `no_encontrado`).
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
import { fallo, type Resultado } from '@/shared/lib/errores'
import { NO_ESTA_EL_VEHICULO, NO_ESTA_LA_COTIZACION } from '../../artes/ejemplo/_respuestas'
import { leerDatosDeLaCotizacionParaElPdf } from './datos-de-la-cotizacion-para-el-pdf'
import { leerDatosParaElPdf, type DatosParaElPdf } from './datos-para-el-pdf'
import { imagenesParaElPdf } from './imagenes-para-el-pdf'

type Sesion = Awaited<ReturnType<typeof requerirSesion>>

type Dibujo = {
  plantilla: Pick<PlantillaDeArte, 'nombre' | 'ancho' | 'alto' | 'origenId'>
  documento: DocumentoDeArte
}

async function dibujarConLosDatos(
  sesion: Sesion,
  { plantilla, documento }: Dibujo,
  { datos, catalogo, logos, deDonde }: DatosParaElPdf,
): Promise<Resultado<PdfDelArte>> {
  const valores = valoresDelArte(datos, { sinMoneda: false, catalogo })
  const paginas = paginasConDatos(documento, valores, { catalogo, logos, datos, sinMoneda: false })
  const imagenes = await imagenesParaElPdf(imagenesDelPdf(paginas), { quien: sesion, ...deDonde })
  try {
    return await pdfDelArte({
      paginas,
      medidas: { ancho: plantilla.ancho, alto: plantilla.alto },
      imagenes,
      titulo: plantilla.nombre,
      autor: datos.empresa.nombre,
    })
  } catch (error) {
    console.error('[pdf] No se pudo dibujar el arte.', error)
    return fallo('inesperado', MENSAJE_SIN_EL_PDF)
  }
}

export async function armarElPdfDelArte(
  sesion: Sesion,
  { eleccion, ...dibujo }: Dibujo & { eleccion: EjemploElegido | null },
): Promise<Resultado<PdfDelArte>> {
  const leidos = await leerDatosParaElPdf(sesion, {
    origenId: dibujo.plantilla.origenId,
    eleccion,
  })
  if (!leidos.ok) {
    return leidos
  }
  return leidos.data === null
    ? fallo('no_encontrado', NO_ESTA_EL_VEHICULO)
    : dibujarConLosDatos(sesion, dibujo, leidos.data)
}

export async function armarElPdfDeLaCotizacion(
  sesion: Sesion,
  {
    lectura,
    ...dibujo
  }: Dibujo & { lectura: Parameters<typeof leerDatosDeLaCotizacionParaElPdf>[1] },
): Promise<Resultado<PdfDelArte>> {
  const leidos = await leerDatosDeLaCotizacionParaElPdf(sesion, lectura)
  if (!leidos.ok) {
    return leidos
  }
  return leidos.data === null
    ? fallo('no_encontrado', NO_ESTA_LA_COTIZACION)
    : dibujarConLosDatos(sesion, dibujo, leidos.data)
}
