'use client'

import { Aviso } from '@/shared/ui/aviso'
import { Campo } from '@/shared/ui/campo'
import { CampoSeleccion } from '@/shared/ui/campo-seleccion'
import { ModalDeFormulario } from '@/shared/ui/modal-de-formulario'
import { ValoresDeLaTarjeta } from '@/shared/ui/tarjetas-de-ajustes'
import { useApertura } from '@/shared/ui/use-apertura'
import {
  PREAJUSTES,
  PREAJUSTES_DEL_ASISTENTE,
  type PreajusteDelAsistente,
} from '../../../entities/asistente-ia/config'
import { useModalDeAsistenteIa } from '../hooks/use-modal-de-asistente-ia'
import { CONFLICTO_DE_INTEGRACION, type PropsDeModalDeIntegracion } from './modal-de-apibara'

const OPCIONES = PREAJUSTES.map((preajuste) => ({
  valor: preajuste,
  etiqueta: PREAJUSTES_DEL_ASISTENTE[preajuste].nombre,
}))

const esPreajuste = (valor: string): valor is PreajusteDelAsistente =>
  (PREAJUSTES as readonly string[]).includes(valor)

// «Configurar el asistente de IA» (`?panel=asistente-ia`): el proveedor, compatible con la API de OpenAI. Con DeepSeek la dirección y el modelo
// son los suyos y se leen; con «Otro proveedor», se escriben. La clave y las indicaciones son otros modales. Cada apertura empieza de lo guardado.
export function ModalDeAsistenteIa(props: PropsDeModalDeIntegracion) {
  const apertura = useApertura(props.abierto)
  return <FormularioDeAsistenteIa key={apertura} {...props} />
}

function FormularioDeAsistenteIa({ abierto, alCerrar, integracion }: PropsDeModalDeIntegracion) {
  const modal = useModalDeAsistenteIa({ abierto, alCerrar, asistente: integracion })
  const { formulario } = modal
  return (
    <ModalDeFormulario
      id="integracion-asistente-ia"
      abierto={abierto}
      alCerrar={alCerrar}
      titulo="Configurar el asistente de IA"
      descripcion="A qué IA se le piden los textos. Tiene que ser compatible con la API de OpenAI."
      formulario={formulario}
      detalleDelConflicto={CONFLICTO_DE_INTEGRACION}
    >
      <CampoSeleccion
        nombre="preajuste"
        etiqueta="Proveedor"
        opciones={OPCIONES}
        value={modal.preajuste}
        disabled={formulario.enCurso}
        onChange={(evento) => {
          if (esPreajuste(evento.target.value)) {
            modal.cambiarPreajuste(evento.target.value)
          }
        }}
      />
      {modal.preajuste === 'otro' ? (
        <>
          <Campo
            nombre="urlBase"
            etiqueta="Dirección base"
            type="url"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            value={modal.urlBase}
            disabled={formulario.enCurso}
            error={formulario.errores['urlBase']}
            ayuda="Sin /chat/completions: se suma al llamar. Empieza con https://."
            onChange={(evento) => {
              modal.cambiarUrlBase(evento.target.value)
            }}
          />
          <Campo
            nombre="modelo"
            etiqueta="Modelo"
            autoComplete="off"
            spellCheck={false}
            value={modal.modelo}
            disabled={formulario.enCurso}
            error={formulario.errores['modelo']}
            onChange={(evento) => {
              modal.cambiarModelo(evento.target.value)
            }}
          />
        </>
      ) : (
        <ValoresDeLaTarjeta
          filas={[
            { etiqueta: 'Dirección base', valor: modal.urlBase },
            { etiqueta: 'Modelo', valor: modal.modelo },
          ]}
        />
      )}
      {modal.sinClaveAlGuardar ? (
        <Aviso tono="aviso">
          Al cambiar la dirección se borra la clave guardada y el asistente se apaga hasta que
          cargues otra.
        </Aviso>
      ) : null}
    </ModalDeFormulario>
  )
}
