import { describe, expect, it } from 'vitest'
import { claveDeNombre, nombreLimpio, sinTildes } from './nombre'

// Los mismos casos que `supabase/tests/areas/campos/grupos-catalogo.sql` prueba contra `_nombre_de_catalogo()`.
const MISMA_CLAVE = ['Datos', 'datos ', 'Dátos', 'DATOS', '  datos']

describe('claveDeNombre', () => {
  it('da la misma clave sin importar mayúsculas, tildes ni espacios de más', () => {
    for (const nombre of MISMA_CLAVE) {
      expect(claveDeNombre(nombre)).toBe('datos')
    }
    expect(claveDeNombre('Datos\t del  cliente')).toBe('datos del cliente')
    expect(claveDeNombre('Datos del Cliente')).toBe('datos del cliente')
  })

  it('la ñ pierde la virgulilla, como `unaccent`', () => {
    expect(claveDeNombre('Año')).toBe('ano')
    expect(claveDeNombre('Ano')).toBe('ano')
  })

  it('no junta lo que se escribe distinto', () => {
    expect(claveDeNombre('Datos del cliente')).not.toBe(claveDeNombre('Datosdel cliente'))
  })
})

describe('nombreLimpio', () => {
  it('deja un espacio entre palabras y ninguno en las puntas, con tabulaciones y saltos', () => {
    expect(nombreLimpio('  Datos\t del \n cliente  ')).toBe('Datos del cliente')
    expect(nombreLimpio('Datos')).toBe('Datos')
    expect(nombreLimpio('   ')).toBe('')
  })

  it('conserva mayúsculas y tildes: lo que se guarda es lo que se escribió, limpio', () => {
    expect(nombreLimpio(' Ubicación ')).toBe('Ubicación')
  })

  it('no toca un espacio que `btrim` tampoco quita (el de no separación)', () => {
    expect(nombreLimpio(' Datos')).toBe(' Datos')
  })
})

describe('sinTildes', () => {
  it('quita las marcas y pasa a minúsculas', () => {
    expect(sinTildes('Tracción')).toBe('traccion')
    expect(sinTildes('ÜÑÍ')).toBe('uni')
  })
})
