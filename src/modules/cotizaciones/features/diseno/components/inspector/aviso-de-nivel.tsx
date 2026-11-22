'use client'

import { XIcon } from 'lucide-react'
import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import { mismaPieza, type PiezaDeLaHoja } from '../../../../entities/diseno/pieza-de-la-hoja'
import type { EditorDelDiseno } from '../../hooks/use-editor-del-diseno'

// «Ahora la ve «Costos»: antes la veían todos.»: lo que el inspector dice de la pieza elegida que se movió a una sección con otro nivel efectivo, hasta el
// próximo movimiento o hasta cerrarlo.
export function AvisoDeNivel({
  editor,
  elegida,
}: {
  editor: EditorDelDiseno
  elegida: PiezaDeLaHoja
}) {
  const { aviso, cerrar } = editor.aviso
  if (aviso === null || !mismaPieza(aviso.pieza, elegida)) return null
  return (
    <div data-aviso-de-nivel="" className="flex min-w-0 items-start gap-1">
      <Aviso tono="aviso" className="min-w-0 flex-1">
        {aviso.texto}
      </Aviso>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Cerrar el aviso"
        onClick={cerrar}
      >
        <XIcon aria-hidden />
      </Button>
    </div>
  )
}
