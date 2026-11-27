import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { EntradaDeLaBandeja } from '../hooks/use-bandeja'
import { FilaDeLaBandeja } from './fila-de-la-bandeja'

const entrada = (nombre: string, mime: string, bytes: number): EntradaDeLaBandeja => ({
  archivo: new File(['x'], nombre, { type: mime }),
  datos: { nombre, mime, bytes, hash: `hash-${nombre}` },
})

const crear = vi.fn(() => 'blob:local')
const revocar = vi.fn()

beforeEach(() => {
  crear.mockClear()
  revocar.mockClear()
  vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: crear, revokeObjectURL: revocar }))
})
afterEach(cleanup)

function dibujar(e: EntradaDeLaBandeja, alVer = vi.fn()) {
  render(<FilaDeLaBandeja entrada={e} deshabilitado={false} alQuitar={vi.fn()} alVer={alVer} />)
  return alVer
}

describe('FilaDeLaBandeja', () => {
  it('una imagen liviana muestra su miniatura local y la revoca al irse', () => {
    const { unmount } = render(
      <FilaDeLaBandeja
        entrada={entrada('frente.jpg', 'image/jpeg', 200_000)}
        deshabilitado={false}
        alQuitar={vi.fn()}
        alVer={vi.fn()}
      />,
    )
    expect(
      document.querySelector('[data-miniatura-del-documento="imagen"] img')?.getAttribute('src'),
    ).toBe('blob:local')
    unmount()
    expect(revocar).toHaveBeenCalledWith('blob:local')
  })

  it('un PDF muestra el icono con su extensión y no crea ninguna URL', () => {
    dibujar(entrada('bl.pdf', 'application/pdf', 200_000))
    const caja = document.querySelector('[data-miniatura-del-documento="icono"]')
    expect(caja?.textContent).toBe('PDF')
    expect(crear).not.toHaveBeenCalled()
  })

  it('una imagen pesada no se dibuja: icono', () => {
    dibujar(entrada('grande.png', 'image/png', 5_000_000))
    expect(document.querySelector('[data-miniatura-del-documento="icono"]')?.textContent).toBe(
      'PNG',
    )
    expect(crear).not.toHaveBeenCalled()
  })

  it('tocar el archivo pide la vista previa', () => {
    const alVer = dibujar(entrada('bl.pdf', 'application/pdf', 1000))
    fireEvent.click(screen.getByRole('button', { name: 'Ver bl.pdf' }))
    expect(alVer).toHaveBeenCalledTimes(1)
  })
})
