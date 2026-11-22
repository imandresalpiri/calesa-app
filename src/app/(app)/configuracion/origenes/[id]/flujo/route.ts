import type { NextRequest } from 'next/server'
import { rutaDeParteDelOrigen } from '@/shared/lib/rutas'
import { conParametros, deLaBusqueda, redireccionPermanente } from '../../../con-parametros'

// La pestaña Flujo de antes es Fases: un 308 con toda su consulta (`?fase=`, `?seccion=` del panel, `?vista=`).
export async function GET(
  peticion: NextRequest,
  { params }: RouteContext<'/configuracion/origenes/[id]/flujo'>,
) {
  const { id } = await params
  return redireccionPermanente(
    conParametros(
      rutaDeParteDelOrigen(id, 'fases'),
      deLaBusqueda(peticion.nextUrl.searchParams),
      [],
    ),
  )
}
