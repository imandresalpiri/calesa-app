import { existsSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import type { ClavePermiso, Permisos } from '@/shared/lib/permisos'
import {
  MOTIVO_SIN_PERMISO,
  PESTANAS_DE_LA_CONFIGURACION,
  pestanaDeLaConfiguracion,
  pestanasParaLaPersona,
  primeraPestanaAbierta,
  puedeAbrirLaPestana,
  type PestanaDeLaConfiguracion,
} from './pestanas'

const con = (clave: ClavePermiso, origenId: string | null = null): Permisos => [
  { clave, origenId, alcance: 'todos' },
]
const APP = path.join(process.cwd(), 'src/app/(app)')

describe('las pestañas de Logística › Configuración', () => {
  it('son Puertos, Navieras, Categorías de gasto y Tipos de documento, cada una su sub-ruta', () => {
    expect(PESTANAS_DE_LA_CONFIGURACION.map((p) => [p.titulo, p.ruta])).toEqual([
      ['Puertos', '/logistica/configuracion/puertos'],
      ['Navieras', '/logistica/configuracion/navieras'],
      ['Categorías de gasto', '/logistica/configuracion/categorias-de-gasto'],
      ['Tipos de documento', '/logistica/configuracion/tipos-de-documento'],
    ])
  })

  it('cada una lleva a una página que existe, con su esqueleto: nunca una sub-ruta muerta', () => {
    for (const pestana of PESTANAS_DE_LA_CONFIGURACION) {
      expect(existsSync(path.join(APP, pestana.ruta, 'page.tsx')), pestana.clave).toBe(true)
      expect(existsSync(path.join(APP, pestana.ruta, 'loading.tsx')), pestana.clave).toBe(true)
    }
    expect(existsSync(path.join(APP, 'logistica/configuracion/route.ts'))).toBe(true)
  })

  it('los catálogos se abren con `logistica.catalogos.gestionar`, en algún origen', () => {
    for (const clave of ['puertos', 'navieras', 'categorias-de-gasto']) {
      const pestana = pestanaDeLaConfiguracion(clave)
      expect(pestana, clave).not.toBeNull()
      expect(puedeAbrirLaPestana(pestana as PestanaDeLaConfiguracion, [])).toBe(false)
      expect(
        puedeAbrirLaPestana(pestana as PestanaDeLaConfiguracion, con('flujos.configurar')),
      ).toBe(false)
      expect(
        puedeAbrirLaPestana(
          pestana as PestanaDeLaConfiguracion,
          con('logistica.catalogos.gestionar', 'o1'),
        ),
      ).toBe(true)
    }
  })

  it('los tipos de documento también los abre quien configura un flujo o los repuestos, de sólo lectura', () => {
    const tipos = pestanaDeLaConfiguracion('tipos-de-documento') as PestanaDeLaConfiguracion
    for (const clave of [
      'logistica.catalogos.gestionar',
      'flujos.configurar',
      'repuestos.configurar',
    ] as const) {
      expect(puedeAbrirLaPestana(tipos, con(clave)), clave).toBe(true)
    }
    expect(puedeAbrirLaPestana(tipos, con('cotizaciones.configurar'))).toBe(false)
  })

  it('una clave que nadie registró no es una pestaña', () => {
    expect(pestanaDeLaConfiguracion('basura')).toBeNull()
  })
})

describe('la primera pestaña que se abre', () => {
  it('con los catálogos, Puertos; quien sólo configura un flujo o los repuestos, Tipos de documento; sin permisos, ninguna', () => {
    expect(primeraPestanaAbierta(con('logistica.catalogos.gestionar'))).toBe(
      '/logistica/configuracion/puertos',
    )
    expect(primeraPestanaAbierta(con('flujos.configurar'))).toBe(
      '/logistica/configuracion/tipos-de-documento',
    )
    expect(primeraPestanaAbierta(con('repuestos.configurar'))).toBe(
      '/logistica/configuracion/tipos-de-documento',
    )
    expect(primeraPestanaAbierta([])).toBeNull()
  })

  it('con una lista dada, la primera de ella que abre', () => {
    const lista: readonly PestanaDeLaConfiguracion[] = [
      { clave: 'a', titulo: 'A', ruta: '/a', permisos: ['logistica.gastos.editar'] },
      { clave: 'b', titulo: 'B', ruta: '/b', permisos: ['logistica.catalogos.gestionar'] },
    ]
    expect(primeraPestanaAbierta(con('logistica.catalogos.gestionar'), lista)).toBe('/b')
  })
})

describe('lo que dibuja la tira', () => {
  it('las que no puede abrir van apagadas con su motivo, no desaparecen', () => {
    expect(
      pestanasParaLaPersona(con('flujos.configurar')).map((p) => [p.clave, p.motivo ?? null]),
    ).toEqual([
      ['puertos', MOTIVO_SIN_PERMISO],
      ['navieras', MOTIVO_SIN_PERMISO],
      ['categorias-de-gasto', MOTIVO_SIN_PERMISO],
      ['tipos-de-documento', null],
    ])
  })

  it('con los catálogos, ninguna apagada', () => {
    expect(
      pestanasParaLaPersona(con('logistica.catalogos.gestionar')).every((p) => !p.motivo),
    ).toBe(true)
  })
})
