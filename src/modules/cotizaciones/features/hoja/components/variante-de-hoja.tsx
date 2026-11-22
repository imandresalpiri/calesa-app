'use client'

import { useId } from 'react'
import { textoDelCandado } from '../../../entities/binding'
import type { VarianteDeHoja as Variante } from '../../../entities/hoja'

type Props = {
  item: Variante
  // La clave elegida; sin elegir, la que trae la fórmula por defecto.
  elegida: string | null
  alElegir: (clave: string) => void
}

// La variante (Moto, Auto gasolina…): una sola opción a la vez, con radios nativos (una parada de Tab, las flechas cambian de opción). Los chips son píldoras, como en V1,
// con el tono de su sección (`--tono-*`, con el neutro de respaldo); la elegida va rellena del primario con su tinta (`sobre-primario`, AA en `design/tokens.test.ts`).
// 44 px con el dedo (también en una tablet), 36 con puntero fino.
export function VarianteDeHoja({ item, elegida, alElegir }: Props) {
  const nombre = useId()
  return (
    <fieldset
      disabled={!item.editable}
      className="grid min-w-0 gap-2 border-0 p-0"
      aria-describedby={item.editable ? undefined : `${nombre}-motivo`}
    >
      <legend className="mb-1 text-(length:--text-sm) font-medium text-(--color-ink)">
        {item.etiqueta}
      </legend>
      <div className="flex flex-wrap gap-2">
        {item.opciones.map((opcion) => (
          <label
            key={opcion.clave}
            className="flex min-h-[44px] cursor-pointer items-center rounded-(--radius-pill) border border-[color:var(--tono-borde,var(--color-line))] bg-[color:var(--tono-fondo,var(--color-surface))] px-3 text-(length:--text-sm) text-[color:var(--tono-tinta,var(--color-ink))] has-checked:border-(--color-primario) has-checked:bg-(--color-primario) has-checked:font-medium has-checked:text-(--color-sobre-primario) has-focus-visible:shadow-(--shadow-focus) has-disabled:cursor-not-allowed has-disabled:opacity-70 md:pointer-fine:min-h-9"
          >
            <input
              type="radio"
              name={nombre}
              value={opcion.clave}
              checked={elegida === opcion.clave}
              onChange={() => {
                alElegir(opcion.clave)
              }}
              className="sr-only"
            />
            {opcion.etiqueta}
          </label>
        ))}
      </div>
      {item.editable ? null : (
        <p id={`${nombre}-motivo`} className="text-(length:--text-sm) text-(--color-ink-soft)">
          {textoDelCandado(item.motivo)}
        </p>
      )}
    </fieldset>
  )
}
