'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { instanteDeLocal } from '@/shared/lib/fechas'
import { Bloque } from '@/shared/ui/bloque'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { MOTIVO_DE_FECHA_PASADA, esFechaDeProgramar } from '../../../../entities/contenido/guias'

type Props = {
  zona: string
  deshabilitado: boolean
  alProgramar: (cuando: string) => void
  // Sube cada vez que «Programar…» del «⋯» pide llevar el foco a la fecha.
  senalDeFoco: number
}

const TACTIL = 'min-h-11 md:min-h-9'

// Programar: la fecha y la hora de la empresa (ISO al servidor). Vive en la pestaña «Publicación»; «Programar…» del «⋯» abre el panel y trae el foco aquí.
export function ProgramarLaGuia({ zona, deshabilitado, alProgramar, senalDeFoco }: Props) {
  const id = useId()
  const campo = useRef<HTMLInputElement>(null)
  const [local, setLocal] = useState('')
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (senalDeFoco > 0) {
      campo.current?.focus()
    }
  }, [senalDeFoco])

  function confirmar() {
    const cuando = instanteDeLocal(local, { zona })
    if (cuando === null || !esFechaDeProgramar(cuando, new Date())) {
      setError(MOTIVO_DE_FECHA_PASADA)
      return
    }
    alProgramar(cuando)
  }

  return (
    <Bloque titulo="Programar">
      <div className="grid gap-1.5">
        <Label htmlFor={id}>Publicar el</Label>
        <Input
          ref={campo}
          id={id}
          type="datetime-local"
          value={local}
          disabled={deshabilitado}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={TACTIL}
          onChange={(evento) => {
            setLocal(evento.target.value)
            setError(null)
          }}
        />
        {error ? (
          <p id={`${id}-error`} className="text-(length:--text-sm) text-(--color-peligro-ink)">
            {error}
          </p>
        ) : null}
      </div>
      <Button
        type="button"
        variant="outline"
        className={TACTIL}
        disabled={deshabilitado}
        onClick={confirmar}
      >
        Programar
      </Button>
    </Bloque>
  )
}
