'use client'

import { useEffect, useRef } from 'react'
import { Input } from '@/shared/ui/input'
import type { ColumnaDeTabla } from '../../../../entities/tabla-de-ayuda'

type Props = {
  columna: ColumnaDeTabla
  filaId: string
  lugar: string
  texto: string
  // El motivo de la celda: lo tipeado que no se leyó o lo que la base rechazó al guardar.
  motivo: string | null
  // El primer campo de la fila recién abierta recibe el foco.
  enfocar: boolean
  alEscribir: (texto: string) => void
  // Enter: «Listo».
  alTerminar: () => void
}

const MODO_DE_TECLADO: Record<string, 'decimal' | 'numeric' | undefined> = {
  numero: 'decimal',
  anio: 'numeric',
}

// Un campo de la fila abierta de la tabla de la ayuda: lo tipeado se aplica con «Listo» (o Enter) o al guardar; debajo, su motivo.
export function CampoDeLaFila(props: Props) {
  const { columna, filaId, lugar, texto, motivo, enfocar } = props
  const campo = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (enfocar) campo.current?.focus()
  }, [enfocar])
  const id = `ayuda-${filaId}-${columna.clave}`
  const etiqueta = columna.etiqueta.trim() || columna.clave
  const modo = MODO_DE_TECLADO[columna.tipo]
  return (
    <div className="grid min-w-24 gap-1 text-left no-underline">
      <Input
        ref={campo}
        id={id}
        name={id}
        aria-label={`${etiqueta}, fila ${lugar}`}
        inputMode={modo}
        autoComplete="off"
        className={`min-h-11 md:min-h-8 ${modo ? 'text-right tabular-nums' : ''}`}
        value={texto}
        aria-invalid={motivo ? true : undefined}
        aria-describedby={motivo ? `${id}-motivo` : undefined}
        onChange={(evento) => {
          props.alEscribir(evento.target.value)
        }}
        onKeyDown={(evento) => {
          if (evento.key === 'Enter') {
            evento.preventDefault()
            props.alTerminar()
          }
        }}
      />
      {motivo ? (
        <p
          id={`${id}-motivo`}
          className="text-(length:--text-xs) whitespace-normal text-(--color-peligro-ink)"
        >
          {motivo}
        </p>
      ) : null}
    </div>
  )
}
