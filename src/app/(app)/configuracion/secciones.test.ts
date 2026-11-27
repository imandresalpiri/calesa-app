import { existsSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { ShieldCheckIcon } from 'lucide-react'
import type { Permisos } from '@/shared/lib/permisos'
import { NAVEGACION } from '../_shell/navegacion'
import { PERMISOS_DE_EMPRESA, SECCION_DE_EMPRESA } from './empresa/seccion'
import { SECCION_DE_LEADS } from './leads/seccion'
import {
  GRUPOS,
  ICONO_DE_SECCION,
  SECCIONES,
  conSubseccionesVisibles,
  gruposVisibles,
  paraElNavegador,
  primeraSubseccionAbierta,
  seccionesVisibles,
  type SeccionDeConfiguracion,
} from './secciones'
import { SECCION_DE_WEB } from './web/seccion'

// `navegacion.ts` lee `equipo/shell.client`, que reexporta hooks cuyas Server Actions importan `server-only`: en Vitest el import llega entero y cae.
vi.mock('server-only', () => ({}))

const APP = path.join(process.cwd(), 'src/app/(app)')

describe('secciones de configuración', () => {
  const porClave = (clave: string) =>
    SECCIONES.find((seccion: SeccionDeConfiguracion) => seccion.clave === clave)

  it('son las de hoy, ordenadas por grupo: Ventas = Leads, Orígenes; sin Catálogos', () => {
    expect(SECCIONES.map((seccion) => seccion.clave)).toEqual([
      'empresa',
      'equipo',
      'roles',
      'leads',
      'origenes',
      'web',
      'cola-web',
    ])
    expect(porClave('catalogos')).toBeUndefined()
    expect(porClave('repuestos')).toBeUndefined()
    expect(porClave('leads')).toBe(SECCION_DE_LEADS)
  })

  it('los grupos son los tres, en su orden, y cada sección está en uno de ellos y en su orden', () => {
    expect(GRUPOS.map((grupo) => grupo.titulo)).toEqual(['Empresa y equipo', 'Ventas', 'Web'])
    const orden = GRUPOS.map((grupo) => grupo.clave)
    const lugares = SECCIONES.map((seccion: SeccionDeConfiguracion) => orden.indexOf(seccion.grupo))
    expect(lugares.every((lugar) => lugar >= 0)).toBe(true)
    expect(lugares).toEqual([...lugares].sort((a, b) => a - b))
    expect(porClave('equipo')?.grupo).toBe('empresa-y-equipo')
    expect(porClave('leads')?.grupo).toBe('ventas')
    expect(porClave('cola-web')?.grupo).toBe('web')
  })

  it('Sitio web viene de su carpeta, con sus sub-rutas y ninguna en la ruta de la sección', () => {
    expect(porClave('web')).toBe(SECCION_DE_WEB)
    expect(SECCION_DE_WEB.subsecciones.some((sub) => sub.ruta === SECCION_DE_WEB.ruta)).toBe(false)
  })

  it('Empresa viene de su carpeta y se abre con la unión de los permisos de sus sub-secciones', () => {
    expect(porClave('empresa')).toBe(SECCION_DE_EMPRESA)
    expect(porClave('empresa')?.permisos).toBe(PERMISOS_DE_EMPRESA)
  })

  // Una ruta existe si tiene su `page.tsx` o, la raíz que sólo redirige, su `route.ts`.
  const existe = (ruta: string) =>
    existsSync(path.join(APP, ruta, 'page.tsx')) || existsSync(path.join(APP, ruta, 'route.ts'))

  it('cada sección y cada sub-sección llevan a una pantalla que existe', () => {
    for (const seccion of SECCIONES as readonly SeccionDeConfiguracion[]) {
      expect(existe(seccion.ruta), seccion.ruta).toBe(true)
      for (const sub of seccion.subsecciones) {
        expect(sub.ruta === seccion.ruta || sub.ruta.startsWith(`${seccion.ruta}/`), sub.ruta).toBe(
          true,
        )
        expect(existsSync(path.join(APP, sub.ruta, 'page.tsx')), sub.ruta).toBe(true)
      }
    }
  })

  it('quien puede abrir una sección ve «Configuración» en el menú', () => {
    const delMenu = NAVEGACION.find((entrada) => entrada.clave === 'configuracion')?.permisos ?? []
    for (const seccion of SECCIONES as readonly SeccionDeConfiguracion[]) {
      for (const clave of [
        ...seccion.permisos,
        ...seccion.subsecciones.flatMap((s) => s.permisos),
      ]) {
        expect(delMenu, clave).toContain(clave)
      }
    }
  })

  it('muestra sólo las secciones que la persona puede abrir', () => {
    const ver: Permisos = [{ clave: 'equipo.roles.ver', origenId: null, alcance: 'todos' }]
    const asesora: Permisos = [{ clave: 'leads.ver', origenId: null, alcance: 'propios' }]
    expect(seccionesVisibles(ver).map((s) => s.clave)).toContain('roles')
    expect(seccionesVisibles(asesora)).toEqual([])
  })
})

describe('palabras e íconos de configuración', () => {
  it('cada sección declara sus palabras, y cada sub-sección también (salvo los catálogos de logística, que salen del módulo)', () => {
    for (const seccion of SECCIONES as readonly SeccionDeConfiguracion[]) {
      expect(seccion.palabras?.length, seccion.clave).toBeGreaterThan(0)
      for (const sub of seccion.subsecciones.filter(
        (una) => una.grupo !== 'Logística' || una.palabras,
      )) {
        expect(sub.palabras?.length, sub.ruta).toBeGreaterThan(0)
      }
    }
  })

  it('el ícono de cada sección sale por su clave', () => {
    for (const seccion of SECCIONES as readonly SeccionDeConfiguracion[]) {
      expect(ICONO_DE_SECCION[seccion.clave], seccion.clave).toBe(seccion.Icono)
    }
  })
})

describe('Orígenes en el registro', () => {
  it('no trae sub-secciones fijas (el menú suma una por origen) y se busca por lo que hay en cada origen', () => {
    const origenes = SECCIONES.find(
      (seccion: SeccionDeConfiguracion) => seccion.clave === 'origenes',
    )
    expect(origenes?.subsecciones).toEqual([])
    expect(origenes?.palabras).toEqual(
      expect.arrayContaining(['fórmula', 'flujo', 'fases', 'tablas', 'hoja', 'tarjeta']),
    )
  })

  it('ninguna sección es una de las que se mudaron', () => {
    const claves = SECCIONES.map((seccion: SeccionDeConfiguracion) => seccion.clave)
    for (const vieja of ['cotizacion', 'flujos', 'logistica']) {
      expect(claves).not.toContain(vieja)
    }
  })
})

describe('grupos visibles de configuración', () => {
  it('agrupa lo visible: sólo leads.configurar es «Ventas › Leads»; sin permisos, nada', () => {
    const leads: Permisos = [{ clave: 'leads.configurar', origenId: null, alcance: 'todos' }]
    expect(
      gruposVisibles(leads).map((g) => ({
        clave: g.clave,
        secciones: g.secciones.map((s) => s.clave),
      })),
    ).toEqual([{ clave: 'ventas', secciones: ['leads'] }])
    expect(gruposVisibles([])).toEqual([])
  })

  it('con sólo leads.configurar, al navegador va «Campos», la única sub-ruta, con su motivo', () => {
    const leads: Permisos = [{ clave: 'leads.configurar', origenId: null, alcance: 'todos' }]
    const [ventas] = paraElNavegador(gruposVisibles(leads))
    expect(
      ventas?.secciones[0]?.subsecciones.map((sub) => [sub.clave, sub.motivo !== undefined]),
    ).toEqual([['campos', true]])
  })
})

// Una sección de prueba con la forma de una del registro (Repuestos ya no es de Configuración: la configuración vive en Repuestos).
const SECCION_DE_PRUEBA: SeccionDeConfiguracion = {
  clave: 'repuestos',
  titulo: 'Repuestos',
  descripcion: 'Una sección de prueba.',
  palabras: ['piezas', 'flujo'],
  ruta: '/configuracion/repuestos',
  Icono: ShieldCheckIcon,
  permisos: ['repuestos.configurar'],
  grupo: 'ventas',
  subsecciones: [],
}

describe('sub-secciones de configuración', () => {
  // Una sección de prueba con una índice, una que pide otro permiso sin motivo y otra con motivo.
  const conSub: SeccionDeConfiguracion = {
    ...SECCION_DE_PRUEBA,
    subsecciones: [
      {
        clave: 'a',
        titulo: 'A',
        descripcion: 'La A.',
        ruta: '/configuracion/repuestos',
        permisos: ['repuestos.configurar'],
      },
      {
        clave: 'b',
        titulo: 'B',
        descripcion: 'La B.',
        ruta: '/configuracion/repuestos/b',
        permisos: ['equipo.roles.gestionar'],
      },
      {
        clave: 'c',
        titulo: 'C',
        descripcion: 'La C.',
        ruta: '/configuracion/repuestos/c',
        permisos: ['equipo.roles.gestionar'],
        motivoSinPermiso: 'Pide el permiso «Roles».',
      },
    ],
  }
  const repuestos: Permisos = [{ clave: 'repuestos.configurar', origenId: null, alcance: 'todos' }]

  it('una sub-sección sin permiso no figura; con motivo, figura apagada', () => {
    const visible = conSubseccionesVisibles(conSub, repuestos)
    expect(visible.subsecciones.map((s) => [s.clave, s.apagada ?? false])).toEqual([
      ['a', false],
      ['c', true],
    ])
    const todas = conSubseccionesVisibles(conSub, [
      ...repuestos,
      { clave: 'equipo.roles.gestionar', origenId: null, alcance: 'todos' },
    ])
    expect(todas.subsecciones.map((s) => [s.clave, s.apagada ?? false])).toEqual([
      ['a', false],
      ['b', false],
      ['c', false],
    ])
  })

  it('al navegador no viajan iconos, permisos ni frases, las palabras sí, y el motivo sólo en la apagada', () => {
    const [grupo] = paraElNavegador([
      {
        clave: 'ventas',
        titulo: 'Ventas',
        secciones: [conSubseccionesVisibles(conSub, repuestos)],
      },
    ])
    expect(grupo?.secciones[0]).toEqual({
      clave: 'repuestos',
      titulo: 'Repuestos',
      ruta: '/configuracion/repuestos',
      palabras: SECCION_DE_PRUEBA.palabras,
      subsecciones: [
        { clave: 'a', titulo: 'A', ruta: '/configuracion/repuestos' },
        {
          clave: 'c',
          titulo: 'C',
          ruta: '/configuracion/repuestos/c',
          motivo: 'Pide el permiso «Roles».',
        },
      ],
    })
  })

  it('la primera sub-sección abierta es la primera con permiso, o ninguna', () => {
    const roles: Permisos = [{ clave: 'equipo.roles.gestionar', origenId: null, alcance: 'todos' }]
    expect(primeraSubseccionAbierta(conSub, repuestos)).toBe('/configuracion/repuestos')
    expect(primeraSubseccionAbierta(conSub, roles)).toBe('/configuracion/repuestos/b')
    expect(primeraSubseccionAbierta(conSub, [])).toBeNull()
  })
})

describe('sub-secciones agrupadas de configuración', () => {
  const repuestos: Permisos = [{ clave: 'repuestos.configurar', origenId: null, alcance: 'todos' }]

  it('el grupo viaja sólo si la sub-sección lo declara', () => {
    const conGrupo: SeccionDeConfiguracion = {
      ...SECCION_DE_PRUEBA,
      subsecciones: [
        {
          clave: 'x',
          titulo: 'X',
          descripcion: 'La X.',
          ruta: '/configuracion/repuestos/x',
          permisos: ['repuestos.configurar'],
          grupo: 'Por origen',
        },
      ],
    }
    const [grupo] = paraElNavegador([
      {
        clave: 'ventas',
        titulo: 'Ventas',
        secciones: [conSubseccionesVisibles(conGrupo, repuestos)],
      },
    ])
    expect(grupo?.secciones[0]?.subsecciones).toEqual([
      {
        clave: 'x',
        titulo: 'X',
        ruta: '/configuracion/repuestos/x',
        grupo: 'Por origen',
      },
    ])
  })
})
