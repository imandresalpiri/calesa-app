'use client'

import type { RefObject } from 'react'
import type { ManejoDelLienzo, PropsDelEditorDeArtes } from '../tipos'
import { useDatosDelEditor, useEjemploDelEditor } from './use-datos-del-editor'
import { useDocumentoDelEditor } from './use-documento-del-editor'

// El documento del editor con los datos con que se ve, en el orden en que se necesitan: el vehículo de ejemplo y el catálogo del origen
// antes del documento (la miniatura sólo se arma con los datos de ejemplo y no se guarda con una variable desconocida), y los datos de la
// página después (`useDatosDelEditor`).
export function useArteConDatos(
  props: PropsDelEditorDeArtes,
  lienzo: RefObject<ManejoDelLienzo | null>,
) {
  const { plantilla, personaId, motivoDeSoloLectura } = props
  const { catalogo, ejemplo } = useEjemploDelEditor(props)
  const documento = useDocumentoDelEditor({
    plantilla,
    personaId,
    soloLectura: motivoDeSoloLectura !== null,
    lienzo,
    catalogo,
    deEjemplo: ejemplo.datos.deEjemplo,
  })
  const { datos, sinClientes } = useDatosDelEditor({
    props,
    editor: documento.editor,
    catalogo,
    ejemplo,
    desconocidas: documento.desconocidas,
  })
  return { documento, ejemplo, datos, sinClientes }
}
