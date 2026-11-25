'use client'

import { Button } from '@/shared/ui/button'

type Props = {
  cambios: boolean
  // Por qué no se puede guardar todavía (lo que no se lee o lo que la base no aceptaría); nulo si se puede.
  motivo: string | null
  enCurso: boolean
  // Un conflicto sin resolver: «Guardar» espera a «Recargar».
  trabada: boolean
  alDescartar: () => void
  alGuardar: () => void
}

// El pie de la tabla que se edita desde la ayuda: en qué está lo editado, «Descartar» y «Guardar» (publica la tabla entera, con la fila abierta ya aplicada).
export function BarraDeLaEdicion({
  cambios,
  motivo,
  enCurso,
  trabada,
  alDescartar,
  alGuardar,
}: Props) {
  const texto = !cambios ? 'Sin cambios.' : (motivo ?? 'Cambios sin guardar.')
  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-(--color-line) pt-3">
      <p
        aria-live="polite"
        className={
          cambios && motivo
            ? 'min-w-0 flex-1 basis-48 text-(length:--text-sm) text-(--color-peligro-ink)'
            : 'min-w-0 flex-1 basis-48 text-(length:--text-sm) text-(--color-ink-soft)'
        }
      >
        {texto}
      </p>
      {cambios ? (
        <Button
          type="button"
          variant="ghost"
          className="min-h-11 md:min-h-9"
          disabled={enCurso}
          onClick={alDescartar}
        >
          Descartar
        </Button>
      ) : null}
      <Button
        type="button"
        className="min-h-11 md:min-h-9"
        disabled={!cambios || motivo !== null || enCurso || trabada}
        onClick={alGuardar}
      >
        {enCurso ? 'Guardando…' : 'Guardar'}
      </Button>
    </div>
  )
}
