'use client'

type Seguimiento = {
  alMover: (evento: PointerEvent) => void
  // Nulo si el navegador canceló el gesto.
  alSoltar: (evento: PointerEvent | null) => void
}

// Sigue el puntero por la ventana desde que se aprieta hasta que se suelta, también fuera del lienzo (un recuadro, una forma que se
// dibuja, la mano, las asas de la pluma). Devuelve cómo cortarlo antes.
export function seguirElPuntero({ alMover, alSoltar }: Seguimiento): () => void {
  const mover = (evento: PointerEvent) => {
    alMover(evento)
  }
  const soltar = (evento: PointerEvent) => {
    cortar()
    alSoltar(evento)
  }
  const cancelar = () => {
    cortar()
    alSoltar(null)
  }
  function cortar() {
    window.removeEventListener('pointermove', mover)
    window.removeEventListener('pointerup', soltar)
    window.removeEventListener('pointercancel', cancelar)
  }
  window.addEventListener('pointermove', mover)
  window.addEventListener('pointerup', soltar)
  window.addEventListener('pointercancel', cancelar)
  return cortar
}
