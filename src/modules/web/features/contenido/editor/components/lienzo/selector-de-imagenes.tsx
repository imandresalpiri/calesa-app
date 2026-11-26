'use client'

import type { Editor } from '@tiptap/react'
import { forwardRef } from 'react'
import { MAXIMO_DE_IMAGENES_DE_LA_GALERIA } from '../../../../../entities/contenido/doc'
import { insertarBloque } from '../../bloques/comandos'
import { nuevoGrupoDeSubidas } from '../../bloques/subidas.client'
import { subirAlBloqueNuevo } from '../../bloques/subir-a-la-guia.client'

type Props = { editor: Editor | null; clave: () => 'imagen' | 'galeria' }

// El selector de archivos oculto que abren «Imagen» y «Galería» del menú: con lo elegido inserta el bloque y empieza a subir.
export const SelectorDeImagenes = forwardRef<HTMLInputElement, Props>(function SelectorDeImagenes(
  { editor, clave },
  ref,
) {
  return (
    <input
      ref={ref}
      type="file"
      accept="image/*"
      multiple
      className="sr-only"
      tabIndex={-1}
      aria-label="Elegir imágenes"
      onChange={(evento) => {
        const archivos = Array.from(evento.target.files ?? []).slice(
          0,
          MAXIMO_DE_IMAGENES_DE_LA_GALERIA,
        )
        evento.target.value = ''
        if (editor && archivos.length > 0) {
          const grupo = nuevoGrupoDeSubidas()
          insertarBloque(editor, clave(), { grupo, archivos })
          subirAlBloqueNuevo(editor, clave(), grupo, archivos)
        }
      }}
    />
  )
})
