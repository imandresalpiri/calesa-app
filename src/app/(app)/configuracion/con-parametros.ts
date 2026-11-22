// Los parámetros de una página de Configuración tal como los entrega Next (`searchParams`).
export type ParametrosDeLaUrl = Record<string, string | string[] | undefined>

// La ruta con los parámetros de la URL vieja que siguen valiendo: todos menos `seccion`, que era la pestaña y ahora es la ruta. Los
// `?panel=` (con lo que cada uno lleva: `puerto`, `valor`, `tramo`…) siguen abriendo lo suyo en la sub-ruta nueva. Un parámetro repetido
// se conserva repetido; sin parámetros, la ruta sola (si ya trae consulta, se suman a ella). `quitar` cambia cuáles no siguen (los de Flujos, donde `seccion` sigue siendo la del panel).
export function conParametros(
  ruta: string,
  parametros: ParametrosDeLaUrl,
  quitar: readonly string[] = ['seccion'],
): string {
  const conservados = new URLSearchParams()
  for (const [nombre, valor] of Object.entries(parametros)) {
    if (quitar.includes(nombre) || valor === undefined) {
      continue
    }
    for (const uno of Array.isArray(valor) ? valor : [valor]) {
      conservados.append(nombre, uno)
    }
  }
  const busqueda = conservados.toString()
  return busqueda === '' ? ruta : `${ruta}${ruta.includes('?') ? '&' : '?'}${busqueda}`
}

// La consulta de un `route.ts` (`peticion.nextUrl.searchParams`) como los `searchParams` de una página: un parámetro repetido, en arreglo.
export function deLaBusqueda(busqueda: URLSearchParams): ParametrosDeLaUrl {
  const parametros: Record<string, string | string[]> = {}
  for (const nombre of new Set(busqueda.keys())) {
    const valores = busqueda.getAll(nombre)
    parametros[nombre] = valores.length === 1 ? (valores[0] ?? '') : valores
  }
  return parametros
}

// La respuesta de un `route.ts` que sólo redirige: un 308 (permanente, y el navegador repite el método) con la ruta relativa en `Location`,
// con su consulta. Una página que redirige tras su `loading.tsx` no da un 308: lo da el servidor, aquí o en `next.config.ts`. Con
// `porPersona` (el destino sale de los permisos de quien pide), `Cache-Control: private, no-store`: el navegador guarda un 308 y, si no,
// lo repetiría aunque cambien sus permisos.
export function redireccionPermanente(destino: string, { porPersona = false } = {}): Response {
  const headers: Record<string, string> = { Location: destino }
  if (porPersona) {
    headers['Cache-Control'] = 'private, no-store'
  }
  return new Response(null, { status: 308, headers })
}

// La ruta de Orígenes con el modal de «Para todos los orígenes» que abre una URL vieja de Colores o de Vigencia: `?panel=<panel>` y el resto de la consulta de la
// URL vieja. Si ya traía su propio `?panel=` (`nuevo-tono`, `editar-tono&tono=<id>`, `eliminar-tono&tono=<id>`), ése manda: un solo `panel`. Sin `seccion` ni `origen`.
export function conElPanelDeOrigenes(
  ruta: string,
  panel: string,
  parametros: ParametrosDeLaUrl,
): string {
  const propio = Array.isArray(parametros['panel']) ? parametros['panel'][0] : parametros['panel']
  const resto = Object.fromEntries(
    Object.entries(parametros).filter(([nombre]) => nombre !== 'panel'),
  )
  // El `panel` va primero, como lo escribe la app al abrir un modal; si traía el suyo, ése.
  return conParametros(ruta, {
    panel: propio === undefined || propio === '' ? panel : propio,
    ...resto,
  })
}
