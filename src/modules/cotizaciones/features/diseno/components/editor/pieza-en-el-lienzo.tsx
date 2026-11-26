'use client'

import { useDraggable } from '@dnd-kit/core'
import type { ContextoDeHoja } from '../../../../entities/binding'
import { piezaDelItem, type ClaveDePieza } from '../../../../entities/diseno'
import { columnasDe } from '../../../../entities/diseno/ancho-de-la-pieza'
import type {
  PiezaDelLienzo,
  SeccionDelLienzo,
} from '../../../../entities/diseno/lienzo-de-la-hoja'
import {
  mismaPieza,
  piezaDelItemDeLaHoja,
  textoDeLaPieza,
  type PiezaDeLaHoja,
} from '../../../../entities/diseno/pieza-de-la-hoja'
import { estiloDelItem } from '../../../hoja/components/clases-de-la-posicion'
import { claseDelItem } from '../../../hoja/components/clases-de-la-rejilla'
import { ItemDeHoja } from '../../../hoja/components/item-de-hoja'
import { TotalDeHoja } from '../../../hoja/components/total-de-hoja'
import type { DatosDeLoQueSeArrastra } from '../../hooks/ids-del-lienzo'
import type { ApoyoDelLienzo } from '../../hooks/use-apoyo-del-lienzo'
import { useTeclasDeLaPieza } from '../../hooks/use-teclas-de-la-pieza'
import { ACCIONES_QUIETAS } from './acciones-quietas'
import { BordeDeAncho } from './borde-de-ancho'
import { MenuParaSumar } from './hueco-para-sumar'
import { A_TAMANO_REAL } from './marco-escalado'
import { MenuDeLaPieza } from './menu-de-la-pieza'

export const FILA_QUE_YA_NO_ESTA = 'Esta fila ya no está en la fórmula.'

type Props = {
  // Su id del arrastre.
  id: string
  pieza: PiezaDelLienzo
  seccion: SeccionDelLienzo
  apoyo: ApoyoDelLienzo
}

