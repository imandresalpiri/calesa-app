'use client'

import { EyeIcon, EyeOffIcon } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { useLive } from '@/shared/ui/live'

// Modo Live: para mostrarle la pantalla a un cliente. Oculta los símbolos y los códigos de moneda
// en toda la app; los números se ven.
export function ConmutadorLive() {
  const { live, alternar } = useLive()

  return (
    <Button
      variant={live ? 'secondary' : 'ghost'}
      size="icon-lg"
      className="size-[44px] md:size-9"
      aria-pressed={live}
      aria-label="Modo Live: ocultar los símbolos de moneda"
      title={
        live
          ? 'Modo Live encendido: se ven los números sin moneda'
          : 'Modo Live: ocultar los símbolos de moneda'
      }
      onClick={alternar}
    >
      {live ? <EyeOffIcon aria-hidden /> : <EyeIcon aria-hidden />}
    </Button>
  )
}
