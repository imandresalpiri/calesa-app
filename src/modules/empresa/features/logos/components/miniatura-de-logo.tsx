'use client'

import { cn } from 'cn'
import Image from 'next/image'
import { urlPublica } from '@/shared/lib/almacen'
import { ID_DE_LA_OSCURA, type VarianteDelLogo } from '../../../entities/logos'

const DAMERO =
  'bg-[repeating-conic-gradient(var(--color-surface-2)_0%_25%,var(--color-surface)_0%_50%)] bg-[length:12px_12px]'

type Props = {
  // La variante, o un archivo local aún sin subir (`url` suelta).
  variante?: Pick<VarianteDelLogo, 'id' | 'nombre' | 'ruta'>
  url?: string | null
  alt?: string
  // Lado en px: 48 en la lista, 64 en el formulario.
  lado?: 40 | 48 | 64
  className?: string
}

// Un logo sobre el damero (se ve la transparencia). El «Para fondo oscuro» se ve sobre el fondo oscuro: `dark` resuelve ahí los tokens de ese tema. Sin
// archivo, dice «Sin logo»: el espacio no cambia.
export function MiniaturaDeLogo({ variante, url, alt, lado = 48, className }: Props) {
  const direccion = url ?? (variante?.ruta ? urlPublica('marca', variante.ruta) : null)
  const medida = lado === 64 ? 'size-16' : lado === 40 ? 'size-10' : 'size-12'
  return (
    <span
      className={cn(
        variante?.id === ID_DE_LA_OSCURA && 'dark',
        medida,
        DAMERO,
        'flex shrink-0 items-center justify-center overflow-hidden rounded-(--radius-md) border border-(--color-line) text-center text-[0.625rem] leading-tight text-(--color-ink-faint)',
        className,
      )}
    >
      {direccion ? (
        <Image
          src={direccion}
          alt={alt ?? (variante ? `Logo «${variante.nombre}»` : 'Logo')}
          width={lado}
          height={lado}
          unoptimized
          loading="lazy"
          className="size-full object-contain p-0.5"
        />
      ) : (
        'Sin logo'
      )}
    </span>
  )
}
