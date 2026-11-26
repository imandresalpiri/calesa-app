'use client'

import { cn } from 'cn'
import { formatearHora } from '@/shared/lib/fechas'
import { Button } from '@/shared/ui/button'
import type { FilaDeActividad as Fila } from '../../../entities/actividad'
import { fraseDeActividad } from '../../../entities/frase'
import { FraseDeActividad } from '../../frase/components/frase-de-actividad'
import { IconoDeEntidad } from '../../frase/components/icono-de-entidad'

type Props = { fila: Fila; zona: string; abierta: boolean; abrir: (id: number) => void }

export const idDeLaFila = (id: number) => `cambio-${String(id)}`

// Un cambio: su icono, la frase y la hora. Una fila visible abre todo su detalle en un drawer («Ver detalle», `?cambio=<id>`) y queda marcada
// mientras está abierto; una que quien mira no ve no promete nada que abrir.
export function FilaDeActividad({ fila, zona, abierta, abrir }: Props) {
  const frase = fraseDeActividad(fila)
  return (
    <li
      id={idDeLaFila(fila.id)}
      className={cn(
        'grid min-w-0 scroll-mt-24 gap-2 px-3 py-2.5',
        abierta && 'bg-(--color-surface-2)',
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <IconoDeEntidad icono={frase.icono} />
        <div className="grid min-w-0 flex-1 gap-0.5">
          <FraseDeActividad frase={frase} zona={zona} />
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-3">
            <time
              dateTime={fila.creadoEn}
              className="text-(length:--text-xs) text-(--color-ink-soft) tabular-nums"
            >
              {formatearHora(fila.creadoEn, { zona })}
            </time>
            {fila.visible ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-haspopup="dialog"
                className="-mr-2 min-h-11 shrink-0 md:min-h-8"
                onClick={() => {
                  abrir(fila.id)
                }}
              >
                Ver detalle
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </li>
  )
}
