'use client'

import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import { embarqueDeLogistica } from '@/shared/lib/rutas'
import { MasAcciones, type AccionDeMenu } from '@/shared/ui/lista'
import {
  accionesDeLaFilaDelContenedor,
  accionesDeLaFilaDelEmbarque,
} from '../../../entities/transporte/acciones-de-embarques'
import { PANEL_EDITAR_EMBARQUE } from '../../../entities/transporte/paneles'
import { tituloDelContenedor, tituloDelEmbarque } from '../../../entities/transporte/textos'
import { usePanelDeEmbarques } from '../hooks/use-panel-de-embarques'

/** El «⋯» de la fila de un embarque: abrir su página o editarlo ahí. */
export function AccionesDeLaFilaDelEmbarque({
  id,
  booking,
  origenId,
  puedeEditar,
}: {
  id: string
  booking: string
  origenId: string
  puedeEditar: boolean
}) {
  const router = useRouter()
  const ruta = embarqueDeLogistica(id, origenId)
  const acciones: AccionDeMenu[] = accionesDeLaFilaDelEmbarque(puedeEditar).map((a) => ({
    tipo: 'accion',
    clave: a.clave,
    etiqueta: a.etiqueta,
    alElegir: () => {
      router.push(
        (a.clave === 'editar'
          ? `${ruta}&${CLAVE_DE_PANEL}=${PANEL_EDITAR_EMBARQUE}`
          : ruta) as Route,
      )
    },
  }))
  return <MasAcciones nombre={tituloDelEmbarque(booking)} acciones={acciones} />
}

/** El «⋯» de la fila de un contenedor: abrir su drawer o ir a su embarque. */
export function AccionesDeLaFilaDelContenedor({
  id,
  numero,
  embarqueId,
  origenId,
}: {
  id: string
  numero: string
  embarqueId: string | null
  origenId: string
}) {
  const router = useRouter()
  const paneles = usePanelDeEmbarques()
  const acciones: AccionDeMenu[] = accionesDeLaFilaDelContenedor(embarqueId !== null).map((a) => ({
    tipo: 'accion',
    clave: a.clave,
    etiqueta: a.etiqueta,
    alElegir: () => {
      if (a.clave === 'embarque' && embarqueId !== null) {
        router.push(embarqueDeLogistica(embarqueId, origenId) as Route)
      } else {
        paneles.abrirContenedor(id)
      }
    },
  }))
  return <MasAcciones nombre={tituloDelContenedor(numero)} acciones={acciones} />
}
