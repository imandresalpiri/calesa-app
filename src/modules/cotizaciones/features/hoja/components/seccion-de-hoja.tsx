'use client'

import { itemSeDibuja, type ContextoDeHoja } from '../../../entities/binding'
import type { SeccionDeHoja as Seccion } from '../../../entities/hoja'
import type { AccionesDeHoja } from '../hooks/use-hoja'
import {
  claseDeLaRejillaDeCeldas,
  claseDeLaSeccionEnLaRejilla,
  claseDelMarcoDeLaSeccion,
  claseDelTitulo,
} from './clases-de-la-rejilla'
import { ItemDeHoja } from './item-de-hoja'

type Props = {
  seccion: Seccion
  contexto: ContextoDeHoja
  acciones: AccionesDeHoja
  // Sólo en la rejilla de las secciones de la hoja lleva sus columnas y filas: en el modal «Avanzado» (un `grid` sin pistas) un `col-span-12` crearía 11 de más.
  enLaRejilla?: boolean
  // Sin borde, fondo ni relleno: las secciones del modal «Avanzado».
  sinMarco?: boolean
}

// Una sección de la hoja, con su título y sus ítems en el orden declarado. Es su propio contenedor (`@container`): el ancho de sus celdas depende del ancho de la
// sección y no del de la pantalla, así el texto al 200 % colapsa solo a una columna. Su aspecto (relleno, separación, densidad, letra, énfasis y tono) va en
// clases sobre los mismos nodos; con tono, `data-tono` lo pasa a sus celdas sin tono de grupo, a sus franjas y a sus chips.
export function SeccionDeHoja({
  seccion,
  contexto,
  acciones,
  enLaRejilla = false,
  sinMarco = false,
}: Props) {
  const marco = claseDelMarcoDeLaSeccion(seccion, { sinMarco })
  return (
    <section
      data-seccion={seccion.id}
      data-tono={seccion.tono}
      aria-label={seccion.titulo ?? undefined}
      className={enLaRejilla ? `${claseDeLaSeccionEnLaRejilla(seccion)} ${marco}` : marco}
    >
      {seccion.titulo === null ? null : (
        <h2 className={claseDelTitulo(seccion)}>{seccion.titulo}</h2>
      )}
      {/* Bajo `@lg` todo ítem ocupa las 12 pistas: sin huecos de columna, que al 200 % suman 11 × 0,75 rem y no caben en la sección del modal (4-44 b). */}
      <div className={claseDeLaRejillaDeCeldas(seccion)}>
        {seccion.items
          .filter((item) => itemSeDibuja(item, contexto))
          .map((item, posicion) => (
            <ItemDeHoja
              key={`${item.tipo}:${item.nodo}:${posicion}`}
              item={item}
              contexto={contexto}
              acciones={acciones}
            />
          ))}
      </div>
    </section>
  )
}
