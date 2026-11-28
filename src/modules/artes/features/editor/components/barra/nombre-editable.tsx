'use client'

import { useState } from 'react'
import { LARGO_MAXIMO_DEL_NOMBRE, esquemaDelNombreDeArte } from '../../../../entities/nombres'

type Props = { nombre: string; alCambiar: (nombre: string) => void; soloLectura: boolean }

const CAJA = 'h-8 max-w-80 min-w-0 rounded-(--radius-md) px-2 text-(length:--text-sm) font-medium'

// El nombre de la plantilla, el título de la pantalla. Un clic lo vuelve campo: Enter o salir lo cambian si vale (`esquemaDelNombreDeArte`),
// Esc lo deja como estaba. El cambio se guarda con «Guardar», como el resto. En sólo lectura es texto.
export function NombreEditable({ nombre, alCambiar, soloLectura }: Props) {
  const [escrito, setEscrito] = useState<string | null>(null)
  const leido = escrito === null ? null : esquemaDelNombreDeArte.safeParse(escrito)
  const motivo = leido && !leido.success ? (leido.error.issues[0]?.message ?? null) : null

  const terminar = (aplicar: boolean) => {
    if (aplicar && leido?.success && leido.data !== nombre) {
      alCambiar(leido.data)
    }
    setEscrito(null)
  }

  if (escrito !== null) {
    return (
      <h1 className="w-80 min-w-0">
        <input
          aria-label="Nombre de la plantilla de arte"
          aria-invalid={motivo !== null}
          title={motivo ?? undefined}
          autoFocus
          maxLength={LARGO_MAXIMO_DEL_NOMBRE + 10}
          value={escrito}
          onFocus={(evento) => {
            evento.currentTarget.select()
          }}
          onChange={(evento) => {
            setEscrito(evento.target.value)
          }}
          onBlur={() => {
            terminar(true)
          }}
          onKeyDown={(evento) => {
            if (evento.key === 'Enter' && motivo === null) {
              terminar(true)
            } else if (evento.key === 'Escape') {
              evento.stopPropagation()
              terminar(false)
            }
          }}
          className={`${CAJA} w-full border border-(--color-line-strong) bg-(--color-surface) text-(--color-ink) outline-none focus-visible:shadow-(--shadow-focus) aria-invalid:border-(--color-peligro)`}
        />
      </h1>
    )
  }
  return (
    <h1 className={soloLectura ? 'max-w-48 min-w-0 xl:max-w-80' : 'min-w-0'}>
      {soloLectura ? (
        <span className={`${CAJA} block truncate leading-8 text-(--color-ink)`}>{nombre}</span>
      ) : (
        <button
          type="button"
          title="Cambiar el nombre"
          onClick={() => {
            setEscrito(nombre)
          }}
          className={`${CAJA} block w-full truncate text-left text-(--color-ink) outline-none hover:bg-(--color-paper-dim) focus-visible:shadow-(--shadow-focus)`}
        >
          {nombre}
        </button>
      )}
    </h1>
  )
}
