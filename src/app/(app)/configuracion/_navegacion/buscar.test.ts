import { describe, expect, it } from 'vitest'
import type { Permisos } from '@/shared/lib/permisos'
import { destinosFueraDeConfiguracion } from '../destinos-de-busqueda'
import { gruposVisibles, paraElNavegador, type GrupoDelNavegador } from '../secciones'
import { TOPE_DE_RESULTADOS, buscarEnConfiguracion, normalizar } from './buscar'
import { destinosDeLosCatalogos } from './destinos-de-los-catalogos'
import { conOrigenesEnElMenu, subseccionesDeOrigenes } from './origenes-del-menu'

const TODO: Permisos = [
  'equipo.usuarios.gestionar',
  'equipo.roles.gestionar',
  'empresa.ajustes.gestionar',
  'origenes.gestionar',
  'leads.campos.gestionar',
  'leads.configurar',
  'cotizaciones.configurar',
  'flujos.configurar',
  'repuestos.configurar',
  'web.ajustes.gestionar',
  'web.contenido.gestionar',
  'web.cola.gestionar',
  'logistica.catalogos.gestionar',
].map((clave) => ({ clave, origenId: null, alcance: 'todos' }) as Permisos[number])

const grupos = paraElNavegador(gruposVisibles(TODO))
const caminos = (texto: string, de: readonly GrupoDelNavegador[] = grupos) =>
  buscarEnConfiguracion(de, texto).map((r) => r.camino)

describe('normalizar', () => {
  it('quita acentos, mayúsculas y espacios de más', () => {
    expect(normalizar('  Orígenes   DEL  Lead ')).toBe('origenes del lead')
  })
})

describe('buscarEnConfiguracion', () => {
  it('un texto vacío no busca', () => {
    expect(caminos('')).toEqual([])
    expect(caminos('   ')).toEqual([])
  })

  it('encuentra por nombre, sin acentos ni mayúsculas, y lo que más se parece va primero', () => {
    expect(caminos('ORIGENES')[0]).toBe('Orígenes')
    expect(caminos('portal')).toEqual(['Leads'])
  })

  it('encuentra por las palabras clave que declara el registro', () => {
    expect(caminos('logo')[0]).toBe('Empresa › Datos de la empresa')
    expect(caminos('whatsapp')).toContain('Leads')
    expect(caminos('código')).toContain('Leads')
  })

  it('la sección y su sub-sección índice, que abren lo mismo, se ven como la sub-sección', () => {
    const empresa = buscarEnConfiguracion(grupos, 'empresa')
    expect(empresa.map((r) => r.ruta).filter((r) => r === '/configuracion/empresa')).toHaveLength(1)
    expect(empresa[0]?.camino).toBe('Empresa › Datos de la empresa')
  })

  it('varias palabras: todas tienen que estar, en el título con el de su sección o en sus palabras', () => {
    expect(caminos('leads portal')[0]).toBe('Leads')
    expect(caminos('empresa zzz')).toEqual([])
  })

  it('sin coincidencias, nada', () => {
    expect(caminos('xyzxyz')).toEqual([])
  })

  it('sólo ofrece lo que la persona puede abrir: la sub-sección apagada no figura', () => {
    const soloLeads = paraElNavegador(
      gruposVisibles([{ clave: 'leads.configurar', origenId: null, alcance: 'todos' }]),
    )
    expect(caminos('campos', soloLeads)).toEqual([])
    expect(caminos('empresa', soloLeads)).toEqual([])
    expect(caminos('portal', soloLeads)).toContain('Leads')
    expect(caminos('portal', [])).toEqual([])
  })

  it('lo de un origen se busca en Orígenes, con los colores y la vigencia de todas las cotizaciones; los niveles, en Roles; lo de repuestos ya no es de Configuración', () => {
    expect(caminos('fórmula')[0]).toBe('Orígenes')
    expect(caminos('flujo')).toContain('Orígenes')
    expect(caminos('colores')[0]).toBe('Orígenes › Colores')
    expect(caminos('niveles')[0]).toBe('Roles y permisos › Niveles de acceso')
    expect(caminos('tablas compartidas')).toEqual([])
    expect(caminos('flujo de repuestos')).toEqual([])
  })

  it('cada origen que suma el menú se encuentra por su nombre y abre su página (la última pestaña)', () => {
    const id = '00000000-0000-4000-8000-000000000001'
    const conOrigenes = conOrigenesEnElMenu(
      grupos,
      subseccionesDeOrigenes([{ id, nombre: 'Japón' }], TODO),
    )
    expect(buscarEnConfiguracion(conOrigenes, 'japon')[0]).toEqual({
      clave: `origenes-${id}`,
      camino: 'Orígenes › Japón',
      ruta: `/configuracion/origenes/${id}`,
    })
  })

  it('dibuja como mucho el tope', () => {
    expect(buscarEnConfiguracion(grupos, 'e').length).toBeLessThanOrEqual(TOPE_DE_RESULTADOS)
  })
})

