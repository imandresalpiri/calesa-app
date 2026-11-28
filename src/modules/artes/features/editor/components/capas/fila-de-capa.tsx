'use client'

import { memo, useState } from 'react'
import type { CapaDeArte } from '../../../../entities/documento'
import type { ModoDeElegir } from '../../../../entities/editor/estado'
import type { Despachar } from '../../tipos'
import { BotonesDeLaFila } from './botones-de-la-fila'
import { FilaOrdenable } from './fila-ordenable'
import { IconoDeLaCapa } from './icono-de-la-capa'
import { MarcaDeDatos, type DatosDeLaFila } from './marca-de-datos'
import { NombreDeLaFila } from './nombre-de-la-fila'

type Props = {
  capa: CapaDeArte
  enGrupo: boolean
  nombre: string
  elegida: boolean
  // Oculta ella o su grupo.
  apagada: boolean
  // Si se llena con los datos y, con los de ahora, si tiene qué mostrar; nulo si no usa datos.
  datos: DatosDeLaFila | null
  soloLectura: boolean
  despachar: Despachar
  // Estable: elige la fila por su id (la capa sola).
  alElegir: (id: string, modo: ModoDeElegir) => void
}

// La fila de una capa en «Capas»: su asa, su icono y su nombre, el ojo y el candado. Un clic la elige sola (aunque esté en un grupo); el ojo,
// el candado y el nombre cambian la capa, no su grupo. Con props estables (la capa cambia sólo si cambió) no se vuelve a dibujar mientras
// se mueve otra.
export const FilaDeCapa = memo(function FilaDeCapa(props: Props) {
  const { capa, nombre, soloLectura, despachar } = props
  const [renombrando, setRenombrando] = useState(false)
  return (
    <FilaOrdenable
      id={capa.id}
      nombre={nombre}
      elegida={props.elegida}
      quieta={soloLectura || renombrando}
      sangrada={props.enGrupo}
      nombreDeLaFila={
        <NombreDeLaFila
          icono={<IconoDeLaCapa capa={capa} />}
          nombre={nombre}
          inicial={capa.nombre ?? nombre}
          apagada={props.apagada}
          marca={props.datos === null ? undefined : <MarcaDeDatos datos={props.datos} />}
          soloLectura={soloLectura}
          renombrando={renombrando}
          alCambiarRenombrando={setRenombrando}
          alElegir={(modo) => {
            props.alElegir(capa.id, modo)
          }}
          alRenombrar={(escrito) => {
            despachar({ tipo: 'renombrar', id: capa.id, nombre: escrito })
          }}
        />
      }
      botones={
        <BotonesDeLaFila
          nombre={nombre}
          oculta={capa.oculta}
          bloqueada={capa.bloqueada}
          soloLectura={soloLectura}
          alAlternar={(que) => {
            despachar({ tipo: 'alternar', id: capa.id, que })
          }}
        />
      }
    />
  )
})
