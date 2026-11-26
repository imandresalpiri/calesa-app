'use client'

import type { Editor } from '@tiptap/react'
import { LienzoDeLaGuia } from '../../editor/components/lienzo/lienzo-de-la-guia'
import { AvisosDeLaGuia } from './avisos-de-la-guia'
import { TituloDeLaGuia } from './titulo-de-la-guia'

type Props = {
  titulo: string
  alCambiarTitulo: (titulo: string) => void
  errorDelTitulo: string | undefined
  editor: Editor | null
  deshabilitado: boolean
  etiquetaId: string
  // Por qué el cuerpo no vale (lo dice la misma regla que la base) y el id del texto que lo muestra.
  errorDelCuerpo: string | undefined
  idDelErrorDelCuerpo: string
  conflicto: string | null
  alRecargar: () => void
  enLinea: boolean
  alAbrirOpciones: () => void
}

// El artículo: el título grande y el texto como lienzo de bloques, centrados. Arriba queda un hueco para los avisos (flotan sobre él).
export function ArticuloDeLaGuia(props: Props) {
  return (
    <div className="relative min-w-0">
      <AvisosDeLaGuia
        conflicto={props.conflicto}
        alRecargar={props.alRecargar}
        enLinea={props.enLinea}
      />
      <article className="mx-auto grid w-full max-w-3xl gap-4 px-4 pt-20 pb-24">
        <TituloDeLaGuia
          valor={props.titulo}
          alCambiar={props.alCambiarTitulo}
          editor={props.editor}
          error={props.errorDelTitulo}
          deshabilitado={props.deshabilitado}
        />
        <p id={props.etiquetaId} className="sr-only">
          Texto de la guía
        </p>
        <LienzoDeLaGuia
          editor={props.editor}
          deshabilitado={props.deshabilitado}
          alAbrirOpciones={props.alAbrirOpciones}
        />
        {props.errorDelCuerpo ? (
          <p
            id={props.idDelErrorDelCuerpo}
            role="alert"
            className="text-(length:--text-sm) text-(--color-peligro-ink)"
          >
            {props.errorDelCuerpo}
          </p>
        ) : null}
      </article>
    </div>
  )
}
