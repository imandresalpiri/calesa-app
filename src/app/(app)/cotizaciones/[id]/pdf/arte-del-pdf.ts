// Con qué plantilla de arte sale el PDF de una cotización: la de `?plantilla=` si es un guid, quien pide la ve, es del origen de la cotización
// y de PDF; sin el parámetro, la por defecto de PDF del origen (`leerArteParaCompartir()`, la misma regla que «Compartir»). Cualquier otro caso
// (un parámetro inválido o de otro origen, sin por defecto, una plantilla borrada o cuyo documento ya no se lee, un error al leer cuál) es
// `null`: sale el PDF de hoy, sin cambios. Con plantilla, el PDF del arte con los datos reales de la guardada (`armarElPdfDeLaCotizacion()`) o
// su fallo, que la ruta no tapa con el PDF de hoy.
import 'server-only'
import { z } from 'zod'
import {
  leerArteParaCompartir,
  leerPlantillaParaEditar,
  tipoDelFormato,
  type PdfDelArte,
} from '@/modules/artes'
import type { requerirSesion } from '@/modules/equipo'
import type { Resultado } from '@/shared/lib/errores'
import { armarElPdfDeLaCotizacion } from '../../../_arte/pdf/pdf-del-arte'

type Sesion = Awaited<ReturnType<typeof requerirSesion>>

type LaGuardada = Parameters<typeof armarElPdfDeLaCotizacion>[1]['lectura']

// Qué PDF salió: el id de la plantilla de arte o `de-hoy` (lo miran los e2e).
export const CABECERA_DEL_ARTE = 'X-Pdf-Arte'

export type PdfConArte = { plantillaId: string; pdf: Resultado<PdfDelArte> }

async function laPlantillaElegida(origenId: string, pedida: string | null): Promise<string | null> {
  if (pedida !== null) {
    return z.guid().safeParse(pedida).success ? pedida : null
  }
  const porDefecto = await leerArteParaCompartir(origenId, 'pdf')
  return porDefecto.ok && porDefecto.data.tipo === 'plantilla' ? porDefecto.data.plantillaId : null
}

export async function pdfConElArte(
  sesion: Sesion,
  lectura: LaGuardada,
  pedida: string | null,
): Promise<PdfConArte | null> {
  const { origenId } = lectura.hoja.cotizacion
  const id = await laPlantillaElegida(origenId, pedida)
  if (id === null) {
    return null
  }
  const leida = await leerPlantillaParaEditar(id)
  const plantilla = leida.ok ? leida.data : null
  if (
    plantilla === null ||
    plantilla.origenId !== origenId ||
    tipoDelFormato(plantilla.formato) !== 'pdf' ||
    !plantilla.documento.ok
  ) {
    return null
  }
  const documento = plantilla.documento.data
  return {
    plantillaId: plantilla.id,
    pdf: await armarElPdfDeLaCotizacion(sesion, { plantilla, documento, lectura }),
  }
}
