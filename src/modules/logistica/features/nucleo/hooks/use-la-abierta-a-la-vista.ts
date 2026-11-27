'use client'

import { useEffect, type RefObject } from 'react'
import { traerLaAbiertaALaVista } from '@/shared/ui/traer-la-abierta-a-la-vista'

// Deja a la vista la pestaña de la página en una fila de la barra de Logística que se desplaza: al dibujarse y cada vez que la fila cambia de tamaño (se
// gira el celular, se amplía el texto), como `PestanasConDesborde`.
export function useLaAbiertaALaVista(ref: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const fila = ref.current
    if (!fila) {
      return
    }
    traerLaAbiertaALaVista(fila)
    const observador = new ResizeObserver(() => {
      traerLaAbiertaALaVista(fila)
    })
    observador.observe(fila)
    return () => {
      observador.disconnect()
    }
  }, [ref])
}
