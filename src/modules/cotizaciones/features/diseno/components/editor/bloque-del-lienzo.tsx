'use client'

import { useDraggable } from '@dnd-kit/core'
import type { ReactNode } from 'react'
import {
  mismaPieza,
  textoDeLaPieza,
  type PiezaDeLaHoja,
} from '../../../../entities/diseno/pieza-de-la-hoja'
import type { RejillaDeLasSecciones } from '../../../../entities/posiciones-de-la-hoja'
import { estiloDelBloque } from '../../../hoja/components/clases-de-la-posicion'
import { claseDelBloque } from '../../../hoja/components/clases-de-la-rejilla'
import { ID_DEL_BLOQUE, type DatosDeLoQueSeArrastra } from '../../hooks/ids-del-lienzo'
import type { ApoyoDelLienzo } from '../../hooks/use-apoyo-del-lienzo'
import { useTeclasDeLaPieza } from '../../hooks/use-teclas-de-la-pieza'

export const DETRAS_DEL_AVANZADO = 'Detrás del botón «Avanzado» de la hoja:'

type Props = {
  rejilla: RejillaDeLasSecciones | null
  // Si el diseño dice la fila del bloque (`avanzado.fila`): sólo entonces se mueve.
  enSuFila: boolean
  // La tarjeta del total suelta (sin la pieza en una sección), o nada.
  totalSuelto: ReactNode
  // Las secciones avanzadas, ya dibujadas.
  avanzadas: ReactNode[]
  apoyo: ApoyoDelLienzo
}

const BLOQUE: PiezaDeLaHoja = { pieza: 'bloque-avanzado' }
const ARRASTRA_UNA_PRINCIPAL: DatosDeLoQueSeArrastra = { clase: 'principal' }

// El bloque «Avanzado» del lienzo (docs/GLOSARIO.md › «Bloque del avanzado»): la fila entera de la rejilla de las secciones con la tarjeta del total suelta y
// las secciones que van detrás de «Avanzado», como en la hoja. Su fondo es el botón «Elegir el bloque «Avanzado»»: con su fila en el diseño, arrastrarlo o
// Alt+↑/↓ lo llevan a otra fila entera libre.
export function BloqueDelLienzo({ rejilla, enSuFila, totalSuelto, avanzadas, apoyo }: Props) {
  const texto = textoDeLaPieza(BLOQUE)
  const elegida = mismaPieza(apoyo.elegida, BLOQUE)
  const { setNodeRef, setActivatorNodeRef, listeners, isDragging } = useDraggable({
    id: ID_DEL_BLOQUE,
    data: ARRASTRA_UNA_PRINCIPAL,
    disabled: apoyo.ocupado || !enSuFila,
  })
  const teclas = useTeclasDeLaPieza({
    alMover: (direccion) => {
      apoyo.moverConTeclas(BLOQUE, direccion)
    },
    // Ocupa la fila entera: Alt+Shift+flechas sólo lo dicen.
    alCambiarTamano: (lado, paso) => {
      apoyo.cambiarTamanoUnPaso(BLOQUE, lado, paso)
    },
    alSoltar: elegida
      ? () => {
          apoyo.elegir(null)
        }
      : null,
  })
  const corte = rejilla?.corte
  const marco = elegida
    ? 'outline-2 outline-offset-2 outline-(--color-primario)'
    : 'hover:outline hover:outline-offset-2 hover:outline-(--color-line-strong)'
  return (
    <div
      ref={setNodeRef}
      data-bloque-del-avanzado=""
      data-pieza={texto}
      data-elegida={elegida ? '' : undefined}
      style={rejilla === null ? undefined : estiloDelBloque(rejilla.filaDelBloque, corte)}
      className={`${claseDelBloque(corte)} relative rounded-(--radius-card) ${marco} ${isDragging ? 'opacity-50' : ''}`}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...listeners}
        aria-label="Elegir el bloque «Avanzado»"
        aria-pressed={elegida}
        data-elegir={texto}
        disabled={apoyo.ocupado}
        onClick={() => {
          apoyo.elegir(BLOQUE)
        }}
        onKeyDown={teclas}
        className="absolute inset-0 z-0 cursor-pointer touch-none rounded-[inherit] outline-none focus-visible:shadow-(--shadow-focus) disabled:cursor-wait"
      />
      {totalSuelto === null ? null : (
        <div className="relative col-span-12 min-w-0">{totalSuelto}</div>
      )}
      {avanzadas.length === 0 ? null : (
        <div
          data-avanzadas=""
          className="pointer-events-none relative col-span-12 grid min-w-0 gap-3 rounded-(--radius-card) border border-dashed border-(--color-line-strong) p-3 [&>section]:pointer-events-auto"
        >
          <p className="text-(length:--text-sm) text-(--color-ink-soft)">{DETRAS_DEL_AVANZADO}</p>
          {avanzadas}
        </div>
      )}
    </div>
  )
}
