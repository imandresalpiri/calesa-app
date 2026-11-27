'use client'

import { EyeIcon, EyeOffIcon } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { useConmutarElLive } from '@/shared/ui/proveedor-del-live'

// El Modo Live al alcance de la vista previa: quien le muestra la tarjeta a su cliente oculta los símbolos de moneda sin cerrar el modal (la barra de arriba queda detrás). Es el mismo botón
// que el de la barra (`ConmutadorLive`, del marco): conmuta la cookie y vuelve a pedir la pantalla (`useConmutarElLive()`), y no se dibuja si el rol de quien mira no
// puede encenderlo. Va aquí y no en `shared` porque mover el de la barra dispara el Nivel 2.
export function LiveDeLaVistaPrevia() {
  const { live, puedeEncender, alternar } = useConmutarElLive()
  if (!puedeEncender && !live) {
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
