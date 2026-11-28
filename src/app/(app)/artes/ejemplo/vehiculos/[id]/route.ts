import { connection } from 'next/server'
import { z } from 'zod'
import { requerirSesion } from '@/modules/equipo'
import { leerVehiculoDelArte } from '../../../../_arte/leer-vehiculo-del-arte'
import { rutaOcultaEnElLive } from '../../../../_live/guarda'
import { json, NO_ESTA_EL_VEHICULO, NO_SE_PUDO, texto } from '../../_respuestas'

// El vehículo de ejemplo elegido en el editor de artes: sus datos para el arte y sus leads de «Relacionados», sólo con el nombre
// (`leerVehiculoDelArte()`, con la sesión de quien pide y su Modo Live).
//
//   GET /artes/ejemplo/vehiculos/<id>?origen=<id>
//   200 application/json (`VehiculoDeEjemplo`) | 307 al ingreso | 404 text/plain | 500 text/plain
//
// 404 si no existe, está en la papelera, no se ve, es de otro origen que el de la plantilla o el Modo Live lo esconde. Sin las fotos o los
// ajustes de la empresa, 500.
const esquema = z.object({ id: z.guid(), origen: z.guid() })

export async function GET(
  peticion: Request,
  { params }: RouteContext<'/artes/ejemplo/vehiculos/[id]'>,
) {
  await connection()
  const sesion = await requerirSesion()
  if (await rutaOcultaEnElLive('cotizaciones')) {
    return texto(NO_ESTA_EL_VEHICULO, 404)
  }
  const pedido = esquema.safeParse({
    id: (await params).id,
    origen: new URL(peticion.url).searchParams.get('origen'),
  })
  if (!pedido.success) {
    return texto(NO_ESTA_EL_VEHICULO, 404)
  }
  const leido = await leerVehiculoDelArte(sesion, pedido.data)
  if (!leido.ok) {
    return texto(NO_SE_PUDO, 500)
  }
  return leido.data === null ? texto(NO_ESTA_EL_VEHICULO, 404) : json(leido.data.respuesta)
}
