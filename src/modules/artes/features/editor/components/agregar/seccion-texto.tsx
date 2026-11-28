'use client'

import { BracesIcon, TypeIcon } from 'lucide-react'
import { useId } from 'react'
import {
  gruposParaAgregar,
  type GrupoParaAgregar,
} from '../../../../entities/datos/grupos-para-agregar'
import { textoDeLaVariable } from '../../../../entities/editor/agregar-en-el-panel'
import type { DatosEnElEditor } from '../../tipos'
import { BotonDeAgregar } from './boton-de-agregar'
import { SeccionDeAgregar, type PropsDeLaSeccion } from './seccion-de-agregar'

type Props = PropsDeLaSeccion & { datos: DatosEnElEditor }

function GrupoDeDatos({
  grupo,
  motivo,
  alAgregar,
}: PropsDeLaSeccion & { grupo: GrupoParaAgregar }) {
  const id = useId()
  return (
    <div role="group" aria-labelledby={id} className="grid grid-cols-[minmax(0,1fr)] gap-0.5">
      <p id={id} className="px-2 pt-1 text-(length:--text-xs) font-medium text-(--color-ink-soft)">
        {grupo.titulo}
      </p>
      <ul className="grid grid-cols-[minmax(0,1fr)]">
        {grupo.datos.map((dato) => {
          const texto = textoDeLaVariable(dato.clave)
          return (
            <li key={dato.clave} className="min-w-0">
              <BotonDeAgregar
                etiqueta={dato.etiqueta}
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
    </div>
  )
}

// «Texto» en «Agregar»: un texto libre y uno por cada dato que el arte llena en el origen de la plantilla (`gruposParaAgregar`: el vehículo,
// la ficha del origen, la cotización con las celdas de la elegida, el cliente, quien comparte y la empresa), que lleva su `{clave}` y se ve
// con el vehículo de ejemplo.
export function SeccionTexto({ motivo, alAgregar, datos }: Props) {
  const celdas = Object.keys(datos.datos.cotizacion?.celdas ?? {})
  const grupos = gruposParaAgregar(datos.catalogo, { origen: datos.origen.nombre, celdas })
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
      {grupos.map((grupo) => (
        <GrupoDeDatos key={grupo.clave} grupo={grupo} motivo={motivo} alAgregar={alAgregar} />
      ))}
    </SeccionDeAgregar>
  )
}
