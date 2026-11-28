'use client'

// Un número del inspector del editor de artes. Se tipea con la coma o el punto del locale y se aplica con Enter o al salir; Esc vuelve al que
// tenía y lo que no es un número también. ↑ y ↓ suman o restan un paso (diez con Mayús) y aplican al momento. Lo tipeado vive acá hasta
// aplicarse, acotado a sus límites; salir sin tipear no cambia nada. Sin un valor común, vacío con «Mixto».
import { useId, useState, type KeyboardEvent } from 'react'
import { cn } from 'cn'
import { formatearParaEditar } from '@/shared/lib/formato'
import { leerNumeroTipeado } from '@/shared/lib/numero-tipeado'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { useRegional } from '@/shared/ui/regional'
import { acotar, conFlecha, redondear, type Limites } from '../../../../entities/editor/inspector'

type Props = {
  etiqueta: string
  // Nulo: las capas elegidas no lo comparten («Mixto»).
  valor: number | null
  alCambiar: (valor: number) => void
  limites: Limites
  paso?: number
  // Los que se muestran; con 0, sólo enteros.
  decimales?: number
  sufijo?: string
  deshabilitado?: boolean
}

type Tecla = (evento: KeyboardEvent<HTMLInputElement>) => void

function useNumeroDelCampo({ valor, alCambiar, limites, paso = 1, decimales = 2 }: Props) {
  const { locale } = useRegional()
  const [borrador, setBorrador] = useState<string | null>(null)
  const mostrado =
    valor === null ? '' : formatearParaEditar(redondear(valor, decimales), { locale })

  const leer = (texto: string): number | null => {
    const leido = leerNumeroTipeado(texto, locale)
    if (!leido.ok || leido.valor === null) {
      return null
    }
    return acotar(decimales === 0 ? Math.round(leido.valor) : leido.valor, limites)
  }
  const emitir = (nuevo: number | null) => {
    setBorrador(null)
    if (nuevo !== null && nuevo !== valor) {
      alCambiar(nuevo)
    }
  }
  const aplicar = () => {
    emitir(borrador === null || borrador === mostrado ? null : leer(borrador))
  }
  const flecha = (sentido: 1 | -1, grande: boolean) => {
    const base = borrador === null ? valor : leer(borrador)
    if (base !== null) {
      emitir(acotar(conFlecha(base, sentido, grande, paso), limites))
    }
  }
  const teclas: Record<string, Tecla> = {
    Enter: (evento) => {
      evento.preventDefault()
      aplicar()
    },
    Escape: (evento) => {
      if (borrador !== null) {
        evento.stopPropagation()
        setBorrador(null)
      }
    },
    ArrowUp: (evento) => {
      evento.preventDefault()
      flecha(1, evento.shiftKey)
    },
    ArrowDown: (evento) => {
      evento.preventDefault()
      flecha(-1, evento.shiftKey)
    },
  }
  const alTeclear: Tecla = (evento) => {
    teclas[evento.key]?.(evento)
  }
  return { texto: borrador ?? mostrado, escribir: setBorrador, aplicar, alTeclear }
}

export function CampoNumerico(props: Props) {
  const { etiqueta, valor, sufijo, deshabilitado } = props
  const id = useId()
  const campo = useNumeroDelCampo(props)
  return (
    <div className="grid min-w-0 gap-1">
      <Label htmlFor={id} className="text-(length:--text-xs) font-normal text-(--color-ink-soft)">
        {etiqueta}
      </Label>
      <div className="relative">
        <Input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
          value={campo.texto}
          placeholder={valor === null ? 'Mixto' : undefined}
          disabled={deshabilitado}
          onChange={(evento) => {
            campo.escribir(evento.target.value)
          }}
          onBlur={campo.aplicar}
          onKeyDown={campo.alTeclear}
          className={cn('h-8 text-right tabular-nums', sufijo ? 'pr-6' : null)}
        />
        {sufijo ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-(length:--text-xs) text-(--color-ink-faint)"
          >
            {sufijo}
          </span>
        ) : null}
      </div>
    </div>
  )
}
