'use client'

import { ModalDeFormulario } from '@/shared/ui/modal-de-formulario'
import { useApertura } from '@/shared/ui/use-apertura'
import type { OrigenDelLive, PersonaDelLive } from '../../../entities/live-configuracion'
import { etiquetaDeLoHeredado } from '../../../entities/live-textos'
import { useModalDeLaPersona } from '../hooks/use-modal-de-la-persona'
import { CamposDelLive, idDelCampoDelLive } from './campos-del-live'

const ID = 'modo-live-persona'

type Props = {
  abierto: boolean
  alCerrar: () => void
  persona: PersonaDelLive
  origenes: readonly OrigenDelLive[]
}

// El Modo Live de una persona (`?panel=persona&persona=<id>`): los mismos campos que el de su rol, cada uno con «Como su rol (…)» primero (sin rol,
// «Por defecto (…)»); lo que pisa lleva «Ajuste propio». Cada apertura empieza de lo guardado.
export function ModalDeLaPersona(props: Props) {
  const apertura = useApertura(props.abierto)
  return <FormularioDeLaPersona key={apertura} {...props} />
}

function FormularioDeLaPersona({ abierto, alCerrar, persona, origenes }: Props) {
  const modal = useModalDeLaPersona({ persona, origenes, abierto, alCerrar })
  return (
    <ModalDeFormulario
      id={ID}
      abierto={abierto}
      alCerrar={alCerrar}
      titulo={`Modo Live de «${persona.nombre}»`}
      descripcion={
        persona.rol
          ? `Lo que no cambies sigue a su rol, ${persona.rol.nombre}.`
          : 'No tiene rol: lo que no cambies sigue lo por defecto.'
      }
      completoEnCelular
      focoInicial={() => document.getElementById(idDelCampoDelLive(ID, 'puedeEncender'))}
      formulario={modal.formulario}
      detalleDelConflicto="Lo que elegiste sigue acá."
    >
      <CamposDelLive
        id={ID}
        eleccion={modal.eleccion}
        origenes={origenes}
        heredado={{
          etiqueta: (campo) => etiquetaDeLoHeredado(campo, persona, origenes),
          origenes: modal.heredado.origenes,
        }}
        errores={modal.formulario.errores}
        deshabilitado={modal.formulario.enCurso}
        alElegir={modal.elegir}
        alMarcarOrigen={modal.marcarOrigen}
      />
    </ModalDeFormulario>
  )
}
