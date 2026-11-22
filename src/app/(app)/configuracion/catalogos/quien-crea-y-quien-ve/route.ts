import type { NextRequest } from 'next/server'
import { conElBloqueDeRoles, deLaBusqueda, redireccionPermanente } from '../../con-parametros'

// Configuración › Catálogos › Quién crea y quién ve ya no existe: es el resumen plegable del bloque «Cotizaciones» de la matriz de Roles. Un 308 a ese bloque
// (`?bloque=cotizaciones`) con el resto de la consulta; con `?origen=<id>` el resumen llega desplegado y con ese origen elegido. No mira permisos: la página de
// Roles comprueba los suyos.
export function GET(peticion: NextRequest) {
  return redireccionPermanente(conElBloqueDeRoles(deLaBusqueda(peticion.nextUrl.searchParams)))
}
