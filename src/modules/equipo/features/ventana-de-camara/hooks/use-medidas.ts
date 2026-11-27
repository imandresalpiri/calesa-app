'use client'

import { useEffect, useState } from 'react'
import type { Tamano } from '../../../entities/ventana-de-camara'

function medidaDeLaVentanaDelNavegador(): Tamano {
  return { ancho: window.innerWidth, alto: window.innerHeight }
}

// El tamaño de la ventana del navegador, al día al cambiarlo. Sólo corre en el navegador (la ventana se pide con `diferido()`).
export function useNavegador(): Tamano {
  const [medida, setMedida] = useState(medidaDeLaVentanaDelNavegador)
  useEffect(() => {
    const alCambiar = () => {
      setMedida(medidaDeLaVentanaDelNavegador())
    }
    window.addEventListener('resize', alCambiar)
    return () => {
      window.removeEventListener('resize', alCambiar)
    }
  }, [])
  return medida
}

// Lo que mide un elemento ahora (con su contenido: los datos y el texto grande lo cambian), al día con un `ResizeObserver`.
export function useMedidaDe(elemento: HTMLElement | null, inicial: Tamano): Tamano {
  const [medida, setMedida] = useState(inicial)
  useEffect(() => {
    if (!elemento) {
      return
    }
    const observador = new ResizeObserver(([entrada]) => {
      const caja = entrada?.borderBoxSize[0]
      if (caja) {
        setMedida((previa) =>
          previa.ancho === caja.inlineSize && previa.alto === caja.blockSize
            ? previa
            : { ancho: caja.inlineSize, alto: caja.blockSize },
        )
      }
    })
    observador.observe(elemento)
    return () => {
      observador.disconnect()
    }
  }, [elemento])
  return medida
}
