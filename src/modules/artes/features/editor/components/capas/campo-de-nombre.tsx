'use client'

import { useRef, useState, type KeyboardEvent } from 'react'
import { LARGO_MAXIMO_DEL_NOMBRE_DE_CAPA } from '../../../../entities/documento'

// Cómo terminó: con el nombre escrito (Enter o al salir del campo) o sin cambios (Esc). `porTeclado`: el foco vuelve a la fila.
export type FinDelNombre = { nombre: string | null; porTeclado: boolean }

type Props = {
  inicial: string
  etiqueta: string
  alTerminar: (fin: FinDelNombre) => void
}

// El campo con que se renombra una fila de «Capas», en su lugar: entra con el nombre elegido, Enter guarda, Esc deja el de antes y salir del
// campo guarda. Enter y Esc no siguen hasta los atajos del editor (Esc deseleccionaría).
export function CampoDeNombre({ inicial, etiqueta, alTerminar }: Props) {
  const [valor, setValor] = useState(inicial)
  // Una sola vez: al irse el campo tras Enter o Esc, el navegador también avisa que perdió el foco.
  const terminado = useRef(false)

  function terminar(fin: FinDelNombre) {
    if (terminado.current) {
      return
    }
    terminado.current = true
    alTerminar(fin)
  }

  function alTeclear(evento: KeyboardEvent<HTMLInputElement>) {
    if (evento.key !== 'Enter' && evento.key !== 'Escape') {
      return
    }
    evento.preventDefault()
    evento.stopPropagation()
    terminar({ nombre: evento.key === 'Enter' ? valor : null, porTeclado: true })
  }

  return (
    <input
      type="text"
      aria-label={etiqueta}
      autoComplete="off"
      spellCheck={false}
      maxLength={LARGO_MAXIMO_DEL_NOMBRE_DE_CAPA}
      value={valor}
      autoFocus
      onFocus={(evento) => {
        evento.currentTarget.select()
      }}
      onChange={(evento) => {
        setValor(evento.target.value)
      }}
      onKeyDown={alTeclear}
      onBlur={() => {
        terminar({ nombre: valor, porTeclado: false })
      }}
      className="h-7 min-w-0 flex-1 rounded-(--radius-sm) border border-(--color-line-strong) bg-(--color-surface) px-1.5 text-(length:--text-sm) text-(--color-ink) outline-none focus-visible:shadow-(--shadow-focus)"
    />
  )
}
