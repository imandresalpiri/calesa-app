'use client'

import type { SeccionDelLienzo } from '../../../../entities/diseno/lienzo-de-la-hoja'
import { estiloDeLaRejillaDeCeldas } from '../../../hoja/components/clases-de-la-posicion'
import { claseDeLaRejillaDeCeldas } from '../../../hoja/components/clases-de-la-rejilla'
import { idDeLaRejilla } from '../../hooks/ids-del-lienzo'
import type { ApoyoDelLienzo } from '../../hooks/use-apoyo-del-lienzo'
import { HuecoParaSumar } from './hueco-para-sumar'
import { MarcaEnLaRejilla } from './marca-en-la-rejilla'
import { PiezaEnElLienzo } from './pieza-en-el-lienzo'

type Props = {
  seccion: SeccionDelLienzo
  // Los ids del arrastre de sus piezas, en su orden.
  ids: readonly string[]
  apoyo: ApoyoDelLienzo
  // Donde cae lo que se suelta en la sección (la sección lo une con lo suyo).
  setNodeRef: (el: HTMLElement | null) => void
}

// La rejilla de las piezas de una sección del lienzo, con las filas que dibuja la hoja: cada pieza en su lugar, la marca de lo que se arrastra encima y el «+»
// («Sumar una pieza aquí») en la fila siguiente a la última. Deja pasar el clic al fondo de la sección salvo en cada pieza y en el «+».
export function RejillaDeLaSeccionEnElLienzo({ seccion, ids, apoyo, setNodeRef }: Props) {
  const id = idDeLaRejilla(seccion.id)
  const corte = seccion.rejilla?.corte
  return (
    <div
      ref={setNodeRef}
      data-rejilla={id}
      data-rejilla-de-celdas=""
      style={estiloDeLaRejillaDeCeldas(seccion.rejilla?.filas)}
      className={`${claseDeLaRejillaDeCeldas(seccion, corte)} pointer-events-none relative [&>*]:pointer-events-auto`}
    >
      {seccion.piezas.map((pieza, indice) => {
        const idDeLaPieza = ids[indice] ?? `${seccion.id}:${String(indice)}`
        return (
          <PiezaEnElLienzo
            key={idDeLaPieza}
            id={idDeLaPieza}
            pieza={pieza}
            seccion={seccion}
            apoyo={apoyo}
          />
        )
      })}
      <HuecoParaSumar
        fila={seccion.filaDelHueco}
        corte={corte}
        ofertas={() => apoyo.ofertas(seccion.diseno)}
        ocupado={apoyo.ocupado}
        alSumar={(tipo, nodo) => {
          apoyo.sumar(seccion.id, null, tipo, nodo)
        }}
      />
      <MarcaEnLaRejilla marca={apoyo.marca} en={id} />
    </div>
  )
}
