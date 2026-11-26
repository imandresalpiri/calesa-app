'use client'

import type { ReactNode } from 'react'
import { Button } from '@/shared/ui/button'
import { Textarea } from '@/shared/ui/textarea'
import { useEnLinea } from '@/shared/ui/use-en-linea'
import { MOTIVO_SIN_CONEXION } from '../../../entities/cotizador/acciones-de-la-tarjeta'
import type { CotizacionLeida } from '../../../entities/cotizador/hoja-de-lectura'
import { LARGO_DE_LAS_NOTAS } from '../../../entities/cotizador/hoja-editable'
import { CondicionesDeLaHoja } from './condiciones-de-la-hoja'

type Props = {
  cotizacion: CotizacionLeida
  notas: string
  errorDeNotas: string | undefined
  enCurso: boolean
  sinGuardar: boolean
  alCambiarNotas: (notas: string) => void
  // Lo que dijo la base al guardar (`<AvisoDeLaHoja>`): va al final, en un lugar con alto reservado.
  aviso: ReactNode
}

// El pie de la hoja editable (8.12-4, C12): «Condiciones» con las notas (D55) y «Guardar», apagado sin cambios o sin red. El total en vivo sólo informa (D45): vive
// en la cabecera. Nada de acá se mueve al editar: las notas tienen alto fijo, la fila de «Guardar» reserva su línea de estado y el aviso de la base (un `PT409`
// con «Recargar» o el mensaje de una regla) cae bajo ella, al final de la página, en un lugar que ya existe.
export function PieDeLaHoja({
  cotizacion,
  notas,
  errorDeNotas,
  enCurso,
  sinGuardar,
  alCambiarNotas,
  aviso,
}: Props) {
  const enLinea = useEnLinea()
  return (
    <CondicionesDeLaHoja cotizacion={cotizacion}>
      <div className="grid gap-1.5">
        <label htmlFor="cotizacion-notas" className="text-(length:--text-sm) font-medium">
          Notas
        </label>
        <Textarea
          id="cotizacion-notas"
          value={notas}
          maxLength={LARGO_DE_LAS_NOTAS}
          disabled={enCurso}
          aria-invalid={errorDeNotas ? true : undefined}
          aria-describedby={errorDeNotas ? 'cotizacion-notas-error' : undefined}
          className="field-sizing-fixed h-24 resize-none"
          onChange={(evento) => {
            alCambiarNotas(evento.target.value)
          }}
        />
        <p
          id="cotizacion-notas-error"
          className="min-h-5 text-(length:--text-sm) text-(--color-peligro-ink)"
        >
          {errorDeNotas}
        </p>
      </div>
      <div className="grid gap-3">
        <div className="flex min-h-11 flex-wrap items-center gap-3">
          <Button type="submit" disabled={enCurso || !sinGuardar || !enLinea}>
            {enCurso ? 'Guardando…' : 'Guardar'}
          </Button>
          <span className="text-(length:--text-sm) text-(--color-ink-soft)">
            {enLinea ? (sinGuardar ? 'Cambios sin guardar' : null) : MOTIVO_SIN_CONEXION}
          </span>
        </div>
        <div className="min-h-32">{aviso}</div>
      </div>
    </CondicionesDeLaHoja>
  )
}
