import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import {
  conReglasDeCampo,
  esquemaClave,
  esquemaEtiqueta,
  esquemaGrupo,
  esquemaNombreDeGrupo,
} from './esquemas'

describe('esquemaClave', () => {
  const clave = esquemaClave(['nombre'], 'Ya es un dato fijo.')

  it('acepta una clave bien formada', () => {
    expect(clave.safeParse('signo_zodiacal').success).toBe(true)
  })

  it('rechaza mayúsculas, espacios y una que empieza con número', () => {
    expect(clave.safeParse('Signo').success).toBe(false)
    expect(clave.safeParse('signo zodiacal').success).toBe(false)
    expect(clave.safeParse('1signo').success).toBe(false)
  })

  it('rechaza una reservada con el motivo del módulo', () => {
    const resultado = clave.safeParse('nombre')
    expect(resultado.success).toBe(false)
    expect(resultado.error?.issues[0]?.message).toBe('Ya es un dato fijo.')
  })
})

describe('esquemaEtiqueta y esquemaGrupo', () => {
  it('la etiqueta pide al menos dos caracteres y recorta', () => {
    expect(esquemaEtiqueta.safeParse('A').success).toBe(false)
    expect(esquemaEtiqueta.parse('  Edad ')).toBe('Edad')
  })

  it('el grupo viaja como id del catálogo; null es «sin grupo»', () => {
    expect(esquemaGrupo.parse(null)).toBeNull()
    expect(esquemaGrupo.parse('0b7a8c1e-2f4d-4c6b-9a1e-3d5f7b9c1a2e')).toBe(
      '0b7a8c1e-2f4d-4c6b-9a1e-3d5f7b9c1a2e',
    )
    expect(esquemaGrupo.safeParse('Datos personales').success).toBe(false)
  })

  it('el nombre de un grupo nuevo se limpia como en la base y pide de 1 a 40 caracteres', () => {
    expect(esquemaNombreDeGrupo.parse('  Datos   del cliente ')).toBe('Datos del cliente')
    expect(esquemaNombreDeGrupo.safeParse('   ').error?.issues[0]?.message).toBe(
      'Escribe un nombre.',
    )
    expect(esquemaNombreDeGrupo.safeParse('x'.repeat(41)).error?.issues[0]?.message).toBe(
      'Hasta 40 caracteres.',
    )
  })
})

describe('conReglasDeCampo', () => {
  const esquema = conReglasDeCampo(
    z.object({
      tipo: z.enum(['texto', 'opcion', 'numero']),
      opciones: z.array(z.object({ clave: z.string(), etiqueta: z.string() })),
      valorDefecto: z.union([z.string(), z.number(), z.null()]),
      minimo: z.number().nullable().default(null),
      maximo: z.number().nullable().default(null),
    }),
  )
  const OPCIONES = [{ clave: 'a', etiqueta: 'A' }]

  it('un campo de opciones necesita al menos una', () => {
    expect(esquema.safeParse({ tipo: 'opcion', opciones: [], valorDefecto: null }).success).toBe(
      false,
    )
    expect(
      esquema.safeParse({ tipo: 'opcion', opciones: OPCIONES, valorDefecto: null }).success,
    ).toBe(true)
  })

  it('un campo sin opciones no las lleva', () => {
    expect(
      esquema.safeParse({ tipo: 'texto', opciones: OPCIONES, valorDefecto: null }).success,
    ).toBe(false)
  })

  it('el valor por defecto tiene que servir para el tipo', () => {
    expect(esquema.safeParse({ tipo: 'texto', opciones: [], valorDefecto: 'Gris' }).success).toBe(
      true,
    )
    expect(
      esquema.safeParse({ tipo: 'opcion', opciones: OPCIONES, valorDefecto: 'z' }).success,
    ).toBe(false)
    expect(
      esquema.safeParse({ tipo: 'opcion', opciones: OPCIONES, valorDefecto: 'a' }).success,
    ).toBe(true)
  })
  it('el rango es el de la base y su motivo va en su dato', () => {
    const numero = { tipo: 'numero', opciones: [], valorDefecto: null }
    expect(esquema.safeParse({ ...numero, minimo: 1, maximo: 10 }).success).toBe(true)
    expect(esquema.safeParse({ ...numero, minimo: 5, maximo: 4 }).error?.issues[0]).toMatchObject({
      path: ['maximo'],
      message: 'El mínimo no puede ser mayor que el máximo.',
    })
    expect(
      esquema.safeParse({ tipo: 'texto', opciones: [], valorDefecto: null, minimo: 1 }).error
        ?.issues[0]?.path,
    ).toEqual(['minimo'])
  })
})
