'use client'

import { Panel } from '@xyflow/react'
import { LayoutGridIcon, PlusIcon } from 'lucide-react'
import { useId } from 'react'
import { Button } from '@/shared/ui/button'
import { ControlesDelZoom } from './controles-del-zoom'

type Accion = { alPulsar: () => void; motivo: string | null }

type Props = {
  nuevaFase: Accion
  ordenarSolo: Accion
  // La línea de estado (sin conexión, celular, la lista cortada), o nada: su alto está reservado.
  estado: string | null
  sinAnimar: () => boolean
}

// Lo que se ve primero, flotando arriba a la izquierda del lienzo: «Nueva fase» (nace en el centro de la vista), «Ordenar solo» (todas al acomodo automático,
// con «Deshacer»), los controles del zoom propios y en español («Acercar», «Alejar», «Ver todo el flujo») y, debajo, una línea de estado de alto reservado.
// Un botón apagado dice su motivo en su descripción.
export function BarraDelLienzo({ nuevaFase, ordenarSolo, estado, sinAnimar }: Props) {
  const idNueva = useId()
  const idOrdenar = useId()
  return (
    <Panel position="top-left" className="m-2! grid max-w-[calc(100%-1rem)] gap-1">
      <div
        role="toolbar"
        aria-label="Herramientas del diagrama"
        className="flex flex-wrap items-center gap-1 rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) p-1 shadow-(--shadow-sm)"
      >
        <Button
          size="sm"
          className="h-11 md:h-8"
          disabled={nuevaFase.motivo !== null}
          aria-describedby={nuevaFase.motivo === null ? undefined : idNueva}
          title={nuevaFase.motivo ?? undefined}
          onClick={nuevaFase.alPulsar}
        >
          <PlusIcon aria-hidden />
          Nueva fase
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-11 md:h-8"
          disabled={ordenarSolo.motivo !== null}
          aria-describedby={ordenarSolo.motivo === null ? undefined : idOrdenar}
          title={ordenarSolo.motivo ?? undefined}
          onClick={ordenarSolo.alPulsar}
        >
          <LayoutGridIcon aria-hidden />
          Ordenar solo
        </Button>
        <span aria-hidden className="mx-0.5 h-6 w-px bg-(--color-line)" />
        <ControlesDelZoom sinAnimar={sinAnimar} />
      </div>
      <p
        role="status"
        className="min-h-[1lh] truncate px-1 text-(length:--text-xs) text-(--color-ink-soft)"
      >
        {estado ?? ''}
      </p>
      {nuevaFase.motivo === null ? null : (
        <span id={idNueva} className="sr-only">
          {nuevaFase.motivo}
        </span>
      )}
      {ordenarSolo.motivo === null ? null : (
        <span id={idOrdenar} className="sr-only">
          {ordenarSolo.motivo}
        </span>
      )}
    </Panel>
  )
}
