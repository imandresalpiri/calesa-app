'use client'

import { CheckIcon, StarIcon } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MasAcciones, type AccionDeMenu } from '@/shared/ui/lista'
import { salirSinPerder } from '@/shared/ui/salida-con-cambios'
import type { FormulaDeLaLista } from '../../../../entities/formulas-del-origen/lista'
import { EstadoDeLaFormula } from '../estado-de-la-formula'

type Props = {
  // La misma pestaña con esta fórmula (`?formula=<id>`).
  href: Route
  formula: FormulaDeLaLista
  elegida: boolean
  acciones: AccionDeMenu[]
  // Cierra el selector antes de ir.
  alIr: () => void
}

// Una fórmula en el selector de la barra: ★ sólo en la activa, el nombre, el estado y una marca en la elegida, todo un enlace a la misma pestaña con ella; al lado
// su «⋯» (sin acciones, ninguno). Con cambios sin guardar en el editor, antes de ir pregunta.
export function FilaDeFormula({ href, formula, elegida, acciones, alIr }: Props) {
  const router = useRouter()
  return (
    <li
      data-formula-del-origen={formula.id}
      className="flex min-w-0 items-center gap-1 rounded-(--radius-md) hover:bg-(--color-paper-dim)"
    >
      <Link
        href={href}
        aria-current={elegida ? 'true' : undefined}
        onClick={(evento) => {
          if (evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.button !== 0) return
          evento.preventDefault()
          alIr()
          salirSinPerder(() => {
            router.push(href)
          })
        }}
        className="flex min-h-11 min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1 rounded-(--radius-md) px-2 py-1.5 text-(length:--text-sm) text-(--color-ink) outline-none focus-visible:shadow-(--shadow-focus) md:min-h-9"
      >
        {formula.activa ? (
          <StarIcon aria-label="Activa" className="size-4 shrink-0 fill-current" />
        ) : null}
        <span className="min-w-0 font-medium break-words">{formula.nombre}</span>
        <EstadoDeLaFormula formula={formula} />
        {elegida ? <CheckIcon aria-label="Elegida" className="ms-auto size-4 shrink-0" /> : null}
      </Link>
      {/* Sin acciones (el Modo Live), sin «⋯». */}
      {acciones.length === 0 ? null : <MasAcciones nombre={formula.nombre} acciones={acciones} />}
    </li>
  )
}
