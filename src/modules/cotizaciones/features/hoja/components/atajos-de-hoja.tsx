'use client'

import type { AtajosDeHoja as Atajos } from '../../../entities/hoja'

type Props = {
  item: Atajos
  // La etiqueta de la celda sobre la que van (para el lector) y si ahora no se puede editar.
  etiquetaDeLaCelda: string
  bloqueada: boolean
  // La posición del chip pulsado, si lo que vale ahora sigue siendo lo que ese chip puso.
  pulsado: number | null
  alElegir: (nodo: string, posicion: number, valor: number) => void
}

// Los atajos (los años del factor de depreciación): píldoras que ponen el valor de la tabla en la celda de su nodo, con el tono de su sección y la pulsada rellena
// del primario, como la variante. No dibujan el valor. Con años que repiten el valor, la
// posición dice cuál se pulsó; un chip sin valor en su fila o con la celda bloqueada no se pulsa.
export function AtajosDeHoja({ item, etiquetaDeLaCelda, bloqueada, pulsado, alElegir }: Props) {
  return (
    <ul aria-label={`Atajos de ${etiquetaDeLaCelda}`} className="flex flex-wrap gap-2">
      {item.chips.map((chip, posicion) => (
        <li key={posicion}>
          <button
            type="button"
            aria-pressed={pulsado === posicion}
            disabled={bloqueada || chip.valor === null}
            onClick={() => {
              if (chip.valor !== null) {
                alElegir(item.nodo, posicion, chip.valor)
              }
            }}
            className="min-h-[44px] rounded-(--radius-pill) border border-[color:var(--tono-borde,var(--color-line))] bg-[color:var(--tono-fondo,var(--color-surface))] px-3 text-(length:--text-sm) text-[color:var(--tono-tinta,var(--color-ink))] outline-none hover:bg-(--color-surface-2) hover:text-(--color-ink) focus-visible:shadow-(--shadow-focus) disabled:cursor-not-allowed disabled:opacity-60 aria-pressed:border-(--color-primario) aria-pressed:bg-(--color-primario) aria-pressed:font-medium aria-pressed:text-(--color-sobre-primario) md:pointer-fine:min-h-9"
          >
            {chip.etiqueta}
          </button>
        </li>
      ))}
    </ul>
  )
}
