'use client'

import { ChevronDownIcon } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { useRouter, useSelectedLayoutSegment } from 'next/navigation'
import { useId, useState } from 'react'
import { rutaDeParteDelOrigen, rutaDelOrigen, type ParteDelOrigen } from '@/shared/lib/rutas'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover'
import { salirSinPerder } from '@/shared/ui/salida-con-cambios'
import { CON_BUSQUEDA_DESDE, destinoAlCambiarDeOrigen, filtrarOrigenes } from './destino-al-cambiar'

export type OrigenDelSelector = {
  id: string
  nombre: string
  color: string
  // Las pestañas que la persona abre en ese origen, en su orden.
  abiertas: readonly ParteDelOrigen[]
}

type Props = { actual: OrigenDelSelector; origenes: readonly OrigenDelSelector[] }

// Un origen de la lista: un enlace (Ctrl o el botón del medio abren otra pestaña) que, con cambios sin guardar, antes pregunta.
function FilaDeOrigen({
  origen,
  actual,
  href,
  alElegir,
}: {
  origen: OrigenDelSelector
  actual: boolean
  href: string
  alElegir: () => void
}) {
  const router = useRouter()
  return (
    <li className="min-w-0">
      <Link
        href={href as Route}
        aria-current={actual ? 'page' : undefined}
        onClick={(evento) => {
          if (evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.button !== 0) return
          evento.preventDefault()
          alElegir()
          if (actual) return
          salirSinPerder(() => {
            router.push(href as Route)
          })
        }}
        className="flex min-h-11 min-w-0 items-center gap-2 rounded-(--radius-md) px-2 text-(length:--text-sm) text-(--color-ink) outline-none hover:bg-(--color-surface-3) focus-visible:shadow-(--shadow-focus) aria-[current=page]:font-semibold md:min-h-8"
      >
        <span
          aria-hidden
          className="size-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: origen.color }}
        />
        <span className="min-w-0 truncate">{origen.nombre}</span>
      </Link>
    </li>
  )
}

// El último tramo de las migas: «● <Origen> ▾». Abre la lista de los orígenes que la persona abre (con búsqueda pasados 10) y salta al elegido conservando la
// pestaña si la abre ahí (si no, la primera que abre); con cambios sin guardar, antes pregunta.
export function SelectorDeOrigen({ actual, origenes }: Props) {
  const segmento = useSelectedLayoutSegment()
  const [abierto, setAbierto] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const idDeLaBusqueda = useId()
  const conBusqueda = origenes.length > CON_BUSQUEDA_DESDE
  const visibles = conBusqueda ? filtrarOrigenes(origenes, busqueda) : origenes
  return (
    <Popover
      open={abierto}
      onOpenChange={(sigue) => {
        setAbierto(sigue)
        if (!sigue) setBusqueda('')
      }}
    >
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            aria-label={`Cambiar de origen (ahora ${actual.nombre})`}
            className="-ml-1 min-h-11 max-w-full gap-1.5 px-1.5 text-(length:--text-sm) font-medium text-(--color-ink) md:min-h-8"
          />
        }
      >
        <span
          aria-hidden
          className="size-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: actual.color }}
        />
        <span className="min-w-0 truncate">{actual.nombre}</span>
        <ChevronDownIcon aria-hidden className="size-4 shrink-0" />
      </PopoverTrigger>
      <PopoverContent align="start" className="max-w-(--available-width) gap-2 p-1.5">
        {conBusqueda ? (
          <div className="p-1">
            <label htmlFor={idDeLaBusqueda} className="sr-only">
              Buscar un origen
            </label>
            <Input
              id={idDeLaBusqueda}
              type="search"
              autoComplete="off"
              placeholder="Buscar un origen"
              value={busqueda}
              onChange={(evento) => {
                setBusqueda(evento.target.value)
              }}
              className="min-h-11 md:min-h-8"
            />
          </div>
        ) : null}
        <ul
          aria-label="Orígenes"
          className="grid max-h-80 grid-cols-[minmax(0,1fr)] overflow-y-auto"
        >
          {visibles.map((origen) => (
            <FilaDeOrigen
              key={origen.id}
              origen={origen}
              actual={origen.id === actual.id}
              href={destinoAlCambiarDeOrigen(origen, segmento, rutaDeParteDelOrigen, rutaDelOrigen)}
              alElegir={() => {
                setAbierto(false)
              }}
            />
          ))}
        </ul>
        {visibles.length === 0 ? (
          <p className="px-2 py-1.5 text-(length:--text-sm) text-(--color-ink-soft)">
            Ningún origen se llama así.
          </p>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}
