import type { NextRequest } from 'next/server'
import { RUTAS } from '@/shared/lib/rutas'
import { conElPanelDeOrigenes, deLaBusqueda, redireccionPermanente } from '../../con-parametros'

// Configuración › Catálogos › Colores ya no existe: es una tarjeta de «Para todos los orígenes», en Orígenes. Un 308 a su modal (`?panel=colores`) con el resto de la consulta; si la
// URL vieja traía su propio `?panel=` (el de un color), ése manda. No mira permisos: la página de Orígenes comprueba los suyos.
export function GET(peticion: NextRequest) {
  return redireccionPermanente(
    conElPanelDeOrigenes(RUTAS.origenes, 'colores', deLaBusqueda(peticion.nextUrl.searchParams)),
  )
}
