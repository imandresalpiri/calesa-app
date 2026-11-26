'use client'

import { useContextoDeLaBarra } from './contexto'

// El lugar junto al estado de la barra de la fórmula donde la Planilla pone el botón ⓘ «Información de la fórmula» (`<AccionesEnLaBarra lugar="estado">`). El
// portal no se dibuja en el servidor: el cuadro del botón queda reservado (44 px táctil, 36 desde `md` con puntero fino) para que nada salte al hidratar.
export function RanuraDelEstado() {
  const contexto = useContextoDeLaBarra()
  return (
    <div
      ref={contexto?.setRanuraDelEstado}
      data-ranura-del-estado=""
      className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center md:pointer-fine:min-h-9 md:pointer-fine:min-w-9"
    />
  )
}
