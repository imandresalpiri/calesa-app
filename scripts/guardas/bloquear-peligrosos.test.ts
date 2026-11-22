import { execFileSync, spawnSync } from 'node:child_process'
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { BLOQUEA, CON_DEPENDENCIAS, PASA } from './bloquear-peligrosos.casos'
import { BLOQUEA_ESPERAS, PASA_ESPERAS, type CasoDeEspera } from './bloquear-esperas.casos'
import { BLOQUEA_SECRETOS, PASA_SECRETOS } from './bloquear-secretos.casos'

// `bloquear-peligrosos.sh` es el hook PreToolUse de Bash: lo irreversible, lo de afuera, las dependencias y saltarse el candado de
// la base se rechazan siempre; una etiqueta nueva sí se empuja, y agregar con pnpm, sólo lo de la lista aprobada del repo.
// Se prueba con el hook de verdad: una tabla de comandos → bloquea (exit 2 y el motivo por stderr) / pasa (exit 0), con repos de
// git temporales para la rama del push (el patrón de `scripts/ci-cambios.test.ts`).
const HOOK = resolve('.claude/hooks/bloquear-peligrosos.sh')
const LISTA = 'scripts/orquestador/dependencias-aprobadas.txt'

let raiz = ''
let enMain = ''
let enOtra = ''

function git(cwd: string, ...args: string[]) {
  execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@ejemplo.test', ...args], { cwd })
}

function repo(nombre: string, rama: string): string {
  const dir = join(raiz, nombre)
  mkdirSync(dir)
  git(dir, 'init', '-q', '-b', 'main')
  writeFileSync(join(dir, 'README.md'), 'x\n')
  git(dir, 'add', '.')
  git(dir, 'commit', '-q', '-m', 'inicio')
  if (rama !== 'main') git(dir, 'checkout', '-q', '-b', rama)
  return dir
}

// La lista aprobada de un repo temporal (`texto` vacío no la escribe).
function escribirLista(dir: string, texto: string) {
  mkdirSync(join(dir, 'scripts/orquestador'), { recursive: true })
  if (texto) writeFileSync(join(dir, LISTA), texto)
}

// `permite`: el ORQ_PERMITE del entorno del hook, el que el orquestador le da al proceso `claude` de una tarea; `hook`: otra copia
// del hook.
function correr(
  command: string,
  opciones: {
    cwd?: string
    hook?: string
    agente?: string
    permite?: string
    herramienta?: string
    segundoPlano?: boolean
  } = {},
) {
  const r = spawnSync('bash', [opciones.hook ?? HOOK], {
    input: JSON.stringify({
      tool_name: opciones.herramienta ?? 'Bash',
      tool_input: {
        command,
        ...(opciones.segundoPlano === undefined
          ? {}
          : { run_in_background: opciones.segundoPlano }),
      },
      cwd: opciones.cwd ?? enMain,
      ...(opciones.agente ? { agent_type: opciones.agente } : {}),
    }),
    encoding: 'utf8',
    env: {
      NODE_ENV: 'test',
      PATH: process.env['PATH'] ?? '',
      ...(opciones.permite === undefined ? {} : { ORQ_PERMITE: opciones.permite }),
    },
  })
  return { estado: r.status, motivo: r.stderr }
}

beforeAll(() => {
  raiz = mkdtempSync(join(tmpdir(), 'bloquear-peligrosos-'))
  enMain = repo('en-main', 'main')
  enOtra = repo('en-otra', 'otra')
  escribirLista(enMain, '')
  copyFileSync(resolve(LISTA), join(enMain, LISTA))
})

afterAll(() => {
  rmSync(raiz, { recursive: true, force: true })
})

