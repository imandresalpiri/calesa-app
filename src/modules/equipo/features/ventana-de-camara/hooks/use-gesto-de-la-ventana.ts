'use client'

import { useCallback, useState, type KeyboardEvent, type PointerEvent } from 'react'
import {
  llevarAdentro,
  porcentajeDePosicion,
  type Punto,
  type Tamano,
  type VentanaDeCamara,
} from '../../../entities/ventana-de-camara'
import {
  arrastrada,
  cambioDeAnchoDeLaTecla,
  conAnchoNuevo,
  empujeDeLaTecla,
  redimensionada,
  type EsquinaDeTamano,
  type Gesto,
  type Partida,
} from '../gesto'

type Entrada = {
  // Dónde está ahora (px) y cuánto mide (ancho ya limitado, alto medido).
  posicion: Punto
  medida: Tamano
  navegador: Tamano
  cambiar: (cambios: Partial<VentanaDeCamara>) => void
}

type Inicio = Partida & { puntero: Punto; esquina: EsquinaDeTamano | null }

// Guarda el lugar y el ancho como % del espacio libre.
function useGuardarLugar(navegador: Tamano, cambiar: Entrada['cambiar']) {
  return useCallback(
    (lugar: Punto, tamano: Tamano) => {
      const porcentaje = porcentajeDePosicion(lugar, tamano, navegador)
      cambiar({ x: porcentaje.x, y: porcentaje.y, ancho: tamano.ancho })
    },
    [cambiar, navegador],
  )
}

// Un botón de la barra (ajustes, minimizar) es de ese botón, no un arrastre. Y lo que se dibuja en un portal (el popover de ajustes) llega a la barra por el
// árbol de React pero no está en ella: tampoco es un arrastre (capturaría el puntero y se tragaría el clic).
function esArrastreDeLaBarra(evento: PointerEvent<HTMLElement>): boolean {
  const objetivo = evento.target as HTMLElement
  return evento.currentTarget.contains(objetivo) && !objetivo.closest('button')
}

// El arrastre por la barra, el cambio de tamaño por una esquina y las flechas del teclado. La posición se guarda como % del espacio libre (`x`, `y`) y
// siempre adentro de la ventana del navegador (`llevarAdentro()`); la geometría está en `gesto.ts`.
export function useGestoDeLaVentana({ posicion, medida, navegador, cambiar }: Entrada) {
  const [gesto, setGesto] = useState<Gesto | null>(null)
  const [inicio, setInicio] = useState<Inicio | null>(null)

  const guardarLugar = useGuardarLugar(navegador, cambiar)

  const empezar = (evento: PointerEvent<HTMLElement>, esquina: EsquinaDeTamano | null) => {
    if (evento.button !== 0) {
      return
    }
    evento.currentTarget.setPointerCapture(evento.pointerId)
    setInicio({ puntero: { x: evento.clientX, y: evento.clientY }, posicion, medida, esquina })
    setGesto({ posicion, ancho: medida.ancho })
  }

  const mover = (evento: PointerEvent<HTMLElement>) => {
    if (!inicio) {
      return
    }
    const delta = { x: evento.clientX - inicio.puntero.x, y: evento.clientY - inicio.puntero.y }
    setGesto(
      inicio.esquina
        ? redimensionada(inicio, delta, inicio.esquina, navegador)
        : arrastrada(inicio, delta, navegador),
    )
  }

  const soltar = () => {
    if (inicio && gesto) {
      const { alto } = conAnchoNuevo(inicio, gesto.ancho, inicio.esquina ?? SIN_ESQUINA, navegador)
      guardarLugar(gesto.posicion, { ancho: gesto.ancho, alto })
    }
    setInicio(null)
    setGesto(null)
  }

  // Las flechas con la ventana enfocada (no con un control de adentro): la mueven; con Mayús, más.
  const alTeclear = (evento: KeyboardEvent<HTMLElement>) => {
    const empuje =
      evento.target === evento.currentTarget ? empujeDeLaTecla(evento.key, evento.shiftKey) : null
    if (!empuje) {
      return
    }
    evento.preventDefault()
    guardarLugar(
      llevarAdentro({ x: posicion.x + empuje.x, y: posicion.y + empuje.y }, medida, navegador),
      medida,
    )
  }

  // Las flechas sobre la esquina cambian el ancho, con la esquina opuesta fija.
  const alTeclearEnLaEsquina = (evento: KeyboardEvent<HTMLElement>, esquina: EsquinaDeTamano) => {
    const cambio = cambioDeAnchoDeLaTecla(evento.key)
    if (cambio === null) {
      return
    }
    evento.preventDefault()
    const nuevo = conAnchoNuevo({ posicion, medida }, medida.ancho + cambio, esquina, navegador)
    guardarLugar(nuevo.posicion, { ancho: nuevo.ancho, alto: nuevo.alto })
  }

  return {
    gesto,
    gestoDeArrastre: {
      onPointerDown: (evento: PointerEvent<HTMLElement>) => {
        if (esArrastreDeLaBarra(evento)) {
          empezar(evento, null)
        }
      },
      onPointerMove: mover,
      onPointerUp: soltar,
      onPointerCancel: soltar,
    },
    gestoDeTamano: (esquina: EsquinaDeTamano) => ({
      onPointerDown: (evento: PointerEvent<HTMLElement>) => {
        empezar(evento, esquina)
      },
      onPointerMove: mover,
      onPointerUp: soltar,
      onPointerCancel: soltar,
      onKeyDown: (evento: KeyboardEvent<HTMLElement>) => {
        alTeclearEnLaEsquina(evento, esquina)
      },
    }),
    alTeclear,
  }
}

// Un arrastre por la barra no cambia el ancho: la esquina da igual (el ancho pedido es el de siempre).
const SIN_ESQUINA: EsquinaDeTamano = { aLaDerecha: true, abajo: true }
