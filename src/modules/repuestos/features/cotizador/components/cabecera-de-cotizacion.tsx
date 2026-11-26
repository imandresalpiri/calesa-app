'use client'

import type { Route } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { formatearFecha } from '@/shared/lib/fechas'
import { RUTAS } from '@/shared/lib/rutas'
import { Monto } from '@/shared/ui/monto'
import { useRegional } from '@/shared/ui/regional'
import type { CotizacionLeida } from '../../../entities/cotizador/hoja-de-lectura'
import { EstadoDeCotizacion } from './estado-de-cotizacion'

type Props = {
  cotizacion: CotizacionLeida
  proyecto: { id: string; numero: number }
  // El cliente del proyecto, ya dibujado por `src/app` (`repuestos` no cruza áreas): el mismo de la cabecera de `/repuestos/<id>`.
  cliente: ReactNode
  // El total que se muestra: el de la base en una hoja de lectura, el calculado en vivo en la borrador; nulo es «Sin total», nunca 0.
  total: string | null
  // «Aceptar» y «Anular», arriba a la derecha.
  acciones?: ReactNode
}

function Dato({ nombre, children }: { nombre: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-(length:--text-xs) text-(--color-ink-faint)">{nombre}</dt>
      <dd className="min-h-7 min-w-0 break-words">{children}</dd>
    </div>
  )
}

// La cabecera de una cotización de repuestos, igual en las dos hojas: lo que la define. Volver al proyecto; el número con su estado y las acciones a la derecha;
// y debajo el proyecto, el cliente del proyecto, las fechas y el total (el último: con su columna, cambiar de cifra no mueve nada). Una cotización de repuestos no
// guarda un cliente propio: es el del proyecto.
export function CabeceraDeCotizacion({ cotizacion, proyecto, cliente, total, acciones }: Props) {
  const { zonaHoraria } = useRegional()
  const volver = `${RUTAS.repuestos}/${proyecto.id}?pestana=cotizaciones`
  return (
    <header className="grid gap-3">
      <Link
        href={volver as Route}
        className="inline-flex min-h-11 w-fit items-center text-(length:--text-sm) underline-offset-2 hover:underline md:min-h-0"
      >
        Volver al proyecto
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="text-(length:--text-xl) font-semibold">
            Cotización #{String(cotizacion.numero)}
          </h1>
          <EstadoDeCotizacion estado={cotizacion.estado} />
        </div>
        {acciones ? <div className="flex flex-col gap-1 md:items-end">{acciones}</div> : null}
      </div>
      <dl className="grid grid-cols-[minmax(0,1fr)] gap-x-6 gap-y-3 text-(length:--text-sm) sm:grid-cols-2 lg:grid-cols-4">
        <Dato nombre="Proyecto">
          #{String(proyecto.numero)} · {cotizacion.moneda}
        </Dato>
        <Dato nombre="Cliente">{cliente}</Dato>
        <Dato nombre="Fechas">
          Creada el {formatearFecha(cotizacion.creadoEn, { zona: zonaHoraria })}
          {cotizacion.aceptadaEn
            ? ` · Aceptada el ${formatearFecha(cotizacion.aceptadaEn, { zona: zonaHoraria })}`
            : null}
        </Dato>
        <Dato nombre="Total">
          <span
            aria-live="polite"
            data-total-de-la-cotizacion=""
            className="inline-flex h-7 items-center tabular-nums"
          >
            {total === null ? (
              <span className="text-(--color-ink-soft)">Sin total</span>
            ) : (
              <Monto
                valor={Number(total)}
                moneda={cotizacion.moneda}
                className="text-(length:--text-lg) font-semibold"
              />
            )}
          </span>
        </Dato>
      </dl>
    </header>
  )
}
