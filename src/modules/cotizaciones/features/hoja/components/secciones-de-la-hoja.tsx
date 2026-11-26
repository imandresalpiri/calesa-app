'use client'

import type { ComponentProps } from 'react'
import { CONTENEDOR_DE_SECCIONES, REJILLA_DE_SECCIONES } from './clases-de-la-rejilla'
import { LugaresDeLaHoja } from './lugares-de-la-hoja'

// Las secciones de la hoja en su propio contenedor (`data-secciones`, `@container/secciones`): la rejilla de 12 pistas de las secciones se mide contra su ancho (una sección
// «Automática» va a la mitad desde 64 rem). En el celular deja abajo el lugar de lo que flota sobre la página (el botón del chat): la última fila no queda tapada.
const PARA_LOS_FLOTANTES = 'max-md:pb-24'

export function SeccionesDeLaHoja(props: ComponentProps<typeof LugaresDeLaHoja>) {
  return (
    <div data-secciones="" className={`${CONTENEDOR_DE_SECCIONES} ${PARA_LOS_FLOTANTES}`}>
      <div className={REJILLA_DE_SECCIONES}>
        <LugaresDeLaHoja {...props} />
      </div>
    </div>
  )
}
