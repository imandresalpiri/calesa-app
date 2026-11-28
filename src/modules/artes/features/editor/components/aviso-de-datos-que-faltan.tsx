'use client'

import { useState } from 'react'
import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import type { Falta } from '../../../entities/datos/capas-con-datos'
import { claveDeLoQueFalta, textoDeLoQueFalta } from '../../../entities/datos/lo-que-falta'
import { ENCIMA_DEL_LIENZO } from './rejilla'

type Props = {
  // Lo que la plantilla nombra y el vehículo elegido no llena (con los datos de ejemplo, nada).
  faltan: readonly Falta[]
  // El vehículo y la cotización elegidos: otra elección vuelve a abrir el aviso.
  eleccion: string
}

// «A esta plantilla le faltan datos con este vehículo: …», encima del lienzo y sin cambiarle el tamaño. «Cerrar» lo deja cerrado hasta que
// cambie la elección o lo que falta.
export function AvisoDeDatosQueFaltan({ faltan, eleccion }: Props) {
  const [cerrado, setCerrado] = useState<string | null>(null)
  const texto = textoDeLoQueFalta(faltan)
  const clave = `${eleccion}:${claveDeLoQueFalta(faltan)}`
  if (texto === null || cerrado === clave) {
    return null
  }
  return (
    <div className={ENCIMA_DEL_LIENZO} data-aviso-de-datos-que-faltan>
      <Aviso tono="aviso">
        <div className="flex items-start gap-3">
          <p className="min-w-0 flex-1">{texto}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setCerrado(clave)
            }}
          >
            Cerrar
          </Button>
        </div>
      </Aviso>
    </div>
  )
}
