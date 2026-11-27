'use client'

import type { ComponentType } from 'react'
import { Aviso } from '@/shared/ui/aviso'
import type { LecturaEnCuadricula } from '../../../../entities/cuadricula-de-la-tarjeta'
import { referenciaUsada } from '../../../../entities/plantilla/referencia-del-lienzo'
import type { ReferenciaDeLaTarjeta } from '../../../../entities/referencia-de-la-tarjeta'
import type { PropsDelLienzoDeLaPlantilla } from '../../../../entities/vista-previa-de-la-plantilla'

type Props = {
  lectura: LecturaEnCuadricula
  referencia: ReferenciaDeLaTarjeta
  ejemplo: boolean
  Lienzo: ComponentType<PropsDelLienzoDeLaPlantilla>
  // Lo que dice el aviso: por omisión, que el editor pide una pantalla ancha; con el Modo Live, «Sólo lectura en el Modo Live.».
  aviso?: string
}

export const AVISO_DE_PANTALLA_CHICA = 'Este editor se usa en una pantalla de al menos 1.024 px.'

// En una pantalla de menos de 1.024 px (o con el Modo Live, en todo ancho): el aviso y la tarjeta en sólo lectura (el lienzo sin capa), con la referencia elegida. El
// código del editor no se pide.
export function AvisoDePantallaChica({
  lectura,
  referencia,
  ejemplo,
  Lienzo,
  aviso = AVISO_DE_PANTALLA_CHICA,
}: Props) {
  return (
    <section aria-label="Tarjeta" className="grid min-w-0 gap-3" data-tarjeta-solo-lectura="">
      <Aviso tono="info">{aviso}</Aviso>
      <Lienzo
        lectura={lectura}
        referencia={referenciaUsada(referencia, ejemplo)}
        escala="ajustar"
      />
    </section>
  )
}
