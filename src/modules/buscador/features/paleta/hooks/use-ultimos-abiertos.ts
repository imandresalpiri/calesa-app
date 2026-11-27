'use client'

import { useEffect, useState } from 'react'
import { MENSAJE_INESPERADO, fallo, type Resultado } from '@/shared/lib/errores'
import { leerUltimosAbiertos } from '../../../composicion.client'
import { estadoDeError, type EstadoDeLosUltimos } from '../../../entities/estado-de-la-paleta'
import { TIPOS_DEL_BUSCADOR, type Abierto, type TipoDelBuscador } from '../../../entities/ranking'

type Lectura = (pedido: {
  signal: AbortSignal
  tipos: readonly TipoDelBuscador[]
}) => Promise<Resultado<Abierto[]>>
type Guardado = { clave: string; estado: EstadoDeLosUltimos }

const CARGANDO: EstadoDeLosUltimos = { tipo: 'cargando' }

async function leerSinLanzar(
  leer: Lectura,
  tipos: readonly TipoDelBuscador[],
  signal: AbortSignal,
): Promise<Resultado<Abierto[]>> {
  try {
    return await leer({ signal, tipos })
  } catch {
    return fallo('inesperado', MENSAJE_INESPERADO)
  }
}

// «Últimos abiertos» de la paleta. Sin memoria (D5): se vuelve a leer cada vez que la paleta pasa de cerrada a abierta, porque las visitas cambian con
// cada ficha; mientras se lee no se enseña la lista de la apertura anterior. Cerrar cancela la lectura en vuelo y su respuesta tardía no se guarda.
// `tipos`: los que se pueden leer (con el Modo Live, sólo lo que muestra); de los demás no se pide ni se hidrata nada.
export function useUltimosAbiertos({
  abierta,
  tipos = TIPOS_DEL_BUSCADOR,
  leer = leerUltimosAbiertos,
}: {
  abierta: boolean
  tipos?: readonly TipoDelBuscador[]
  leer?: Lectura
}): { estado: EstadoDeLosUltimos; reintentar: () => void } {
  const [intento, setIntento] = useState(0)
  const [vez, setVez] = useState(0)
  const [estabaAbierta, setEstabaAbierta] = useState(abierta)
  const [guardado, setGuardado] = useState<Guardado | null>(null)
  // Cada apertura es una lectura nueva (se ajusta en el render, sin efecto).
  if (abierta !== estabaAbierta) {
    setEstabaAbierta(abierta)
    if (abierta) {
      setVez((n) => n + 1)
    }
  }
  const clave = `${String(vez)}:${String(intento)}`

  useEffect(() => {
    if (!abierta) {
      return
    }
    const controlador = new AbortController()
    void leerSinLanzar(leer, tipos, controlador.signal).then((r) => {
      if (controlador.signal.aborted) {
        return
      }
      setGuardado({
        clave,
        estado: r.ok
          ? { tipo: 'listo', abiertos: r.data }
          : estadoDeError(r.error, typeof navigator === 'undefined' || navigator.onLine),
      })
    })
    return () => {
      controlador.abort()
    }
  }, [abierta, clave, leer, tipos])

  return {
    estado: abierta && guardado?.clave === clave ? guardado.estado : CARGANDO,
    reintentar: () => {
      setIntento((n) => n + 1)
    },
  }
}
