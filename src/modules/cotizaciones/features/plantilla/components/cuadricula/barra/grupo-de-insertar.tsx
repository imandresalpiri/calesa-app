'use client'

import { DropdownMenuSeparator } from '@/shared/ui/dropdown-menu'
import { ATAJOS } from '@/shared/lib/atajos'
import { OPERACIONES_DE_LA_BARRA } from '../../../../../entities/plantilla/edicion/disponibilidad'
import { ItemDeOperacion } from '../item-de-operacion'
import { PARA_INSERTAR } from '../lista-de-operaciones'
import { GrupoDeLaBarra, MenuDeLaBarra } from './elementos'
import type { PropsDeUnGrupo } from './tipos'

type Props = PropsDeUnGrupo & {
  // Por qué no se puede poner contenido en lo elegido (nada elegido o una fila), o nulo.
  motivoDelContenido: string | null
  // «Un texto» y «Un dato» abren el panel de la celda en ese contenido; «El logo» lo pone al instante.
  alPedirContenido: (tipo: 'texto' | 'dato') => void
}

// «Insertar ▾»: una fila arriba o abajo, una columna a la izquierda o a la derecha, y en lo elegido un texto, un dato o el logo.
export function GrupoDeInsertar({
  disponible,
  hacer,
  ocupado,
  nombreDelAtajo,
  motivoDelContenido,
  alPedirContenido,
}: Props) {
  return (
    <GrupoDeLaBarra nombre="Insertar">
      <MenuDeLaBarra titulo="Insertar" ocupado={ocupado}>
        {PARA_INSERTAR.map((o) => (
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
        <ItemDeOperacion
          texto="Un texto"
          motivo={motivoDelContenido}
          alHacer={() => {
            alPedirContenido('texto')
          }}
        />
        <ItemDeOperacion
          texto="Un dato"
          motivo={motivoDelContenido}
          alHacer={() => {
            alPedirContenido('dato')
          }}
        />
        <ItemDeOperacion
          texto="El logo"
          motivo={motivoDelContenido}
          alHacer={() => {
            hacer({ tipo: 'contenido', contenido: { tipo: 'logo' } })
          }}
        />
      </MenuDeLaBarra>
    </GrupoDeLaBarra>
  )
}
