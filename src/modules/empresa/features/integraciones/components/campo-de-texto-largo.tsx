'use client'

import type { ComponentProps } from 'react'
import { cn } from 'cn'
import { formatearNumero } from '@/shared/lib/formato'
import { Label } from '@/shared/ui/label'
import { useRegional } from '@/shared/ui/regional'
import { Textarea } from '@/shared/ui/textarea'

type Props = Omit<ComponentProps<'textarea'>, 'id' | 'value'> & {
  // Sirve de `id` y de `name`.
  nombre: string
  etiqueta: string
  value: string
  largoMaximo: number
  error?: string | undefined
}

// Un texto de varias líneas con su etiqueta, su error y «n de máximo» debajo (en rojo al pasarse), enlazados para el lector de pantalla.
export function CampoDeTextoLargo({
  nombre,
  etiqueta,
  value,
  largoMaximo,
  error,
  ...resto
}: Props) {
  const { locale } = useRegional()
  const idError = `${nombre}-error`
  const idContador = `${nombre}-contador`
  const largo = value.trim().length
  const numero = (n: number) => formatearNumero(n, { locale, decimales: 0 })
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={nombre}>{etiqueta}</Label>
      <Textarea
        id={nombre}
        name={nombre}
        value={value}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${idError} ${idContador}` : idContador}
        className="max-h-60 min-h-20"
        {...resto}
      />
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
        <p
          id={idError}
          className="min-w-0 flex-1 basis-40 text-(length:--text-sm) text-(--color-peligro-ink)"
        >
          {error}
        </p>
        <p
          id={idContador}
          className={cn(
            'text-(length:--text-xs) tabular-nums',
            largo > largoMaximo ? 'text-(--color-peligro-ink)' : 'text-(--color-ink-faint)',
          )}
        >
          {numero(largo)} de {numero(largoMaximo)}
        </p>
      </div>
    </div>
  )
}
