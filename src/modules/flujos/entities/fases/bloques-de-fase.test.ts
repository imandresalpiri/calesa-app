import { describe, expect, it } from 'vitest'
import {
  BLOQUES_DE_FASE,
  CAMPOS_DEL_BLOQUE,
  PESTANAS_DE_FASE,
  PESTANA_DEL_BLOQUE,
  CAMPOS_EN_ORDEN_VISUAL,
  ID_DE_CAMPO_DE_FASE,
  bloqueDelCampo,
  bloquesConError,
  pestanaDelCampo,
  pestanaPedida,
  pestanasDeLosCampos,
  primerCampoConError,
} from './bloques-de-fase'
import { CAMPOS_DE_FASE } from './reglas-de-fase'

describe('bloques de la fase', () => {
  it('cada campo de la fase está en un bloque, y sólo en uno', () => {
    expect([...CAMPOS_EN_ORDEN_VISUAL].sort()).toEqual([...CAMPOS_DE_FASE].sort())
    for (const campo of CAMPOS_DE_FASE) {
      const donde = BLOQUES_DE_FASE.filter((b) => CAMPOS_DEL_BLOQUE[b].includes(campo))
      expect(donde).toHaveLength(1)
      expect(bloqueDelCampo(campo)).toBe(donde[0])
    }
  })

  it('cada campo tiene su propio id', () => {
    const ids = Object.values(ID_DE_CAMPO_DE_FASE)
    expect(new Set(ids).size).toBe(CAMPOS_DE_FASE.length)
    expect(ID_DE_CAMPO_DE_FASE.alias_portal).toBe('fase-alias-portal')
  })

  it('el primer error es el primero que se ve, no el primero que se escribió', () => {
    expect(primerCampoConError({})).toBeNull()
    expect(primerCampoConError({ alias_portal: 'sin alias', es_final: 'inicial y final' })).toBe(
      'es_final',
    )
    expect(primerCampoConError({ alias_portal: 'x', nombre: 'y' })).toBe('nombre')
  })

  it('un bloque con un error no se pliega', () => {
    expect([...bloquesConError({})]).toEqual([])
    expect([...bloquesConError({ es_final: 'x', alias_portal: 'y', visible_portal: 'z' })]).toEqual(
      ['en-el-flujo', 'web-y-portal'],
    )
  })

  it('cada bloque está en una pestaña, y «Reglas» no tiene campos del formulario', () => {
    for (const bloque of BLOQUES_DE_FASE) {
      expect(PESTANAS_DE_FASE).toContain(PESTANA_DEL_BLOQUE[bloque])
      expect(PESTANA_DEL_BLOQUE[bloque]).not.toBe('reglas')
    }
    expect(PESTANAS_DE_FASE[0]).toBe('reglas')
  })

  it('cada campo con error lleva a la pestaña de su bloque', () => {
    for (const campo of CAMPOS_DE_FASE) {
      expect(pestanaDelCampo(campo), campo).toBe(PESTANA_DEL_BLOQUE[bloqueDelCampo(campo)])
    }
    expect(pestanaDelCampo('nombre')).toBe('identidad')
    expect(pestanaDelCampo('icono')).toBe('identidad')
    expect(pestanaDelCampo('es_final')).toBe('ajustes')
    expect(pestanaDelCampo('alerta_cada_horas')).toBe('ajustes')
    expect(pestanaDelCampo('permite_aduana')).toBe('ajustes')
    expect(pestanaDelCampo('alias_portal')).toBe('ajustes')
  })

  it('marca las pestañas que tienen un campo con error o con cambios', () => {
    expect([...pestanasDeLosCampos([])]).toEqual([])
    expect([...pestanasDeLosCampos(['es_final', 'alias_portal'])]).toEqual(['ajustes'])
    expect([...pestanasDeLosCampos(['alias_portal', 'nombre'])].sort()).toEqual([
      'ajustes',
      'identidad',
    ])
  })

  it('la URL pide una pestaña; sin ella o con otro valor, Reglas', () => {
    expect(pestanaPedida(null)).toBe('reglas')
    expect(pestanaPedida(undefined)).toBe('reglas')
    expect(pestanaPedida('')).toBe('reglas')
    expect(pestanaPedida('datos')).toBe('reglas')
    expect(pestanaPedida('Identidad')).toBe('reglas')
    expect(pestanaPedida('reglas')).toBe('reglas')
    expect(pestanaPedida('identidad')).toBe('identidad')
    expect(pestanaPedida('ajustes')).toBe('ajustes')
  })
})
