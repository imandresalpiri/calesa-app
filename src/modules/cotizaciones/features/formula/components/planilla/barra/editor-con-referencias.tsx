'use client'

import { useMemo, useRef, type ComponentProps } from 'react'
import { cn } from '@/shared/lib/utils'
import type { ReferenciaTipeada } from '../../../../../entities/formula/referencias-tipeadas'
import type { Tramo } from '../../../../../entities/motivos-del-compilador'
import { pintarElTexto } from './pintar-el-texto'

type Props = Omit<ComponentProps<'textarea'>, 'value' | 'children' | 'onScroll'> & {
  valor: string
  refs: readonly ReferenciaTipeada[]
  // El tramo del error de lo tipeado (subrayado ondulado), o nulo.
  tramoDelError: Pick<Tramo, 'desde' | 'largo'> | null
}

// La misma caja para el texto y su capa: cualquier diferencia de letra, relleno o alto corre los colores.
const CAJA =
  'col-start-1 row-start-1 min-h-[44px] w-full min-w-0 px-3 py-2.5 font-mono text-(length:--text-sm) leading-6 break-words whitespace-pre-wrap md:pointer-fine:min-h-9 md:pointer-fine:py-1.5'

// Lo que se escribe en la barra de fórmula con sus referencias de color (D16): un `<textarea>` de letra transparente sobre una capa pintada (`aria-hidden`) con lo
// mismo, cada referencia en su color y el error subrayado. El lector lee el textarea; la capa sigue su desplazamiento.
export function EditorConReferencias({ valor, refs, tramoDelError, className, ...resto }: Props) {
  const capa = useRef<HTMLDivElement>(null)
  const pedazos = useMemo(
    () => pintarElTexto(valor, refs, tramoDelError),
    [valor, refs, tramoDelError],
  )
  return (
    <div className="relative grid min-w-0 rounded-(--radius-md) border border-(--color-line) bg-(--color-surface) focus-within:shadow-(--shadow-focus)">
      <div
        ref={capa}
        aria-hidden
        className={cn(CAJA, 'pointer-events-none overflow-hidden text-(--color-ink)')}
      >
        {pedazos.map((p) => (
          <span
            key={p.desde}
            className={cn(
              p.color !== null && 'font-semibold',
              p.error &&
                'underline decoration-(--color-peligro-ink) decoration-wavy underline-offset-4',
            )}
            style={
              p.color === null
                ? undefined
                : { color: `var(--viz-series-${String((p.color % 6) + 1)})` }
            }
          >
            {p.texto}
          </span>
        ))}
        {/* Un salto al final no ocupa línea en la capa sin algo detrás. */}
        {'​'}
      </div>
      <textarea
        {...resto}
        value={valor}
        rows={1}
        spellCheck={false}
        autoComplete="off"
        className={cn(
          CAJA,
          '[field-sizing:content] resize-none overflow-hidden bg-transparent text-transparent caret-(--color-ink) outline-none selection:bg-(--color-info-soft) placeholder:text-(--color-ink-faint)',
          className,
        )}
        onScroll={(e) => {
          if (capa.current !== null) capa.current.scrollTop = e.currentTarget.scrollTop
        }}
      />
    </div>
  )
}
