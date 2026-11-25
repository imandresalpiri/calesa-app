import { describe, expect, it, vi } from 'vitest'
import type { ClavePermiso, Permisos } from '@/shared/lib/permisos'
import { panelAbiertoDe, panelesDisponibles, rutaDeRegistrarCompra, rutaDelPanel } from './paneles'

// Las constantes llegan por el `index.ts` de los módulos, que alcanza su composición (`server-only`): en Vitest el import llega entero y cae.
vi.mock('server-only', () => ({}))

const con = (...claves: ClavePermiso[]): Permisos =>
  claves.map((clave) => ({ clave, origenId: null, alcance: 'todos' as const }))
const P = '11111111-1111-4111-8111-111111111111'

describe('los paneles bajo los pasos', () => {
  it('sin `repuestos.costos.ver` ni `repuestos.cotizar`, ninguno: la URL no abre nada', () => {
    const disponibles = panelesDisponibles(con('repuestos.ver'))
    expect(disponibles).toEqual([])
    expect(panelAbiertoDe('compras', disponibles)).toBeNull()
    expect(panelAbiertoDe('pagos', disponibles)).toBeNull()
  })

  it('con `repuestos.costos.ver`, Pagos y Compras; Cotizaciones sólo con `repuestos.cotizar`', () => {
    expect(panelesDisponibles(con('repuestos.costos.ver'))).toEqual(['pagos', 'compras'])
    expect(panelesDisponibles(con('repuestos.cotizar'))).toEqual(['cotizaciones'])
    expect(panelesDisponibles(con('repuestos.costos.ver', 'repuestos.cotizar'))).toEqual([
      'cotizaciones',
      'pagos',
      'compras',
    ])
  })

  it('`items`, un valor ajeno o ninguno: sólo la hoja', () => {
    const todos = panelesDisponibles(con('repuestos.costos.ver', 'repuestos.cotizar'))
    expect(panelAbiertoDe('cotizaciones', todos)).toBe('cotizaciones')
    expect(panelAbiertoDe('items', todos)).toBeNull()
    expect(panelAbiertoDe('nada', todos)).toBeNull()
    expect(panelAbiertoDe(undefined, todos)).toBeNull()
  })
})

describe('las rutas de un panel', () => {
  it('el panel y, para registrar una compra, el ítem ya elegido', () => {
    expect(rutaDelPanel(P, 'compras')).toBe(`/repuestos/${P}?pestana=compras`)
    expect(rutaDeRegistrarCompra(P, 'i1')).toBe(
      `/repuestos/${P}?pestana=compras&panel=compra&compra=nueva&item_de_compra=i1`,
    )
  })
})
