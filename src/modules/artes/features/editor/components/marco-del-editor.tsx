import type { ReactNode } from 'react'
import { RUTAS } from '@/shared/lib/rutas'
import { Skeleton } from '@/shared/ui/skeleton'
import type { TipoDeArte } from '../../../entities/formatos'
import { EnlaceVolverAArtes } from './barra/enlace-volver-a-artes'
import {
  ANCHOS_DE_LA_BARRA,
  CELDAS_DEL_EDITOR,
  ENCIMA_DEL_LIENZO,
  REJILLA_DEL_EDITOR,
} from './rejilla'

type Props = {
  // Sin ellos (el `loading.tsx`, antes de leer la plantilla), la barra lleva sólo «Volver a Artes».
  nombre?: string
  formato?: string
  // Un PDF reserva abajo del panel izquierdo la tira de páginas (9 rem): al llegar el editor nada cambia de tamaño.
  tipo?: TipoDeArte
  // El «Sin conexión» del diferido si el código del editor no llegó (`conElAviso`): va encima del lienzo.
  aviso?: ReactNode
}

const HERRAMIENTAS_EN_FRIO = 9

// El editor de artes antes de su código (puro): la barra fina con «Volver a Artes», el nombre y el formato (y, a la derecha, el lugar del vehículo
// de ejemplo, de ancho fijo), y los paneles en esqueleto con las mismas medidas que el editor (`rejilla.ts`): los dos con la fila de sus dos
// pestañas (en un PDF, con el lugar de la tira de páginas abajo del izquierdo). Es la versión en frío del diferido, lo que dibuja el
// `loading.tsx` y el fondo del aviso si el código no llega.
export function MarcoDelEditor({ nombre, formato, tipo, aviso }: Props) {
  return (
    <div className={REJILLA_DEL_EDITOR}>
      <header className={CELDAS_DEL_EDITOR.barra}>
        <EnlaceVolverAArtes href={RUTAS.artes} />
        <span aria-hidden className="h-5 w-px shrink-0 bg-(--color-line)" />
        <h1 className="min-w-0 truncate px-2 text-(length:--text-sm) font-medium text-(--color-ink)">
          {nombre ?? <span className="sr-only">Editor de artes</span>}
        </h1>
        {formato ? (
          <span className="shrink-0 text-(length:--text-sm) text-(--color-ink-soft) tabular-nums">
            {formato}
          </span>
        ) : null}
        <div aria-hidden className="ml-auto flex min-w-0 items-center gap-2">
          <Skeleton className={`h-8 ${ANCHOS_DE_LA_BARRA.ejemplo} shrink-0`} />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-8 w-20" />
          {tipo === 'pdf' ? (
            <Skeleton className={`h-8 ${ANCHOS_DE_LA_BARRA.pdf} shrink-0`} />
          ) : null}
        </div>
      </header>
      <div aria-hidden className={CELDAS_DEL_EDITOR.riel}>
        <div className="flex flex-col items-center gap-1 py-2">
          {Array.from({ length: HERRAMIENTAS_EN_FRIO }, (_, i) => (
            <Skeleton key={i} className="size-8" />
          ))}
        </div>
      </div>
      <div aria-hidden className={CELDAS_DEL_EDITOR.izquierda}>
        <div className="flex h-full min-h-0 flex-col">
          <div className="min-h-0 flex-1 overflow-hidden">
            <PanelEnFrio filas={6} />
          </div>
          {tipo === 'pdf' ? <TiraEnFrio /> : null}
        </div>
      </div>
      <div
        role="status"
        aria-busy="true"
        aria-label="Cargando el editor de artes"
        className={CELDAS_DEL_EDITOR.lienzo}
      >
        {aviso ? <div className={ENCIMA_DEL_LIENZO}>{aviso}</div> : null}
      </div>
      <div aria-hidden className={CELDAS_DEL_EDITOR.derecha}>
        <PanelEnFrio filas={5} />
      </div>
    </div>
  )
}

// Un panel en esqueleto: la fila de 40 px de sus pestañas y unas líneas.
function PanelEnFrio({ filas }: { filas: number }) {
  return (
    <div className="grid gap-4">
      <div className="flex h-10 items-center gap-2 border-b border-(--color-line) px-3">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-14" />
      </div>
      <div className="grid gap-3 px-3">
        {Array.from({ length: filas }, (_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    </div>
  )
}

// La tira de páginas en esqueleto: el mismo alto que `TiraDePaginas` (9 rem), con su título y una miniatura.
function TiraEnFrio() {
  return (
    <div className="flex h-36 shrink-0 flex-col border-t border-(--color-line)">
      <div className="flex h-8 shrink-0 items-center justify-between pr-2 pl-3">
        <Skeleton className="h-4 w-14" />
        <Skeleton className="size-7" />
      </div>
      <div className="px-3 pt-1">
        <Skeleton className="h-19 w-14" />
      </div>
    </div>
  )
}
