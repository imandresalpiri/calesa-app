'use client'

import { SortableContext, useSortable } from '@dnd-kit/sortable'
import type { ClaveDePieza } from '../../../../entities/diseno'
import type { SeccionDelLienzo } from '../../../../entities/diseno/lienzo-de-la-hoja'
import {
  mismaPieza,
  piezaDelItemDeLaHoja,
  textoDeLaPieza,
  type PiezaDeLaHoja,
} from '../../../../entities/diseno/pieza-de-la-hoja'
import { piezaDelItem } from '../../../../entities/diseno'
import {
  claseDeLaRejillaDeCeldas,
  claseDeLaSeccionEnLaRejilla,
  claseDelMarcoDeLaSeccion,
  claseDelTitulo,
} from '../../../hoja/components/clases-de-la-rejilla'
import { idDeLaSeccion, idDelFin } from '../../hooks/ids-del-lienzo'
import { useTeclasDeLaPieza } from '../../hooks/use-teclas-de-la-pieza'
import type { ApoyoDelLienzo } from '../../hooks/use-apoyo-del-lienzo'
import { HuecoParaSumar, MenuParaSumar } from './hueco-para-sumar'
import { caeAlFinal, marcaDeSoltar, type MarcaDeSoltar } from './marca-de-soltar'
import { A_TAMANO_REAL } from './marco-escalado'
import { MenuDeLaPieza } from './menu-de-la-pieza'
import { PiezaEnElLienzo } from './pieza-en-el-lienzo'

type Props = {
  seccion: SeccionDelLienzo
  // Los ids del arrastre de sus piezas, en su orden.
  ids: readonly string[]
  // Si la sección puede ir antes o después (Alt+↑/↓ y su «⋯»).
  puedeMoverse: { antes: boolean; despues: boolean }
  // Dónde cae la sección que se arrastra, si es sobre esta.
  marca: MarcaDeSoltar
  apoyo: ApoyoDelLienzo
}

export const SIN_TITULO = 'Sección sin título'

const MARCA_DE_SECCION: Record<'antes' | 'despues', string> = {
  antes: 'shadow-[0_-4px_0_0_var(--color-accent)]',
  despues: 'shadow-[0_4px_0_0_var(--color-accent)]',
}

function marcoDe(elegida: boolean, rechazada: boolean) {
  if (elegida) return 'outline-2 outline-offset-2 outline-(--color-accent)'
  if (rechazada) return 'outline-2 outline-offset-2 outline-(--color-danger)'
  return 'hover:outline hover:outline-offset-2 hover:outline-(--color-line-strong)'
}

type Estado = { elegida: boolean; rechazada: boolean; marca: MarcaDeSoltar; arrastrada: boolean }

// En la rejilla de las secciones (una principal) lleva su ancho; una avanzada va a lo ancho de su bloque.
function claseDeLaSeccion(
  seccion: SeccionDelLienzo,
  { elegida, rechazada, marca, arrastrada }: Estado,
) {
  return [
    seccion.presentacion === 'principal' ? claseDeLaSeccionEnLaRejilla(seccion) : '',
    claseDelMarcoDeLaSeccion(seccion, { sinMarco: false }),
    'relative',
    marcoDe(elegida, rechazada),
    marca === null ? '' : MARCA_DE_SECCION[marca],
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
          className="pointer-events-none relative mb-2 text-(length:--text-sm) text-(--color-danger)"
        >
          {rechazo}
        </p>
      )}
    </>
  )
}

function MenuDeLaSeccion({
  seccion,
  nombre,
  puedeMoverse,
  apoyo,
}: Pick<Props, 'seccion' | 'puedeMoverse' | 'apoyo'> & { nombre: string }) {
  return (
    <div
      className={`${A_TAMANO_REAL} absolute -top-3 right-2 z-20 rounded-(--radius-md) bg-(--color-surface) shadow-(--shadow-sm)`}
    >
      <MenuDeLaPieza
        nombre={`la sección «${nombre}»`}
        puedeMover={puedeMoverse}
        ocupado={apoyo.ocupado}
        alMover={(paso) => {
          apoyo.moverSeccion(seccion.id, paso)
        }}
        alQuitar={() => {
          apoyo.quitarSeccion(seccion.id)
        }}
        quitar={{ etiqueta: 'Quitar la sección', motivo: apoyo.motivoParaQuitarSeccion }}
      />
    </div>
  )
}

