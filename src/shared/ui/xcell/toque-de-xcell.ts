'use client'

// Toda la celda es el campo: un clic o un toque en el rótulo, en el fondo o en la línea de la nota abre la edición como el clic en el valor. No hay un
// interactivo dentro de otro: la raíz no es un botón; delega en el botón del valor (`.click()`: mide su ancho y abre con todo seleccionado). Lo que ya es un
// control (los valores, las acciones, el candado) se ocupa solo: ⚙, ayuda y ↺ nunca abren.
import type { MouseEvent } from 'react'
import type { Lado } from './use-edicion'

// La marca «Editado a mano» (`role=img`) es información, como el candado: tocarla no abre.
const CONTROL = 'button, input, [data-parada], [role="img"]'

const esControl = (evento: MouseEvent<HTMLElement>) =>
  evento.target instanceof Element && evento.target.closest(CONTROL) !== null

// El lado que abre un toque en el fondo: el primero sin candado en el orden en que se ven (el grande, casi siempre); `undefined` con todos bloqueados.
export function ladoDelToque(orden: Lado[], bloqueado: (lado: Lado) => boolean): Lado | undefined {
  return orden.find((lado) => !bloqueado(lado))
}

// `orden`: los lados en el orden en que se ven (el primero libre es el que abre un toque en el fondo); `abierta`: hay una entrada abierta en la celda;
// `candadoDe`: el id del candado de cada lado (`notasDe()`).
export function useToqueDeLaCelda(
  orden: Lado[],
  bloqueado: (lado: Lado) => boolean,
  abierta: boolean,
  candadoDe: Record<Lado, string | undefined>,
) {
  // Tocar un lado bloqueado (o la celda con todos bloqueados) enfoca su candado: su globo muestra el motivo y el lector lo lee. Nunca abre el campo.
  const mostrarMotivo = (lado: Lado) => {
    const id = candadoDe[lado]
    if (id !== undefined) document.getElementById(id)?.focus()
  }
  return {
    mostrarMotivo,
    // El lado que abre un toque en el fondo (se ilumina al pasar el puntero por la celda).
    blanco: ladoDelToque(orden, bloqueado),
    // Van en la raíz de la celda.
    manejadores: { onClick: alTocar, onMouseDown: alApretar },
  }

  function alTocar(evento: MouseEvent<HTMLDivElement>) {
    // Con la edición abierta el toque en el fondo no hace nada: el `mousedown` ya dejó el foco en la entrada.
    if (abierta || esControl(evento)) {
      return
    }
    const lado = ladoDelToque(orden, bloqueado)
    if (lado === undefined) {
      const primero = orden[0]
      if (primero !== undefined) mostrarMotivo(primero)
      return
    }
    evento.currentTarget.querySelector<HTMLElement>(`[data-lado="${lado}"]`)?.click()
  }

  // Tocar el rótulo o el fondo mientras se edita no le quita el foco a la entrada: si no, confirmaría y volvería a abrir.
  function alApretar(evento: MouseEvent<HTMLDivElement>) {
    if (abierta && !esControl(evento)) {
      evento.preventDefault()
    }
  }
}
