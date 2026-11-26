'use client'

import type { ReactNode } from 'react'
import { agruparCampos, valorMostrado, type CampoMostrable } from '@/shared/lib/campos'
import { useRegional } from '../regional'
import { ValorMostrado } from './valor-mostrado'

type Props = {
  etiqueta: string
  children: ReactNode
}

// Un dato de una ficha: su etiqueta y, debajo, su valor.
export function Dato({ etiqueta, children }: Props) {
  return (
    <div className="grid min-w-0 gap-0.5">
      <dt className="text-(length:--text-xs) text-(--color-ink-soft)">{etiqueta}</dt>
      <dd className="min-w-0 text-(length:--text-sm) break-words text-(--color-ink)">{children}</dd>
    </div>
  )
}

type Campo = CampoMostrable & {
  clave: string
  etiqueta: string
  grupo: string | null
  activo: boolean
}

type PropsDeGrupos<C extends Campo> = {
  campos: readonly C[]
  // Lo que tiene guardado quien se muestra, por clave de campo.
  atributos: Readonly<Record<string, unknown>>
  // Qué mostrar cuando quien llama sabe algo que el valor no dice (un dato que quien mira no
  // recibe). Nulo = el valor de `atributos`.
  valorDe?: (campo: C) => ReactNode | null
}

// A la vista: dos columnas en una lateral de 24 rem, más en una ancha; en rem, así al 200 % caen columnas en vez de ensanchar.
const REJILLA_A_LA_VISTA =
  'grid grid-cols-[repeat(auto-fill,minmax(min(100%,10rem),1fr))] gap-x-4 gap-y-3'

// Un grupo a la vista por cada grupo del layout (su `h3` y una rejilla que entra en una columna de 24 rem), en su orden, con los campos activos y su valor. Los nombres
// salen del layout; lo que no tiene grupo va en «Otros datos». Los desactivados no se muestran.
export function DatosPorGrupo<C extends Campo>({ campos, atributos, valorDe }: PropsDeGrupos<C>) {
  const { locale, zonaHoraria } = useRegional()
  return (
    <>
      {agruparCampos(campos).map((grupo) => {
        const titulo = grupo.nombre ?? 'Otros datos'
        const datos = grupo.campos.map((campo) => (
          <Dato key={campo.clave} etiqueta={campo.etiqueta}>
            {valorDe?.(campo) ?? (
              <ValorMostrado
                valor={valorMostrado(campo, atributos[campo.clave], {
                  locale,
                  zona: zonaHoraria,
                })}
              />
            )}
          </Dato>
        ))
        return (
          <section key={grupo.nombre ?? ''} aria-label={titulo} className="grid min-w-0 gap-2">
            <h3 className="text-(length:--text-sm) font-semibold text-(--color-ink)">{titulo}</h3>
            <dl className={REJILLA_A_LA_VISTA}>{datos}</dl>
          </section>
        )
      })}
    </>
  )
}
