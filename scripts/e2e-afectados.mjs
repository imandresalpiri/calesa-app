// Los e2e que un cambio puede romper aunque no sean de su módulo, para correrlos en local antes de publicar (Nivel 1, la skill
// `entregar`): que el CI no sea donde aparecen. Junta, contra la base del merge con `main`:
//   1. los dirigidos de siempre (`e2e-dirigidos.mjs`), aunque el CI vaya a correr el completo;
//   2. los specs que nombran un texto visible que el diff agrega, quita o cambia en `src/` (etiquetas, `aria-label`, botones,
//      títulos), y los que tienen un localizador no exacto que el texto nuevo también cumpliría (strict mode); en el spec o en un
//      ayudante de `e2e/soporte/` que importa. Un texto agregado que nombran más de COMUN_AL_NOMBRAR specs («Guardar», «Cancelar») se
//      ignora, y un localizador que tienen más de COMUN_AL_ATRAPAR, también; los dos se dicen;
//   3. los de las pantallas que usan un compartido tocado (`src/shared/`, el marco del layout `(app)`) o un archivo que no nombra
//      ningún spec, siguiendo los imports hasta `src/app/`; lo que llega al marco o a más de RUTAS_DE_TODA_PANTALLA rutas está en toda
//      pantalla: los specs del marco y los de presupuestos.
//   4. los de presupuesto (JS en frío, nodos del DOM) de cada pantalla tocada: entran siempre, sin contar para el tope.
// Un texto que la rama quita (o pasa al «⋯») no se descarta por común: los specs de las pantallas tocadas que lo nombran entran antes del tope.
// Mejor sobrar que faltar, con tope: pasados TOPE specs corren los más ligados y se dice cuáles quedaron fuera.
//
//   node scripts/e2e-afectados.mjs [--base <ref>] [--tope <n>] [--json] [--correr]
//
// `--correr` los corre en el carril con su pila y candado (`pnpm test:e2e <specs> --project escritorio`, y `movil` si toca
// interfaz). Se prueba en `e2e-afectados.test.ts`.
import { execFileSync, spawnSync } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

import { e2eAfectados, esFuenteDeSrc, TOPE } from './e2e-afectados/eleccion.mjs'

/** Las líneas agregadas y quitadas por archivo de un `git diff --unified=0` (un borrado, con su ruta de antes). */
export function cambiosDelDiff(diff) {
  const cambios = {}
  let actual = null
  let cabecera = false
  for (const linea of diff.split('\n')) {
    if (linea.startsWith('diff --git ')) {
      actual = / b\/(.+)$/.exec(linea)?.[1] ?? null
      cabecera = true
      continue
    }
    if (linea.startsWith('@@')) {
      cabecera = false
      continue
    }
    // `--- a/x` y `+++ b/x` son de la cabecera; adentro de un hunk, `--- x` es una línea `-- x` que se fue.
    if (cabecera || !actual) continue
    const c = (cambios[actual] ??= { agregadas: [], quitadas: [] })
    if (linea.startsWith('+')) c.agregadas.push(linea.slice(1))
    else if (linea.startsWith('-')) c.quitadas.push(linea.slice(1))
  }
  return cambios
}

/** La base de la comparación: la del merge con `origin/main` (o `main`), así una rama sin `main` al día no suma lo ajeno. */
export function baseDeComparacion(git, pedida) {
  if (pedida) return pedida
  for (const principal of ['origin/main', 'main']) {
    try {
      return git('merge-base', 'HEAD', principal).trim()
    } catch {
      // Sin esa referencia: se prueba la siguiente.
    }
  }
  throw new Error('sin origin/main ni main: pasa --base <ref>')
}

