'use client'

import type { ReactNode } from 'react'
import { cn } from 'cn'
import { Monto } from '@/shared/ui/monto'
import { useMontoEnTexto } from '@/shared/ui/monto-en-texto'
import {
  costoEstimadoDe,
  nombreDeCompartirLaAprobada,
  SIN_TOTAL,
  type CostoEstimado as Costo,
  type CotizacionAprobadaDeLaFila,
} from '../../../entities/cotizacion-aprobada-de-la-fila'
import { useCompartirLaAprobada } from '../hooks/compartir-de-la-aprobada'

const VACIO = <span className="text-(--color-ink-faint)">—</span>

const TITULO_DEL_BOTON = 'Compartir la cotización aprobada'

// El primer resultado de la aprobada con su moneda congelada y, si lo hay, el modo de tipo de cambio («US$27.999 · Unificado»). Sin total, lo dice (sin modo). El monto nunca se corta:
// lo que se corta con «…» es el modo.
function Contenido({ costo }: { costo: Costo }) {
  if (costo.tipo === 'sin_total') {
    return SIN_TOTAL
  }
  return (
    <>
      <Monto valor={costo.valor} moneda={costo.moneda} className="shrink-0" />
      {costo.modo === null ? null : (
        <span className="min-w-0 truncate text-(--color-ink-soft)">{` · ${costo.modo}`}</span>
      )}
    </>
  )
}

const BASE = 'inline-flex max-w-full min-w-0 items-baseline'

// Todo el costo es un botón que abre «Compartir la cotización» de la aprobada, sin salir de la lista (`data-no-abre`: el clic no abre la ficha del vehículo). En el celular su zona
// de toque se estira (44 px) sin mover nada. También con el Modo Live: el monto sin su moneda (`<Monto>` y, en el nombre accesible, `useMontoEnTexto()`); el panel
// comparte completo.
function Costo({
  aprobada,
  className,
}: {
  aprobada: CotizacionAprobadaDeLaFila
  className?: string
}) {
  const costo = costoEstimadoDe(aprobada)
  const compartir = useCompartirLaAprobada()
  const montoEnTexto = useMontoEnTexto()
  const contenido: ReactNode = <Contenido costo={costo} />
  if (compartir === null) {
    return <span className={cn(BASE, 'text-(--color-ink)', className)}>{contenido}</span>
  }
  const monto = costo.tipo === 'monto' ? montoEnTexto(costo.valor, { moneda: costo.moneda }) : ''
  return (
    <button
      type="button"
      data-no-abre=""
      title={TITULO_DEL_BOTON}
      aria-label={nombreDeCompartirLaAprobada(costo, monto)}
      onClick={() => {
        compartir(costo.cotizacionId)
      }}
      className={cn(
        BASE,
        "relative cursor-pointer rounded-(--radius-sm) text-left text-(--color-ink) underline decoration-(--color-ink-faint) decoration-dotted underline-offset-4 hover:decoration-solid max-md:after:absolute max-md:after:inset-x-0 max-md:after:-inset-y-3 max-md:after:content-['']",
        className,
      )}
    >
      {contenido}
    </button>
  )
}

// La celda de la tabla: a la derecha, o «—» si el vehículo no tiene una aprobada que quien mira vea.
export function CeldaDeCostoEstimado({
  aprobada,
}: {
  aprobada: CotizacionAprobadaDeLaFila | null
}) {
  return aprobada === null ? VACIO : <Costo aprobada={aprobada} className="max-w-64" />
}

// El dato de la tarjeta de la lista (su rótulo lo pone la fila): lo mismo, o «—».
export function CostoEstimado({ aprobada }: { aprobada: CotizacionAprobadaDeLaFila | null }) {
  return aprobada === null ? VACIO : <Costo aprobada={aprobada} />
}
