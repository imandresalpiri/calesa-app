'use client'

import { PencilIcon, Trash2Icon, Undo2Icon } from 'lucide-react'
import { Button } from '@/shared/ui/button'

// En qué está la fila: a la vista (✎ y 🗑), abierta («Listo» y «Cancelar») o quitada hasta guardar («Volver»).
export type ModoDeLaFila = 'vista' | 'abierta' | 'quitada'

type Props = {
  modo: ModoDeLaFila
  // El lugar de la fila (desde 1), ya escrito con el locale: el nombre de sus botones.
  lugar: string
  // Su ✎ se pulsó y la tabla viva se está leyendo.
  abriendo: boolean
  // Otra lectura o un guardado en curso: nada se toca.
  apagadas: boolean
  alEditar: () => void
  alQuitar: () => void
  alListo: () => void
  alCancelar: () => void
  alVolver: () => void
}

const ICONO = 'min-h-11 min-w-11 md:min-h-8 md:min-w-8'

// Las acciones de una fila de la tabla de la ayuda, en su última columna.
export function AccionesDeLaFila(props: Props) {
  const { modo, lugar, abriendo, apagadas } = props
  if (modo === 'abierta') {
    return (
      <div className="flex flex-wrap gap-1">
        <Button type="button" className="min-h-11 md:min-h-8" onClick={props.alListo}>
          Listo
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="min-h-11 md:min-h-8"
          onClick={props.alCancelar}
        >
          Cancelar
        </Button>
      </div>
    )
  }
  if (modo === 'quitada') {
    return (
      <Button
        type="button"
        variant="ghost"
        className="min-h-11 md:min-h-8"
        aria-label={`Volver la fila ${lugar}`}
        disabled={apagadas}
        onClick={props.alVolver}
      >
        <Undo2Icon aria-hidden />
        Volver
      </Button>
    )
  }
  return (
    <div className="flex gap-1">
      <Button
        type="button"
        variant="ghost"
        size={abriendo ? 'default' : 'icon'}
        className={ICONO}
        aria-label={abriendo ? undefined : `Editar la fila ${lugar}`}
        disabled={apagadas || abriendo}
        onClick={props.alEditar}
      >
        {abriendo ? 'Abriendo…' : <PencilIcon aria-hidden />}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={ICONO}
        aria-label={`Quitar la fila ${lugar}`}
        disabled={apagadas || abriendo}
        onClick={props.alQuitar}
      >
        <Trash2Icon aria-hidden />
      </Button>
    </div>
  )
}
