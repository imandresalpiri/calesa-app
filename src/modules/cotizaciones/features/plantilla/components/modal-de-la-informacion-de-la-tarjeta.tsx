'use client'

import { formatearFechaHora } from '@/shared/lib/fechas'
import { Modal } from '@/shared/ui/modal'
import type { PropsDelEditor } from '../../../entities/plantilla/props-del-editor'

type Props = Pick<PropsDelEditor, 'de' | 'esperada' | 'publicada'> & {
  abierto: boolean
  alCerrar: () => void
}

const SECCION =
  'grid min-w-0 grid-cols-[minmax(0,1fr)] gap-1 border-t border-(--color-line) pt-3 text-(length:--text-sm) first:border-t-0 first:pt-0'
const TITULO = 'font-semibold break-words text-(--color-ink)'

// De dónde nace lo que se edita (el borrador guardado, la versión publicada o la tarjeta de por omisión), para el modal.
export function deDondeNace({
  de,
  esperada,
  publicada,
}: Pick<Props, 'de' | 'esperada' | 'publicada'>) {
  if (de === 'borrador' && esperada !== null)
    return `Sobre el borrador guardado el ${formatearFechaHora(esperada)}.`
  if (de === 'publicada')
    return `Sin borrador: parte de la versión ${String(publicada?.version)} publicada.`
  return 'Sin borrador ni publicada: parte de la de por omisión.'
}

// «Información de la tarjeta» (`?panel=info-tarjeta`): de dónde nace lo que se edita y, si hay, la publicada con su nota. Dos secciones de un solo nivel; lo que
// antes ocupaba el encabezado del editor. No muestra montos.
export function ModalDeLaInformacionDeLaTarjeta({ abierto, alCerrar, ...resto }: Props) {
  const { publicada } = resto
  return (
    <Modal
      abierto={abierto}
      alCerrar={alCerrar}
      titulo="Información de la tarjeta"
      completoEnCelular
    >
      <section aria-label="Lo que se edita" className={SECCION}>
        <h3 className={TITULO}>Lo que se edita</h3>
        <p className="text-(--color-ink)" data-de-donde-nace="">
          {deDondeNace(resto)}
        </p>
      </section>
      <section aria-label="Publicada" className={SECCION}>
        <h3 className={TITULO}>
          {publicada === null ? 'Publicada' : `Publicada: versión ${String(publicada.version)}`}
        </h3>
        {publicada === null ? (
          <p className="text-(--color-ink-soft)">Todavía no hay una tarjeta publicada.</p>
        ) : (
          <>
            {publicada.nota ? (
              <p className="break-words text-(--color-ink)">{publicada.nota}</p>
            ) : null}
            {publicada.publicadoEn ? (
              <p className="text-(--color-ink-soft)">{formatearFechaHora(publicada.publicadoEn)}</p>
            ) : null}
          </>
        )}
      </section>
    </Modal>
  )
}
