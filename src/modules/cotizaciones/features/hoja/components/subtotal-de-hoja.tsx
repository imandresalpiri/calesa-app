import type { SubtotalDeHoja as Subtotal } from '../../../entities/hoja'
import { ValorDeNodo } from './valor-de-nodo'

// Un subtotal: una franja con su etiqueta y su valor (el «CIF» de «Avanzado»), con el tono de su grupo. No se edita. Como en V1, el valor en la monoespaciada
// con cifras tabulares (sin tocar `ValorDeNodo`: la clase va en la raíz).
export function SubtotalDeHoja({ item, valor }: { item: Subtotal; valor: number | null }) {
  return (
    <div
      data-tono={item.tono ?? undefined}
      className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 rounded-(--radius-md) border border-[color:var(--tono-borde,var(--color-line-strong))] bg-[color:var(--tono-fondo,var(--color-surface-2))] px-4 py-2.5 text-(length:--text-sm) font-normal text-[color:var(--tono-tinta,var(--color-ink))] [&>:last-child]:font-mono [&>:last-child]:tabular-nums"
    >
      <span className="min-w-0 [overflow-wrap:anywhere]">{item.etiqueta}</span>
      <ValorDeNodo valor={valor} formato={item.formato} decimales={item.decimales} />
    </div>
  )
}
