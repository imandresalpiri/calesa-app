'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Punto } from '../../../entities/documento'
import {
  alCien as camaraAlCien,
  desplazar as desplazarCamara,
  escalaParaAjustar,
  zoomAlPuntero as zoomDeLaCamara,
  type Camara,
} from '../../../entities/editor/camara'
import type { Medidas } from '../../../entities/formatos'
import type { CamaraDelEditor } from '../tipos'

const SIN_AREA: Camara = { x: 0, y: 0, escala: 1 }

// La cámara del lienzo: dónde se ve el documento. Hasta que la persona hace zoom o se desplaza, el documento entra entero con su margen
// (también si el área cambia de tamaño); desde ahí queda donde lo dejó. Las funciones son estables: leen el tamaño y la cámara de una ref.
export function useCamara(tamano: Medidas | null, documento: Medidas): CamaraDelEditor {
  const [elegida, setElegida] = useState<Camara | null>(null)
  const ajustada = useMemo(
    () => (tamano ? escalaParaAjustar(tamano, documento) : SIN_AREA),
    [tamano, documento],
  )
  const camara = elegida ?? ajustada
  const ultima = useRef({ camara, tamano, documento })

  useEffect(() => {
    ultima.current = { camara, tamano, documento }
  }, [camara, tamano, documento])

  const fijar = useCallback((nueva: Camara) => {
    ultima.current = { ...ultima.current, camara: nueva }
    setElegida(nueva)
  }, [])

  const ajustar = useCallback(() => {
    const { tamano: area, documento: doc } = ultima.current
    if (area) {
      fijar(escalaParaAjustar(area, doc))
    }
  }, [fijar])

  const alCien = useCallback(() => {
    const { tamano: area, documento: doc } = ultima.current
    if (area) {
      fijar(camaraAlCien(area, doc))
    }
  }, [fijar])

  const zoomAlPuntero = useCallback(
    (puntero: Punto, factor: number) => {
      fijar(zoomDeLaCamara(ultima.current.camara, puntero, factor))
    },
    [fijar],
  )

  const desplazar = useCallback(
    (dx: number, dy: number) => {
      fijar(desplazarCamara(ultima.current.camara, dx, dy))
    },
    [fijar],
  )

  return useMemo(
    () => ({ camara, fijar, ajustar, alCien, zoomAlPuntero, desplazar }),
    [camara, fijar, ajustar, alCien, zoomAlPuntero, desplazar],
  )
}
