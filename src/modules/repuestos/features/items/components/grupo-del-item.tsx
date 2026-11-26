'use client'

import type { ReactNode } from 'react'
import { CLAVE_DE_EDICION_DEL_ITEM } from '@/shared/lib/filtros'
import { TarjetaDeAjustes, TarjetaTocable } from '@/shared/ui/tarjetas-de-ajustes'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import type { GrupoDelItem } from '../../../entities/items/grupos-del-item'
import type { FilaDeItem } from '../../../entities/nucleo/item'
import type { ContextoDeLaHoja } from './contexto-de-la-hoja'
import { ModalDelGrupo } from './modal-del-grupo'

type Props = {
  grupo: GrupoDelItem
  fila: FilaDeItem
  contexto: ContextoDeLaHoja
  // Sin `repuestos.editar` o con el proyecto cerrado (`false`): sin «Editar», el grupo es sólo texto.
  editable: boolean
  conflicto: string | null
  alRecargar: () => void
  children: ReactNode
}

// Un grupo de campos del ítem (la columna izquierda): su título, lo guardado como texto y, con permiso, sólo su «⋯» con «Editar…» —tocar el grupo hace lo mismo—, que abre su modal
// (`?editar=<grupo>`, sin soltar `?item=`: un `?panel=` cerraría el panel). Sin permiso o con el proyecto cerrado, el grupo se lee y no ofrece nada.
export function GrupoDelItemEditable({
  grupo,
  fila,
  contexto,
  editable,
  conflicto,
  alRecargar,
  children,
}: Props) {
  const url = usePanelPorUrl(grupo.clave, [], { clave: CLAVE_DE_EDICION_DEL_ITEM })
  if (!editable) {
    return (
      <TarjetaDeAjustes titulo={grupo.titulo} densidad="compacta">
        {children}
      </TarjetaDeAjustes>
    )
  }
  return (
    <>
      <TarjetaTocable
        densidad="compacta"
        titulo={grupo.titulo}
        accion={`Editar ${grupo.titulo}`}
        etiquetaDelMenu="Editar…"
        motivo={null}
        abrir={() => {
          url.abrir()
        }}
      >
        {children}
      </TarjetaTocable>
      <ModalDelGrupo
        grupo={grupo}
        abierto={url.abierto}
        alCerrar={url.cerrar}
        fila={fila}
        contexto={contexto}
        conflicto={conflicto}
        alRecargar={alRecargar}
      />
    </>
  )
}
