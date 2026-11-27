'use client'

import { Button } from '../button'
import { useConmutarElLive } from '../proveedor-del-live'

// Apaga el Live y vuelve a pedir la misma URL: el servidor la dibuja con su contenido.
export function SalirDelLive() {
  const { salir } = useConmutarElLive()
  return (
    <Button variant="outline" onClick={salir}>
      Salir del Modo Live
    </Button>
  )
}
