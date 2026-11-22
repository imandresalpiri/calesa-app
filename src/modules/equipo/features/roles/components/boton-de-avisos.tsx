'use client'

import { CircleAlertIcon } from 'lucide-react'
import { cn } from 'cn'
import { Button } from '@/shared/ui/button'
import { nombreDelBotonDeAvisos } from '../../../entities/avisos-de-roles'

type Props = {
  // «Avisos de Asesor»: el título del modal que abre.
  titulo: string
  cantidad: number
  alAbrir: () => void
  className?: string
}

// El «!» que abre los avisos de un rol o de la página: la matriz no dice nada en línea. 44 px de toque en el celular.
export function BotonDeAvisos({ titulo, cantidad, alAbrir, className }: Props) {
  const nombre = nombreDelBotonDeAvisos(titulo, cantidad)
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={nombre}
      aria-haspopup="dialog"
      title={nombre}
      className={cn('text-(--color-ink-soft) max-md:size-11', className)}
      onClick={alAbrir}
    >
      <CircleAlertIcon aria-hidden />
    </Button>
  )
}