describe('los destinos de búsqueda de Orígenes', () => {
  it('los destinos de búsqueda llevan al modal de su tarjeta: colores, vigencia y sus palabras', () => {
    const encontrados = (texto: string) =>
      buscarEnConfiguracion(grupos, texto).map((r) => [r.camino, r.ruta])
    expect(encontrados('colores')[0]).toEqual([
      'Orígenes › Colores',
      '/configuracion/origenes?panel=colores',
    ])
    expect(encontrados('vigencia')[0]).toEqual([
      'Orígenes › Vigencia',
      '/configuracion/origenes?panel=vigencia',
    ])
    for (const palabra of ['días', 'vence', 'caducidad', 'validez']) {
      expect(caminos(palabra), palabra).toContain('Orígenes › Vigencia')
    }
    for (const palabra of ['color', 'tema']) {
      expect(caminos(palabra), palabra).toContain('Orígenes › Colores')
    }
  })

  it('sin cotizaciones.configurar no se ofrecen los destinos de Orígenes', () => {
    const soloOrigenes = paraElNavegador(
      gruposVisibles([{ clave: 'origenes.gestionar', origenId: null, alcance: 'todos' }]),
    )
    expect(caminos('colores', soloOrigenes)).toEqual([])
    expect(caminos('vigencia', soloOrigenes)).toEqual([])
    expect(caminos('orígenes', soloOrigenes)).toEqual(['Orígenes'])
  })
})

describe('los catálogos de logística de cada origen', () => {
  const MIAMI = '00000000-0000-4000-8000-000000000901'
  const fuera = destinosDeLosCatalogos([{ id: MIAMI, nombre: 'Miami' }], TODO)
  const encontrados = (texto: string) =>
    buscarEnConfiguracion(grupos, texto, fuera).map((r) => [r.camino, r.ruta])
  const fases = `/configuracion/origenes/${MIAMI}/fases`

  it('puertos, navieras, gastos y tipos de documento se encuentran y abren su drawer en la pestaña Fases del origen', () => {
    expect(encontrados('puertos')[0]).toEqual([
      'Orígenes › Miami › Fases › Puertos',
      `${fases}?panel=puertos`,
    ])
    expect(encontrados('navieras')[0]).toEqual([
      'Orígenes › Miami › Fases › Navieras',
      `${fases}?panel=navieras`,
    ])
    expect(encontrados('gastos')[0]).toEqual([
      'Orígenes › Miami › Fases › Categorías de gasto',
      `${fases}?panel=categorias-de-gasto`,
    ])
    expect(encontrados('documentos')).toContainEqual([
      'Orígenes › Miami › Fases › Tipos de documento',
      `${fases}?panel=tipos-de-documento`,
    ])
  })

  it('«logística» los encuentra a todos', () => {
    const caminosDe = encontrados('logística').map(([camino]) => camino)
    for (const titulo of ['Puertos', 'Navieras', 'Categorías de gasto', 'Tipos de documento']) {
      expect(caminosDe).toContain(`Orígenes › Miami › Fases › ${titulo}`)
    }
  })

  it('sin destinos de afuera no hay nada; sin la pestaña Fases del origen, tampoco', () => {
    expect(caminos('puertos')).toEqual([])
    const ver: Permisos = [{ clave: 'logistica.ver', origenId: null, alcance: 'todos' }]
    expect(destinosDeLosCatalogos([{ id: MIAMI, nombre: 'Miami' }], ver)).toEqual([])
  })
})

describe('los destinos de búsqueda de Repuestos', () => {
  const fuera = destinosFueraDeConfiguracion(TODO)
  const encontrados = (texto: string) =>
    buscarEnConfiguracion(grupos, texto, fuera).map((r) => [r.camino, r.ruta])

  it('el flujo, el cotizador y los catálogos de repuestos se encuentran y llevan a Repuestos › Configuración', () => {
    expect(encontrados('flujo de repuestos')[0]).toEqual([
      'Repuestos › Flujo de repuestos',
      '/repuestos/configuracion/flujo',
    ])
    expect(encontrados('cotizador de repuestos')[0]).toEqual([
      'Repuestos › Cotizador de repuestos',
      '/repuestos/configuracion/cotizador',
    ])
    expect(encontrados('catálogos de repuestos')[0]).toEqual([
      'Repuestos › Catálogos de repuestos',
      '/repuestos/configuracion/catalogos',
    ])
  })

  it('las palabras de siempre los siguen encontrando', () => {
    const porPalabra: [string, string][] = [
      ['fases', 'Repuestos › Flujo de repuestos'],
      ['requisitos', 'Repuestos › Flujo de repuestos'],
      ['fórmula', 'Repuestos › Cotizador de repuestos'],
      ['tramos', 'Repuestos › Cotizador de repuestos'],
      ['cajas', 'Repuestos › Cotizador de repuestos'],
      ['tipo de pieza', 'Repuestos › Catálogos de repuestos'],
      ['condición', 'Repuestos › Catálogos de repuestos'],
      ['país de origen', 'Repuestos › Catálogos de repuestos'],
    ]
    for (const [palabra, camino] of porPalabra) {
      expect(
        encontrados(palabra).map(([c]) => c),
        palabra,
      ).toContain(camino)
    }
  })

  it('sin repuestos.configurar no se ofrecen', () => {
    const sinClave = destinosFueraDeConfiguracion(
      TODO.filter((permiso) => permiso.clave !== 'repuestos.configurar'),
    )
    expect(
      buscarEnConfiguracion(grupos, 'cotizador de repuestos', sinClave).map((r) => r.camino),
    ).toEqual([])
  })
})
