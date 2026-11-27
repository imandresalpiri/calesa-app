'use client'

import type { ComponentProps } from 'react'
import type { SeccionDeHoja as Seccion } from '../../../entities/hoja'
import { rejillaDeLasSecciones } from '../../../entities/posiciones-de-la-hoja'
import { estiloDeLaRejillaDeSecciones } from './clases-de-la-posicion'
import { claseDeLaRejillaDeSecciones, CONTENEDOR_DE_SECCIONES } from './clases-de-la-rejilla'
import { LugaresDeLaHoja } from './lugares-de-la-hoja'

// Las secciones de la hoja en su propio contenedor (`data-secciones`, `@container/secciones`): la rejilla de 12 pistas de las secciones se mide contra su ancho (una sección
// «Automática» va a la mitad desde 64 rem). En el celular deja abajo el lugar de lo que flota sobre la página (el botón del chat): la última fila no queda tapada.
const PARA_LOS_FLOTANTES = 'max-md:pb-24'

type Props = Omit<ComponentProps<typeof LugaresDeLaHoja>, 'rejilla'> & {
  // Todas las secciones que llegaron (también las que una condición apaga: su fila queda `auto` y colapsa) y el lugar del bloque del avanzado, para las posiciones.
  todas?: readonly Seccion[]
  avanzado?: { fila: number } | undefined
}

// Con posiciones (docs/GLOSARIO.md › «Posición (en la rejilla)»), desde el corte de la sección más exigente cada una va en su lugar y las filas vacías se respetan.
export function SeccionesDeLaHoja({ todas, avanzado, ...props }: Props) {
  const hayBloque =
    props.secciones.some((s) => s.presentacion === 'avanzado') ||
    (props.totalSuelto ?? null) !== null ||
    (props.cierre ?? null) !== null
  const rejilla = rejillaDeLasSecciones(todas ?? props.secciones, {
    ...(avanzado ? { avanzado } : {}),
    hayBloque,
  })
  return (
    <div data-secciones="" className={`${CONTENEDOR_DE_SECCIONES} ${PARA_LOS_FLOTANTES}`}>
      <div
        className={claseDeLaRejillaDeSecciones(rejilla?.corte)}
        style={estiloDeLaRejillaDeSecciones(rejilla?.filas)}
      >
        <LugaresDeLaHoja {...props} rejilla={rejilla} />
      </div>
    </div>
  )
}
