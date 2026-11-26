import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { Concesion, Permisos } from '@/shared/lib/permisos'
import { BLOQUES_DE_LA_FICHA, anclaDeLaUrl, bloquesDeQuienMira } from './bloques'

const ORIGEN = '00000000-0000-4000-8000-0000000000c1'
const OTRO = '00000000-0000-4000-8000-0000000000c2'

const de = (clave: Concesion['clave'], origenId: string | null = null): Concesion => ({
  clave,
  origenId,
  alcance: 'todos',
})

const anclas = (permisos: Permisos) => bloquesDeQuienMira(permisos, ORIGEN).map((b) => b.ancla)

const TODOS: Permisos = [de('cotizaciones.ver', ORIGEN), de('leads.ver'), de('actividad.ver')]

describe('los bloques de la ficha de un vehículo', () => {
  it('con todo, los tres de ventas en el orden del índice', () => {
    expect(anclas(TODOS)).toEqual(['cotizaciones', 'relacionados', 'actividad'])
    expect(BLOQUES_DE_LA_FICHA.map((b) => b.ancla)).toEqual(anclas(TODOS))
    expect(BLOQUES_DE_LA_FICHA.map((b) => b.etiqueta)).toEqual([
      'Cotizaciones',
      'Relacionados',
      'Actividad',
    ])
  })

  it('«Vitrina» ya no es un bloque: ni con todos los permisos', () => {
    expect(anclas([...TODOS, de('vehiculos.vitrina', ORIGEN)])).not.toContain('vitrina')
    expect(BLOQUES_DE_LA_FICHA.map((b) => b.ancla)).not.toContain('vitrina')
  })

  it('sin nada, ninguno (sin índice)', () => {
    expect(anclas([])).toEqual([])
  })

  it('cada bloque por su permiso, solo', () => {
    expect(anclas([de('cotizaciones.ver', ORIGEN)])).toEqual(['cotizaciones'])
    expect(anclas([de('leads.ver')])).toEqual(['relacionados'])
    expect(anclas([de('actividad.ver')])).toEqual(['actividad'])
  })

  it('`cotizaciones.ver` cuenta sólo en el origen del vehículo', () => {
    expect(anclas([de('cotizaciones.ver', OTRO)])).toEqual([])
  })

  it('lo de logística y repuestos ya no abre ningún bloque', () => {
    expect(anclas([de('logistica.ver', ORIGEN), de('repuestos.ver')])).toEqual([])
  })

  it('«Actividad reciente» lee en el servidor con su archivo', () => {
    expect(existsSync('src/app/(app)/vehiculos/[id]/bloque-actividad.tsx')).toBe(true)
  })
})

describe('a qué bloque lleva la URL', () => {
  const visibles = bloquesDeQuienMira(TODOS, ORIGEN)
  const url = (cambios: Partial<Parameters<typeof anclaDeLaUrl>[0]>) => ({
    seccion: undefined,
    panel: undefined,
    relacionados: undefined,
    ...cambios,
  })

  it('cada `?seccion=` de un bloque, a su bloque', () => {
    for (const seccion of ['cotizaciones', 'relacionados', 'actividad']) {
      expect(anclaDeLaUrl(url({ seccion }), visibles)).toBe(seccion)
    }
  })

  it('una `?seccion=` que no es un bloque de la derecha no lleva a ningún ancla', () => {
    for (const seccion of ['fotos', 'ficha', 'vitrina', 'documentos', 'fase', 'repuestos']) {
      expect(anclaDeLaUrl(url({ seccion }), visibles), seccion).toBeNull()
    }
  })

  it('una sección sin permiso o que no existe: arriba de todo', () => {
    const sinCotizaciones = bloquesDeQuienMira([de('leads.ver')], ORIGEN)
    expect(anclaDeLaUrl(url({ seccion: 'cotizaciones' }), sinCotizaciones)).toBeNull()
    expect(anclaDeLaUrl(url({ seccion: 'actividad' }), sinCotizaciones)).toBeNull()
    expect(anclaDeLaUrl(url({ seccion: 'basura' }), visibles)).toBeNull()
    expect(anclaDeLaUrl(url({}), visibles)).toBeNull()
  })

  it('los paneles de «Relacionados» y `?relacionados=` llevan a «Relacionados»', () => {
    for (const panel of ['desvincular', 'vincular-lead', 'marcar-interesado']) {
      expect(anclaDeLaUrl(url({ panel }), visibles)).toBe('relacionados')
    }
    expect(anclaDeLaUrl(url({ relacionados: 'interesado' }), visibles)).toBe('relacionados')
    expect(anclaDeLaUrl(url({ panel: 'vitrina' }), visibles)).toBeNull()
    expect(anclaDeLaUrl(url({ panel: 'desvincular' }), bloquesDeQuienMira([], ORIGEN))).toBeNull()
  })

  it('`seccion` gana a `panel`', () => {
    expect(anclaDeLaUrl(url({ seccion: 'actividad', panel: 'desvincular' }), visibles)).toBe(
      'actividad',
    )
  })
})
