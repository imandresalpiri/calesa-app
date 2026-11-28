'use client'

import { BracesIcon, TypeIcon } from 'lucide-react'
import { textoDeLaVariable } from '../../../../entities/editor/agregar-en-el-panel'
import { VARIABLES_DE_ARTE } from '../../../../entities/editor/variables'
import { BotonDeAgregar } from './boton-de-agregar'
import { SeccionDeAgregar, type PropsDeLaSeccion } from './seccion-de-agregar'

// «Texto» en «Agregar»: un texto libre y uno por cada dato del vehículo o de la cotización (`VARIABLES_DE_ARTE`), que lleva su `{clave}` y
// se llena al compartir (mientras se diseña, con los datos de ejemplo).
export function SeccionTexto({ motivo, alAgregar }: PropsDeLaSeccion) {
  return (
    <SeccionDeAgregar titulo="Texto">
      <BotonDeAgregar
        etiqueta="Texto"
        Icono={TypeIcon}
        motivo={motivo}
        alHacer={() => {
          alAgregar({ tipo: 'texto' })
        }}
      />
      <p className="px-2 text-(length:--text-xs) text-(--color-ink-soft)">
        Con un dato que se llena al compartir:
      </p>
      <ul className="grid grid-cols-[minmax(0,1fr)]">
        {VARIABLES_DE_ARTE.map((variable) => {
          const texto = textoDeLaVariable(variable.clave)
          return (
            <li key={variable.clave} className="min-w-0">
              <BotonDeAgregar
                etiqueta={variable.etiqueta}
                Icono={BracesIcon}
                detalle={texto}
                motivo={motivo}
                alHacer={() => {
                  alAgregar({ tipo: 'texto', texto })
                }}
              />
            </li>
          )
        })}
      </ul>
    </SeccionDeAgregar>
  )
}
