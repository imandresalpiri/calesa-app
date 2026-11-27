import { describe, expect, it, vi } from 'vitest'
import { huecosPara } from '@/modules/logistica'
import type { Permisos } from '@/shared/lib/permisos'
import { HUECOS_DEL_GRUPO, huecosDelMenu, paraElMenu } from './huecos-del-grupo'

// Los huecos de las áreas traen componentes reales cuyas Server Actions importan su composición (`server-only`): en Vitest el import llega entero y cae.
vi.mock('server-only', () => ({}))

const TODOS: Permisos = [
  { clave: 'flujos.mover', alcance: 'todos', origenId: null },
  { clave: 'logistica.documentos.subir', alcance: 'todos', origenId: null },
  { clave: 'logistica.gastos.editar', alcance: 'todos', origenId: null },
]

describe('huecos de un embarque y de un contenedor', () => {
  it('van en el orden mover, documentos, gastos', () => {
    expect(HUECOS_DEL_GRUPO.map((h) => h.clave)).toEqual(['mover', 'documentos', 'gastos'])
  })

  it('sin ningún permiso no se dibuja ninguno, y mover va sólo en el contenedor', () => {
    expect(huecosPara('contenedor', HUECOS_DEL_GRUPO, [])).toEqual([])
    expect(HUECOS_DEL_GRUPO.find((h) => h.clave === 'mover')?.en).toEqual(['contenedor'])
  })

  it('el «⋯» no lleva «Mover el contenedor»: es un enlace al lote', () => {
    expect(paraElMenu(huecosDelMenu('contenedor', TODOS))).toEqual([
      { clave: 'documentos', titulo: 'Subir un documento a las unidades' },
      { clave: 'gastos', titulo: 'Prorratear un gasto entre las unidades' },
    ])
  })
})
