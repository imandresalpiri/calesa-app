'use client'

import { useDroppable } from '@dnd-kit/core'
import type { ReactNode } from 'react'
import type { Diseno } from '../../../../entities/diseno'
import type { SeccionDelLienzo } from '../../../../entities/diseno/lienzo-de-la-hoja'
import { rejillaDeLasSecciones } from '../../../../entities/posiciones-de-la-hoja'
import { estiloDeLaRejillaDeSecciones } from '../../../hoja/components/clases-de-la-posicion'
import {
  claseDeLaRejillaDeSecciones,
  CONTENEDOR_DE_SECCIONES,
} from '../../../hoja/components/clases-de-la-rejilla'
import {
  ID_DE_LAS_SECCIONES,
  type DatosDeDondeCae,
  type IdsDelLienzo,
} from '../../hooks/ids-del-lienzo'
import type { ApoyoDelLienzo } from '../../hooks/use-apoyo-del-lienzo'
import { BloqueDelLienzo } from './bloque-del-lienzo'
import { MarcaEnLaRejilla } from './marca-en-la-rejilla'
import { SeccionEnElLienzo } from './seccion-en-el-lienzo'

export type PropsDeLasSecciones = {
  secciones: readonly SeccionDelLienzo[]
  ids: IdsDelLienzo
  // La fila del bloque «Avanzado» (`avanzado` del diseño).
  avanzado: Diseno['avanzado']
  // La tarjeta del total suelta (sin la pieza en una sección), o nada.
  totalSuelto: ReactNode
  apoyo: ApoyoDelLienzo
}

const CAE_UNA_PRINCIPAL: DatosDeDondeCae = { acepta: 'principal' }

// Las secciones del lienzo en la rejilla de las secciones de la hoja: las principales en su lugar y el bloque «Avanzado» (la tarjeta del total suelta y las que
// van detrás de «Avanzado») en su fila entera. La rejilla es donde cae una principal o el bloque que se arrastra, con su marca.
export function SeccionesDelLienzo({
  secciones,
  ids,
  avanzado,
  totalSuelto,
  apoyo,
}: PropsDeLasSecciones) {
  const { setNodeRef } = useDroppable({ id: ID_DE_LAS_SECCIONES, data: CAE_UNA_PRINCIPAL })
  const avanzadas = secciones.filter((s) => s.presentacion === 'avanzado')
  const hayBloque = avanzadas.length > 0 || totalSuelto !== null
  const rejilla = rejillaDeLasSecciones(secciones, { avanzado, hayBloque })
  const dibujar = (s: SeccionDelLienzo) => (
    <SeccionEnElLienzo
      key={s.id}
      seccion={s}
      ids={ids.porSeccion.get(s.id) ?? []}
      corte={rejilla?.corte}
      apoyo={apoyo}
    />
  )
  return (
    <div data-secciones="" className={CONTENEDOR_DE_SECCIONES}>
      <div
        ref={setNodeRef}
        data-rejilla={ID_DE_LAS_SECCIONES}
        style={estiloDeLaRejillaDeSecciones(rejilla?.filas)}
        className={`${claseDeLaRejillaDeSecciones(rejilla?.corte)} relative`}
      >
        {secciones.filter((s) => s.presentacion === 'principal').map(dibujar)}
        {hayBloque ? (
          <BloqueDelLienzo
            rejilla={rejilla}
            enSuFila={avanzado !== undefined}
            totalSuelto={totalSuelto}
            avanzadas={avanzadas.map(dibujar)}
            apoyo={apoyo}
          />
        ) : null}
        <MarcaEnLaRejilla marca={apoyo.marca} en={ID_DE_LAS_SECCIONES} />
      </div>
    </div>
  )
}
