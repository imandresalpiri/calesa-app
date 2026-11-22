'use client'

import { useMemo } from 'react'
import { Button } from '@/shared/ui/button'
import {
  hayLugarParaOtraPieza,
  MOTIVO_DEL_TOPE_DE_PIEZAS,
} from '../../../../entities/diseno/insercion-del-diseno'
import { ETIQUETAS_PARA_SUMAR } from '../../../../entities/diseno/ofertas-para-sumar'
import { filasSinLugar, type FilaSinLugar } from '../../../../entities/diseno/sin-lugar'
import type { EditorDelDiseno } from '../../hooks/use-editor-del-diseno'

export const tituloSinLugar = (n: number) => `Sin lugar en la hoja (${String(n)})`
export const TEXTO_SIN_LUGAR =
  'Filas de la fórmula que la hoja tiene que dibujar y todavía no tienen pieza: sin ellas no se publica. «Agregar» la suma al final de la primera sección principal.'

// Las filas sin lugar del diseño de trabajo (`filasSinLugar()`), en el orden de la fórmula.
export function useFilasSinLugar(editor: EditorDelDiseno) {
  const { definicion, trabajo } = editor
  return useMemo(() => filasSinLugar(definicion, trabajo), [definicion, trabajo])
}

type Props = {
  filas: readonly FilaSinLugar[]
  editor: EditorDelDiseno
  alAgregar: (fila: FilaSinLugar) => void
}

// Lo que el inspector lista sin nada elegido: «Sin lugar en la hoja (N)», cada fila con la pieza que la dibuja y «Agregar» (apagado en el tope de piezas).
export function SinLugarEnLaHoja({ filas, editor, alAgregar }: Props) {
  if (filas.length === 0) return null
  const hayLugar = hayLugarParaOtraPieza(editor.trabajo)
  return (
    <section
      data-sin-lugar=""
      aria-labelledby="sin-lugar-en-la-hoja"
      className="grid min-w-0 gap-2"
    >
      <h3
        id="sin-lugar-en-la-hoja"
        className="text-(length:--text-base) font-medium text-(--color-ink)"
      >
        {tituloSinLugar(filas.length)}
      </h3>
      <p className="text-(length:--text-sm) text-(--color-ink-soft)">
        {hayLugar ? TEXTO_SIN_LUGAR : MOTIVO_DEL_TOPE_DE_PIEZAS}
      </p>
      <ul className="grid grid-cols-[minmax(0,1fr)] gap-1">
        {filas.map((fila) => (
          <li
            key={fila.nodo}
            data-fila-sin-lugar={fila.nodo}
            className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-(--radius-md) border border-(--color-line) px-3 py-2"
          >
            <span className="min-w-0 break-words">
              <span className="block text-(length:--text-sm) text-(--color-ink)">
                {fila.etiqueta}
              </span>
              <span className="block text-(length:--text-xs) text-(--color-ink-soft)">
                {ETIQUETAS_PARA_SUMAR[fila.tipo]}
              </span>
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label={`Agregar «${fila.etiqueta}»`}
              disabled={editor.ocupado || !hayLugar}
              onClick={() => {
                alAgregar(fila)
              }}
            >
              Agregar
            </Button>
          </li>
        ))}
      </ul>
    </section>
  )
}
