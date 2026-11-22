import path from 'node:path'
import { describe, expect, it } from 'vitest'
import type { PasoParaCotizar } from '@/modules/origenes'
import type { Permisos } from '@/shared/lib/permisos'
import { existeLaRuta } from './existe-la-ruta'
import { DESTINOS_DE_PASO, conDestino, faltaDeCadaPestana } from './pasos'

const APP = path.join(process.cwd(), 'src/app/(app)')
const ORIGEN = '00000000-0000-4000-8000-000000000001'
const OTRO = '00000000-0000-4000-8000-000000000002'

// Una ruta existe si tiene su `page.tsx` o su `route.ts` (las raíces que redirigen), también dentro de un grupo de rutas.
const existe = (ruta: string) =>
  existeLaRuta(
    APP,
    (ruta.split('?')[0] ?? '')
      .split('/')
      .filter(Boolean)
      .map((segmento) => (segmento === ORIGEN ? '[id]' : segmento)),
  )

const paso = (clave: PasoParaCotizar['clave'], estado: PasoParaCotizar['estado']) =>
  ({ clave, titulo: clave, estado, frase: 'x' }) satisfies PasoParaCotizar

describe('destinos de «Para cotizar y mover»', () => {
  it('cada paso lleva a una pantalla que existe', () => {
    for (const [clave, destino] of Object.entries(DESTINOS_DE_PASO)) {
      expect(existe(destino.ruta(ORIGEN)), clave).toBe(true)
    }
  })

  it('cada paso lleva a su pestaña; Datos, a su drawer', () => {
    const rutas = conDestino(
      [
        paso('datos', 'listo'),
        paso('campos', 'aviso'),
        paso('flujo', 'bloquea'),
        paso('formula', 'bloquea'),
        paso('tarjeta', 'aviso'),
      ],
      [],
      ORIGEN,
    ).map((uno) => uno.ruta)
    const base = `/configuracion/origenes/${ORIGEN}`
    expect(rutas).toEqual([
      `${base}?panel=datos`,
      `${base}/campos`,
      `${base}/fases`,
      `${base}/planilla`,
      `${base}/tarjeta`,
    ])
  })

  it('Datos con aviso lleva a Integraciones, con el permiso de la empresa', () => {
    const [sin] = conDestino([paso('datos', 'aviso')], [], ORIGEN)
    expect(sin?.ruta).toBe('/configuracion/empresa/integraciones')
    expect(sin?.motivo).toContain('Ajustes de la empresa')
    const ajustes: Permisos = [
      { clave: 'empresa.ajustes.gestionar', origenId: null, alcance: 'todos' },
    ]
    expect(conDestino([paso('datos', 'aviso')], ajustes, ORIGEN)[0]?.motivo).toBeNull()
  })

  it('el permiso del flujo y de la fórmula se mira en este origen', () => {
    const flujo = (origenId: string | null): Permisos => [
      { clave: 'flujos.configurar', origenId, alcance: 'todos' },
    ]
    expect(conDestino([paso('flujo', 'bloquea')], flujo(OTRO), ORIGEN)[0]?.motivo).toBe(
      'Lo configura quien tiene el permiso «Configurar el flujo».',
    )
    expect(conDestino([paso('flujo', 'bloquea')], flujo(ORIGEN), ORIGEN)[0]?.motivo).toBeNull()
    const formula = conDestino([paso('formula', 'bloquea')], flujo(ORIGEN), ORIGEN)[0]
    expect(formula?.motivo).toBe('Lo configura quien tiene el permiso «Configurar el cotizador».')
  })

  it('Datos y Campos no piden permiso propio', () => {
    for (const uno of conDestino([paso('datos', 'listo'), paso('campos', 'aviso')], [], ORIGEN)) {
      expect(uno.motivo).toBeNull()
    }
  })
})

describe('faltaDeCadaPestana', () => {
  it('pone la frase del paso que falta en su pestaña; Datos y lo listo, nada', () => {
    expect(
      faltaDeCadaPestana([
        paso('datos', 'aviso'),
        paso('campos', 'listo'),
        paso('flujo', 'bloquea'),
        paso('formula', 'bloquea'),
        paso('tarjeta', 'aviso'),
      ]),
    ).toEqual({ fases: 'x', planilla: 'x', tarjeta: 'x' })
    expect(faltaDeCadaPestana([])).toEqual({})
  })
})
