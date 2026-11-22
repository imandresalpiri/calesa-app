import type { NextRequest } from 'next/server'
import { deLaBusqueda } from '../../con-parametros'
import { redirigirAlEntrar } from './entrada'

// `/configuracion/origenes/<id>` sin pestaña: un 308 a la última que la persona abrió en este origen (o a la de `?seccion=`), con su consulta
// (`urls-viejas/pestana.ts`).
export async function GET(
  peticion: NextRequest,
  { params }: RouteContext<'/configuracion/origenes/[id]'>,
) {
  return redirigirAlEntrar((await params).id, deLaBusqueda(peticion.nextUrl.searchParams))
}
