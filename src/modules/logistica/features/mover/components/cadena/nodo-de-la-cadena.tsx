'use client'

import { Badge } from '@/shared/ui/badge'
import type { NodoDeLaCadena } from '../../../../entities/mover/cadena'

type Props = {
  nodo: NodoDeLaCadena
  // ¿Es la que se mira en «Qué falta»? (sin `?fase_vista=`, la actual).
  vista: boolean
  // El único nodo que Tab encuentra (el que se mira); los demás, con ← y →.
  enfocable: boolean
  elegir: () => void
}

const POR_TIPO: Record<NodoDeLaCadena['tipo'], string> = {
  pasada: 'border-(--color-line) bg-(--color-surface-2) text-(--color-ink-soft)',
  actual:
    'border-2 border-(--color-primario) bg-(--color-primario-soft) font-medium text-(--color-ink)',
  falta: 'border-dashed border-(--color-line) text-(--color-ink-faint)',
}

const QUE_ES: Record<NodoDeLaCadena['tipo'], string> = {
  pasada: 'pasada',
  actual: 'actual',
  falta: 'por venir',
}

// Un nodo de la cadena: el nombre de la fase (con elipsis y el nombre entero en `title`), su color y, si la fase ya no se usa, «Jubilada». La actual lleva `aria-current="step"`
// y la que se mira, `aria-pressed`. Alto fijo.
export function NodoDeLaCadenaDeLaUnidad({ nodo, vista, enfocable, elegir }: Props) {
  return (
    <button
      type="button"
      data-nodo={nodo.clave}
      data-tipo={nodo.tipo}
      aria-current={nodo.tipo === 'actual' ? 'step' : undefined}
      aria-pressed={vista}
      aria-label={`${nodo.nombre}, ${QUE_ES[nodo.tipo]}${nodo.jubilada ? ', jubilada' : ''}`}
      title={nodo.nombre}
      tabIndex={enfocable ? 0 : -1}
      onClick={elegir}
      className={`flex h-9 max-w-48 shrink-0 items-center gap-2 rounded-full border px-3 text-(length:--text-sm) whitespace-nowrap transition outline-none hover:text-(--color-ink) focus-visible:shadow-(--shadow-focus) aria-pressed:ring-2 aria-pressed:ring-(--color-primario) aria-pressed:ring-offset-1 ${POR_TIPO[nodo.tipo]}`}
    >
      {nodo.color ? (
        <span
          aria-hidden
          className="size-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: nodo.color }}
        />
      ) : null}
      <span className="truncate">{nodo.nombre}</span>
      {nodo.jubilada ? <Badge variant="outline">Jubilada</Badge> : null}
    </button>
  )
}
