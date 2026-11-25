import { describe, expect, it } from 'vitest'

import { elegir } from './e2e-afectados-ayuda'
import { patronDeUrl, urlDe } from './e2e-afectados/pantallas.mjs'

// T521 (#549): la hoja de cotizar pasó su techo de nodos (502 contra 500) y `cotizar-hoja-200.spec.ts` quedó fuera del tope de 40. El
// spec que mide el JS o los nodos de una pantalla tocada entra siempre, sin contar para el tope.
const XCELL = 'src/shared/ui/xcell/xcell.tsx'
const HOJA = 'e2e/cotizar-hoja-200.spec.ts'
const PRESUPUESTO_JS = 'e2e/presupuesto-js.spec.ts'
const LEADS = 'e2e/leads-escala.spec.ts'

const elegirTras521 = (tope: number) =>
  elegir({
    archivos: [XCELL],
    specs: {
      ...Object.fromEntries(
        Array.from({ length: 60 }, (_, i) => [
          `e2e/cotizar-relleno-${String(i)}.spec.ts`,
          "await page.goto('/cotizaciones/nuevo')",
        ]),
      ),
      [HOJA]: [
        'await page.goto(`/cotizaciones/nuevo?origen=${origen}`)',
        "const n = await hoja.evaluate((e) => e.querySelectorAll('*').length + 1)",
      ].join('\n'),
      [PRESUPUESTO_JS]: "import { PRESUPUESTO_DE_JS_EN_KB } from './soporte/presupuestos'",
      [LEADS]: [
        "await page.goto('/leads')",
        "const n = await lista.evaluate((e) => e.querySelectorAll('*').length)",
      ].join('\n'),
    },
    soportes: {
      'e2e/soporte/presupuestos.ts':
        "export const PRESUPUESTO_DE_JS_EN_KB = {\n  '/leads': 560,\n  '/cotizaciones/nuevo': 480,\n}",
    },
    fuentes: {
      [XCELL]: 'export function Xcell() {}',
      'src/modules/cotizaciones/features/hoja/components/hoja.tsx':
        "import { Xcell } from '@/shared/ui/xcell/xcell'",
      'src/app/(app)/cotizaciones/nuevo/page.tsx':
        "import { Hoja } from '@/modules/cotizaciones/features/hoja/components/hoja'",
    },
    tope,
  })

describe('e2e-afectados › el presupuesto de las pantallas tocadas (T521)', () => {
  it('los specs que miden JS y nodos de la pantalla tocada entran aunque el tope no deje lugar', () => {
    const r = elegirTras521(5)
    expect(r.specs).toContain(HOJA)
    expect(r.specs).toContain(PRESUPUESTO_JS)
    expect(r.specs).not.toContain(LEADS)
    expect(r.presupuestos.map((p: { spec: string }) => p.spec).sort()).toEqual([
      HOJA,
      PRESUPUESTO_JS,
    ])
  })

  it('no cuentan para el tope: los demás se reparten el tope entero', () => {
    const r = elegirTras521(5)
    expect(r.porRegla).toEqual({ texto: 0, presupuesto: 2, puntos: 5 })
    expect(r.specs).toHaveLength(7)
  })
})

describe('e2e-afectados › la pantalla de un archivo de src/app', () => {
  it('urlDe quita grupos y carpetas privadas', () => {
    expect(urlDe('src/app/(app)/cotizaciones/[id]/_hoja/x.tsx')).toBe('/cotizaciones/[id]')
    expect(urlDe('src/app/(app)/page.tsx')).toBe('/')
  })

  it('patronDeUrl la reconoce en un spec, con ${…} donde la ruta tiene [id], y no una más profunda', () => {
    const patron = patronDeUrl('/cotizaciones/[id]')
    expect(patron.test('await page.goto(`/cotizaciones/${id}`)')).toBe(true)
    expect(patron.test("await page.goto('/cotizaciones/abc?x=1')")).toBe(true)
    expect(patron.test("await page.goto('/cotizaciones/abc/otra')")).toBe(false)
    expect(patronDeUrl('/leads').test("await page.goto('/leads/nuevo')")).toBe(false)
  })
})
