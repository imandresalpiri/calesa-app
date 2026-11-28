'use client'

import { useCallback, useMemo, useState } from 'react'
import { leerDatosDeLaCotizacion } from '../../../composicion.client'
import {
  datosDelEjemploElegido,
  leadAlCambiarDeCotizacion,
  leadsDelEjemplo,
  type EjemploConDatos,
} from '../../../entities/datos/ejemplo-con-datos'
import type { EjemploElegido } from '../../../entities/datos/ejemplo-elegido'
import type { DatosDelArte, FijosDelArte } from '../../../entities/datos/tipos'
import { datosDelArteDeEjemplo } from '../../../entities/editor/datos-de-ejemplo'
import { elEjemploRecordado, recordarElEjemplo } from './ejemplo-recordado'
import { useCotizacionesDeEjemplo } from './use-cotizaciones-de-ejemplo'
import { CARGANDO, QUIETA, useLecturaDelEjemplo } from './use-lectura-del-ejemplo'

type Args = {
  personaId: string
  plantillaId: string
  origen: { id: string; nombre: string }
  fijos: FijosDelArte
  // Sin `vehiculos.ver` en el origen: no hay qué elegir y nada se lee (ni lo recordado).
  motivo: string | null
}

function eleccionDe(elegido: EjemploConDatos): EjemploElegido {
  return {
    vehiculoId: elegido.vehiculo.vehiculo.id,
    cotizacionId: elegido.cotizacion?.cotizacion.id ?? null,
    leadId: elegido.lead?.leadId ?? null,
  }
}

// El vehículo de ejemplo del editor de artes (docs/GLOSARIO.md › «Vehículo de ejemplo»): sin nada elegido, los datos de ejemplo; con un
// vehículo, todo real (el vehículo, la primera cotización de «De este vehículo» y su lead o el vinculado), sin mezclar. Lo elegido se recuerda en
// este navegador por persona y plantilla (el editor no se dibuja en el servidor: leerlo al montar no cambia lo hidratado); lo recordado que ya
// no se ve se suelta en silencio.
export function useVehiculoDeEjemplo({ personaId, plantillaId, origen, fijos, motivo }: Args) {
  const [recordadoAlAbrir] = useState(() =>
    motivo === null ? elEjemploRecordado(personaId, plantillaId) : null,
  )
  const [elegido, setElegido] = useState<EjemploConDatos | null>(null)
  const { cotizaciones, empezar, olvidar } = useCotizacionesDeEjemplo()

  const recordar = useCallback(
    (siguiente: EjemploConDatos | null) => {
      setElegido(siguiente)
      recordarElEjemplo(personaId, plantillaId, siguiente ? eleccionDe(siguiente) : null)
    },
    [personaId, plantillaId],
  )
  const l = useLecturaDelEjemplo({
    origenId: origen.id,
    recordadoAlAbrir,
    alLeer: recordar,
    alLeerLaPagina: empezar,
  })
  const { setLectura, turnoRef } = l

  const elegirCotizacion = useCallback(
    (cotizacionId: string) => {
      if (!elegido) {
        return
      }
      const mio = ++turnoRef.current
      setLectura(CARGANDO)
      void leerDatosDeLaCotizacion(cotizacionId).then((leida) => {
        if (mio !== turnoRef.current) {
          return
        }
        if (!leida.ok) {
          setLectura({ cargando: false, error: leida.error.mensaje })
          return
        }
        const { leads } = elegido.vehiculo
        const lead = leadAlCambiarDeCotizacion(leads, elegido.lead, leida.data.leadId)
        recordar({ ...elegido, cotizacion: leida.data, lead })
        setLectura(QUIETA)
      })
    },
    [elegido, recordar, setLectura, turnoRef],
  )

  const elegirLead = useCallback(
    (leadId: string | null) => {
      if (elegido) {
        const lead = leadsDelEjemplo(elegido.vehiculo.leads).find((x) => x.leadId === leadId)
        recordar({ ...elegido, lead: lead ?? null })
      }
    },
    [elegido, recordar],
  )

  const soltar = useCallback(() => {
    turnoRef.current++
    olvidar()
    recordar(null)
    setLectura(QUIETA)
  }, [olvidar, recordar, setLectura, turnoRef])

  const { asesor, empresa } = fijos
  const datos: DatosDelArte = useMemo(
    () =>
      elegido
        ? datosDelEjemploElegido(elegido, { asesor, empresa })
        : datosDelArteDeEjemplo({ fijos: { asesor, empresa }, origen: origen.nombre }),
    [elegido, asesor, empresa, origen.nombre],
  )

  return {
    datos,
    elegido,
    lectura: l.lectura,
    cotizaciones,
    elegirVehiculo: l.elegirVehiculo,
    elegirCotizacion,
    elegirLead,
    soltar,
    reintentar: l.reintentar,
  }
}

export type VehiculoDeEjemploDelEditor = ReturnType<typeof useVehiculoDeEjemplo>
