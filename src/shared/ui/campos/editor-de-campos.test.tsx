import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { withNuqsTestingAdapter } from 'nuqs/adapters/testing'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CampoBase } from '@/shared/lib/campos'
import {
  CAMPO,
  configuracion,
  ediciones,
  grupos,
  type Cambios,
  type Nuevo,
} from './campos-de-prueba.soporte'
import { EditorDeCampos } from './editor-de-campos'
import type { CasillasDelEditor, FijosDelEditor } from './tipos'

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))
vi.mock('@/shared/ui/toasts', () => ({
  avisar: vi.fn(),
  avisarError: vi.fn(),
  avisarExito: vi.fn(),
}))

afterEach(cleanup)

const campo = (id: string, etiqueta: string, extra: Partial<CampoBase> = {}): CampoBase => ({
  ...CAMPO,
  id,
  clave: id,
  etiqueta,
  ...extra,
})

const CAMPOS = [
  campo('anio_fab', 'Año de fabricación'),
  campo('color', 'Color'),
  campo('viejo', 'Viejo', { activo: false }),
]

const casillas = (lista: CasillasDelEditor['lista']): CasillasDelEditor => ({
  titulo: 'Datos clave',
  zona: 'los datos clave',
  tope: 4,
  vacio: 'Sin datos clave.',
  motivoTope: 'Ya hay 4.',
  insignia: 'Dato clave',
  hacer: 'Hacer dato clave',
  quitar: 'Quitar de los datos clave',
  notaAlDesactivar: 'También sale de los datos clave.',
  lista,
  enCurso: false,
  llaveDeCampo: (otro) => `campo:${otro.clave}`,
  alPoner: vi.fn(),
  alQuitar: vi.fn(),
  alMover: vi.fn(),
})

const FIJOS: FijosDelEditor = {
  titulo: 'Comunes',
  insignia: 'Común',
  filas: [{ llave: 'comun:vin', etiqueta: 'VIN' }],
}

function montar(
  props: Partial<Parameters<typeof EditorDeCampos<CampoBase, Cambios, Nuevo>>[0]> = {},
  url = '',
) {
  const Con = withNuqsTestingAdapter({ searchParams: url })
  render(
    <Con>
      <EditorDeCampos
        campos={CAMPOS}
        puedeGestionar
        configuracion={configuracion}
        ediciones={ediciones()}
        grupos={grupos()}
        {...props}
      />
    </Con>,
  )
}

describe('EditorDeCampos', () => {
  it('busca por nombre sin tildes; sin nada que coincida, «Limpiar» vuelve a todo', () => {
    montar()
    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar campo' }), {
      target: { value: 'ano' },
    })
    expect(screen.getByRole('button', { name: 'Editar Año de fabricación' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Editar Color' })).toBeNull()
    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar campo' }), {
      target: { value: 'zzz' },
    })
    expect(screen.getByText('Nada coincide con «zzz».')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Limpiar' }))
    expect(screen.getByRole('button', { name: 'Editar Color' })).toBeTruthy()
    expect(document.activeElement).toBe(screen.getByRole('searchbox', { name: 'Buscar campo' }))
  })

  it('los desactivados van a la vista y sin conteo', () => {
    montar()
    expect(screen.getByRole('heading', { level: 3, name: 'Desactivados' })).toBeTruthy()
    expect(document.querySelector('details')).toBeNull()
  })

  it('las casillas dicen el tope, los lugares libres y marcan con una insignia lo que ya es dato clave', () => {
    montar({
      casillas: casillas([{ llave: 'campo:color', etiqueta: 'Color', deDonde: 'Campo · Datos' }]),
      fijos: FIJOS,
    })
    const region = screen.getByRole('region', { name: 'Datos clave (1 de 4)' })
    expect(region.querySelectorAll('li')).toHaveLength(4)
    expect(region.textContent).toContain('Libre')
    const fila = screen.getByRole('button', { name: 'Editar Color' }).closest('li')
    expect(fila?.textContent).toContain('Dato clave')
    expect(screen.getByRole('button', { name: 'Hacer dato clave: VIN' })).toBeTruthy()
    expect(screen.getByText('Común')).toBeTruthy()
  })

  it('sin permiso: «Nuevo campo» apagado, el motivo a la vista, sin asas y las filas para ver', () => {
    montar({ puedeGestionar: false })
    expect(screen.getByRole('button', { name: 'Nuevo campo' })).toHaveProperty('disabled', true)
    expect(screen.getByText('Sin permiso.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /^Mover/ })).toBeNull()
    expect(screen.getByRole('button', { name: 'Ver Color' })).toBeTruthy()
  })

  it('sin campos activos, el vacío de primera vez con «Agregar un campo»', () => {
    montar({ campos: [] })
    expect(screen.getByRole('button', { name: 'Agregar un campo' })).toBeTruthy()
  })
})
