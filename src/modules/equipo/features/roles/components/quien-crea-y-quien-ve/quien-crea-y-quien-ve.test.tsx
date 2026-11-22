import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { NuqsTestingAdapter } from 'nuqs/adapters/testing'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import type { Permisos } from '@/shared/lib/permisos'
import {
  MOTIVO_HEREDADO,
  MOTIVO_SIN_GESTIONAR_ROLES,
} from '../../../../entities/cuadro-de-cotizaciones'
import { MOTIVO_ROL_NO_DOMINADO } from '../../../../entities/dominancia'
import type { RolConConcesiones } from '../../../../entities/rol'
import { QuienCreaYQuienVe } from './quien-crea-y-quien-ve'

const aplicar = vi.fn()
vi.mock('../../hooks/use-cuadro', () => ({
  useCuadro: () => ({ aplicar, enCurso: null, aviso: null, recargar: vi.fn(), recargando: false }),
}))

const OFICINA = '11111111-1111-4111-8111-111111111111'
const USA = '22222222-2222-4222-8222-222222222222'
const origenes = [
  { id: OFICINA, nombre: 'Oficina' },
  { id: USA, nombre: 'Subasta EE. UU.' },
]
const todo: Permisos = [
  { clave: 'cotizaciones.crear', origenId: null, alcance: 'todos' },
  { clave: 'cotizaciones.ver', origenId: null, alcance: 'todos' },
  { clave: 'cotizaciones.privadas.ver', origenId: null, alcance: 'todos' },
]

const rol = (nombre: string, concesiones: Permisos): RolConConcesiones => ({
  id:
    nombre === 'Ventas'
      ? '33333333-3333-4333-8333-333333333333'
      : '44444444-4444-4444-8444-444444444444',
  clave: nombre.toLowerCase(),
  nombre,
  color: null,
  esSistema: false,
  actualizadoEn: '2026-11-20T12:00:00.000Z',
  concesiones,
  personas: { n: 1, hayMas: false },
})

const ventas = rol('Ventas', [{ clave: 'cotizaciones.ver', origenId: null, alcance: 'propios' }])

function cuadro(props: Partial<Parameters<typeof QuienCreaYQuienVe>[0]> = {}, url = '') {
  render(
    <NuqsTestingAdapter searchParams={url}>
      <QuienCreaYQuienVe
        roles={[ventas]}
        origenes={origenes}
        misPermisos={todo}
        puedeGestionar
        {...props}
      />
    </NuqsTestingAdapter>,
  )
}

beforeAll(() => {
  // jsdom no trae matchMedia: se prueba como una pantalla ancha (la tabla).
  vi.stubGlobal('matchMedia', () => ({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
})

afterEach(() => {
  cleanup()
  aplicar.mockClear()
})

describe('QuienCreaYQuienVe', () => {
  it('elegir «Todas, también las privadas» da `ver` y después las privadas', () => {
    cuadro()
    const ve = screen.getByRole('combobox', { name: 'Ve: Ventas' })
    expect(ve).toHaveValue('suyas')
    fireEvent.change(ve, { target: { value: 'todas' } })
    expect(aplicar).toHaveBeenCalledWith(ventas, { ve: 'todas' }, [
      { tipo: 'otorgar', clave: 'cotizaciones.ver', origenId: null, alcance: 'todos' },
      { tipo: 'otorgar', clave: 'cotizaciones.privadas.ver', origenId: null, alcance: 'todos' },
    ])
  })

  it('«Crea» da el permiso en el origen elegido', () => {
    cuadro({}, `?origen=${OFICINA}`)
    expect(screen.getByRole('combobox', { name: 'Origen' })).toHaveValue(OFICINA)
    fireEvent.click(screen.getByRole('switch', { name: 'Crea: Ventas' }))
    expect(aplicar).toHaveBeenCalledWith(ventas, { crea: true }, [
      { tipo: 'otorgar', clave: 'cotizaciones.crear', origenId: OFICINA, alcance: 'todos' },
    ])
  })

  it('en un origen, lo heredado no se baja y dice dónde se cambia', () => {
    cuadro({}, `?origen=${USA}`)
    const ve = screen.getByRole('combobox', { name: 'Ve: Ventas' })
    expect(screen.getByRole('option', { name: 'No ve' })).toBeDisabled()
    expect(ve).toHaveAccessibleDescription(MOTIVO_HEREDADO)
  })

  it('sin «Gestionar roles», sólo lectura: el motivo ya no va en línea (está en el «!» de la página)', () => {
    cuadro({ puedeGestionar: false })
    expect(screen.queryByText(MOTIVO_SIN_GESTIONAR_ROLES)).toBeNull()
    expect(screen.queryByRole('combobox', { name: 'Ve: Ventas' })).toBeNull()
    expect(screen.getByText('Sólo las suyas')).toBeInTheDocument()
  })

  it('un rol con permisos que quien mira no tiene, sólo lectura con el motivo de la matriz', () => {
    cuadro({ roles: [rol('Gerencia', todo)], misPermisos: [todo[1]!] })
    expect(screen.getByText(MOTIVO_ROL_NO_DOMINADO)).toBeInTheDocument()
    expect(screen.queryByRole('switch', { name: 'Crea: Gerencia' })).toBeNull()
  })

  it('con un solo origen no hay selector de lugar', () => {
    cuadro({ origenes: [origenes[0]!] })
    expect(screen.queryByRole('combobox', { name: 'Origen' })).toBeNull()
  })
})
