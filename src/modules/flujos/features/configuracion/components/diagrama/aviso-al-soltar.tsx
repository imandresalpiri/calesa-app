'use client'

import type { Punto } from '../../../../entities/disposicion-del-diagrama'

type Props = { aviso: { texto: string; en: Punto } | null }

// Por qué no se creó la salida, junto al punto donde se soltó el asa (relativo al lienzo), durante 5 s (`useVincular`).
export function AvisoAlSoltar({ aviso }: Props) {
  return (
    <div role="status" className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
      {aviso ? (
        <p
          style={{ left: aviso.en.x, top: aviso.en.y }}
          className="absolute mt-3 max-w-[18rem] -translate-x-1/2 rounded-(--radius-sm) border border-(--color-aviso) bg-(--color-aviso-soft) px-2 py-1 text-(length:--text-sm) text-(--color-aviso-ink) shadow-(--shadow-sm)"
        >
          {aviso.texto}
        </p>
      ) : null}
    </div>
  )
}