describe('bloquear-peligrosos.sh', () => {
  it.each(BLOQUEA)('bloquea: %s', (comando) => {
    const real = comando.replace('ENOTRA', enOtra).replace('ENMAIN', enMain)
    const { estado, motivo } = correr(real)
    expect({ estado, motivo: motivo.trim().length > 0 }).toEqual({ estado: 2, motivo: true })
  })

  it.each(PASA)('deja pasar: %s', (comando) => {
    const real = comando.replace('ENOTRA', enOtra).replace('ENMAIN', enMain)
    expect(correr(real).estado).toBe(0)
  })

  it('sin comando (otra herramienta, JSON raro, nada) no hace nada', () => {
    for (const entrada of ['{}', '{"tool_input":{}}', 'no es json', '']) {
      const r = spawnSync('bash', [HOOK], { input: entrada, encoding: 'utf8' })
      expect(r.status, entrada).toBe(0)
    }
  })

  it('con b_ip enlazada, lo que va al enlazado se rechaza; con un ref nombrado, no', () => {
    const conBip = repo('con-bip', 'otra')
    mkdirSync(join(conBip, 'supabase/.temp'), { recursive: true })
    writeFileSync(join(conBip, 'supabase/.temp/project-ref'), 'baursalbatwztsaevlef\n')
    for (const c of [
      'supabase db push',
      'npx supabase db reset --linked',
      'supabase db dump --linked -f x.sql',
    ])
      expect(correr(c, { cwd: conBip }).estado, c).toBe(2)
    expect(correr('supabase db push --project-ref abc', { cwd: conBip }).estado).toBe(0)
    expect(correr('supabase db push', { cwd: enOtra }).estado).toBe(0)
  })
})

// Ni la clave de la app del orquestador ni el token de GitHub se leen o se imprimen (bloquear-secretos.sh).
describe('los secretos de GitHub', () => {
  it.each(BLOQUEA_SECRETOS)('bloquea: %s', (comando) => {
    const { estado, motivo } = correr(comando, { cwd: enOtra })
    expect({ estado, motivo: /clave de la app|token de GitHub/.test(motivo) }).toEqual({
      estado: 2,
      motivo: true,
    })
  })

  it.each(PASA_SECRETOS)('deja pasar: %s', (comando) => {
    expect(correr(comando, { cwd: enOtra }).estado).toBe(0)
  })

  it('sin bloquear-secretos.sh al lado, el hook bloquea todo', () => {
    const suelto = join(raiz, 'hook-sin-secretos')
    mkdirSync(suelto)
    copyFileSync(HOOK, join(suelto, 'bloquear-peligrosos.sh'))
    copyFileSync(
      resolve('.claude/hooks/bloquear-peligrosos-dependencias.sh'),
      join(suelto, 'bloquear-peligrosos-dependencias.sh'),
    )
    const { estado, motivo } = correr('git status', {
      hook: join(suelto, 'bloquear-peligrosos.sh'),
    })
    expect(estado).toBe(2)
    expect(motivo).toContain('bloquear-secretos.sh')
  })
})

// Esperar un proceso largo sondeándolo paga un turno con todo el contexto en cada vuelta: se lanza con `run_in_background` y se espera
// el aviso (bloquear-esperas.sh).
describe('las esperas que sondean', () => {
  const correrEspera = (c: CasoDeEspera) =>
    correr(c.comando, {
      cwd: enOtra,
      ...(c.herramienta ? { herramienta: c.herramienta } : {}),
      ...(c.segundoPlano === undefined ? {} : { segundoPlano: c.segundoPlano }),
    })

  it.each(BLOQUEA_ESPERAS)('bloquea: $herramienta $comando', (caso) => {
    const { estado, motivo } = correrEspera(caso)
    expect({ estado, motivo: motivo.includes('run_in_background') }).toEqual({
      estado: 2,
      motivo: true,
    })
  })

  it.each(PASA_ESPERAS)('deja pasar: $herramienta $comando', (caso) => {
    expect(correrEspera(caso).estado).toBe(0)
  })

  it('sin bloquear-esperas.sh al lado, el hook bloquea todo', () => {
    const suelto = join(raiz, 'hook-sin-esperas')
    mkdirSync(suelto)
    for (const f of [
      'bloquear-peligrosos.sh',
      'bloquear-peligrosos-dependencias.sh',
      'bloquear-secretos.sh',
    ])
      copyFileSync(resolve('.claude/hooks', f), join(suelto, f))
    const { estado, motivo } = correr('git status', {
      hook: join(suelto, 'bloquear-peligrosos.sh'),
    })
    expect(estado).toBe(2)
    expect(motivo).toContain('bloquear-esperas.sh')
  })
})

