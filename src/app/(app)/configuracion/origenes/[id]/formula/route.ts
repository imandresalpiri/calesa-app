import type { NextRequest } from 'next/server'
import { deLaBusqueda, redireccionPermanente } from '../../../con-parametros'
import { destinoSinFormula } from '../urls-viejas/formula'

// La ruta corta `/configuracion/origenes/[id]/formula` (de cuando un origen tenía una sola fórmula): un 308 a la pestaña Planilla sin `?formula=` (la de
// trabajo es la de por defecto), con su consulta.
export async function GET(
  peticion: NextRequest,
  { params }: RouteContext<'/configuracion/origenes/[id]/formula'>,
) {
  return redireccionPermanente(
    destinoSinFormula((await params).id, 'planilla', deLaBusqueda(peticion.nextUrl.searchParams)),
  )
}
