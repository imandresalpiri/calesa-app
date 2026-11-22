import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  textoDelTopeDeNiveles,
  type ListaDeNiveles,
  type NivelDeAcceso,
} from '../../../entities/nivel'
import { NivelesEnLaMatriz, type HuecosDeNiveles } from './niveles-en-la-matriz'

const refrescar = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: refrescar }) }))
vi.mock('../hooks/use-niveles', () => ({
  useNiveles: (lista: ListaDeNiveles) => ({
    lista,
    niveles: lista.niveles,
    anuncio: '',
    cambio: null,
    enCurso: false,
    retirar: vi.fn(),
    restaurar: vi.fn(),
  }),
}))
vi.mock('../hooks/use-modal-de-nivel', () => ({
  useModalDeNivel: () => ({ abierto: false, abrirNuevo: vi.fn(), abrirRenombre: vi.fn() }),
}))
vi.mock('../hooks/use-eliminar-nivel-por-url', () => ({
  useEliminarNivelPorUrl: () => ({ abierto: false, abrir: vi.fn(), cerrar: vi.fn(), nivel: null }),
}))
vi.mock('./ventanas-de-niveles', () => ({ VentanasDeNiveles: () => <i>ventanas</i> }))
vi.mock('./diferidos', () => ({
  MasAccionesDeNivelDiferido: ({ nombre }: { nombre: string }) => (
    <button type="button">Más acciones de {nombre}</button>
  ),
}))

const nivel = (n: number, extra: Partial<NivelDeAcceso> = {}): NivelDeAcceso => ({
  id: `00000000-0000-4000-8000-00000000000${String(n)}`,
  clave: `nivel_${String(n)}`,
  nombre: `Nivel ${String(n)}`,
  retiradoEn: null,
  actualizadoEn: '2026-11-20T12:00:00.000Z',
  seRenombra: true,
  seRetira: true,
  seElimina: true,
  motivoDeUso: null,
  ...extra,
})

const todos = nivel(0, {
  clave: 'todos',
  nombre: 'Todos',
  seRenombra: false,
  seRetira: false,
  seElimina: false,
})

function dibujar(lista: ListaDeNiveles | null, puedeGestionar: boolean) {
  let recibidos: HuecosDeNiveles | null = null
  render(
    <NivelesEnLaMatriz lista={lista} puedeGestionar={puedeGestionar}>
      {(huecos): ReactNode => {
        recibidos = huecos
        return (
          <div>
            {huecos.cabeza}
            {huecos.menuDelNivel('nivel_1')}
            {huecos.menuDelNivel('no_esta')}
            {huecos.pie}
            {huecos.ventanas}
          </div>
        )
      }}
    </NivelesEnLaMatriz>,
  )
  return recibidos as HuecosDeNiveles | null
}

afterEach(() => {
  cleanup()
  refrescar.mockClear()
})

describe('NivelesEnLaMatriz', () => {
  const lista: ListaDeNiveles = { tope: 10, niveles: [todos, nivel(1)] }

  it('con gestionar: «Todos» con su frase, el «⋯» del nivel que está y el pie', () => {
    dibujar(lista, true)
    expect(screen.getByText('Todos')).toBeInTheDocument()
    expect(screen.getByText('No se cambia · Lo ve quien ve la cotización')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /Más acciones de/ })).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Nuevo nivel' })).toBeEnabled()
    expect(screen.getByText('ventanas')).toBeInTheDocument()
  })

  it('sin gestionar no hay «⋯» ni pie', () => {
    dibujar(lista, false)
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('en el tope, «Nuevo nivel» se apaga y dice por qué, unido por aria-describedby', () => {
    const llena: ListaDeNiveles = { tope: 2, niveles: [todos, nivel(1)] }
    dibujar(llena, true)
    const boton = screen.getByRole('button', { name: 'Nuevo nivel' })
    expect(boton).toBeDisabled()
    expect(boton).toHaveAccessibleDescription(textoDelTopeDeNiveles(2))
  })

  it('con la lista sin leer, el error con «Reintentar» y nada más', () => {
    dibujar(null, true)
    expect(screen.getByText('No pudimos cargar los niveles de acceso.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Nuevo nivel' })).toBeNull()
    expect(screen.queryByRole('button', { name: /Más acciones de/ })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(refrescar).toHaveBeenCalled()
  })
})
