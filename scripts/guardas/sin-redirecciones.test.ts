import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import configuracion from '../../next.config'
import { PERMITIDAS, faltasDelProxy, redireccionesEn } from './sin-redirecciones'

// Una ruta o un parámetro que se muda no deja redirección (`.claude/rules/rutas.md`): da «no existe» y sus enlaces se actualizan en el mismo
// PR. Sólo quedan las estructurales de `PERMITIDAS`. Esta prueba lista lo que redirige en `src/app`, en `redirects()` de `next.config.ts` y
// en el proxy, y nombra el archivo que sobra.

const RAIZ = process.cwd()

function* archivos(dir: string): Generator<string> {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const ruta = join(dir, e.name)
    if (e.isDirectory()) yield* archivos(ruta)
    else yield ruta
  }
}

const aRelativa = (ruta: string) => relative(RAIZ, ruta).replaceAll('\\', '/')
const leer = (archivo: string) => readFileSync(join(RAIZ, archivo), 'utf8')
const esCodigo = (archivo: string) => /\.tsx?$/.test(archivo) && !/\.(test|spec)\./.test(archivo)
const tipoDe = (archivo: string) => (archivo.endsWith('/route.ts') ? 'ruta' : 'otro')

const DE_NEXT = PERMITIDAS.filter((permitida) => permitida.archivo === 'next.config.ts')
const DE_LA_APP = PERMITIDAS.filter((permitida) => permitida.archivo !== 'next.config.ts')

describe('sin redirecciones de rutas mudadas', () => {
  it('redirects() de next.config.ts tiene sólo las estructurales', async () => {
    const redirecciones = (await configuracion('phase-development-server').redirects?.()) ?? []
    expect(redirecciones.map((r) => `${r.source} → ${r.destination}`).sort()).toEqual(
      DE_NEXT.map(({ desde, destino }) => `${desde ?? '(sin desde)'} → ${destino}`).sort(),
    )
  })

  it('lo que redirige en src/app es exactamente lo de PERMITIDAS, y cada uno dice a dónde', () => {
    const queRedirigen = [...archivos(join(RAIZ, 'src/app'))]
      .map(aRelativa)
      .filter(esCodigo)
      .filter((archivo) => redireccionesEn(leer(archivo), tipoDe(archivo)).length > 0)
      .sort()
    expect(queRedirigen).toEqual(
      [...new Set(DE_LA_APP.map((permitida) => permitida.archivo))].sort(),
    )
    for (const { archivo, destino } of DE_LA_APP) {
      expect(leer(archivo), `${archivo} debe nombrar «${destino}»`).toContain(destino)
    }
  })

  it('el proxy no reescribe y sólo redirige por el acceso', () => {
    expect(faltasDelProxy(leer('src/proxy.ts'))).toEqual([])
  })

  it('ningún archivo de src/ guarda lo viejo en su nombre', () => {
    const viejos = [...archivos(join(RAIZ, 'src'))]
      .map(aRelativa)
      .filter((archivo) => /viej/i.test(archivo.split('/').pop() ?? ''))
    expect(viejos).toEqual([])
  })
})

describe('el detector', () => {
  it('un route.ts con redireccionPermanente() cae', () => {
    const texto = "export const GET = () => redireccionPermanente('/x')"
    expect(redireccionesEn(texto, 'ruta')).toEqual(['redireccionPermanente('])
  })

  it('un 308 o un redirect() en un comentario no cuenta', () => {
    const texto = [
      '// Antes daba un 308 con redirect(destino).',
      '/* NextResponse.redirect(otra) */',
      "export const GET = () => new Response('ok', { status: 200 })",
    ].join('\n')
    expect(redireccionesEn(texto, 'ruta')).toEqual([])
  })

  it('un texto con // no esconde lo que sigue', () => {
    const texto = "const url = 'https://ejemplo.com'; return new Response(null, { status: 307 })"
    expect(redireccionesEn(texto, 'ruta')).toEqual(['307'])
  })

  it('un page.tsx con redirigir() cae; un número 30x fuera de un route.ts no', () => {
    expect(
      redireccionesEn('export default function P() { redirigir(RUTAS.inicio) }', 'otro'),
    ).toEqual(['redirigir('])
    expect(redireccionesEn('const ancho = 301', 'otro')).toEqual([])
  })

  it('un proxy que reescribe o redirige a otro lado cae', () => {
    const bueno = 'return NextResponse.redirect(new URL(decision.destino, request.nextUrl.origin))'
    expect(faltasDelProxy(bueno)).toEqual([])
    expect(
      faltasDelProxy(`${bueno}\nreturn NextResponse.rewrite(new URL('/x', origen))`),
    ).toHaveLength(1)
    expect(
      faltasDelProxy(`${bueno}\nreturn NextResponse.redirect(new URL('/vieja', origen))`),
    ).toHaveLength(1)
  })
})
