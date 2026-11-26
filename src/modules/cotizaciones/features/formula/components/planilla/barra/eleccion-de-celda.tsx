'use client'

import { MousePointerClickIcon } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { avisar } from '@/shared/ui/toasts'
import type { EleccionDeCelda } from '../../../hooks/use-eleccion-de-celda'

export const NOMBRE_DE_ELEGIR = 'Elegir celda'

const BOTON = 'min-h-[44px] shrink-0'

// «Elegir celda» y, eligiendo, «Cancelar» (D17 de la fórmula fácil): sólo con un puntero grueso (el celular), donde el teclado tapa la cuadrícula. Apagado si
// el cursor no espera una celda, dice por qué al tocarlo.
export function EleccionDeCeldaEnElRenglon({ eligiendo }: { eligiendo: EleccionDeCelda }) {
  if (!eligiendo.enC) return null
  const { motivo, activo } = eligiendo
  return (
    <div className="ml-auto hidden shrink-0 items-center gap-1 pointer-coarse:flex">
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-pressed={activo}
        title={motivo ?? NOMBRE_DE_ELEGIR}
        {...(motivo === null ? {} : { 'aria-disabled': true })}
        className={motivo === null ? BOTON : `${BOTON} cursor-not-allowed opacity-60`}
        onClick={() => {
          if (motivo !== null) avisar(motivo)
          else if (activo) eligiendo.salir()
          else eligiendo.entrar()
        }}
      >
        <MousePointerClickIcon aria-hidden />
        {NOMBRE_DE_ELEGIR}
      </Button>
      {activo ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={BOTON}
          onClick={() => {
            eligiendo.salir()
          }}
        >
          Cancelar
        </Button>
      ) : null}
    </div>
  )
}
