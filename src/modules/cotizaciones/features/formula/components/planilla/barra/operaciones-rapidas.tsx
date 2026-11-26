'use client'

import { BookOpenIcon, PercentIcon, PlusIcon, SplitIcon, type LucideIcon } from 'lucide-react'
import { avisar } from '@/shared/ui/toasts'
import {
  OPERACIONES_RAPIDAS,
  type ClaveDeOperacion,
} from '../../../../../entities/formula/operaciones-rapidas'
import type { InsercionEnLaBarra } from '../../../hooks/use-insercion-en-la-barra'

export const NOMBRE_DE_LA_AYUDA = '¿Cómo se escribe?'

const ICONOS: Record<ClaveDeOperacion, LucideIcon> = {
  sumar: PlusIcon,
  porcentaje: PercentIcon,
  si: SplitIcon,
}

const BOTON =
  'flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center gap-1 rounded-(--radius-md) px-2 text-(length:--text-sm) text-(--color-ink) outline-none hover:bg-(--color-surface-3) focus-visible:shadow-(--shadow-focus) md:pointer-fine:min-h-9 md:pointer-fine:min-w-9'
const APAGADO = 'cursor-not-allowed text-(--color-ink-faint) hover:bg-transparent'

type Props = { insercion: InsercionEnLaBarra; alAbrirLaAyuda: () => void }

// Las operaciones rápidas de la barra de fórmula (D13–D16 de la fórmula fácil): «Sumar», «Porcentaje de» y «Si… entonces…», con su texto desde que la barra es
// ancha y sólo el icono (con su nombre y su `title`) debajo; insertan la forma con sus lugares por llenar y el cursor en el primero. Apagadas por lo mismo que
// `fx ▾`, dicen por qué al tocarlas. Al final, «¿Cómo se escribe?» (el panel de ayuda), a un toque.
export function OperacionesRapidas({ insercion, alAbrirLaAyuda }: Props) {
  const { motivo } = insercion
  return (
    <div role="group" aria-label="Operaciones" className="flex shrink-0 items-center">
      {OPERACIONES_RAPIDAS.map((o) => {
        const Icono = ICONOS[o.clave]
        return (
          <button
            key={o.clave}
            type="button"
            aria-label={o.etiqueta}
            title={motivo ?? o.etiqueta}
            {...(motivo === null ? {} : { 'aria-disabled': true })}
            className={motivo === null ? BOTON : `${BOTON} ${APAGADO}`}
            onClick={() => {
              if (motivo === null) insercion.insertarOperacion(o.clave)
              else avisar(motivo)
            }}
          >
            <Icono aria-hidden className="size-4" />
            <span aria-hidden className="hidden whitespace-nowrap @3xl/formula:inline">
              {o.etiqueta}
            </span>
          </button>
        )
      })}
      <button
        type="button"
        aria-label={NOMBRE_DE_LA_AYUDA}
        title={NOMBRE_DE_LA_AYUDA}
        aria-haspopup="dialog"
        className={BOTON}
        onClick={alAbrirLaAyuda}
      >
        <BookOpenIcon aria-hidden className="size-4" />
      </button>
    </div>
  )
}
