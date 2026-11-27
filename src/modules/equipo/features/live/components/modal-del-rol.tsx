'use client'

import { ModalDeFormulario } from '@/shared/ui/modal-de-formulario'
import { useApertura } from '@/shared/ui/use-apertura'
import type { AjustesDeUnRol, OrigenDelLive } from '../../../entities/live-configuracion'
import { useModalDelRol } from '../hooks/use-modal-del-rol'
import { CamposDelLive, idDelCampoDelLive } from './campos-del-live'

const ID = 'modo-live-rol'

type Props = {
  abierto: boolean
  alCerrar: () => void
  rol: AjustesDeUnRol
  origenes: readonly OrigenDelLive[]
}

// El Modo Live de un rol (`?panel=rol&rol=<id>`): qué puede y qué se ve con el Live encendido. Cada apertura empieza de lo guardado.
export function ModalDelRol(props: Props) {
  const apertura = useApertura(props.abierto)
  return <FormularioDelRol key={apertura} {...props} />
}

function FormularioDelRol({ abierto, alCerrar, rol, origenes }: Props) {
  const modal = useModalDelRol({ rol, origenes, abierto, alCerrar })
  return (
    <ModalDeFormulario
      id={ID}
      abierto={abierto}
      alCerrar={alCerrar}
      titulo={`Modo Live de «${rol.rol.nombre}»`}
      completoEnCelular
      focoInicial={() => document.getElementById(idDelCampoDelLive(ID, 'puedeEncender'))}
      formulario={modal.formulario}
      detalleDelConflicto="Lo que elegiste sigue acá."
    >
      <CamposDelLive
        id={ID}
        eleccion={modal.eleccion}
        origenes={origenes}
        heredado={null}
        errores={modal.formulario.errores}
        deshabilitado={modal.formulario.enCurso}
        alElegir={modal.elegir}
        alMarcarOrigen={modal.marcarOrigen}
      />
    </ModalDeFormulario>
  )
}
