'use client'

import type { Editor } from '@tiptap/react'
import { useId } from 'react'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { MAXIMO_DEL_TEXTO_DEL_BOTON, motivoDelBloque } from '../../../../../entities/contenido/doc'
import { cambiarAtributos } from '../../bloques/comandos'
import type { BloqueElegido } from '../../hooks/use-bloque-elegido'

type Props = { editor: Editor; bloque: BloqueElegido; deshabilitado: boolean }

const texto = (valor: unknown): string => (typeof valor === 'string' ? valor : '')

// El texto del botón (hasta 60) y su enlace (http, https, mailto o tel).
export function OpcionesDelBoton({ editor, bloque, deshabilitado }: Props) {
  const id = useId()
  const textoDelBoton = texto(bloque.atributos['texto'])
  const href = texto(bloque.atributos['href'])
  const motivo = motivoDelBloque({ type: 'button', attrs: { texto: textoDelBoton, href } })
  return (
    <div className="grid gap-3">
      <div className="grid gap-1.5">
        <Label htmlFor={`${id}-texto`}>Texto del botón</Label>
        <Input
          id={`${id}-texto`}
          value={textoDelBoton}
          maxLength={MAXIMO_DEL_TEXTO_DEL_BOTON}
          autoComplete="off"
          disabled={deshabilitado}
          className="min-h-11"
          onChange={(evento) => {
            cambiarAtributos(editor, bloque.indice, { texto: evento.target.value })
          }}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${id}-enlace`}>Enlace</Label>
        <Input
          id={`${id}-enlace`}
          type="url"
          inputMode="url"
          value={href}
          placeholder="https://"
          autoComplete="off"
          disabled={deshabilitado}
          aria-invalid={motivo !== null || undefined}
          aria-describedby={motivo ? `${id}-motivo` : undefined}
          className="min-h-11"
          onChange={(evento) => {
            cambiarAtributos(editor, bloque.indice, { href: evento.target.value })
          }}
        />
      </div>
      {motivo ? (
        <p
          id={`${id}-motivo`}
          role="alert"
          className="text-(length:--text-sm) text-(--color-peligro-ink)"
        >
          {motivo}
        </p>
      ) : null}
    </div>
  )
}
