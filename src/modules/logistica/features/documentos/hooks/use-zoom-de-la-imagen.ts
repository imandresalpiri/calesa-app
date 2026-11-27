'use client'

import { useEffect, useRef, useState, type PointerEvent } from 'react'

export type VistaDeLaImagen = { escala: number; x: number; y: number }
export const AJUSTADA: VistaDeLaImagen = { escala: 1, x: 0, y: 0 }
export const ESCALA_MAXIMA = 6
const PASO = 1.25
const DOBLE_TOQUE = 2.5

const acotar = (valor: number) => Math.min(ESCALA_MAXIMA, Math.max(1, valor))

// El zoom de una imagen en su caja: acercar y alejar (botones, rueda o doble toque) y arrastrar para recorrerla. Alejar hasta 1 la vuelve a ajustar y la centra. La rueda se registra a mano
// (`passive: false`): sin detener el evento, también desplazaría el modal.
export function useZoomDeLaImagen() {
  const [vista, setVista] = useState<VistaDeLaImagen>(AJUSTADA)
  const caja = useRef<HTMLDivElement>(null)
  const arrastre = useRef<{ desdeX: number; desdeY: number; x: number; y: number } | null>(null)

  const cambiarEscala = (factor: number) => {
    setVista((v) => {
      const escala = acotar(v.escala * factor)
      return escala === 1 ? AJUSTADA : { ...v, escala }
    })
  }

  useEffect(() => {
    const el = caja.current
    if (!el) return
    const alRodar = (evento: WheelEvent) => {
      evento.preventDefault()
      setVista((v) => {
        const escala = acotar(v.escala * (evento.deltaY < 0 ? PASO : 1 / PASO))
        return escala === 1 ? AJUSTADA : { ...v, escala }
      })
    }
    el.addEventListener('wheel', alRodar, { passive: false })
    return () => {
      el.removeEventListener('wheel', alRodar)
    }
  }, [])

  const soltar = () => {
    arrastre.current = null
  }

  return {
    vista,
    caja,
    acercar: () => {
      cambiarEscala(PASO)
    },
    alejar: () => {
      cambiarEscala(1 / PASO)
    },
    ajustar: () => {
      setVista(AJUSTADA)
    },
    manejadores: {
      onPointerDown: (evento: PointerEvent<HTMLDivElement>) => {
        // Con un botón en medio (Alejar, Ajustar), el arrastre no captura el puntero: el clic llegaría a la caja y no al botón.
        if (
          vista.escala === 1 ||
          (evento.target instanceof Element && evento.target.closest('button'))
        )
          return
        evento.currentTarget.setPointerCapture(evento.pointerId)
        arrastre.current = {
          desdeX: evento.clientX,
          desdeY: evento.clientY,
          x: vista.x,
          y: vista.y,
        }
      },
      onPointerMove: (evento: PointerEvent<HTMLDivElement>) => {
        const a = arrastre.current
        if (!a) return
        setVista((v) => ({
          ...v,
          x: a.x + evento.clientX - a.desdeX,
          y: a.y + evento.clientY - a.desdeY,
        }))
      },
      onPointerUp: soltar,
      onPointerCancel: soltar,
      onDoubleClick: () => {
        setVista((v) => (v.escala === 1 ? { ...v, escala: DOBLE_TOQUE } : AJUSTADA))
      },
    },
  }
}
