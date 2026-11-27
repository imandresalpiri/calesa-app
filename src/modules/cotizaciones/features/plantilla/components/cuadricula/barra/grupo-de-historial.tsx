'use client'

import { Redo2Icon, Undo2Icon } from 'lucide-react'
import {
  loQueSeDeshace,
  loQueSeRehace,
  type Historial,
} from '../../../../../entities/plantilla/edicion/historial'
import { BotonDeLaBarra, GrupoDeLaBarra } from './elementos'
import type { PropsDeUnGrupo } from './tipos'

// «Deshacer» y «Rehacer», con lo que deshacen en su `title`.
export function GrupoDeHistorial({
  disponible,
  hacer,
  ocupado,
  nombreDelAtajo,
  historial,
}: PropsDeUnGrupo & { historial: Historial<unknown> }) {
  const deshace = loQueSeDeshace(historial)
  const rehace = loQueSeRehace(historial)
  const z = nombreDelAtajo('mod+z')
  const y = nombreDelAtajo('mod+y')
  return (
    <GrupoDeLaBarra nombre="Historial">
      <BotonDeLaBarra
        etiqueta="Deshacer"
        titulo={deshace === null ? `Deshacer (${z})` : `Deshacer: ${deshace} (${z})`}
        motivo={disponible.deshacer}
        ocupado={ocupado}
        alTocar={() => {
          hacer({ tipo: 'deshacer' })
        }}
      >
        <Undo2Icon aria-hidden className="size-4" />
      </BotonDeLaBarra>
      <BotonDeLaBarra
        etiqueta="Rehacer"
        titulo={rehace === null ? `Rehacer (${y})` : `Rehacer: ${rehace} (${y})`}
        motivo={disponible.rehacer}
        ocupado={ocupado}
        alTocar={() => {
          hacer({ tipo: 'rehacer' })
        }}
      >
        <Redo2Icon aria-hidden className="size-4" />
      </BotonDeLaBarra>
    </GrupoDeLaBarra>
  )
}
