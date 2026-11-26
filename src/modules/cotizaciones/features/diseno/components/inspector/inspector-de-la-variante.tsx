'use client'

import type { ClaveDePieza, ItemDeDiseno } from '../../../../entities/diseno'
import type { Nodo } from '../../../../entities/nodos'
import { piezaDelItemDeLaHoja } from '../../../../entities/diseno/pieza-de-la-hoja'
import { CamposDelAspectoDelItem } from '../aspecto'
import { errorDelAspecto, lugarEnElInspector, type ApoyoDelInspector } from './apoyo-del-inspector'
import { CamposDelNodo } from './campos-del-nodo'

const MAXIMO_DE_OPCIONES_A_LA_VISTA = 4

export const TEXTO_DEL_SUBTOTAL = 'Se dibuja como una franja con el total de lo que suma.'

export function textoDeLaVariante(nodo: Nodo | undefined) {
  const opciones = nodo?.tipo === 'opcion' ? nodo.opciones.map((o) => o.etiqueta) : []
  const vistas = opciones.slice(0, MAXIMO_DE_OPCIONES_A_LA_VISTA).join(', ')
  const resto = opciones.length - MAXIMO_DE_OPCIONES_A_LA_VISTA
  const lista = resto > 0 ? `${vistas} y ${String(resto)} más` : vistas
  return `Se elige con chips: ${lista}. La hoja siempre la pide.`
}

type Props = {
  seccion: string
  item: Extract<ItemDeDiseno, { tipo: 'variante' | 'subtotal' }>
  apoyo: ApoyoDelInspector
}

// La variante o la franja de subtotal elegida: el rótulo de su fila (y el formato, sólo el subtotal: la variante muestra chips), qué es y su aspecto. Cambiarles
// el nodo es mover estructura: se quitan y se suman.
export function InspectorDeLaVariante({ seccion, item, apoyo }: Props) {
  const { editor, ediciones } = apoyo
  const clave: ClaveDePieza = { tipo: item.tipo, nodo: item.nodo, seccion }
  const base = `${seccion}__${item.nodo}`
  const error = errorDelAspecto(editor, { pieza: 'item', clave })
  const nodo = editor.definicion.nodos.find((n) => n.id === item.nodo)
  return (
    <div className="grid min-w-0 gap-3">
      {nodo === undefined ? null : (
        <CamposDelNodo
          key={`${nodo.id}:${nodo.etiqueta}`}
          nodo={nodo}
          conFormato={item.tipo === 'subtotal'}
          ocupado={editor.ocupado}
          alPonerEtiqueta={(texto) => {
            editor.ponerEtiqueta(nodo.id, texto)
          }}
          alPonerFormato={(formato) => {
            editor.ponerFormato(nodo.id, formato)
          }}
        />
      )}
      <p className="text-(length:--text-sm) text-(--color-ink-soft)">
        {item.tipo === 'variante' ? textoDeLaVariante(nodo) : TEXTO_DEL_SUBTOTAL}
      </p>
      <CamposDelAspectoDelItem
        base={base}
        item={item}
        lugar={lugarEnElInspector(apoyo, piezaDelItemDeLaHoja(item), base, error)}
        ocupado={editor.ocupado}
        alPoner={(cambios) => {
          ediciones.ponerAspectoDeItem(clave, cambios)
        }}
      />
    </div>
  )
}
