import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

// El código diferido (el `import()` de un modal, un panel o una pestaña) pasa siempre por `diferido()` de
// `src/shared/ui/diferido.tsx`: sin red, un `import()` que nunca se pidió falla al abrirlo, y el ayudante lo
// reintenta y avisa en su lugar en vez de tumbar la pantalla al `error.tsx` (`.claude/rules/escala.md`).
// El lint prohíbe `next/dynamic` (`eslint.config.mjs`); esta prueba lo comprueba sobre el árbol y exige que
// cada `diferidos.tsx` use el ayudante.

const RAIZ = process.cwd()

function* archivos(dir: string): Generator<string> {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const ruta = join(dir, e.name)
    if (e.isDirectory()) {
      yield* archivos(ruta)
    } else if (/\.tsx?$/.test(e.name) && !/\.(test|spec)\./.test(e.name)) {
      yield ruta
    }
  }
}

const fuentes = [...archivos(join(RAIZ, 'src'))].map((ruta) => ({
  archivo: relative(RAIZ, ruta).replaceAll('\\', '/'),
  texto: readFileSync(ruta, 'utf8'),
}))

describe('el código diferido', () => {
  it('ningún archivo de src/ importa next/dynamic', () => {
    const sueltos = fuentes.filter((f) => /from\s+['"]next\/dynamic['"]/.test(f.texto))
    expect(sueltos.map((f) => f.archivo)).toEqual([])
  })

  it('todo diferidos.tsx carga con diferido() y cada exportación lo usa', () => {
    const diferidos = fuentes.filter((f) => f.archivo.endsWith('/diferidos.tsx'))
    expect(diferidos.length).toBeGreaterThanOrEqual(9)
    for (const f of diferidos) {
      expect(f.texto, f.archivo).toContain("from '@/shared/ui/diferido'")
      const exportaciones = f.texto.match(/^export const \w+ =/gm) ?? []
      const usos = f.texto.match(/=\s*diferido[<(]/g) ?? []
      expect(usos.length, `${f.archivo}: cada export debe ser un diferido()`).toBe(
        exportaciones.length,
      )
    }
  })

  it('un import() de un componente fuera de diferido() no se hace en src/ (salvo datos)', () => {
    // Los `import()` que quedan son de datos o de reglas (la tabla de países, el seguimiento del alta)
    // la E/S de «visto» (`composicion-vistos.client`) y la lectura de las fórmulas archivadas de un origen (`areas/formulas-del-origen/composicion.client`): supabase-js, que una lista no carga en frío,
    // o el renderer del PDF, el de la imagen de la tarjeta de una cotización, su paso a WebP, el `sharp` del logo de la tarjeta y el PDF de un arte, que corren sólo en el servidor
    // (4.18-3a: así otra ruta que importa `@/modules/cotizaciones` no carga react-pdf, `next/og` ni `sharp`), y el silencio del push con el Modo Live
    // (`silenciar-en-el-live.client`: la suscripción del navegador y su fila, que el marco pide sólo al cambiar el Live): nunca de
    // un componente del navegador. Un componente diferido va en un `diferidos.tsx`.
    const permitidos =
      /import\(\s*['"][^'"]*\/(tabla|primer-seguimiento|papaparse|leer|composicion-vistos\.client|areas\/formulas-del-origen\/composicion\.client|infra\/tarjeta\/pdf\/pdf-de-la-tarjeta|infra\/tarjeta\/imagen\/imagen-de-la-tarjeta|infra\/tarjeta\/imagen\/webp-de-la-tarjeta|infra\/pdf\/pdf-del-arte|silenciar-en-el-live\.client)[^'"]*['"]\s*\)|import\(\s*['"]sharp['"]\s*\)/
    const componentes = fuentes.flatMap((f) =>
      [...f.texto.matchAll(/\bimport\(\s*['"]([^'"]+)['"]\s*\)/g)]
        .filter((m) => !permitidos.test(m[0]) && !f.archivo.endsWith('/diferidos.tsx'))
        .filter((m) => !/diferido[<(]/.test(f.texto.slice(Math.max(0, m.index - 200), m.index)))
        .map((m) => `${f.archivo}: ${m[0]}`),
    )
    expect(componentes).toEqual([])
  })
})
