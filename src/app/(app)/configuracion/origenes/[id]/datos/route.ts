import type { NextRequest } from 'next/server'
import { deLaBusqueda } from '../../../con-parametros'
import { redirigirAlEntrar } from '../entrada'

// La pestaña Datos de antes: los datos van en un drawer (`?panel=datos`) sobre la pestaña de entrada de la persona, con su consulta.
export async function GET(
  peticion: NextRequest,
  { params }: RouteContext<'/configuracion/origenes/[id]/datos'>,
) {
  return redirigirAlEntrar((await params).id, {
    ...deLaBusqueda(peticion.nextUrl.searchParams),
    seccion: 'datos',
  })
}
