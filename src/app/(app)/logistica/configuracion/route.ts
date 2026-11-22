import type { NextRequest } from 'next/server'
import { requerirSesion } from '@/modules/equipo'
import { RUTAS } from '@/shared/lib/rutas'
import {
  conParametros,
  deLaBusqueda,
  redireccionPermanente,
} from '../../configuracion/con-parametros'
import { primeraPestanaAbierta } from './pestanas'

// `/logistica/configuracion` no tiene página: un 308 a la primera pestaña que la persona puede abrir, con su consulta. Sin ninguna, a la primera: la página dice «No tienes permiso».
// El destino depende de los permisos: no se guarda en el navegador.
export async function GET(peticion: NextRequest) {
  const { permisos } = await requerirSesion()
  const destino = primeraPestanaAbierta(permisos) ?? RUTAS.puertosDeLogistica
  return redireccionPermanente(
    conParametros(destino, deLaBusqueda(peticion.nextUrl.searchParams)),
    { porPersona: true },
  )
}
