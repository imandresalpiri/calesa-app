import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CampoBase } from '@/shared/lib/campos'
import { FilaDeCampo } from './fila-de-campo'

afterEach(cleanup)

const CAMPO: CampoBase = {
  id: '00000000-0000-0000-0000-000000000001',
  clave: 'color',
  etiqueta: 'Color',
  tipo: 'texto',
  opciones: [],
  requerido: false,
  grupoId: '0b7a8c1e-2f4d-4c6b-9a1e-3d5f7b9c1a2e',
  grupo: 'Vehículo',
  ordenDelGrupo: 10,
  orden: 10,
  valorDefecto: null,
  minimo: null,
  maximo: null,
  esSistema: true,
  activo: true,
  actualizadoEn: '2026-10-12T20:00:00+00:00',
}

function fila(props: Partial<Parameters<typeof FilaDeCampo>[0]> = {}) {
  const alElegir = vi.fn()
  render(
    <ul>
      <FilaDeCampo
        campo={CAMPO}
        insignias={[]}
        puedeGestionar
        puedeSubir={false}
        puedeBajar
        casilla={null}
        conAsa={false}
        alElegir={alElegir}
        {...props}
      />
    </ul>,
  )
  return alElegir
}

describe('FilaDeCampo', () => {
  it('tocar la fila abre el campo; el «⋯» va aparte', () => {
    const alElegir = fila()
    fireEvent.click(screen.getByRole('button', { name: 'Editar Color' }))
    expect(alElegir).toHaveBeenCalledWith(CAMPO.id, 'abrir')
    expect(screen.getByRole('button', { name: 'Más acciones de Color' })).toBeTruthy()
  })

  it('sin permiso, la fila se ofrece sólo para ver', () => {
    fila({ puedeGestionar: false })
    expect(screen.getByRole('button', { name: 'Ver Color' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Editar Color' })).toBeNull()
  })

  it('dice su tipo y su clave', () => {
    fila()
    expect(screen.getByText('color')).toBeTruthy()
  })

  it('un campo de fábrica y uno requerido lo dicen con texto, antes de lo demás', () => {
    fila({ campo: { ...CAMPO, requerido: true }, insignias: ['Dato clave', 'Filtrable'] })
    const textos = [...document.querySelectorAll('[data-slot=badge]')].map(
      (nodo) => nodo.textContent,
    )
    expect(textos).toEqual(['Requerido', 'De fábrica', 'Dato clave', 'Filtrable'])
  })

  it('con el asa pedida y sin el arrastre todavía, guarda su lugar sin ser un botón', () => {
    fila({ conAsa: true })
    expect(document.querySelector('[data-asa] [aria-hidden]')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Mover/ })).toBeNull()
  })

  it('con el arrastre, dibuja el asa que le dan', () => {
    fila({ conAsa: true, asa: <button type="button">Mover «Color»</button> })
    expect(screen.getByRole('button', { name: 'Mover «Color»' })).toBeTruthy()
  })
})
