'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { TAMANO_DE_VER_MAS } from '@/shared/lib/paginacion'
import { leerMisTurnosEnElNavegador } from '../../../../areas/turnos/lecturas.client'
import {
  TOPE_DE_TURNOS_CARGADOS,
  cursorDelTurno,
  type Turno,
} from '../../../../entities/turnos/turnos'

export type TurnosDelPanel =
  | { estado: 'cargando' }
  | { estado: 'error' }
  | {
      estado: 'listo'
      turnos: Turno[]
      // La hora del servidor en que se leyó la primera página: con ella arranca la cuenta regresiva de cada tarjeta.
      leidoEn: string
      hayMas: boolean
      // Llegó a `TOPE_DE_TURNOS_CARGADOS` y hay más: «Ver más» deja su lugar al aviso del tope.
      enElTope: boolean
      cargandoMas: boolean
      errorAlSeguir: boolean
    }

// Sin repetir un turno que ya está (la lista corre mientras se lee: uno que se confirma o vence cambia de lugar).
function sumar(previos: readonly Turno[], nuevos: readonly Turno[]): Turno[] {
  const vistos = new Set(previos.map((turno) => turno.id))
  return [...previos, ...nuevos.filter((turno) => !vistos.has(turno.id))]
}

// Lo que lee el panel «Turnos de la web sin confirmar» (`?panel=turnos`): todos mis turnos `asignada` y `vencida`, de a `TAMANO_DE_VER_MAS` por cursor y hasta
// `TOPE_DE_TURNOS_CARGADOS`. Lee la primera página al montarse y otra vez al volver a la pestaña (un turno pudo vencer o reasignarse mientras tanto, como el bloque de
// Inicio): hasta que llega, lo que se ve no se suelta, y al llegar la lista vuelve a su primera página. Un pedido a la vez: uno nuevo invalida el que vuela (una
// relectura que sale antes no deja un hueco entre lo cargado y la página de «Ver más») y una respuesta que llega tarde se descarta.
export function useTurnosDelPanel() {
  const [estado, setEstado] = useState<TurnosDelPanel>({ estado: 'cargando' })
  const turno = useRef(0)

  const leerLaPrimera = useCallback(async () => {
    turno.current += 1
    const mio = turno.current
    const leida = await leerMisTurnosEnElNavegador({ tope: TAMANO_DE_VER_MAS }).catch(() => null)
    if (mio !== turno.current) return
    const primera = leida?.ok === true ? leida.data : null
    setEstado((actual) => {
      if (primera === null) {
        return actual.estado === 'listo' ? { ...actual, cargandoMas: false } : { estado: 'error' }
      }
      return {
        estado: 'listo',
        turnos: primera.filas,
        leidoEn: new Date().toISOString(),
        hayMas: primera.hayMas,
        enElTope: false,
        cargandoMas: false,
        errorAlSeguir: false,
      }
    })
  }, [])

  useEffect(() => {
    void leerLaPrimera()
    return () => void (turno.current += 1)
  }, [leerLaPrimera])

  useEffect(() => {
    const alVolver = () => {
      if (document.visibilityState === 'visible') void leerLaPrimera()
    }
    document.addEventListener('visibilitychange', alVolver)
    return () => document.removeEventListener('visibilitychange', alVolver)
  }, [leerLaPrimera])

  const verMas = useCallback(async () => {
    if (estado.estado !== 'listo' || estado.cargandoMas || !estado.hayMas || estado.enElTope) return
    const ultimo = estado.turnos.at(-1)
    if (!ultimo) return
    turno.current += 1
    const mio = turno.current
    setEstado({ ...estado, cargandoMas: true, errorAlSeguir: false })
    const leida = await leerMisTurnosEnElNavegador({
      tope: TAMANO_DE_VER_MAS,
      desde: cursorDelTurno(ultimo),
    }).catch(() => null)
    if (mio !== turno.current) return
    setEstado((actual) => {
      if (actual.estado !== 'listo') return actual
      if (leida === null || !leida.ok) {
        return { ...actual, cargandoMas: false, errorAlSeguir: true }
      }
      const turnos = sumar(actual.turnos, leida.data.filas)
      return {
        ...actual,
        turnos,
        hayMas: leida.data.hayMas,
        enElTope: leida.data.hayMas && turnos.length >= TOPE_DE_TURNOS_CARGADOS,
        cargandoMas: false,
        errorAlSeguir: false,
      }
    })
  }, [estado])

  // «Contacté» salió bien: el turno se va de la lista sin releerla (releer soltaría las páginas que se cargaron).
  const quitar = useCallback((id: string) => {
    setEstado((actual) =>
      actual.estado === 'listo'
        ? { ...actual, turnos: actual.turnos.filter((uno) => uno.id !== id) }
        : actual,
    )
  }, [])

  return {
    estado,
    verMas: () => void verMas(),
    quitar,
    reintentar: () => {
      setEstado({ estado: 'cargando' })
      void leerLaPrimera()
    },
  }
}
