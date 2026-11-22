import { describe, expect, it } from 'vitest'
import { destinoDeLaUrlVieja } from './url-vieja'

const abiertos = [
  { clave: 'puertos', ruta: '/logistica/configuracion/puertos' },
  { clave: 'navieras', ruta: '/logistica/configuracion/navieras' },
  { clave: 'categorias-de-gasto', ruta: '/logistica/configuracion/categorias-de-gasto' },
  { clave: 'tipos-de-documento', ruta: '/logistica/configuracion/tipos-de-documento' },
]

describe('la URL vieja de Configuración › Logística, en Logística › Configuración', () => {
  it('`?seccion=` va a la pestaña de su catálogo', () => {
    expect(destinoDeLaUrlVieja({ seccion: 'navieras' }, abiertos)).toBe(
      '/logistica/configuracion/navieras',
    )
    expect(destinoDeLaUrlVieja({ seccion: 'categorias-de-gasto' }, abiertos)).toBe(
      '/logistica/configuracion/categorias-de-gasto',
    )
  })

  it('conserva el panel que traía', () => {
    expect(
      destinoDeLaUrlVieja(
        { seccion: 'navieras', panel: 'editar-naviera', naviera: 'n-1' },
        abiertos,
      ),
    ).toBe('/logistica/configuracion/navieras?panel=editar-naviera&naviera=n-1')
  })

  it('sin `seccion`, o con una ajena, abre la primera pestaña (y conserva el panel)', () => {
    expect(destinoDeLaUrlVieja({}, abiertos)).toBe('/logistica/configuracion/puertos')
    expect(destinoDeLaUrlVieja({ seccion: 'basura' }, abiertos)).toBe(
      '/logistica/configuracion/puertos',
    )
    expect(destinoDeLaUrlVieja({ panel: 'nuevo-puerto' }, abiertos)).toBe(
      '/logistica/configuracion/puertos?panel=nuevo-puerto',
    )
  })

  it('una pestaña que la persona no puede abrir va a la primera que sí', () => {
    expect(destinoDeLaUrlVieja({ seccion: 'puertos' }, abiertos.slice(1))).toBe(
      '/logistica/configuracion/navieras',
    )
  })

  it('sin ninguna pestaña que abrir, no hay destino', () => {
    expect(destinoDeLaUrlVieja({ seccion: 'puertos' }, [])).toBeNull()
  })
})
