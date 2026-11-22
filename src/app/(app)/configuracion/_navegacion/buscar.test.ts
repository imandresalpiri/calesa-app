import { describe, expect, it } from 'vitest'
import type { Permisos } from '@/shared/lib/permisos'
import { gruposVisibles, paraElNavegador, type GrupoDelNavegador } from '../secciones'
import { TOPE_DE_RESULTADOS, buscarEnConfiguracion, normalizar } from './buscar'
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

  it('lo de un origen se busca en Orígenes, con los colores y la vigencia de todas las cotizaciones; lo global, en Catálogos', () => {
    expect(caminos('fórmula')[0]).toBe('Orígenes')
    expect(caminos('flujo')).toContain('Orígenes')
    expect(caminos('colores')[0]).toBe('Orígenes › Colores')
    expect(caminos('niveles')[0]).toBe('Catálogos › Niveles')
    expect(caminos('tablas compartidas')[0]).toBe('Catálogos › Tablas compartidas')
    expect(caminos('flujo de repuestos')[0]).toBe('Repuestos › Flujo de repuestos')
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
