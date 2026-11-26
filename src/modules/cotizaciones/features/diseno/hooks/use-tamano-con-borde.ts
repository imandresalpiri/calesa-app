'use client'

import { useRef, useState, type PointerEvent as EventoDelPuntero } from 'react'
import { columnasPorBorde } from '../../../entities/diseno/ancho-de-la-pieza'
import { filasPorBorde } from '../../../entities/diseno/geometria-de-la-rejilla'
import type { Tamano } from '../../../entities/diseno/lugar-en-la-rejilla'
import type { PiezaEnLaRejilla } from '../../../entities/rejilla-de-la-hoja'
import { medirLaRejilla, type RejillaMedida } from './medir-la-rejilla'

// El borde derecho cambia el ancho (en columnas); el inferior, el alto (en filas).
export type LadoDelBorde = 'derecho' | 'inferior'

// La rejilla donde está la pieza: la de su sección o, para una sección, la de las secciones (la primera hacia afuera que se deja medir).
const DONDE_ESTA = '[data-rejilla]'

type Medida = { rejilla: RejillaMedida; inicio: number }

type Acciones = {
  // Lo que entraría de lo pedido (sin empujar a nadie); nulo si la pieza ya no está.
  topar: (pedido: Partial<Tamano>) => Tamano | null
  alCambiar: (pedido: Partial<Tamano>) => void
}

// Las columnas de la rejilla con sus huecos, en sus px.
const anchoDeLasColumnas = ({ geometria: g }: RejillaMedida) =>
  g.columnas.reduce((total, c) => total + c, 0) + g.huecoX * Math.max(0, g.columnas.length - 1)

// Lo que pide el borde llevado al puntero: las columnas desde el inicio de la pieza hasta él, o las filas desde la suya.
function pedidoDelBorde(
  lado: LadoDelBorde,
  m: Medida,
  e: { clientX: number; clientY: number },
  lugar: PiezaEnLaRejilla,
): Partial<Tamano> {
  const punto = m.rejilla.alPunto(e.clientX, e.clientY)
  return lado === 'derecho'
    ? { ancho: columnasPorBorde(punto.x - m.inicio, anchoDeLasColumnas(m.rejilla), lugar.ancho) }
    : { alto: filasPorBorde(punto.y, m.rejilla.geometria, lugar.posicion.fila) }
}

// Un borde de la pieza elegida: arrastrarlo cambia su ancho o su alto en la rejilla, hasta donde entra (mientras se arrastra, lo que quedaría a la vista). Un solo
// cambio, al soltar; Esc cancela. Mide la rejilla en el navegador (`medirLaRejilla()`: el lienzo va con `zoom`, el puntero pasa a sus px); en la vista que
// apila no empieza, porque ahí no se ve ningún lugar.
export function useTamanoConBorde(
  lado: LadoDelBorde,
  lugar: PiezaEnLaRejilla,
  { topar, alCambiar }: Acciones,
) {
  const [tamano, setTamano] = useState<Tamano | null>(null)
  const medida = useRef<Medida | null>(null)
  const antes: Tamano = { ancho: lugar.ancho, alto: lugar.alto }
  const cuyo: keyof Tamano = lado === 'derecho' ? 'ancho' : 'alto'
  const cancelar = () => {
    medida.current = null
    setTamano(null)
  }
  const pedido = (e: EventoDelPuntero<HTMLElement>) =>
    medida.current === null ? null : pedidoDelBorde(lado, medida.current, e, lugar)
  return {
    // Mientras se arrastra, lo que quedaría; nulo, quieto.
    tamano,
    alBajar: (e: EventoDelPuntero<HTMLElement>) => {
      const pieza = e.currentTarget.parentElement
      const id = pieza?.closest(DONDE_ESTA)?.getAttribute('data-rejilla')
      const rejilla = id == null ? null : medirLaRejilla(id)
      if (pieza == null || rejilla === null || rejilla.apilada) return
      e.preventDefault()
      e.stopPropagation()
      e.currentTarget.setPointerCapture(e.pointerId)
      const caja = pieza.getBoundingClientRect()
      medida.current = { rejilla, inicio: rejilla.alPunto(caja.left, caja.top).x }
      setTamano(antes)
    },
    alMover: (e: EventoDelPuntero<HTMLElement>) => {
      const p = pedido(e)
      if (p !== null) setTamano(topar(p) ?? antes)
    },
    // Lo pedido va aunque no entre: el anuncio dice por qué no creció.
    alSubir: (e: EventoDelPuntero<HTMLElement>) => {
      const p = pedido(e)
      if (p === null) return
      cancelar()
      if (p[cuyo] !== antes[cuyo]) alCambiar(p)
    },
    alTeclear: (e: { key: string; preventDefault: () => void }) => {
      if (e.key === 'Escape' && medida.current !== null) {
        e.preventDefault()
        cancelar()
      }
    },
    cancelar,
  }
}
