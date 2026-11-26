import { describe, expect, it } from 'vitest'
import { claveDeCatalogo, type FilaPropiaOCompartida } from '@/shared/lib/catalogos/propios'
import {
  alcanceDelCatalogo,
  alcanceLibre,
  nombreConOrigen,
  rotuloPorOrigen,
} from './alcance-del-catalogo'

const A = '00000000-0000-4000-8000-00000000000a'
const B = '00000000-0000-4000-8000-00000000000b'
const fila = (
  id: string,
  origenId: string | null,
  nombre: string,
  activo = true,
): FilaPropiaOCompartida => ({
  id,
  origenId,
  clave: claveDeCatalogo(nombre),
  activo,
})
const FILAS = [
  fila('arica', null, 'Arica'),
  fila('iquique', null, 'Iquique'),
  fila('arica-a', A, 'ARICA'),
  fila('mejillones-b', B, 'Mejillones'),
]
const ids = (s: ReadonlySet<string>) => [...s].sort()

describe('alcanceDelCatalogo', () => {
  it('con un origen: lo que usa, el compartido que tapa y los propios de otro', () => {
    const a = alcanceDelCatalogo(FILAS, [A])
    expect(ids(a.usables)).toEqual(['arica-a', 'iquique'])
    expect(ids(a.tapados)).toEqual(['arica'])
    expect(ids(a.ajenos)).toEqual(['mejillones-b'])
  })

  it('con varios: sólo los compartidos que no tapa ninguno; todo propio es ajeno', () => {
    const a = alcanceDelCatalogo(FILAS, [A, B, A])
    expect(ids(a.usables)).toEqual(['iquique'])
    expect(ids(a.tapados)).toEqual(['arica'])
    expect(ids(a.ajenos)).toEqual(['arica-a', 'mejillones-b'])
  })

  it('un ítem de repuestos (sin origen) sólo usa compartidos, también junto a unidades de un origen', () => {
    expect(ids(alcanceDelCatalogo(FILAS, [null]).usables)).toEqual(['arica', 'iquique'])
    expect(ids(alcanceDelCatalogo(FILAS, [A, null]).usables)).toEqual(['iquique'])
  })

  it('el libre usa todo lo leído', () => {
    expect(ids(alcanceLibre(FILAS).usables)).toEqual([
      'arica',
      'arica-a',
      'iquique',
      'mejillones-b',
    ])
  })
})

describe('nombreConOrigen y rotuloPorOrigen', () => {
  it('un propio lleva su origen; un compartido no', () => {
    expect(nombreConOrigen({ nombre: 'Arica', origenNombre: 'Chile' })).toBe('Arica · Chile')
    expect(nombreConOrigen({ nombre: 'Arica', origenNombre: null })).toBe('Arica')
  })

  it('rotula lo ajeno y lo tapado según el género; lo demás, nada', () => {
    const a = alcanceDelCatalogo(FILAS, [A])
    expect(rotuloPorOrigen(a, 'mejillones-b', true)).toBe('(de otro origen)')
    expect(rotuloPorOrigen(a, 'arica', false)).toBe('(tapado)')
    expect(rotuloPorOrigen(a, 'arica', true)).toBe('(tapada)')
    expect(rotuloPorOrigen(a, 'iquique', true)).toBeNull()
  })
})
