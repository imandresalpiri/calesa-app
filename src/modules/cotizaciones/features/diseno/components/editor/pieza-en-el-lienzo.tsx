'use client'

import { useSortable } from '@dnd-kit/sortable'
import type { ReactNode } from 'react'
import type { ContextoDeHoja } from '../../../../entities/binding'
import type { ClaveDePieza } from '../../../../entities/diseno'
import { columnasDe } from '../../../../entities/diseno/ancho-de-la-pieza'
import type { PiezaDelLienzo } from '../../../../entities/diseno/lienzo-de-la-hoja'
import { claseDelItem } from '../../../hoja/components/clases-de-la-rejilla'
import { ItemDeHoja } from '../../../hoja/components/item-de-hoja'
import { TotalDeHoja } from '../../../hoja/components/total-de-hoja'
import { useTeclasDeLaPieza } from '../../hooks/use-teclas-de-la-pieza'
import { ACCIONES_QUIETAS } from './acciones-quietas'
import { BordeDeAncho } from './borde-de-ancho'
import { A_TAMANO_REAL } from './marco-escalado'
import { MenuDeLaPieza } from './menu-de-la-pieza'

export const FILA_QUE_YA_NO_ESTA = 'Esta fila ya no está en la fórmula.'

type Props = {
  id: string
  // Su `?pieza=` (`data-pieza` y `data-elegir`: el foco vuelve a ella tras moverla con el teclado).
  texto: string
  pieza: PiezaDelLienzo
  clave: ClaveDePieza
  nombre: string
  contexto: ContextoDeHoja
  elegida: boolean
  // El mensaje del rechazo que apunta a esta pieza; nulo si no.
  rechazo: string | null
  // Dónde cae lo que se arrastra, si es aquí: antes o después de esta pieza.
  destino: 'antes' | 'despues' | null
  ocupado: boolean
  puedeMover: { antes: boolean; despues: boolean }
  alElegir: () => void
  alSoltar: () => void
  alMover: (paso: -1 | 1) => void
  alPonerColumnas: (columnas: number) => void
  alQuitar: () => void
  // El «+» para sumar una pieza después de esta (sólo la elegida).
  sumarDespues: ReactNode
}

const MARCA: Record<'antes' | 'despues', string> = {
  antes:
    'before:absolute before:inset-y-0 before:-left-1 before:w-1 before:rounded-full before:bg-(--color-accent)',
  despues:
    'after:absolute after:inset-y-0 after:-right-1 after:w-1 after:rounded-full after:bg-(--color-accent)',
}

function Dibujo({ pieza, contexto }: Pick<Props, 'pieza' | 'contexto'>) {
  const { dibujo } = pieza
  if (dibujo === null) {
    return (
      <p className="rounded-(--radius-md) border border-dashed border-(--color-danger) p-3 text-(length:--text-sm) text-(--color-danger)">
        {FILA_QUE_YA_NO_ESTA}
      </p>
    )
  }
  // La tarjeta del total se ve a todo ancho de la vista (en la hoja, el celular la deja al pie): aquí se elige y se mueve.
  return dibujo.tipo === 'total' ? (
    <TotalDeHoja item={dibujo} contexto={contexto} />
  ) : (
    <ItemDeHoja item={dibujo} contexto={contexto} acciones={ACCIONES_QUIETAS} />
  )
}

// Una pieza del lienzo: lo que dibuja la hoja (`inert`: ninguna XCell recibe el foco ni los clics) y encima el botón «Elegir «Precio»», que la elige con el clic o
// Enter y la mueve arrastrándola. Elegida, lleva su «⋯» (Mover antes, Mover después, Quitar), el borde de ancho y las teclas Alt+flechas.
export function PiezaEnElLienzo(props: Props) {
  const { id, texto, pieza, nombre, elegida, rechazo, destino, ocupado } = props
  const { setNodeRef, setActivatorNodeRef, listeners, isDragging } = useSortable({
    id,
    disabled: ocupado,
  })
  const teclas = useTeclasDeLaPieza({
    alCambiarAncho: (paso) => {
      props.alPonerColumnas(columnasDe(pieza.item) + paso)
    },
    alMover: props.alMover,
    alSoltar: elegida ? props.alSoltar : null,
  })
  const lugar = pieza.dibujo === null ? 'col-span-12' : claseDelItem(pieza.dibujo)
  const marco = elegida
    ? 'outline-2 outline-offset-2 outline-(--color-accent)'
    : rechazo !== null
      ? 'outline-2 outline-offset-2 outline-(--color-danger)'
      : 'hover:outline hover:outline-offset-2 hover:outline-(--color-line-strong)'
  return (
    <div
      ref={setNodeRef}
      data-pieza={texto}
      data-elegida={elegida ? '' : undefined}
      data-destino={destino ?? undefined}
      className={`${lugar} relative min-w-0 rounded-(--radius-md) ${marco} ${destino === null ? '' : MARCA[destino]} ${isDragging ? 'opacity-50' : ''}`}
    >
      <div inert className="pointer-events-none [&>*]:h-full">
        <Dibujo pieza={pieza} contexto={props.contexto} />
      </div>
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...listeners}
        aria-label={`Elegir ${nombre}`}
        aria-pressed={elegida}
        aria-describedby={rechazo === null ? undefined : `rechazo-${texto}`}
        data-elegir={texto}
        disabled={ocupado}
        onClick={props.alElegir}
        onKeyDown={teclas}
        className="absolute inset-0 z-10 cursor-pointer touch-none rounded-(--radius-md) outline-none focus-visible:shadow-(--shadow-focus) disabled:cursor-wait"
      />
      {elegida ? (
        <>
          <div
            className={`${A_TAMANO_REAL} absolute -top-3 right-1 z-20 rounded-(--radius-md) bg-(--color-surface) shadow-(--shadow-sm)`}
          >
            <MenuDeLaPieza
              nombre={nombre}
              puedeMover={props.puedeMover}
              ocupado={ocupado}
              alMover={props.alMover}
              alQuitar={props.alQuitar}
            />
          </div>
          <BordeDeAncho
            nombre={nombre}
            columnas={columnasDe(pieza.item)}
            ocupado={ocupado}
            alCambiar={props.alPonerColumnas}
          />
          <div className="absolute -bottom-4 left-1/2 z-20 -translate-x-1/2">
            {props.sumarDespues}
          </div>
        </>
      ) : null}
      {rechazo === null ? null : (
        <p id={`rechazo-${texto}`} className="mt-1 text-(length:--text-sm) text-(--color-danger)">
          {rechazo}
        </p>
      )}
    </div>
  )
}
