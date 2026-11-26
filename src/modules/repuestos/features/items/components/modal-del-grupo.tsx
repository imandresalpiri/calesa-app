'use client'

import type { ReactNode } from 'react'
import { Button } from '@/shared/ui/button'
import { Modal } from '@/shared/ui/modal'
import { XCELL_COMPACTA } from '@/shared/ui/xcell'
import type { ClaveDeGrupo, GrupoDelItem } from '../../../entities/items/grupos-del-item'
import type { FilaDeItem } from '../../../entities/nucleo/item'
import { AvisoDeConflictoDeLaHoja } from './avisos-de-la-hoja'
import { controlesDeItem } from './controles-de-item'
import type { ContextoDeLaHoja } from './contexto-de-la-hoja'

type Props = {
  grupo: GrupoDelItem
  abierto: boolean
  alCerrar: () => void
  fila: FilaDeItem
  contexto: ContextoDeLaHoja
  conflicto: string | null
  alRecargar: () => void
}

// Cada campo con su etiqueta visible, en el orden del grupo. Los controles son los de siempre (`controlesDeItem`): cada uno guarda por su columna, versionado, al salir de él, con Enter o al
// elegir, y dice su motivo debajo si la base lo rechaza.
function camposDe(
  clave: ClaveDeGrupo,
  c: ReturnType<typeof controlesDeItem>,
): [string, ReactNode][] {
  switch (clave) {
    case 'que-es':
      return [
        ['Tipo de pieza', c.tipoDePieza],
        ['Condición', c.condicion],
        ['Descripción', c.descripcion],
      ]
    case 'cantidades':
      return [
        ['Cantidad', c.cantidad],
        ['Precio al cliente', c.precio],
        ['Moneda', c.moneda],
      ]
    case 'origen':
      return [
        ['País de origen', c.pais],
        ['Vía de transporte', c.via],
        ['Tracking', c.tracking],
      ]
    case 'notas':
      return [['Notas', c.notas]]
  }
}

// El modal de un grupo de campos del ítem (`?editar=<grupo>`, sobre el panel del ítem): un título, sus campos y «Listo». No es un formulario con «Guardar»: cada campo guarda solo, como en la fila de
// siempre, así que lo escrito se guarda al salir de él y «Listo» sólo cierra. Un conflicto (`PT409`) se dice aquí también, con «Recargar», y lo escrito queda en su campo.
export function ModalDelGrupo({
  grupo,
  abierto,
  alCerrar,
  fila,
  contexto,
  conflicto,
  alRecargar,
}: Props) {
  const campos = camposDe(grupo.clave, controlesDeItem(fila, contexto))
  return (
    <Modal
      abierto={abierto}
      alCerrar={alCerrar}
      titulo={grupo.titulo}
      descripcion={fila.descripcion}
      pie={<Button onClick={alCerrar}>Listo</Button>}
    >
      {conflicto ? <AvisoDeConflictoDeLaHoja mensaje={conflicto} alRecargar={alRecargar} /> : null}
      <div className={`grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3 ${XCELL_COMPACTA}`}>
        {campos.map(([etiqueta, control]) => (
          <div key={etiqueta} className="grid min-w-0 gap-1">
            <span className="text-(length:--text-xs) font-medium text-(--color-ink-soft)">
              {etiqueta}
            </span>
            {control}
          </div>
        ))}
      </div>
    </Modal>
  )
}
