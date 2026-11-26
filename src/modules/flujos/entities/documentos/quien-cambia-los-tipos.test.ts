import { describe, expect, it } from 'vitest'
import type { Permisos } from '@/shared/lib/permisos'
import { grupoParaCrear, quienCambiaLosTipos } from './quien-cambia-los-tipos'

const A = '00000000-0000-4000-8000-000000000001'
const B = '00000000-0000-4000-8000-000000000002'
const con = (...concesiones: [string, string | null][]): Permisos =>
  concesiones.map(([clave, origenId]) => ({ clave, origenId, alcance: 'todos' })) as Permisos

describe('quienCambiaLosTipos', () => {
  it('en un origen, los catálogos de ese origen cambian los dos grupos', () => {
    expect(quienCambiaLosTipos(con(['logistica.catalogos.gestionar', A]), { origenId: A })).toEqual(
      {
        propios: true,
        compartidos: true,
      },
    )
  })

  it('quien configura el flujo cambia los propios y ve los compartidos en lectura', () => {
    expect(quienCambiaLosTipos(con(['flujos.configurar', A]), { origenId: A })).toEqual({
      propios: true,
      compartidos: false,
    })
  })

  it('los permisos de otro origen no valen en éste', () => {
    expect(
      quienCambiaLosTipos(con(['logistica.catalogos.gestionar', B], ['flujos.configurar', B]), {
        origenId: A,
      }),
    ).toEqual({ propios: false, compartidos: false })
  })

  it('en repuestos: los propios con repuestos.configurar; los compartidos con los catálogos en algún origen', () => {
    expect(
      quienCambiaLosTipos(con(['repuestos.configurar', null]), { ambito: 'repuestos' }),
    ).toEqual({
      propios: true,
      compartidos: false,
    })
    expect(
      quienCambiaLosTipos(con(['logistica.catalogos.gestionar', B]), { ambito: 'repuestos' }),
    ).toEqual({ propios: false, compartidos: true })
  })
})

describe('grupoParaCrear', () => {
  it('respeta el pedido si se puede; si no, cae en el otro; sin ninguno, nulo', () => {
    expect(grupoParaCrear({ propios: true, compartidos: true }, 'compartido')).toBe('compartido')
    expect(grupoParaCrear({ propios: true, compartidos: false }, 'compartido')).toBe('origen')
    expect(grupoParaCrear({ propios: false, compartidos: true }, 'origen')).toBe('compartido')
    expect(grupoParaCrear({ propios: false, compartidos: false }, 'origen')).toBeNull()
  })
})
