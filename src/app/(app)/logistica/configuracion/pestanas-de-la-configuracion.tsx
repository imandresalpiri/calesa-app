'use client'

import type { Route } from 'next'
import { useRouter, useSelectedLayoutSegment } from 'next/navigation'
import { PestanasConDesborde } from '@/shared/ui/pestanas-con-desborde'
import { salirSinPerder } from '@/shared/ui/salida-con-cambios'

type Props = {
  // Las pestañas con su ruta; con `motivo`, apagada.
  pestanas: readonly { clave: string; titulo: string; ruta: string; motivo?: string }[]
}

// La tira de Logística › Configuración. Cada pestaña es una sub-ruta y la abierta sale del segmento de la URL; elegir otra navega y suelta los parámetros de la
// anterior (`?panel=`, `?puerto=`…). Con algo escrito sin guardar, antes pregunta (`salirSinPerder()`).
export function PestanasDeLaConfiguracion({ pestanas }: Props) {
  const router = useRouter()
  const segmento = useSelectedLayoutSegment()
  return (
    <PestanasConDesborde
      pestanas={pestanas}
      valor={segmento ?? ''}
      alElegir={(elegida) => {
        const pestana = pestanas.find((una) => una.clave === elegida)
        if (pestana === undefined || elegida === segmento) {
          return
        }
        salirSinPerder(() => {
          router.push(pestana.ruta as Route)
        })
      }}
    />
  )
}
