import { describe, expect, it } from 'vitest'

import { elegir } from './e2e-afectados-ayuda'

// Lo que cayó en el CI de la tanda del 2026-11-25 y no en local (T525, #552): «Subir», «Bajar» y «Editar» pasaron al «⋯» y
// `e2e-afectados` los descartó por comunes. Un texto que la rama quita, o pasa al «⋯», no se descarta nunca: entran los specs de las
// pantallas que la rama toca que lo nombran (los de otras pantallas, no).
const COMUNES = 20 // más de COMUN_AL_NOMBRAR, de pantallas que la rama no toca
const LISTA = 'src/shared/ui/lista-de-catalogo/lista-de-catalogo.tsx'
const ORDEN = 'src/shared/ui/lista-de-catalogo/acciones-de-orden.ts'
const TARJETA = 'src/shared/ui/tarjetas-de-ajustes/tarjeta-editable.tsx'
const BOTON = 'src/shared/ui/tarjetas-de-ajustes/boton-de-la-tarjeta.tsx'
const FLUJOS = 'e2e/configuracion-flujos-documentos.spec.ts'
const TARJETAS = 'e2e/empresa-tarjetas.spec.ts'

const deOtraPantalla = () =>
  Object.fromEntries(
    Array.from({ length: COMUNES }, (_, i) => [
      `e2e/agenda-${String(i)}.spec.ts`,
      [
        "await page.goto('/agenda')",
        "await page.getByRole('button', { name: 'Subir' }).click()",
        "await page.getByRole('button', { name: 'Editar', exact: true }).click()",
      ].join('\n'),
    ]),
  )

const elegirTras525 = () =>
  elegir({
    archivos: [LISTA, ORDEN, TARJETA, BOTON],
    cambios: {
      [ORDEN]: {
        agregadas: ["      etiqueta: 'Subir',", "      etiqueta: 'Bajar',"],
        quitadas: [],
      },
      [LISTA]: { agregadas: [], quitadas: ['<BotonesDeOrden prefijo={prefijo} />'] },
      [BOTON]: { agregadas: [], quitadas: ['<Button etiqueta="Editar" />'] },
    },
    specs: {
      ...deOtraPantalla(),
      [FLUJOS]: [
        "await page.goto('/configuracion/flujos')",
        "await page.getByRole('button', { name: 'Subir' }).click()",
      ].join('\n'),
      [TARJETAS]: [
        "await page.goto('/configuracion/empresa')",
        "await page.getByRole('button', { name: 'Editar', exact: true }).click()",
      ].join('\n'),
    },
    fuentes: {
      [ORDEN]: 'export function accionesConOrden() {}',
      [LISTA]: "import { accionesConOrden } from './acciones-de-orden'",
      [TARJETA]: 'export function TarjetaEditable() {}',
      'src/app/(app)/configuracion/flujos/page.tsx':
        "import { x } from '@/shared/ui/lista-de-catalogo/lista-de-catalogo'",
      'src/app/(app)/configuracion/empresa/page.tsx':
        "import { x } from '@/shared/ui/tarjetas-de-ajustes/tarjeta-editable'",
    },
    tope: 1,
  })

describe('e2e-afectados › lo que la rama quita de la vista (T525)', () => {
  it('un texto que pasó al «⋯» o se quitó entra aunque lo nombren cientos de specs, si son de las pantallas tocadas', () => {
    const r = elegirTras525()
    expect(r.specs).toContain(FLUJOS)
    expect(r.specs).toContain(TARJETAS)
    expect(r.textos).toContainEqual(expect.objectContaining({ texto: 'Subir', como: 'movido' }))
    expect(r.textos).toContainEqual(
      expect.objectContaining({ texto: 'Editar', como: 'quitado', specs: [TARJETAS] }),
    )
  })

  it('los de pantallas que la rama no toca no entran, y se dice cuántos quedaron fuera', () => {
    const r = elegirTras525()
    expect(r.specs.filter((s) => s.startsWith('e2e/agenda-'))).toEqual([])
    expect(r.ignorados).toContainEqual({ texto: 'Editar', como: 'quitado', specs: COMUNES })
    expect(r.ignorados).toContainEqual({ texto: 'Subir', como: 'quitado', specs: COMUNES })
  })

  it('entran antes del tope: la lista pasa de él y dice cuántos entraron por cada regla', () => {
    const r = elegirTras525()
    expect(r.specs).toHaveLength(2)
    expect(r.porRegla).toEqual({ texto: 2, presupuesto: 0, puntos: 0 })
  })

  it('un texto común que la rama agrega (y no es una línea del «⋯») sigue ignorándose', () => {
    const r = elegir({
      archivos: [LISTA],
      cambios: { [LISTA]: { agregadas: ['  <Button>Subir</Button>'], quitadas: [] } },
      specs: { ...deOtraPantalla(), [FLUJOS]: "await page.getByText('Subir')" },
      fuentes: { [LISTA]: 'export function Lista() {}' },
    })
    expect(r.textos).toEqual([])
    expect(r.ignorados).toContainEqual({ texto: 'Subir', como: 'nombra', specs: COMUNES + 1 })
  })

  it('una rama sin pantallas (sólo scripts/) no trae textos ni presupuestos', () => {
    const r = elegir({
      archivos: ['scripts/flujo/publicar.sh'],
      specs: {
        'e2e/cotizar-hoja-200.spec.ts':
          "await page.goto('/cotizaciones/nuevo')\nq.querySelectorAll('*').length",
      },
    })
    expect(r.specs).toEqual([])
    expect(r.porRegla).toEqual({ texto: 0, presupuesto: 0, puntos: 0 })
  })
})
