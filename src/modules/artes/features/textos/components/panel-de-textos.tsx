'use client'

import type { PropsDelPanelDeTextos } from '../tipos'
import { SeccionDelMensajeDelPortal } from './seccion-del-mensaje-del-portal'
import { SeccionDelTextoBase } from './seccion-del-texto-base'

// La pestaña «Textos» del editor de artes: el texto base del origen y, debajo, el Mensaje del portal. Dos secciones planas, una debajo de la
// otra, cada una con su título y su guardado (ninguna se pliega). Lo escrito y no guardado de cada una queda como borrador en `sessionStorage`.
export function PanelDeTextos({
  origen,
  catalogo,
  textoBase,
  motivoDelTextoBase,
  portal,
  motivoDelPortal,
  datos,
  sinMoneda,
}: PropsDelPanelDeTextos) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8">
      <SeccionDelTextoBase
        origen={origen}
        catalogo={catalogo}
        textoBase={textoBase}
        motivoDelTextoBase={motivoDelTextoBase}
        datos={datos}
        sinMoneda={sinMoneda}
      />
      <SeccionDelMensajeDelPortal portal={portal} motivoDelPortal={motivoDelPortal} datos={datos} />
    </div>
  )
}
