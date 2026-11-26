import { describe, expect, it } from 'vitest'
import { esquemaDestinoAlQuitar, rechazoDelCatalogo } from './gestion'

describe('rechazoDelCatalogo', () => {
  it('pone el texto de la base junto al dato que nombra su hint', () => {
    expect(
      rechazoDelCatalogo({ code: '23505', message: 'Ya existe «Motor».', hint: 'nombre' }),
    ).toEqual({
      ok: false,
      error: { codigo: 'duplicado', mensaje: 'Ya existe «Motor».' },
      porCampo: { nombre: 'Ya existe «Motor».' },
    })
  })

  it('los ítems de un grupo y las preguntas de una categoría van a la misma clave', () => {
    const campos = rechazoDelCatalogo({ code: '23503', message: 'Tiene 2 campos.', hint: 'campos' })
    const preguntas = rechazoDelCatalogo({
      code: '23503',
      message: 'Tiene 2 preguntas.',
      hint: 'preguntas',
    })
    expect(campos.ok ? null : campos.porCampo).toEqual({ items: 'Tiene 2 campos.' })
    expect(preguntas.ok ? null : preguntas.porCampo).toEqual({ items: 'Tiene 2 preguntas.' })
  })

  it('sin hint conocido es un error sin dato: un conflicto sigue siendo conflicto', () => {
    expect(
      rechazoDelCatalogo({ code: 'PT409', message: 'Otra persona cambió este grupo.' }),
    ).toEqual({
      ok: false,
      error: { codigo: 'conflicto', mensaje: 'Otra persona cambió este grupo.' },
    })
  })
})

describe('esquemaDestinoAlQuitar', () => {
  it('sin mover no lleva destino; moviendo, un id o nulo', () => {
    expect(esquemaDestinoAlQuitar.parse({ mover: false })).toEqual({ mover: false })
    expect(esquemaDestinoAlQuitar.parse({ mover: true, destino: null })).toEqual({
      mover: true,
      destino: null,
    })
    expect(esquemaDestinoAlQuitar.safeParse({ mover: true, destino: 'x' }).success).toBe(false)
  })
})
