'use client'

import { useLayoutEffect, useRef } from 'react'
import type { EdicionDeLaCelda } from '../../../hooks/use-edicion-con-referencias'
import { alTeclearEnLaEdicion, type AccionesDeLaEdicion } from '../teclas-de-la-edicion'

type Props = {
  edicion: EdicionDeLaCelda
  // «C5, Remate, valor».
  nombre: string
  // La lista de sugerencias y la elegida (para el lector), y el error bajo la barra.
  idDeLaLista: string | null
  idDeLaElegida: string | null
  idDelError: string | null
  alEscribir: (texto: string, cursor: number) => void
  alUbicar: (cursor: number) => void
  teclas: AccionesDeLaEdicion
}

// La entrada de la celda que se escribe: el mismo texto que la barra de fórmula. Toma el foco al abrirse en la celda (con lo escrito elegido en una fila nueva) y
// sigue el cursor de la edición (un clic que inserta una referencia lo mueve).
export function EntradaDeLaCelda(p: Props) {
  const { edicion } = p
  const campo = useRef<HTMLInputElement>(null)
  const enLaCelda = edicion.en === 'celda'
  useLayoutEffect(() => {
    const c = campo.current
    if (c === null || !enLaCelda) return
    c.focus()
    if (edicion.elegirTodo) c.select()
  }, [enLaCelda, edicion.elegirTodo])
  useLayoutEffect(() => {
    const c = campo.current
    if (c === null || !enLaCelda || edicion.elegirTodo) return
    if (c.selectionStart === c.selectionEnd && c.selectionStart !== edicion.cursor)
      c.setSelectionRange(edicion.cursor, edicion.cursor)
  }, [edicion.texto, edicion.cursor, edicion.elegirTodo, enLaCelda])
  return (
    <input
      ref={campo}
      type="text"
      autoComplete="off"
      spellCheck={false}
      aria-label={p.nombre}
      aria-invalid={edicion.error === null ? undefined : true}
      aria-describedby={p.idDelError ?? undefined}
      aria-autocomplete="list"
      aria-controls={p.idDeLaLista ?? undefined}
      aria-expanded={p.idDeLaLista !== null}
      aria-activedescendant={p.idDeLaElegida ?? undefined}
      role="combobox"
      className="block min-h-[44px] w-full min-w-0 bg-(--color-surface) px-2 text-(--color-ink) outline-2 -outline-offset-2 outline-(--color-primario-ink) md:pointer-fine:min-h-8"
      value={edicion.texto}
      onChange={(e) => {
        p.alEscribir(e.target.value, e.target.selectionStart ?? e.target.value.length)
      }}
      onSelect={(e) => {
        p.alUbicar(e.currentTarget.selectionStart ?? 0)
      }}
      onFocus={(e) => {
        p.alUbicar(e.currentTarget.selectionStart ?? 0)
      }}
      onKeyDown={(e) => {
        alTeclearEnLaEdicion(e, p.teclas)
      }}
    />
  )
}
