'use client'

import type { Route } from 'next'
import { useRouter, useSelectedLayoutSegment } from 'next/navigation'
import { PestanasConDesborde } from '@/shared/ui/pestanas-con-desborde'
import { salirSinPerder } from '@/shared/ui/salida-con-cambios'
import { PESTANAS_DE_LA_CONFIGURACION } from './pestanas'

// La tira de Repuestos › Configuración. Cada pestaña es una sub-ruta y la abierta sale del segmento de la URL; elegir otra navega y suelta los parámetros de la anterior (`?panel=`,
// `?fase=`…). Con algo escrito sin guardar, antes pregunta (`salirSinPerder()`).
export function PestanasDeLaConfiguracion() {
  const router = useRouter()
  const segmento = useSelectedLayoutSegment()
  return (
    <PestanasConDesborde
      pestanas={PESTANAS_DE_LA_CONFIGURACION}
      valor={segmento ?? ''}
      alElegir={(elegida) => {
        const pestana = PESTANAS_DE_LA_CONFIGURACION.find((una) => una.clave === elegida)
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
