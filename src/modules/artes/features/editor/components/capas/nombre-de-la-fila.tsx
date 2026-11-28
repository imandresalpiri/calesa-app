'use client'

import { cn } from 'cn'
import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { modoDelClic } from '../../../../entities/editor/capas-en-la-lista'
import type { ModoDeElegir } from '../../../../entities/editor/estado'
import { CampoDeNombre, type FinDelNombre } from './campo-de-nombre'

type Props = {
  icono: ReactNode
  nombre: string
  // Con lo que entra el campo al renombrar (el de la capa sin nombre propio, el que dice lo que es).
  inicial: string
  // Oculta (ella o su grupo): el nombre se ve tenue.
  apagada: boolean
  soloLectura: boolean
  renombrando: boolean
  alCambiarRenombrando: (renombrando: boolean) => void
  alElegir: (modo: ModoDeElegir) => void
  alRenombrar: (nombre: string) => void
}

// El icono y el nombre de una fila de «Capas». Un clic elige la fila (Mayús suma, Ctrl o ⌘ alterna); doble clic o F2 la renombra en su lugar
// (no en sólo lectura). Al terminar con el teclado, el foco vuelve al nombre.
export function NombreDeLaFila(props: Props) {
  const { nombre, inicial, renombrando, alCambiarRenombrando, soloLectura } = props
  const boton = useRef<HTMLButtonElement>(null)
  const volverAlNombre = useRef(false)

  useEffect(() => {
    if (!renombrando && volverAlNombre.current) {
      volverAlNombre.current = false
      boton.current?.focus()
    }
  }, [renombrando])

  function empezar() {
    if (!soloLectura) {
      alCambiarRenombrando(true)
    }
  }

  function alTerminar({ nombre: escrito, porTeclado }: FinDelNombre) {
    volverAlNombre.current = porTeclado
    alCambiarRenombrando(false)
    if (escrito !== null && escrito.trim() !== inicial.trim()) {
      props.alRenombrar(escrito)
    }
  }

  function alTeclear(evento: KeyboardEvent<HTMLButtonElement>) {
    if (evento.key === 'F2') {
      evento.preventDefault()
      empezar()
    }
  }

  if (renombrando) {
    return (
      <>
        {props.icono}
        <CampoDeNombre
          inicial={inicial}
          etiqueta={`Nombre de «${nombre}»`}
          alTerminar={alTerminar}
        />
      </>
    )
  }
  return (
    <button
      ref={boton}
      type="button"
      title={soloLectura ? nombre : `${nombre} · doble clic o F2 para renombrar`}
      onClick={(evento) => {
        props.alElegir(modoDelClic(evento))
      }}
      onDoubleClick={empezar}
      onKeyDown={alTeclear}
      className={cn(
        'flex h-8 min-w-0 flex-1 items-center gap-1.5 rounded-(--radius-sm) px-1 text-left outline-none focus-visible:shadow-(--shadow-focus)',
        props.apagada && 'text-(--color-ink-faint)',
      )}
    >
      {props.icono}
      <span className="min-w-0 flex-1 truncate">{nombre}</span>
    </button>
  )
}
