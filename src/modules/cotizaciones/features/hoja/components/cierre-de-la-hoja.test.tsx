import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  CierreDeLaHoja,
  hayCierre,
  TEXTO_DE_SOLO_LECTURA,
  type PropsDelCierre,
} from './cierre-de-la-hoja'
import { ConElMenu } from './menu-de-la-guardada/menu-de-la-guardada.soporte'

const props = (cambios: Partial<PropsDelCierre> = {}): PropsDelCierre => ({
  boton: {
    motivo: null,
    motivoYaDicho: false,
    ocupado: false,
    alGuardar: vi.fn(),
    paraElegir: null,
  },
  soloLectura: false,
  guardado: null,
  version: 1,
  alRecargar: vi.fn(),
  confirmacion: null,
  elecciones: undefined,
  ...cambios,
})

afterEach(cleanup)

describe('CierreDeLaHoja', () => {
  it('en la hoja nueva, «Guardar» a todo el ancho; el clic guarda', () => {
    const p = props()
    render(<CierreDeLaHoja {...p} />)
    const guardar = screen.getByRole('button', { name: 'Guardar' })
    expect(guardar.className).toContain('w-full')
    fireEvent.click(guardar)
    expect(p.boton?.alGuardar).toHaveBeenCalledOnce()
    expect(document.querySelector('[data-cierre-de-la-hoja] [role="status"]')).not.toBeNull()
  })

  it('con un motivo, apagado y el motivo debajo, nombrado por el botón', () => {
    render(
      <CierreDeLaHoja
        {...props({
          boton: {
            motivo: 'Elige un cliente.',
            motivoYaDicho: false,
            ocupado: false,
            alGuardar: vi.fn(),
            paraElegir: null,
          },
        })}
      />,
    )
    const guardar = screen.getByRole('button', { name: 'Guardar' })
    expect(guardar).toHaveProperty('disabled', true)
    expect(guardar.getAttribute('aria-describedby')).toBe('motivo-para-no-guardar')
    expect(screen.getByText('Elige un cliente.')).toBeTruthy()
  })

  it('sólo lectura sin la cabecera de la guardada lo dice aquí (P13); con ella, no (lo dice la cabecera)', () => {
    render(<CierreDeLaHoja {...props({ boton: null, soloLectura: true })} />)
    expect(screen.getByText(TEXTO_DE_SOLO_LECTURA)).toBeTruthy()
    cleanup()
    render(
      <ConElMenu>
        <CierreDeLaHoja {...props({ boton: null, soloLectura: true })} />
      </ConElMenu>,
    )
    expect(screen.queryByText(TEXTO_DE_SOLO_LECTURA)).toBeNull()
  })

  it('sin «Guardar» ni sólo lectura no hay cierre', () => {
    expect(hayCierre({ boton: null, soloLectura: false })).toBe(false)
    expect(hayCierre({ boton: null, soloLectura: true })).toBe(true)
    expect(hayCierre(props())).toBe(true)
  })
})
