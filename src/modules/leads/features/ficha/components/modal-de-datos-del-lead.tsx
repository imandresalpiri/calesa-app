'use client'

import type { RefObject } from 'react'
import { formatearFechaHora } from '@/shared/lib/fechas'
import { Button } from '@/shared/ui/button'
import { Dato, DatosPorGrupo } from '@/shared/ui/campos'
import { Modal } from '@/shared/ui/modal'
import { useRegional } from '@/shared/ui/regional'
import {
  ETIQUETA_DE_EDITAR_TELEFONOS,
  type EdicionDelMenu,
} from '../../../entities/acciones-de-lead'
import type { CampoDeLead } from '../../../entities/campo'
import { datoDelCampo } from '../../../entities/datos-clave-del-lead'
import type { LeadDeFicha } from '../../../entities/ficha'
import { SoloLaCartera } from './solo-la-cartera'
import { TelefonosDeLaFicha } from './telefonos-de-la-ficha'

type Props = {
  abierto: boolean
  alCerrar: () => void
  ficha: LeadDeFicha
  campos: readonly CampoDeLead[]
  // «Editar» o «Editar teléfonos» (`edicionDelMenu()`); nulo, el modal es sólo para leer.
  edicion: EdicionDelMenu | null
  alEditar: () => void
  // «Ver más»: el foco vuelve ahí al cerrar.
  focoAlCerrar: RefObject<HTMLButtonElement | null>
}

// «Ver más» de los datos del lead (`?ver=datos`): todo lo que la columna no muestra, de sólo lectura y desplazable —el alta, los grupos del
// layout sin plegar y los teléfonos con sus extras—, con «Editar» para quien puede (abre el panel de edición en lugar de este modal).
export function ModalDeDatosDelLead({
  abierto,
  alCerrar,
  ficha,
  campos,
  edicion,
  alEditar,
  focoAlCerrar,
}: Props) {
  const { zonaHoraria } = useRegional()
  return (
    <Modal
      abierto={abierto}
      alCerrar={alCerrar}
      titulo={`Datos de ${ficha.nombre}`}
      ancho="amplio"
      focoAlCerrar={focoAlCerrar}
      pie={
        <>
          <Button type="button" variant="outline" onClick={alCerrar}>
            Cerrar
          </Button>
          {edicion ? (
            <Button type="button" onClick={alEditar}>
              {edicion === 'lead' ? 'Editar' : ETIQUETA_DE_EDITAR_TELEFONOS}
            </Button>
          ) : null}
        </>
      }
    >
      <dl>
        <Dato etiqueta="Creado">{formatearFechaHora(ficha.creadoEn, { zona: zonaHoraria })}</Dato>
      </dl>
      <DatosPorGrupo
        campos={campos}
        atributos={ficha.atributos}
        valorDe={(campo) =>
          datoDelCampo(campo, ficha.atributos, ficha.enCartera).tipo === 'privado' ? (
            <SoloLaCartera />
          ) : null
        }
      />
      <TelefonosDeLaFicha ficha={ficha} />
    </Modal>
  )
}
