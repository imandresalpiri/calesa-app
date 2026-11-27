import { describe, expect, it } from 'vitest'
import { lineasDelMenu } from './menu-del-documento'
import { SIN_PERMISO_PARA_APROBAR, SIN_PERMISO_PARA_ELIMINAR } from './revision'

const subido = { estado: 'subido', visiblePortal: false, ruta: 'u/a.pdf' } as const
const tipoConPortal = { visiblePortalPermitido: true }
const claves = (aprobar: boolean | null, subir: boolean | null) => ({ aprobar, subir })
const claveDe = (l: ReturnType<typeof lineasDelMenu>) => l.map((x) => x.clave)

describe('lineasDelMenu', () => {
  it('quien puede todo ve las siete acciones de un documento por aprobar, en orden', () => {
    const lineas = lineasDelMenu(subido, tipoConPortal, claves(true, true))
    expect(claveDe(lineas)).toEqual([
      'ver',
      'descargar',
      'aprobar',
      'rechazar',
      'portal',
      'editar',
      'eliminar',
    ])
    expect(lineas.every((l) => l.estado === 'habilitada')).toBe(true)
  })

  it('un aprobado no ofrece aprobar ni rechazar; un rechazado sólo aprobar', () => {
    expect(
      claveDe(lineasDelMenu({ ...subido, estado: 'aprobado' }, tipoConPortal, claves(true, true))),
    ).toEqual(['ver', 'descargar', 'portal', 'editar', 'eliminar'])
    expect(
      claveDe(lineasDelMenu({ ...subido, estado: 'rechazado' }, tipoConPortal, claves(true, true))),
    ).toEqual(['ver', 'descargar', 'aprobar', 'portal', 'editar', 'eliminar'])
  })

  it('quien sólo sube ve aprobar, rechazar y el portal apagados con su motivo; editar y eliminar valen', () => {
    const lineas = lineasDelMenu(subido, tipoConPortal, claves(false, true))
    const por = Object.fromEntries(lineas.map((l) => [l.clave, l]))
    expect(por['aprobar']).toMatchObject({ estado: 'apagada', motivo: SIN_PERMISO_PARA_APROBAR })
    expect(por['rechazar']).toMatchObject({ estado: 'apagada', motivo: SIN_PERMISO_PARA_APROBAR })
    expect(por['portal']).toMatchObject({ estado: 'apagada', motivo: SIN_PERMISO_PARA_APROBAR })
    expect(por['editar']?.estado).toBe('habilitada')
    expect(por['eliminar']?.estado).toBe('habilitada')
  })

  it('quien no puede nada tiene apagado editar y eliminar, con su motivo', () => {
    const por = Object.fromEntries(
      lineasDelMenu(subido, tipoConPortal, claves(false, false)).map((l) => [l.clave, l]),
    )
    expect(por['eliminar']).toMatchObject({ estado: 'apagada', motivo: SIN_PERMISO_PARA_ELIMINAR })
    expect(por['ver']?.estado).toBe('habilitada')
  })

  it('mientras los permisos no llegan todo lo que cambia algo está apagado y sin motivo', () => {
    const lineas = lineasDelMenu(subido, tipoConPortal, claves(null, null))
    const cambian = lineas.filter((l) => l.clave !== 'ver' && l.clave !== 'descargar')
    expect(cambian.every((l) => l.estado === 'apagada' && l.motivo === null)).toBe(true)
  })

  it('«Visible en el portal» es una casilla con la marca de la fila; apagada si el tipo no lo admite', () => {
    const visible = lineasDelMenu(
      { ...subido, visiblePortal: true },
      tipoConPortal,
      claves(true, true),
    )
    expect(visible.find((l) => l.clave === 'portal')?.marcada).toBe(true)
    const sinPortal = lineasDelMenu(subido, { visiblePortalPermitido: false }, claves(true, true))
    expect(sinPortal.find((l) => l.clave === 'portal')).toMatchObject({ estado: 'apagada' })
  })

  it('sin archivo no hay Ver ni Descargar', () => {
    const lineas = lineasDelMenu({ ...subido, ruta: null }, tipoConPortal, claves(true, true))
    expect(claveDe(lineas)).not.toContain('ver')
    expect(claveDe(lineas)).not.toContain('descargar')
  })
})
