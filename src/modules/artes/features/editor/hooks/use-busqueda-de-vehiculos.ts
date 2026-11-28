'use client'

import { useCallback, useEffect, useState } from 'react'
import { TOPE_DE_LO_CARGADO } from '@/shared/lib/paginacion'
import { leerVehiculosDeEjemplo, MENSAJE_SIN_LOS_VEHICULOS } from '../../../composicion.client'
import { busquedaDelEjemplo } from '../../../entities/datos/busqueda-de-vehiculos'
import type { FilaDeVehiculoDeEjemplo } from '../../../entities/datos/respuestas'

const RETRASO_EN_MS = 300

type Pagina = { filas: readonly FilaDeVehiculoDeEjemplo[]; siguiente: string | null }

// Lo que dibuja la lista: lo escrito no alcanza, buscando, la lista, sin coincidencias (o sin vehículos, sin texto) o un error con «Reintentar».
export type EstadoDeLaBusqueda =
  | { tipo: 'corta' }
  | { tipo: 'cargando' }
  | { tipo: 'error'; mensaje: string }
  | { tipo: 'vacia'; texto: string | null }
  | {
      tipo: 'lista'
      filas: readonly FilaDeVehiculoDeEjemplo[]
      hayMas: boolean
      // Llegó a `TOPE_DE_LO_CARGADO`: «Ver más» se apaga y `<AvisoDeTope>` lleva a buscar.
      enTope: boolean
      cargandoMas: boolean
      errorDeMas: string | null
    }

type Guardada = {
  clave: string
  pagina: Pagina | null
  cargandoMas: boolean
  errorDeMas: string | null
}

function sinRepetir(
  antes: readonly FilaDeVehiculoDeEjemplo[],
  nuevas: readonly FilaDeVehiculoDeEjemplo[],
): FilaDeVehiculoDeEjemplo[] {
  const vistas = new Set(antes.map((f) => f.id))
  return [...antes, ...nuevas.filter((f) => !vistas.has(f.id))].slice(0, TOPE_DE_LO_CARGADO)
}

function estadoDe(guardada: Guardada, texto: string | null): EstadoDeLaBusqueda {
  const { pagina } = guardada
  if (pagina === null) {
    return { tipo: 'error', mensaje: MENSAJE_SIN_LOS_VEHICULOS }
  }
  if (pagina.filas.length === 0) {
    return { tipo: 'vacia', texto }
  }
  const enTope = pagina.filas.length >= TOPE_DE_LO_CARGADO && pagina.siguiente !== null
  return {
    tipo: 'lista',
    filas: pagina.filas,
    hayMas: !enTope && pagina.siguiente !== null,
    enTope,
    cargandoMas: guardada.cargandoMas,
    errorDeMas: guardada.errorDeMas,
  }
}

// Los vehículos del origen para elegir el de ejemplo: sin texto, lo más nuevo; con 3 o más letras o números, los que coinciden (espera un momento
// mientras se tipea). «Ver más» suma de a `TAMANO_DE_VER_MAS` hasta `TOPE_DE_LO_CARGADO`, sin repetir. Una respuesta de una búsqueda que ya no es
// la vigente se descarta; el estado se deriva de la clave de la búsqueda de ahora.
export function useBusquedaDeVehiculos(origenId: string) {
  const [texto, setTexto] = useState('')
  const [intento, setIntento] = useState(0)
  const [guardada, setGuardada] = useState<Guardada | null>(null)
  const busqueda = busquedaDelEjemplo(texto)
  const buscado = busqueda.tipo === 'texto' ? busqueda.texto : null
  const clave = `${String(intento)}:${busqueda.tipo}:${buscado ?? ''}`

  useEffect(() => {
    if (busqueda.tipo === 'corta') {
      return
    }
    const control = new AbortController()
    const espera = setTimeout(
      () => {
        void leerVehiculosDeEjemplo(
          { origenId, texto: buscado, cursor: null },
          control.signal,
        ).then((leida) => {
          if (!control.signal.aborted) {
            const pagina = leida.ok ? leida.data : null
            setGuardada({ clave, pagina, cargandoMas: false, errorDeMas: null })
          }
        })
      },
      buscado === null ? 0 : RETRASO_EN_MS,
    )
    return () => {
      control.abort()
      clearTimeout(espera)
    }
  }, [origenId, busqueda.tipo, buscado, clave])

  const vigente = guardada?.clave === clave ? guardada : null
  const verMas = useCallback(() => {
    const siguiente = vigente?.pagina?.siguiente ?? null
    if (!vigente || vigente.cargandoMas || siguiente === null) {
      return
    }
    setGuardada({ ...vigente, cargandoMas: true, errorDeMas: null })
    void leerVehiculosDeEjemplo({ origenId, texto: buscado, cursor: siguiente }).then((leida) => {
      setGuardada((antes) => {
        if (antes?.clave !== clave || antes.pagina === null) {
          return antes
        }
        if (!leida.ok) {
          return { ...antes, cargandoMas: false, errorDeMas: MENSAJE_SIN_LOS_VEHICULOS }
        }
        const filas = sinRepetir(antes.pagina.filas, leida.data.filas)
        const pagina = { filas, siguiente: leida.data.siguiente }
        return { clave, pagina, cargandoMas: false, errorDeMas: null }
      })
    })
  }, [vigente, origenId, buscado, clave])

  let estado: EstadoDeLaBusqueda
  if (busqueda.tipo === 'corta') {
    estado = { tipo: 'corta' }
  } else {
    estado = vigente ? estadoDe(vigente, buscado) : { tipo: 'cargando' }
  }

  return {
    texto,
    setTexto,
    estado,
    verMas,
    reintentar: () => {
      setIntento((n) => n + 1)
    },
  }
}
