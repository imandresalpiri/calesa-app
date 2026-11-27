'use client'

import { createContext, use, useCallback, useMemo, useState, type ReactNode } from 'react'
import { etiquetaDeRequisito } from '@/modules/flujos/client'
import { avisosDeQueFalta, destinoPrincipal } from '../../../../entities/mover/avisos-de-que-falta'
import type { CadenaDeLaUnidad } from '../../../../entities/mover/cadena'
import { ProveedorDeAvisosDeLasTarjetas } from '../../../nucleo/avisos-de-las-tarjetas'
import { useAlCambiarLaUnidad } from '../../../nucleo/hooks/eventos-de-la-unidad'
import type { QueFalta } from '../../actions/leer-que-falta'
import type { RequisitosDeLaFase } from '../../actions/leer-requisitos-de-la-fase'

type ValorDeLaCadena = {
  cadena: CadenaDeLaUnidad
  // «Qué falta» publica aquí cada lectura que termina: de ella salen los avisos de las tarjetas, sin otra consulta.
  publicar: (dato: QueFalta) => void
  // Los requisitos de las fases que no son destino, por fase, ya leídos: volver a tocar una no la relee. Se vacía cuando la unidad cambia o llega otra cadena.
  requisitosLeidos: RequisitosLeidos
}

export type RequisitosLeidos = {
  porFase: Readonly<Partial<Record<string, RequisitosDeLaFase>>>
  guardar: (faseId: string, dato: RequisitosDeLaFase) => void
}

type Guardados = { cadena: CadenaDeLaUnidad; porFase: Partial<Record<string, RequisitosDeLaFase>> }

const SIN_GUARDADOS: Guardados['porFase'] = {}

const ContextoDeLaCadena = createContext<ValorDeLaCadena | null>(null)

/** La cadena de la página de la unidad; nula fuera de ella (los drawers): «Qué falta» se comporta como siempre. */
export function useCadenaDeLaPagina(): ValorDeLaCadena | null {
  return use(ContextoDeLaCadena)
}

function avisosDeLaLectura(dato: QueFalta | null, cadena: CadenaDeLaUnidad) {
  if (dato === null) return {}
  const siguiente = cadena.nodos.find((n) => n.tipo === 'falta')?.faseId ?? null
  const destinos = dato.destinos.map((d) => ({
    faseId: d.faseId,
    requisitos: (d.vista?.requisitos ?? []).map((r) => ({
      requisitoId: r.requisitoId,
      cumplido: r.cumplido,
      bloqueante: r.bloqueante,
      etiqueta: etiquetaDeRequisito(r),
    })),
  }))
  return avisosDeQueFalta(destinoPrincipal(destinos, siguiente), dato.acciones)
}

// Une la cadena de la página de la unidad, la fase que se mira (`?fase_vista=`) y «Qué falta»: la cadena la recibe del servidor; «Qué falta» le publica su última lectura y de
// ella salen los avisos de las tarjetas («Falta «BL»»), que siguen al día al releer. Lo monta `src/app` alrededor de la página (el núcleo no conoce `mover`).
export function ProveedorDeLaCadena({
  unidadId,
  cadena,
  children,
}: {
  unidadId: string
  cadena: CadenaDeLaUnidad
  children: ReactNode
}) {
  const [queFalta, setQueFalta] = useState<QueFalta | null>(null)
  // Lo guardado vale para la cadena con que se leyó: una cadena nueva (la página se releyó tras mover o un cambio) empieza de cero.
  const [guardados, setGuardados] = useState<Guardados>({ cadena, porFase: {} })
  const porFase = guardados.cadena === cadena ? guardados.porFase : SIN_GUARDADOS
  useAlCambiarLaUnidad(unidadId, () => {
    setGuardados({ cadena, porFase: {} })
  })
  const guardar = useCallback(
    (faseId: string, dato: RequisitosDeLaFase) => {
      setGuardados((antes) => ({
        cadena,
        porFase: { ...(antes.cadena === cadena ? antes.porFase : {}), [faseId]: dato },
      }))
    },
    [cadena],
  )
  const valor = useMemo(
    () => ({ cadena, publicar: setQueFalta, requisitosLeidos: { porFase, guardar } }),
    [cadena, porFase, guardar],
  )
  const avisos = useMemo(() => avisosDeLaLectura(queFalta, cadena), [queFalta, cadena])
  return (
    <ContextoDeLaCadena value={valor}>
      <ProveedorDeAvisosDeLasTarjetas avisos={avisos}>{children}</ProveedorDeAvisosDeLasTarjetas>
    </ContextoDeLaCadena>
  )
}
