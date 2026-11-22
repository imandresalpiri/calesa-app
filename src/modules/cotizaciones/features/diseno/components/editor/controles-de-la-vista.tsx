'use client'

import { Button } from '@/shared/ui/button'
import {
  ANCHOS_DE_LA_VISTA_PREVIA,
  NOMBRES_DE_LAS_VISTAS,
  type AnchoDeLaVistaPrevia,
} from '../../../../entities/diseno/anchos-de-la-vista-previa'

type Props = { vista: AnchoDeLaVistaPrevia; alElegir: (vista: AnchoDeLaVistaPrevia) => void }

// Celular · Laptop · Grande · Texto al 200 %: a qué ancho se dibuja (y se edita) la hoja.
export function ControlesDeLaVista({ vista, alElegir }: Props) {
  return (
    <div
      role="group"
      aria-label="Vista de la hoja"
      data-controles-de-la-vista=""
      className="flex flex-wrap gap-2"
    >
      {ANCHOS_DE_LA_VISTA_PREVIA.map((opcion) => (
        <Button
          key={opcion}
          variant={opcion === vista ? 'secondary' : 'outline'}
          className="min-h-11 md:min-h-8"
          aria-pressed={opcion === vista}
          onClick={() => {
            alElegir(opcion)
          }}
        >
          {NOMBRES_DE_LAS_VISTAS[opcion]}
        </Button>
      ))}
    </div>
  )
}
