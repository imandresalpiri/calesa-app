// Los specs de presupuesto (JS en frío, nodos del DOM) de las pantallas que una rama toca: entran siempre en `e2e-afectados.mjs`, sin
// contar para el tope. Pura; se prueba en `e2e-afectados.test.ts`.
import { patronDeUrl, urlDe } from './pantallas.mjs'

// Un spec que mide el JS en frío o los nodos del DOM de una pantalla, y el que recorre la tabla de JS por ruta.
const MIDE_PRESUPUESTO =
  /soporte\/(?:presupuestos|js-en-frio)\b|querySelectorAll\(\s*['"`]\*['"`]\s*\)\.length/
const USA_LA_TABLA_DE_JS = /\bPRESUPUESTO_DE_JS_EN_KB\b/

const sinNombres = (url) => url.replace(/\[[^\]]+\]/g, '[]')

/**
 * Los specs que miden el presupuesto de una pantalla tocada. Una pantalla es la URL de su carpeta en `src/app/`; el spec la nombra, o
 * es el de la tabla de JS por ruta (`e2e/soporte/presupuestos.ts`) y la tabla la lista. Un archivo que llega a toda pantalla (el marco,
 * o más rutas de las que un barril deja saber) sólo mueve al spec de la tabla.
 *
 * @param {{ specs: string[], leer: (a: string) => string | null, archivosDeSrc: string[],
 *   alcanceDe: (a: string) => { todaPantalla: boolean, app: string[] } }} o
 * @returns {{ spec: string, razon: string }[]}
 */
export function presupuestosDeLasPantallas({ specs, leer, archivosDeSrc, alcanceDe }) {
  const miden = specs.filter((s) => MIDE_PRESUPUESTO.test(leer(s) ?? ''))
  if (miden.length === 0) return []
  const tocadas = new Map() // url → archivo de src/ por el que se llega
  let marco = null
  for (const archivo of archivosDeSrc) {
    const alcance = alcanceDe(archivo)
    if (alcance.todaPantalla) marco ??= archivo
    else for (const a of alcance.app) if (urlDe(a) !== '/') tocadas.set(urlDe(a), archivo)
  }
  const tabla = leer('e2e/soporte/presupuestos.ts') ?? ''
  const clavesDeLaTabla = new Set(
    [...tabla.matchAll(/^\s*'(\/[^']*)':/gm)].map((m) => sinNombres(m[1] ?? '')),
  )
  const encontrados = []
  for (const spec of miden) {
    const texto = leer(spec) ?? ''
    const porTabla = USA_LA_TABLA_DE_JS.test(texto)
    let razon = marco && porTabla ? `toda pantalla: ${marco}` : null
    for (const [url, archivo] of razon ? [] : tocadas) {
      if (porTabla ? clavesDeLaTabla.has(sinNombres(url)) : patronDeUrl(url).test(texto)) {
        razon = `${url} (${archivo})`
        break
      }
    }
    if (razon) encontrados.push({ spec, razon })
  }
  return encontrados
}
