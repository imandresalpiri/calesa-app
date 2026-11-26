// Las pantallas que usan un archivo de `src/`: se siguen los imports hacia atrás hasta `src/app/`. Lo que llega al marco del layout
// `(app)` está en toda pantalla. Puro; se prueba en `e2e-afectados.test.ts`.
import { dirname, join, normalize } from 'node:path'

const IMPORTA = /(?:\bfrom\s*|\bimport\s*\(\s*|^\s*import\s+)(['"])([^'"\n]+)\1/gm
const EXTENSIONES = ['', '.ts', '.tsx', '.mjs', '.js', '/index.ts', '/index.tsx']

// El marco: lo que dibuja `src/app/(app)/layout.tsx` en toda pantalla con sesión.
export const esDelMarco = (archivo) =>
  /^src\/app\/(\(app\)\/(_shell\/|layout\.tsx$|template\.tsx$)|layout\.tsx$)/.test(archivo)

function resolver(origen, ruta, existe) {
  let base
  if (ruta.startsWith('@/')) base = `src/${ruta.slice(2)}`
  else if (ruta.startsWith('.')) base = normalize(join(dirname(origen), ruta))
  else return null
  for (const ext of EXTENSIONES) if (existe.has(base + ext)) return base + ext
  return null
}

/** Quién importa a quién, al revés: destino → los archivos que lo importan. `fuentes`: los archivos de `src/`. */
export function grafoInverso(fuentes, leer) {
  const existe = new Set(fuentes)
  const inverso = new Map()
  for (const origen of fuentes) {
    const texto = leer(origen) ?? ''
    for (const m of texto.matchAll(IMPORTA)) {
      const destino = m[2] ? resolver(origen, m[2], existe) : null
      if (!destino || destino === origen) continue
      if (!inverso.has(destino)) inverso.set(destino, new Set())
      inverso.get(destino).add(origen)
    }
  }
  return inverso
}

/**
 * La ruta de un archivo de `src/app/`: su primer segmento sin grupos (`(app)/vehiculos/[id]/x.tsx` → `vehiculos`); lo de la raíz de
 * `(app)` (y `_inicio/`) es `inicio`; si no, null.
 */
export function rutaDe(archivo) {
  const segmentos = archivo
    .replace(/^src\/app\//, '')
    .split('/')
    .slice(0, -1)
  const ruta = segmentos.find((s) => !/^[(_[]/.test(s))
  if (ruta) return ruta
  return /^src\/app\/\(app\)\/(_inicio\/|[^/]+$)/.test(archivo) ? 'inicio' : null
}

/**
 * Las pantallas que usan un archivo: las rutas de `src/app/` a las que llega por imports (él incluido), y si llega al marco (toda
 * pantalla). `app`: los archivos de `src/app/` alcanzados, para dar con la parte de la ruta (`[id]` es la ficha).
 */
export function pantallasQueUsan(archivo, inverso) {
  const vistos = new Set([archivo])
  const pendientes = [archivo]
  while (pendientes.length > 0) {
    const actual = pendientes.pop()
    for (const quien of inverso.get(actual) ?? []) {
      if (vistos.has(quien)) continue
      vistos.add(quien)
      pendientes.push(quien)
    }
  }
  const app = [...vistos].filter((a) => a.startsWith('src/app/'))
  const rutas = new Set(app.map(rutaDe).filter((r) => r !== null))
  return { rutas: [...rutas].sort(), todaPantalla: app.some(esDelMarco), app }
}

/**
 * La URL de la pantalla de un archivo de `src/app/`: su carpeta sin grupos `(x)` ni carpetas privadas `_x`
 * (`(app)/cotizaciones/[id]/_hoja/x.tsx` → `/cotizaciones/[id]`); `/` para la raíz.
 */
export function urlDe(archivo) {
  const segmentos = archivo
    .replace(/^src\/app\//, '')
    .split('/')
    .slice(0, -1)
    .filter((s) => !/^[(_]/.test(s))
  return `/${segmentos.join('/')}`
}

const escapar = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Cómo nombra un spec esa URL: entre comillas, con `${…}` o cualquier valor donde la ruta tiene `[id]`, y sin seguir con otro segmento. */
export function patronDeUrl(url) {
  const cuerpo = url
    .split('/')
    .map((s) => (/^\[.+\]$/.test(s) ? String.raw`(?:\$\{[^}]*\}|[^/'"\x60?#\s$]+)` : escapar(s)))
    .join('/')
  return new RegExp(String.raw`['"\x60]${cuerpo}(?=['"\x60?#\s)]|$)`)
}
