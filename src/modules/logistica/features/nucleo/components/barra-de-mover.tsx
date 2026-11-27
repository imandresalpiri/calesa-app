'use client'

import { Button } from '@/shared/ui/button'
import { abrirHueco } from '../hooks/eventos-de-la-unidad'

// En el celular, «Mover» siempre a mano: una barra pegada abajo de la pantalla que lleva a «Qué falta» (lo abre, lo trae a la vista y le da el foco). Mide 44 px más su margen, menos de 80 px para no chocar
// con la burbuja del chat (`bottom-20`); `data-pie-de-panel` hace que los avisos suban sobre ella. Desde 56 rem de contenedor «Qué falta» está al costado y la barra se oculta
// por CSS (el mismo DOM en los dos anchos).
export function BarraDeMover() {
  return (
    <div
      data-pie-de-panel
      className="sticky bottom-0 z-10 -mx-4 mt-3 border-t border-(--color-line) bg-(--color-surface) px-4 py-2 @min-[56rem]/unidad:hidden"
    >
      <Button
        type="button"
        className="min-h-11 w-full"
        onClick={() => {
          abrirHueco('que-falta')
        }}
      >
        Mover
      </Button>
    </div>
  )
}
