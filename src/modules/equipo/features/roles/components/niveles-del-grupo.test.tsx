import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { NivelDeLaMatriz, PermisoDelCatalogo } from '../../../entities/matriz'
import type { ColumnaDeRol } from './grupo-matriz'
import type { HuecosDeNivelesEnLaMatriz } from './huecos-de-niveles'
import { NivelesDelGrupo } from './niveles-del-grupo'

vi.mock('./celda-concesion', () => ({ CeldaConcesion: () => <span>celda</span> }))

const permiso = (clave: string, accion: 'ver' | 'editar', nombre: string): PermisoDelCatalogo => ({
  clave: `cotizaciones.nivel.${clave}.${accion}` as PermisoDelCatalogo['clave'],
  modulo: 'cotizaciones',
  nombre: `${accion === 'ver' ? 'Ver' : 'Editar'} el nivel «${nombre}»`,
  descripcion: 'Qué ve o edita quien lo tiene',
  porOrigen: true,
  conAlcance: false,
  nivel: { clave, nombre, retirado: false },
})

const nivel = (clave: string, nombre: string, retirado = false): NivelDeLaMatriz => ({
  clave,
  nombre,
  retirado,
  permisos: [permiso(clave, 'ver', nombre), permiso(clave, 'editar', nombre)],
})

const columnas: ColumnaDeRol[] = [
  {
    rol: {
      id: '33333333-3333-4333-8333-333333333333',
      clave: 'ventas',
      nombre: 'Ventas',
      color: null,
      esSistema: false,
      actualizadoEn: '2026-11-20T12:00:00.000Z',
      concesiones: [],
      personas: { n: 0, hayMas: false },
    },
    editable: true,
    ocupado: false,
  },
]

const huecos: HuecosDeNivelesEnLaMatriz = {
  cabeza: <span>Todos · No se cambia</span>,
  menuDelNivel: (clave) => <button type="button">Más acciones de {clave}</button>,
  pie: <button type="button">Nuevo nivel</button>,
  ventanas: null,
}

function tabla(niveles: NivelDeLaMatriz[], con: HuecosDeNivelesEnLaMatriz | undefined) {
  render(
    <table>
      <tbody>
        <NivelesDelGrupo
          niveles={niveles}
          huecos={con}
          columnas={columnas}
          origenes={[]}
          misPermisos={[]}
          alAplicar={vi.fn()}
        />
      </tbody>
    </table>,
  )
}

afterEach(cleanup)

describe('NivelesDelGrupo', () => {
  it('pone el rótulo, la cabeza y el pie, y el «⋯» sólo en la primera fila de cada nivel', () => {
    tabla([nivel('alamo', 'Álamo'), nivel('zeta', 'Zeta')], huecos)
    expect(screen.getByRole('columnheader', { name: 'Niveles de acceso' })).toBeInTheDocument()
    expect(screen.getByText('Todos · No se cambia')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Nuevo nivel' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /Más acciones de/ })).toHaveLength(2)
    const filas = screen.getAllByRole('row').filter((fila) => fila.hasAttribute('data-permiso'))
    expect(filas.map((fila) => fila.getAttribute('data-permiso'))).toEqual([
      'cotizaciones.nivel.alamo.ver',
      'cotizaciones.nivel.alamo.editar',
      'cotizaciones.nivel.zeta.ver',
      'cotizaciones.nivel.zeta.editar',
    ])
    expect(within(filas[0]!).getByRole('button', { name: 'Más acciones de alamo' })).toBeVisible()
    expect(within(filas[1]!).queryByRole('button')).toBeNull()
  })

  it('un retirado lleva la insignia «Retirado» en sus dos filas y conserva su nombre', () => {
    tabla([nivel('alamo', 'Álamo', true)], huecos)
    expect(screen.getAllByText('Retirado')).toHaveLength(2)
    expect(screen.getByText('Ver el nivel «Álamo»')).toBeInTheDocument()
  })

  it('sin huecos, las filas se agrupan igual pero sin cabeza, «⋯» ni pie', () => {
    tabla([nivel('alamo', 'Álamo')], undefined)
    expect(screen.getByRole('columnheader', { name: 'Niveles de acceso' })).toBeInTheDocument()
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.getAllByText(/el nivel «Álamo»/)).toHaveLength(2)
  })
})
