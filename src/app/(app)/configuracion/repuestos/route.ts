import type { NextRequest } from 'next/server'
import { deLaBusqueda, redireccionPermanente } from '../con-parametros'
import { destinoDeLaUrlVieja } from './url-vieja'

// `/configuracion/repuestos` ya no tiene página: la configuración de los repuestos vive en Repuestos (`/repuestos/configuracion`). Un 308 a su pestaña, con la consulta que traía
// (`?seccion=`, `?panel=`…): `url-vieja.ts`. La página de destino comprueba `repuestos.configurar`. El destino no depende de quien pide: el navegador puede guardarlo.
export function GET(peticion: NextRequest) {
  return redireccionPermanente(destinoDeLaUrlVieja(deLaBusqueda(peticion.nextUrl.searchParams)))
}
