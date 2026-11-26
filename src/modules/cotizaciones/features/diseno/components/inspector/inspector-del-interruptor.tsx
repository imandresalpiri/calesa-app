'use client'

import { CampoSeleccion } from '@/shared/ui/campo-seleccion'
import {
  EFECTOS_DE_INTERRUPTOR,
  type ClaveDePieza,
  type ItemDeDiseno,
} from '../../../../entities/diseno'
import { piezaDelItemDeLaHoja } from '../../../../entities/diseno/pieza-de-la-hoja'
import { CamposDelAspectoDelItem } from '../aspecto'
import { errorDelAspecto, lugarEnElInspector, type ApoyoDelInspector } from './apoyo-del-inspector'

type Efecto = (typeof EFECTOS_DE_INTERRUPTOR)[number]

const EFECTO: Record<Efecto, { etiqueta: string; ayuda: string }> = {
  habilita: { etiqueta: 'Habilita', ayuda: 'Apagado, deshabilita lo que condiciona.' },
  muestra: { etiqueta: 'Muestra', ayuda: 'Apagado, no dibuja lo que condiciona.' },
}

type Props = {
  seccion: string
  item: Extract<ItemDeDiseno, { tipo: 'interruptor' }>
  apoyo: ApoyoDelInspector
}

// El interruptor elegido: una bandera de la fórmula que quien cotiza enciende o apaga. Se elige qué hace apagado (si no vale, lo dice el aviso) y su aspecto.
export function InspectorDelInterruptor({ seccion, item, apoyo }: Props) {
  const { editor, ediciones } = apoyo
  const clave: ClaveDePieza = { tipo: 'interruptor', nodo: item.nodo, seccion }
  const base = `${seccion}__${item.nodo}`
  const error = errorDelAspecto(editor, { pieza: 'item', clave })
  return (
    <div className="grid min-w-0 gap-3">
      <CampoSeleccion
        nombre={`${base}-efecto`}
        etiqueta="Qué hace"
        opciones={EFECTOS_DE_INTERRUPTOR.map((valor) => ({
          valor,
          etiqueta: EFECTO[valor].etiqueta,
        }))}
        value={item.efecto}
        disabled={editor.ocupado}
        ayuda={EFECTO[item.efecto].ayuda}
        onChange={(evento) => {
          ediciones.ponerEfecto(seccion, item.nodo, evento.target.value as Efecto)
        }}
      />
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
