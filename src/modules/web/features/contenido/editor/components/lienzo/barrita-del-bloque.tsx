'use client'

import { useEditorState, type Editor } from '@tiptap/react'
import { useState } from 'react'
import type { Caja } from '../../hooks/use-caja-del-bloque'
import { TIPOS_DE_TEXTO, type BloqueElegido } from '../../hooks/use-bloque-elegido'
import { BotonDeFormato, moverEnLaBarra } from '../boton-de-formato'
import { enlaceActual, PanelDelEnlace } from '../panel-del-enlace'
import { accionesDeLaBarrita } from './acciones-de-la-barrita'

type Props = {
  editor: Editor
  bloque: BloqueElegido
  caja: Caja
  deshabilitado: boolean
  alAbrirOpciones: () => void
}

const ALTO_DE_LA_BARRITA = 44

// La barrita que flota sobre el bloque elegido: subirlo, bajarlo, sus opciones, quitarlo y, si es texto, negrita, cursiva y enlace. Flota (absoluta):
// no empuja el texto. Alt+F10 entra a ella desde el texto; Escape vuelve.
export function BarritaDelBloque({ editor, bloque, caja, deshabilitado, alAbrirOpciones }: Props) {
  const [parada, setParada] = useState(0)
  const [enlazando, setEnlazando] = useState(false)
  const formato = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      negrita: e.isActive('bold'),
      cursiva: e.isActive('italic'),
      enlace: enlaceActual(e) !== null,
    }),
  })
  const acciones = accionesDeLaBarrita({
    editor,
    bloque,
    formato,
    enlazando,
    alternarEnlace: () => {
      setEnlazando((antes) => !antes)
    },
    alAbrirOpciones,
  })
  const top = Math.max(caja.top - ALTO_DE_LA_BARRITA - 4, -ALTO_DE_LA_BARRITA)

  return (
    <div className="absolute z-20 grid gap-1" style={{ top, left: caja.left }}>
      <div
        role="toolbar"
        aria-label="Bloque"
        aria-orientation="horizontal"
        data-barrita-del-bloque
        className="flex w-fit max-w-full gap-0.5 rounded-(--radius-md) border border-(--color-line) bg-(--color-surface) p-0.5 shadow-md"
        onKeyDown={(evento) => {
          if (evento.key === 'Escape') {
            evento.preventDefault()
            editor.commands.focus()
            return
          }
          moverEnLaBarra(evento)
        }}
      >
        {acciones.map((accion, n) => (
          <BotonDeFormato
            key={accion.etiqueta}
            etiqueta={accion.etiqueta}
            Icono={accion.Icono}
            alternable={accion.alternable}
            activo={accion.activa}
            deshabilitado={deshabilitado || accion.apagada}
            parada={parada === n}
            alEnfocar={() => {
              setParada(n)
            }}
            alPulsar={accion.aplicar}
          />
        ))}
      </div>
      {enlazando && TIPOS_DE_TEXTO.includes(bloque.tipo) ? (
        <div className="w-80 max-w-[calc(100vw-2rem)] rounded-(--radius-md) border border-(--color-line) bg-(--color-surface) shadow-md">
          <PanelDelEnlace
            editor={editor}
            cerrar={() => {
              setEnlazando(false)
            }}
          />
        </div>
      ) : null}
    </div>
  )
}
