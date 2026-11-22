import { execFileSync, spawnSync } from 'node:child_process'
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterAll } from 'vitest'

// El escenario de las pruebas de la cola en los issues (cola-github*.test.ts, dependencias.test.ts, pedidos.test.ts): el guion real en
// un repo temporal con su manifiesto, y un `gh` y un `claude` falsos primeros en el PATH (gh-falso.mjs guarda un «GitHub» en un JSON y
// anota cada llamada con su token; claude-falso.sh). Nada sale a la red. Con `conOrigen`, el repo tiene un commit y su origin/main
// (para la copia de main que lee la redacción de un pedido). Con `conKit`, el repo trae el flujo del kit (scripts/kit/*.mjs, el
// flujo.txt de ese kit y `.kit/version`) y el gh falso sirve ese kit de juguete como imandresalpiri/kit (kit-semanal.test.ts). Cada
// llamada al guion ronda un segundo (lanza node varias veces): las pruebas llevan TIEMPO.
const raices: string[] = []
afterAll(() => {
  for (const r of raices)
    rmSync(r, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 })
})

export const TIEMPO = 60_000

const MANIFIESTO = `esquema: proyecto/v1
proyecto: tienda
nombre: Tienda
semilla: null
repos:
  - { rol: app, nombre: tienda-app, github: Cuenta/tienda-app, etapa: construccion, semilla: null, puertos: { bloque: 6 } }
  - { rol: web, nombre: tienda-web, github: Otra/tienda-web, etapa: construccion, semilla: null, puertos: { bloque: 7 } }
contratos: []
`

// Como las de ../tareas: `id: K06` no es un id de la cola y queda como origen.
export const K06 = `---
id: K06
titulo: repartir el límite entre orquestadores
rama: feat/turnos-y-niveles
depende: kit:feat/cola-en-issues
conflicto: orquestador
planificar: si
effort: high
---

## Pedido de la persona

«Dos orquestadores se reparten el límite a mano.»

## Decisiones ya tomadas

- Turnos por máquina con flock.

## Verificación

pnpm test.
`

/** El cuerpo de un issue de la cola: el bloque yaml y una sección. */
export const cuerpo = (rama: string, extra = '') =>
  `\`\`\`yaml\ntitulo: tarea de ${rama}\nrama: ${rama}\n${extra}\`\`\`\n\n## Decisiones ya tomadas\n\n- Lo de siempre.\n`

type Issue = {
  number: number
  title: string
  body: string
  labels: string[]
  state: string
  autor?: string
  login?: string
  tipo?: string
  // `performed_via_github_app.id`: nulo cuando la app abre con su token de instalación; así llega de GitHub.
  app?: number
  created_at?: string
  comentarios: {
    id: number
    body: string
    created_at: string
    author_association?: string
    user?: { login: string; type: string }
  }[]
}
type Gh = {
  repo: string
  // El login de la app del orquestador en los issues que crea con su token (gh-falso.mjs; `mi-app[bot]` si falta).
  loginApp?: string
  siguiente: number
  siguienteComentario: number
  issues: Record<string, Issue>
  etiquetas: string[]
  prs: Record<
    string,
    {
      number: number
      rama: string
      estado: string
      sha?: string
      padre?: string
      titulo?: string
      cuerpo?: string
      archivos?: { filename: string; previous_filename?: string; patch?: string }[]
      // Lo que lee la vigilancia de los PR (vigilar_prs): el CI, el estado de la rama y cuántas veces GitHub la puso al día.
      checks?: { __typename: string; name: string; conclusion: string; detailsUrl: string }[]
      mergeable?: string
      mergeState?: string
      alDia?: number
    }[]
  >
  refs?: { ref: string; sha: string }[]
  refsFalla?: string
  cuentas: string[]
  // El CI de main para el cierre de la tanda (gh-falso.mjs).
  ci?: {
    main: string
    corridas: {
      databaseId: number
      headSha: string
      status: string
      conclusion: string
      event: string
      createdAt: string
      args?: string[]
    }[]
    artefactos?: Record<string, Record<string, string>>
  }
  sinRed?: boolean
  limite?: boolean
  // Los issues que la lista de abiertos todavía no trae (gh-falso.mjs).
  listaAtrasada?: number[]
  issueEditFalla?: boolean
  // Los comienzos de argumentos de gh que fallan como un permiso que le falta a la app (gh-falso.mjs).
  sinPermisoApp?: string[]
  // Los repos nombrados explícitamente (el kit), que atiende gh-falso-git.mjs.
  git?: Record<
    string,
    {
      dir?: string
      sinAcceso?: boolean
      issues?: Record<string, Partial<Issue>>
      siguiente?: number
    }
  >
}
/** El kit de juguete del que salió el repo: su carpeta de git y el commit de `.kit/version`. */
type ConKit = { dir: string; version: string }
// Lo de scripts/kit/ que necesita `actualizar.mjs --revisar`.
const DEL_KIT = ['flujo', 'mezcla', 'personalizar', 'kit-gh', 'actualizar'].map(
  (n) => `scripts/kit/${n}.mjs`,
)

