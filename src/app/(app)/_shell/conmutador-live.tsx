'use client'

import { EyeIcon, EyeOffIcon } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { useConmutarElLive } from '@/shared/ui/proveedor-del-live'

// Modo Live: para mostrarle la pantalla a un cliente. Oculta los símbolos y los códigos de moneda en toda la app (los números se ven) y lo que
// los ajustes del Live de quien mira no muestran: conmutar navega y el servidor vuelve a dibujar. Quien no puede encenderlo no lo ve.
export function ConmutadorLive() {
  const { live, puedeEncender, alternar } = useConmutarElLive()
  if (!puedeEncender) {
    return null
  }

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
