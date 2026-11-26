import { describe, expect, it } from 'vitest'
import { REGLAS_DE_DISENO, rechazoDeDiseno, fallo } from './motivos-de-diseno'

describe('motivos-de-diseno', () => {
  it('son 44 reglas, sin repetir, con la forma primero', () => {
    expect(REGLAS_DE_DISENO).toHaveLength(44)
    expect(new Set(REGLAS_DE_DISENO).size).toBe(44)
    expect(REGLAS_DE_DISENO[0]).toBe('forma')
  })

  it('cada regla tiene un mensaje, y nombra donde cuando lo hay', () => {
    for (const regla of REGLAS_DE_DISENO) {
      const r = rechazoDeDiseno(regla, { donde: 'xyz', ref: 'ref', nivel: 'niv', campo: 'a.b' })
      expect(r.mensaje.length, regla).toBeGreaterThan(10)
      expect(r.donde, regla).toBe('xyz')
      expect(r.campo !== undefined, regla).toBe(regla === 'forma')
    }
    expect(rechazoDeDiseno('modo_incompleto', {})).not.toHaveProperty('donde')
  })

  it('los mensajes hablan de tú, no de vos', () => {
    for (const regla of REGLAS_DE_DISENO) {
      const { mensaje } = rechazoDeDiseno(regla, { donde: 'a', ref: 'b', nivel: 'c', campo: 'd' })
      expect(mensaje, regla).not.toMatch(/\b(elegí|escribí|mirá|recargá|tenés|usá)\b/i)
    }
  })

  it('los de la cabecera nombran el modo y los de los enlaces, la celda', () => {
    const datos = { donde: 'cabecera', ref: 'paralelo' }
    expect(rechazoDeDiseno('modo_por_defecto_inexistente', datos).mensaje).toBe(
      'El modo por defecto «paralelo» no es un modo de la cabecera.',
    )
    expect(rechazoDeDiseno('modo_visible_repetido', datos).mensaje).toContain('«paralelo»')
    expect(rechazoDeDiseno('modo_por_defecto_oculto', datos).mensaje).toContain('«paralelo»')
    expect(rechazoDeDiseno('ayuda_enlace_no_https', { donde: 'remate' }).mensaje).toBe(
      'Un enlace de la ayuda de «remate» tiene que empezar con https:// y no llevar espacios.',
    )
  })

  it('fallo devuelve un rechazo con ok en falso', () => {
    expect(fallo('seccion_duplicada', { donde: 'a' })).toMatchObject({
      ok: false,
      error: { regla: 'seccion_duplicada', donde: 'a' },
    })
  })
})
