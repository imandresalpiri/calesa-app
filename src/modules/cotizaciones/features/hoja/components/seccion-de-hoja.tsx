'use client'

import { useContext } from 'react'
import { itemSeDibuja, type ContextoDeHoja } from '../../../entities/binding'
import type { ItemDeHoja as Item, SeccionDeHoja as Seccion } from '../../../entities/hoja'
import { rejillaDeLosItems } from '../../../entities/posiciones-de-la-hoja'
import { enOrdenDeLectura, type Corte } from '../../../entities/rejilla-de-la-hoja'
import type { AccionesDeHoja } from '../hooks/use-hoja'
import { estiloDeLaRejillaDeCeldas, estiloDeLaSeccion } from './clases-de-la-posicion'
import {
  claseDeLaRejillaDeCeldas,
  claseDeLaSeccionEnLaRejilla,
  claseDelMarcoDeLaSeccion,
  claseDelTitulo,
} from './clases-de-la-rejilla'
import { ItemDeHoja } from './item-de-hoja'
import { ContextoDelPar } from './par/contexto-del-par'

type Props = {
  seccion: Seccion
  contexto: ContextoDeHoja
  acciones: AccionesDeHoja
  // Sólo en la rejilla de las secciones de la hoja lleva sus columnas y filas: en el modal «Avanzado» (un `grid` sin pistas) un `col-span-12` crearía 11 de más.
  enLaRejilla?: boolean
  // Sin borde, fondo ni relleno: las secciones del modal «Avanzado».
  sinMarco?: boolean
  // Desde qué corte la rejilla de las secciones dibuja posiciones (`rejillaDeLasSecciones()`); sin él, la sección va en el flujo.
  corte?: Corte | 'siempre'
}

const posicionDelItem = (item: Item) => item.posicion

// Una sección de la hoja, con su título y sus ítems en orden de lectura (el DOM y el Tab siguen ese orden en todo ancho). Es su propio contenedor (`@container`):
// el ancho de sus celdas depende del ancho de la sección y no del de la pantalla, así el texto al 200 % colapsa solo a una columna. Con posiciones, desde el corte
// de su ítem más exigente cada uno va en su lugar y las filas vacías se respetan (`rejillaDeLosItems()`, con todos los ítems: lo que una condición apaga deja su
// fila en `auto`). Su aspecto (relleno, separación, densidad, letra, énfasis y tono) va en clases sobre los mismos nodos; con tono, `data-tono` lo pasa a sus
// celdas sin tono de grupo, a sus franjas y a sus chips.
export function SeccionDeHoja({
  seccion,
  contexto,
  acciones,
  enLaRejilla = false,
  sinMarco = false,
  corte,
}: Props) {
  const marco = claseDelMarcoDeLaSeccion(seccion, { sinMarco })
  const enPar = useContext(ContextoDelPar) !== null
  const rejilla = rejillaDeLosItems(seccion.items, { enPar })
  const corteDeLasCeldas = rejilla?.corte
  return (
    <section
      data-seccion={seccion.id}
      data-tono={seccion.tono}
      aria-label={seccion.titulo ?? undefined}
      className={enLaRejilla ? `${claseDeLaSeccionEnLaRejilla(seccion, corte)} ${marco}` : marco}
      style={enLaRejilla ? estiloDeLaSeccion(seccion, corte) : undefined}
    >
      {seccion.titulo === null ? null : (
        <h2 className={claseDelTitulo(seccion)}>{seccion.titulo}</h2>
      )}
      {/* Bajo `@lg` todo ítem ocupa las 12 pistas: sin huecos de columna, que al 200 % suman 11 × 0,75 rem y no caben en la sección del modal (4-44 b). */}
      <div
        className={claseDeLaRejillaDeCeldas(seccion, corteDeLasCeldas)}
        style={estiloDeLaRejillaDeCeldas(rejilla?.filas)}
      >
        {enOrdenDeLectura(seccion.items, posicionDelItem)
          .filter((item) => itemSeDibuja(item, contexto))
          .map((item, posicion) => (
            <ItemDeHoja
              key={`${item.tipo}:${item.nodo}:${posicion}`}
              item={item}
              contexto={contexto}
              acciones={acciones}
              corte={corteDeLasCeldas}
            />
          ))}
      </div>
    </section>
  )
}
