import { execFileSync, spawn, spawnSync } from 'node:child_process'
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

// El escenario de «varios orquestadores en una máquina» (maquina.test.ts, al-dia.test.ts): un HOME compartido (ahí viven
// maquina.env, los turnos y la pausa), un `claude` falso (claude-falso.sh) y un `gh` que siempre falla, primeros en el PATH, y un
// repo por proyecto con su origen bare, su copia del guion y la cola sólo local. Nada sale a la red ni a Docker: preparar.sh y
// quitar.sh son stubs. Git sin autor en el CI: cada commit lleva el suyo.
export const TIEMPO = 90_000
const ORQ = resolve('scripts/orquestador')
const AUTOR = ['-c', 'user.name=prueba', '-c', 'user.email=prueba@ejemplo.test']

export type Maquina = ReturnType<typeof maquina>
export type Repo = { m: Maquina; nombre: string; ruta: string; origen: string; datos: string }
export type Sesion = {
  inicio: number
  fin: number | null
  pwd: string
  modelo: string
  pid: number
}

export function maquina() {
  const raiz = mkdtempSync(join(tmpdir(), 'orq-maquina-'))
  const home = join(raiz, 'home')
  const bin = join(raiz, 'bin')
  mkdirSync(home)
  mkdirSync(bin)
  writeFileSync(
    join(bin, 'claude'),
    `#!/usr/bin/env bash\nexec bash ${ORQ}/prueba/claude-falso.sh "$@"\n`,
    {
      mode: 0o755,
    },
  )
  writeFileSync(join(bin, 'gh'), '#!/usr/bin/env bash\nexit 1\n', { mode: 0o755 })
  const vivos: number[] = []
  const repos: Repo[] = []
  return { raiz, home, bin, log: join(raiz, 'claude.log'), vivos, repos }
}

export function env(m: Maquina, extra: Record<string, string> = {}) {
  return {
    NODE_ENV: 'test' as const,
    HOME: m.home,
    PATH: `${m.bin}:${process.env['PATH'] ?? ''}`,
    CLAUDE_FALSO_LOG: m.log,
    CLAUDE_FALSO_DUERME: '1',
    ...extra,
  }
}

export function turnosDeLaMaquina(m: Maquina, texto: string) {
  mkdirSync(join(m.home, '.config/orquestador'), { recursive: true })
  writeFileSync(join(m.home, '.config/orquestador/maquina.env'), texto)
}

const git = (cwd: string, ...args: string[]) =>
  execFileSync('git', [...AUTOR, ...args], { cwd, encoding: 'utf8', stdio: 'pipe' }).trim()

/** Un proyecto: origen bare, principal en main con el guion y stubs, y su .orquestador/ sólo local. */
export function repo(m: Maquina, nombre: string, local = ''): Repo {
  const origen = join(m.raiz, `${nombre}.git`)
  const ruta = join(m.raiz, nombre)
  execFileSync('git', ['init', '-q', '--bare', '-b', 'main', origen])
  execFileSync('git', ['init', '-q', '-b', 'main', ruta])
  cpSync(ORQ, join(ruta, 'scripts/orquestador'), { recursive: true })
  mkdirSync(join(ruta, 'scripts/worktree'), { recursive: true })
  for (const s of ['preparar.sh', 'quitar.sh'])
    writeFileSync(join(ruta, 'scripts/worktree', s), 'exit 0\n')
  writeFileSync(join(ruta, '.gitignore'), '.orquestador/\n')
  git(ruta, 'add', '-A')
  git(ruta, 'commit', '-q', '-m', 'inicio')
  git(ruta, 'remote', 'add', 'origin', origen)
  git(ruta, 'push', '-q', '-u', 'origin', 'main')
  const datos = join(ruta, '.orquestador')
  mkdirSync(join(datos, 'cola'), { recursive: true })
  writeFileSync(
    join(datos, 'config.local.env'),
    // Sin la app del orquestador (app.sh): config.env trae sus ids reales y una prueba no sale a GitHub.
    `PROYECTO="${nombre}"\nORQ_SOLO_LOCAL=1\nINTERVALO=1\nAPP_ID=""\n${local}`,
  )
  const r = { m, nombre, ruta, origen, datos }
  m.repos.push(r)
  return r
}

export function tarea(r: Repo, id: string, extra = '') {
  writeFileSync(
    join(r.datos, 'cola', `${id}-x.md`),
    `---\nid: ${id}\ntitulo: tarea ${id}\nrama: feat/${r.nombre}-${id.toLowerCase()}\n${extra}---\n\n## Objetivo\n\nProbar.\n`,
  )
}

