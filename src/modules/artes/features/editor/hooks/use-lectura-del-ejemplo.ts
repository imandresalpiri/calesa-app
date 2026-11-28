'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { CodigoError } from '@/shared/lib/errores'
import {
  leerCotizacionesDelVehiculo,
  leerDatosDeLaCotizacion,
  leerDatosDelVehiculo,
} from '../../../composicion.client'
import { leadPreferido, type EjemploConDatos } from '../../../entities/datos/ejemplo-con-datos'
import type { EjemploElegido } from '../../../entities/datos/ejemplo-elegido'
import type { CotizacionDeEjemplo, CotizacionesDeEjemplo } from '../../../entities/datos/respuestas'

// `cargando`: se está leyendo el vehículo o la cotización (el lienzo sigue con lo último que tenía). `error`: lo último que se pidió no llegó.
export type LecturaDelEjemplo = { cargando: boolean; error: string | null }

export const CARGANDO: LecturaDelEjemplo = { cargando: true, error: null }
export const QUIETA: LecturaDelEjemplo = { cargando: false, error: null }

type Leido =
  | { ok: true; elegido: EjemploConDatos; pagina: CotizacionesDeEjemplo | null }
  | { ok: false; codigo: CodigoError; mensaje: string }

// La cotización de entrada: la pedida (la recordada) y, si ya no se ve, la primera de «De este vehículo» (la aprobada primero).
async function cotizacionDeEntrada(
  pedida: string | null,
  primera: string | null,
): Promise<CotizacionDeEjemplo | null> {
  for (const id of new Set([pedida, primera])) {
    if (id === null) {
      continue
    }
    const leida = await leerDatosDeLaCotizacion(id)
    if (leida.ok) {
      return leida.data
    }
  }
  return null
}

// El vehículo con su primera página de cotizaciones (en paralelo), la cotización de entrada y el lead preferido (`leadPreferido`).
async function leerElEjemplo(pedido: EjemploElegido, origenId: string): Promise<Leido> {
  const [vehiculo, pagina] = await Promise.all([
    leerDatosDelVehiculo({ id: pedido.vehiculoId, origenId }),
    leerCotizacionesDelVehiculo({ id: pedido.vehiculoId, cursor: null }),
  ])
  if (!vehiculo.ok) {
    return { ok: false, codigo: vehiculo.error.codigo, mensaje: vehiculo.error.mensaje }
  }
  const primera = pagina.ok ? (pagina.data.filas[0]?.id ?? null) : null
  const cotizacion = await cotizacionDeEntrada(pedido.cotizacionId, primera)
  const lead = leadPreferido(vehiculo.data.leads, {
    recordado: pedido.leadId,
    deLaCotizacion: cotizacion?.leadId ?? null,
  })
  return {
    ok: true,
    elegido: { vehiculo: vehiculo.data, cotizacion, lead },
    pagina: pagina.ok ? pagina.data : null,
  }
}

type Args = {
  origenId: string
  // Lo recordado en este navegador al abrir: se lee una vez.
  recordadoAlAbrir: EjemploElegido | null
  // Lo leído (o `null`: lo recordado ya no se ve y se suelta).
  alLeer: (elegido: EjemploConDatos | null) => void
  alLeerLaPagina: (vehiculoId: string, pagina: CotizacionesDeEjemplo | null) => void
}

// Leer un vehículo de ejemplo: al abrir, lo recordado; después, el que se elige. Cada lectura nueva deja sin efecto la anterior (`turno`, que
// también usa quien cambia la cotización): una respuesta vieja nunca pisa lo que se eligió después.
export function useLecturaDelEjemplo({ origenId, recordadoAlAbrir, alLeer, alLeerLaPagina }: Args) {
  const [lectura, setLectura] = useState(recordadoAlAbrir ? CARGANDO : QUIETA)
  const turnoRef = useRef(0)
  const ultimoPedido = useRef<EjemploElegido | null>(null)

  // Lo que llegó, si sigue siendo lo último que se pidió.
  const aplicar = useCallback(
    (mio: number, vehiculoId: string, leido: Leido, recordado: boolean) => {
      if (mio !== turnoRef.current) {
        return
      }
      if (!leido.ok) {
        const yaNoSeVe = recordado && leido.codigo === 'no_encontrado'
        setLectura({ cargando: false, error: yaNoSeVe ? null : leido.mensaje })
        if (yaNoSeVe) {
          alLeer(null)
        }
        return
      }
      alLeerLaPagina(vehiculoId, leido.pagina)
      alLeer(leido.elegido)
      setLectura(QUIETA)
    },
    [alLeer, alLeerLaPagina],
  )

  const pedir = useCallback(
    (pedido: EjemploElegido, recordado: boolean) => {
      const mio = ++turnoRef.current
      ultimoPedido.current = pedido
      void leerElEjemplo(pedido, origenId).then((leido) => {
        aplicar(mio, pedido.vehiculoId, leido, recordado)
      })
    },
    [origenId, aplicar],
  )

  useEffect(() => {
    if (recordadoAlAbrir) {
      pedir(recordadoAlAbrir, true)
    }
  }, [recordadoAlAbrir, pedir])

  const elegirVehiculo = useCallback(
    (vehiculoId: string) => {
      setLectura(CARGANDO)
      pedir({ vehiculoId, cotizacionId: null, leadId: null }, false)
    },
    [pedir],
  )

  // «Reintentar»: lo último que se pidió (el vehículo con su cotización y su lead).
  const reintentar = useCallback(() => {
    const pedido = ultimoPedido.current
    if (pedido) {
      setLectura(CARGANDO)
      pedir(pedido, false)
    }
  }, [pedir])

  return { lectura, setLectura, turnoRef, elegirVehiculo, reintentar }
}
