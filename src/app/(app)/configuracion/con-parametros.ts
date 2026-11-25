// Los parámetros de una página de Configuración tal como los entrega Next (`searchParams`).
export type ParametrosDeLaUrl = Record<string, string | string[] | undefined>

// La ruta con los parámetros de la consulta, salvo los de `quitar`: los `?panel=` (con lo que cada uno lleva: `puerto`, `valor`, `tramo`…) abren lo suyo en
// el destino. Un parámetro repetido se conserva repetido; sin parámetros, la ruta sola (si ya trae consulta, se suman a ella).
export function conParametros(
  ruta: string,
  parametros: ParametrosDeLaUrl,
  quitar: readonly string[] = [],
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

// La respuesta de un `route.ts` que sólo lleva a otra página (una redirección estructural: `scripts/guardas/sin-redirecciones.ts`): un 308 (permanente, y el
// navegador repite el método) con la ruta relativa en `Location`, con su consulta. Una página que redirige tras su `loading.tsx` no da un 308: lo da el servidor. Con
// `porPersona` (el destino sale de los permisos de quien pide), `Cache-Control: private, no-store`: el navegador guarda un 308 y, si no,
// lo repetiría aunque cambien sus permisos.
export function redireccionPermanente(destino: string, { porPersona = false } = {}): Response {
  const headers: Record<string, string> = { Location: destino }
  if (porPersona) {
    headers['Cache-Control'] = 'private, no-store'
  }
  return new Response(null, { status: 308, headers })
}
