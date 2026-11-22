import { NextResponse, type NextRequest } from 'next/server'
import { decidirAcceso } from '@/shared/lib/rutas'
import {
  destinoConLaFormulaDelPanel,
  destinoSinLaEdicion,
  destinoSinLosPanelesQueYaNoExisten,
} from '@/shared/lib/paneles-que-ya-no-existen'
import { actualizarSesion } from '@/shared/lib/supabase/proxy'

// Next 16: `proxy.ts` (antes `middleware.ts`) va al nivel de `app/`, no adentro.
// En cada request: refresca la sesión y decide si la persona pasa (`decidirAcceso`): sin sesión,
// lo protegido va a /ingreso con `returnTo`; con sesión, /ingreso y /registro van al inicio.
// Es la primera barrera; las pantallas vuelven a pedir la sesión (`requerirSesion`) y la base
// decide con RLS.
export async function proxy(request: NextRequest) {
  const { respuesta, usuarioId } = await actualizarSesion(request)

  // `_rsc` lo agrega el router de Next a sus pedidos internos: no es parte de a dónde iba.
  const busqueda = new URLSearchParams(request.nextUrl.search)
  busqueda.delete('_rsc')
  const query = busqueda.toString()

  const decision = decidirAcceso({
    ruta: request.nextUrl.pathname,
    busqueda: query ? `?${query}` : '',
    haySesion: usuarioId !== null,
    esAccion: request.headers.has('next-action'),
  })
  if (decision.tipo === 'seguir') {
    // El Modo avanzado, «Empezar desde una plantilla» y la edición a pantalla completa (`?editar=si`) ya no existen, y un panel de una fórmula nombra la suya
    // en `&cual=`: 308 a la misma ruta, sin ellos o traducida (una action sigue: repetiría el POST).
    const sinElPanel = request.headers.has('next-action')
      ? null
      : (destinoSinLosPanelesQueYaNoExisten(request.nextUrl.pathname, busqueda) ??
        destinoSinLaEdicion(request.nextUrl.pathname, busqueda) ??
        destinoConLaFormulaDelPanel(request.nextUrl.pathname, busqueda))
    if (sinElPanel !== null) {
      return conLasCookies(
        NextResponse.redirect(new URL(sinElPanel, request.nextUrl.origin), 308),
        respuesta,
      )
    }
    return esElInventarioViejo(request.nextUrl.pathname, busqueda)
      ? conLasCookies(
          NextResponse.rewrite(new URL(`${INVENTARIO_VIEJO}?${query}`, request.nextUrl.origin)),
          respuesta,
        )
      : respuesta
  }
  return conLasCookies(
    NextResponse.redirect(new URL(decision.destino, request.nextUrl.origin)),
    respuesta,
  )
}

// El inventario con el filtro «Situación» de antes (`?situacion=`) cambió para siempre: lo atiende la ruta que lo traduce y responde 308. Desde
// `page.tsx` saldría 200 (la página redirige ya mandado su esqueleto) y el proxy no conoce los filtros de `vehiculos`.
const INVENTARIO_VIEJO = '/vehiculos/enlace-viejo'

function esElInventarioViejo(ruta: string, busqueda: URLSearchParams): boolean {
  return ruta === '/vehiculos' && busqueda.has('situacion')
}

// Si la sesión se refrescó en este request, las cookies nuevas viajan con la respuesta.
function conLasCookies(salida: NextResponse, respuesta: NextResponse): NextResponse {
  for (const cookie of respuesta.cookies.getAll()) {
    salida.cookies.set(cookie)
  }
  return salida
}

export const config = {
  // Todo menos lo que siempre es público: los estáticos de Next, el service worker, el manifest
  // y los íconos. Las pantallas de acceso y `/auth/*` pasan por acá y las deja seguir la regla.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|apple-touch-icon.png|sw.js|manifest.webmanifest|iconos/).*)',
  ],
}
