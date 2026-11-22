import { ChevronLeftIcon } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { connection } from 'next/server'
import { MenuDeLaPuestaEnMarcha } from '@/modules/origenes/pantallas/puesta-en-marcha'
import { rutaDelOrigen } from '@/shared/lib/rutas'
import { Skeleton } from '@/shared/ui/skeleton'
import { abrirLaPuestaEnMarcha } from './abrir'

// La cabecera de la puesta en marcha: la vuelta a la página del origen, el punto de color y «Puesta en marcha de <origen>» (el `h1` es el de cada paso,
// fuera del `Suspense`: una página, un `h1`) y el «⋯» con «Salir de la puesta en marcha». Sin la tira ni las pestañas del origen. A quien no abre el
// origen no le dibuja nada: el paso dice por qué.
export async function CabeceraDeLaPuestaEnMarcha({ id }: { id: string }) {
  await connection()
  const abierta = await abrirLaPuestaEnMarcha(id)
  if (abierta.tipo !== 'abierto') {
    return null
  }
  const { origen } = abierta
  const pagina = rutaDelOrigen(origen.id)
  return (
    <div className="grid min-w-0 gap-2">
      <Link
        href={pagina as Route}
        className="-ml-1 inline-flex min-h-11 w-fit max-w-full items-center gap-1 rounded-(--radius-md) pr-2 pl-1 text-(length:--text-sm) text-(--color-ink-soft) outline-none hover:text-(--color-ink) focus-visible:shadow-(--shadow-focus) md:min-h-8"
      >
        <ChevronLeftIcon aria-hidden className="size-4 shrink-0" />
        <span className="truncate">{origen.nombre}</span>
      </Link>
      <div className="flex min-w-0 items-start justify-between gap-3">
        <p className="flex min-w-0 items-center gap-2 text-(length:--text-xl) font-semibold break-words text-(--color-ink)">
          <span
            aria-hidden
            className="size-3.5 shrink-0 rounded-full"
            style={{ backgroundColor: origen.color }}
          />
          <span className="min-w-0">{`Puesta en marcha de ${origen.nombre}`}</span>
        </p>
        <MenuDeLaPuestaEnMarcha nombre={origen.nombre} salida={pagina} />
      </div>
    </div>
  )
}

export function EsqueletoDeLaCabecera() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Cargando la puesta en marcha"
      className="grid gap-2"
    >
      <Skeleton className="h-5 w-24" />
      <Skeleton className="h-7 w-72 max-w-full" />
    </div>
  )
}
