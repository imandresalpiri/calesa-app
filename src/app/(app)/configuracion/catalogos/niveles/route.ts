import type { NextRequest } from 'next/server'
import { conElBloqueDeRoles, deLaBusqueda, redireccionPermanente } from '../../con-parametros'

// Configuración › Catálogos › Niveles ya no existe: los niveles de acceso se gestionan en la matriz de Roles, en el bloque «Cotizaciones». Un 308 a ese
// bloque (`?bloque=cotizaciones`) con el resto de la consulta (`?panel=nuevo-nivel`, `renombrar-nivel&nivel=<id>`…). No mira permisos: la página de Roles comprueba los suyos.
export function GET(peticion: NextRequest) {
  return redireccionPermanente(conElBloqueDeRoles(deLaBusqueda(peticion.nextUrl.searchParams)))
}
