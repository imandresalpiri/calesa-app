import { describe, expect, it } from 'vitest'
import type { Permisos } from '@/shared/lib/permisos'
import type { HuecoDelGrupo } from './grupo'
import { huecosPara } from './huecos-del-grupo'

const concede = (clave: string, origenId: string | null): Permisos[number] => ({
  clave: clave as Permisos[number]['clave'],
  origenId,
  alcance: 'todos',
})
const hueco = (clave: string, permisos: string[], en: HuecoDelGrupo['en']) =>
  ({
    clave,
    titulo: clave,
    permisos,
    regla: null,
    en,
    componente: () => null,
  }) as unknown as HuecoDelGrupo
const claves = (lista: readonly { clave: string }[]) => lista.map((h) => h.clave)

const LISTA = [
  hueco('mover', ['flujos.mover'], ['contenedor']),
  hueco('documentos', ['logistica.documentos.subir'], ['embarque', 'contenedor']),
  hueco('gastos', ['logistica.gastos.editar'], ['embarque', 'contenedor']),
]
const TODO = [
  concede('flujos.mover', 'o1'),
  concede('logistica.documentos.subir', 'o1'),
  concede('logistica.gastos.editar', null),
]

describe('huecosPara', () => {
  it('mover va sólo en el contenedor; documentos y gastos, en los dos', () => {
    expect(claves(huecosPara('contenedor', LISTA, TODO))).toEqual(['mover', 'documentos', 'gastos'])
    expect(claves(huecosPara('embarque', LISTA, TODO))).toEqual(['documentos', 'gastos'])
  })

  it('sin el permiso en ningún origen no se dibuja', () => {
    expect(claves(huecosPara('contenedor', LISTA, [concede('flujos.mover', 'o2')]))).toEqual([
      'mover',
    ])
    expect(huecosPara('embarque', LISTA, [])).toEqual([])
  })

  it('el que no pide permiso se dibuja en su entidad', () => {
    expect(claves(huecosPara('embarque', [hueco('notas', [], ['embarque'])], []))).toEqual([
      'notas',
    ])
  })
})
