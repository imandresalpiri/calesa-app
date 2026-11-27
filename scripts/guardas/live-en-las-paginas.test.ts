import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { describe, expect, it } from 'vitest'
import { PANTALLAS_DEL_LIVE } from '../../src/app/(app)/_live/pantallas-del-live'

// Con el Modo Live encendido, lo que ocultan sus ajustes no se lee ni llega al navegador: cada `page.tsx` y `route.ts` de `(app)` nombra
// su área en `src/app/(app)/_live/pantallas-del-live.ts` y llama a su guarda con esa área (`_live/guarda.tsx`). Una pantalla nueva sin
// guarda dejaría ver lo oculto por URL; un layout no alcanza (no se vuelve a dibujar al navegar dentro de su segmento).
const RAIZ = join(process.cwd(), 'src', 'app', '(app)')

function archivos(carpeta: string): string[] {
  return readdirSync(carpeta, { withFileTypes: true }).flatMap((entrada) => {
    const ruta = join(carpeta, entrada.name)
    if (entrada.isDirectory()) return archivos(ruta)
    return entrada.name === 'page.tsx' || entrada.name === 'route.ts' ? [ruta] : []
  })
}

const rutas = archivos(RAIZ).map((ruta) => relative(RAIZ, ruta).split(sep).join('/'))

function llamaASuGuarda(ruta: string, area: string): boolean {
  const texto = readFileSync(join(RAIZ, ruta), 'utf8')
  const llamadas = [
    `ocultoEnElLive('${area}')`,
    `rutaOcultaEnElLive('${area}')`,
    `<SiSeVeEnElLive area="${area}">`,
  ]
  return llamadas.some((llamada) => texto.includes(llamada))
}

describe('el Modo Live en las páginas', () => {
  it('recorre las páginas y las rutas de (app)', () => {
    expect(rutas.length).toBeGreaterThan(50)
  })

  it('toda página y ruta de (app) tiene su área, y la tabla no nombra una que no existe', () => {
    const sinArea = rutas.filter((ruta) => !(ruta in PANTALLAS_DEL_LIVE))
    const sobran = Object.keys(PANTALLAS_DEL_LIVE).filter((ruta) => !rutas.includes(ruta))
    expect({ sinArea, sobran }).toEqual({ sinArea: [], sobran: [] })
  })

  it('cada una llama a su guarda con el área de la tabla', () => {
    const sinGuarda = Object.entries(PANTALLAS_DEL_LIVE)
      .filter(([, area]) => area !== 'siempre-visible')
      .filter(([ruta, area]) => !llamaASuGuarda(ruta, area))
      .map(([ruta, area]) => `${ruta} → ${area}`)
    expect(sinGuarda).toEqual([])
  })
})
