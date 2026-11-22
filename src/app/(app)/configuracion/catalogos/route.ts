import type { NextRequest } from 'next/server'
import { requerirSesion } from '@/modules/equipo'
import { conParametros, deLaBusqueda, redireccionPermanente } from '../con-parametros'
import { primerLugarDeLosCatalogos } from './primer-lugar'

// `/configuracion/catalogos` sin más: Catálogos ya no existe. Un 308 al primer lugar nuevo que la persona puede abrir (`primer-lugar.ts`), con su consulta; sin ninguno, al
// inicio de Configuración. El destino depende de los permisos: no se guarda en el navegador.
export async function GET(peticion: NextRequest) {
  const { permisos } = await requerirSesion()
  return redireccionPermanente(
    conParametros(primerLugarDeLosCatalogos(permisos), deLaBusqueda(peticion.nextUrl.searchParams)),
    { porPersona: true },
  )
}
