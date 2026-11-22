import type { NextRequest } from 'next/server'
import { requerirSesion } from '@/modules/equipo'
import { getOrigenes } from '@/modules/origenes'
import { deLaBusqueda, redireccionPermanente } from '../con-parametros'
import { destinoDeLaUrlVieja } from './url-vieja'

// `/configuracion/flujos` ya no tiene página: un 308 al flujo que pedía (la pestaña Fases de un origen, el flujo de repuestos o Tipos de
// documento), con sus parámetros (`url-vieja.ts`). La página de destino comprueba el permiso. El destino puede depender de los permisos: no
// se guarda en el navegador.
export async function GET(peticion: NextRequest) {
  const { permisos } = await requerirSesion()
  const parametros = deLaBusqueda(peticion.nextUrl.searchParams)
  // Sólo hace falta sin origen. Si no se leen, se sigue sin ellos (al de repuestos o a Tipos de documento): mejor que un error.
  const leidos = parametros['origen'] === undefined ? await getOrigenes(true) : null
  const origenes = leidos?.ok ? leidos.data : []
  return redireccionPermanente(destinoDeLaUrlVieja(parametros, permisos, origenes), {
    porPersona: true,
  })
}
