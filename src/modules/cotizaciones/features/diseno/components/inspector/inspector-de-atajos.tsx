'use client'

import { Campo } from '@/shared/ui/campo'
import { CampoSeleccion } from '@/shared/ui/campo-seleccion'
import { MAXIMO_DE_ATAJOS, type ClaveDePieza, type ItemDeDiseno } from '../../../../entities/diseno'
import { columnasParaAtajos } from '../../../../entities/diseno/edicion-de-items'
import { CamposDelAspectoDelItem } from '../aspecto'
import { errorDelAspecto, type ApoyoDelInspector } from './apoyo-del-inspector'

type Props = {
  seccion: string
  item: Extract<ItemDeDiseno, { tipo: 'atajos' }>
  apoyo: ApoyoDelInspector
}

export const AYUDA_DE_LOS_ATAJOS =
  'Chips con las primeras filas de la tabla; ponen su valor en la celda.'

// Los atajos elegidos: chips con las primeras filas de la tabla de un nodo que ponen su valor en la celda. Se elige la columna y cuántos chips, y su aspecto.
export function InspectorDeAtajos({ seccion, item, apoyo }: Props) {
  const { editor, ediciones } = apoyo
  const clave: ClaveDePieza = { tipo: 'atajos', nodo: item.nodo, seccion }
  const base = `${seccion}__${item.nodo}-atajos`
  const columnas = columnasParaAtajos(editor.nodos, item.nodo, item.columna)
  return (
    <div className="grid min-w-0 gap-3">
      <div className="grid min-w-0 gap-2 @md:grid-cols-2">
        <CampoSeleccion
          nombre={`${base}-columna`}
          etiqueta="Columna de los chips"
          opciones={columnas.map((valor) => ({ valor, etiqueta: valor }))}
          value={item.columna}
          disabled={editor.ocupado}
          onChange={(evento) => {
            ediciones.ponerAtajos(seccion, item.nodo, { columna: evento.target.value })
          }}
        />
        <Campo
          nombre={`${base}-filas`}
          etiqueta={`Cuántos chips (1 a ${String(MAXIMO_DE_ATAJOS)})`}
          type="number"
          inputMode="numeric"
          min={1}
          max={MAXIMO_DE_ATAJOS}
          value={item.filas}
          disabled={editor.ocupado}
          ayuda={AYUDA_DE_LOS_ATAJOS}
          onChange={(evento) => {
            ediciones.ponerAtajos(seccion, item.nodo, { filas: evento.target.valueAsNumber })
          }}
        />
      </div>
      <CamposDelAspectoDelItem
        base={base}
        item={item}
        ocupado={editor.ocupado}
        error={errorDelAspecto(editor, { pieza: 'item', clave })}
        alPoner={(cambios) => {
          ediciones.ponerAspectoDeItem(clave, cambios)
        }}
      />
    </div>
  )
}
