import { describe, expect, it } from 'vitest'
import type { Permisos } from '@/shared/lib/permisos'
import { modoDelEditor } from './modo-del-editor'

const ORIGEN_A = '00000000-0000-4000-8000-000000000901'
const ORIGEN_B = '00000000-0000-4000-8000-000000000902'
const con = (...concesiones: [string, string | null][]): Permisos =>
  concesiones.map(([clave, origenId]) => ({ clave, origenId, alcance: 'todos' })) as Permisos

describe('modoDelEditor', () => {
  it('quien configura el flujo del origen lo edita', () => {
    expect(modoDelEditor(con(['flujos.configurar', ORIGEN_A]), { origenId: ORIGEN_A })).toBe(
      'edicion',
    )
  })

  it('con sólo los catálogos de logística del origen, lectura', () => {
    expect(
      modoDelEditor(con(['logistica.catalogos.gestionar', ORIGEN_A]), { origenId: ORIGEN_A }),
    ).toBe('lectura')
  })

  it('flujos.configurar de otro origen no edita éste', () => {
    expect(
      modoDelEditor(
        con(['flujos.configurar', ORIGEN_B], ['logistica.catalogos.gestionar', ORIGEN_A]),
        { origenId: ORIGEN_A },
      ),
    ).toBe('lectura')
  })

  it('una concesión sin origen vale para todos', () => {
    expect(modoDelEditor(con(['flujos.configurar', null]), { origenId: ORIGEN_A })).toBe('edicion')
  })

  it('el flujo de repuestos siempre va en edición', () => {
    expect(modoDelEditor(con(['repuestos.configurar', null]), { ambito: 'repuestos' })).toBe(
      'edicion',
    )
  })
})
