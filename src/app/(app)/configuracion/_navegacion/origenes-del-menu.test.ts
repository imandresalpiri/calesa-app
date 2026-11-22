import { describe, expect, it } from 'vitest'
import type { Permisos } from '@/shared/lib/permisos'
import { TOPE_DE_ORIGENES_DEL_MENU } from '@/shared/lib/paginacion'
import type { GrupoDelNavegador } from '../secciones'
import { conOrigenesEnElMenu, subseccionesDeOrigenes } from './origenes-del-menu'

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const origenes = (cuantos: number) =>
  Array.from({ length: cuantos }, (_, i) => ({ id: id(i + 1), nombre: `Origen ${String(i + 1)}` }))
const gestiona: Permisos = [{ clave: 'origenes.gestionar', origenId: null, alcance: 'todos' }]

describe('subseccionesDeOrigenes', () => {
  it('uno por origen, a su página (la última pestaña), marcado por el origen', () => {
    expect(subseccionesDeOrigenes(origenes(1), gestiona)).toEqual([
      {
        clave: id(1),
        titulo: 'Origen 1',
        ruta: `/configuracion/origenes/${id(1)}`,
        marca: `/configuracion/origenes/${id(1)}`,
      },
    ])
  })

  it('sólo los que la persona abre: el permiso en otro origen no alcanza', () => {
    const enUno: Permisos = [{ clave: 'flujos.configurar', origenId: id(2), alcance: 'todos' }]
    expect(subseccionesDeOrigenes(origenes(3), enUno).map((sub) => sub.titulo)).toEqual([
      'Origen 2',
    ])
    expect(subseccionesDeOrigenes(origenes(3), [])).toEqual([])
  })

  it('con más del tope, corta y suma «Ver todos los orígenes» a la lista', () => {
    const subs = subseccionesDeOrigenes(origenes(TOPE_DE_ORIGENES_DEL_MENU + 1), gestiona)
    expect(subs).toHaveLength(TOPE_DE_ORIGENES_DEL_MENU + 1)
    expect(subs.at(-1)).toEqual({
      clave: 'todos',
      titulo: 'Ver todos los orígenes',
      ruta: '/configuracion/origenes',
    })
    expect(subseccionesDeOrigenes(origenes(TOPE_DE_ORIGENES_DEL_MENU), gestiona)).toHaveLength(
      TOPE_DE_ORIGENES_DEL_MENU,
    )
  })
})

describe('conOrigenesEnElMenu', () => {
  it('los pone sólo en la sección Orígenes', () => {
    const grupos: GrupoDelNavegador[] = [
      {
        clave: 'ventas',
        titulo: 'Ventas',
        secciones: [
          { clave: 'leads', titulo: 'Leads', ruta: '/configuracion/leads', subsecciones: [] },
          {
            clave: 'origenes',
            titulo: 'Orígenes',
            ruta: '/configuracion/origenes',
            subsecciones: [],
          },
        ],
      },
    ]
    const subs = subseccionesDeOrigenes(origenes(2), gestiona)
    const [ventas] = conOrigenesEnElMenu(grupos, subs)
    expect(ventas?.secciones.map((s) => s.subsecciones.length)).toEqual([0, 2])
  })
})
