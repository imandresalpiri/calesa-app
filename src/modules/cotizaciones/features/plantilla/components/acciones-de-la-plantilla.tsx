'use client'

import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { useAperturaDeLaTarjeta } from '../hooks/use-apertura-de-la-tarjeta'
import type { PanelDeLaTarjeta } from '../hooks/use-panel-de-la-tarjeta'
import type { PropsDelEditor } from '../../../entities/plantilla/props-del-editor'
import {
  DescartarLaPlantillaDiferido,
  ModalDeLaInformacionDeLaTarjetaDiferido,
  ModalDePublicarLaTarjetaDiferido,
} from './diferidos'

type Props = {
  panel: PanelDeLaTarjeta
  origen: { id: string; nombre: string }
  // La fórmula del origen de lo que la pestaña leyó.
  formulaDelOrigenId: string
  // El `actualizadoEn` del borrador que la pestaña leyó (nulo sin borrador).
  esperada: string | null
  // «Ir a la celda» desde un rechazo de publicar: el editor elige ese lugar.
  alIrA?: (donde: string) => void
  // De dónde nace lo que se edita y la publicada, para «Información de la tarjeta».
  informacion: Pick<PropsDelEditor, 'de' | 'publicada'>
}

// Los modales de la pestaña «Tarjeta» (4.19-3c: publicar y descartar; y «Información de la tarjeta»), montados al abrirse por primera vez y con una `key` por apertura. Aquí sólo se revisa al llegar por la URL (sin borrador
// no abre); lo que cambia con el modal abierto (tras «Recargar»: el borrador ya no está o es otro) lo dice el modal.
export function AccionesDeLaPlantilla({
  panel,
  origen,
  formulaDelOrigenId,
  esperada,
  alIrA,
  informacion,
}: Props) {
  const { apertura, publicando, descartando, aDescartar } = useAperturaDeLaTarjeta(panel, esperada)
  const montarPublicar = useAbiertoAlgunaVez(publicando)
  const montarDescartar = useAbiertoAlgunaVez(descartando)
  const montarInformacion = useAbiertoAlgunaVez(panel.informando)
  return (
    <>
      {montarInformacion ? (
        <ModalDeLaInformacionDeLaTarjetaDiferido
          abierto={panel.informando}
          alCerrar={panel.cerrar}
          de={informacion.de}
          esperada={esperada}
          publicada={informacion.publicada}
        />
      ) : null}
      {montarPublicar ? (
        <ModalDePublicarLaTarjetaDiferido
          key={apertura}
          abierto={publicando}
          alCerrar={panel.cerrar}
          origen={origen}
          formulaDelOrigenId={formulaDelOrigenId}
          esperada={esperada}
          {...(alIrA === undefined ? {} : { alIrA })}
        />
      ) : null}
      {montarDescartar && aDescartar ? (
        <DescartarLaPlantillaDiferido
          key={apertura}
          abierto={descartando}
          alCerrar={panel.cerrar}
          origen={origen}
          formulaDelOrigenId={formulaDelOrigenId}
          esperada={esperada}
          nombrado={aDescartar}
        />
      ) : null}
    </>
  )
}
