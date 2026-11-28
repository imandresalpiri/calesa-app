'use client'

import { memo, useState } from 'react'
import type { GrupoDeCapas } from '../../../../entities/documento'
import type { ModoDeElegir } from '../../../../entities/editor/estado'
import type { Despachar } from '../../tipos'
import { BotonesDeLaFila } from './botones-de-la-fila'
import { FilaOrdenable } from './fila-ordenable'
import { IconoDeLaCapa } from './icono-de-la-capa'
import { NombreDeLaFila } from './nombre-de-la-fila'

type Props = {
  grupo: GrupoDeCapas
  // Elegida si lo están todos sus miembros.
  elegida: boolean
  soloLectura: boolean
  despachar: Despachar
  // Estable: elige la fila por su id (todos los miembros del grupo).
  alElegir: (id: string, modo: ModoDeElegir) => void
}

// La fila de un grupo en «Capas», encima de sus miembros: su asa (arrastra el grupo entero), la carpeta y su nombre, el ojo y el candado del
// grupo (lo ocultan o lo bloquean entero sin tocar lo de cada miembro). Un clic elige todos sus miembros. Un grupo no queda sin nombre.
export const FilaDeGrupo = memo(function FilaDeGrupo(props: Props) {
  const { grupo, soloLectura, despachar } = props
  const [renombrando, setRenombrando] = useState(false)
  return (
    <FilaOrdenable
      id={grupo.id}
      nombre={grupo.nombre}
      elegida={props.elegida}
      quieta={soloLectura || renombrando}
      sangrada={false}
      nombreDeLaFila={
        <NombreDeLaFila
          icono={<IconoDeLaCapa capa={null} />}
          nombre={grupo.nombre}
          inicial={grupo.nombre}
          apagada={grupo.oculto}
          soloLectura={soloLectura}
          renombrando={renombrando}
          alCambiarRenombrando={setRenombrando}
          alElegir={(modo) => {
            props.alElegir(grupo.id, modo)
          }}
          alRenombrar={(escrito) => {
            despachar({ tipo: 'renombrar', id: grupo.id, nombre: escrito })
          }}
        />
      }
      botones={
        <BotonesDeLaFila
          nombre={grupo.nombre}
          oculta={grupo.oculto}
          bloqueada={grupo.bloqueado}
          soloLectura={soloLectura}
          alAlternar={(que) => {
            despachar({ tipo: 'alternar', id: grupo.id, que })
          }}
        />
      }
    />
  )
})