// Las piezas de la sección, con la marca de lo que se arrastra y, tras la elegida, un «+» para sumar ahí.
function Piezas({ seccion, ids, apoyo }: Pick<Props, 'seccion' | 'ids' | 'apoyo'>) {
  return seccion.piezas.map((pieza, indice) => {
    const id = ids[indice] ?? `${seccion.id}:${String(indice)}`
    const clave: ClaveDePieza = { ...piezaDelItem(pieza.item), seccion: seccion.id }
    const deLaHoja = piezaDelItemDeLaHoja(pieza.item)
    const texto = textoDeLaPieza(deLaHoja)
    const elegida = mismaPieza(apoyo.elegida, deLaHoja)
    const nombre = apoyo.nombreDe(clave)
    return (
      <PiezaEnElLienzo
        key={id}
        id={id}
        texto={texto}
        pieza={pieza}
        clave={clave}
        nombre={nombre}
        contexto={apoyo.contexto}
        elegida={elegida}
        rechazo={apoyo.rechazo?.texto === texto ? apoyo.rechazo.mensaje : null}
        destino={marcaDeSoltar(apoyo.destino, apoyo.activo, seccion.id, indice)}
        ocupado={apoyo.ocupado}
        puedeMover={apoyo.puedeMover(clave)}
        alElegir={() => {
          apoyo.elegir(deLaHoja)
        }}
        alSoltar={() => {
          apoyo.elegir(null)
        }}
        alMover={(paso) => {
          apoyo.moverUnPaso(clave, paso)
        }}
        alPonerColumnas={(n) => {
          apoyo.ponerColumnas(clave, n)
        }}
        alQuitar={() => {
          apoyo.quitar(clave)
        }}
        sumarDespues={
          elegida ? (
            <MenuParaSumar
              etiqueta={`Sumar una pieza después de ${nombre}`}
              disparador="boton"
              ofertas={() => apoyo.ofertas(seccion.diseno)}
              ocupado={apoyo.ocupado}
              alSumar={(tipo, nodo) => {
                apoyo.sumar(seccion.id, indice + 1, tipo, nodo)
              }}
            />
          ) : null
        }
      />
    )
  })
}

// Una sección del lienzo, con el marco, el ancho y el color con que la dibuja la hoja (`SeccionDeHoja`). Todo su fondo es el botón «Elegir la sección «X»» (que
// la elige y, arrastrado, la ordena); encima, el título y la rejilla de sus piezas, que dejan pasar el clic salvo en cada pieza. Elegida, su «⋯» (Mover antes,
// Mover después, Quitar la sección) y Alt+↑/↓. Al final, el «+» («Sumar una pieza aquí»), donde cae también lo que se suelta al final.
export function SeccionEnElLienzo({ seccion, ids, puedeMoverse, marca, apoyo }: Props) {
  const { setNodeRef, setActivatorNodeRef, listeners, isDragging } = useSortable({
    id: idDeLaSeccion(seccion.id),
    disabled: apoyo.ocupado,
  })
  const pieza: PiezaDeLaHoja = { pieza: 'seccion', seccion: seccion.id }
  const texto = textoDeLaPieza(pieza)
  const elegida = mismaPieza(apoyo.elegida, pieza)
  const rechazo = apoyo.rechazo?.texto === texto ? apoyo.rechazo.mensaje : null
  const nombre = seccion.titulo ?? SIN_TITULO
  const teclas = useTeclasDeLaPieza({
    alCambiarAncho: null,
    alMover: (paso) => {
      apoyo.moverSeccion(seccion.id, paso)
    },
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
      aria-label={nombre}
      className={claseDeLaSeccion(seccion, {
        elegida,
        rechazada: rechazo !== null,
        marca,
        arrastrada: isDragging,
      })}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...listeners}
        aria-label={`Elegir la sección «${nombre}»`}
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
      <div
        data-rejilla-de-celdas=""
        className={`${claseDeLaRejillaDeCeldas(seccion)} pointer-events-none relative [&>*]:pointer-events-auto`}
      >
        <SortableContext items={[...ids]}>
          <Piezas seccion={seccion} ids={ids} apoyo={apoyo} />
        </SortableContext>
        <HuecoParaSumar
          idDelFin={idDelFin(seccion.id)}
          destino={caeAlFinal(apoyo.destino, seccion.id, seccion.piezas.length)}
          ofertas={() => apoyo.ofertas(seccion.diseno)}
          ocupado={apoyo.ocupado}
          alSumar={(tipo, nodo) => {
            apoyo.sumar(seccion.id, seccion.piezas.length, tipo, nodo)
          }}
        />
      </div>
      {elegida ? (
        <MenuDeLaSeccion
          seccion={seccion}
          nombre={nombre}
          puedeMoverse={puedeMoverse}
          apoyo={apoyo}
        />
      ) : null}
    </section>
  )
}
