import { describe, expect, it } from 'vitest'
import { MAXIMO_DE_PAGINAS, VERSION_DEL_DOCUMENTO, type DocumentoDeArte } from '../documento'
import { pagina, rect } from './capas-de-prueba.soporte'
import {
  agregarPagina,
  ALTO_DE_LA_MINIATURA,
  cajaDeLaMiniatura,
  duplicarPagina,
  maximoDePaginas,
  MOTIVO_DEMASIADAS_PAGINAS,
  MOTIVO_UNA_PAGINA,
  motivosDeLaPagina,
  moverPagina,
  nombreDeLaPagina,
  paginaQueCambio,
  paginaQueQuedaAlQuitar,
  quitarPagina,
} from './paginas'

const conIds = (...ids: string[]): DocumentoDeArte => ({
  version: VERSION_DEL_DOCUMENTO,
  paginas: ids.map((id) => ({ ...pagina([rect(`capa-${id}`)]), id })),
})
const ids = (d: DocumentoDeArte) => d.paginas.map((p) => p.id)

describe('las páginas de una plantilla de arte', () => {
  it('una imagen tiene una página; un PDF, hasta 20', () => {
    expect(maximoDePaginas('imagen')).toBe(1)
    expect(maximoDePaginas('pdf')).toBe(MAXIMO_DE_PAGINAS)
    expect(nombreDeLaPagina(1)).toBe('Página 2')
  })

  it('la miniatura tiene caja fija por formato', () => {
    expect(cajaDeLaMiniatura({ ancho: 612, alto: 792 })).toEqual({ ancho: 59, alto: 76 })
    expect(cajaDeLaMiniatura({ ancho: 595, alto: 842 })).toEqual({ ancho: 54, alto: 76 })
    expect(cajaDeLaMiniatura({ ancho: 0, alto: 0 }).alto).toBe(ALTO_DE_LA_MINIATURA)
  })

  it('agrega en blanco después de la elegida, sin pasar el tope ni repetir el id', () => {
    const d = conIds('a', 'b')
    const nuevo = agregarPagina(d, 'a', 'n', 20)
    expect(ids(nuevo)).toEqual(['a', 'n', 'b'])
    expect(nuevo.paginas[1]?.capas).toEqual([])
    expect(agregarPagina(d, 'a', 'n', 2)).toBe(d)
    expect(agregarPagina(d, 'a', 'b', 20)).toBe(d)
    expect(agregarPagina(d, 'x', 'n', 20)).toBe(d)
  })

  it('duplica con id nuevo y las mismas capas', () => {
    const d = conIds('a', 'b')
    const copia = duplicarPagina(d, 'a', 'c', 20)
    expect(ids(copia)).toEqual(['a', 'c', 'b'])
    expect(copia.paginas[1]?.capas).toBe(d.paginas[0]?.capas)
    expect(duplicarPagina(d, 'a', 'c', 2)).toBe(d)
  })

  it('mueve antes, después y a un índice, sin salirse', () => {
    const d = conIds('a', 'b', 'c')
    expect(ids(moverPagina(d, 'b', 'antes'))).toEqual(['b', 'a', 'c'])
    expect(ids(moverPagina(d, 'b', 'despues'))).toEqual(['a', 'c', 'b'])
    expect(ids(moverPagina(d, 'a', 2))).toEqual(['b', 'c', 'a'])
    expect(moverPagina(d, 'a', 'antes')).toBe(d)
    expect(moverPagina(d, 'c', 9)).toBe(d)
  })

  it('quita cualquiera menos la única, y dice cuál queda en su lugar', () => {
    const d = conIds('a', 'b', 'c')
    expect(ids(quitarPagina(d, 'b'))).toEqual(['a', 'c'])
    expect(paginaQueQuedaAlQuitar(d, 'b')).toBe('c')
    expect(paginaQueQuedaAlQuitar(d, 'c')).toBe('b')
    const una = conIds('a')
    expect(quitarPagina(una, 'a')).toBe(una)
    expect(paginaQueQuedaAlQuitar(una, 'a')).toBeNull()
  })

  it('la página que cambió entre dos documentos', () => {
    const d = conIds('a', 'b', 'c')
    const cambiada = { ...d, paginas: d.paginas.with(2, { ...pagina([]), id: 'c' }) }
    expect(paginaQueCambio(d, cambiada, 'a')).toBe('c')
    expect(paginaQueCambio(cambiada, d, 'a')).toBe('c')
    // Ninguna cambió: la que se veía, si sigue; si no, la de antes que ella.
    expect(paginaQueCambio(d, moverPagina(d, 'a', 2), 'b')).toBe('b')
    expect(paginaQueCambio(agregarPagina(d, 'a', 'n', 20), d, 'n')).toBe('a')
    expect(paginaQueCambio(d, quitarPagina(d, 'a'), 'a')).toBe('b')
  })

  it('los motivos de cada acción', () => {
    expect(motivosDeLaPagina(1, 0, 20, null)).toEqual({
      agregar: null,
      duplicar: null,
      moverAntes: 'Ya es la primera página.',
      moverDespues: 'Ya es la última página.',
      quitar: MOTIVO_UNA_PAGINA,
    })
    const llena = motivosDeLaPagina(20, 5, 20, null)
    expect(llena.agregar).toBe(MOTIVO_DEMASIADAS_PAGINAS)
    expect(llena.duplicar).toBe('Un PDF lleva hasta 20 páginas.')
    expect(llena.quitar).toBeNull()
    const leer = 'Sólo puedes mirar.'
    expect(Object.values(motivosDeLaPagina(3, 1, 20, leer))).toEqual([leer, leer, leer, leer, leer])
  })
})
