import { describe, expect, it } from 'vitest'
import type { CapaConImagen } from '../documento'
import { fuenteDeLaCapa } from './fuente-de-la-capa'

const BASE = {
  id: 'c',
  nombre: null,
  grupoId: null,
  x: 0,
  y: 0,
  ancho: 100,
  alto: 100,
  rotacion: 0,
  opacidad: 1,
  bloqueada: false,
  oculta: false,
  sombra: null,
  radio: 0,
  borde: null,
  grosor: 0,
}
const LOGOS = [
  { id: 'principal', nombre: 'Principal', ancho: null, alto: null },
  { id: '7c0e6a1e-2f9b-4c1d-9a51-111111111111', nombre: 'Blanco', ancho: 400, alto: 120 },
]
const ID = '00000000-0000-0000-0000-0000000000a1'

describe('fuenteDeLaCapa', () => {
  it('la biblioteca y el logo, por sus rutas del mismo origen', () => {
    const imagen: CapaConImagen = { ...BASE, tipo: 'imagen', imagenId: ID, ajuste: 'cubrir' }
    expect(fuenteDeLaCapa(imagen, LOGOS)).toEqual({ src: `/artes/imagenes/${ID}`, medidas: null })
    const logo: CapaConImagen = { ...BASE, tipo: 'logo', varianteId: LOGOS[1]?.id ?? null }
    expect(fuenteDeLaCapa(logo, LOGOS)).toEqual({
      src: `/artes/logos/${LOGOS[1]?.id ?? ''}`,
      medidas: { ancho: 400, alto: 120 },
    })
  })

  it('el logo sin variante es el principal, y una fija no tiene medidas', () => {
    const logo: CapaConImagen = { ...BASE, tipo: 'logo', varianteId: null }
    expect(fuenteDeLaCapa(logo, LOGOS)).toEqual({ src: '/artes/logos/principal', medidas: null })
  })

  it('las fotos y la tarjeta, de los datos de ejemplo', () => {
    const foto: CapaConImagen = { ...BASE, tipo: 'foto', indice: 4, ajuste: 'cubrir' }
    expect(fuenteDeLaCapa(foto, [])).toEqual({
      src: '/artes/ejemplo/foto-2.svg',
      medidas: { ancho: 1600, alto: 1067 },
    })
    const tarjeta: CapaConImagen = { ...BASE, tipo: 'tarjeta' }
    expect(fuenteDeLaCapa(tarjeta, []).src).toBe('/artes/ejemplo/tarjeta.svg')
  })
})
