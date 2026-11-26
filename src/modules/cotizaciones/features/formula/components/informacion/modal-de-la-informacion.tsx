'use client'

import { Modal } from '@/shared/ui/modal'
import type { LecturaDeLaFormula } from '../../../../entities/formula/versiones'
import type { AvisosDeLaCopia } from '../../hooks/use-avisos-de-la-copia'
import { SeccionDeLaPublicada } from './seccion-de-la-publicada'
import { SeccionDeLosAvisos } from './seccion-de-los-avisos'
import { SeccionDelBorrador } from './seccion-del-borrador'

type Props = {
  abierto: boolean
  alCerrar: () => void
  origen: { id: string; nombre: string }
  formulaDelOrigenId: string
  formula: LecturaDeLaFormula
  avisos: AvisosDeLaCopia
  alDescartar: () => void
}

// «Información de la fórmula» (`?panel=info-formula`): la publicada, el borrador (con «Descartar el borrador…», que cambia este modal por su confirmación) y los
// avisos de la copia, cada uno una sección de un solo nivel. Sin borrador o sin avisos, su sección no está. En el celular, a pantalla completa. No muestra montos.
export function ModalDeLaInformacion({
  abierto,
  alCerrar,
  origen,
  formulaDelOrigenId,
  formula,
  avisos,
  alDescartar,
}: Props) {
  return (
    <Modal
      abierto={abierto}
      alCerrar={alCerrar}
      titulo="Información de la fórmula"
      completoEnCelular
    >
      <SeccionDeLaPublicada publicada={formula.publicada} origen={origen.nombre} />
      {formula.borrador ? (
        <SeccionDelBorrador
          borrador={formula.borrador}
          publicada={formula.publicada}
          alDescartar={alDescartar}
        />
      ) : null}
      {avisos.textos.length > 0 ? (
        <SeccionDeLosAvisos
          origenId={origen.id}
          formulaDelOrigenId={formulaDelOrigenId}
          avisos={avisos}
        />
      ) : null}
    </Modal>
  )
}
