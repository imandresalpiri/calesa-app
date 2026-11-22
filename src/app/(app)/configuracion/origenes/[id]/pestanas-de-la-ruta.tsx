'use client'

import type { Route } from 'next'
import { useRouter, useSelectedLayoutSegment } from 'next/navigation'
import { parseAsString, useQueryState } from 'nuqs'
import { useEffect } from 'react'
import { recordarLaPestana } from '@/modules/equipo/client'
import {
  CLAVE_DE_LA_FORMULA,
  esParteDeLaFormula,
  rutaDeLaFormula,
  type ParteDelOrigen,
} from '@/shared/lib/rutas'
import { PestanasConDesborde } from '@/shared/ui/pestanas-con-desborde'
import { salirSinPerder } from '@/shared/ui/salida-con-cambios'
import { ConTooltip } from '@/shared/ui/tooltip'

type Props = {
  origenId: string
  // Las pestañas, con su ruta ya resuelta; con `motivo`, apagada; con `aviso`, lo que le falta (⚠).
  pestanas: readonly {
    clave: ParteDelOrigen
    titulo: string
    ruta: string
    motivo?: string
    aviso?: string
  }[]
}

// Las pestañas de la página de un origen. Cada una es una sub-ruta y la abierta sale del segmento de la URL; elegir navega y suelta los parámetros de la otra
// (`?panel=`, `?tabla=`, `?fase=`), salvo la fórmula elegida entre Planilla, Hoja y Tarjeta (`?formula=`); con una barra de cambios sin guardar, antes
// pregunta (`salirSinPerder()`). La abierta se recuerda por persona y origen (la próxima entrada a `/configuracion/origenes/<id>` va a ésa), sin esperar.
export function PestanasDeLaRuta({ origenId, pestanas }: Props) {
  const router = useRouter()
  const segmento = useSelectedLayoutSegment()
  const laAbierta = pestanas.find((pestana) => pestana.clave === segmento)
  const abierta = laAbierta?.clave ?? null
  // Una apagada (`motivo`) no se recuerda: la entrada la saltaría igual.
  const recordable = laAbierta !== undefined && laAbierta.motivo === undefined
  const [formula] = useQueryState(CLAVE_DE_LA_FORMULA, parseAsString)
  useEffect(() => {
    if (recordable && abierta !== null) {
      void recordarLaPestana({ origenId, parte: abierta })
    }
  }, [origenId, abierta, recordable])
  return (
    <PestanasConDesborde
      pestanas={pestanas}
      valor={abierta ?? ''}
      conAviso={(aviso, pestana) => (
        <ConTooltip texto={aviso} lado="bottom">
          {pestana}
        </ConTooltip>
      )}
      alElegir={(elegida) => {
        const pestana = pestanas.find((una) => una.clave === elegida)
        if (pestana === undefined || elegida === abierta) {
          return
        }
        const ruta =
          formula !== null &&
          abierta !== null &&
          esParteDeLaFormula(abierta) &&
          esParteDeLaFormula(pestana.clave)
            ? rutaDeLaFormula(origenId, formula, pestana.clave)
            : pestana.ruta
        salirSinPerder(() => {
          router.push(ruta as Route)
        })
      }}
    />
  )
}
