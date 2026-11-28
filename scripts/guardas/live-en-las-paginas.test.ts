import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  PANTALLAS_DEL_LIVE,
  PANTALLAS_DEL_LIVE_DEL_EDITOR,
} from '../../src/app/(app)/_live/pantallas-del-live'

// Con el Modo Live encendido, lo que ocultan sus ajustes no se lee ni llega al navegador: cada `page.tsx` y `route.ts` de `(app)` y de
// `(editor)` nombra su área en `src/app/(app)/_live/pantallas-del-live.ts` (una tabla por grupo) y llama a su guarda con esa área
// (`_live/guarda.tsx`). Una pantalla nueva sin guarda dejaría ver lo oculto por URL; un layout no alcanza (no se vuelve a dibujar al
// navegar dentro de su segmento).
const GRUPOS = [
  { grupo: '(app)', tabla: PANTALLAS_DEL_LIVE, minimo: 50 },
  { grupo: '(editor)', tabla: PANTALLAS_DEL_LIVE_DEL_EDITOR, minimo: 1 },
] as const

function archivos(carpeta: string): string[] {
  return readdirSync(carpeta, { withFileTypes: true }).flatMap((entrada) => {
    const ruta = join(carpeta, entrada.name)
    if (entrada.isDirectory()) return archivos(ruta)
    return entrada.name === 'page.tsx' || entrada.name === 'route.ts' ? [ruta] : []
  })
}

const raizDe = (grupo: string) => join(process.cwd(), 'src', 'app', grupo)
const rutasDe = (grupo: string) =>
  archivos(raizDe(grupo)).map((ruta) => relative(raizDe(grupo), ruta).split(sep).join('/'))

function llamaASuGuarda(grupo: string, ruta: string, area: string): boolean {
  const texto = readFileSync(join(raizDe(grupo), ruta), 'utf8')
  const llamadas = [
    `ocultoEnElLive('${area}')`,
    `rutaOcultaEnElLive('${area}')`,
    `<SiSeVeEnElLive area="${area}">`,
  ]
  return llamadas.some((llamada) => texto.includes(llamada))
}

describe.each(GRUPOS)('el Modo Live en las páginas de $grupo', ({ grupo, tabla, minimo }) => {
  const rutas = rutasDe(grupo)

  it('recorre sus páginas y sus rutas', () => {
    expect(rutas.length).toBeGreaterThanOrEqual(minimo)
  })

  it('toda página y ruta tiene su área, y la tabla no nombra una que no existe', () => {
    const sinArea = rutas.filter((ruta) => !(ruta in tabla))
    const sobran = Object.keys(tabla).filter((ruta) => !rutas.includes(ruta))
    expect({ sinArea, sobran }).toEqual({ sinArea: [], sobran: [] })
  })

  it('cada una llama a su guarda con el área de la tabla', () => {
    const sinGuarda = Object.entries(tabla)
      .filter(([, area]) => area !== 'siempre-visible')
      .filter(([ruta, area]) => !llamaASuGuarda(grupo, ruta, area))
      .map(([ruta, area]) => `${ruta} → ${area}`)
    expect(sinGuarda).toEqual([])
  })
})
