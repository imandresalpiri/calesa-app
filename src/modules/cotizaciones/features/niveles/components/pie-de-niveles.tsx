'use client'

import { PlusIcon } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { textoDelTopeDeNiveles } from '../../../entities/nivel'

type Props = { alTope: boolean; tope: number; alNuevo: () => void }

const ID_DEL_TOPE = 'niveles-tope'

// «+ Nuevo nivel» al pie de los niveles. En el tope se apaga y dice por qué, a la vista y unido al botón (no sólo en un `title`).
export function PieDeNiveles({ alTope, tope, alNuevo }: Props) {
  return (
    <div className="grid justify-items-start gap-1 px-3 py-2">
      <Button
        variant="ghost"
        className="h-11 md:h-8"
        disabled={alTope}
        aria-describedby={alTope ? ID_DEL_TOPE : undefined}
        onClick={alNuevo}
      >
        <PlusIcon aria-hidden />
        Nuevo nivel
      </Button>
      {alTope ? (
        <p id={ID_DEL_TOPE} className="text-(length:--text-xs) text-(--color-ink-soft)">
          {textoDelTopeDeNiveles(tope)}
        </p>
      ) : null}
    </div>
  )
}
