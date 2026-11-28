'use client'

import { MasAcciones } from '@/shared/ui/lista/mas-acciones'
import type { AccionDeMenu } from '@/shared/ui/lista/acciones'
import type { ClaveDeFormato } from '../../../../entities/formatos'
import {
  lineasDelMenuDelEditor,
  type ClaveDelMenuDelEditor,
} from '../../../../entities/editor/menu-del-editor'

type Props = {
  nombre: string
  formato: ClaveDeFormato
  hacer: Readonly<Record<ClaveDelMenuDelEditor, () => void>>
}

// Lo que abre algo encima espera a que el menú se cierre: si no, el foco que vuelve al «⋯» lo cierra.
const ABRE_ENCIMA: ReadonlySet<ClaveDelMenuDelEditor> = new Set(['otro-formato', 'atajos'])

// El «⋯» de la barra del editor: «Exportar PNG», «Duplicar en otro formato» y «Atajos de teclado» (`lineasDelMenuDelEditor()`).
export function MenuDelEditor({ nombre, formato, hacer }: Props) {
  const acciones: AccionDeMenu[] = lineasDelMenuDelEditor(formato).map((linea) =>
    linea.tipo === 'accion'
      ? {
          ...linea,
          alElegir: hacer[linea.clave],
          despuesDeCerrar: ABRE_ENCIMA.has(linea.clave),
        }
      : linea,
  )
  return <MasAcciones nombre={nombre} acciones={acciones} />
}
