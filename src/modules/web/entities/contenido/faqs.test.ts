import { describe, expect, it } from 'vitest'
import {
  cambiosDeFaq,
  faqsDesde,
  ordenSiguiente,
  reordenar,
  validarFaq,
  VALORES_DE_FAQ_NUEVA,
  type Faq,
} from './faqs'

const faq = (n: number, orden: number, resto: Partial<Faq> = {}): Faq => ({
  id: `00000000-0000-4000-8000-00000000000${String(n)}`,
  pregunta: `Pregunta ${String(n)}`,
  respuesta: 'Respuesta',
  categoriaId: null,
  categoria: null,
  categoriaInactiva: false,
  publicada: false,
  orden,
  actualizadoEn: `2026-11-12T10:00:0${String(n)}+00:00`,
  ...resto,
})

describe('reordenar', () => {
  const tres = [faq(1, 0), faq(2, 1), faq(3, 2)]

  it('sube la del medio: intercambia con la primera', () => {
    const cambios = reordenar(tres, tres[1]!.id, 'subir')
    expect(cambios.map((c) => [c.id, c.orden])).toEqual([
      [tres[1]!.id, 0],
      [tres[0]!.id, 1],
    ])
  })

  it('baja la del medio: intercambia con la última', () => {
    const cambios = reordenar(tres, tres[1]!.id, 'bajar')
    expect(cambios.map((c) => [c.id, c.orden])).toEqual([
      [tres[2]!.id, 1],
      [tres[1]!.id, 2],
    ])
  })

  it('la primera no sube y la última no baja', () => {
    expect(reordenar(tres, tres[0]!.id, 'subir')).toEqual([])
    expect(reordenar(tres, tres[2]!.id, 'bajar')).toEqual([])
  })

  it('un id que no está no cambia nada', () => {
    expect(reordenar(tres, '00000000-0000-4000-8000-0000000000ff', 'subir')).toEqual([])
  })

  it('los orden repetidos se renumeran 0…n−1', () => {
    const repetidas = [faq(1, 0), faq(2, 0), faq(3, 0)]
    const cambios = reordenar(repetidas, repetidas[2]!.id, 'subir')
    // Queda 1, 3, 2: la 1 conserva el 0; la 3 pasa a 1 y la 2 a 2 (en el orden nuevo).
    expect(cambios.map((c) => [c.id, c.orden])).toEqual([
      [repetidas[2]!.id, 1],
      [repetidas[1]!.id, 2],
    ])
  })

  it('manda con cada fila la versión que se vio', () => {
    const [primera] = reordenar(tres, tres[1]!.id, 'subir')
    expect(primera?.id).toBe(tres[1]!.id)
    expect(primera?.actualizadoEn).toBe(tres[1]!.actualizadoEn)
  })
})

describe('ordenSiguiente', () => {
  it('0 sin preguntas; el máximo + 1 con ellas', () => {
    expect(ordenSiguiente([])).toBe(0)
    expect(ordenSiguiente([faq(1, 4), faq(2, 1)])).toBe(5)
  })
})

describe('validarFaq y cambiosDeFaq', () => {
  it('pide pregunta y respuesta', () => {
    const r = validarFaq(VALORES_DE_FAQ_NUEVA)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(Object.keys(r.errores).sort()).toEqual(['pregunta', 'respuesta'])
  })

  it('recorta el texto y manda la categoría elegida tal cual', () => {
    const r = validarFaq({
      pregunta: ' ¿Hola? ',
      respuesta: ' Sí ',
      categoriaId: '0b7a8c1e-2f4d-4c6b-9a1e-3d5f7b9c1a2e',
      publicada: false,
    })
    expect(r).toEqual({
      ok: true,
      datos: {
        pregunta: '¿Hola?',
        respuesta: 'Sí',
        categoriaId: '0b7a8c1e-2f4d-4c6b-9a1e-3d5f7b9c1a2e',
        publicada: false,
      },
    })
  })

  it('sólo manda lo que cambió', () => {
    const original = faq(1, 0)
    expect(
      cambiosDeFaq(original, {
        ...original,
        categoriaId: '0b7a8c1e-2f4d-4c6b-9a1e-3d5f7b9c1a2e',
        publicada: false,
      }),
    ).toEqual({
      categoriaId: '0b7a8c1e-2f4d-4c6b-9a1e-3d5f7b9c1a2e',
    })
    expect(cambiosDeFaq(original, { ...original })).toBeNull()
  })
})

describe('faqsDesde', () => {
  it('lee las filas y rechaza una mal formada', () => {
    const fila = {
      id: '00000000-0000-4000-8000-000000000001',
      pregunta: 'P',
      respuesta: 'R',
      categoria_id: null,
      categoria: null,
      publicada: true,
      orden: 0,
      actualizado_en: '2026-11-12T10:00:00+00:00',
    }
    expect(faqsDesde([fila])?.[0]?.actualizadoEn).toBe('2026-11-12T10:00:00+00:00')
    expect(faqsDesde([{ ...fila, orden: 'x' }])).toBeNull()
  })

  it('trae el nombre de su categoría y si está inactiva', () => {
    const fila = {
      id: '00000000-0000-4000-8000-000000000001',
      pregunta: 'P',
      respuesta: 'R',
      categoria_id: '0b7a8c1e-2f4d-4c6b-9a1e-3d5f7b9c1a2e',
      categoria: { nombre: 'Envíos', activa: false },
      publicada: true,
      orden: 0,
      actualizado_en: '2026-11-12T10:00:00+00:00',
    }
    expect(faqsDesde([fila])?.[0]).toMatchObject({
      categoriaId: '0b7a8c1e-2f4d-4c6b-9a1e-3d5f7b9c1a2e',
      categoria: 'Envíos',
      categoriaInactiva: true,
    })
  })
})
