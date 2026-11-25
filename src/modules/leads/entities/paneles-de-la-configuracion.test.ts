import { describe, expect, it } from 'vitest'
import { CLAVES_DE_LAS_FAMILIAS, FAMILIAS_DE_LA_CONFIGURACION } from './paneles-de-la-configuracion'

describe('las familias', () => {
  it('ningún panel está en dos familias y el principal es de la suya', () => {
    const todos = CLAVES_DE_LAS_FAMILIAS.flatMap(
      (clave) => FAMILIAS_DE_LA_CONFIGURACION[clave].paneles,
    )
    expect(new Set(todos).size).toBe(todos.length)
    for (const clave of CLAVES_DE_LAS_FAMILIAS) {
      const familia = FAMILIAS_DE_LA_CONFIGURACION[clave]
      expect(familia.paneles).toContain(familia.principal)
      expect(familia.principal).toBe(clave)
    }
  })
})
