import { describe, expect, it } from 'vitest'
import {
  CLAVES_DE_FORMATO,
  esClaveDeFormato,
  FORMATOS_DE_ARTE,
  MENSAJE_DEL_LADO_PERSONALIZADO,
  medidasDelFormato,
  textoDelFormato,
  tipoDelFormato,
} from './formatos'

describe('formatos de arte', () => {
  it('cada clave tiene su formato, y los fijos sus medidas', () => {
    expect(FORMATOS_DE_ARTE.map((f) => f.clave)).toEqual([...CLAVES_DE_FORMATO])
    expect(medidasDelFormato('cuadrado')).toEqual({ ok: true, data: { ancho: 1080, alto: 1080 } })
    expect(medidasDelFormato('vertical')).toEqual({ ok: true, data: { ancho: 1080, alto: 1350 } })
    expect(medidasDelFormato('historia')).toEqual({ ok: true, data: { ancho: 1080, alto: 1920 } })
    expect(medidasDelFormato('horizontal')).toEqual({ ok: true, data: { ancho: 1200, alto: 630 } })
    expect(medidasDelFormato('pantalla')).toEqual({ ok: true, data: { ancho: 1920, alto: 1080 } })
  })

  it('un fijo ignora las medidas elegidas', () => {
    expect(medidasDelFormato('cuadrado', { ancho: 500, alto: 500 })).toEqual({
      ok: true,
      data: { ancho: 1080, alto: 1080 },
    })
  })

  it('los PDF se miden en puntos', () => {
    const pdf = FORMATOS_DE_ARTE.filter((f) => f.tipo === 'pdf')
    expect(pdf.map((f) => f.clave)).toEqual(['carta', 'a4'])
    expect(pdf.every((f) => f.unidad === 'pt')).toBe(true)
    expect(
      FORMATOS_DE_ARTE.filter((f) => f.tipo === 'imagen').every((f) => f.unidad === 'px'),
    ).toBe(true)
    expect(medidasDelFormato('carta')).toEqual({ ok: true, data: { ancho: 612, alto: 792 } })
    expect(medidasDelFormato('a4')).toEqual({ ok: true, data: { ancho: 595, alto: 842 } })
    expect(tipoDelFormato('a4')).toBe('pdf')
    expect(tipoDelFormato('historia')).toBe('imagen')
  })

  it('Personalizado admite de 320 a 4096 por lado, enteros', () => {
    const rechazado = {
      ok: false,
      error: { codigo: 'validacion', mensaje: MENSAJE_DEL_LADO_PERSONALIZADO },
    }
    expect(medidasDelFormato('personalizado', { ancho: 320, alto: 4096 })).toEqual({
      ok: true,
      data: { ancho: 320, alto: 4096 },
    })
    expect(medidasDelFormato('personalizado', { ancho: 319, alto: 1000 })).toEqual(rechazado)
    expect(medidasDelFormato('personalizado', { ancho: 1000, alto: 4097 })).toEqual(rechazado)
    expect(medidasDelFormato('personalizado', { ancho: 1000.5, alto: 1000 })).toEqual(rechazado)
    expect(medidasDelFormato('personalizado')).toEqual(rechazado)
    expect(MENSAJE_DEL_LADO_PERSONALIZADO).toBe('Cada lado va de 320 a 4096 px.')
  })

  it('el texto de la tarjeta', () => {
    expect(textoDelFormato('vertical', { ancho: 1080, alto: 1350 })).toBe('Vertical · 1080 × 1350')
    expect(textoDelFormato('personalizado', { ancho: 800, alto: 600 })).toBe(
      'Personalizado · 800 × 600',
    )
    expect(textoDelFormato('a4', { ancho: 595, alto: 842 })).toBe('A4 · PDF')
  })

  it('reconoce sólo las claves del catálogo', () => {
    expect(esClaveDeFormato('a4')).toBe(true)
    expect(esClaveDeFormato('A4')).toBe(false)
    expect(esClaveDeFormato('oficio')).toBe(false)
  })
})
