'use client'

import { cn } from 'cn'
import { EyeIcon, EyeOffIcon, LockIcon, LockOpenIcon } from 'lucide-react'
import { MOTIVO_DE_SOLO_LECTURA } from '../../../../entities/editor/agregar-en-el-panel'

type Que = 'oculta' | 'bloqueada'

type Props = {
  nombre: string
  // Lo propio de la capa o del grupo (no lo que hereda de su grupo).
  oculta: boolean
  bloqueada: boolean
  soloLectura: boolean
  alAlternar: (que: Que) => void
}

const BOTONES = [
  {
    que: 'oculta',
    accion: 'Ocultar',
    encendido: 'Mostrar',
    Icono: EyeIcon,
    IconoEncendido: EyeOffIcon,
  },
  {
    que: 'bloqueada',
    accion: 'Bloquear',
    encendido: 'Desbloquear',
    Icono: LockOpenIcon,
    IconoEncendido: LockIcon,
  },
] as const

// El ojo y el candado de una fila de «Capas»: ocultan o muestran, bloquean o desbloquean la capa o el grupo. Apretados (`aria-pressed`) se
// ven siempre; si no, al pasar por la fila, al enfocarlos o con la fila elegida (sin cambiar de lugar: sólo su opacidad). En sólo lectura
// muestran cómo está y no cambian nada.
export function BotonesDeLaFila({ nombre, oculta, bloqueada, soloLectura, alAlternar }: Props) {
  return (
    <>
      {BOTONES.map((b) => {
        const encendido = b.que === 'oculta' ? oculta : bloqueada
        const Icono = encendido ? b.IconoEncendido : b.Icono
        return (
          <button
            key={b.que}
            type="button"
            aria-label={`${b.accion} «${nombre}»`}
            aria-pressed={encendido}
            aria-disabled={soloLectura}
            title={soloLectura ? MOTIVO_DE_SOLO_LECTURA : encendido ? b.encendido : b.accion}
            onClick={() => {
              if (!soloLectura) {
                alAlternar(b.que)
              }
            }}
            className={cn(
              'inline-flex size-7 shrink-0 items-center justify-center rounded-(--radius-sm) text-(--color-ink-soft) transition outline-none',
              'hover:bg-(--color-surface-3) hover:text-(--color-ink) focus-visible:opacity-100 focus-visible:shadow-(--shadow-focus)',
              'aria-disabled:cursor-not-allowed aria-disabled:hover:bg-transparent',
              encendido
                ? 'opacity-100'
                : 'opacity-0 group-hover/fila:opacity-100 group-data-[state=elegida]/fila:opacity-100',
            )}
          >
            <Icono aria-hidden className="size-3.5" />
          </button>
        )
      })}
    </>
  )
}
