'use client'

// La vista previa del foco de una foto en el inspector del editor de artes: la foto entera, contenida en una caja de 3 × 2 que mide siempre
// lo mismo (cambiar de foto no corre nada), con un punto donde está el foco. Tocarla o arrastrar sobre ella pone el foco ahí; con el teclado,
// las flechas lo corren de a 5 % (de a 1 % con Mayús) sin mover la capa. Sin foto (el vehículo de ejemplo no la tiene), un marco punteado
// del mismo tamaño. La foto llega por la misma ruta que el lienzo (del mismo origen).
import Image from 'next/image'
import { useRef, type KeyboardEvent, type PointerEvent } from 'react'
import type { FocoDeLaFoto } from '../../../../entities/documento'
import { dondeSeVeLaFoto, focoConFlecha, focoEnElPunto } from '../../../../entities/editor/foco'
import type { FuenteDeImagen } from '../../../../entities/editor/fuente-de-la-capa'

type Props = {
  foco: FocoDeLaFoto
  fuente: FuenteDeImagen | null
  deshabilitado: boolean
  alCambiar: (foco: FocoDeLaFoto) => void
}

const por = (valor: number) => `${String(valor)}%`

export function VistaDelFoco({ foco, fuente, deshabilitado, alCambiar }: Props) {
  const arrastrando = useRef(false)
  const donde = dondeSeVeLaFoto(fuente?.medidas ?? null)

  const ponerDonde = (evento: PointerEvent<HTMLButtonElement>) => {
    const caja = evento.currentTarget.getBoundingClientRect()
    alCambiar(
      focoEnElPunto(
        { x: evento.clientX - caja.left, y: evento.clientY - caja.top },
        { ancho: caja.width, alto: caja.height },
      ),
    )
  }
  const alTeclear = (evento: KeyboardEvent<HTMLButtonElement>) => {
    const nuevo = focoConFlecha(foco, evento.key, evento.shiftKey)
    if (nuevo) {
      // Las flechas del editor mueven la capa elegida: acá mueven sólo el foco.
      evento.preventDefault()
      evento.stopPropagation()
      alCambiar(nuevo)
    }
  }

  return (
    <div className="relative aspect-[3/2] w-full overflow-hidden rounded-(--radius-md) bg-(--color-surface-2)">
      {fuente ? (
        <button
          type="button"
          aria-label="Elegir el foco de la foto"
          disabled={deshabilitado}
          className="absolute touch-none outline-none focus-visible:shadow-(--shadow-focus) enabled:cursor-crosshair disabled:opacity-60"
          style={{
            left: por(donde.izquierda),
            top: por(donde.arriba),
            width: por(donde.ancho),
            height: por(donde.alto),
          }}
          onPointerDown={(evento) => {
            if (evento.button !== 0) {
              return
            }
            evento.currentTarget.setPointerCapture(evento.pointerId)
            arrastrando.current = true
            ponerDonde(evento)
          }}
          onPointerMove={(evento) => {
            if (arrastrando.current) {
              ponerDonde(evento)
            }
          }}
          onPointerUp={() => {
            arrastrando.current = false
          }}
          onPointerCancel={() => {
            arrastrando.current = false
          }}
          onKeyDown={alTeclear}
        >
          <Image
            src={fuente.src}
            alt=""
            fill
            unoptimized
            sizes="256px"
            draggable={false}
            className="pointer-events-none select-none"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-(--color-paper) bg-(--color-primario) shadow-(--shadow-focus)"
            style={{ left: por(foco.x * 100), top: por(foco.y * 100) }}
          />
        </button>
      ) : (
        <div
          aria-hidden="true"
          className="absolute inset-0 rounded-(--radius-md) border border-dashed border-(--color-line-strong)"
        />
      )}
    </div>
  )
}
