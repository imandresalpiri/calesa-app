import { describe, expect, it } from 'vitest'
import {
  borradorDePuerto,
  BORRADOR_NUEVO_DE_PUERTO,
  cambiosDeNaviera,
  cambiosDePuerto,
  navierasDesde,
  ordenarPuertos,
  puertosDesde,
  textoDeUso,
  usoDelPuerto,
  validarNaviera,
  validarPuerto,
  type BorradorDePuerto,
  type PuertoDeCatalogo,
} from './catalogo'

const ID = '5f0d0b0e-6a39-4f0e-9a39-0b6f9a1c2d3e'
const ORIGEN = '00000000-0000-4000-8000-00000000000a'
const VERSION = '2026-11-25T12:00:00.000000+00:00'

const borrador = (p: Partial<BorradorDePuerto> = {}): BorradorDePuerto => ({
  ...BORRADOR_NUEVO_DE_PUERTO,
  nombre: 'San Antonio',
  ...p,
})

const puerto = (p: Partial<PuertoDeCatalogo> = {}): PuertoDeCatalogo => ({
  id: ID,
  origenId: null,
  nombre: 'San Antonio',
  pais: 'Chile',
  codigo: 'CLSAI',
  activo: true,
  orden: 0,
  actualizadoEn: VERSION,
  ...p,
})

const errores = (b: BorradorDePuerto) => {
  const r = validarPuerto(b)
  return r.ok ? {} : r.errores
}

describe('validarPuerto', () => {
  it('rechaza un nombre vacío o de 81 caracteres y acepta uno de 80', () => {
    expect(errores(borrador({ nombre: '   ' }))['nombre']).toBe('Escribe el nombre.')
    expect(errores(borrador({ nombre: 'a'.repeat(81) }))['nombre']).toContain('80')
    expect(validarPuerto(borrador({ nombre: 'a'.repeat(80) })).ok).toBe(true)
  })

  it('recorta y colapsa los espacios del nombre y del país', () => {
    const r = validarPuerto(borrador({ nombre: '  Puerto   de  Arica ', pais: ' Chile  ' }))
    expect(r.ok && r.datos.nombre).toBe('Puerto de Arica')
    expect(r.ok && r.datos.pais).toBe('Chile')
  })

  it('guarda el código en mayúsculas y sin espacios, y vacío es sin código', () => {
    const r = validarPuerto(borrador({ codigo: ' cl sai ' }))
    expect(r.ok && r.datos.codigo).toBe('CLSAI')
    const vacio = validarPuerto(borrador({ codigo: '  ', pais: '' }))
    expect(vacio.ok && vacio.datos.codigo).toBeNull()
    expect(vacio.ok && vacio.datos.pais).toBeNull()
    expect(errores(borrador({ codigo: 'x'.repeat(13) }))['codigo']).toContain('12')
  })

  it('el orden es un entero de 0 a 32.767; vacío es 0', () => {
    expect(validarPuerto(borrador({ orden: '' })).ok).toBe(true)
    expect(validarPuerto(borrador({ orden: '32767' })).ok).toBe(true)
    for (const malo of ['32768', '-1', '1,5', 'a']) {
      expect(errores(borrador({ orden: malo }))['orden']).toContain('32767')
    }
  })

  it('un país de más de 60 letras se rechaza', () => {
    expect(errores(borrador({ pais: 'p'.repeat(61) }))['pais']).toContain('60')
  })
})

describe('validarNaviera', () => {
  it('normaliza el nombre y rechaza uno vacío o largo', () => {
    const r = validarNaviera({ nombre: '  Hapag   Lloyd ', activo: true })
    expect(r.ok && r.datos.nombre).toBe('Hapag Lloyd')
    expect(validarNaviera({ nombre: '', activo: true }).ok).toBe(false)
    expect(validarNaviera({ nombre: 'n'.repeat(81), activo: true }).ok).toBe(false)
  })
})