export function orq(r: Repo, extra: Record<string, string>, ...args: string[]) {
  const p = spawnSync('bash', [join(r.ruta, 'scripts/orquestador/orquestador.sh'), ...args], {
    encoding: 'utf8',
    env: env(r.m, extra),
  })
  return { estado: p.status, salida: p.stdout + p.stderr }
}

/** El guion desprendido (su propia sesión): `bucle` o `correr <ID>`. Su stderr queda en `<datos>/<nombre>.err`. */
export function lanzarGuion(r: Repo, extra: Record<string, string>, ...args: string[]) {
  const nombre = args.join('-') || 'bucle'
  const err = openSync(join(r.datos, `${nombre}.err`), 'a')
  const p = spawn('bash', [join(r.ruta, 'scripts/orquestador/orquestador.sh'), ...args], {
    detached: true,
    stdio: ['ignore', err, err],
    env: env(r.m, extra),
  })
  p.unref()
  if (p.pid) r.m.vivos.push(p.pid)
  return p.pid ?? 0
}

export const leer = (f: string) => (existsSync(f) ? readFileSync(f, 'utf8') : '')
export const estado = (r: Repo, id: string, k = 'estado') =>
  leer(join(r.datos, 'estado', id, k)).trim()
export const logDe = (r: Repo) => leer(join(r.datos, 'estado/orquestador.log'))

export function sesiones(m: Maquina): Sesion[] {
  const lineas = leer(m.log).trim().split('\n').filter(Boolean)
  const lista: Sesion[] = []
  for (const l of lineas) {
    const [tipo, ns, a, b, c] = l.split(' ')
    if (tipo === 'inicio')
      lista.push({
        inicio: Number(BigInt(ns ?? '0') / 1_000_000n),
        fin: null,
        pwd: a ?? '',
        modelo: b ?? '',
        pid: Number(c),
      })
    else {
      const s = lista.find((x) => x.pid === Number(a) && x.fin === null)
      if (s) s.fin = Number(BigInt(ns ?? '0') / 1_000_000n)
    }
  }
  return lista
}

export const vivo = (pid: number) => {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

export async function esperar(cond: () => boolean, ms = 30_000) {
  const hasta = Date.now() + ms
  while (Date.now() < hasta) {
    if (cond()) return true
    await new Promise((r) => setTimeout(r, 200))
  }
  return cond()
}

/** Un segundo clon commitea `texto` en `ruta` y lo empuja al origen (lo integrado mientras el orquestador corre). */
export function empujarAlOrigen(r: Repo, ruta: string, texto: string) {
  const clon = mkdtempSync(join(r.m.raiz, 'clon-'))
  execFileSync('git', ['clone', '-q', r.origen, clon])
  mkdirSync(join(clon, ruta, '..'), { recursive: true })
  writeFileSync(join(clon, ruta), texto)
  git(clon, 'add', '-A')
  git(clon, 'commit', '-q', '-m', `cambia ${ruta}`)
  git(clon, 'push', '-q', 'origin', 'main')
  return git(clon, 'rev-parse', 'HEAD')
}

export const headDe = (r: Repo, ref = 'HEAD') => git(r.ruta, 'rev-parse', ref)

/** Corta todo lo que lanzó la prueba: cada guion desprendido, cada hijo (su sesión) y cada claude falso huérfano. */
export function matarTodo(m: Maquina) {
  const sesionesDe = [...m.vivos]
  for (const r of m.repos) {
    const est = join(r.datos, 'estado')
    if (!existsSync(est)) continue
    for (const id of readdirSync(est)) {
      const pid = Number(leer(join(est, id, 'pid')).trim())
      if (pid) sesionesDe.push(pid)
    }
  }
  for (const pid of sesionesDe) spawnSync('pkill', ['-KILL', '-s', String(pid)])
  for (const s of sesiones(m)) {
    try {
      process.kill(s.pid, 'SIGKILL')
    } catch (e) {
      // Ya murió entre mirarlo y matarlo (ESRCH): es lo que se buscaba.
      if ((e as NodeJS.ErrnoException).code !== 'ESRCH') throw e
    }
  }
  // Un proceso recién matado puede alcanzar a crear un archivo mientras se borra la carpeta (ENOTEMPTY): se reintenta.
  rmSync(m.raiz, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 })
}
