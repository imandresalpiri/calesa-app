import { z } from 'zod'
import {
  leerVehiculoDeLaCotizacion,
  TOPE_DE_FOTOS_PARA_COMPARTIR,
  type FotoParaCompartir,
} from '@/modules/cotizaciones'
import { requerirSesion } from '@/modules/equipo'
import { leerGaleria } from '@/modules/vehiculos'
import { urlPublica } from '@/shared/lib/almacen'
import { rutaOcultaEnElLive } from '../../../../_live/guarda'

// Las fotos del vehículo de una cotización para «Compartir la cotización» (pestaña «Imagen › Fotos»): a lo sumo las 24 del vehículo, cada una con su miniatura de 480 px
// (la grilla) y su completa de hasta 1.600 px (lo que se comparte), del bucket público `vehiculos`. Con la sesión de quien pide: la cotización y el vehículo, por la RLS.
// Se pide al elegir «Fotos», nunca con el documento.
//
//   GET /cotizaciones/<id>/compartir/fotos
//   200 application/json `{ fotos }` (vacío si no hay vehículo o no se ve) | 307 al ingreso | 500 text/plain
const SIN_GUARDAR = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' }
const NO_SE_PUDO = 'No se pudieron leer las fotos.'

const fotos = (lista: FotoParaCompartir[]) =>
  Response.json({ fotos: lista }, { headers: SIN_GUARDAR })

const fallo = () =>
  new Response(NO_SE_PUDO, {
    status: 500,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', ...SIN_GUARDAR },
  })

export async function GET(
  _peticion: Request,
  { params }: RouteContext<'/cotizaciones/[id]/compartir/fotos'>,
) {
  await requerirSesion()
  if (await rutaOcultaEnElLive('cotizaciones')) {
    return fotos([])
  }
  const { id } = await params
  if (!z.guid().safeParse(id).success) {
    return fotos([])
  }
  const vehiculo = await leerVehiculoDeLaCotizacion(id)
  if (!vehiculo.ok) {
    return fallo()
  }
  if (vehiculo.data === null) {
    return fotos([])
  }
  // `vehiculos_imagenes` por `vehiculo_id` (su índice); la base no deja más de 24 por vehículo.
  const galeria = await leerGaleria(vehiculo.data)
  if (!galeria.ok) {
    return fallo()
  }
  return fotos(
    galeria.data.fotos.slice(0, TOPE_DE_FOTOS_PARA_COMPARTIR).map((foto) => ({
      id: foto.id,
      miniatura: urlPublica('vehiculos', foto.rutaMiniatura),
      completa: urlPublica('vehiculos', foto.ruta),
    })),
  )
}
