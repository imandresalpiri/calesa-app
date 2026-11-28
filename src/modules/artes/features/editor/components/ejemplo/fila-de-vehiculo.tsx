'use client'

import { CheckIcon } from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'
import type { FilaDeVehiculoDeEjemplo } from '../../../../entities/datos/respuestas'

type Props = {
  fila: FilaDeVehiculoDeEjemplo
  elegida: boolean
  alElegir: (id: string) => void
}

function detalleDe({ anio, lote }: FilaDeVehiculoDeEjemplo): string {
  return [anio === null ? null : String(anio), lote === null ? null : `Lote ${lote}`]
    .filter((parte) => parte !== null)
    .join(' · ')
}

// Un vehículo para elegir de ejemplo: la miniatura de 480 px (un `<img>` de la lista, nunca el lienzo: `unoptimized`, ya viene a su tamaño),
// el título y el año con el lote. Sin fotos (o si la miniatura no carga), la caja punteada «Sin fotos», del mismo tamaño.
export function FilaDeVehiculo({ fila, elegida, alElegir }: Props) {
  const [fallo, setFallo] = useState<string | null>(null)
  const miniatura = fila.miniatura !== null && fallo !== fila.miniatura ? fila.miniatura : null
  const detalle = detalleDe(fila)
  return (
    <li className="min-w-0">
      <button
        type="button"
        aria-pressed={elegida}
        data-vehiculo-de-ejemplo={fila.id}
        onClick={() => {
          alElegir(fila.id)
        }}
        className="flex h-14 w-full min-w-0 items-center gap-2 rounded-(--radius-md) px-1.5 text-left transition hover:bg-(--color-paper-dim) focus-visible:shadow-(--shadow-focus) focus-visible:outline-none aria-pressed:bg-(--color-paper-dim)"
      >
        <span className="relative block h-11 w-16 shrink-0 overflow-hidden rounded-(--radius-sm) bg-(--color-paper-dim)">
          {miniatura === null ? (
            <span className="flex size-full items-center justify-center rounded-(--radius-sm) border border-dashed border-(--color-line-strong) text-(length:--text-xs) text-(--color-ink-soft)">
              Sin fotos
            </span>
          ) : (
            <Image
              src={miniatura}
              alt=""
              fill
              unoptimized
              loading="lazy"
              sizes="4rem"
              className="object-cover"
              onError={() => {
                setFallo(miniatura)
              }}
            />
          )}
        </span>
        <span className="grid min-w-0 flex-1">
          <span className="truncate text-(length:--text-sm) text-(--color-ink)">{fila.titulo}</span>
          <span className="truncate text-(length:--text-xs) text-(--color-ink-soft) tabular-nums">
            {detalle}
          </span>
        </span>
        {elegida ? <CheckIcon aria-hidden className="size-4 shrink-0" /> : null}
      </button>
    </li>
  )
}
