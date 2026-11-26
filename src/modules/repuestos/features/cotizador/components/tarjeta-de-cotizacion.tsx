'use client'

import { formatearFecha } from '@/shared/lib/fechas'
import { AbrirResumen, MasAcciones, TarjetaDeLista, type AccionDeMenu } from '@/shared/ui/lista'
import { Monto } from '@/shared/ui/monto'
import { useRegional } from '@/shared/ui/regional'
import type { FilaDeCotizacion } from '../../../entities/cotizador/cotizacion'
import { EstadoDeCotizacion } from './estado-de-cotizacion'

type Props = {
  fila: FilaDeCotizacion
  acciones: readonly AccionDeMenu[]
  alAbrir: () => void
}

// La tarjeta de la lista de una cotización: número y estado, el total que guardó la base (nulo es «Sin total», nunca 0) y las fechas, siempre las tres líneas
// (sin aceptar dice «Sin aceptar»): todas miden lo mismo. Tocarla abre su hoja; el «⋯» va en su esquina.
export function TarjetaDeCotizacion({ fila: c, acciones, alAbrir }: Props) {
  const { zonaHoraria } = useRegional()
  const titulo = `Cotización #${String(c.numero)}`
  return (
    <TarjetaDeLista
      alAbrir={alAbrir}
      acciones={<MasAcciones nombre={titulo} id={`cotizacion-${c.id}-mas`} acciones={acciones} />}
    >
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
        <AbrirResumen nombre={titulo} className="min-w-0 font-medium break-words">
          {titulo}
        </AbrirResumen>
        <EstadoDeCotizacion estado={c.estado} />
      </div>
      <p className="flex min-w-0 flex-wrap items-baseline gap-x-2 text-(length:--text-sm)">
        {c.total === null ? (
          <span className="text-(--color-ink-soft)">Sin total</span>
        ) : (
          <Monto valor={Number(c.total)} moneda={c.moneda} className="font-medium" />
        )}
      </p>
      <p className="min-w-0 text-(length:--text-sm) break-words text-(--color-ink-soft)">
        Creada el {formatearFecha(c.creadoEn, { zona: zonaHoraria })}
        {' · '}
        {c.aceptadaEn
          ? `Aceptada el ${formatearFecha(c.aceptadaEn, { zona: zonaHoraria })}`
          : 'Sin aceptar'}
      </p>
    </TarjetaDeLista>
  )
}
