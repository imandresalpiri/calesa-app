'use client'

import type { Editor } from '@tiptap/react'
import { PlusIcon } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import type { Caja } from '../../hooks/use-caja-del-bloque'

const LADO = 44

// El «+» al final del párrafo vacío donde está el cursor: escribe «/» ahí, que abre el menú de bloques. Flota: no empuja el texto.
export function InsertadorDeBloques({
  editor,
  caja,
  deshabilitado,
}: {
  editor: Editor
  caja: Caja
  deshabilitado: boolean
}) {
  return (
    <Button
      type="button"
      size="icon"
      variant="outline"
      aria-label="Agregar un bloque"
      title="Agregar un bloque"
      disabled={deshabilitado}
      className="absolute z-10 size-11 rounded-full"
      style={{
        top: caja.top + Math.max(0, (caja.height - LADO) / 2),
        left: Math.max(0, caja.left + caja.width - LADO),
      }}
      // Que el editor no pierda el cursor al tocar el botón.
      onMouseDown={(evento) => {
        evento.preventDefault()
      }}
      onClick={() => {
        editor.chain().focus().insertContent('/').run()
      }}
    >
      <PlusIcon aria-hidden />
    </Button>
  )
}
