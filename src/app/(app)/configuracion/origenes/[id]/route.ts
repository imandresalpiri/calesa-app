import { connection, type NextRequest } from 'next/server'
import { deLaBusqueda } from '../../con-parametros'
import { redirigirAlEntrar } from './entrada'
import { rutaOcultaEnElLive } from '../../../_live/guarda'

// `/configuracion/origenes/<id>` sin pestaña: un 308 a la última que la persona abrió en este origen, con su consulta (`pestana-de-entrada.ts`).
export async function GET(
  peticion: NextRequest,
  { params }: RouteContext<'/configuracion/origenes/[id]'>,
) {
  await connection()
  if (await rutaOcultaEnElLive('origenes.lectura')) {
    return new Response(null, { status: 404 })
  }
  return redirigirAlEntrar((await params).id, deLaBusqueda(peticion.nextUrl.searchParams))
}
