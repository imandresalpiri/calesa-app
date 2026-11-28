'use client'

// Un color del inspector del editor de artes: el selector del navegador (conserva el alfa que tenía) y el hexadecimal, `#rrggbb` (o
// `#rrggbbaa`), que se aplica con Enter o al salir; uno que no es un color vuelve al que tenía. `opcional`: un color que se puede quitar
// (relleno, borde, contorno), con su interruptor; sin él, el campo queda apagado con «Ninguno».
import { useId, useState, type KeyboardEvent } from 'react'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Switch } from '@/shared/ui/switch'
import { conElAlfaDe, leerColorTipeado } from '../../../../entities/editor/inspector'

type Props = {
  etiqueta: string
  // Nulo: sin color (sólo con `opcional`).
  valor: string | null
  alCambiar: (color: string) => void
  deshabilitado?: boolean
  opcional?: { alAlternar: (activo: boolean) => void }
}

const COLOR_DEL_SELECTOR_SIN_VALOR = '#000000'

type Tecla = (evento: KeyboardEvent<HTMLInputElement>) => void

function useHexadecimal(valor: string | null, alCambiar: (color: string) => void) {
  const [borrador, setBorrador] = useState<string | null>(null)
  const aplicar = () => {
    if (borrador === null) {
      return
    }
    const leido = leerColorTipeado(borrador)
    setBorrador(null)
    if (leido !== null && leido !== valor) {
      alCambiar(leido)
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
  }
  const alTeclear: Tecla = (evento) => {
    teclas[evento.key]?.(evento)
  }
  return { texto: borrador ?? valor ?? '', escribir: setBorrador, aplicar, alTeclear }
}

export function CampoDeColor({ etiqueta, valor, alCambiar, deshabilitado, opcional }: Props) {
  const id = useId()
  const hexadecimal = useHexadecimal(valor, alCambiar)
  const apagado = deshabilitado === true || valor === null
  return (
    <div className="grid min-w-0 gap-1">
      <Label htmlFor={id} className="text-(length:--text-xs) font-normal text-(--color-ink-soft)">
        {etiqueta}
      </Label>
      <div className="flex min-w-0 items-center gap-2">
        <input
          type="color"
          aria-label={`${etiqueta}, en la paleta`}
          value={(valor ?? COLOR_DEL_SELECTOR_SIN_VALOR).slice(0, 7).toLowerCase()}
          disabled={apagado}
          onChange={(evento) => {
            alCambiar(conElAlfaDe(evento.target.value, valor))
          }}
          className="size-8 shrink-0 cursor-pointer rounded-lg border border-(--color-line-strong) bg-(--color-surface) p-0.5 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <Input
          id={id}
          autoComplete="off"
          spellCheck={false}
          maxLength={9}
          value={hexadecimal.texto}
          placeholder={valor === null ? 'Ninguno' : undefined}
          disabled={apagado}
          onChange={(evento) => {
            hexadecimal.escribir(evento.target.value)
          }}
          onBlur={hexadecimal.aplicar}
          onKeyDown={hexadecimal.alTeclear}
          className="h-8 min-w-0 flex-1 tabular-nums"
        />
        {opcional ? (
          <Switch
            size="sm"
            checked={valor !== null}
            disabled={deshabilitado}
            aria-label={`Usar ${etiqueta.toLowerCase()}`}
            onCheckedChange={(activo) => {
              opcional.alAlternar(activo)
            }}
          />
        ) : null}
      </div>
    </div>
  )
}
