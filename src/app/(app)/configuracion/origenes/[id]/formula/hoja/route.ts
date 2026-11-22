import type { NextRequest } from 'next/server'
import { deLaBusqueda, redireccionPermanente } from '../../../../con-parametros'
import { destinoSinFormula } from '../../urls-viejas/formula'

// La ruta corta `/configuracion/origenes/[id]/formula/hoja` (de cuando un origen tenía una sola fórmula): un 308 a la pestaña Hoja sin `?formula=` (la de
// trabajo es la de por defecto), con su consulta.
export async function GET(
  peticion: NextRequest,
  { params }: RouteContext<'/configuracion/origenes/[id]/formula/hoja'>,
) {
  return redireccionPermanente(
    destinoSinFormula((await params).id, 'hoja', deLaBusqueda(peticion.nextUrl.searchParams)),
  )
}
