'use client'

import { useId } from 'react'
import { Switch } from '@/shared/ui/switch'

type Props = {
  etiqueta: string
  // Qué hace: no se ve (menos ruido en la cabecera); la lee el lector de pantalla (`aria-describedby`) y la muestra el `title`.
  ayuda: string
  valor: boolean
  alCambiar: (valor: boolean) => void
  deshabilitado?: boolean
  // Para los e2e (`data-interruptor-privada`, …).
  marca?: Record<`data-${string}`, string>
}

// Un sí o no chico, en línea: el switch y su etiqueta corta a la derecha, sin caja; el `label` que los envuelve hace que un clic en la etiqueta conmute. 44 px de alto en
// el celular y 32 con puntero fino desde `md` (como los chips de los modos). Lo usan la cabecera de la hoja y la fila de pasos.
export function InterruptorChico({
  etiqueta,
  ayuda,
  valor,
  alCambiar,
  deshabilitado = false,
  marca,
}: Props) {
  const id = useId()
  return (
    <label
      {...marca}
      title={ayuda}
      className="inline-flex min-h-[44px] min-w-0 cursor-pointer items-center gap-2 has-data-disabled:cursor-not-allowed md:pointer-fine:min-h-8"
    >
      <Switch
        aria-labelledby={id}
        aria-describedby={`${id}-ayuda`}
        checked={valor}
        disabled={deshabilitado}
        onCheckedChange={alCambiar}
      />
      <span id={id} className="min-w-0 text-(length:--text-sm) font-medium text-(--color-ink)">
        {etiqueta}
      </span>
      <span id={`${id}-ayuda`} hidden>
        {ayuda}
      </span>
    </label>
  )
}
