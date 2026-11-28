import { describe, expect, it } from 'vitest'
import { MAXIMO_DE_GRUPOS_POR_PAGINA, type CapaDe } from '../documento'
import {
  filaElegida,
  idDeLaFila,
  idsAlElegirLaFila,
  idsDeLaFila,
  modoDelClic,
  MOTIVO_DEL_TOPE_DE_GRUPOS,
  MOTIVO_PARA_AGRUPAR,
  MOTIVO_PARA_DESAGRUPAR,
  MOTIVO_YA_AGRUPADOS,
  motivoParaAgrupar,
  motivoParaDesagrupar,
  nombreDeLaFila,
} from './capas-en-la-lista'
import { pagina, rect } from './capas-de-prueba.soporte'
import { filasDeCapas } from './orden'

const conGrupo = pagina([rect('a'), rect('b', 'G'), rect('c', 'G'), rect('d')], ['G'])
const filas = filasDeCapas(conGrupo)
const filaDe = (id: string) => {
  const fila = filas.find((f) => idDeLaFila(f) === id)
  if (!fila) {
    throw new Error(`sin la fila ${id}`)
  }
  return fila
}

const SIN_TECLAS = { shiftKey: false, ctrlKey: false, metaKey: false }

describe('modoDelClic', () => {
  it('solo reemplaza, con Mayús suma y con Ctrl o ⌘ alterna', () => {
    expect(modoDelClic(SIN_TECLAS)).toBe('reemplazar')
    expect(modoDelClic({ ...SIN_TECLAS, shiftKey: true })).toBe('sumar')
    expect(modoDelClic({ ...SIN_TECLAS, ctrlKey: true })).toBe('alternar')
    expect(modoDelClic({ ...SIN_TECLAS, metaKey: true, shiftKey: true })).toBe('alternar')
  })
})

describe('lo que elige cada fila', () => {
  it('la de una capa, ella sola, aunque esté en un grupo', () => {
    expect(idsDeLaFila(conGrupo, filaDe('b'))).toEqual(['b'])
  })

  it('la de un grupo, sus miembros en el orden de la página', () => {
    expect(idsDeLaFila(conGrupo, filaDe('G'))).toEqual(['b', 'c'])
  })

  it('desde el id de la fila, lo mismo', () => {
    expect(idsAlElegirLaFila(conGrupo, 'G')).toEqual(['b', 'c'])
    expect(idsAlElegirLaFila(conGrupo, 'c')).toEqual(['c'])
  })

  it('la de un grupo se ve elegida sólo con todos sus miembros elegidos', () => {
    expect(filaElegida(conGrupo, filaDe('G'), new Set(['b']))).toBe(false)
    expect(filaElegida(conGrupo, filaDe('G'), new Set(['b', 'c']))).toBe(true)
    expect(filaElegida(conGrupo, filaDe('b'), new Set(['b']))).toBe(true)
    expect(filaElegida(conGrupo, filaDe('a'), new Set(['b']))).toBe(false)
  })
})

describe('nombreDeLaFila', () => {
  const { forma: _f, lados: _l, relleno: _r, ...base } = rect('l') as CapaDe<'forma'>
  const logo: CapaDe<'logo'> = { ...base, tipo: 'logo', varianteId: null }

  it('el del grupo, o el que le pusieron a la capa, o lo que es', () => {
    expect(nombreDeLaFila(filaDe('G'), [])).toBe('Grupo G')
    expect(nombreDeLaFila(filaDe('a'), [])).toBe('Rectángulo')
    const renombrada = pagina([{ ...rect('x'), nombre: 'Fondo' }])
    const [fila] = filasDeCapas(renombrada)
    expect(fila && nombreDeLaFila(fila, [])).toBe('Fondo')
  })

  it('el logo, con el nombre de su variante (sin ella, la principal)', () => {
    const [fila] = filasDeCapas(pagina([logo]))
    if (!fila) {
      throw new Error('sin la fila')
    }
    const logos = [{ id: 'principal', nombre: 'Principal', ancho: null, alto: null }]
    expect(nombreDeLaFila(fila, logos)).toBe('Logo · Principal')
    expect(nombreDeLaFila(fila, [])).toBe('Logo')
  })
})

describe('Agrupar y Desagrupar', () => {
  it('agrupar pide dos o más', () => {
    expect(motivoParaAgrupar(conGrupo, [])).toBe(MOTIVO_PARA_AGRUPAR)
    expect(motivoParaAgrupar(conGrupo, ['a'])).toBe(MOTIVO_PARA_AGRUPAR)
    expect(motivoParaAgrupar(conGrupo, ['a', 'x'])).toBe(MOTIVO_PARA_AGRUPAR)
    expect(motivoParaAgrupar(conGrupo, ['a', 'd'])).toBeNull()
  })

  it('un grupo entero y solo ya está agrupado; con algo más, se puede', () => {
    expect(motivoParaAgrupar(conGrupo, ['b', 'c'])).toBe(MOTIVO_YA_AGRUPADOS)
    expect(motivoParaAgrupar(conGrupo, ['b', 'c', 'd'])).toBeNull()
    expect(motivoParaAgrupar(conGrupo, ['a', 'b'])).toBeNull()
  })

  it('con el tope de grupos, no', () => {
    const grupos = Array.from({ length: MAXIMO_DE_GRUPOS_POR_PAGINA }, (_, i) => `g${String(i)}`)
    const llena = pagina([rect('a'), rect('b')], grupos)
    expect(motivoParaAgrupar(llena, ['a', 'b'])).toBe(MOTIVO_DEL_TOPE_DE_GRUPOS)
  })

  it('desagrupar pide una capa elegida dentro de un grupo', () => {
    expect(motivoParaDesagrupar(conGrupo, ['a', 'd'])).toBe(MOTIVO_PARA_DESAGRUPAR)
    expect(motivoParaDesagrupar(conGrupo, ['c'])).toBeNull()
  })
})
