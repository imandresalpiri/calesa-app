'use client'

import { ArrowRightToLineIcon } from 'lucide-react'
import { cn } from 'cn'
import { Button } from '@/shared/ui/button'
import { firmaEnTexto } from '../../../../../entities/formula/firma-en-el-cursor'
import type { Planilla } from '../../../hooks/use-planilla'
import { idsDeLaEdicion } from '../ids-de-la-edicion'
import { RENGLON_BAJO_LA_BARRA } from './linea-bajo-la-barra'

export const GUIA_DE_TOCAR = 'Toca una celda para usarla.'
export const NOMBRE_DE_SIGUIENTE = 'Ir al siguiente lugar'

// El renglón bajo la barra mientras se escribe (el mismo, reservado, de la línea de la fila elegida: nada salta al entrar o salir de la edición). Dentro de una
// función, su firma con el valor que se escribe en negrita («SI(condición; **si se cumple**; si no)»); si el cursor espera un operando, que tocar una celda la
// usa. Un texto largo se corta con «…» y se lee entero en su `title`. A la derecha, con lugares por llenar de una operación rápida, «Siguiente» (lo mismo que
// Tab): no le quita el foco al texto, así el cursor salta y el teclado del celular sigue abierto.
export function RenglonDeLaEdicion({ planilla }: { planilla: Planilla }) {
  const { firma, esperaCelda, quedanLugares } = planilla.guia
  const ids = idsDeLaEdicion(planilla.prefijo)
  return (
    <div
      data-renglon-de-la-edicion=""
      className={cn(RENGLON_BAJO_LA_BARRA, 'flex items-center gap-2 text-(--color-ink-soft)')}
    >
      {firma !== null ? (
        <p
          id={ids.firma}
          data-firma-en-el-cursor=""
          title={firmaEnTexto(firma)}
          className="min-w-0 flex-1 truncate font-mono"
        >
          {firma.nombre}(
          {firma.piezas.map((p, i) => (
            <span key={i}>
              {i > 0 ? '; ' : null}
              {p.actual ? (
                <strong data-valor-actual="" className="font-semibold text-(--color-ink)">
                  {p.texto}
                </strong>
              ) : (
                p.texto
              )}
            </span>
          ))}
          )
        </p>
      ) : esperaCelda ? (
        <p className="min-w-0 flex-1 truncate" title={GUIA_DE_TOCAR}>
          {GUIA_DE_TOCAR}
        </p>
      ) : null}
      {quedanLugares ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={NOMBRE_DE_SIGUIENTE}
          title={NOMBRE_DE_SIGUIENTE}
          className="ml-auto min-h-[44px] md:pointer-fine:min-h-7"
          onMouseDown={(ev) => {
            ev.preventDefault()
          }}
          onClick={() => {
            planilla.edicion.siguienteLugar()
          }}
        >
          <ArrowRightToLineIcon aria-hidden />
          Siguiente
        </Button>
      ) : null}
    </div>
  )
}
