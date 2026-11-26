'use client'

import { ModalDeFormulario } from '@/shared/ui/modal-de-formulario'
import { useApertura } from '@/shared/ui/use-apertura'
import { LARGO_MAXIMO_PROMPT_BASE } from '../../../entities/asistente-ia/config'
import { useModalDeIndicaciones } from '../hooks/use-modal-de-indicaciones'
import { CampoDeTextoLargo } from './campo-de-texto-largo'
import { FilasDeAtajos } from './filas-de-atajos'
import { CONFLICTO_DE_INTEGRACION, type PropsDeModalDeIntegracion } from './modal-de-apibara'

// «Prompt base y atajos» (`?panel=indicaciones-asistente-ia`): lo que la IA recibe siempre y los botones al compartir, iguales para todos. Se
// guardan juntos, en una escritura. Cada apertura empieza de lo guardado.
export function ModalDeIndicacionesDelAsistente(props: PropsDeModalDeIntegracion) {
  const apertura = useApertura(props.abierto)
  return <FormularioDeIndicaciones key={apertura} {...props} />
}

function FormularioDeIndicaciones({ abierto, alCerrar, integracion }: PropsDeModalDeIntegracion) {
  const modal = useModalDeIndicaciones({ abierto, alCerrar, asistente: integracion })
  const { formulario } = modal
  return (
    <ModalDeFormulario
      id="integracion-indicaciones-asistente-ia"
      abierto={abierto}
      alCerrar={alCerrar}
      titulo="Prompt base y atajos"
      descripcion="Lo mismo para todas las personas de la empresa."
      ancho="amplio"
      completoEnCelular
      formulario={formulario}
      detalleDelConflicto={CONFLICTO_DE_INTEGRACION}
    >
      <section aria-labelledby="prompt-base-del-asistente" className="grid min-w-0 gap-3">
        <h3 id="prompt-base-del-asistente" className="text-(length:--text-base) font-semibold">
          Prompt base
        </h3>
        <CampoDeTextoLargo
          nombre="promptBase"
          etiqueta="Lo que la IA recibe en cada pedido"
          value={modal.promptBase}
          largoMaximo={LARGO_MAXIMO_PROMPT_BASE}
          disabled={formulario.enCurso}
          error={formulario.errores['promptBase']}
          onChange={(evento) => {
            modal.cambiarPromptBase(evento.target.value)
          }}
        />
      </section>
      <FilasDeAtajos modal={modal} />
    </ModalDeFormulario>
  )
}
