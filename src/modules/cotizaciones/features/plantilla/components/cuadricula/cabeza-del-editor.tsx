'use client'

import { InfoIcon } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { useAtajo } from '@/shared/ui/atajos'
import { AccionesEnLaBarra, useEnLaBarra } from '../../../barra-de-la-formula/components'
import { useEstadoEnLaBarra } from '../../../barra-de-la-formula/hooks/use-estado-en-la-barra'
import { estadoDeLaTarjeta } from '../../../../entities/plantilla/estado-de-la-edicion'
import type { useEditorDeLaCuadricula } from '../../hooks/use-editor-de-la-cuadricula'
import type { useGuardarLaPlantilla } from '../../hooks/use-guardar-la-plantilla'
import type { PanelDeLaTarjeta } from '../../hooks/use-panel-de-la-tarjeta'
import { BotonesDeLaPlantilla } from '../botones-de-la-plantilla'
import type { PropsDelEditorDeLaCuadricula } from './editor-de-la-cuadricula'

type Props = {
  props: PropsDelEditorDeLaCuadricula
  editor: ReturnType<typeof useEditorDeLaCuadricula>
  guardar: ReturnType<typeof useGuardarLaPlantilla>
  panel: PanelDeLaTarjeta
}

const NOMBRE_DE_LA_INFORMACION = 'Información de la tarjeta'

// El botón ⓘ «Información de la tarjeta» (`?panel=info-tarjeta`): de dónde nace lo que se edita y la publicada, que antes ocupaban el encabezado. En la barra de la
// fórmula va junto al estado, sólo con el icono; fuera de ella, con su texto.
function BotonDeLaInformacion({ alAbrir }: { alAbrir: () => void }) {
  const enLaBarra = useEnLaBarra()
  return (
    <AccionesEnLaBarra orden={1} lugar="estado">
      <Button
        type="button"
        variant={enLaBarra ? 'ghost' : 'outline'}
        aria-haspopup="dialog"
        aria-label={enLaBarra ? NOMBRE_DE_LA_INFORMACION : undefined}
        title={enLaBarra ? NOMBRE_DE_LA_INFORMACION : undefined}
        data-informacion-de-la-tarjeta=""
        className={
          enLaBarra
            ? 'min-h-[44px] min-w-[44px] px-0 md:pointer-fine:min-h-9 md:pointer-fine:min-w-9'
            : 'min-h-11 md:min-h-9'
        }
        onClick={alAbrir}
      >
        <InfoIcon aria-hidden className="size-4" />
        {enLaBarra ? null : NOMBRE_DE_LA_INFORMACION}
      </Button>
    </AccionesEnLaBarra>
  )
}

// Lo de arriba del editor de la tarjeta, sin encabezado propio: sus botones de versiones y el ⓘ de la información suben a la barra de la fórmula junto al estado
// (`useEstadoEnLaBarra`), y Ctrl/Cmd+S guarda el borrador. Fuera de la barra, los botones van donde están.
export function CabezaDelEditor({ props, editor, guardar, panel }: Props) {
  const { esperada, publicada } = props
  useEstadoEnLaBarra(estadoDeLaTarjeta({ hayCambios: editor.hayCambios, esperada, publicada }))
  const ocupado = guardar.ocupado || guardar.conflicto !== null
  // Siempre registrado: sin poder guardar no hace nada, pero el navegador tampoco abre su «Guardar como…».
  useAtajo('guardar', () => {
    if (editor.puedeGuardar && !ocupado) void guardar.enviar()
  })
  return (
    <>
      <BotonDeLaInformacion alAbrir={panel.abrirInformacion} />
      <BotonesDeLaPlantilla
        esperada={esperada}
        hayCambios={editor.hayCambios}
        ocupado={ocupado}
        guardar={{
          puede: editor.puedeGuardar,
          motivo: editor.motivoParaNoGuardar,
          enCurso: guardar.enCurso,
          alGuardar: () => void guardar.enviar(),
        }}
        alPublicar={props.alPublicar}
        alDescartar={props.alDescartar}
      />
    </>
  )
}
