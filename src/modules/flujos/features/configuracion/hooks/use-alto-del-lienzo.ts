'use client'

import { useLayoutEffect, useState, type RefObject } from 'react'

const ALTO_MINIMO_EN_REM = 24

// El alto del lienzo: lo que queda de la ventana debajo de donde empieza (sin el relleno de abajo de `<main>`), y nunca menos de 24 rem. Así la página no se
// desplaza y la rueda es del lienzo. Se mide antes de pintar y otra vez si cambia lo de arriba (la franja de «Revisar», un aviso) o la ventana. Nulo en el
// servidor y hasta medir: quien lo usa pone la clase de siempre. Un CSS fijo no serviría: no sabe cuánto ocupan la cabecera, las pestañas y la barra.
export function useAltoDelLienzo(ref: RefObject<HTMLElement | null>): number | null {
  const [alto, setAlto] = useState<number | null>(null)
  useLayoutEffect(() => {
    const medir = () => {
      const elemento = ref.current
      if (!elemento) return
      const rem = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
      const main = elemento.closest('main')
      const abajo = main ? Number.parseFloat(getComputedStyle(main).paddingBottom) || 0 : 0
      const arriba = elemento.getBoundingClientRect().top + window.scrollY
      setAlto(Math.max(ALTO_MINIMO_EN_REM * rem, Math.floor(window.innerHeight - arriba - abajo)))
    }
    medir()
    const observador = new ResizeObserver(medir)
    observador.observe(document.body)
    window.addEventListener('resize', medir)
    return () => {
      observador.disconnect()
      window.removeEventListener('resize', medir)
    }
  }, [ref])
  return alto
}