/** El resumen para la sesión: qué corre y por qué, qué se ignoró y qué quedó fuera del tope. */
export function resumen(e, base, tope = TOPE) {
  const lista = (xs, n = 6) =>
    xs.slice(0, n).join(', ') + (xs.length > n ? ` y ${String(xs.length - n)} más` : '')
  const nombre = (s) => s.replace(/^e2e\//, '')
  const lineas = [
    `e2e afectados contra ${base.slice(0, 12)} (la base del merge con main): ${String(e.specs.length)} specs`,
  ]
  if (e.dirigidos.length > 0)
    lineas.push(`· dirigidos (${String(e.dirigidos.length)}): ${lista(e.dirigidos.map(nombre))}`)
  const comoSeDice = {
    quitado: 'buscan un texto que se fue',
    movido: 'buscan un texto que pasó al «⋯»',
    nombra: 'nombran',
    inicio: 'un localizador no exacto atrapa',
    palabra: 'un localizador no exacto atrapa',
    parte: 'un localizador no exacto atrapa (a mitad de palabra)',
  }
  for (const t of e.textos)
    lineas.push(`· ${comoSeDice[t.como]} «${t.texto}»: ${lista(t.specs.map(nombre))}`)
  for (const p of e.presupuestos) lineas.push(`· presupuesto de ${p.razon}: ${nombre(p.spec)}`)
  for (const p of e.pantallas) {
    const donde = p.todaPantalla
      ? 'toda pantalla (los del marco y los de presupuestos)'
      : p.rutas.map((r) => `/${r}`).join(', ') || 'ninguna pantalla'
    lineas.push(`· ${p.archivo} → ${donde}: ${String(p.specs)} specs`)
  }
  if (e.ignorados.length > 0) {
    const ignorados = e.ignorados.map((i) => `«${i.texto}» (${String(i.specs)})`)
    lineas.push(`ignorados por comunes o de pantallas que la rama no toca: ${lista(ignorados, 10)}`)
  }
  if (e.specs.length > tope)
    lineas.push(
      `pasa de ${String(tope)}: entraron ${String(e.porRegla.texto)} por un texto que se fue, ${String(e.porRegla.presupuesto)} por el presupuesto de una pantalla tocada y ${String(e.porRegla.puntos)} por los puntos`,
    )
  if (e.fuera.length > 0)
    lineas.push(
      `tope: corren los ${String(e.specs.length)} más ligados; quedan fuera ${String(e.fuera.length)}: ${lista(e.fuera.map(nombre), 10)}`,
    )
  if (e.huerfanos.length > 0) lineas.push(`sin spec que los nombre: ${lista(e.huerfanos)}`)
  if (e.ci.modo === 'completo')
    lineas.push(`el CI correrá el completo de escritorio (${e.ci.motivo})`)
  if (e.specs.length === 0) {
    lineas.push('ningún e2e que correr')
    return lineas
  }
  lineas.push(`proyectos: ${e.interfaz ? 'escritorio y movil (toca interfaz)' : 'escritorio'}`)
  lineas.push(`pnpm test:e2e ${comandoDe(e).join(' ')}`)
  return lineas
}

const comandoDe = (e) => [
  ...e.specs,
  '--project',
  'escritorio',
  ...(e.interfaz ? ['--project', 'movil'] : []),
]

function archivosDe(carpeta) {
  return readdirSync(carpeta, { withFileTypes: true }).flatMap((d) =>
    d.isDirectory() ? archivosDe(join(carpeta, d.name)) : [join(carpeta, d.name)],
  )
}

function principal(argv) {
  const valor = (bandera) => {
    const i = argv.indexOf(bandera)
    return i >= 0 ? argv[i + 1] : undefined
  }
  const git = (...args) =>
    execFileSync('git', args, { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 })
  const base = baseDeComparacion(git, valor('--base'))
  const tope = Number(valor('--tope') ?? TOPE)
  const contenidos = new Map()
  const leer = (a) => {
    if (!contenidos.has(a)) {
      try {
        contenidos.set(a, readFileSync(a, 'utf8'))
      } catch {
        contenidos.set(a, null)
      }
    }
    return contenidos.get(a)
  }
  // Lo que todavía no está commiteado cuenta: se compara el árbol de trabajo, con los archivos nuevos.
  const nuevos = git('ls-files', '--others', '--exclude-standard').split('\n').filter(Boolean)
  const archivos = [
    ...new Set([...git('diff', '--name-only', base).split('\n').filter(Boolean), ...nuevos]),
  ]
  const cambios = cambiosDelDiff(
    git('diff', '--unified=0', '--no-color', '--no-ext-diff', base, '--', 'src'),
  )
  for (const a of nuevos.filter((n) => n.startsWith('src/')))
    cambios[a] = { agregadas: (leer(a) ?? '').split('\n'), quitadas: [] }
  const eleccion = e2eAfectados({
    archivos,
    cambios,
    specs: readdirSync('e2e')
      .filter((f) => f.endsWith('.spec.ts'))
      .map((f) => `e2e/${f}`),
    soportes: readdirSync('e2e/soporte').map((f) => `e2e/soporte/${f}`),
    fuentes: archivosDe('src').filter(esFuenteDeSrc),
    leer,
    tope,
  })
  console.log(
    argv.includes('--json')
      ? JSON.stringify({ base, ...eleccion })
      : resumen(eleccion, base, tope).join('\n'),
  )
  if (!argv.includes('--correr') || eleccion.specs.length === 0) return
  const corrida = spawnSync('pnpm', ['test:e2e', ...comandoDe(eleccion)], { stdio: 'inherit' })
  process.exitCode = corrida.status ?? 1
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  principal(process.argv.slice(2))
}
