import { describe, expect, it } from 'vitest'
import type { Permisos } from '@/shared/lib/permisos'
import {
  MOTIVO_SIN_PERMISO_TIPOS_DEL_FLUJO,
  MOTIVO_SIN_PERMISO_TIPOS_COMPARTIDOS,
  comoResultado,
  motivoSinPermisoDelGrupo,
} from './resultado'

const FLUJO = '11111111-1111-4111-8111-111111111111'
const tiene = (...claves: string[]) =>
  claves.map((clave) => ({ clave, origenId: null })) as unknown as Permisos

describe('motivoSinPermisoDelGrupo', () => {
  it('los compartidos, sólo con los catálogos de logística', () => {
    expect(motivoSinPermisoDelGrupo(tiene('logistica.catalogos.gestionar'), null)).toBeNull()
    expect(motivoSinPermisoDelGrupo(tiene('flujos.configurar'), null)).toBe(
      MOTIVO_SIN_PERMISO_TIPOS_COMPARTIDOS,
    )
    expect(motivoSinPermisoDelGrupo(tiene(), null)).toBe(MOTIVO_SIN_PERMISO_TIPOS_COMPARTIDOS)
  })

  it('los de un flujo, con flujos o repuestos configurar o con los catálogos de logística (el origen lo decide la base)', () => {
    expect(motivoSinPermisoDelGrupo(tiene('flujos.configurar'), FLUJO)).toBeNull()
    expect(motivoSinPermisoDelGrupo(tiene('repuestos.configurar'), FLUJO)).toBeNull()
    expect(motivoSinPermisoDelGrupo(tiene('logistica.catalogos.gestionar'), FLUJO)).toBeNull()
    expect(motivoSinPermisoDelGrupo(tiene('logistica.ver'), FLUJO)).toBe(
      MOTIVO_SIN_PERMISO_TIPOS_DEL_FLUJO,
    )
  })
})

describe('comoResultado', () => {
  it('pone el motivo junto a su campo', () => {
    const error = { codigo: 'regla' as const, mensaje: 'Elige al menos un formato.' }
    expect(comoResultado({ ok: false, error, campo: 'formatos' })).toEqual({
      ok: false,
      error,
      porCampo: { formatos: 'Elige al menos un formato.' },
    })
    expect(comoResultado({ ok: false, error })).toEqual({ ok: false, error })
    // El rechazo de la base llega con su texto: el de un permiso por origen, o el nombre repetido en su campo.
    const sinPermiso = {
      codigo: 'sin_permiso' as const,
      mensaje: 'No puedes cambiar «BL»: lo usa Miami, donde no puedes configurar la logística.',
    }
    expect(comoResultado({ ok: false, error: sinPermiso })).toEqual({
      ok: false,
      error: sinPermiso,
    })
    const repetido = {
      codigo: 'duplicado' as const,
      mensaje: 'Ya hay un tipo de documento «BL» en Miami.',
    }
    expect(comoResultado({ ok: false, error: repetido, campo: 'nombre' })).toEqual({
      ok: false,
      error: repetido,
      porCampo: { nombre: repetido.mensaje },
    })
    expect(comoResultado({ ok: true, data: 1 })).toEqual({ ok: true, data: 1 })
  })
})
