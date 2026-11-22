import { describe, expect, it } from 'vitest'
import { mismaVersionDelEditor, pideOtroEditor } from './version-del-editor'

const publicada = { estado: 'publicada', id: 'p1' } as const
const borrador = { estado: 'borrador', id: 'b1' } as const

describe('pideOtroEditor', () => {
  it('la misma versión no pide otro editor', () => {
    expect(mismaVersionDelEditor(borrador, { ...borrador })).toBe(true)
    expect(pideOtroEditor(borrador, { ...borrador })).toBe(false)
    expect(pideOtroEditor(null, null)).toBe(false)
  })

  it('su propio guardado sobre la publicada (crea el borrador) sigue con el mismo editor', () => {
    expect(pideOtroEditor(publicada, borrador)).toBe(false)
  })

  it('publicar o descartar el borrador pide otro editor', () => {
    expect(pideOtroEditor(borrador, { estado: 'publicada', id: 'p2' })).toBe(true)
    expect(pideOtroEditor(borrador, publicada)).toBe(true)
  })

  it('otro borrador u otra publicada piden otro editor', () => {
    expect(pideOtroEditor(borrador, { estado: 'borrador', id: 'b2' })).toBe(true)
    expect(pideOtroEditor(publicada, { estado: 'publicada', id: 'p2' })).toBe(true)
    expect(pideOtroEditor(borrador, null)).toBe(true)
  })
})
