import { describe, expect, it } from 'vitest'
import { hojaDesde, type HojaLista } from './hoja'
import { crudaDeLaHoja } from './hoja-de-prueba.soporte'

describe('hojaDesde: lo que la cabecera trae por defecto y los enlaces de la ayuda', () => {
  it('lee el ⚙ de la cabecera, el modo por defecto, «Ver total» por defecto y los modos visibles', () => {
    const cruda = crudaDeLaHoja({
      ajustes: true,
      modo_por_defecto: 'b',
      ver_total_bs_por_defecto: true,
      modos_visibles: ['b'],
    })
    const hoja = hojaDesde(cruda) as HojaLista
    expect(hoja.cabecera).toMatchObject({
      ajustes: true,
      modoPorDefecto: 'b',
      verTotalBsPorDefecto: true,
      modosVisibles: ['b'],
    })
  })

  it('una ayuda con enlaces https se lee; con una URL que no es https, la hoja no se lee', () => {
    const conAyuda = (url: string) => {
      const cruda = crudaDeLaHoja()
      const [seccion] = cruda.secciones
      if (!seccion) throw new Error('sin sección')
      const items = seccion.items.map((i) =>
        i.tipo === 'celda' && i.nodo === 'fees'
          ? {
              ...i,
              ayuda: [
                { tipo: 'texto', texto: 'Mira' },
                { tipo: 'enlaces', enlaces: [{ titulo: 'Copart', url }] },
              ],
            }
          : i,
      )
      return hojaDesde({ ...cruda, secciones: [{ ...seccion, items }] })
    }
    const leida = conAyuda('https://www.copart.com/') as HojaLista
    const fees = leida.secciones[0]?.items.find((i) => i.nodo === 'fees')
    expect(fees?.tipo === 'celda' ? fees.ayuda : null).toEqual([
      { tipo: 'texto', texto: 'Mira' },
      { tipo: 'enlaces', enlaces: [{ titulo: 'Copart', url: 'https://www.copart.com/' }] },
    ])
    expect(conAyuda('javascript:alert(1)')).toBeNull()
    expect(conAyuda('http://copart.com')).toBeNull()
  })
})
