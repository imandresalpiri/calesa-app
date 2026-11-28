'use client'

import { CircleIcon, SlashIcon, SquareIcon, TriangleIcon, type LucideIcon } from 'lucide-react'
import type { QueSeAgrega } from '../../../../entities/editor/capas-nuevas'
import { BotonDeAgregar } from './boton-de-agregar'
import { SeccionDeAgregar, type PropsDeLaSeccion } from './seccion-de-agregar'

const FORMAS: readonly { etiqueta: string; Icono: LucideIcon; que: QueSeAgrega }[] = [
  { etiqueta: 'Rectángulo', Icono: SquareIcon, que: { tipo: 'forma', forma: 'rectangulo' } },
  { etiqueta: 'Elipse', Icono: CircleIcon, que: { tipo: 'forma', forma: 'elipse' } },
  { etiqueta: 'Polígono', Icono: TriangleIcon, que: { tipo: 'forma', forma: 'poligono' } },
  { etiqueta: 'Línea', Icono: SlashIcon, que: { tipo: 'linea' } },
]

// «Formas» en «Agregar»: rectángulo, elipse, polígono y línea, del tamaño que les toca en el centro de lo que se ve (para dibujarlas a mano,
// las herramientas del riel).
export function SeccionFormas({ motivo, alAgregar }: PropsDeLaSeccion) {
  return (
    <SeccionDeAgregar titulo="Formas">
      <ul className="grid grid-cols-2 gap-1">
        {FORMAS.map((forma) => (
          <li key={forma.etiqueta} className="min-w-0">
            <BotonDeAgregar
              etiqueta={forma.etiqueta}
              Icono={forma.Icono}
              motivo={motivo}
              alHacer={() => {
                alAgregar(forma.que)
              }}
            />
          </li>
        ))}
      </ul>
    </SeccionDeAgregar>
  )
}
