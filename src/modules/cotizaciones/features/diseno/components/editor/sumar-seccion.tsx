'use client'

import { PlusIcon } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import type { SeccionDeDiseno } from '../../../../entities/diseno'
import { A_TAMANO_REAL } from './marco-escalado'

type Props = {
  ocupado: boolean
  alSumar: (presentacion: SeccionDeDiseno['presentacion']) => void
}

// «+ Sección principal» y «+ Sección avanzada» al pie del lienzo: la sección nace vacía, con su título, y queda elegida (no se guarda vacía).
export function SumarSeccion({ ocupado, alSumar }: Props) {
  return (
    <div data-sumar-seccion="" className={`${A_TAMANO_REAL} flex flex-wrap gap-2`}>
      <Button
        variant="outline"
        disabled={ocupado}
        onClick={() => {
          alSumar('principal')
        }}
      >
        <PlusIcon aria-hidden />
        Sección principal
      </Button>
      <Button
        variant="outline"
        disabled={ocupado}
        onClick={() => {
          alSumar('avanzado')
        }}
      >
        <PlusIcon aria-hidden />
        Sección avanzada
      </Button>
    </div>
  )
}
