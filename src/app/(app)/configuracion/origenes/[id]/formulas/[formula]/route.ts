import type { NextRequest } from 'next/server'
import { deLaBusqueda, redireccionPermanente } from '../../../../con-parametros'
import { destinoDeLaFormulaVieja } from '../../urls-viejas/formula'

// El editor de una fórmula de antes, sin parte: un 308 a la Planilla con esa fórmula elegida y su consulta.
export async function GET(
  peticion: NextRequest,
  { params }: RouteContext<'/configuracion/origenes/[id]/formulas/[formula]'>,
) {
  const { id, formula } = await params
  return redireccionPermanente(
    destinoDeLaFormulaVieja(id, formula, 'planilla', deLaBusqueda(peticion.nextUrl.searchParams)),
  )
}
