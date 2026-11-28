'use client'

import { Button } from '@/shared/ui/button'
import { EditorConVariables } from '@/shared/ui/editor-con-variables'
import { ModalDeFormulario } from '@/shared/ui/modal-de-formulario'
import { useApertura } from '@/shared/ui/use-apertura'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { PANEL_RESTABLECER_PORTAL, type AjustesDeLeads } from '../../../entities/ajustes-de-leads'
import {
  EJEMPLO_DEL_MENSAJE,
  LARGO_MAXIMO_DEL_MENSAJE,
  valoresDelMensaje,
} from '../../../entities/portal-mensaje'
import { useModalDelMensajeDelPortal } from '../hooks/use-modal-del-mensaje-del-portal'
import { VARIABLES_DEL_EDITOR } from './variables-del-mensaje'

type Props = {
  abierto: boolean
  alCerrar: () => void
  portal: AjustesDeLeads['portal']
  // Los compone `src/app` (este módulo no depende de `empresa` ni de `web`), para la vista previa.
  empresa: string
  direccion: string | null
}

// «Mensaje del portal» (`?panel=portal`): el texto para WhatsApp que se le pasa al cliente al darle acceso, con sus variables a un toque y su vista
// previa. Cada apertura empieza de lo guardado.
export function ModalDelMensajeDelPortal(props: Props) {
  const apertura = useApertura(props.abierto)
  return <FormularioDelMensaje key={apertura} {...props} />
}

function FormularioDelMensaje({ abierto, alCerrar, portal, empresa, direccion }: Props) {
  const modal = useModalDelMensajeDelPortal({ portal, abierto, alCerrar })
  // Cambiar de panel reemplaza este modal por la confirmación: lo escrito estaba en blanco, no se pierde nada.
  const restablecer = usePanelPorUrl(PANEL_RESTABLECER_PORTAL)
  return (
    <ModalDeFormulario
      id="mensaje-del-portal"
      abierto={abierto}
      alCerrar={alCerrar}
      titulo="Mensaje del portal"
      descripcion="El texto para WhatsApp que se le pasa al cliente al darle acceso."
      ancho="grande"
      focoInicial={() => document.getElementById('mensaje-del-portal-texto')}
      formulario={modal.formulario}
      detalleDelConflicto="Lo que escribiste sigue acá."
    >
      <EditorConVariables
        id="mensaje-del-portal-texto"
        etiqueta="Texto para WhatsApp"
        valor={modal.texto}
        alCambiar={modal.escribir}
        variables={VARIABLES_DEL_EDITOR}
        valores={valoresDelMensaje({ ...EJEMPLO_DEL_MENSAJE, empresa, direccion })}
        motivo={modal.motivo}
        largoMaximo={LARGO_MAXIMO_DEL_MENSAJE}
        deshabilitado={modal.formulario.enCurso}
      />
      {modal.pideRestablecer ? (
        <Button
          type="button"
          variant="outline"
          className="min-h-11 w-fit md:min-h-9"
          onClick={() => {
            restablecer.abrir()
          }}
        >
          Restablecer el de fábrica
        </Button>
      ) : null}
      {direccion ? null : (
        <p className="text-(length:--text-xs) text-(--color-ink-soft)">
          Todavía no hay una dirección de la web configurada: {'{direccion}'} dice «la web de{' '}
          {empresa}».
        </p>
      )}
    </ModalDeFormulario>
  )
}
