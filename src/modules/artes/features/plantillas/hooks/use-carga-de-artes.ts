'use client'

import { useRef, useState } from 'react'
import type { ErrorApp, Resultado } from '@/shared/lib/errores'
import { TOPE_DE_LO_CARGADO } from '@/shared/lib/paginacion'
import type { PaginaDeArtes } from '../../../entities/tipos'

type Estado<Fila> = {
  // La primera página que trajo el servidor: si llega otra (una action revalidó `/artes`), lo cargado vuelve a empezar desde ella.
  base: PaginaDeArtes<Fila>
  filas: Fila[]
  siguiente: string | null
  cargando: boolean
  error: ErrorApp | null
}

function desde<Fila>(base: PaginaDeArtes<Fila>): Estado<Fila> {
  return { base, filas: base.filas, siguiente: base.siguiente, cargando: false, error: null }
}

function juntar<Fila extends { id: string }>(
  e: Estado<Fila>,
  leida: Resultado<PaginaDeArtes<Fila>>,
): Estado<Fila> {
  if (!leida.ok) {
    return { ...e, cargando: false, error: leida.error }
  }
  const vistas = new Set(e.filas.map((f) => f.id))
  const filas = [...e.filas, ...leida.data.filas.filter((f) => !vistas.has(f.id))].slice(
    0,
    TOPE_DE_LO_CARGADO,
  )
  return { ...e, filas, siguiente: leida.data.siguiente, cargando: false, error: null }
}

type Parametros<Fila> = {
  inicial: PaginaDeArtes<Fila>
  // La página siguiente (una action que lee en el servidor: la pestaña no paga en frío el cliente de Supabase).
  leerMas: (cursor: string) => Promise<Resultado<PaginaDeArtes<Fila>>>
  mensaje: string
}

// Lo cargado de una rejilla de Artes: la primera página la trae el servidor y «Ver más» suma la siguiente (sin repetir ids, hasta
// `TOPE_DE_LO_CARGADO`). Un pedido a la vez; si falla, lo cargado se queda y «Reintentar» pide lo mismo.
export function useCargaDeArtes<Fila extends { id: string }>({
  inicial,
  leerMas,
  mensaje,
}: Parametros<Fila>) {
  const [estado, setEstado] = useState(() => desde(inicial))
  const enVuelo = useRef(false)
  if (estado.base !== inicial) {
    setEstado(desde(inicial))
  }

  async function pedir(base: PaginaDeArtes<Fila>, cursor: string) {
    try {
      const leida = await leerMas(cursor)
      setEstado((e) => (e.base === base ? juntar(e, leida) : e))
    } catch {
      setEstado((e) =>
        e.base === base ? { ...e, cargando: false, error: { codigo: 'inesperado', mensaje } } : e,
      )
    } finally {
      enVuelo.current = false
    }
  }

  const enElTope = estado.filas.length >= TOPE_DE_LO_CARGADO && estado.siguiente !== null
  const verMas = () => {
    if (enVuelo.current || estado.siguiente === null || enElTope) {
      return
    }
    enVuelo.current = true
    setEstado((e) => ({ ...e, cargando: true, error: null }))
    void pedir(estado.base, estado.siguiente)
  }
  return {
    filas: estado.filas,
    cargando: estado.cargando,
    error: estado.error,
    enElTope,
    hayMasParaPedir: estado.siguiente !== null && !enElTope,
    verMas,
    porId: (id: string | null) => estado.filas.find((f) => f.id === id) ?? null,
  }
}
