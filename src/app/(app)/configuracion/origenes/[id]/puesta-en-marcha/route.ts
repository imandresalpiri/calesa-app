import { notFound, redirect } from 'next/navigation'
import { connection } from 'next/server'
import { pasoPendiente } from '@/modules/origenes'
import { rutaDeLaPuestaEnMarcha } from '@/shared/lib/rutas'
import { abrirLaPuestaEnMarcha } from './abrir'
import { rutaOcultaEnElLive } from '../../../../_live/guarda'

// `/configuracion/origenes/<id>/puesta-en-marcha`: un 307 al primer paso que falta y la persona puede hacer, o a «Listo» (`pasoPendiente()`). Temporal:
// el destino cambia con lo que se hace. Quien no abre el origen recibe el 404.
export async function GET(
  _peticion: Request,
  { params }: RouteContext<'/configuracion/origenes/[id]/puesta-en-marcha'>,
) {
  await connection()
  if (await rutaOcultaEnElLive('siempre-oculto')) {
    notFound()
  }
  const { id } = await params
  const abierta = await abrirLaPuestaEnMarcha(id)
  if (abierta.tipo !== 'abierto') {
    notFound()
  }
  redirect(rutaDeLaPuestaEnMarcha(id, pasoPendiente(abierta.estado)))
}
