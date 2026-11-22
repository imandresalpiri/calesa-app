import type { NextRequest } from 'next/server'
import { deLaBusqueda, redireccionPermanente } from '../../../con-parametros'
import { destinoDeLasTablasViejas } from '../urls-viejas/tablas'

// La pestaña Tablas de antes: un 308 al drawer de las tablas sobre la Planilla, con `?tabla=` y el panel de la tabla en `accion`.
export async function GET(
  peticion: NextRequest,
  { params }: RouteContext<'/configuracion/origenes/[id]/tablas'>,
) {
  const { id } = await params
  return redireccionPermanente(
    destinoDeLasTablasViejas(id, deLaBusqueda(peticion.nextUrl.searchParams)),
  )
}
