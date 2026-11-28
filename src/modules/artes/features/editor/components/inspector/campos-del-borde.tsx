'use client'

// El borde de una capa en el inspector del editor de artes (en un texto, su contorno): el color y el grosor, uno al lado del otro. Si se puede
// quitar, su interruptor lo pone (con un grosor que se vea) o lo quita; sin borde, el grosor queda apagado. El de una línea siempre está.
import type { CapaDeArte } from '../../../../entities/documento'
import {
  COLOR_DEL_BORDE_NUEVO,
  conBorde,
  LIMITES_DEL_INSPECTOR,
} from '../../../../entities/editor/inspector'
import type { EditorDeArte } from '../../tipos'
import { CampoDeColor } from './campo-de-color'
import { CampoNumerico } from './campo-numerico'
import { cambiarLasCapas } from './cambiar-las-capas'

type Props = {
  editor: EditorDeArte
  capa: CapaDeArte
  etiqueta: 'Borde' | 'Contorno'
  // Falso en la línea: su borde es lo que dibuja.
  opcional: boolean
}

export function CamposDelBorde({ editor, capa, etiqueta, opcional }: Props) {
  const ids = [capa.id]
  const sinBorde = capa.borde === null
  const ponerBorde = (borde: string | null) => {
    cambiarLasCapas(editor, ids, 'borde', (c) => conBorde(c, borde))
  }
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_5rem] items-end gap-2">
      <CampoDeColor
        etiqueta={etiqueta}
        valor={capa.borde}
        deshabilitado={editor.soloLectura}
        alCambiar={ponerBorde}
        opcional={
          opcional
            ? {
                alAlternar: (activo) => {
                  ponerBorde(activo ? COLOR_DEL_BORDE_NUEVO : null)
                },
              }
            : undefined
        }
      />
      <CampoNumerico
        etiqueta="Grosor"
        valor={capa.grosor}
        limites={LIMITES_DEL_INSPECTOR.lado}
        deshabilitado={editor.soloLectura || sinBorde}
        alCambiar={(grosor) => {
          cambiarLasCapas(editor, ids, 'grosor', (c) => ({ ...c, grosor }))
        }}
      />
    </div>
  )
}
