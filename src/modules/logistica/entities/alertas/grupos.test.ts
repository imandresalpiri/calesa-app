import { describe, expect, it } from 'vitest'
import type { Permisos } from '@/shared/lib/permisos'
import {
  GRUPOS_DE_LA_BANDEJA,
  grupoDelSlug,
  gruposVisibles,
  rutaDelGrupoDeLaBandeja,
  slugDelGrupo,
  TITULO_DE_LOS_GRUPOS,
} from './grupos'

const concede = (clave: string, origenId: string | null = null): Permisos[number] => ({
  clave: clave as Permisos[number]['clave'],
  origenId,
  alcance: 'todos',
})

describe('los grupos de la bandeja', () => {
  it('son siete, en el orden del pedido, cada uno con su título', () => {
    expect(GRUPOS_DE_LA_BANDEJA).toEqual([
      'demorados',
      'trabados',
      'por_aprobar',
      'por_vencer',
      'llegadas',
      'salidas',
      'sin_resolver',
    ])
    expect(GRUPOS_DE_LA_BANDEJA.map((g) => TITULO_DE_LOS_GRUPOS[g])).toEqual([
      'Demorados',
      'Trabados',
      'Documentos por aprobar',
      'Documentos por vencer',
      'Llegadas esperadas',
      'Salen hoy',
      'Subastas sin resolver',
    ])
  })

  it('cada grupo tiene su nombre en la URL y se lee de vuelta; lo desconocido es nulo', () => {
    for (const grupo of GRUPOS_DE_LA_BANDEJA) expect(grupoDelSlug(slugDelGrupo(grupo))).toBe(grupo)
    expect(slugDelGrupo('por_aprobar')).toBe('por-aprobar')
    expect(grupoDelSlug('por_aprobar')).toBeNull()
    for (const malo of ['', 'otro', null, undefined]) expect(grupoDelSlug(malo)).toBeNull()
  })

  it('la ruta de un grupo lleva su origen y su cursor sólo si los hay', () => {
    const origen = '55555555-5555-4555-8555-555555555555'
    expect(rutaDelGrupoDeLaBandeja('demorados')).toBe('/logistica/bandeja/demorados')
    expect(rutaDelGrupoDeLaBandeja('por_vencer')).toBe('/logistica/bandeja/por-vencer')
    expect(rutaDelGrupoDeLaBandeja('llegadas', { origenId: origen })).toBe(
      `/logistica/bandeja/llegadas?origen=${origen}`,
    )
    expect(rutaDelGrupoDeLaBandeja('llegadas', { origenId: origen, cursor: 'abc_-' })).toBe(
      `/logistica/bandeja/llegadas?origen=${origen}&cursor=abc_-`,
    )
    expect(rutaDelGrupoDeLaBandeja('llegadas', { cursor: 'abc_-' })).toBe(
      '/logistica/bandeja/llegadas?cursor=abc_-',
    )
  })
})

describe('gruposVisibles', () => {
  it('sin logistica.ver no hay ninguno', () => {
    expect(gruposVisibles([])).toEqual([])
    expect(gruposVisibles([concede('documentos.ver')])).toEqual([])
  })

  it('con sólo logistica.ver (aunque sea en un origen) están los que no piden más', () => {
    expect(gruposVisibles([concede('logistica.ver', 'o1')])).toEqual([
      'demorados',
      'trabados',
      'llegadas',
      'salidas',
      'sin_resolver',
    ])
  })

  it('por aprobar pide aprobar y por vencer pide subir, cada uno el suyo', () => {
    const base = concede('logistica.ver')
    expect(gruposVisibles([base, concede('logistica.documentos.aprobar')])).toContain('por_aprobar')
    expect(gruposVisibles([base, concede('logistica.documentos.aprobar')])).not.toContain(
      'por_vencer',
    )
    expect(gruposVisibles([base, concede('logistica.documentos.subir')])).toContain('por_vencer')
    expect(gruposVisibles([base, concede('logistica.documentos.subir')])).not.toContain(
      'por_aprobar',
    )
    expect(
      gruposVisibles([
        base,
        concede('logistica.documentos.aprobar'),
        concede('logistica.documentos.subir'),
      ]),
    ).toEqual([...GRUPOS_DE_LA_BANDEJA])
  })

  it('en un origen mira los permisos de ese origen', () => {
    const permisos = [concede('logistica.ver', 'o1'), concede('logistica.documentos.aprobar', 'o2')]
    expect(gruposVisibles(permisos, 'o1')).not.toContain('por_aprobar')
    expect(gruposVisibles(permisos, 'o2')).toEqual([])
    expect(
      gruposVisibles([concede('logistica.ver'), concede('logistica.documentos.subir', 'o1')], 'o1'),
    ).toContain('por_vencer')
  })
})
