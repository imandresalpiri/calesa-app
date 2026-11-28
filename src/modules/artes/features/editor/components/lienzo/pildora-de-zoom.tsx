'use client'

import { Button } from '@/shared/ui/button'
import { textoDelZoom } from '../../../../entities/editor/camara'
import type { CamaraDelEditor } from '../../tipos'

// Abajo a la derecha del lienzo: cuánto se acerca y los dos atajos de la cámara.
export function PildoraDeZoom({ camara }: { camara: CamaraDelEditor }) {
  return (
    <div className="absolute right-3 bottom-3 z-10 flex items-center gap-1 rounded-full border border-(--color-line) bg-(--color-surface) py-0.5 pr-1 pl-3 text-sm shadow-(--shadow-md)">
      <span className="min-w-[4ch] text-right tabular-nums">
        {textoDelZoom(camara.camara.escala)}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="rounded-full"
        onClick={camara.ajustar}
      >
        Ajustar
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="rounded-full"
        onClick={camara.alCien}
      >
        100 %
      </Button>
    </div>
  )
}
