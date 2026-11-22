'use client'

import { useRef } from 'react'
import { AvisoDePisadoDiferido } from './diferidos'

// La región viva del aviso de la primera vez, siempre en la página (vacía no ocupa lugar: deshace el hueco de la rejilla) para que el lector de pantalla anuncie el
// aviso al llegar. Va justo sobre las secciones: al cerrarlo, el foco pasa a la primera celda, lo que sigue con Tab.
export function RegionDelAvisoDePisado({
  visible,
  alCerrar,
}: {
  visible: boolean
  alCerrar: () => void
}) {
  const region = useRef<HTMLDivElement>(null)
  return (
    <div ref={region} role="status" className="empty:-mb-4">
      {visible ? (
        <AvisoDePisadoDiferido
          alCerrar={() => {
            region.current?.nextElementSibling
              ?.querySelector<HTMLElement>('[data-xcell] [data-parada="0"]')
              ?.focus()
            alCerrar()
          }}
        />
      ) : null}
    </div>
  )
}
