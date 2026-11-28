'use client'

import { useEffect, useState } from 'react'
import type { Medidas } from '../../../entities/formatos'

const mismas = (a: Medidas | null, b: Medidas) => a?.ancho === b.ancho && a.alto === b.alto

// El tamaño en pantalla del área del lienzo, con un ResizeObserver sobre el nodo que quien lo llama guarda en un estado (no en una ref: así
// el observador se arma cuando el nodo existe). Nulo hasta la primera medida o si el área no tiene lado.
export function useTamanoDelLienzo(contenedor: HTMLElement | null): Medidas | null {
  const [tamano, setTamano] = useState<Medidas | null>(null)

  useEffect(() => {
    if (!contenedor) {
      return
    }
    const observador = new ResizeObserver(([entrada]) => {
      if (!entrada) {
        return
      }
      const medidas = {
        ancho: Math.round(entrada.contentRect.width),
        alto: Math.round(entrada.contentRect.height),
      }
      setTamano((antes) => (mismas(antes, medidas) ? antes : medidas))
    })
    observador.observe(contenedor)
    return () => {
      observador.disconnect()
    }
  }, [contenedor])

  return contenedor && tamano && tamano.ancho > 0 && tamano.alto > 0 ? tamano : null
}
