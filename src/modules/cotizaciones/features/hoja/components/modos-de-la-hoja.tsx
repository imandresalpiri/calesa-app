'use client'

import { useId } from 'react'

type Props = {
  modos: readonly { clave: string; nombre: string }[]
  // La clave elegida; nula, ninguna marcada.
  elegido: string | null
  alElegir: (clave: string) => void
  deshabilitado?: boolean
}

// Los modos de tipo de cambio que declara el diseño, como un control segmentado chico (una píldora con borde y una opción por modo; la elegida, rellena con el primario
// suave, como los chips de V1 y con el tono de la cabecera): uno solo a la vez, con radios nativos (una parada de Tab, las flechas cambian de modo). La leyenda no se ve
// (menos ruido en la cabecera) y nombra el grupo al lector de pantalla. El nombre sale de la base. Elegir uno pide un recálculo, como confirmar una celda. Al 200 % las
// opciones pasan a otra línea dentro de la píldora: nada se sale.
export function ModosDeLaHoja({ modos, elegido, alElegir, deshabilitado = false }: Props) {
  const nombre = useId()
  return (
    <fieldset className="min-w-0 border-0 p-0">
      <legend className="sr-only">Modo de tipo de cambio</legend>
      <div className="inline-flex max-w-full flex-wrap rounded-4xl border border-[color:var(--tono-borde,var(--color-line))] bg-[color:var(--tono-fondo,var(--color-surface))] p-0.5">
        {modos.map((modo) => (
          <label
            key={modo.clave}
            className="flex min-h-[44px] cursor-pointer items-center rounded-4xl px-3 text-(length:--text-sm) text-[color:var(--tono-tinta,var(--color-ink))] has-checked:bg-(--color-primario-soft) has-checked:font-medium has-checked:text-(--color-ink) has-checked:shadow-[inset_0_0_0_1px_var(--color-primario)] has-focus-visible:shadow-(--shadow-focus) md:pointer-fine:min-h-8"
          >
            <input
              type="radio"
              name={nombre}
              value={modo.clave}
              checked={elegido === modo.clave}
              disabled={deshabilitado}
              onChange={() => {
                alElegir(modo.clave)
              }}
              className="sr-only"
            />
            {modo.nombre}
          </label>
        ))}
      </div>
    </fieldset>
  )
}
