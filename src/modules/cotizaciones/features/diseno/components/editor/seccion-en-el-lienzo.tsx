'use client'

import { useDraggable, useDroppable } from '@dnd-kit/core'
import { SECCION_SIN_TITULO } from '../../../../entities/diseno/anuncios-de-la-rejilla'
import type { SeccionDelLienzo } from '../../../../entities/diseno/lienzo-de-la-hoja'
import {
  mismaPieza,
  textoDeLaPieza,
  type PiezaDeLaHoja,
} from '../../../../entities/diseno/pieza-de-la-hoja'
import type { Corte } from '../../../../entities/rejilla-de-la-hoja'
import { estiloDeLaSeccion } from '../../../hoja/components/clases-de-la-posicion'
import {
  claseDeLaSeccionEnLaRejilla,
  claseDelMarcoDeLaSeccion,
  claseDelTitulo,
} from '../../../hoja/components/clases-de-la-rejilla'
import {
  idDeLaAvanzada,
  idDeLaRejilla,
  idDeLaSeccion,
  type DatosDeDondeCae,
} from '../../hooks/ids-del-lienzo'
import type { ApoyoDelLienzo } from '../../hooks/use-apoyo-del-lienzo'
import { useTeclasDeLaPieza } from '../../hooks/use-teclas-de-la-pieza'
import { MarcaEnLaRejilla } from './marca-en-la-rejilla'
import { A_TAMANO_REAL } from './marco-escalado'
import { MenuDeLaPieza } from './menu-de-la-pieza'
import { RejillaDeLaSeccionEnElLienzo } from './rejilla-de-la-seccion-en-el-lienzo'

type Props = {
  seccion: SeccionDelLienzo
  // Los ids del arrastre de sus piezas, en su orden.
  ids: readonly string[]
  // Una principal: desde qué corte la rejilla de las secciones dibuja posiciones.
  corte: Corte | 'siempre' | undefined
  apoyo: ApoyoDelLienzo
}

const CAE_UNA_PIEZA: DatosDeDondeCae = { acepta: 'pieza' }
const CAE_UNA_AVANZADA: DatosDeDondeCae = { acepta: 'avanzada' }

function marcoDe(elegida: boolean, rechazada: boolean) {
  if (elegida) return 'outline-2 outline-offset-2 outline-(--color-primario)'
  if (rechazada) return 'outline-2 outline-offset-2 outline-(--color-peligro)'
  return 'hover:outline hover:outline-offset-2 hover:outline-(--color-line-strong)'
}

type Estado = { elegida: boolean; rechazada: boolean; arrastrada: boolean }

// En la rejilla de las secciones (una principal) lleva su ancho y su lugar; una avanzada va a lo ancho de su bloque.
function claseDeLaSeccion(
  seccion: SeccionDelLienzo,
  corte: Props['corte'],
  { elegida, rechazada, arrastrada }: Estado,
) {
  return [
    seccion.presentacion === 'principal' ? claseDeLaSeccionEnLaRejilla(seccion, corte) : '',
    claseDelMarcoDeLaSeccion(seccion, { sinMarco: false }),
    'relative',
    marcoDe(elegida, rechazada),
    arrastrada ? 'opacity-50' : '',
  ].join(' ')
}

function Cabeza({
  seccion,
  texto,
  rechazo,
}: {
  seccion: SeccionDelLienzo
  texto: string
  rechazo: string | null
}) {
  return (
    <>
      {seccion.titulo === null ? null : (
        <h2 className={`${claseDelTitulo(seccion)} pointer-events-none relative`}>
          {seccion.titulo}
        </h2>
      )}
      {rechazo === null ? null : (
        <p
          id={`rechazo-${texto}`}
          className="pointer-events-none relative mb-2 text-(length:--text-sm) text-(--color-peligro-ink)"
        >
          {rechazo}
        </p>
      )}
    </>
  )
}

function MenuDeLaSeccion({ seccion, apoyo }: Pick<Props, 'seccion' | 'apoyo'>) {
  return (
    <div
      className={`${A_TAMANO_REAL} absolute -top-3 right-2 z-20 rounded-(--radius-md) bg-(--color-surface) shadow-(--shadow-sm)`}
    >
      <MenuDeLaPieza
        nombre={`la sección «${seccion.titulo ?? SECCION_SIN_TITULO}»`}
        ocupado={apoyo.ocupado}
        alQuitar={() => {
          apoyo.quitarSeccion(seccion.id)
        }}
        quitar={{ etiqueta: 'Quitar la sección', motivo: apoyo.motivoParaQuitarSeccion }}
      />
    </div>
  )
}

