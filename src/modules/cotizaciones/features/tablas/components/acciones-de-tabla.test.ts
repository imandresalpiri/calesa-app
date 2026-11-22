import { describe, expect, it, vi } from 'vitest'
import type { AccionDeMenu } from '@/shared/ui/lista'
import {
  AVISO_CON_CAMBIOS_DE_FILAS,
  AVISO_CON_CAMBIOS_DE_FILAS_AL_DESACTIVAR,
} from '../../../entities/tablas/estructura'
import { menuDeTablaEnElEditor, menuDeTablaEnLaLista } from './acciones-de-tabla'

const claves = (lineas: AccionDeMenu[]) => lineas.map((l) => l.clave)
const apagadas = (lineas: AccionDeMenu[]) =>
  lineas.filter((l) => l.tipo === 'accion' && l.deshabilitada).map((l) => l.clave)
const notas = (lineas: AccionDeMenu[]) =>
  lineas.flatMap((l) => (l.tipo === 'nota' ? [l.texto] : []))

describe('menuDeTablaEnLaLista', () => {
  it('Editar filas · Columnas · ─ · Desactivar, y cada una llama a lo suyo', () => {
    const quehaceres = { alEditarFilas: vi.fn(), alAbrirColumnas: vi.fn(), alDesactivar: vi.fn() }
    const lineas = menuDeTablaEnLaLista(quehaceres)
    expect(claves(lineas)).toEqual([
      'editar-filas',
      'columnas',
      'antes-de-desactivar',
      'desactivar',
    ])
    expect(apagadas(lineas)).toEqual([])
    expect(lineas.filter((l) => l.tipo === 'accion' && l.principal).map((l) => l.clave)).toEqual([
      'editar-filas',
    ])
    for (const linea of lineas) if (linea.tipo === 'accion') linea.alElegir()
    expect(quehaceres.alEditarFilas).toHaveBeenCalledOnce()
    expect(quehaceres.alAbrirColumnas).toHaveBeenCalledOnce()
    expect(quehaceres.alDesactivar).toHaveBeenCalledOnce()
  })

  it('Desactivar es destructiva', () => {
    const lineas = menuDeTablaEnLaLista({
      alEditarFilas: vi.fn(),
      alAbrirColumnas: vi.fn(),
      alDesactivar: vi.fn(),
    })
    expect(lineas.find((l) => l.clave === 'desactivar')).toMatchObject({ destructiva: true })
  })
})

describe('menuDeTablaEnElEditor', () => {
  const quehaceres = { alAbrirColumnas: vi.fn(), alDesactivar: vi.fn() }

  it('sin cambios de filas: Columnas · ─ · Desactivar, encendidas', () => {
    const lineas = menuDeTablaEnElEditor({ ...quehaceres, cambios: false })
    expect(claves(lineas)).toEqual(['columnas', 'antes-de-desactivar', 'desactivar'])
    expect(apagadas(lineas)).toEqual([])
  })

  it('con cambios de filas: las dos apagadas, cada una con su motivo', () => {
    const lineas = menuDeTablaEnElEditor({ ...quehaceres, cambios: true })
    expect(apagadas(lineas)).toEqual(['columnas', 'desactivar'])
    expect(notas(lineas)).toEqual([
      AVISO_CON_CAMBIOS_DE_FILAS,
      AVISO_CON_CAMBIOS_DE_FILAS_AL_DESACTIVAR,
    ])
  })
})