// La tarea de dependencias corre con ORQ_PERMITE=dependencias: `pnpm update` dentro de los rangos y `pnpm dedupe`, nada más.
describe('con permite: dependencias (ORQ_PERMITE)', () => {
  it.each(CON_DEPENDENCIAS.PASA)('deja pasar: %s', (comando) => {
    expect(correr(comando, { permite: 'dependencias' }).estado).toBe(0)
  })

  it.each(CON_DEPENDENCIAS.BLOQUEA)('sigue bloqueando: %s', (comando) => {
    const { estado, motivo } = correr(comando, { permite: 'dependencias' })
    expect({ estado, motivo: motivo.trim().length > 0 }).toEqual({ estado: 2, motivo: true })
  })

  it('otro permiso, o uno vacío, no lo da; en una lista con comas, sí', () => {
    expect(correr('pnpm update', { permite: 'otra' }).estado).toBe(2)
    expect(correr('pnpm update', { permite: '' }).estado).toBe(2)
    expect(correr('pnpm dedupe', { permite: 'otra' }).estado).toBe(2)
    expect(correr('pnpm update', { permite: 'otra,dependencias' }).estado).toBe(0)
  })

  it('el permiso es el del entorno del hook: escrito en el comando no cuenta', () => {
    expect(correr('ORQ_PERMITE=dependencias pnpm update').estado).toBe(2)
    expect(correr('env ORQ_PERMITE=dependencias pnpm dedupe').estado).toBe(2)
  })
})

// Una sesión empuja sólo la rama en la que está; main avanza al integrarse el PR (docs/FLUJO.md).
describe('la rama del push', () => {
  it('un push sin rama sale de la rama del cwd: otra pasa, main no', () => {
    expect(correr('git push', { cwd: enOtra }).estado).toBe(0)
    expect(correr('git push origin', { cwd: enOtra }).estado).toBe(0)
    expect(correr('git push origin HEAD', { cwd: enOtra }).estado).toBe(0)
    expect(correr('git push', { cwd: enMain }).estado).toBe(2)
    expect(correr('git push origin HEAD', { cwd: enMain }).estado).toBe(2)
  })

  it('`git -C <carpeta>` manda sobre el cwd, también con una carpeta relativa', () => {
    expect(correr(`git -C ${enOtra} push`, { cwd: enMain }).estado).toBe(0)
    expect(correr(`git -C ${enMain} push`, { cwd: enOtra }).estado).toBe(2)
    expect(correr('git -C ../en-otra push', { cwd: enMain }).estado).toBe(0)
    expect(correr('git -C ../en-main push', { cwd: enOtra }).estado).toBe(2)
  })

  it('main nunca, ni nombrada desde otra rama; y sólo la rama propia', () => {
    expect(correr('git push origin main', { cwd: enOtra }).estado).toBe(2)
    expect(correr('git push origin otra', { cwd: enOtra }).estado).toBe(0)
    expect(correr('git push origin tercera', { cwd: enOtra }).estado).toBe(2)
  })

  it('un push junto a un `cd` se rechaza: el hook no ve en qué rama queda', () => {
    expect(correr('cd ../en-otra && git push', { cwd: enMain }).estado).toBe(2)
    expect(correr('cd ../en-otra && git push origin otra', { cwd: enOtra }).estado).toBe(2)
  })
})

