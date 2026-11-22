import { notFound } from 'next/navigation'
import type { NextRequest } from 'next/server'
import { esParteDeLaFormula } from '@/shared/lib/rutas'
import { deLaBusqueda, redireccionPermanente } from '../../../../../con-parametros'
import { destinoDeLaFormulaVieja } from '../../../urls-viejas/formula'

// Una parte del editor de una fórmula de antes (`…/formulas/<f>/planilla|hoja|tarjeta`): un 308 a esa pestaña con la fórmula elegida y su consulta (`?fila=`,
// `?vista=`, `?lugar=`, `?referencia=`, `?panel=`, `?version=`). Otra parte no existe.
export async function GET(
  peticion: NextRequest,
  { params }: RouteContext<'/configuracion/origenes/[id]/formulas/[formula]/[parte]'>,
) {
  const { id, formula, parte } = await params
  if (!esParteDeLaFormula(parte)) {
    notFound()
  }
  return redireccionPermanente(
    destinoDeLaFormulaVieja(id, formula, parte, deLaBusqueda(peticion.nextUrl.searchParams)),
  )
}
