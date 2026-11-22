'use client'

import { useEffect, useRef, type MouseEvent, type PointerEvent } from 'react'
import type { PlantillaEnCuadricula } from '../../../entities/cuadricula-de-la-tarjeta'
import type { PiezaDeLaCapa } from '../../../entities/plantilla/edicion/disposicion'
import { extenderHasta, seleccionarCelda } from '../../../entities/plantilla/edicion/seleccion'
import { seEscribeEnElLugar } from '../../../entities/plantilla/edicion/texto-con-datos'
import type { Pos, Rect } from '../../../entities/plantilla/edicion/tipos'
import type { EditorDeLaCuadricula } from './use-editor-de-la-cuadricula'

type Args = {
  editor: EditorDeLaCuadricula
  plantilla: PlantillaEnCuadricula
  rango: Rect | null
  visibles: readonly number[]
  piezaEn: (pos: Pos) => PiezaDeLaCapa | null
  enfocar: () => void
  alEditarContenido: () => void
  alAbrirMenu: () => void
}

// La casilla de un elemento de la grilla (`data-pos="f:k"`).
export function posDe(objetivo: EventTarget | null): Pos | null {
  const nodo = objetivo instanceof Element ? objetivo.closest('[data-pos]') : null
  const [f, k] = (nodo?.getAttribute('data-pos') ?? '').split(':').map(Number)
  return f === undefined || k === undefined || Number.isNaN(f) || Number.isNaN(k) ? null : { f, k }
}

const escribible = (pieza: PiezaDeLaCapa | null) => seEscribeEnElLugar(pieza?.celda?.contenido)

const fuera = (r: Rect | null, p: Pos) =>
  r === null || p.f < r.f0 || p.f > r.f1 || p.k < r.k0 || p.k > r.k1

// El puntero sobre la grilla del lienzo: clic elige, Shift+clic extiende, arrastrar extiende, doble clic escribe (un dato o el logo: al campo «Contenido» del panel) y el
// clic derecho abre el menú contextual (eligiendo la celda si quedaba fuera de lo elegido). Se escucha en la grilla, no en cada celda.
export function usePunteroDelLienzo({
  editor,
  plantilla,
  rango,
  visibles,
  piezaEn,
  enfocar,
  alEditarContenido,
  alAbrirMenu,
}: Args) {
  const { estado, hacer, mapa } = editor
  const arrastre = useRef<string | null>(null)
  useEffect(() => {
    const soltar = () => {
      arrastre.current = null
    }
    window.addEventListener('pointerup', soltar)
    return () => {
      window.removeEventListener('pointerup', soltar)
    }
  }, [])
  const clave = (p: Pos) => `${String(p.f)}:${String(p.k)}`
  return {
    onPointerDown: (e: PointerEvent<HTMLDivElement>) => {
      const pos = posDe(e.target)
      if (pos === null || e.button !== 0) return
      e.preventDefault()
      enfocar()
      arrastre.current = clave(pos)
      hacer({
        tipo: 'seleccionar',
        seleccion: e.shiftKey
          ? extenderHasta(estado.seleccion, pos)
          : seleccionarCelda(mapa, plantilla, pos),
      })
    },
    onPointerOver: (e: PointerEvent<HTMLDivElement>) => {
      const pos = posDe(e.target)
      // Sólo arrastrando con el botón principal apretado.
      if ((e.buttons & 1) === 0) arrastre.current = null
      if (arrastre.current === null || pos === null || clave(pos) === arrastre.current) return
      arrastre.current = clave(pos)
      hacer({ tipo: 'seleccionar', seleccion: extenderHasta(estado.seleccion, pos) })
    },
    onDoubleClick: (e: MouseEvent<HTMLDivElement>) => {
      const pos = posDe(e.target)
      if (pos === null) return
      if (escribible(piezaEn(pos))) hacer({ tipo: 'empezarAEscribir', visibles })
      else alEditarContenido()
    },
    onContextMenu: (e: MouseEvent<HTMLDivElement>) => {
      const pos = posDe(e.target)
      if (pos === null) return
      e.preventDefault()
      if (fuera(rango, pos))
        hacer({ tipo: 'seleccionar', seleccion: seleccionarCelda(mapa, plantilla, pos) })
      alAbrirMenu()
    },
  }
}