// Agregar con pnpm pasa sólo con lo de `scripts/orquestador/dependencias-aprobadas.txt` del repo donde corre (el worktree).
describe('la lista aprobada', () => {
  it('sin lista, vacía o ilegible, no entra ningún paquete', () => {
    const sinLista = repo('sin-lista', 'otra')
    const vacia = repo('lista-vacia', 'otra')
    escribirLista(vacia, '# sólo comentarios\n\n   \n# html-to-image\n')
    const carpeta = repo('lista-carpeta', 'otra')
    mkdirSync(join(carpeta, LISTA), { recursive: true })
    for (const cwd of [sinLista, vacia, carpeta]) {
      const { estado, motivo } = correr('pnpm add html-to-image', { cwd })
      expect(estado, cwd).toBe(2)
      expect(motivo).toContain(join(realpathSync(cwd), LISTA))
    }
  })

  it('se lee de la raíz del repo donde corre, también desde una subcarpeta', () => {
    const propio = repo('lista-propia', 'otra')
    escribirLista(propio, '# prueba\r\n  otro-paquete  # con espacios y CRLF\r\nultimo-sin-salto')
    expect(correr('pnpm add otro-paquete ultimo-sin-salto', { cwd: propio }).estado).toBe(0)
    expect(correr('pnpm add html-to-image', { cwd: propio }).estado).toBe(2)
    expect(correr('pnpm add otro-paquete').estado).toBe(2)
    mkdirSync(join(enMain, 'src'), { recursive: true })
    expect(correr('pnpm add html-to-image', { cwd: join(enMain, 'src') }).estado).toBe(0)
  })

  it('sin bloquear-peligrosos-dependencias.sh al lado, el hook no sabe qué dejar pasar y bloquea todo', () => {
    const suelto = join(raiz, 'hook-suelto')
    mkdirSync(suelto)
    copyFileSync(HOOK, join(suelto, 'bloquear-peligrosos.sh'))
    const { estado, motivo } = correr('git status', {
      hook: join(suelto, 'bloquear-peligrosos.sh'),
    })
    expect(estado).toBe(2)
    expect(motivo).toContain('bloquear-peligrosos-dependencias.sh')
  })

  it('el motivo dice cuál falta y dónde está la lista', () => {
    const { estado, motivo } = correr('pnpm add @xyflow/react lodash')
    expect(estado).toBe(2)
    expect(motivo).toContain('lodash')
    expect(motivo).toContain(LISTA)
    expect(motivo).not.toContain('@xyflow/react')
  })

  it('la lista del repo: un nombre de npm por línea, cada uno con su comentario encima, sin repetir', () => {
    const lineas = readFileSync(resolve(LISTA), 'utf8').split('\n')
    const paquetes: string[] = []
    lineas.forEach((linea, i) => {
      if (linea.trim() === '' || linea.startsWith('#')) return
      expect(linea).toMatch(/^(@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/)
      expect(lineas[i - 1] ?? '', linea).toMatch(/^#\s*\S/)
      paquetes.push(linea)
    })
    expect(paquetes.length).toBeGreaterThan(0)
    expect(new Set(paquetes).size).toBe(paquetes.length)
  })
})

// El revisor lee: su Bash pasa por `solo-lectura.sh` desde settings (los hooks de su frontmatter no corren con la carpeta sin confiar).
describe('el Bash del revisor', () => {
  it.each(['touch x', 'git commit -m x', 'echo hola > a.txt', 'rm -f a.txt', 'pnpm lint'])(
    'no corre: %s',
    (comando) => {
      expect(correr(comando, { agente: 'revisor' }).estado).toBe(2)
    },
  )

  it.each(['git diff', 'git log --oneline -3', 'grep -rn flujo docs/', 'cat package.json'])(
    'sí lee: %s',
    (comando) => {
      expect(correr(comando, { agente: 'revisor' }).estado).toBe(0)
    },
  )

  it('otro agente, o la sesión principal, no pasa por la sola lectura', () => {
    expect(correr('touch x', { agente: 'general-purpose' }).estado).toBe(0)
    expect(correr('touch x').estado).toBe(0)
  })
})
