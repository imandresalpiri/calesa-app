import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { mensajeDeVersionadosIgnorados, versionadosIgnorados } from './ignorados'

// Un worktree de Claude Code vive en `.claude/worktrees/` y uno del orquestador en `.orquestador/worktrees/`: no son código de este
// árbol. `.gitignore` solo no alcanza: `tsc` (`include: **/*.ts`) y el ESLint plano (no ignora carpetas con punto) lo leerían y el `typecheck` y el `lint` de
// otra sesión caerían por archivos que no son suyos; Prettier tampoco lee `.gitignore` de forma por defecto aquí.
const RAIZ = process.cwd()
const leer = (archivo: string) => readFileSync(join(RAIZ, archivo), 'utf8')
const lineas = (archivo: string) =>
  leer(archivo)
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))

describe('lo que los worktrees dejan fuera de las herramientas', () => {
  it('.gitignore ignora los worktrees y la huella del hook Stop', () => {
    const ignoradas = lineas('.gitignore')
    for (const ruta of ['.claude/worktrees/', '.orquestador/', '.claude/.verificado-stop']) {
      expect(ignoradas, ruta).toContain(ruta)
    }
  })

  it('tsconfig.json los excluye de tsc', () => {
    const { exclude } = JSON.parse(leer('tsconfig.json')) as { exclude: string[] }
    expect(exclude).toContain('.claude/worktrees')
    expect(exclude).toContain('.orquestador')
  })

  it('eslint.config.mjs los ignora globalmente', () => {
    const config = leer('eslint.config.mjs')
    expect(config).toContain("'.claude/worktrees/**'")
    expect(config).toContain("'.orquestador/**'")
  })

  it('.prettierignore los ignora', () => {
    const ignoradas = lineas('.prettierignore')
    expect(ignoradas).toContain('.claude/worktrees')
    expect(ignoradas).toContain('.orquestador')
  })

  it('.worktreeinclude copia sólo los .env: el de la app y el de las credenciales de demo', () => {
    expect(lineas('.worktreeinclude')).toEqual(['.env.local', '.env.demo'])
  })
})

describe('lo que está versionado y a la vez ignorado', () => {
  const git = (cwd: string, ...args: string[]) =>
    execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@ejemplo.test', ...args], {
      cwd,
      stdio: 'pipe',
    })

  it('ningún archivo versionado está en .gitignore', (contexto) => {
    const archivos = versionadosIgnorados(RAIZ)
    if (archivos === null) return contexto.skip('no es un repo de git: no hay qué comparar')
    expect(archivos, archivos.length ? mensajeDeVersionadosIgnorados(archivos) : '').toEqual([])
  })

  it('la guarda ve un archivo ignorado agregado con git add -f y pasa limpia sin él', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ignorados-'))
    try {
      git(dir, 'init', '-q', '-b', 'main')
      writeFileSync(join(dir, '.gitignore'), '.eslintcache\n')
      writeFileSync(join(dir, 'a.txt'), 'x\n')
      git(dir, 'add', '.')
      expect(versionadosIgnorados(dir)).toEqual([])
      writeFileSync(join(dir, '.eslintcache'), '[]\n')
      git(dir, 'add', '-f', '.eslintcache')
      const archivos = versionadosIgnorados(dir)
      expect(archivos).toEqual(['.eslintcache'])
      expect(mensajeDeVersionadosIgnorados(archivos ?? [])).toContain('git rm --cached <archivo>')
      git(dir, 'rm', '-q', '--cached', '.eslintcache')
      expect(versionadosIgnorados(dir)).toEqual([])
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('fuera de un repo de git devuelve null (el caso se salta)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'sin-git-'))
    try {
      expect(versionadosIgnorados(dir)).toBeNull()
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
