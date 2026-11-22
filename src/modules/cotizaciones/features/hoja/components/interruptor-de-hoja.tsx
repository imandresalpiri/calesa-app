'use client'

import { useId } from 'react'
import { Switch } from '@/shared/ui/switch'
import { textoDelCandado } from '../../../entities/binding'
import type { InterruptorDeHoja as Interruptorr } from '../../../entities/hoja'

type Props = {
  item: Interruptorr
  encendido: boolean
  // La variante elegida deja este interruptor sin efecto: se dice y no se pulsa.
  fueraDeVariante: boolean
  alCambiar: (nodo: string, encendido: boolean) => void
}

// Qué hace, sin nombrar las celdas que gobierna (alguna puede ser de un nivel que quien mira no ve).
const AYUDA_DEL_EFECTO = {
  habilita: 'Habilita las celdas que dependen de este dato.',
  muestra: 'Muestra en la tarjeta lo que depende de este dato.',
} as const

// Como en V1: el switch y su rótulo a la derecha, sin caja alrededor; el `label` que los envuelve hace que un clic en el rótulo conmute. Qué hace es la descripción
// del switch (`hidden` sigue contando para `aria-describedby`); por qué no se puede cambiar es un estado y va escrito bajo el rótulo.
export function InterruptorDeHoja({ item, encendido, fueraDeVariante, alCambiar }: Props) {
  const id = useId()
  let motivo: string | null = null
  if (!item.editable) {
    motivo = textoDelCandado(item.motivo)
  } else if (fueraDeVariante) {
    motivo = 'No aplica a esta variante.'
  }
  return (
    <label
      data-slot="interruptor"
      className="flex min-h-[44px] cursor-pointer items-center gap-3 has-data-disabled:cursor-not-allowed md:pointer-fine:min-h-8"
    >
      <Switch
        aria-labelledby={id}
        aria-describedby={`${id}-ayuda`}
        checked={encendido}
        disabled={motivo !== null}
        onCheckedChange={(valor) => {
          alCambiar(item.nodo, valor)
        }}
      />
      <span className="grid min-w-0 grid-cols-[minmax(0,1fr)] break-words">
        <span id={id} className="text-(length:--text-sm) text-(--color-ink-soft)">
          {item.etiqueta}
        </span>
        {motivo === null ? (
          <span id={`${id}-ayuda`} hidden>
            {AYUDA_DEL_EFECTO[item.efecto]}
          </span>
        ) : (
          <span id={`${id}-ayuda`} className="text-(length:--text-xs) text-(--color-ink-soft)">
            {motivo}
          </span>
        )}
      </span>
    </label>
  )
}
