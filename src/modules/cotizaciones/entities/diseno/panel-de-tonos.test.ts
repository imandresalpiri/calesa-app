import { describe, expect, it } from 'vitest'
import {
  MOTIVO_DE_TONO_NO_DISPONIBLE,
  firmaDeTonos,
  hayCambiosEnElTono,
  motivoParaNoAbrirTono,
  motivoParaNoEliminarTono,
  resumirColores,
} from './panel-de-tonos'
import { derivarColores } from '../colores'
import type { Tono } from './tonos'

const tono = (id: string, nombre = 'Dorado', hora = 'h1'): Tono => ({
  id,
  clave: nombre.toLowerCase(),
  nombre,
  hex: '#fff7d6',
  actualizadoEn: hora,
  colores: derivarColores('#fff7d6'),
})

describe('el panel de colores', () => {
  it('abrir: «Nuevo» no abre en el tope; «Editar» no abre uno que no está', () => {
    const lleno = { tope: 2, tonos: [tono('a'), tono('b', 'Verde')] }
    expect(motivoParaNoAbrirTono(lleno, 'nuevo', null)).toBe(
      'Ya hay 2 colores, que es el máximo. Elimina uno que ningún grupo use.',
    )
    expect(motivoParaNoAbrirTono({ ...lleno, tope: 3 }, 'nuevo', null)).toBeNull()
    expect(motivoParaNoAbrirTono(lleno, 'editar', 'a')).toBeNull()
    expect(motivoParaNoAbrirTono(lleno, 'editar', 'z')).toBe(MOTIVO_DE_TONO_NO_DISPONIBLE)
    expect(motivoParaNoAbrirTono(lleno, 'editar', null)).toBe(MOTIVO_DE_TONO_NO_DISPONIBLE)
    expect(motivoParaNoAbrirTono(lleno, null, null)).toBeNull()
    expect(motivoParaNoEliminarTono(lleno.tonos, 'b')).toBeNull()
    expect(motivoParaNoEliminarTono(lleno.tonos, 'z')).toBe(MOTIVO_DE_TONO_NO_DISPONIBLE)
    expect(MOTIVO_DE_TONO_NO_DISPONIBLE).toBe(
      'Ese color ya no existe. Recarga para ver cómo quedó.',
    )
  })

  it('la firma cambia con la versión de un color, con uno que falta o con el tope', () => {
    const base = { tope: 48, tonos: [tono('a'), tono('b')] }
    const firma = firmaDeTonos(base)
    expect(firmaDeTonos({ ...base, tonos: [tono('a'), tono('b')] })).toBe(firma)
    expect(firmaDeTonos({ ...base, tonos: [tono('a'), tono('b', 'Dorado', 'h2')] })).not.toBe(firma)
    expect(firmaDeTonos({ ...base, tonos: [tono('a')] })).not.toBe(firma)
    expect(firmaDeTonos({ ...base, tope: 10 })).not.toBe(firma)
  })

  it('hay cambios si el nombre o el hex difieren; los espacios y las mayúsculas no cuentan', () => {
    const original = tono('a')
    expect(hayCambiosEnElTono(original, '  Dorado ', '#fff7d6')).toBe(false)
    expect(hayCambiosEnElTono(original, 'Otro', '#fff7d6')).toBe(true)
    expect(hayCambiosEnElTono(original, 'Dorado', ' #FFF7D6 ')).toBe(false)
    expect(hayCambiosEnElTono(original, 'Dorado', '#ffffff')).toBe(true)
    // Al crear: nada escrito = el color de partida y un nombre vacío.
    expect(hayCambiosEnElTono(null, '', '#31869b')).toBe(false)
    expect(hayCambiosEnElTono(null, 'Nuevo', '#31869b')).toBe(true)
    expect(hayCambiosEnElTono(null, '', '#000000')).toBe(true)
  })

  it('la tarjeta: muestra los primeros y cuenta cuántos quedan fuera, sólo de lo leído', () => {
    const ocho = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((id) => tono(id, id.toUpperCase()))
    const { visibles, mas } = resumirColores(ocho, 6)
    expect(visibles.map((t) => t.id)).toEqual(['a', 'b', 'c', 'd', 'e', 'f'])
    expect(mas).toBe(2)
    expect(resumirColores(ocho.slice(0, 6), 6)).toEqual({ visibles: ocho.slice(0, 6), mas: 0 })
    expect(resumirColores([], 6)).toEqual({ visibles: [], mas: 0 })
  })
})
