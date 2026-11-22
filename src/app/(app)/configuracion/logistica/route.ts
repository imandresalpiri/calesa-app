import type { NextRequest } from 'next/server'
import { requerirSesion } from '@/modules/equipo'
import {
  PESTANAS_DE_LA_CONFIGURACION,
  puedeAbrirLaPestana,
} from '../../logistica/configuracion/pestanas'
import { RUTAS } from '@/shared/lib/rutas'
import { deLaBusqueda, redireccionPermanente } from '../con-parametros'
import { destinoDeLaUrlVieja } from './url-vieja'

// `/configuracion/logistica` ya no tiene página: un 308 a la pestaña de `?seccion=` (o a la primera que la persona abre) de Logística › Configuración, con sus `?panel=`
// (`url-vieja.ts`). Sin ninguna que abrir, el inicio de Configuración. El destino depende de los permisos: no se guarda en el navegador.
export async function GET(peticion: NextRequest) {
  const { permisos } = await requerirSesion()
  const abiertas = PESTANAS_DE_LA_CONFIGURACION.filter((pestana) =>
    puedeAbrirLaPestana(pestana, permisos),
  )
  const destino =
    destinoDeLaUrlVieja(deLaBusqueda(peticion.nextUrl.searchParams), abiertas) ??
    RUTAS.inicioDeConfiguracion
  return redireccionPermanente(destino, { porPersona: true })
}
