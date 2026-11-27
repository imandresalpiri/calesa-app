'use client'

import { DropdownMenuSeparator } from '@/shared/ui/dropdown-menu'
import { ATAJOS } from '@/shared/lib/atajos'
import { OPERACIONES_DE_LA_BARRA } from '../../../../../entities/plantilla/edicion/disponibilidad'
import { ItemDeOperacion } from '../item-de-operacion'
import { DE_LA_COMBINACION, PARA_ELIMINAR } from '../lista-de-operaciones'
import { GrupoDeLaBarra, MenuDeLaBarra } from './elementos'
import type { PropsDeUnGrupo } from './tipos'

// «Filas y columnas ▾»: combinar y separar celdas y eliminar las filas o las columnas elegidas.
export function GrupoDeFilasYColumnas({
  disponible,
  hacer,
  ocupado,
  nombreDelAtajo,
}: PropsDeUnGrupo) {
  return (
    <GrupoDeLaBarra nombre="Filas y columnas">
      <MenuDeLaBarra titulo="Filas y columnas" ocupado={ocupado}>
        {DE_LA_COMBINACION.map((o) => (
          <ItemDeOperacion
            key={o.clave}
            texto={o.texto}
            motivo={disponible[o.clave]}
            {...(o.atajo === undefined
              ? {}
              : { atajo: nombreDelAtajo(ATAJOS[o.atajo].combinacion) })}
            alHacer={() => {
              hacer(OPERACIONES_DE_LA_BARRA[o.clave])
            }}
          />
        ))}
        <DropdownMenuSeparator />
        {PARA_ELIMINAR.map((o) => (
          <ItemDeOperacion
            key={o.clave}
            texto={`Eliminar ${o.texto.toLowerCase()}`}
            motivo={disponible[o.clave]}
            alHacer={() => {
              hacer(OPERACIONES_DE_LA_BARRA[o.clave])
            }}
          />
        ))}
      </MenuDeLaBarra>
    </GrupoDeLaBarra>
  )
}