/** Un repo temporal con el guion, el manifiesto, su `.orquestador/` y el `gh` falso; devuelve sus carpetas. */
function prepararRepo(local: string, conOrigen: boolean, conKit?: ConKit) {
  const repo = mkdtempSync(join(tmpdir(), 'orq-issues-'))
  raices.push(repo)
  execFileSync('git', ['init', '-q', '-b', 'main', repo])
  execFileSync('git', [
    '-C',
    repo,
    'remote',
    'add',
    'origin',
    'https://github.com/Cuenta/tienda-app.git',
  ])
  mkdirSync(join(repo, 'scripts/proyecto'), { recursive: true })
  cpSync(resolve('scripts/orquestador'), join(repo, 'scripts/orquestador'), { recursive: true })
  cpSync(resolve('scripts/proyecto/manifiesto.mjs'), join(repo, 'scripts/proyecto/manifiesto.mjs'))
  symlinkSync(resolve('node_modules'), join(repo, 'node_modules'))
  mkdirSync(join(repo, '.proyecto'))
  writeFileSync(join(repo, '.proyecto/proyecto.yaml'), MANIFIESTO)
  const datos = join(repo, '.orquestador')
  mkdirSync(join(datos, 'cola'), { recursive: true })
  // Lo que entra solo a la cola, apagado: la tarea de dependencias crearía un issue en cada escenario, las del kit lo llamarían y el
  // cierre de la tanda miraría el CI (dependencias.test.ts, kit-semanal.test.ts, kit-aviso.test.ts y cierre-tanda.test.ts las encienden).
  // Sin la app del orquestador: config.env trae sus ids reales y el HOME temporal no tiene clave (app.test.ts la enciende).
  writeFileSync(
    join(datos, 'config.local.env'),
    `DEPS_MENSUAL="no"\nKIT_SEMANAL="no"\nKIT_AVISAR="no"\nCIERRE_TANDA="no"\nAPP_ID=""\n${local}`,
  )
  if (conKit) traerElKit(repo, conKit)
  const falso = join(repo, '.gh-falso')
  mkdirSync(join(falso, 'bin'), { recursive: true })
  writeFileSync(
    join(falso, 'bin/gh'),
    `#!/usr/bin/env bash\nexec node ${resolve('scripts/orquestador/prueba/gh-falso.mjs')} "$@"\n`,
    { mode: 0o755 },
  )
  writeFileSync(
    join(falso, 'bin/claude'),
    `#!/usr/bin/env bash\nexec bash ${resolve('scripts/orquestador/prueba/claude-falso.sh')} "$@"\n`,
    { mode: 0o755 },
  )
  if (conOrigen) {
    // Git sin autor en el CI: el commit lleva el suyo. origin/main sin red: la referencia, a mano.
    writeFileSync(join(repo, '.gitignore'), '.orquestador/\n.gh-falso/\nnode_modules\n')
    execFileSync('git', ['-C', repo, 'add', '-A'])
    const autor = ['-c', 'user.name=prueba', '-c', 'user.email=prueba@ejemplo.test']
    execFileSync('git', ['-C', repo, ...autor, 'commit', '-q', '-m', 'inicio'])
    execFileSync('git', ['-C', repo, 'update-ref', 'refs/remotes/origin/main', 'HEAD'])
  }
  return { repo, datos, falso }
}

/** Lo del flujo del kit en el repo: los guiones de scripts/kit/, el flujo.txt del kit de juguete en su versión y `.kit/version`. */
function traerElKit(repo: string, { dir, version }: ConKit) {
  mkdirSync(join(repo, 'scripts/kit'), { recursive: true })
  mkdirSync(join(repo, 'scripts/lib'), { recursive: true })
  mkdirSync(join(repo, '.kit'), { recursive: true })
  for (const f of [...DEL_KIT, 'scripts/lib/stack-local.mjs']) cpSync(resolve(f), join(repo, f))
  const flujo = execFileSync('git', ['-C', dir, 'show', `${version}:scripts/kit/flujo.txt`])
  writeFileSync(join(repo, 'scripts/kit/flujo.txt'), flujo)
  writeFileSync(join(repo, '.kit/version'), `${version}\n`)
}

