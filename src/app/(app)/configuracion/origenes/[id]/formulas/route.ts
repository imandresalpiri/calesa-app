import type { NextRequest } from 'next/server'
import { deLaBusqueda, redireccionPermanente } from '../../../con-parametros'
import { destinoSinFormula } from '../urls-viejas/formula'

// La lista de las fórmulas de antes: está en el selector de la barra de la fórmula, sobre la Planilla. Un 308 con sus paneles (`?panel=nueva-formula&copia=`,
// los de una fórmula con `&cual=`).
export async function GET(
  peticion: NextRequest,
  { params }: RouteContext<'/configuracion/origenes/[id]/formulas'>,
) {
  const { id } = await params
  return redireccionPermanente(
    destinoSinFormula(id, 'planilla', deLaBusqueda(peticion.nextUrl.searchParams)),
  )
}