describe('cambiosDePuerto y cambiosDeNaviera', () => {
  it('mandan sólo lo que cambió y nada si no hay diferencia', () => {
    const original = puerto()
    const datos = { nombre: 'San Antonio', pais: 'Chile', codigo: 'CLSAI', activo: true, orden: 0 }
    expect(cambiosDePuerto(original, datos)).toBeNull()
    expect(cambiosDePuerto(original, { ...datos, activo: false, orden: 3 })).toEqual({
      activo: false,
      orden: 3,
    })
    expect(cambiosDePuerto(original, { ...datos, codigo: null })).toEqual({ codigo: null })
    const naviera = {
      id: ID,
      origenId: null,
      nombre: 'Maersk',
      activo: true,
      actualizadoEn: VERSION,
    }
    expect(cambiosDeNaviera(naviera, { nombre: 'Maersk', activo: true })).toBeNull()
    expect(cambiosDeNaviera(naviera, { nombre: 'Maersk', activo: false })).toEqual({
      activo: false,
    })
  })

  it('borradorDePuerto devuelve el formulario de lo guardado', () => {
    expect(borradorDePuerto(puerto({ pais: null, codigo: null, orden: 4 }))).toEqual({
      nombre: 'San Antonio',
      pais: '',
      codigo: '',
      orden: '4',
      activo: true,
    })
  })
})

describe('textoDeUso', () => {
  it('un puerto «lo», una naviera «la»; lo usan transportes u ofertas', () => {
    expect(textoDeUso('Arica', 12, false)).toBe(
      'Desactivaste «Arica»: lo usan 12 transportes u ofertas; siguen mostrándolo.',
    )
    expect(textoDeUso('Maersk', 1, true)).toBe(
      'Desactivaste «Maersk»: la usa 1 transporte u oferta; sigue mostrándola.',
    )
  })
})

describe('usoDelPuerto', () => {
  it('junta país y código, sólo lo que tenga, y dice «Sin país» si no hay nada', () => {
    expect(usoDelPuerto({ pais: 'Chile', codigo: 'CLSAI' })).toBe('Chile · CLSAI')
    expect(usoDelPuerto({ pais: 'Chile', codigo: null })).toBe('Chile')
    expect(usoDelPuerto({ pais: null, codigo: 'CLSAI' })).toBe('CLSAI')
    expect(usoDelPuerto({ pais: null, codigo: null })).toBe('Sin país')
  })
})

describe('lectura de filas y orden', () => {
  it('puertosDesde y navierasDesde leen el origen y la versión, y dan nulo si una fila no tiene la forma', () => {
    const fila = {
      id: ID,
      origen_id: ORIGEN,
      nombre: 'San Antonio',
      pais: 'Chile',
      codigo: 'CLSAI',
      activo: true,
      orden: 0,
      actualizado_en: VERSION,
    }
    expect(puertosDesde([fila])).toEqual([puerto({ origenId: ORIGEN })])
    expect(puertosDesde([{ ...fila, origen_id: null }])).toEqual([puerto()])
    expect(puertosDesde([{ id: ID }])).toBeNull()
    expect(puertosDesde([{ ...fila, actualizado_en: undefined }])).toBeNull()
    const naviera = { id: ID, origen_id: null, nombre: 'M', activo: true, actualizado_en: VERSION }
    expect(navierasDesde([naviera])).toEqual([
      { id: ID, origenId: null, nombre: 'M', activo: true, actualizadoEn: VERSION },
    ])
    expect(navierasDesde([{ ...naviera, id: 'x' }])).toBeNull()
    expect(navierasDesde([{ ...naviera, origen_id: 'x' }])).toBeNull()
  })

  it('los puertos van por orden y luego por nombre', () => {
    const lista = ordenarPuertos([
      puerto({ id: 'b', nombre: 'Zárate', orden: 0 }),
      puerto({ id: 'a', nombre: 'Árica', orden: 0 }),
      puerto({ id: 'c', nombre: 'Aaa', orden: 5 }),
    ])
    expect(lista.map((p) => p.id)).toEqual(['a', 'b', 'c'])
  })
})
