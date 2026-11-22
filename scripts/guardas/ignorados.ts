import { execFileSync } from 'node:child_process'

// Los archivos versionados que `.gitignore` también ignora (`git ls-files -ci --exclude-standard`). Un archivo que una herramienta
// regenera (`.eslintcache`) y que entró al repo por error aparece como cambio sin commitear en cada sesión siguiente. `null` si
// `cwd` no es un repo de git.
export function versionadosIgnorados(cwd: string): string[] | null {
  try {
    const dentro = execFileSync('git', ['rev-parse', '--is-inside-work-tree'], {
      cwd,
      encoding: 'utf8',
      stdio: 'pipe',
    })
    if (dentro.trim() !== 'true') return null
    const salida = execFileSync('git', ['ls-files', '-z', '-ci', '--exclude-standard'], {
      cwd,
      encoding: 'utf8',
      stdio: 'pipe',
    })
    return salida.split('\0').filter(Boolean)
  } catch {
    return null
  }
}

export function mensajeDeVersionadosIgnorados(archivos: string[]): string {
  return [
    `Hay ${archivos.length} archivo(s) versionado(s) que .gitignore ignora:`,
    ...archivos.map((a) => `  ${a}`),
    'Sácalo con `git rm --cached <archivo>` en un commit `chore` aparte (no lo restaures a mano en cada sesión). Si se versiona a propósito, agrega una excepción `!ruta` en .gitignore.',
  ].join('\n')
}
