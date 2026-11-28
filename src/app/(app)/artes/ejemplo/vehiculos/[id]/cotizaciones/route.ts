import { connection } from 'next/server'
import { z } from 'zod'
import type { CotizacionesDeEjemplo } from '@/modules/artes'
import { filasALaVista, leerPaginaDeEsteVehiculo, tituloDeLaFila } from '@/modules/cotizaciones'
import { requerirSesion } from '@/modules/equipo'
import { leerVehiculo } from '@/modules/vehiculos'
import { leerCursor } from '@/shared/lib/paginacion'
import { origenOcultoEnElLive, rutaOcultaEnElLive } from '../../../../../_live/guarda'
import { json, NO_ESTA_EL_VEHICULO, NO_SE_PUDO, texto } from '../../../_respuestas'

// Las cotizaciones del vehículo de ejemplo para elegir la del arte: las que quien pide ve («De este vehículo»: la aprobada primero, luego lo más
// nuevo), de a `TAMANO_DE_ESTE_VEHICULO`, con la sesión de quien pide (la RLS decide, también las privadas). El total y su moneda, para `<Monto>`.
//
//   GET /artes/ejemplo/vehiculos/<id>/cotizaciones?cursor=<siguiente>
//   200 application/json (`CotizacionesDeEjemplo`) | 307 al ingreso | 404 text/plain | 500 text/plain
//
// 404 si el vehículo no existe, está en la papelera, no se ve o el Modo Live lo esconde. La aprobada va sólo en la primera página (un cursor que no
// se lee, o hacia atrás, es la primera): en las siguientes no se repite.
export async function GET(
  peticion: Request,
  { params }: RouteContext<'/artes/ejemplo/vehiculos/[id]/cotizaciones'>,
) {
  await connection()
  await requerirSesion()
  if (await rutaOcultaEnElLive('cotizaciones')) {
    return texto(NO_ESTA_EL_VEHICULO, 404)
  }
  const { id } = await params
  if (!z.guid().safeParse(id).success) {
    return texto(NO_ESTA_EL_VEHICULO, 404)
  }
  const leido = await leerVehiculo(id)
  if (!leido.ok) {
    return texto(NO_SE_PUDO, 500)
  }
  const vehiculo = leido.data
  if (vehiculo === null || (await origenOcultoEnElLive(vehiculo.origenId))) {
    return texto(NO_ESTA_EL_VEHICULO, 404)
  }
  const cursor = new URL(peticion.url).searchParams.get('cursor')
  const pagina = await leerPaginaDeEsteVehiculo({ vehiculoId: id, cursor })
  if (!pagina.ok) {
    return pagina.error.codigo === 'sin_permiso'
      ? texto(NO_ESTA_EL_VEHICULO, 404)
      : texto(NO_SE_PUDO, 500)
  }
  const primera = leerCursor(cursor)?.sentido !== 'siguiente'
  const filas = primera
    ? filasALaVista(pagina.data)
    : pagina.data.filas.filter((fila) => !fila.aprobada)
  const respuesta: CotizacionesDeEjemplo = {
    filas: filas.map((fila) => ({
      id: fila.id,
      numero: fila.numero,
      titulo: tituloDeLaFila(fila, vehiculo.titulo),
      total: fila.totalBase,
      moneda: fila.monedaMostrar,
      modo: fila.modo,
      aprobada: fila.aprobada,
    })),
    siguiente: pagina.data.siguiente,
  }
  return json(respuesta)
}
