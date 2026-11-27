'use client'

import { posicionEnPx, type Punto, type Tamano } from '../../../entities/ventana-de-camara'

type Props = {
  nombre: string
  referencia: (elemento: HTMLButtonElement | null) => void
  // El lugar guardado de la ventana (% del espacio libre): la píldora queda en el mismo.
  porcentaje: Punto
  navegador: Tamano
  // Lo que mide la píldora ahora (la medida de lo observado).
  medida: Tamano
  alAbrir: () => void
}

// La ventana minimizada: «EN VIVO · <nombre>», en el mismo lugar. Un toque la vuelve a abrir.
export function PildoraDeLaVentana({
  nombre,
  referencia,
  porcentaje,
  navegador,
  medida,
  alAbrir,
}: Props) {
  const posicion = posicionEnPx(porcentaje, medida, navegador)
  return (
    <button
      ref={referencia}
      type="button"
      data-ventana-de-camara=""
      data-minimizada=""
      aria-label={`Abrir la ventana de cámara${nombre ? ` de ${nombre}` : ''}`}
      onClick={alAbrir}
      style={{ position: 'fixed', left: posicion.x, top: posicion.y }}
      className="z-40 flex max-w-[calc(100vw-24px)] items-center gap-2 rounded-(--radius-pill) border border-(--color-line-strong) bg-(--color-surface) px-3 py-1.5 text-(length:--text-xs) font-semibold text-(--color-ink) shadow-(--shadow-md) outline-none focus-visible:ring-2 focus-visible:ring-(--color-primario)"
    >
      <span className="punto-en-vivo text-(--color-peligro)" aria-hidden />
      <span className="truncate">EN VIVO{nombre ? ` · ${nombre}` : ''}</span>
    </button>
  )
}
