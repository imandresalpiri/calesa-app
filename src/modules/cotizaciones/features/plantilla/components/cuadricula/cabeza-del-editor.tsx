'use client'

import { useEstadoEnLaBarra } from '../../../barra-de-la-formula/hooks/use-estado-en-la-barra'
import { estadoDeLaTarjeta } from '../../../../entities/plantilla/estado-de-la-edicion'
import type { useEditorDeLaCuadricula } from '../../hooks/use-editor-de-la-cuadricula'
import type { useGuardarLaPlantilla } from '../../hooks/use-guardar-la-plantilla'
import { BotonesDeLaPlantilla } from '../botones-de-la-plantilla'
import { EncabezadoDelEditor } from '../encabezado-del-editor'
import type { PropsDelEditorDeLaCuadricula } from './editor-de-la-cuadricula'

type Props = {
  props: PropsDelEditorDeLaCuadricula
  editor: ReturnType<typeof useEditorDeLaCuadricula>
  guardar: ReturnType<typeof useGuardarLaPlantilla>
}

// Lo de arriba del editor de la tarjeta: el encabezado («Tarjeta de <Origen>», de dónde nace) con sus botones de versiones, que en la página del origen suben a la
// barra de la fórmula junto al estado (`useEstadoEnLaBarra`).
export function CabezaDelEditor({ props, editor, guardar }: Props) {
  const { origen, esperada, publicada } = props
  useEstadoEnLaBarra(estadoDeLaTarjeta({ hayCambios: editor.hayCambios, esperada, publicada }))
  const botones = (
    <BotonesDeLaPlantilla
      esperada={esperada}
      hayCambios={editor.hayCambios}
      ocupado={guardar.ocupado || guardar.conflicto !== null}
      guardar={{
        puede: editor.puedeGuardar,
        motivo: editor.motivoParaNoGuardar,
        enCurso: guardar.enCurso,
        alGuardar: () => void guardar.enviar(),
      }}
      alPublicar={props.alPublicar}
      alDescartar={props.alDescartar}
    />
  )
  return (
    <EncabezadoDelEditor
      origen={origen}
      de={props.de}
      esperada={esperada}
      publicada={publicada}
      acciones={botones}
    />
  )
}
