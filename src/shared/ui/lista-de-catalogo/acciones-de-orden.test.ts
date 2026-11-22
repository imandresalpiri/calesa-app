import { describe, expect, it, vi } from 'vitest'
import type { AccionDeMenu } from '../lista'
import { accionesConOrden } from './acciones-de-orden'
import type { FilaDeCatalogo } from './tipos'

function fila(extra: Partial<FilaDeCatalogo> & { acciones: AccionDeMenu[] }): FilaDeCatalogo {
  return {
    id: 'a',
    nombre: 'Puertos',
    icono: null,
    activo: true,
    insignias: [],
    uso: '',
    puedeSubir: true,
    puedeBajar: true,
    ...extra,
  }
}

const EDITAR: AccionDeMenu = {
  tipo: 'accion',
  clave: 'editar',
  etiqueta: 'Editar…',
  principal: true,
  alElegir: () => undefined,
}
const ELIMINAR: AccionDeMenu = {
  tipo: 'accion',
  clave: 'eliminar',
  etiqueta: 'Eliminar',
  destructiva: true,
  alElegir: () => undefined,
}

describe('accionesConOrden', () => {
  it('pone «Subir» y «Bajar» justo después de la acción principal', () => {
    const lineas = accionesConOrden(fila({ acciones: [EDITAR, ELIMINAR] }), () => undefined)
    expect(lineas.map((l) => l.clave)).toEqual(['editar', 'orden-subir', 'orden-bajar', 'eliminar'])
  })

  it('las deja después de la nota del motivo de la principal', () => {
    const nota: AccionDeMenu = { tipo: 'nota', clave: 'motivo', texto: 'Sin permiso.' }
    const lineas = accionesConOrden(fila({ acciones: [EDITAR, nota, ELIMINAR] }), () => undefined)
    expect(lineas.map((l) => l.clave)).toEqual([
      'editar',
      'motivo',
      'orden-subir',
      'orden-bajar',
      'eliminar',
    ])
  })

  it('apaga la que no se puede y dice por qué', () => {
    const lineas = accionesConOrden(
      fila({ acciones: [EDITAR], puedeSubir: false }),
      () => undefined,
    )
    const subir = lineas.find((l) => l.clave === 'orden-subir')
    expect(subir?.tipo === 'accion' && subir.deshabilitada).toBe(true)
    expect(lineas.find((l) => l.clave === 'orden-motivo-subir')).toMatchObject({
      texto: 'Ya es el primero de la lista.',
    })
  })

  it('en una fila de sólo lectura dice el motivo una sola vez', () => {
    const lineas = accionesConOrden(
      fila({
        acciones: [EDITAR],
        puedeSubir: false,
        puedeBajar: false,
        motivoSinOrden: 'Sólo quien gestiona puede ordenar.',
      }),
      () => undefined,
    )
    expect(lineas.filter((l) => l.tipo === 'nota')).toHaveLength(1)
  })

  it('elegir una mueve en su dirección', () => {
    const mover = vi.fn()
    const lineas = accionesConOrden(fila({ acciones: [EDITAR] }), mover)
    for (const linea of lineas) {
      if (linea.tipo === 'accion' && linea.clave === 'orden-bajar') {
        linea.alElegir()
      }
    }
    expect(mover).toHaveBeenCalledWith('bajar')
  })
})
