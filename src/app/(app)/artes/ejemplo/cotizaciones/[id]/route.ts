import { connection } from 'next/server'
import { z } from 'zod'
import { requerirSesion } from '@/modules/equipo'
import { leerCotizacionDelArte } from '../../../../_arte/leer-cotizacion-del-arte'
import { rutaOcultaEnElLive } from '../../../../_live/guarda'
import { json, NO_ESTA_LA_COTIZACION, NO_SE_PUDO, texto } from '../../_respuestas'

// La cotización elegida para el arte y su lead, para elegirlo de entrada (`leerCotizacionDelArte()`, con la sesión de quien pide y su Modo
// Live).
//
//   GET /artes/ejemplo/cotizaciones/<id>
//   200 application/json (`CotizacionDeEjemplo`) | 307 al ingreso | 404 text/plain | 500 text/plain
//
// Lo que no existe, está en la papelera, no se ve o el Modo Live esconde es el mismo 404 que el PDF, nunca 403.
export async function GET(
  _peticion: Request,
  { params }: RouteContext<'/artes/ejemplo/cotizaciones/[id]'>,
) {
  await connection()
  const sesion = await requerirSesion()
  if (await rutaOcultaEnElLive('cotizaciones')) {
    return texto(NO_ESTA_LA_COTIZACION, 404)
  }
  const { id } = await params
  if (!z.guid().safeParse(id).success) {
    return texto(NO_ESTA_LA_COTIZACION, 404)
  }
  const leida = await leerCotizacionDelArte(sesion, id)
  if (!leida.ok) {
    return texto(NO_SE_PUDO, 500)
  }
  return leida.data === null ? texto(NO_ESTA_LA_COTIZACION, 404) : json(leida.data.respuesta)
}