// Lo que se arrastra y donde cae de una sección: ella misma (una principal en la rejilla de las secciones, una avanzada sobre otra), la rejilla de sus piezas y,
// si es avanzada, ella como lugar donde cae otra avanzada (no mientras se arrastra ella).
function useArrastreDeLaSeccion(seccion: SeccionDelLienzo, apoyo: ApoyoDelLienzo) {
  const avanzada = seccion.presentacion === 'avanzado'
  const id = idDeLaSeccion(seccion.id)
  const arrastre = useDraggable({
    id,
    data: { clase: avanzada ? 'avanzada' : 'principal' },
    disabled: apoyo.ocupado,
  })
  const rejilla = useDroppable({ id: idDeLaRejilla(seccion.id), data: CAE_UNA_PIEZA })
  const otraAvanzada = useDroppable({
    id: idDeLaAvanzada(seccion.id),
    data: CAE_UNA_AVANZADA,
    disabled: !avanzada || apoyo.activo === id,
  })
  return {
    ...arrastre,
    setNodeRef: (el: HTMLElement | null) => {
      arrastre.setNodeRef(el)
      otraAvanzada.setNodeRef(el)
    },
    setRejillaRef: rejilla.setNodeRef,
  }
}

// Una sección del lienzo, con el marco, el ancho, el lugar y el color con que la dibuja la hoja (`SeccionDeHoja`). Todo su fondo es el botón «Elegir la sección
// «X»» (que la elige y, arrastrado, la mueve: la marca dice dónde cae); encima, el título y la rejilla de sus piezas, que dejan pasar el clic salvo en cada pieza.
// Elegida, su «⋯» (Quitar la sección) y Alt+flechas (una celda; una avanzada, un lugar de su lista).
export function SeccionEnElLienzo({ seccion, ids, corte, apoyo }: Props) {
  const { setNodeRef, setActivatorNodeRef, listeners, isDragging, setRejillaRef } =
    useArrastreDeLaSeccion(seccion, apoyo)
  const pieza: PiezaDeLaHoja = { pieza: 'seccion', seccion: seccion.id }
  const texto = textoDeLaPieza(pieza)
  const elegida = mismaPieza(apoyo.elegida, pieza)
  const rechazo = apoyo.rechazo?.texto === texto ? apoyo.rechazo.mensaje : null
  const teclas = useTeclasDeLaPieza({
    alMover: (direccion) => {
      apoyo.moverConTeclas(pieza, direccion)
    },
    alCambiarAncho: null,
    alSoltar: elegida
      ? () => {
          apoyo.elegir(null)
        }
      : null,
  })
  return (
    <section
      ref={setNodeRef}
      data-seccion={seccion.id}
      data-tono={seccion.tono}
      data-pieza={texto}
      data-elegida={elegida ? '' : undefined}
      aria-label={seccion.titulo ?? SECCION_SIN_TITULO}
      style={seccion.presentacion === 'principal' ? estiloDeLaSeccion(seccion, corte) : undefined}
      className={claseDeLaSeccion(seccion, corte, {
        elegida,
        rechazada: rechazo !== null,
        arrastrada: isDragging,
      })}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...listeners}
        aria-label={`Elegir la sección «${seccion.titulo ?? SECCION_SIN_TITULO}»`}
        aria-pressed={elegida}
        aria-describedby={rechazo === null ? undefined : `rechazo-${texto}`}
        data-elegir={texto}
        disabled={apoyo.ocupado}
        onClick={() => {
          apoyo.elegir(pieza)
        }}
        onKeyDown={teclas}
        className="absolute inset-0 z-0 cursor-pointer touch-none rounded-[inherit] outline-none focus-visible:shadow-(--shadow-focus) disabled:cursor-wait"
      />
      <Cabeza seccion={seccion} texto={texto} rechazo={rechazo} />
      <RejillaDeLaSeccionEnElLienzo
        seccion={seccion}
        ids={ids}
        apoyo={apoyo}
        setNodeRef={setRejillaRef}
      />
      {elegida ? <MenuDeLaSeccion seccion={seccion} apoyo={apoyo} /> : null}
      <MarcaEnLaRejilla marca={apoyo.marca} en={idDeLaAvanzada(seccion.id)} />
    </section>
  )
}
