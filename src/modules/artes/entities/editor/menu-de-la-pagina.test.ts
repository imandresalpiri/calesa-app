import { describe, expect, it } from 'vitest'
import { lineasDeLaPagina } from './menu-de-la-pagina'
import { motivosDeLaPagina, MOTIVO_DEMASIADAS_PAGINAS, MOTIVO_UNA_PAGINA } from './paginas'

const apagadas = (lineas: ReturnType<typeof lineasDeLaPagina>) =>
  lineas.flatMap((l) => (l.tipo === 'accion' && l.deshabilitada ? [l.clave] : []))
const notas = (lineas: ReturnType<typeof lineasDeLaPagina>) =>
  lineas.flatMap((l) => (l.tipo === 'nota' ? [l.texto] : []))

describe('el «⋯» de una página', () => {
  it('en el medio de tres, todo se puede y no hay notas', () => {
    const lineas = lineasDeLaPagina(motivosDeLaPagina(3, 1, 20, null))
    expect(lineas.map((l) => (l.tipo === 'accion' ? l.etiqueta : l.tipo))).toEqual([
      'Duplicar',
      'Mover antes',
      'Mover después',
      'separador',
      'Quitar',
    ])
    expect(apagadas(lineas)).toEqual([])
  })

  it('la única: no se mueve ni se quita, con su motivo', () => {
    const lineas = lineasDeLaPagina(motivosDeLaPagina(1, 0, 20, null))
    expect(apagadas(lineas)).toEqual(['mover-antes', 'mover-despues', 'quitar'])
    expect(notas(lineas)).toEqual([
      'Ya es la primera página.',
      'Ya es la última página.',
      MOTIVO_UNA_PAGINA,
    ])
  })

  it('con el tope, no se duplica', () => {
    const lineas = lineasDeLaPagina(motivosDeLaPagina(20, 19, 20, null))
    expect(apagadas(lineas)).toEqual(['duplicar', 'mover-despues'])
    expect(notas(lineas)).toEqual([MOTIVO_DEMASIADAS_PAGINAS, 'Ya es la última página.'])
  })

  it('en sólo lectura, todo apagado y el motivo una vez', () => {
    const lineas = lineasDeLaPagina(motivosDeLaPagina(3, 1, 20, 'Sólo puedes mirar.'))
    expect(apagadas(lineas)).toEqual(['duplicar', 'mover-antes', 'mover-despues', 'quitar'])
    expect(notas(lineas)).toEqual(['Sólo puedes mirar.'])
  })
})
