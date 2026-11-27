'use client'

import type { Editor } from '@tiptap/react'
import { Textarea } from '@/shared/ui/textarea'
import { MAXIMO_DEL_TITULO_DE_GUIA } from '../../../../entities/contenido/guias'

type Props = {
  valor: string
  alCambiar: (titulo: string) => void
  editor: Editor | null
  error: string | undefined
  deshabilitado: boolean
}

// El título de la guía, grande y sin etiqueta visible (su nombre es «Título»), como encabezado del artículo. Enter pasa al texto; no admite saltos.
export function TituloDeLaGuia({ valor, alCambiar, editor, error, deshabilitado }: Props) {
  return (
    // El `pb-10` deja bajo el título el sitio de la barrita del primer bloque, que flota encima de él: sin esto taparía el título.
    <div className="grid gap-1 pb-10">
      <Textarea
        aria-label="Título"
        name="titulo"
        rows={1}
        maxLength={MAXIMO_DEL_TITULO_DE_GUIA}
        placeholder="Título de la guía"
        autoComplete="off"
        disabled={deshabilitado}
        value={valor}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? 'error-del-titulo' : undefined}
        className="min-h-0 resize-none rounded-none border-0 bg-transparent px-0 py-1 text-(length:--text-2xl) leading-tight font-semibold break-words shadow-none focus-visible:ring-0 md:text-(length:--text-2xl)"
        onChange={(evento) => {
          alCambiar(evento.target.value.replace(/\s*\n\s*/g, ' '))
        }}
        onKeyDown={(evento) => {
          if (evento.key === 'Enter' && !evento.shiftKey) {
            evento.preventDefault()
            editor?.commands.focus('start')
          }
        }}
      />
      {error ? (
        <p
          id="error-del-titulo"
          role="alert"
          className="text-(length:--text-sm) text-(--color-peligro-ink)"
        >
          {error}
        </p>
      ) : null}
    </div>
  )
}