/** Corre bash con el `gh` y el `claude` falsos primeros en el PATH y el HOME del escenario. */
function correrBash(
  { datos, falso }: { datos: string; falso: string },
  argv: string[],
  env: Record<string, string> = {},
) {
  const r = spawnSync('bash', argv, {
    encoding: 'utf8',
    env: {
      NODE_ENV: 'test',
      HOME: datos,
      PATH: `${join(falso, 'bin')}:${process.env['PATH'] ?? ''}`,
      GH_FALSO: falso,
      ...env,
    },
  })
  return { estado: r.status, salida: r.stdout + r.stderr }
}

export function escenario(
  local = '',
  { conOrigen = false, conKit }: { conOrigen?: boolean; conKit?: ConKit } = {},
) {
  const { repo, datos, falso } = prepararRepo(local, conOrigen, conKit)
  const ruta = join(falso, 'estado.json')
  const inicial: Gh = {
    repo: 'Cuenta/tienda-app',
    siguiente: 5,
    siguienteComentario: 1000,
    issues: {},
    etiquetas: ['bug'],
    prs: {},
    cuentas: ['Cuenta'],
    issueEditFalla: true,
    ...(conKit ? { git: { 'imandresalpiri/kit': { dir: conKit.dir } } } : {}),
  }
  writeFileSync(ruta, JSON.stringify(inicial))

  const gh = (): Gh => JSON.parse(readFileSync(ruta, 'utf8')) as Gh
  const cambiarGh = (f: (g: Gh) => void) => {
    const g = gh()
    f(g)
    writeFileSync(ruta, JSON.stringify(g))
  }
  const issue = (n: number, body: string, labels = ['cola']) =>
    cambiarGh((g) => {
      g.issues[n] = { number: n, title: `issue ${n}`, body, labels, state: 'open', comentarios: [] }
      g.siguiente = Math.max(g.siguiente, n + 1)
    })
  // `env`: lo que se suma al entorno (el modo del claude falso; GIT_ALLOW_PROTOCOL=file para que un fetch no salga a la red).
  const orqCon = (env: Record<string, string>, ...args: string[]) =>
    correrBash({ datos, falso }, [join(repo, 'scripts/orquestador/orquestador.sh'), ...args], env)
  const orq = (...args: string[]) => orqCon({}, ...args)
  // Las funciones de orquestador.sh cargadas sin correr ningún comando (ORQ_SOLO_FUNCIONES=1): lo que pasa dentro de una sesión.
  const funciones = (guion: string) =>
    correrBash({ datos, falso }, [
      '-c',
      `ORQ_SOLO_FUNCIONES=1; source "${join(repo, 'scripts/orquestador/orquestador.sh')}"; ${guion}`,
    ])
  // Las llamadas a GitHub (sin `gh auth token`, que lee la sesión local).
  const llamadas = (): { args: string[]; token: string }[] =>
    existsSync(join(falso, 'llamadas.log'))
      ? readFileSync(join(falso, 'llamadas.log'), 'utf8')
          .trim()
          .split('\n')
          .map((l) => JSON.parse(l) as { args: string[]; token: string })
          .filter((l) => l.args[0] !== 'auth')
      : []
  const cola = () => readdirSync(join(datos, 'cola')).sort()
  const spec = (nombre: string) => readFileSync(join(datos, 'cola', nombre), 'utf8')
  const est = (id: string, k: string) => {
    const f = join(datos, 'estado', id, k)
    return existsSync(f) ? readFileSync(f, 'utf8').trim() : ''
  }
  const ponerEst = (id: string, k: string, v: string) => {
    mkdirSync(join(datos, 'estado', id), { recursive: true })
    writeFileSync(join(datos, 'estado', id, k), `${v}\n`)
  }
  const log = () => readFileSync(join(datos, 'estado/orquestador.log'), 'utf8')
  return {
    repo,
    datos,
    falso,
    gh,
    cambiarGh,
    issue,
    orq,
    orqCon,
    funciones,
    llamadas,
    cola,
    spec,
    est,
    ponerEst,
    log,
  }
}