function Dibujo({ pieza, contexto }: { pieza: PiezaDelLienzo; contexto: ContextoDeHoja }) {
  const { dibujo } = pieza
  if (dibujo === null) {
    return (
      <p className="rounded-(--radius-md) border border-dashed border-(--color-peligro) p-3 text-(length:--text-sm) text-(--color-peligro-ink)">
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

type DeLaElegida = Omit<Props, 'id'> & {
  deLaHoja: PiezaDeLaHoja
  clave: ClaveDePieza
  nombre: string
}

// Lo que lleva la pieza elegida: su «⋯» (a la sección anterior o siguiente, Quitar), el borde de ancho y el «+» para sumar otra después de ella.
function DeLaElegida({ pieza, seccion, apoyo, deLaHoja, clave, nombre }: DeLaElegida) {
  return (
    <>
      <div
        className={`${A_TAMANO_REAL} absolute -top-3 right-1 z-20 rounded-(--radius-md) bg-(--color-surface) shadow-(--shadow-sm)`}
      >
        <MenuDeLaPieza
          nombre={nombre}
          ocupado={apoyo.ocupado}
          vecinas={{
            antes: apoyo.hayVecina(deLaHoja, -1),
            despues: apoyo.hayVecina(deLaHoja, 1),
            alMover: (paso) => {
              apoyo.moverALaVecina(deLaHoja, paso)
            },
          }}
          alQuitar={() => {
            apoyo.quitar(clave)
          }}
        />
      </div>
      <BordeDeAncho
        nombre={nombre}
        columnas={columnasDe(pieza.item)}
        ocupado={apoyo.ocupado}
        alCambiar={(n) => {
          apoyo.ponerColumnas(clave, n)
        }}
      />
      <div className="absolute -bottom-4 left-1/2 z-20 -translate-x-1/2">
        <MenuParaSumar
          etiqueta={`Sumar una pieza después de ${nombre}`}
          disparador="boton"
          ofertas={() => apoyo.ofertas(seccion.diseno)}
          ocupado={apoyo.ocupado}
          alSumar={(tipo, nodo) => {
            apoyo.sumar(seccion.id, pieza.item.posicion, tipo, nodo)
          }}
        />
      </div>
    </>
  )
}

function marcoDe(elegida: boolean, rechazada: boolean) {
  if (elegida) return 'outline-2 outline-offset-2 outline-(--color-primario)'
  if (rechazada) return 'outline-2 outline-offset-2 outline-(--color-peligro)'
  return 'hover:outline hover:outline-offset-2 hover:outline-(--color-line-strong)'
}

const ARRASTRA_UNA_PIEZA: DatosDeLoQueSeArrastra = { clase: 'pieza' }

// Una pieza del lienzo en su lugar de la rejilla de su sección: lo que dibuja la hoja (`inert`: ninguna XCell recibe el foco ni los clics) y encima el botón
// «Elegir «Precio»», que la elige con el clic o Enter y la mueve arrastrándola (la marca dice dónde cae). Elegida, lleva su «⋯», el borde de ancho, el «+» y
// las teclas: Alt+flechas la mueven una celda, Alt+Shift+←/→ cambian su ancho, Esc la suelta.
export function PiezaEnElLienzo({ id, pieza, seccion, apoyo }: Props) {
  const deLaHoja = piezaDelItemDeLaHoja(pieza.item)
  const texto = textoDeLaPieza(deLaHoja)
  const clave: ClaveDePieza = { ...piezaDelItem(pieza.item), seccion: seccion.id }
  const nombre = apoyo.nombrar(deLaHoja)
  const elegida = mismaPieza(apoyo.elegida, deLaHoja)
  const rechazo = apoyo.rechazo?.texto === texto ? apoyo.rechazo.mensaje : null
  const { setNodeRef, setActivatorNodeRef, listeners, isDragging } = useDraggable({
    id,
    data: ARRASTRA_UNA_PIEZA,
    disabled: apoyo.ocupado,
  })
  const teclas = useTeclasDeLaPieza({
    alMover: (direccion) => {
      apoyo.moverConTeclas(deLaHoja, direccion)
    },
    alCambiarAncho: (paso) => {
      apoyo.ponerColumnas(clave, columnasDe(pieza.item) + paso)
    },
    alSoltar: elegida
      ? () => {
          apoyo.elegir(null)
        }
      : null,
  })
  const corte = seccion.rejilla?.corte
  const lugar = pieza.dibujo ?? pieza.item
  return (
    <div
      ref={setNodeRef}
      data-pieza={texto}
      data-elegida={elegida ? '' : undefined}
      style={estiloDelItem(lugar, corte)}
      className={`${claseDelItem(lugar, corte)} relative min-w-0 rounded-(--radius-md) ${marcoDe(elegida, rechazo !== null)} ${isDragging ? 'opacity-50' : ''}`}
    >
      <div inert className="pointer-events-none [&>*]:h-full">
        <Dibujo pieza={pieza} contexto={apoyo.contexto} />
      </div>
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...listeners}
        aria-label={`Elegir ${nombre}`}
        aria-pressed={elegida}
        aria-describedby={rechazo === null ? undefined : `rechazo-${texto}`}
        data-elegir={texto}
        disabled={apoyo.ocupado}
        onClick={() => {
          apoyo.elegir(deLaHoja)
        }}
        onKeyDown={teclas}
        className="absolute inset-0 z-10 cursor-pointer touch-none rounded-(--radius-md) outline-none focus-visible:shadow-(--shadow-focus) disabled:cursor-wait"
      />
      {elegida ? (
        <DeLaElegida
          pieza={pieza}
          seccion={seccion}
          apoyo={apoyo}
          deLaHoja={deLaHoja}
          clave={clave}
          nombre={nombre}
        />
      ) : null}
      {rechazo === null ? null : (
        <p
          id={`rechazo-${texto}`}
          className="mt-1 text-(length:--text-sm) text-(--color-peligro-ink)"
        >
          {rechazo}
        </p>
      )}
    </div>
  )
}
