import { describe, expect, it } from 'vitest'
import type { Permisos } from '@/shared/lib/permisos'
import { TOPE_DE_ORIGENES_DEL_MENU } from '@/shared/lib/paginacion'
import { destinosDeLosCatalogos } from './destinos-de-los-catalogos'

const guid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const origenes = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ id: guid(i + 1), nombre: `Origen ${String(i + 1)}` }))
const con = (clave: string, origenId: string | null = null): Permisos =>
  [{ clave, origenId, alcance: 'todos' }] as Permisos

describe('destinosDeLosCatalogos', () => {
  it('da los cuatro catálogos de cada origen cuya pestaña Fases se abre, con su camino', () => {
    const destinos = destinosDeLosCatalogos(
      origenes(2),
      con('logistica.catalogos.gestionar', guid(2)),
    )
    expect(destinos.map((d) => [d.lugar, d.titulo, d.ruta])).toEqual([
      [
        'Orígenes › Origen 2 › Fases',
        'Puertos',
        `/configuracion/origenes/${guid(2)}/fases?panel=puertos`,
      ],
      [
        'Orígenes › Origen 2 › Fases',
        'Navieras',
        `/configuracion/origenes/${guid(2)}/fases?panel=navieras`,
      ],
      [
        'Orígenes › Origen 2 › Fases',
        'Categorías de gasto',
        `/configuracion/origenes/${guid(2)}/fases?panel=categorias-de-gasto`,
      ],
      [
        'Orígenes › Origen 2 › Fases',
        'Tipos de documento',
        `/configuracion/origenes/${guid(2)}/fases?panel=tipos-de-documento`,
      ],
    ])
  })

  it('quien configura el flujo del origen también los encuentra (los ve en lectura)', () => {
    expect(destinosDeLosCatalogos(origenes(1), con('flujos.configurar'))).toHaveLength(4)
  })

  it('sin la pestaña Fases, ninguno; las claves no se repiten', () => {
    expect(destinosDeLosCatalogos(origenes(3), con('origenes.gestionar'))).toEqual([])
    const claves = destinosDeLosCatalogos(origenes(3), con('flujos.configurar')).map((d) => d.clave)
    expect(new Set(claves).size).toBe(claves.length)
  })

  it('con el tope de orígenes del menú', () => {
    const destinos = destinosDeLosCatalogos(
      origenes(TOPE_DE_ORIGENES_DEL_MENU + 1),
      con('logistica.catalogos.gestionar'),
    )
    expect(destinos).toHaveLength(TOPE_DE_ORIGENES_DEL_MENU * 4)
  })
})
