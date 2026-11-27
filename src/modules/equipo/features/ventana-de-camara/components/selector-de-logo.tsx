'use client'

import { cn } from 'cn'
import Image from 'next/image'
import { useId } from 'react'
import type { VarianteParaLaVentana } from '../../../entities/ventana-de-camara'

const DAMERO =
  'bg-[repeating-conic-gradient(var(--color-surface-2)_0%_25%,var(--color-surface)_0%_50%)] bg-[length:12px_12px]'

type Props = {
  logos: readonly VarianteParaLaVentana[]
  // El id elegido; `null` = el principal.
  elegido: string | null
  alElegir: (id: string | null) => void
  // El dato «Logo de la empresa» está apagado: se ven las variantes pero no se eligen (el lugar no cambia).
  deshabilitado: boolean
}

// «Logo de la empresa»: las variantes con archivo en miniatura sobre el damero, con su nombre; una sola se elige (por defecto, el principal). Con el teclado,
// las flechas cambian de una a otra (grupo de radios). La de fondo oscuro se ve sobre fondo oscuro.
export function SelectorDeLogo({ logos, elegido, alElegir, deshabilitado }: Props) {
  const grupo = useId()
  const actual = elegido ?? 'principal'
  return (
    <fieldset disabled={deshabilitado} className="grid gap-1.5 pl-6 disabled:opacity-50">
      <legend className="sr-only">Logo de la empresa que se muestra</legend>
      <div className="grid grid-cols-3 gap-2">
        {logos.map((logo) => (
          <label
            key={logo.id}
            className="grid min-w-0 cursor-pointer justify-items-center gap-1 rounded-(--radius-md) p-1 text-center has-checked:bg-(--color-surface-2) has-checked:ring-2 has-checked:ring-(--color-ink) has-focus-visible:shadow-(--shadow-focus)"
          >
            <input
              type="radio"
              name={grupo}
              value={logo.id}
              checked={actual === logo.id}
              onChange={() => {
                alElegir(logo.id === 'principal' ? null : logo.id)
              }}
              className="sr-only"
            />
            <span
              className={cn(
                logo.id === 'oscuro' && 'dark',
                DAMERO,
                'flex size-14 items-center justify-center overflow-hidden rounded-(--radius-md) border border-(--color-line)',
              )}
            >
              <Image
                src={logo.url}
                alt=""
                width={56}
                height={56}
                unoptimized
                loading="lazy"
                className="size-full object-contain p-0.5"
              />
            </span>
            <span className="w-full truncate text-(length:--text-xs) text-(--color-ink-soft)">
              {logo.nombre}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
