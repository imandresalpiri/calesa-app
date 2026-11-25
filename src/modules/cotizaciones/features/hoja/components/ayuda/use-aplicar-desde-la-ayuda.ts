'use client'

import { useState } from 'react'
import { useLive } from '@/shared/ui/live'
import { useRegional } from '@/shared/ui/regional'
import { avisar, avisarConDeshacer } from '@/shared/ui/toasts'
import {
  avisoDelValor,
  SIN_DESHACER_EN_LA_HOJA,
  type DestinoDeLaAyuda,
} from '../../../../entities/destino-de-la-ayuda'
import type { AyudaDeLaHoja } from '../../hooks/use-ayuda-de-la-hoja'

// Tocar una cifra de una tabla de la ayuda: la escribe en su celda como si se tipeara (`alAplicar`), cierra la ayuda y avisa «IVA % = 14,94 %» con «Deshacer», que vuelve
// a lo de antes del clic sólo si la hoja no cambió después (si no, lo dice). `llenado` es el lado que se llenó en esta apertura (`useApertura`): el panel le devuelve el
// foco al cerrar; otra apertura lo suelta. Sin `alAplicar` (mientras guarda, la hoja en par), nada se elige.
export function useAplicarDesdeLaAyuda(ayuda: AyudaDeLaHoja, apertura: number) {
  const regional = useRegional()
  const { live } = useLive()
  const [llenado, setLlenado] = useState<{ apertura: number; destino: DestinoDeLaAyuda } | null>(
    null,
  )
  const { alAplicar, cerrar } = ayuda
  const alElegir = alAplicar
    ? (elegido: DestinoDeLaAyuda, valor: number) => {
        const deshacer = alAplicar(elegido.nodo, valor)
        setLlenado({ apertura, destino: elegido })
        cerrar()
        avisarConDeshacer(avisoDelValor(elegido, valor, regional, live), () => {
          if (!deshacer()) {
            avisar(SIN_DESHACER_EN_LA_HOJA)
          }
        })
      }
    : undefined
  return { alElegir, llenado: llenado?.apertura === apertura ? llenado.destino : null }
}
