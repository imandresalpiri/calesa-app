'use client'

import { COLUMNAS_DE_LA_REJILLA } from '../../../../entities/diseno'
import { textoDeLasColumnas } from '../../../../entities/diseno/ancho-de-la-pieza'
import { useAnchoConBorde } from '../../hooks/use-ancho-con-borde'

type Props = {
  nombre: string
  columnas: number
  ocupado: boolean
  alCambiar: (columnas: number) => void
}

// El borde derecho de la pieza elegida: se arrastra para cambiar su ancho en columnas (un blanco de 44 px; mientras se arrastra, «6/12» a la vista). Fuera del
// orden del Tab: con el teclado, Alt+← y Alt+→ sobre la pieza.
export function BordeDeAncho({ nombre, columnas, ocupado, alCambiar }: Props) {
  const borde = useAnchoConBorde(columnas, alCambiar)
  const mostradas = borde.columnas ?? columnas
  return (
    <button
      type="button"
      tabIndex={-1}
      aria-label={`Ancho de ${nombre}: ${String(columnas)} de ${String(COLUMNAS_DE_LA_REJILLA)} columnas`}
      data-borde-de-ancho=""
      disabled={ocupado}
      onPointerDown={borde.alBajar}
      onPointerMove={borde.alMover}
      onPointerUp={borde.alSubir}
      onPointerCancel={borde.cancelar}
      onKeyDown={borde.alTeclear}
      className="group absolute inset-y-0 -right-[22px] z-20 flex w-[44px] cursor-ew-resize touch-none items-center justify-center outline-none disabled:cursor-wait"
    >
      <span aria-hidden className="h-8 w-1.5 rounded-full bg-(--color-accent) group-hover:h-10" />
      {borde.columnas === null ? null : (
        <span
          role="status"
          data-columnas-del-borde=""
          className="absolute -top-7 rounded-(--radius-sm) bg-(--color-ink) px-1.5 py-0.5 text-(length:--text-xs) whitespace-nowrap text-(--color-paper) tabular-nums"
        >
          {textoDeLasColumnas(mostradas)}
        </span>
      )}
    </button>
  )
}
