import { describe, expect, it } from 'vitest'
import {
  esquemaDelNombreDeArte,
  LARGO_MAXIMO_DEL_NOMBRE,
  MENSAJE_DEL_NOMBRE,
  nombreDeLaCopia,
  nombreDesdeElArchivo,
} from './nombres'

describe('nombres de arte', () => {
  it('la copia suma «(copia)»', () => {
    expect(nombreDeLaCopia('Promo de enero')).toBe('Promo de enero (copia)')
    expect(nombreDeLaCopia('  Promo  ')).toBe('Promo (copia)')
  })

  it('la copia de un nombre largo se recorta a 80 letras', () => {
    const largo = 'á'.repeat(LARGO_MAXIMO_DEL_NOMBRE)
    const copia = nombreDeLaCopia(largo)
    expect(Array.from(copia)).toHaveLength(LARGO_MAXIMO_DEL_NOMBRE)
    expect(copia.endsWith(' (copia)')).toBe(true)
    expect(esquemaDelNombreDeArte.safeParse(copia).success).toBe(true)
  })

  it('el nombre va de 1 a 80 letras sin los bordes', () => {
    expect(esquemaDelNombreDeArte.parse('  Hola ')).toBe('Hola')
    expect(esquemaDelNombreDeArte.safeParse('ñ'.repeat(80)).success).toBe(true)
    const vacio = esquemaDelNombreDeArte.safeParse('   ')
    expect(vacio.success).toBe(false)
    expect(vacio.error?.issues[0]?.message).toBe(MENSAJE_DEL_NOMBRE)
    expect(esquemaDelNombreDeArte.safeParse('a'.repeat(81)).success).toBe(false)
  })

  it('el nombre de una imagen sale del archivo', () => {
    expect(nombreDesdeElArchivo('logo-agencia.PNG')).toBe('logo-agencia')
    expect(nombreDesdeElArchivo('.png')).toBe('Imagen')
    expect(Array.from(nombreDesdeElArchivo(`${'x'.repeat(100)}.webp`))).toHaveLength(80)
  })
})
