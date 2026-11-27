import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DocumentoDeLaUnidad, TipoDeDocumento } from '../../../entities/documentos/documento'

const llamadas = vi.hoisted(() => ({ pedidos: [] as unknown[], conflicto: false }))

// La Server Action trae `server-only` por su composición: aquí es un doble con la forma de `next-safe-action`.
vi.mock('../actions/revisar-documento', () => ({
  revisarDocumento: (pedido: unknown) => {
    llamadas.pedidos.push(pedido)
    return Promise.resolve({
      data: llamadas.conflicto
        ? {
            ok: false,
            error: { codigo: 'conflicto', mensaje: 'Luis cambió este documento hace 1 min.' },
          }
        : { ok: true, data: { id: 'x', actualizadoEn: '2026-11-12T01:00:00Z' } },
    })
  },
}))

import { AccionesDelDocumento } from './acciones-del-documento'

const tipo: TipoDeDocumento = {
  id: '33333333-3333-4333-8333-333333333333',
  nombre: 'BL',
  formatos: ['application/pdf'],
  modoDeVencimiento: 'ninguno',
  vigenciaDias: null,
  visiblePortalPermitido: false,
  flujoId: null,
  orden: 1,
}

const sinMiniaturas = { url: () => null, renovar: () => Promise.resolve(false) }
const abrir = () => ({
  miniaturas: sinMiniaturas,
  alVer: vi.fn(),
  alRechazar: vi.fn(),
  alEditar: vi.fn(),
  alEliminar: vi.fn(),
})

const documento = {
  id: '44444444-4444-4444-8444-444444444444',
  estado: 'subido',
  visiblePortal: false,
  actualizadoEn: '2026-11-12T00:00:00Z',
} as DocumentoDeLaUnidad

beforeEach(() => {
  llamadas.pedidos = []
  llamadas.conflicto = false
})
afterEach(cleanup)

describe('AccionesDelDocumento en la vista previa', () => {
  it('en línea: rechazar escribe el motivo en la misma fila de los botones y «Cancelar» los devuelve', () => {
    render(
      <AccionesDelDocumento
        documento={documento}
        tipo={tipo}
        enLinea
        contexto={{
          unidadId: 'u1',
          claves: { aprobar: true, subir: false },
          tipos: [tipo],
          releer: vi.fn(),
          ...abrir(),
        }}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Rechazar' }))
    // jsdom no aplica el CSS: los botones quedan en el árbol, pero su caja lleva `hidden` (display: none).
    const cajaDeBotones = screen.getByRole('button', { name: 'Aprobar' }).parentElement
    expect(cajaDeBotones?.className).toBe('hidden')
    expect(screen.getByLabelText('Motivo del rechazo')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(cajaDeBotones?.className).not.toContain('hidden')
  })

  it('rechazarAlAbrir arranca con el campo del motivo enfocado, sólo si se puede rechazar', () => {
    const contexto = {
      unidadId: 'u1',
      tipos: [tipo],
      releer: vi.fn(),
      ...abrir(),
    }
    const { unmount } = render(
      <AccionesDelDocumento
        documento={documento}
        tipo={tipo}
        enLinea
        rechazarAlAbrir
        contexto={{ ...contexto, claves: { aprobar: true, subir: false } }}
      />,
    )
    expect(document.activeElement).toBe(screen.getByLabelText('Motivo del rechazo'))
    unmount()
    render(
      <AccionesDelDocumento
        documento={documento}
        tipo={tipo}
        enLinea
        rechazarAlAbrir
        contexto={{ ...contexto, claves: { aprobar: false, subir: true } }}
      />,
    )
    expect(screen.queryByLabelText('Motivo del rechazo')).toBeNull()
    expect(screen.getByRole('button', { name: 'Rechazar' }).hasAttribute('disabled')).toBe(true)
  })
})
