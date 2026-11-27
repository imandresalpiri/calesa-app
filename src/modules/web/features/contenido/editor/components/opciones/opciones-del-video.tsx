'use client'

import type { Editor } from '@tiptap/react'
import { useId } from 'react'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { motivoDelBloque } from '../../../../../entities/contenido/doc'
import { enlaceDeVideo } from '../../../../../entities/contenido/video'
import { cambiarAtributos } from '../../bloques/comandos'
import type { BloqueElegido } from '../../hooks/use-bloque-elegido'

type Props = { editor: Editor; bloque: BloqueElegido; deshabilitado: boolean }

// El enlace del video: se pega el de YouTube o Vimeo (el de compartir, el del navegador o el de incrustar) y queda en su forma canónica. Lo que no
// es de esos dos sitios se deja escrito, con su motivo, para corregirlo.
export function OpcionesDelVideo({ editor, bloque, deshabilitado }: Props) {
  const id = useId()
  const url = typeof bloque.atributos['url'] === 'string' ? bloque.atributos['url'] : ''
  const motivo = url === '' ? null : motivoDelBloque({ type: 'video', attrs: { url } })
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>Enlace del video</Label>
      <Input
        id={id}
        type="url"
        inputMode="url"
        value={url}
        placeholder="https://www.youtube.com/watch?v=…"
        autoComplete="off"
        disabled={deshabilitado}
        aria-invalid={motivo !== null || undefined}
        aria-describedby={`${id}-ayuda`}
        className="min-h-11"
        onChange={(evento) => {
          const enlace = enlaceDeVideo(evento.target.value)
          cambiarAtributos(editor, bloque.indice, {
            url: enlace ? enlace.url : evento.target.value,
          })
        }}
      />
      <p
        id={`${id}-ayuda`}
        role={motivo ? 'alert' : undefined}
        className={`text-(length:--text-sm) ${motivo ? 'text-(--color-peligro-ink)' : 'text-(--color-ink-soft)'}`}
      >
        {motivo ?? 'Pega un enlace de YouTube o Vimeo.'}
      </p>
    </div>
  )
}
