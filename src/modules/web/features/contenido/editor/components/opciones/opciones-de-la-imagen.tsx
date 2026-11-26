'use client'

import type { Editor } from '@tiptap/react'
import { useId, useRef } from 'react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { MAXIMO_DEL_ALT } from '../../../../../entities/contenido/doc'
import { cambiarAtributos } from '../../bloques/comandos'
import { reemplazarLaImagen } from '../../bloques/subir-a-la-guia.client'
import {
  reintentarSubida,
  descartarSubida,
  usePendientes,
  type Pendiente,
} from '../../bloques/subidas.client'
import { ponerRutaDeLaSubida } from '../../bloques/comandos'
import { textoDelBloque, type BloqueElegido } from '../../hooks/use-bloque-elegido'

type Props = { editor: Editor; bloque: BloqueElegido; deshabilitado: boolean }

// La descripción de la imagen (la lee quien no la ve) y cambiarla por otra.
function FalloDeLaSubida({
  editor,
  grupo,
  pendiente,
}: {
  editor: Editor
  grupo: string
  pendiente: Pendiente
}) {
  return (
    <div role="alert" className="grid gap-2 text-(length:--text-sm) text-(--color-peligro-ink)">
      <p>{pendiente.mensaje ?? 'No se pudo subir la imagen.'}</p>
      <span className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            reintentarSubida(grupo, pendiente.id, (ruta) => {
              ponerRutaDeLaSubida(editor, grupo, ruta)
            })
          }}
        >
          Reintentar
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => {
            descartarSubida(grupo, pendiente.id)
          }}
        >
          Descartar
        </Button>
      </span>
    </div>
  )
}

export function OpcionesDeLaImagen({ editor, bloque, deshabilitado }: Props) {
  const id = useId()
  const selector = useRef<HTMLInputElement>(null)
  const alt = textoDelBloque(bloque, 'alt')
  const grupo = textoDelBloque(bloque, 'subida') || null
  const pendiente = usePendientes(grupo)[0]
  const conRuta = textoDelBloque(bloque, 'ruta') !== ''
  return (
    <div className="grid gap-3">
      <div className="grid gap-1.5">
        <Label htmlFor={id}>Describe la imagen</Label>
        <Input
          id={id}
          value={alt}
          maxLength={MAXIMO_DEL_ALT}
          autoComplete="off"
          disabled={deshabilitado || !conRuta}
          className="min-h-11"
          onChange={(evento) => {
            cambiarAtributos(editor, bloque.indice, { alt: evento.target.value })
          }}
        />
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          Lo lee quien no ve la imagen.
        </p>
      </div>
      {conRuta ? (
        <Button
          type="button"
          variant="outline"
          className="min-h-11 w-fit"
          disabled={deshabilitado || pendiente?.estado === 'subiendo'}
          onClick={() => selector.current?.click()}
        >
          {pendiente?.estado === 'subiendo' ? 'Subiendo la imagen…' : 'Cambiar la imagen'}
        </Button>
      ) : null}
      {conRuta && pendiente?.estado === 'error' && grupo ? (
        <FalloDeLaSubida editor={editor} grupo={grupo} pendiente={pendiente} />
      ) : null}
      <input
        ref={selector}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        aria-label="Elegir otra imagen"
        onChange={(evento) => {
          const archivo = evento.target.files?.[0]
          evento.target.value = ''
          if (archivo) {
            reemplazarLaImagen(editor, bloque.indice, archivo)
          }
        }}
      />
    </div>
  )
}
