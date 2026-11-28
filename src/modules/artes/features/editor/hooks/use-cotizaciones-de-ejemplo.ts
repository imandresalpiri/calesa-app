'use client'

import { useCallback, useRef, useState } from 'react'
import { TOPE_DE_ESTE_VEHICULO } from '@/shared/lib/paginacion'
import { leerCotizacionesDelVehiculo } from '../../../composicion.client'
import type {
  CotizacionesDeEjemplo,
  FilaDeCotizacionDeEjemplo,
} from '../../../entities/datos/respuestas'

export const MENSAJE_SIN_LAS_COTIZACIONES = 'No se pudieron leer las cotizaciones.'

type Lista = {
  vehiculoId: string
  filas: readonly FilaDeCotizacionDeEjemplo[]
  siguiente: string | null
  // La primera página no llegó: «Reintentar» la vuelve a pedir.
  error: string | null
}

export type CotizacionesDelEjemplo = {
  filas: readonly FilaDeCotizacionDeEjemplo[]
  // Hay otra página y todavía no se llegó al tope (`TOPE_DE_ESTE_VEHICULO`).
  hayMas: boolean
  enTope: boolean
  cargandoMas: boolean
  error: string | null
  verMas: () => void
}

function sinRepetir(
  antes: readonly FilaDeCotizacionDeEjemplo[],
  nuevas: readonly FilaDeCotizacionDeEjemplo[],
): FilaDeCotizacionDeEjemplo[] {
  const vistas = new Set(antes.map((f) => f.id))
  return [...antes, ...nuevas.filter((f) => !vistas.has(f.id))].slice(0, TOPE_DE_ESTE_VEHICULO)
}

// «De este vehículo» para elegir la cotización de ejemplo: la primera página la trae quien elige el vehículo (la necesita para elegir la
// primera) y «Ver más cotizaciones» suma de a `TAMANO_DE_ESTE_VEHICULO` hasta `TOPE_DE_ESTE_VEHICULO`, sin repetir (una que se movió de página
// por una nueva no sale dos veces). Una respuesta de otro vehículo se descarta.
export function useCotizacionesDeEjemplo() {
  const [lista, setLista] = useState<Lista | null>(null)
  const [cargandoMas, setCargandoMas] = useState(false)
  const vigente = useRef<string | null>(null)

  const empezar = useCallback((vehiculoId: string, pagina: CotizacionesDeEjemplo | null) => {
    vigente.current = vehiculoId
    setCargandoMas(false)
    setLista({
      vehiculoId,
      filas: pagina ? sinRepetir([], pagina.filas) : [],
      siguiente: pagina?.siguiente ?? null,
      error: pagina ? null : MENSAJE_SIN_LAS_COTIZACIONES,
    })
  }, [])

  const olvidar = useCallback(() => {
    vigente.current = null
    setLista(null)
    setCargandoMas(false)
  }, [])

  const verMas = useCallback(() => {
    if (!lista || cargandoMas || (lista.siguiente === null && lista.error === null)) {
      return
    }
    const { vehiculoId } = lista
    setCargandoMas(true)
    void leerCotizacionesDelVehiculo({ id: vehiculoId, cursor: lista.siguiente }).then((leida) => {
      if (vigente.current !== vehiculoId) {
        return
      }
      setCargandoMas(false)
      setLista((antes) => {
        if (!antes || antes.vehiculoId !== vehiculoId) {
          return antes
        }
        if (!leida.ok) {
          return { ...antes, error: MENSAJE_SIN_LAS_COTIZACIONES }
        }
        return {
          vehiculoId,
          filas: sinRepetir(antes.filas, leida.data.filas),
          siguiente: leida.data.siguiente,
          error: null,
        }
      })
    })
  }, [lista, cargandoMas])

  const filas = lista?.filas ?? []
  const enTope = filas.length >= TOPE_DE_ESTE_VEHICULO && lista?.siguiente != null
  const cotizaciones: CotizacionesDelEjemplo = {
    filas,
    hayMas: !enTope && (lista?.siguiente ?? null) !== null,
    enTope,
    cargandoMas,
    error: lista?.error ?? null,
    verMas,
  }
  return { cotizaciones, empezar, olvidar }
}
