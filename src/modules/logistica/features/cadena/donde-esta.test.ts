import { describe, expect, it, vi } from 'vitest'
import { dondeEstaDe } from './donde-esta'

const ORIGEN = '4a1b2c3d-0000-4000-8000-000000000001'
const vacio = { ok: true as const, data: { unidades: [], hayMas: false } }

describe('dondeEstaDe', () => {
  it('un texto corto no llama a la base y devuelve vacío', async () => {
    const lector = vi.fn().mockResolvedValue(vacio)
    for (const corto of ['', '  ', 'ab', ' a ']) {
      expect(await dondeEstaDe(lector, corto, ORIGEN)).toEqual(vacio)
    }
    expect(lector).not.toHaveBeenCalled()
  })

  it('un texto que alcanza llama a la base, recortado', async () => {
    const lector = vi.fn().mockResolvedValue(vacio)
    await dondeEstaDe(lector, '  hilux  ', ORIGEN)
    expect(lector).toHaveBeenCalledWith('hilux', ORIGEN)
  })

  it('sin origen busca en todos los de la persona', async () => {
    const lector = vi.fn().mockResolvedValue(vacio)
    await dondeEstaDe(lector, 'hilux', null)
    expect(lector).toHaveBeenCalledWith('hilux', null)
  })

  it('uno de más de 100 caracteres se recorta a 100', async () => {
    const lector = vi.fn().mockResolvedValue(vacio)
    await dondeEstaDe(lector, 'a'.repeat(300), ORIGEN)
    expect(lector).toHaveBeenCalledWith('a'.repeat(100), ORIGEN)
  })

  it('el error de la base sube como valor', async () => {
    const error = { ok: false as const, error: { codigo: 'inesperado' as const, mensaje: 'x' } }
    expect(await dondeEstaDe(vi.fn().mockResolvedValue(error), 'hilux', ORIGEN)).toEqual(error)
  })
})
