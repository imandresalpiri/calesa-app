import { accessSync, constants, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// `pnpm db:revisar` es lo que el job «Base» del CI compara de la base contra el repo: la sesión lo corre igual antes de publicar. Aquí se
// prueba que no se separen: el paso del CI llama al script y el script llama a lo mismo que antes escribía el paso.
const leer = (ruta: string) => readFileSync(ruta, 'utf8')
const ci = leer('.github/workflows/ci.yml')
const script = leer('scripts/db/revisar.sh')
const paquete = JSON.parse(leer('package.json')) as { scripts: Record<string, string> }

describe('pnpm db:revisar', () => {
  it('existe, ejecutable, y toma el candado de la base con su nombre', () => {
    expect(() => accessSync('scripts/db/revisar.sh', constants.X_OK)).not.toThrow()
    expect(paquete.scripts['db:revisar']).toBe(
      'bash scripts/candado.sh db:revisar -- bash scripts/db/revisar.sh',
    )
  })

  it('el paso «Base» del CI llama a pnpm db:revisar, no a los comandos sueltos', () => {
    const paso = /- name: la base contra el repo[^\n]*\n\s+run: ([^\n]+)/.exec(ci)?.[1]
    expect(paso).toBe('pnpm db:revisar')
    const sinComentarios = ci.replace(/^\s*#.*$/gm, '')
    expect(sinComentarios).not.toContain('revisar-base.mjs')
  })

  it('el script corre db:lint y, con su salida, advisors, db-lint e inventario', () => {
    expect(script).toContain('pnpm db:lint')
    expect(script).toMatch(/revisar-base\.mjs advisors db-lint "\$SALIDA" inventario/)
  })

  it('el archivo temporal va en $TMPDIR y el script dice pnpm db:reset si la pila está apagada', () => {
    expect(script).toContain('${TMPDIR:-/tmp}')
    expect(script).toContain('pnpm db:reset')
  })
})
