'use client'

// «Alinear» del inspector del editor de artes: las seis alineaciones y las dos distribuciones, siempre a la vista. Con una unidad (una capa o
// un grupo entero) se alinea con el documento; con varias, entre sí (con la caja que las encierra); distribuir pide tres. Lo bloqueado no se
// mueve. La línea de abajo dice por qué algo está apagado y ocupa siempre su lugar.
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignHorizontalDistributeCenter,
  AlignStartHorizontal,
  AlignStartVertical,
  AlignVerticalDistributeCenter,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { ConTooltip } from '@/shared/ui/tooltip'
import type { Alineacion } from '../../../../entities/editor/alinear'
import { UNIDADES_PARA_DISTRIBUIR } from '../../../../entities/editor/inspector'
import type { EditorDeArte } from '../../tipos'
import { SeccionDelInspector } from './seccion-del-inspector'

type Boton<Que> = { que: Que; etiqueta: string; icono: LucideIcon }

const ALINEACIONES: readonly Boton<Alineacion>[] = [
  { que: 'izquierda', etiqueta: 'Alinear a la izquierda', icono: AlignStartVertical },
  { que: 'centro', etiqueta: 'Centrar en horizontal', icono: AlignCenterVertical },
  { que: 'derecha', etiqueta: 'Alinear a la derecha', icono: AlignEndVertical },
  { que: 'arriba', etiqueta: 'Alinear arriba', icono: AlignStartHorizontal },
  { que: 'medio', etiqueta: 'Centrar en vertical', icono: AlignCenterHorizontal },
  { que: 'abajo', etiqueta: 'Alinear abajo', icono: AlignEndHorizontal },
]

const DISTRIBUCIONES: readonly Boton<'horizontal' | 'vertical'>[] = [
  {
    que: 'horizontal',
    etiqueta: 'Distribuir en horizontal',
    icono: AlignHorizontalDistributeCenter,
  },
  { que: 'vertical', etiqueta: 'Distribuir en vertical', icono: AlignVerticalDistributeCenter },
]

const MOTIVO_BLOQUEADO = 'Lo bloqueado no se mueve.'
const MOTIVO_PARA_DISTRIBUIR = `Para distribuir, elige ${String(UNIDADES_PARA_DISTRIBUIR)} o más.`

// Por qué algo está apagado; vacío si todo se puede.
function motivoDe(unidades: number, soloLectura: boolean): string {
  if (soloLectura) {
    return ''
  }
  if (unidades === 0) {
    return MOTIVO_BLOQUEADO
  }
  return unidades < UNIDADES_PARA_DISTRIBUIR ? MOTIVO_PARA_DISTRIBUIR : ''
}

type Props = {
  editor: EditorDeArte
  // Las que se mueven: un grupo entero cuenta como una y lo bloqueado no cuenta (`unidadesQueSeMueven`).
  unidades: number
}

export function SeccionAlinear({ editor, unidades }: Props) {
  const sinAlinear = editor.soloLectura || unidades === 0
  const sinDistribuir = editor.soloLectura || unidades < UNIDADES_PARA_DISTRIBUIR
  const boton = <Que,>(b: Boton<Que>, apagado: boolean, hacer: (que: Que) => void) => {
    const Icono = b.icono
    return (
      <ConTooltip key={String(b.que)} texto={b.etiqueta}>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={b.etiqueta}
          disabled={apagado}
          onClick={() => {
            hacer(b.que)
          }}
        >
          <Icono aria-hidden="true" />
        </Button>
      </ConTooltip>
    )
  }
  return (
    <SeccionDelInspector titulo="Alinear" detalle={unidades === 1 ? 'Con el documento' : null}>
      <div className="flex items-center gap-0.5">
        {ALINEACIONES.map((b) =>
          boton(b, sinAlinear, (como) => {
            editor.despachar({ tipo: 'alinear', como, medidas: editor.medidas })
          }),
        )}
        <span aria-hidden="true" className="mx-1 h-5 w-px bg-(--color-line)" />
        {DISTRIBUCIONES.map((b) =>
          boton(b, sinDistribuir, (eje) => {
            editor.despachar({ tipo: 'distribuir', eje })
          }),
        )}
      </div>
      <p className="-mt-1 min-h-4 text-(length:--text-xs) leading-4 text-(--color-ink-faint)">
        {motivoDe(unidades, editor.soloLectura)}
      </p>
    </SeccionDelInspector>
  )
}
